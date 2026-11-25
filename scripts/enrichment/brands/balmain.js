"use strict";

const path = require("path");
const fs = require("fs");
const { fetchText, sleep } = require("../lib/http");
const { buildSeo } = require("../lib/seo");
const {
  normalizeProductFields,
  normalizeCaseSize,
  normalizeStrapColor,
} = require("../lib/normalize");
const {
  enrichFromTataCliq,
  SOURCE_ID: TATA_SOURCE,
} = require("../lib/tatacliq");

const BRAND = "Balmain";
const SITE_ORIGIN = "https://www.balmainwatches.com";
const SOURCE_OFFICIAL = "balmainwatches";
const LANG = "en";

/** Official PDP missing / India-only — allow Tata Cliq Luxury fallback */
const OFFICIAL_FAIL_CODES = new Set([
  "not_found",
  "fetch_failed",
  "error",
]);

/** Map official attribute labels → Product schema fields */
const ATTR_MAP = {
  description: "description",
  gender: "gender",
  case: "caseMaterial",
  "case shape": "caseShape",
  "case size": "caseSize",
  "dial color": "dialColor",
  "water resistance": "waterResistance",
  movement: "movement",
  "strap material": "strapMaterial",
  warranty: "warrantyPeriod",
};

/**
 * IMS often stores compact refs (B48303382); Balmain PDPs use dotted refs (B4830.33.82).
 */
function normalizeSku(raw) {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const compact = cleaned.replace(/[.\-_]/g, "");
  let dotted = cleaned;
  const m = compact.match(/^(B)(\d{4})(\d{2})(\d{2})$/i);
  if (m) dotted = `${m[1]}${m[2]}.${m[3]}.${m[4]}`.toUpperCase();
  return { compact: compact.toUpperCase(), dotted, original: String(raw || "").trim() };
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

function extractAttributes(html) {
  const attrs = {};
  const re =
    /<div[^>]*class="[^"]*additional-attribute[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*label[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*data[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let m;
  while ((m = re.exec(html))) {
    const label = stripTags(m[1]).toLowerCase();
    const value = stripTags(m[2]);
    if (label && value) attrs[label] = value;
  }
  return attrs;
}

/** Infer bracelet/strap color when Balmain omits a dedicated attr (from Case/Outer). */
function inferStrapColor(attrs) {
  const blob = `${attrs.case || ""} ${attrs.outer || ""} ${
    attrs["strap material"] || ""
  }`.toLowerCase();
  let guess = "";
  if (/yellow\s*gold|yellow\s*pvd|yg\b|gold pvd/.test(blob)) guess = "Yellow Gold";
  else if (/rose\s*gold|pink\s*gold|rose\s*pvd/.test(blob)) guess = "Rose Gold";
  else if (/white\s*gold|white\s*pvd/.test(blob)) guess = "Silver";
  else if (/black/.test(blob)) guess = "Black";
  else if (/steel|silver/.test(blob)) guess = "Silver";
  return normalizeStrapColor(guess);
}

/** Strip Magento /cache/<hash>/ for stable CDN paths. */
function uncacheMediaUrl(url) {
  return String(url || "").replace(/\/cache\/[a-f0-9]+\//i, "/");
}

/**
 * Prefer SKU-specific catalog images; drop related-product / generic packshots.
 * Dedupe by filename (ignore Magento /cache/<hash>/).
 */
function extractImages(html, compactSku) {
  const skuKey = String(compactSku || "").toLowerCase();
  const urls = [];
  const re =
    /https?:\/\/[^"'\\\s>]+\/media\/catalog\/product\/[^"'\\\s>]+/gi;
  let m;
  while ((m = re.exec(html))) urls.push(m[0].replace(/\\+/g, ""));

  // also relative paths
  const rel =
    /(?:src|data-src|content)=["']([^"']*\/media\/catalog\/product\/[^"']+)["']/gi;
  while ((m = rel.exec(html))) urls.push(absUrl(m[1]));

  const byFile = new Map();
  for (const raw of urls) {
    const url = uncacheMediaUrl(absUrl(raw.split("?")[0]));
    if (!/\/media\/catalog\/product\//i.test(url)) continue;
    // Magento grey "M" placeholder — HTTP 200 but not a product photo
    if (/\/placeholder\//i.test(url) || /placeholder/i.test(url.split("/").pop() || "")) {
      continue;
    }
    const file = url.split("/").pop().toLowerCase();
    if (!file) continue;
    // Keep SKU-specific assets only when we know the ref
    if (skuKey && !file.includes(skuKey.toLowerCase())) continue;

    const prev = byFile.get(file);
    // Prefer non-cache (already rewritten) or longer path
    if (!prev) {
      byFile.set(file, url);
    } else {
      const prefer =
        (!/\/cache\//i.test(url) && /\/cache\//i.test(prev)) ||
        url.length > prev.length;
      if (prefer) byFile.set(file, url);
    }
  }

  const ordered = [...byFile.entries()].sort((a, b) => {
    const rank = (name) => {
      // Prefer face / pack landscape before angled & caseback.
      // Note: names like `*_3-4_compressed_1.jpg` must NOT beat `*_1_compressed*`.
      if (/_1_compressed/.test(name)) return 0;
      if (/_pl(?:_|\.|$)/.test(name)) return 1;
      if (/_pc(?:_|\.|$)/.test(name)) return 2;
      if (/_2(?:_|\.|$)/.test(name)) return 3;
      if (/_3-4/.test(name)) return 4;
      if (/_3(?:_|\.|$)/.test(name)) return 5;
      if (/_4(?:_|\.|$)/.test(name)) return 6;
      if (/_dos(?:_|\.|$)/.test(name)) return 9;
      return 7;
    };
    return rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]);
  });

  return ordered.map(([, url]) => url);
}

function extractTitle(html) {
  return (
    stripTags(match1(html, /itemprop="name"[^>]*>([\s\S]*?)<\/span>/i)) ||
    stripTags(match1(html, /<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)) ||
    stripTags(match1(html, /property="og:title"\s+content="([^"]+)"/i)) ||
    ""
  );
}

function extractOfficialSku(html) {
  return (
    stripTags(
      match1(
        html,
        /itemprop="sku"[^>]*>([\s\S]*?)<\/div>/i
      )
    ) ||
    stripTags(
      match1(
        html,
        /<div[^>]*class="[^"]*product attribute sku[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*value[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      )
    ) ||
    ""
  );
}

function extractPriceChf(html) {
  const amount = match1(html, /data-price-amount="([\d.]+)"/i);
  const currency =
    match1(html, /itemprop="priceCurrency"\s+content="([^"]+)"/i) || "CHF";
  const label = stripTags(
    match1(html, /data-price-type="finalPrice"[^>]*>[\s\S]*?class="price"[^>]*>([\s\S]*?)<\/span>/i)
  );
  if (!amount && !label) return null;
  return {
    amount: amount ? Number(amount) : null,
    currency,
    label: label || (amount ? `${currency} ${amount}` : ""),
  };
}

function extractMetaDescription(html) {
  return (
    match1(html, /property="og:description"\s+content="([^"]+)"/i) ||
    match1(html, /name="description"\s+content="([^"]+)"/i) ||
    match1(html, /content="([^"]+)"\s+property="og:description"/i) ||
    match1(html, /content="([^"]+)"\s+name="description"/i) ||
    ""
  );
}

function mapProduct(html, skuInput, sourceUrl) {
  const sku = normalizeSku(skuInput);
  const attrs = extractAttributes(html);
  const title = extractTitle(html);
  const officialSku = extractOfficialSku(html) || sku.dotted;
  const price = extractPriceChf(html);
  const images = extractImages(html, sku.compact);
  const metaDescription = extractMetaDescription(html);

  const mapped = {};
  for (const [label, field] of Object.entries(ATTR_MAP)) {
    if (attrs[label]) mapped[field] = attrs[label];
  }

  const { product, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact, // IMS form
      officialSku,
      title: title || `Balmain ${sku.dotted}`,
      description: mapped.description || "",
      caseMaterial: mapped.caseMaterial || "",
      caseShape: mapped.caseShape || "",
      caseSize: normalizeCaseSize(mapped.caseSize || ""),
      dialColor: mapped.dialColor || "",
      waterResistance: mapped.waterResistance || "",
      movement: mapped.movement || "",
      strapMaterial: mapped.strapMaterial || "",
      strapColor: inferStrapColor(attrs),
      gender: mapped.gender || "",
      warrantyPeriod: mapped.warrantyPeriod || "",
      category: "",
      // Price is CHF on the brand site — do not write into IMS INR by default
      price: null,
      oldPrice: null,
      priceSource: price,
      images,
      sourceUrl,
      source: SOURCE_OFFICIAL,
      scrapedAt: new Date().toISOString(),
      rawAttributes: attrs,
      extras: {
        weight: attrs.weight || "",
        thicknessMm: attrs["thickness (mm)"] || "",
        crystal: attrs.crystal || "",
        caliber: attrs.caliber || "",
        outer: attrs.outer || "",
        clasp: attrs.clasp || "",
      },
    });

  product.fieldMapped = fieldMapped;
  product.fieldUnmapped = fieldUnmapped;

  if (!product.description || product.description.length < 40) {
    product.warnings = product.warnings || [];
    product.warnings.push("description_short_or_missing");
  }
  if (!product.images.length) {
    product.warnings = product.warnings || [];
    product.warnings.push("no_sku_images");
  }
  if (fieldUnmapped && Object.keys(fieldUnmapped).length) {
    product.warnings = product.warnings || [];
    product.warnings.push("unmapped_constrained_fields");
  }

  Object.assign(product, buildSeo(product, { metaDescription }));
  return product;
}

function looksLikeProductHtml(html) {
  return (
    /additional-attribute/i.test(html) &&
    (/itemprop="sku"/i.test(html) || /page-title/i.test(html))
  );
}

function searchUrlsForSku(sku) {
  const { compact, dotted } = normalizeSku(sku);
  return [
    `${SITE_ORIGIN}/${LANG}/catalogsearch/result/?q=${encodeURIComponent(compact)}`,
    `${SITE_ORIGIN}/${LANG}/catalogsearch/result/?q=${encodeURIComponent(dotted)}`,
  ];
}

/**
 * Resolve PDP URL. Balmain Magento often redirects catalogsearch?q=SKU to the PDP.
 */
async function resolveProductUrl(sku, options = {}) {
  if (options.officialUrl) return options.officialUrl;

  const { compact } = normalizeSku(sku);
  // Known slug pattern ends with compact sku lowercased
  const guessed = `${SITE_ORIGIN}/${LANG}/balmain-sedirea-woman-swiss-quartz-watch-31mm-sapphire-${compact.toLowerCase()}.html`;

  for (const url of searchUrlsForSku(sku)) {
    try {
      const res = await fetchText(url, { timeoutMs: options.timeoutMs });
      if (!res.ok) continue;
      if (looksLikeProductHtml(res.text) && res.url) {
        return res.url;
      }
      // Parse first product link from search results
      const link = match1(
        res.text,
        /href="([^"]+-b?\d[^"]*\.html)"[^>]*>[\s\S]{0,200}/i
      );
      if (link && /balmain/i.test(link)) return absUrl(link);
      // If search landed on a PDP path containing the sku
      if (res.url && res.url.toLowerCase().includes(compact.toLowerCase())) {
        return res.url;
      }
    } catch {
      // Akamai / network — try next
    }
    await sleep(options.delayMs || 1000);
  }

  // Last resort: only use guessed Sedirea URL when caller opts in (reference SKU)
  if (options.allowGuessedUrl) return guessed;
  return null;
}

function readFixtureHtml(filePath, officialUrl) {
  const html = fs.readFileSync(filePath, "utf8");
  return {
    html,
    sourceUrl:
      officialUrl ||
      match1(html, /property="og:url"\s+content="([^"]+)"/i) ||
      `file://${path.resolve(filePath)}`,
    fromFixture: true,
  };
}

function fixturePathForSku(fixtureDir, sku) {
  if (!fixtureDir) return null;
  const { compact } = normalizeSku(sku);
  const candidate = path.join(fixtureDir, `${compact}.html`);
  return fs.existsSync(candidate) ? candidate : null;
}

async function fetchProductHtml(sku, options = {}) {
  // Explicit --html always wins
  if (options.htmlPath) {
    return readFixtureHtml(options.htmlPath, options.officialUrl);
  }

  // Prefer fixtures only when requested (offline / Akamai bypass)
  if (options.preferFixture) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl);
  }

  let url = options.officialUrl || (await resolveProductUrl(sku, options));
  if (!url) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl);
    const err = new Error(`not_found: no official URL for ${sku}`);
    err.code = "not_found";
    throw err;
  }

  try {
    const res = await fetchText(url, { timeoutMs: options.timeoutMs });
    if (!res.ok || !res.text || res.text.length < 500) {
      throw Object.assign(
        new Error(
          `fetch_failed: HTTP ${res.status || "?"} for ${url} (Akamai may be blocking Node)`
        ),
        { code: "fetch_failed" }
      );
    }
    if (!looksLikeProductHtml(res.text)) {
      throw Object.assign(
        new Error(`not_found: HTML at ${res.url} is not a product PDP`),
        { code: "not_found" }
      );
    }
    return { html: res.text, sourceUrl: res.url, fromFixture: false };
  } catch (err) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) {
      console.warn(
        `  live fetch failed (${err.message}); falling back to fixture ${path.basename(fp)}`
      );
      return readFixtureHtml(fp, options.officialUrl || url);
    }
    throw err;
  }
}

function shouldTryTataCliq(result, options = {}) {
  if (options.skipTataCliq) return false;
  if (options.tataCliqOnly) return true;
  if (options.tataCliqUrl) return true;
  if (!result || result.status === "ok") return false;
  // Explicit 404 on brand site, or unresolved / blocked fetch
  const reason = String(result.reason || "");
  if (/HTTP\s*404/i.test(reason)) return true;
  if (OFFICIAL_FAIL_CODES.has(result.status)) return true;
  return false;
}

async function enrichSkuFromTataCliq(sku, options = {}) {
  const normalized = normalizeSku(sku);
  try {
    const product = await enrichFromTataCliq(sku, {
      tataCliqUrl: options.tataCliqUrl || null,
      resolveBySku: options.resolveTataCliqBySku !== false,
      timeoutMs: options.timeoutMs,
      delayMs: options.delayMs,
    });
    if (product.status !== "ok") return product;
    Object.assign(product, buildSeo(product, { metaDescription: "" }));
    product.source = TATA_SOURCE;
    product.warnings = product.warnings || [];
    if (!product.warnings.includes("india_only_tatacliq_fallback")) {
      product.warnings.push("india_only_tatacliq_fallback");
    }
    return product;
  } catch (err) {
    return {
      status: err.code || "error",
      sku: normalized.compact,
      brand: BRAND,
      source: TATA_SOURCE,
      reason: err.message,
      scrapedAt: new Date().toISOString(),
    };
  }
}

async function enrichSku(sku, options = {}) {
  const normalized = normalizeSku(sku);

  if (options.tataCliqOnly) {
    return enrichSkuFromTataCliq(sku, options);
  }

  let officialResult;
  try {
    const { html, sourceUrl, fromFixture } = await fetchProductHtml(sku, options);
    const product = mapProduct(html, sku, sourceUrl);
    product.fetchMode = fromFixture ? "fixture" : "live";
    product.source = SOURCE_OFFICIAL;
    // Sanity: official page should mention this ref
    const hay = `${product.officialSku} ${sourceUrl} ${html}`.toUpperCase();
    if (
      !hay.includes(normalized.compact) &&
      !hay.includes(normalized.dotted.replace(/\./g, ""))
    ) {
      officialResult = {
        status: "not_found",
        sku: normalized.compact,
        brand: BRAND,
        source: SOURCE_OFFICIAL,
        reason: "SKU not present on resolved page",
        sourceUrl,
      };
    } else {
      return product;
    }
  } catch (err) {
    officialResult = {
      status: err.code || "error",
      sku: normalized.compact,
      brand: BRAND,
      source: SOURCE_OFFICIAL,
      reason: err.message,
      scrapedAt: new Date().toISOString(),
    };
  }

  if (shouldTryTataCliq(officialResult, options)) {
    console.warn(
      `  official miss (${officialResult.status}: ${officialResult.reason}); trying Tata Cliq Luxury…`
    );
    const tata = await enrichSkuFromTataCliq(sku, options);
    if (tata.status === "ok") {
      tata.officialFallbackReason = officialResult.reason;
      return tata;
    }
    return {
      ...officialResult,
      tataCliqAttempt: {
        status: tata.status,
        reason: tata.reason,
        sourceUrl: tata.sourceUrl || null,
      },
    };
  }

  return officialResult;
}

module.exports = {
  BRAND,
  SITE_ORIGIN,
  SOURCE_OFFICIAL,
  ATTR_MAP,
  normalizeSku,
  extractAttributes,
  extractImages,
  inferStrapColor,
  uncacheMediaUrl,
  mapProduct,
  resolveProductUrl,
  fetchProductHtml,
  enrichSku,
  enrichSkuFromTataCliq,
  shouldTryTataCliq,
  looksLikeProductHtml,
};
