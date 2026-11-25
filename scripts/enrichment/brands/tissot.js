"use strict";

/**
 * Tissot India (tissotwatches.com/en-in) enrichment — SFCC / Demandware.
 *
 * URL pattern: https://www.tissotwatches.com/en-in/{SKU}.html
 * Example:     https://www.tissotwatches.com/en-in/T1564103337100.html
 *
 * IMS SKUs are compact (no dots). Site accepts compact form in the path.
 * Dotted display form (T156.410.33.371.00) appears in page copy.
 */

const path = require("path");
const fs = require("fs");
const { fetchText, sleep } = require("../lib/http");
const { buildSeo } = require("../lib/seo");
const {
  normalizeProductFields,
  normalizeCaseSize,
  normalizeStrapColor,
} = require("../lib/normalize");

const BRAND = "Tissot";
const SITE_ORIGIN = "https://www.tissotwatches.com";
const LOCALE = "en-in";
const SOURCE_OFFICIAL = "tissot";

const ATTR_MAP = {
  sku: "officialSku",
  "dial colour": "dialColor",
  "dial color": "dialColor",
  "case material": "caseMaterial",
  "case width (mm)": "caseSize",
  "case length (mm)": "caseSize",
  "case water resistance": "waterResistance",
  movement: "movement",
  "strap material": "strapMaterial",
  "strap colour (main strap)": "strapColor",
  "strap color (main strap)": "strapColor",
  warranty: "warrantyPeriod",
  collection: "collection",
};

function normalizeSku(raw) {
  const original = String(raw || "").trim();
  const compact = original.toUpperCase().replace(/[.\-_\s]/g, "");
  return {
    compact,
    ims: compact,
    style: compact,
    original,
    dotted: toDottedSku(compact),
    typoFrom: null,
    nearMatchMethod: null,
    styleCandidates: [...new Set([compact, toDottedSku(compact)].filter(Boolean))],
  };
}

/** Best-effort dotted display form for T-series refs (T1564103337100 → T156.410.33.371.00). */
function toDottedSku(compact) {
  const up = String(compact || "")
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  if (!/^T\d{13,}$/i.test(up)) return up;
  // T + 3 + 3 + 2 + 3 + 2  (common Tissot layout)
  const m = up.match(/^T(\d{3})(\d{3})(\d{2})(\d{3})(\d{2})$/i);
  if (!m) return up;
  return `T${m[1]}.${m[2]}.${m[3]}.${m[4]}.${m[5]}`;
}

function skuMatchKeys(raw) {
  const n = normalizeSku(raw);
  return [
    ...new Set(
      [n.compact, n.style, n.dotted, n.original]
        .filter(Boolean)
        .map((s) => String(s).toUpperCase().replace(/[.\-_\s]/g, ""))
    ),
  ];
}

function absUrl(url, base = SITE_ORIGIN) {
  if (!url) return "";
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

function decodeEntities(str) {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    );
}

function stripTags(html) {
  return decodeEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function match1(html, re) {
  const m = String(html || "").match(re);
  return m ? decodeEntities(m[1].trim()) : "";
}

function pdpUrlForSku(sku) {
  const { compact } = normalizeSku(sku);
  return `${SITE_ORIGIN}/${LOCALE}/${compact}.html`;
}

function resolveProductUrl(sku, options = {}) {
  if (options.officialUrl) return options.officialUrl;
  return pdpUrlForSku(sku);
}

function extractJsonLdProduct(html) {
  const blocks = String(html || "").match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!blocks) return null;
  for (const block of blocks) {
    const raw = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    try {
      const data = JSON.parse(raw);
      const candidates = Array.isArray(data) ? data : [data];
      for (const item of candidates) {
        if (item && (item["@type"] === "Product" || item.sku || item.mpn)) {
          return item;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function extractTechAttrs(html) {
  const idx = String(html || "").toLowerCase().indexOf("watch technical data");
  if (idx < 0) return {};
  const chunk = html.slice(idx, idx + 25000);
  const text = decodeEntities(
    chunk
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n")
  );
  const tokens = text
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const labels = new Set([
    "SKU",
    "Collection",
    "Weight (g)",
    "Warranty",
    "Country of manufacture",
    "Case length (mm)",
    "Case width (mm)",
    "Case thickness (mm)",
    "Case lug width (mm)",
    "Case water resistance",
    "Case material",
    "Bezel material",
    "Crystal",
    "Movement",
    "Battery voltage (volts)",
    "Movement functions",
    "Main functions",
    "Dial colour",
    "Dial color",
    "Indexes type",
    "Luminescent material on the hands",
    "Strap material",
    "Strap colour (main strap)",
    "Strap color (main strap)",
    "Buckle (main strap)",
    "Strap/Bracelet reference (main strap)",
    "Strap/Bracelet reference",
  ]);

  const attrs = {};
  for (let i = 0; i < tokens.length - 1; i++) {
    if (labels.has(tokens[i])) {
      const key = tokens[i].toLowerCase();
      let val = tokens[i + 1];
      if (!val || labels.has(val)) continue;
      const skip = /^(manufacturing information|manufacturer|importer|packer|strap)$/i;
      if (skip.test(val)) continue;
      // Strap section often uses "Strap material" after a "Strap" heading
      attrs[key] = val;
    }
  }

  // Strap block is after manufacturing — scan full page tokens for strap labels
  const fullText = decodeEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n")
  );
  const all = fullText
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const strapLabels = [
    "Strap material",
    "Strap colour (main strap)",
    "Strap color (main strap)",
    "Buckle (main strap)",
  ];
  for (let i = 0; i < all.length - 1; i++) {
    if (strapLabels.includes(all[i]) && !labels.has(all[i + 1])) {
      attrs[all[i].toLowerCase()] = all[i + 1];
    }
  }
  return attrs;
}

function extractDescription(html) {
  const og = match1(html, /property=["']og:description["']\s+content=["']([^"']+)/i);
  // Prefer narrative paragraphs after Description heading
  const m = String(html || "").match(
    /Description[\s\S]{0,200}?<p[^>]*>([\s\S]{80,2000}?)<\/p>/i
  );
  if (m) {
    const d = stripTags(m[1]);
    if (d.length >= 40) return d;
  }
  const narrative = String(html || "").match(
    /(The Tissot[\s\S]{80,1800}?)(?:Compatible straps|Watch technical data|A unique)/i
  );
  if (narrative) {
    const d = stripTags(narrative[1]);
    if (d.length >= 40) return d;
  }
  return og || "";
}

/** Filename / catalog key after product-pictures/ (ignores SFCC /dw/image/ wrapper). */
function productPictureKey(url) {
  const u = String(url || "");
  const m = u.match(/product-pictures\/([^?#]+)/i);
  return (m ? m[1] : u.split("/").pop() || "").toLowerCase();
}

/**
 * Keep only images whose filename embeds this compact SKU.
 * PDP HTML also embeds related watches + Compatible straps (T605_/T852_) —
 * those must not pollute the gallery.
 */
function extractImages(html, skuCompact) {
  const byKey = new Map(); // pictureKey → preferred absolute URL
  const compact = String(skuCompact || "")
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");

  const push = (raw) => {
    if (!raw) return;
    let u = decodeEntities(String(raw).split("?")[0].trim());
    if (!u) return;
    u = absUrl(u);
    if (!/tissotwatches\.com/i.test(u)) return;
    if (!/product-pictures/i.test(u)) return;

    const base = u.split("/").pop() || "";
    const baseNorm = base.replace(/[.\-_]/g, "").toUpperCase();
    // Strap / bracelet accessory assets (never the watch SKU)
    if (/T(?:605|852)[A-Z0-9]/i.test(baseNorm.replace(/^[0-9A-F]{32}/, ""))) {
      if (!compact || !baseNorm.includes(compact)) return;
    }
    // Require full compact SKU in the filename (related PDPs share only a prefix)
    if (compact && !baseNorm.includes(compact)) return;

    const key = productPictureKey(u);
    if (!key) return;
    const prev = byKey.get(key);
    // Prefer SFCC image service URLs (usually real PNG) over raw static (often WebP)
    if (prev && /\/dw\/image\//i.test(prev) && !/\/dw\/image\//i.test(u)) return;
    byKey.set(key, u);
  };

  const ld = extractJsonLdProduct(html);
  if (ld) {
    const imgs = Array.isArray(ld.image) ? ld.image : ld.image ? [ld.image] : [];
    for (const img of imgs) push(typeof img === "string" ? img : img?.url);
  }

  const og = match1(html, /property=["']og:image["']\s+content=["']([^"']+)/i);
  push(og);

  const srcs = String(html || "").match(
    /(?:data-src|src)=["']([^"']*product-pictures[^"']+)["']/gi
  );
  if (srcs) {
    for (const s of srcs) {
      const m = s.match(/=["']([^"']+)["']/);
      if (m) push(m[1]);
    }
  }

  // Also pick absolute product-pictures URLs buried in JSON / data attributes
  const absHits = String(html || "").match(
    /https?:\/\/[^"'\\\s>]*product-pictures\/[^"'\\\s>]+\.(?:png|jpe?g|webp)/gi
  );
  if (absHits) for (const h of absHits) push(h);

  const urls = [...byKey.values()];
  const ranked = urls.sort((a, b) => {
    const score = (u) => {
      let s = 0;
      if (/\/dw\/image\//i.test(u)) s += 3;
      if (/_SHADOW/i.test(u)) s += 5;
      if (/_DETAIL/i.test(u)) s += 4;
      if (/_B1/i.test(u)) s += 3;
      if (/_PROFIL/i.test(u)) s += 2;
      if (/_WRIST/i.test(u)) s += 1;
      return s;
    };
    return score(b) - score(a);
  });

  return ranked.slice(0, 12);
}

function extractGender(html, title) {
  const hay = `${title} ${stripTags(html).slice(0, 4000)}`.toLowerCase();
  if (/\bwomen\b|\bladies\b|\bwoman\b/.test(hay)) return "Women";
  if (/\bmen\b|\bman\b|\bgent/.test(hay)) return "Men";
  return "";
}

function mapProduct(html, skuInput, sourceUrl) {
  const sku = normalizeSku(skuInput);
  const ld = extractJsonLdProduct(html);
  const attrs = extractTechAttrs(html);
  const mapped = {};
  for (const [label, field] of Object.entries(ATTR_MAP)) {
    if (attrs[label]) mapped[field] = attrs[label];
  }

  // Pre-clean constrained fields that shared normalizer would otherwise blank
  if (/stainless\s*steel/i.test(mapped.caseMaterial || "")) {
    mapped.caseMaterial = "Stainless Steel";
  }
  if (/quartz/i.test(mapped.movement || "")) {
    mapped.movement = "Quartz";
  }
  if (/stainless\s*steel/i.test(mapped.strapMaterial || "")) {
    mapped.strapMaterial = "Stainless Steel";
  } else if (/leather/i.test(mapped.strapMaterial || "")) {
    mapped.strapMaterial = "Leather";
  }

  const title =
    match1(html, /property=["']og:title["']\s+content=["']([^"']+)/i)
      .replace(/\s*\|\s*Tissot.*/i, "")
      .trim() ||
    String(ld?.name || "").trim() ||
    `Tissot ${sku.compact}`;

  const description = extractDescription(html);
  const images = extractImages(html, sku.compact);
  const officialSku =
    mapped.officialSku ||
    String(ld?.sku || ld?.mpn || "").toUpperCase().replace(/[.\-_\s]/g, "") ||
    sku.compact;

  const priceAmount =
    ld?.offers?.price != null ? Number(ld.offers.price) : null;

  const gender = extractGender(html, title);

  const { product: normalized, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact,
      officialSku,
      title,
      description,
      caseMaterial: mapped.caseMaterial || "",
      caseShape: "",
      caseSize: normalizeCaseSize(
        mapped.caseSize ? `${mapped.caseSize}` : ""
      ),
      dialColor: mapped.dialColor || "",
      waterResistance: mapped.waterResistance || "",
      movement: mapped.movement || "",
      strapMaterial: mapped.strapMaterial || "",
      strapColor: normalizeStrapColor(mapped.strapColor || ""),
      gender: gender || "",
      warrantyPeriod: mapped.warrantyPeriod || "",
      category: "",
      price: null,
      oldPrice: null,
      priceSource:
        priceAmount != null && Number.isFinite(priceAmount)
          ? {
              amount: priceAmount,
              mrp: null,
              currency: String(ld?.offers?.priceCurrency || "INR"),
              label: `₹${priceAmount.toLocaleString("en-IN")}`,
            }
          : null,
      images,
      sourceUrl,
      source: SOURCE_OFFICIAL,
      scrapedAt: new Date().toISOString(),
      rawAttributes: attrs,
      extras: {
        collection: mapped.collection || attrs.collection || "",
        caseThickness: attrs["case thickness (mm)"] || "",
        crystal: attrs.crystal || "",
        dottedSku: sku.dotted,
      },
    });

  normalized.fieldMapped = fieldMapped;
  normalized.fieldUnmapped = fieldUnmapped;
  normalized.warnings = normalized.warnings || [];

  if (!normalized.description || normalized.description.length < 40) {
    normalized.warnings.push("description_short_or_missing");
  }
  if (!normalized.images.length) {
    normalized.warnings.push("no_sku_images");
  }
  if (!Object.keys(attrs).length) {
    normalized.warnings.push("tech_attrs_missing");
  }
  if (fieldUnmapped && Object.keys(fieldUnmapped).length) {
    normalized.warnings.push("unmapped_constrained_fields");
  }

  Object.assign(normalized, buildSeo(normalized, { metaDescription: description }));
  return normalized;
}

function fixturePathForSku(fixtureDir, sku) {
  if (!fixtureDir) return null;
  const { compact } = normalizeSku(sku);
  for (const name of [
    `${compact}.html`,
    `tissot-${compact}.html`,
    `${compact.toLowerCase()}.html`,
  ]) {
    const candidate = path.join(fixtureDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function readFixtureHtml(filePath, officialUrl) {
  const html = fs.readFileSync(filePath, "utf8");
  return {
    html,
    sourceUrl:
      officialUrl ||
      match1(html, /property=["']og:url["']\s+content=["']([^"']+)/i) ||
      `file://${path.resolve(filePath)}`,
    fromFixture: true,
  };
}

async function fetchProductHtml(sku, options = {}) {
  if (options.htmlPath) {
    return readFixtureHtml(options.htmlPath, options.officialUrl);
  }
  if (options.preferFixture) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl);
  }

  const url = resolveProductUrl(sku, options);
  const res = await fetchText(url, { timeoutMs: options.timeoutMs || 30000 });
  if (!res.ok || !res.text || res.text.length < 2000) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl || url);
    throw Object.assign(
      new Error(`fetch_failed: HTTP ${res.status || "?"} for ${url}`),
      { code: "fetch_failed", sourceUrl: url }
    );
  }
  // Phased-out pages still return rich PDP HTML (HTTP 410) — treat as ok if SKU present
  if (
    !/application\/ld\+json/i.test(res.text) &&
    !/watch technical data/i.test(res.text)
  ) {
    throw Object.assign(new Error(`not_found: no Tissot PDP content at ${url}`), {
      code: "not_found",
      sourceUrl: res.url || url,
    });
  }
  return {
    html: res.text,
    sourceUrl: res.url || url,
    fromFixture: false,
  };
}

async function enrichSku(sku, options = {}) {
  const normalized = normalizeSku(sku);
  try {
    const { html, sourceUrl, fromFixture } = await fetchProductHtml(sku, options);
    const hay = html.toUpperCase().replace(/[.\-_\s]/g, "");
    if (!hay.includes(normalized.compact)) {
      return {
        status: "not_found",
        sku: normalized.compact,
        brand: BRAND,
        source: SOURCE_OFFICIAL,
        reason: "SKU not present on Tissot PDP",
        sourceUrl,
        scrapedAt: new Date().toISOString(),
      };
    }
    const mapped = mapProduct(html, sku, sourceUrl);
    mapped.fetchMode = fromFixture ? "fixture" : "live";
    if (options.delayMs) await sleep(options.delayMs);
    return mapped;
  } catch (err) {
    return {
      status: err.code || "error",
      sku: normalized.compact,
      brand: BRAND,
      source: SOURCE_OFFICIAL,
      reason: err.message,
      sourceUrl: err.sourceUrl || null,
      scrapedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  BRAND,
  SITE_ORIGIN,
  SOURCE_OFFICIAL,
  ATTR_MAP,
  normalizeSku,
  skuMatchKeys,
  toDottedSku,
  resolveProductUrl,
  pdpUrlForSku,
  extractTechAttrs,
  extractImages,
  extractJsonLdProduct,
  mapProduct,
  fetchProductHtml,
  enrichSku,
};
