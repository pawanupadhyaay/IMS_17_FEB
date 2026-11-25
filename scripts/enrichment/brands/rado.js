"use strict";

/**
 * Rado India (rado.com/en_in) enrichment — Magento / Hyvä storefront.
 *
 * PDP: https://www.rado.com/en_in/{slug}-{sku}.html
 *   e.g. …/en_in/florence-diamonds-r48921703.html
 *
 * IMS SKUs are compact refs (R48921703). Resolve order:
 *   1. options.officialUrl / CSV official_url
 *   2. In-memory sitemap index (en_in → en_us → default) by SKU suffix
 *   3. Fixtures under fixtures/rado-{SKU}.html / {SKU}.html
 *   4. On official miss: The Collective → Tata Cliq Luxury → TGT Luxe → Ethos
 *
 * Specs from technical-details accordion (h4/p pairs). Images from
 * media/catalog/product gallery JSON (SKU-matching filenames only).
 * Prefer rado.com CDN. Retailer fallbacks for misses. No auto-publish.
 */

const path = require("path");
const fs = require("fs");
const { fetchText, sleep } = require("../lib/http");
const { buildSeo } = require("../lib/seo");
const {
  enrichFromRetailerChain,
  SOURCE: RETAILER_SOURCE,
} = require("../lib/retailerFallback");
const {
  normalizeProductFields,
  normalizeCaseSize,
  normalizeGender,
} = require("../lib/normalize");

const BRAND = "Rado";
const SITE_ORIGIN = "https://www.rado.com";
const LOCALE = "en_in";
const SOURCE_OFFICIAL = "rado";
const SOURCE_COLLECTIVE = RETAILER_SOURCE.COLLECTIVE;
const SOURCE_TATA = RETAILER_SOURCE.TATA;
const SOURCE_TGT = RETAILER_SOURCE.TGT;
const SOURCE_ETHOS = RETAILER_SOURCE.ETHOS;

const OFFICIAL_FAIL_CODES = new Set([
  "not_found",
  "fetch_failed",
  "error",
]);

const SITEMAP_URLS = [
  `${SITE_ORIGIN}/media/sitemap_en_in.xml`,
  `${SITE_ORIGIN}/media/sitemap_en_us.xml`,
  `${SITE_ORIGIN}/media/sitemap_default.xml`,
];

/** Word numbers → digits for warranty phrases like "Five year warranty". */
const WORD_YEARS = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
};

/** @type {Map<string, string>|null} compactSku → preferred PDP URL */
let sitemapIndex = null;
let sitemapIndexPromise = null;

const ATTR_MAP = {
  reference: "officialSku",
  "case material": "caseMaterial",
  "case diameter": "caseSize",
  diameter: "caseSize",
  "movement type": "movement",
  colour: "dialColor",
  color: "dialColor",
  "bracelet color": "strapColor",
  "bracelet colour": "strapColor",
  "water resistance": "waterResistance",
  warranty: "warrantyPeriod",
};

function normalizeSku(raw) {
  const original = String(raw || "").trim();
  const compact = original.toUpperCase().replace(/[.\-_\s]/g, "");
  return {
    compact,
    ims: compact,
    style: compact,
    original,
    typoFrom: null,
    nearMatchMethod: null,
    styleCandidates: [...new Set([compact, original].filter(Boolean))],
  };
}

function skuMatchKeys(raw) {
  const n = normalizeSku(raw);
  return [
    ...new Set(
      [n.compact, n.style, n.original]
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
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
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

function skuFromPdpUrl(url) {
  const m = String(url || "").match(/-([rR]\d{6,})\.html(?:\?|#|$)/i);
  if (!m) return null;
  return m[1].toUpperCase();
}

async function loadSitemapIndex(options = {}) {
  if (sitemapIndex) return sitemapIndex;
  if (sitemapIndexPromise) return sitemapIndexPromise;

  sitemapIndexPromise = (async () => {
    const map = new Map();
    const preferIn = (url) => /\/en_in\//i.test(url);
    for (const smUrl of SITEMAP_URLS) {
      try {
        const res = await fetchText(smUrl, {
          timeoutMs: options.timeoutMs || 60000,
          retries: 1,
        });
        if (!res.ok || !res.text) continue;
        const locs = [
          ...String(res.text).matchAll(/<loc>([^<]+)<\/loc>/gi),
        ].map((m) => decodeEntities(m[1].trim()));
        for (const loc of locs) {
          const sku = skuFromPdpUrl(loc);
          if (!sku) continue;
          const prev = map.get(sku);
          if (!prev || (preferIn(loc) && !preferIn(prev))) {
            map.set(sku, loc);
          }
        }
      } catch {
        /* try next sitemap */
      }
    }
    sitemapIndex = map;
    return map;
  })();

  try {
    return await sitemapIndexPromise;
  } catch (err) {
    sitemapIndexPromise = null;
    throw err;
  }
}

async function resolveProductUrl(sku, options = {}) {
  if (options.officialUrl) return options.officialUrl;
  const { compact } = normalizeSku(sku);
  if (options.refUrls && options.refUrls[compact]) {
    return options.refUrls[compact];
  }
  const idx = await loadSitemapIndex({
    timeoutMs: options.timeoutMs || 60000,
  });
  return idx.get(compact) || null;
}

function extractCharacteristics(html) {
  const attrs = {};
  const re =
    /<h4[^>]*>\s*([^<]+?)\s*<\/h4>\s*<p[^>]*>\s*([\s\S]*?)\s*<\/p>/gi;
  let m;
  while ((m = re.exec(String(html || "")))) {
    const label = stripTags(m[1]).replace(/\s+/g, " ").trim();
    const value = stripTags(m[2]).replace(/\s+/g, " ").trim();
    if (!label || !value) continue;
    const key = label.toLowerCase();
    // Prefer first occurrence (Global features before Case duplicates)
    if (!attrs[key]) attrs[key] = value;
  }
  return attrs;
}

function extractDescription(html) {
  const og = match1(
    html,
    /property=["']og:description["']\s+content=["']([^"']+)/i
  );
  // Prefer the longest "The Florence…" / "The …" narrative paragraph
  const candidates = [];
  if (og && og.length >= 40) candidates.push(og);

  const blocks = String(html || "").matchAll(
    /<p[^>]*>\s*((?:The |With )[\s\S]{60,3500}?)\s*<\/p>/gi
  );
  for (const block of blocks) {
    const d = stripTags(block[1]);
    if (d.length >= 80) candidates.push(d);
  }

  // Description accordion heading + following content
  const descIdx = String(html || "").search(/>\s*Description\s*</i);
  if (descIdx >= 0) {
    const chunk = html.slice(descIdx, descIdx + 6000);
    const p = chunk.match(/<p[^>]*>([\s\S]{80,4000}?)<\/p>/i);
    if (p) {
      const d = stripTags(p[1]);
      if (d.length >= 80) candidates.push(d);
    }
  }

  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] || og || "";
}

function extractWarranty(html, description) {
  // Search raw HTML (warranty badge is often far down the page)
  const hay = `${String(html || "")} ${description || ""}`;
  const word = hay.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*[- ]?years?\s*(?:of\s+)?warranty/i
  );
  if (word) {
    const n = WORD_YEARS[word[1].toLowerCase()];
    if (n) return `${n} years`;
  }
  const num = hay.match(/\b(\d+)\s*[- ]?years?\s*(?:of\s+)?warranty/i);
  if (num) return `${num[1]} years`;
  return "";
}

function extractWaterResistance(html, description, attrs) {
  if (attrs["water resistance"]) return attrs["water resistance"];
  const hay = `${description || ""} ${String(html || "")}`;
  const m = hay.match(
    /(\d+(?:\.\d+)?)\s*(?:meters?|metres?|m)\s+(?:of\s+)?water\s+resistance/i
  );
  if (m) return `${m[1]} meters`;
  const m2 = hay.match(
    /water\s+resistance[^.]{0,40}?(\d+(?:\.\d+)?)\s*(?:meters?|metres?|m)\b/i
  );
  if (m2) return `${m2[1]} meters`;
  return "";
}

function canonicalizeCatalogImage(url) {
  if (!url) return "";
  let u = decodeEntities(String(url).trim());
  // Unescape JSON-escaped slashes
  u = u.replace(/\\\//g, "/");
  try {
    const parsed = new URL(u, SITE_ORIGIN);
    if (!/rado\.com$/i.test(parsed.hostname) && !/\.rado\.com$/i.test(parsed.hostname)) {
      return "";
    }
    // Drop cache path + image transforms → stable catalog asset
    let p = parsed.pathname;
    p = p.replace(/\/cache\/[a-f0-9]+\//i, "/");
    // Prefer raw media path without ?im=…
    return `${parsed.origin}${p}`;
  } catch {
    return "";
  }
}

/**
 * Magento path: /media/catalog/product/f/l/florence_r48921703_sld_web.png
 * First two letters of the filename become path segments.
 */
function catalogPathForFilename(filename) {
  const base = String(filename || "").split("?")[0].split("/").pop();
  if (!base || base.length < 2) return "";
  const a = base[0].toLowerCase();
  const b = base[1].toLowerCase();
  return `${SITE_ORIGIN}/media/catalog/product/${a}/${b}/${base}`;
}

function extractImages(html, skuCompact) {
  const urls = [];
  const seen = new Set();
  const compact = String(skuCompact || "").toUpperCase();
  const compactLower = compact.toLowerCase();

  const push = (raw) => {
    let u = canonicalizeCatalogImage(raw);
    if (!u && raw && !/^https?:/i.test(String(raw))) {
      // Bare filename → rebuild Magento catalog path
      const base = String(raw).split("?")[0].split("/").pop();
      if (base && compactLower && base.toLowerCase().includes(compactLower)) {
        u = catalogPathForFilename(base);
      }
    }
    if (!u) return;
    if (!/\/media\/catalog\/product\//i.test(u)) return;
    const base = (u.split("/").pop() || "").toLowerCase();
    // Only keep images whose filename includes this SKU (skip related products)
    if (compactLower && !base.includes(compactLower)) return;
    if (seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };

  const decoded = decodeEntities(String(html || "")).replace(/\\\//g, "/");

  // Plain + JSON-escaped catalog URLs
  const plain = decoded.match(
    /https?:\/\/(?:www\.)?rado\.com\/media\/catalog\/product\/[^"'?\s>]+\.(?:png|jpe?g|webp)/gi
  );
  if (plain) for (const h of plain) push(h);

  // Filenames that mention this SKU (gallery often only appears entity-escaped)
  if (compactLower) {
    const nameRe = new RegExp(
      `[a-z0-9_-]*${compactLower}[a-z0-9_-]*\\.(?:png|jpe?g|webp)`,
      "gi"
    );
    const names = decoded.match(nameRe) || [];
    for (const name of names) push(name);
  }

  const og = match1(html, /property=["']og:image["']\s+content=["']([^"']+)/i);
  push(og);

  // Rank: soldier/main first, then letter variants
  return urls
    .sort((a, b) => {
      const score = (u) => {
        const f = u.toLowerCase();
        let s = 0;
        if (/_sld_web/.test(f)) s += 10;
        if (/_a_1|_a\./.test(f)) s += 5;
        if (/_b\./.test(f)) s += 4;
        if (/_c/.test(f)) s += 3;
        if (/_d\./.test(f)) s += 2;
        return s;
      };
      return score(b) - score(a);
    })
    .slice(0, 12);
}

function extractGender(html, title) {
  const bodyClass = match1(html, /<body[^>]*class=["']([^"']+)/i);
  if (/women-watches|category-women/i.test(bodyClass)) return "Women";
  if (/men-watches|category-men/i.test(bodyClass)) return "Men";
  const hay = `${title} ${stripTags(html).slice(0, 5000)}`.toLowerCase();
  if (/\bwomen'?s\b|\bladies\b|\bwoman\b/.test(hay)) return "Women";
  if (/\bmen'?s\b|\bman\b|\bgent/.test(hay)) return "Men";
  return "";
}

function extractPrice(html) {
  const meta = match1(
    html,
    /property=["']product:price:amount["']\s+content=["']([^"']+)/i
  );
  if (meta && Number.isFinite(Number(meta))) {
    return { amount: Number(meta), currency: "INR" };
  }
  const itemprop = match1(
    html,
    /itemprop=["']price["']\s+content=["']([^"']+)/i
  );
  if (itemprop && Number.isFinite(Number(itemprop))) {
    return { amount: Number(itemprop), currency: "INR" };
  }
  const productData = String(html || "").match(
    /const\s+productData\s*=\s*(\{[\s\S]*?\});/
  );
  if (productData) {
    try {
      const data = JSON.parse(productData[1]);
      if (data.price != null && Number.isFinite(Number(data.price))) {
        return {
          amount: Number(data.price),
          currency: String(data.currency || "INR"),
        };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function inferStrapMaterial(attrs, description) {
  const brace = `${attrs["bracelet color"] || ""} ${attrs.clasp || ""} ${description || ""}`;
  if (/stainless\s*steel/i.test(brace) || /bracelet/i.test(description || "")) {
    if (/leather/i.test(brace)) return "Leather";
    return "Stainless Steel";
  }
  if (/leather/i.test(brace)) return "Leather";
  if (/rubber|caoutchouc/i.test(brace)) return "Rubber";
  return "";
}

function mapProduct(html, skuInput, sourceUrl) {
  const sku = normalizeSku(skuInput);
  const attrs = extractCharacteristics(html);
  const mapped = {};
  for (const [label, field] of Object.entries(ATTR_MAP)) {
    if (attrs[label]) mapped[field] = attrs[label];
  }

  if (/stainless\s*steel/i.test(mapped.caseMaterial || "")) {
    mapped.caseMaterial = "Stainless Steel";
  }
  if (/quartz/i.test(mapped.movement || "")) {
    mapped.movement = "Quartz";
  } else if (/automatic/i.test(mapped.movement || "")) {
    mapped.movement = "Automatic";
  }

  const titleRaw =
    match1(html, /property=["']og:title["']\s+content=["']([^"']+)/i) ||
    match1(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    "";
  const title =
    titleRaw
      .replace(/\s*\|\s*Rado.*/i, "")
      .replace(/\s*R489\d+.*/i, "")
      .replace(/\s+/g, " ")
      .trim() || `Rado ${sku.compact}`;

  // Prefer collection-style name without trailing size/movement noise from h1
  const cleanTitle = title
    .replace(/\s+\d+(?:\.\d+)?\s*mm.*$/i, "")
    .replace(/,\s*Quartz.*$/i, "")
    .replace(/\s+\d+\s*g\s*$/i, "")
    .trim();

  const description = extractDescription(html);
  const images = extractImages(html, sku.compact);
  const officialSku = String(
    mapped.officialSku || attrs.reference || sku.compact
  )
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");

  const price = extractPrice(html);
  const gender = extractGender(html, cleanTitle);
  const waterRaw = extractWaterResistance(html, description, attrs);
  const warrantyRaw =
    mapped.warrantyPeriod || extractWarranty(html, description);
  const strapMaterial = inferStrapMaterial(attrs, description);

  const { product: normalized, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact,
      officialSku,
      title: cleanTitle || title,
      description,
      caseMaterial: mapped.caseMaterial || "",
      caseShape: "",
      caseSize: normalizeCaseSize(
        mapped.caseSize ? String(mapped.caseSize) : ""
      ),
      dialColor: mapped.dialColor || "",
      waterResistance: waterRaw || "",
      movement: mapped.movement || "",
      strapMaterial,
      strapColor: mapped.strapColor || "",
      gender: gender || "",
      warrantyPeriod: warrantyRaw || "",
      category: "Luxury",
      price: null,
      oldPrice: null,
      priceSource:
        price && Number.isFinite(price.amount)
          ? {
              amount: price.amount,
              mrp: price.amount,
              currency: price.currency || "INR",
              label: `₹${Number(price.amount).toLocaleString("en-IN")}`,
            }
          : null,
      images,
      sourceUrl,
      source: SOURCE_OFFICIAL,
      scrapedAt: new Date().toISOString(),
      rawAttributes: attrs,
      extras: {
        collection: "",
        caseThickness: attrs.thickness || "",
        caliber: attrs.caliber || "",
        weight: attrs.weight || "",
        gemSet: attrs["gem-set"] || "",
        clasp: attrs.clasp || "",
      },
    });

  // Re-apply gender via shared normalizer path (Women → Female)
  if (gender && !normalized.gender) {
    normalized.gender = normalizeGender(gender) || "";
  }

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

  Object.assign(
    normalized,
    buildSeo(normalized, { metaDescription: description })
  );
  return normalized;
}

function fixturePathForSku(fixtureDir, sku) {
  if (!fixtureDir) return null;
  const { compact } = normalizeSku(sku);
  for (const name of [
    `rado-${compact}.html`,
    `${compact}.html`,
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

function isRadoPdpHtml(html) {
  if (!html || html.length < 2000) return false;
  if (/catalog-product-view/i.test(html)) return true;
  if (/property=["']og:type["']\s+content=["']product["']/i.test(html)) {
    return true;
  }
  if (/const\s+productData\s*=/i.test(html) && /rado/i.test(html)) return true;
  return false;
}

async function fetchProductHtml(sku, options = {}) {
  if (options.htmlPath) {
    return readFixtureHtml(options.htmlPath, options.officialUrl);
  }
  if (options.preferFixture) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl);
  }

  const url = await resolveProductUrl(sku, options);
  if (!url) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl);
    throw Object.assign(new Error(`not_found: no Rado PDP URL for ${sku}`), {
      code: "not_found",
      sourceUrl: null,
    });
  }

  const res = await fetchText(url, { timeoutMs: options.timeoutMs || 45000 });
  if (!res.ok || !res.text || res.text.length < 2000 || !isRadoPdpHtml(res.text)) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl || url);
    throw Object.assign(
      new Error(`fetch_failed: HTTP ${res.status || "?"} for ${url}`),
      { code: "fetch_failed", sourceUrl: url }
    );
  }
  return {
    html: res.text,
    sourceUrl: res.url || url,
    fromFixture: false,
  };
}

async function enrichFromRetailerFallback(sku, options = {}) {
  const { product } = await enrichFromRetailerChain(sku, {
    ...options,
    brandHint: BRAND,
    preset: "luxury",
    fixtureDir:
      options.fixtureDir || path.join(__dirname, "..", "fixtures"),
  });
  return product;
}

async function enrichSku(sku, options = {}) {
  const normalized = normalizeSku(sku);

  if (
    options.collectiveOnly ||
    options.tataCliqOnly ||
    options.tgtLuxeOnly ||
    options.ethosOnly
  ) {
    const retailer = await enrichFromRetailerFallback(sku, options);
    if (retailer && retailer.status === "ok") return retailer;
    return {
      status: "not_found",
      sku: normalized.compact,
      brand: BRAND,
      source: SOURCE_OFFICIAL,
      reason: "retailer-only scrape failed",
      sourceUrl: null,
      scrapedAt: new Date().toISOString(),
    };
  }

  try {
    const { html, sourceUrl, fromFixture } = await fetchProductHtml(
      sku,
      options
    );
    const hay = html.toUpperCase().replace(/[.\-_\s]/g, "");
    if (!hay.includes(normalized.compact)) {
      if (!options.skipRetailerFallback) {
        const retailer = await enrichFromRetailerFallback(sku, options);
        if (retailer && retailer.status === "ok") return retailer;
      }
      return {
        status: "not_found",
        sku: normalized.compact,
        brand: BRAND,
        source: SOURCE_OFFICIAL,
        reason: "SKU not present on Rado PDP",
        sourceUrl,
        scrapedAt: new Date().toISOString(),
      };
    }
    const mapped = mapProduct(html, sku, sourceUrl);
    mapped.fetchMode = fromFixture ? "fixture" : "live";
    if (options.delayMs) await sleep(options.delayMs);
    return mapped;
  } catch (err) {
    if (
      !options.skipRetailerFallback &&
      OFFICIAL_FAIL_CODES.has(err.code || "error")
    ) {
      const retailer = await enrichFromRetailerFallback(sku, options);
      if (retailer && retailer.status === "ok") return retailer;
    }
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
  SOURCE_COLLECTIVE,
  SOURCE_TATA,
  SOURCE_TGT,
  SOURCE_ETHOS,
  ATTR_MAP,
  normalizeSku,
  skuMatchKeys,
  resolveProductUrl,
  loadSitemapIndex,
  skuFromPdpUrl,
  extractCharacteristics,
  extractImages,
  extractDescription,
  mapProduct,
  fetchProductHtml,
  enrichFromRetailerFallback,
  enrichSku,
};
