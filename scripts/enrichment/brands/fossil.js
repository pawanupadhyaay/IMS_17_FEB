"use strict";

/**
 * Fossil India (fossil.in) enrichment.
 *
 * URL pattern: https://www.fossil.in/products/{slug}/{SKU}.html
 * Example:     https://www.fossil.in/products/neutra-chronograph-amber-leather-watch/FS5512.html
 *
 * Akamai often blocks Node/curl (HTTP 403). Prefer --html fixtures/<SKU>.html
 * or --prefer-fixture. Images under img.fossil.in are usually reachable once
 * you have the PDP HTML / og:image URLs.
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

const BRAND = "Fossil";
const SITE_ORIGIN = "https://www.fossil.in";
const SOURCE_OFFICIAL = "fossil";

const ATTR_MAP = {
  "dial color": "dialColor",
  "strap color": "strapColor",
  "case size": "caseSize",
  "case material": "caseMaterial",
  "strap material": "strapMaterial",
  gender: "gender",
  movement: "movement",
  "case water resistance": "waterResistance",
  "water resistance": "waterResistance",
  warranty: "warrantyPeriod",
  "crystal type": "crystal",
};

function normalizeSku(raw) {
  const original = String(raw || "").trim();
  // Drop trailing "Set" / " Set" packaging suffixes sometimes present in IMS
  const cleaned = original
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[.\-_]/g, "")
    .replace(/SET$/i, "");
  return {
    compact: cleaned,
    ims: cleaned,
    style: cleaned,
    original,
    typoFrom: null,
    nearMatchMethod: null,
    styleCandidates: [cleaned],
  };
}

function skuMatchKeys(raw) {
  const n = normalizeSku(raw);
  return [
    ...new Set(
      [n.compact, n.original]
        .filter(Boolean)
        .map((s) => String(s).toUpperCase().replace(/[.\-_\s]/g, "").replace(/SET$/i, ""))
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

function extractJsonLdProduct(html) {
  const blocks = String(html || "").match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!blocks) return null;
  for (const block of blocks) {
    const raw = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    try {
      const data = JSON.parse(raw);
      const list = Array.isArray(data) ? data : [data];
      for (const item of list) {
        if (!item) continue;
        if (item["@type"] === "Product" || item.sku || item.mpn) return item;
        if (Array.isArray(item["@graph"])) {
          const p = item["@graph"].find(
            (g) => g && (g["@type"] === "Product" || g.sku)
          );
          if (p) return p;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Pull label/value pairs from Product Details / Key Features text. */
function extractAttrs(html) {
  const attrs = {};
  const text = decodeEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n")
  );
  const tokens = text
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const labels = [
    "Dial Color",
    "Strap Color",
    "Case Size",
    "Case Material",
    "Strap Material",
    "Gender",
    "Movement",
    "Case Water Resistance",
    "Water Resistance",
    "Warranty",
    "Crystal Type",
    "Case Color",
    "Strap Width",
  ];
  const labelSet = new Set(labels);
  for (let i = 0; i < tokens.length - 1; i++) {
    if (labelSet.has(tokens[i])) {
      const val = tokens[i + 1];
      if (val && !labelSet.has(val)) {
        attrs[tokens[i].toLowerCase()] = val;
      }
    }
  }
  return attrs;
}

function extractImages(html, skuCompact) {
  const urls = [];
  const seen = new Set();
  const skuLower = String(skuCompact || "").toLowerCase();
  const push = (raw, { requireSku = false } = {}) => {
    if (!raw) return;
    let u = decodeEntities(String(raw).split("?")[0].trim());
    u = absUrl(u);
    if (!/img\.fossil\.in/i.test(u) && !/fossil\.com/i.test(u)) return;
    if (/megamenu|logo|icon|banner|sprite/i.test(u)) return;
    if (
      skuLower &&
      (requireSku || /detailimages|dealimages|productimages/i.test(u)) &&
      !u.toLowerCase().includes(skuLower)
    ) {
      return;
    }
    if (seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };

  const ld = extractJsonLdProduct(html);
  if (ld) {
    const imgs = Array.isArray(ld.image) ? ld.image : ld.image ? [ld.image] : [];
    for (const img of imgs) push(typeof img === "string" ? img : img?.url);
  }
  push(match1(html, /property=["']og:image["']\s+content=["']([^"']+)/i));

  const detail = String(html || "").match(
    /https:\/\/img\.fossil\.in\/uploads\/fsin\/dealimages\/[^"']+/gi
  );
  if (detail) {
    for (const u of detail) {
      if (skuLower && u.toLowerCase().includes(skuLower)) push(u);
    }
  }

  // Prefer png/webp product shots ordered by _1, _2…
  return urls.sort((a, b) => {
    const na = Number((a.match(/_(\d+)\./) || [])[1] || 99);
    const nb = Number((b.match(/_(\d+)\./) || [])[1] || 99);
    return na - nb;
  });
}

function resolveProductUrl(sku, options = {}) {
  if (options.officialUrl) return options.officialUrl;
  const { compact } = normalizeSku(sku);
  // Direct SKU path often 404s without slug — caller should pass officialUrl or search
  return `${SITE_ORIGIN}/search?q=${encodeURIComponent(compact)}`;
}

/**
 * Try to resolve a PDP URL from search HTML when live fetch works.
 */
function pdpFromSearchHtml(html, skuCompact) {
  const up = String(skuCompact || "").toUpperCase();
  const re = new RegExp(
    `href=["'](https?://www\\.fossil\\.in/products/[^"']+/${up}\\.html)["']`,
    "i"
  );
  const m = String(html || "").match(re);
  if (m) return m[1];
  const re2 = new RegExp(`/products/[^"'\\s]+/${up}\\.html`, "i");
  const m2 = String(html || "").match(re2);
  return m2 ? absUrl(m2[0]) : null;
}

function fixturePathForSku(fixtureDir, sku) {
  if (!fixtureDir) return null;
  const { compact } = normalizeSku(sku);
  for (const name of [
    `${compact}.html`,
    `fossil-${compact}.html`,
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

  const { compact } = normalizeSku(sku);
  let url = options.officialUrl || null;

  if (!url) {
    // Probe search page for PDP link (often Akamai-blocked)
    try {
      const searchUrl = `${SITE_ORIGIN}/search?q=${encodeURIComponent(compact)}`;
      const search = await fetchText(searchUrl, {
        timeoutMs: options.timeoutMs || 30000,
      });
      if (search.ok && search.text) {
        url = pdpFromSearchHtml(search.text, compact);
      }
    } catch {
      /* fall through */
    }
  }

  if (!url) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl);
    throw Object.assign(
      new Error(
        `not_found: no Fossil PDP URL for ${compact} (Akamai often blocks Node — use --html fixtures/${compact}.html)`
      ),
      { code: "not_found" }
    );
  }

  const res = await fetchText(url, { timeoutMs: options.timeoutMs || 30000 });
  if (!res.ok || !res.text || res.text.length < 2000 || /Access Denied/i.test(res.text)) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, url);
    throw Object.assign(
      new Error(`fetch_failed: HTTP ${res.status || "?"} for ${url}`),
      { code: "fetch_failed", sourceUrl: url }
    );
  }
  return { html: res.text, sourceUrl: res.url || url, fromFixture: false };
}

function mapProduct(html, skuInput, sourceUrl) {
  const sku = normalizeSku(skuInput);
  const ld = extractJsonLdProduct(html);
  const attrs = extractAttrs(html);
  const mapped = {};
  for (const [label, field] of Object.entries(ATTR_MAP)) {
    if (attrs[label]) mapped[field] = attrs[label];
  }

  const title =
    match1(html, /property=["']og:title["']\s+content=["']([^"']+)/i)
      .replace(/\s+at Rs\..*/i, "")
      .replace(/^Buy\s+/i, "")
      .trim() ||
    String(ld?.name || "").trim() ||
    `Fossil ${sku.compact}`;

  const description =
    match1(html, /property=["']og:description["']\s+content=["']([^"']+)/i) ||
    stripTags(
      match1(
        html,
        /(This \d+mm[\s\S]{20,400}?\.)/
      )
    ) ||
    String(ld?.description || "").trim();

  // Prefer short marketing blurb when og:description is SEO boilerplate
  const blurb = String(html || "").match(
    /This \d+mm [A-Za-z0-9][\s\S]{20,300}?\./
  );
  const desc =
    blurb && blurb[0].length >= 40 && blurb[0].length < 400
      ? blurb[0].trim()
      : description;

  const images = extractImages(html, sku.compact);
  const officialSku =
    String(ld?.sku || ld?.mpn || "")
      .toUpperCase()
      .replace(/[.\-_\s]/g, "") || sku.compact;

  const priceAmount =
    ld?.offers?.price != null
      ? Number(ld.offers.price)
      : Number(
          (
            match1(html, /MRP\s*₹\s*([0-9,]+)/i) ||
            match1(html, /"price"\s*:\s*"?([0-9.]+)"?/)
          ).replace(/,/g, "")
        ) || null;

  const { product: normalized, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact,
      officialSku,
      title,
      description: desc,
      caseMaterial: mapped.caseMaterial || "",
      caseShape: "",
      caseSize: normalizeCaseSize(mapped.caseSize || ""),
      dialColor: mapped.dialColor || "",
      waterResistance: mapped.waterResistance || "",
      movement: mapped.movement || "",
      strapMaterial: mapped.strapMaterial || "",
      strapColor: normalizeStrapColor(mapped.strapColor || ""),
      gender: mapped.gender || "",
      warrantyPeriod: mapped.warrantyPeriod || "",
      category: /chrono/i.test(`${title} ${mapped.movement || ""}`)
        ? "Chronograph"
        : "",
      price: null,
      oldPrice: null,
      priceSource:
        priceAmount != null && Number.isFinite(priceAmount)
          ? {
              amount: priceAmount,
              mrp: priceAmount,
              currency: "INR",
              label: `₹${priceAmount.toLocaleString("en-IN")}`,
            }
          : null,
      images,
      sourceUrl,
      source: SOURCE_OFFICIAL,
      scrapedAt: new Date().toISOString(),
      rawAttributes: attrs,
      extras: {
        crystal: mapped.crystal || attrs["crystal type"] || "",
        caseColor: attrs["case color"] || "",
        platform: attrs.platform || "",
      },
    });

  normalized.fieldMapped = fieldMapped;
  normalized.fieldUnmapped = fieldUnmapped;
  normalized.warnings = normalized.warnings || [];
  if (!normalized.description || normalized.description.length < 40) {
    normalized.warnings.push("description_short_or_missing");
  }
  if (!normalized.images.length) normalized.warnings.push("no_sku_images");
  if (!Object.keys(attrs).length) normalized.warnings.push("attrs_missing");
  if (fieldUnmapped && Object.keys(fieldUnmapped).length) {
    normalized.warnings.push("unmapped_constrained_fields");
  }

  Object.assign(normalized, buildSeo(normalized, { metaDescription: desc }));
  return normalized;
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
        reason: "SKU not present on Fossil PDP",
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
  resolveProductUrl,
  pdpFromSearchHtml,
  extractAttrs,
  extractImages,
  extractJsonLdProduct,
  mapProduct,
  fetchProductHtml,
  enrichSku,
};
