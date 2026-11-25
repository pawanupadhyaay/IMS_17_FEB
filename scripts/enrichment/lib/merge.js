"use strict";

/**
 * Non-destructive merge: scraped / CSV enrichment must NOT overwrite staff data.
 *
 * Policy (default — staff fields win):
 *   - For each field: if existing is empty/null/blank → FILL from incoming.
 *   - If existing is already set → SKIP (keep staff value).
 *   - Images: FILL only when the product has no *usable* images yet; otherwise SKIP.
 *     Callers may pass existingUsableUrls (after probing). Broken/403/404 galleries
 *     count as empty so scrape can refill without wiping good Spaces galleries.
 *   - Prices / inventory: same empty-check; never invent from CHF brand prices.
 *
 * Opt-in overwrite: pass { forceOverwrite: true } (maps to CLI --force-overwrite).
 */

const {
  normalizeGender,
  mapGender,
  toCanonicalGender,
  applyGenderNormalization,
} = require("./gender");
const { normalizeProductFields } = require("./normalize");

const SCALAR_FIELDS = [
  "title",
  "brand",
  "category",
  "description",
  "caseMaterial",
  "dialColor",
  "waterResistance",
  "warrantyPeriod",
  "movement",
  "gender",
  "strapColor",
  "strapMaterial",
  "caseShape",
  "caseSize",
  "slug",
  "seoTitle",
  "seoDescription",
  "seoKeywords",
  "seoImage",
];

const NUMERIC_FIELDS = ["price", "oldPrice", "inventory"];

const {
  PUBLISH_ON_APPROVE_POLICY,
} = require("./publishOnApprove");

const MERGE_POLICY = {
  name: "staff-wins-fill-empty",
  defaultForceOverwrite: false,
  summary:
    "Only fill empty/null/blank fields on existing products. Never overwrite non-empty title, description, specs, prices, or images unless forceOverwrite is true.",
  publishOnApprove: PUBLISH_ON_APPROVE_POLICY,
  rules: [
    "Empty = null, undefined, '', or whitespace-only string.",
    "Numeric empty = null, undefined, or NaN (0 is considered SET and is kept).",
    "Images: fill only when existing has no usable images; otherwise skip entire gallery.",
    "Broken/unreachable image URLs (403/404/HTML) are treated as empty when existingUsableUrls is provided.",
    "New SKUs (no existing product): all incoming fields apply (create path).",
    "forceOverwrite=true: apply all non-empty incoming fields (destructive).",
    "Scrape / Scan / Pull alone never sets isPublished (scrape ≠ approve).",
    PUBLISH_ON_APPROVE_POLICY,
  ],
};

function isBlankString(value) {
  return value == null || (typeof value === "string" && value.trim() === "");
}

function isEmptyScalar(value) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

function isEmptyNumeric(value) {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  const n = typeof value === "number" ? value : Number(value);
  return !Number.isFinite(n);
}

function collectImageUrls(product) {
  if (!product || typeof product !== "object") return [];
  const urls = [];
  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (typeof img === "string" && img.trim()) urls.push(img.trim());
      else if (img && typeof img === "object") {
        const u = img.url || img.src || img.imageSrc;
        if (u && String(u).trim()) urls.push(String(u).trim());
      }
    }
  }
  if (product.imageUrl && String(product.imageUrl).trim()) {
    urls.push(String(product.imageUrl).trim());
  }
  if (product.image && typeof product.image === "object" && product.image.url) {
    const u = String(product.image.url).trim();
    if (u) urls.push(u);
  }
  if (product.seoImage && String(product.seoImage).trim()) {
    // seoImage alone does not count as product gallery
  }
  return [...new Set(urls)];
}

function hasImages(product) {
  return collectImageUrls(product).length > 0;
}

/**
 * Decide fill vs skip for one field.
 * @returns {{ action: 'fill'|'skip'|'omit', reason: string, existing?: *, incoming?: * }}
 */
function decideField(field, existingVal, incomingVal, opts = {}) {
  const force = Boolean(opts.forceOverwrite);
  const numeric = NUMERIC_FIELDS.includes(field);

  const incomingEmpty = numeric
    ? isEmptyNumeric(incomingVal)
    : isEmptyScalar(incomingVal);

  if (incomingEmpty) {
    return {
      action: "omit",
      reason: "incoming empty — nothing to apply",
      existing: existingVal,
      incoming: incomingVal,
    };
  }

  const existingEmpty = numeric
    ? isEmptyNumeric(existingVal)
    : isEmptyScalar(existingVal);

  if (force) {
    return {
      action: "fill",
      reason: "forceOverwrite — replace staff value",
      existing: existingVal,
      incoming: incomingVal,
    };
  }

  if (existingEmpty) {
    return {
      action: "fill",
      reason: "existing empty — fill from scrape",
      existing: existingVal,
      incoming: incomingVal,
    };
  }

  return {
    action: "skip",
    reason: "already set by staff — keep existing",
    existing: existingVal,
    incoming: incomingVal,
  };
}

function decideImages(existingProduct, incomingImages, opts = {}) {
  const force = Boolean(opts.forceOverwrite);
  const incoming = Array.isArray(incomingImages)
    ? incomingImages.filter((u) => u && String(u).trim())
    : [];
  // Prefer probed usable list when provided (broken URLs → treat as empty)
  const existing = Array.isArray(opts.existingUsableUrls)
    ? opts.existingUsableUrls.filter((u) => u && String(u).trim())
    : collectImageUrls(existingProduct);

  if (!incoming.length) {
    return {
      action: "omit",
      reason: "incoming has no images",
      existingCount: existing.length,
      incomingCount: 0,
    };
  }

  if (force) {
    return {
      action: "fill",
      reason: "forceOverwrite — replace gallery",
      existingCount: existing.length,
      incomingCount: incoming.length,
      value: incoming,
    };
  }

  if (existing.length === 0) {
    return {
      action: "fill",
      reason: Array.isArray(opts.existingUsableUrls)
        ? "no usable images (broken/empty) — fill gallery"
        : "no images yet — fill gallery",
      existingCount: 0,
      incomingCount: incoming.length,
      value: incoming,
    };
  }

  return {
    action: "skip",
    reason: "images already set — keep staff gallery",
    existingCount: existing.length,
    incomingCount: incoming.length,
  };
}

/**
 * Merge scraped/incoming fields onto an existing IMS product.
 *
 * @param {object|null} existing - Current IMS product (or null for new SKU)
 * @param {object} incoming - Scraped / CSV-derived fields
 * @param {{ forceOverwrite?: boolean, fields?: string[], existingUsableUrls?: string[] }} options
 * @returns {{
 *   merged: object,
 *   patch: object,
 *   decisions: Array<object>,
 *   fill: string[],
 *   skip: string[],
 *   omit: string[],
 *   isNew: boolean,
 *   forceOverwrite: boolean,
 *   policy: object
 * }}
 */
function mergeProductFields(existing, incoming, options = {}) {
  const forceOverwrite = Boolean(options.forceOverwrite);
  const fields = options.fields || [...SCALAR_FIELDS, ...NUMERIC_FIELDS];
  const src = incoming && typeof incoming === "object" ? incoming : {};
  const base = existing && typeof existing === "object" ? { ...existing } : null;
  const isNew = !base;
  const imageOpts = {
    forceOverwrite,
    existingUsableUrls: options.existingUsableUrls,
  };

  const decisions = [];
  const fill = [];
  const skip = [];
  const omit = [];
  const patch = {};

  if (isNew) {
    const merged = { ...src };
    for (const field of fields) {
      if (!(field in src)) continue;
      const empty = NUMERIC_FIELDS.includes(field)
        ? isEmptyNumeric(src[field])
        : isEmptyScalar(src[field]);
      if (empty) {
        omit.push(field);
        decisions.push({
          field,
          action: "omit",
          reason: "incoming empty on create",
        });
      } else {
        fill.push(field);
        patch[field] = src[field];
        decisions.push({
          field,
          action: "fill",
          reason: "new SKU — apply all non-empty fields",
          incoming: src[field],
        });
      }
    }
    const imgDecision = decideImages(null, src.images, {
      forceOverwrite: true,
    });
    decisions.push({ field: "images", ...imgDecision });
    if (imgDecision.action === "fill") {
      fill.push("images");
      patch.images = imgDecision.value;
      merged.images = imgDecision.value;
    } else {
      omit.push("images");
    }
    return {
      merged,
      patch,
      decisions,
      fill,
      skip,
      omit,
      isNew: true,
      forceOverwrite,
      policy: MERGE_POLICY,
    };
  }

  const merged = { ...base };

  for (const field of fields) {
    if (!(field in src) && src[field] === undefined) {
      // still evaluate when key present as null
    }
    if (!Object.prototype.hasOwnProperty.call(src, field)) continue;

    const decision = decideField(field, base[field], src[field], {
      forceOverwrite,
    });
    decisions.push({ field, ...decision });

    if (decision.action === "fill") {
      fill.push(field);
      patch[field] = src[field];
      merged[field] = src[field];
    } else if (decision.action === "skip") {
      skip.push(field);
    } else {
      omit.push(field);
    }
  }

  if (Object.prototype.hasOwnProperty.call(src, "images") || Array.isArray(src.images)) {
    const imgDecision = decideImages(base, src.images, imageOpts);
    decisions.push({ field: "images", ...imgDecision });
    if (imgDecision.action === "fill") {
      fill.push("images");
      patch.images = imgDecision.value;
      merged.images = imgDecision.value;
    } else if (imgDecision.action === "skip") {
      skip.push("images");
    } else {
      omit.push("images");
    }
  }

  return {
    merged,
    patch,
    decisions,
    fill,
    skip,
    omit,
    isNew: false,
    forceOverwrite,
    policy: MERGE_POLICY,
  };
}

/**
 * Filter an import "data" object (from CSV row) so $set only touches empty fields.
 * Used by IMS CSV import path.
 */
function filterPatchForExisting(existing, data, options = {}) {
  const incoming = { ...data };
  const result = mergeProductFields(existing, incoming, options);
  return {
    patch: result.patch,
    fill: result.fill,
    skip: result.skip,
    omit: result.omit,
    decisions: result.decisions,
    forceOverwrite: result.forceOverwrite,
  };
}

/**
 * Build a human-readable merge preview for the UI / API.
 */
function buildMergePreview(existing, incoming, options = {}) {
  const result = mergeProductFields(existing, incoming, options);
  return {
    policy: MERGE_POLICY,
    sku: (incoming && incoming.sku) || (existing && existing.sku) || null,
    isNew: result.isNew,
    forceOverwrite: result.forceOverwrite,
    fill: result.fill,
    skip: result.skip,
    omit: result.omit,
    decisions: result.decisions.map((d) => ({
      field: d.field,
      action: d.action,
      reason: d.reason,
      existing:
        d.existing !== undefined
          ? summarizeValue(d.existing)
          : d.existingCount != null
            ? `(${d.existingCount} images)`
            : undefined,
      incoming:
        d.incoming !== undefined
          ? summarizeValue(d.incoming)
          : d.incomingCount != null
            ? `(${d.incomingCount} images)`
            : d.value
              ? summarizeValue(d.value)
              : undefined,
    })),
    patch: result.patch,
  };
}

function summarizeValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 80 ? t.slice(0, 77) + "…" : t;
  }
  return value;
}

/**
 * Map a scraped enrichment product into the flat field bag used for merge / CSV.
 * Constrained fields (gender, movement, materials, colors, water resistance,
 * warranty, category, …) are normalized to IMS/storefront option lists.
 * Unknown scrape values become "" so staff can fill them.
 */
function scrapedToIncoming(product, options = {}) {
  if (!product || typeof product !== "object") return {};
  const incoming = { sku: product.sku, brand: product.brand || "Balmain" };
  for (const field of [...SCALAR_FIELDS, ...NUMERIC_FIELDS]) {
    if (Object.prototype.hasOwnProperty.call(product, field)) {
      incoming[field] = product[field];
    }
  }
  if (Array.isArray(product.images)) incoming.images = product.images;

  const { product: normalized, mapped, unmapped } = normalizeProductFields(
    incoming,
    { brandNames: options.brandNames }
  );
  normalized._fieldMapped = mapped;
  normalized._fieldUnmapped = unmapped;
  return normalized;
}

module.exports = {
  MERGE_POLICY,
  SCALAR_FIELDS,
  NUMERIC_FIELDS,
  isBlankString,
  isEmptyScalar,
  isEmptyNumeric,
  collectImageUrls,
  hasImages,
  decideField,
  decideImages,
  mergeProductFields,
  filterPatchForExisting,
  buildMergePreview,
  scrapedToIncoming,
  normalizeProductFields,
  normalizeGender,
  mapGender,
  toCanonicalGender,
  applyGenderNormalization,
};
