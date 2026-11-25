"use strict";

/**
 * Casio enrichment — official Casio product pages.
 *
 * IMS often stores **India shop codes** (D275, G1736, A2429) while official
 * PDPs use **model numbers** (AE-1500WHX-1AVDF, GBM-2100A-8B, LTP-VT04D-2A).
 *
 * Resolve order:
 *   1. options.officialUrl / CSV official_url
 *   2. options.model / CSV model
 *   3. Model parsed from options.title (IMS title)
 *   4. Treat SKU itself as model when it looks like a Casio model (has hyphen)
 *
 * Global PDP pattern:
 *   https://www.casio.com/{locale}/watches/{line}/product.{MODEL}/
 * Prefer locale `in` then `us`. India authorized store
 * (casiostore.bhawar.com) is Cloudflare-blocked for Node — use fixtures.
 *
 * Blockers: Akamai/CF on casio.com + India store for Node/curl. Save browser
 * HTML to fixtures/<INDIA_CODE>.html or fixtures/<MODEL>.html.
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

const BRAND = "Casio";
const SITE_ORIGIN = "https://www.casio.com";
const SOURCE_OFFICIAL = "casio";

/** Common India-code → model overrides (expand as staff confirm). */
const INDIA_CODE_TO_MODEL = {
  D275: "AE-1500WHX-1AVDF",
  D195: "A1000MCG-9",
  G1736: "GBM-2100A-8B",
  A2429: "LTP-VT04D-2A",
};

const ATTR_MAP = {
  "case size": "caseSize",
  "size of case": "caseSize",
  "case / bezel material": "caseMaterial",
  "case material": "caseMaterial",
  "band material": "strapMaterial",
  "band color": "strapColor",
  "dial color": "dialColor",
  "water resistance": "waterResistance",
  "water resistant": "waterResistance",
  movement: "movement",
  "display type": "category",
  "function display": "category",
  warranty: "warrantyPeriod",
  gender: "gender",
};

function normalizeSku(raw) {
  const original = String(raw || "").trim();
  const compact = original.toUpperCase().replace(/\s+/g, "");
  return {
    compact,
    ims: compact,
    style: compact,
    original,
    typoFrom: null,
    nearMatchMethod: null,
    styleCandidates: [compact],
  };
}

function skuMatchKeys(raw) {
  const n = normalizeSku(raw);
  return [n.compact];
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

/**
 * Extract Casio model from free text (IMS title, etc.).
 * Examples: "AE-1500WHX-1AV (D275)", "LTP-VT04D-2A", "GBM-2100A-8B"
 */
function extractModelFromText(text) {
  const s = String(text || "");
  const patterns = [
    /\b((?:GA|GW|GM|GMA|GBM|DW|AW|AE|A|F|B|MQ|MTP|LTP|EF|EQB|ECB|EFR|GST|GMW|MRG)[\w\-]*\d[\w\-]*)\b/i,
    /\b([A-Z]{1,4}-?\d{2,5}[A-Z0-9\-]{2,})\b/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      let model = m[1].toUpperCase();
      // Normalize missing hyphen in AE1500… forms
      model = model.replace(/^(AE|GA|GW|DW|MTP|LTP)(\d)/, "$1-$2");
      return model;
    }
  }
  return null;
}

function resolveModel(sku, options = {}) {
  if (options.model) return String(options.model).trim().toUpperCase();
  const { compact } = normalizeSku(sku);
  if (INDIA_CODE_TO_MODEL[compact]) return INDIA_CODE_TO_MODEL[compact];
  if (options.title) {
    const fromTitle = extractModelFromText(options.title);
    if (fromTitle) return fromTitle;
  }
  // SKU itself looks like a model (has letter+digit and hyphen or long alnum)
  if (/[A-Z]+-?\d/i.test(compact) && compact.length >= 6 && /[A-Z].*\d|\d.*[A-Z]/.test(compact)) {
    if (/-/.test(String(sku)) || compact.length >= 8) {
      return String(sku).trim().toUpperCase().replace(/\s+/g, "");
    }
  }
  return null;
}

function modelUrlCandidates(model) {
  const m = String(model || "").trim();
  if (!m) return [];
  const variants = [...new Set([m, m.replace(/DF$/i, ""), m.replace(/-1AV$/i, "-1AVDF")])];
  const locales = ["in", "us", "intl"];
  const lines = ["casio", "gshock", "edifice", "sheen", "protrek", "baby-g"];
  const urls = [];
  for (const locale of locales) {
    for (const line of lines) {
      for (const v of variants) {
        urls.push(`${SITE_ORIGIN}/${locale}/watches/${line}/product.${v}/`);
      }
    }
  }
  return urls;
}

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
    "Case Size",
    "Size of case",
    "Case / bezel material",
    "Case Material",
    "Band Material",
    "Band Color",
    "Dial Color",
    "Water Resistance",
    "Water Resistant",
    "Movement",
    "Display Type",
    "Function Display",
    "Warranty",
    "Gender",
  ];
  const labelSet = new Set(labels.map((l) => l.toLowerCase()));
  for (let i = 0; i < tokens.length - 1; i++) {
    if (labelSet.has(tokens[i].toLowerCase())) {
      const val = tokens[i + 1];
      if (val && !labelSet.has(val.toLowerCase())) {
        attrs[tokens[i].toLowerCase()] = val;
      }
    }
  }
  return attrs;
}

function extractImages(html, modelOrSku) {
  const urls = [];
  const seen = new Set();
  const key = String(modelOrSku || "")
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  const push = (raw, { requireKey = true } = {}) => {
    if (!raw) return;
    let u = decodeEntities(String(raw).split("?")[0].trim());
    u = absUrl(u);
    if (!/casio\.com|g-shock\.com|casiostore/i.test(u)) return;
    if (!/\.(jpe?g|png|webp)$/i.test(u) && !/\/products?\//i.test(u)) return;
    if (/logo|icon|sprite|banner|favicon/i.test(u)) return;
    if (requireKey && key) {
      const up = u.toUpperCase().replace(/[.\-_\s]/g, "");
      if (!up.includes(key)) return;
    }
    if (seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };
  const og = match1(html, /property=["']og:image["']\s+content=["']([^"']+)/i);
  // og:image is page-scoped; keep even when CDN path omits model code
  push(og, { requireKey: false });
  const all = String(html || "").match(
    /https:\/\/[^"']+\.(?:jpe?g|png|webp)/gi
  );
  if (all) {
    for (const u of all) {
      if (/product|casio|gshock|watch/i.test(u)) push(u);
    }
  }
  return urls.slice(0, 12);
}

function fixturePathForSku(fixtureDir, sku, model) {
  if (!fixtureDir) return null;
  const { compact } = normalizeSku(sku);
  const names = [
    `${compact}.html`,
    `casio-${compact}.html`,
    model ? `${String(model).replace(/[\\/]/g, "")}.html` : null,
    model ? `casio-${String(model).replace(/[\\/]/g, "")}.html` : null,
  ].filter(Boolean);
  for (const name of names) {
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

async function resolveProductUrl(sku, options = {}) {
  if (options.officialUrl) return options.officialUrl;
  const model = resolveModel(sku, options);
  if (!model) return null;
  for (const url of modelUrlCandidates(model)) {
    try {
      const res = await fetchText(url, {
        timeoutMs: Math.min(options.timeoutMs || 20000, 15000),
        retries: 0,
      });
      if (
        res.ok &&
        res.text &&
        res.text.length > 3000 &&
        !/Access Denied|verifying your connection/i.test(res.text)
      ) {
        return res.url || url;
      }
    } catch {
      /* try next */
    }
    await sleep(150);
  }
  return modelUrlCandidates(model)[0] || null;
}

async function fetchProductHtml(sku, options = {}) {
  if (options.htmlPath) {
    return readFixtureHtml(options.htmlPath, options.officialUrl);
  }
  const model = resolveModel(sku, options);
  if (options.preferFixture) {
    const fp = fixturePathForSku(options.fixtureDir, sku, model);
    if (fp) return readFixtureHtml(fp, options.officialUrl);
  }

  const url = await resolveProductUrl(sku, options);
  if (!url) {
    const fp = fixturePathForSku(options.fixtureDir, sku, model);
    if (fp) return readFixtureHtml(fp, options.officialUrl);
    throw Object.assign(
      new Error(
        `not_found: no Casio model/URL for ${normalizeSku(sku).compact} (pass --model or title with model; India store/casio.com often CF/Akamai blocked)`
      ),
      { code: "not_found" }
    );
  }

  try {
    const res = await fetchText(url, { timeoutMs: options.timeoutMs || 30000 });
    if (
      res.ok &&
      res.text &&
      res.text.length > 3000 &&
      !/Access Denied|verifying your connection/i.test(res.text)
    ) {
      return { html: res.text, sourceUrl: res.url || url, fromFixture: false };
    }
  } catch {
    /* fixture fallback */
  }

  const fp = fixturePathForSku(options.fixtureDir, sku, model);
  if (fp) return readFixtureHtml(fp, url);
  throw Object.assign(
    new Error(
      `fetch_failed: Casio PDP blocked or missing for ${url} — save browser HTML to fixtures/`
    ),
    { code: "fetch_failed", sourceUrl: url }
  );
}

function mapProduct(html, skuInput, sourceUrl, options = {}) {
  const sku = normalizeSku(skuInput);
  const model = resolveModel(skuInput, options) || sku.compact;
  const attrs = extractAttrs(html);
  const mapped = {};
  for (const [label, field] of Object.entries(ATTR_MAP)) {
    if (attrs[label]) mapped[field] = attrs[label];
  }

  const title =
    match1(html, /property=["']og:title["']\s+content=["']([^"']+)/i)
      .replace(/\s*\|\s*CASIO.*/i, "")
      .trim() ||
    match1(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, "").trim() ||
    `Casio ${model}`;

  const description =
    match1(html, /property=["']og:description["']\s+content=["']([^"']+)/i) ||
    stripTags(
      match1(html, /class=["'][^"']*product-description[^"']*["'][^>]*>([\s\S]{40,1200}?)<\//i)
    ) ||
    "";

  const images = extractImages(html, model);
  const category =
    mapped.category ||
    (/digital/i.test(`${title} ${description}`) ? "Digital" : "") ||
    (/g-shock|gshock/i.test(title) ? "Sports" : "");

  const { product: normalized, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact,
      officialSku: model,
      title,
      description,
      caseMaterial: mapped.caseMaterial || "",
      caseShape: "",
      caseSize: normalizeCaseSize(mapped.caseSize || ""),
      dialColor: mapped.dialColor || "",
      waterResistance: mapped.waterResistance || "",
      movement: mapped.movement || "",
      strapMaterial: mapped.strapMaterial || "",
      strapColor: normalizeStrapColor(mapped.strapColor || ""),
      gender: mapped.gender || "",
      warrantyPeriod: mapped.warrantyPeriod || "2 years",
      category,
      price: null,
      oldPrice: null,
      priceSource: null,
      images,
      sourceUrl,
      source: SOURCE_OFFICIAL,
      scrapedAt: new Date().toISOString(),
      rawAttributes: attrs,
      extras: {
        indiaCode: sku.compact,
        model,
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

  Object.assign(normalized, buildSeo(normalized, { metaDescription: description }));
  return normalized;
}

async function enrichSku(sku, options = {}) {
  const normalized = normalizeSku(sku);
  try {
    const { html, sourceUrl, fromFixture } = await fetchProductHtml(sku, options);
    const model = resolveModel(sku, options);
    const hay = html.toUpperCase();
    const okHint =
      (model && hay.includes(String(model).toUpperCase().replace(/-/g, ""))) ||
      hay.includes(normalized.compact) ||
      /CASIO|G-SHOCK|EDIFICE/i.test(html);
    if (!okHint && !fromFixture) {
      return {
        status: "not_found",
        sku: normalized.compact,
        brand: BRAND,
        source: SOURCE_OFFICIAL,
        reason: "Casio model/SKU not present on resolved page",
        sourceUrl,
        scrapedAt: new Date().toISOString(),
      };
    }
    const mapped = mapProduct(html, sku, sourceUrl, options);
    mapped.fetchMode = fromFixture ? "fixture" : "live";
    if (model && model !== normalized.compact) {
      mapped.nearMatch = true;
      mapped.typoFrom = normalized.compact;
      mapped.matchedStyle = model;
      mapped.nearMatchMethod = "india_code_to_model";
      mapped.imsSku = normalized.compact;
    }
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
  INDIA_CODE_TO_MODEL,
  normalizeSku,
  skuMatchKeys,
  extractModelFromText,
  resolveModel,
  modelUrlCandidates,
  resolveProductUrl,
  extractAttrs,
  extractImages,
  mapProduct,
  fetchProductHtml,
  enrichSku,
};
