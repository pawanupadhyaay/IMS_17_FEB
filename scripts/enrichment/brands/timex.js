"use strict";

/**
 * Timex India (shop.timexindia.com) enrichment — Shopify storefront.
 * TWEG* IMS SKUs are Timex, not Titan.
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

const BRAND = "Timex";
const SITE_ORIGIN = "https://shop.timexindia.com";
const SOURCE_OFFICIAL = "timexindia";

/**
 * Known IMS / spreadsheet typos → shop.timexindia.com style codes.
 * Prefer correcting IMS SKU to the mapped value when staff edit the listing.
 * Suffix rules (1K/LK ↔ IK) are applied in resolveSkuTypo when not listed here.
 */
const SKU_TYPO_MAP = {
  // Explicit overrides when automatic suffix rules are not enough
  TWEG260407: "TWEG26407", // extra 0 in IMS
  TWFG26701: "TWEG26701", // TWFG → TWEG prefix typo
  TWFG26705: "TWEG26705",
};

/**
 * Conservative Timex near-match: region-suffix OCR/typo confusion.
 * IMS often stores LK / 1K / mixed-case lK when the India site uses IK.
 * Auto-accept only when a single high-confidence alias resolves on-site.
 */
function regionSuffixAliases(compact) {
  const up = String(compact || "")
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  if (!up) return [];
  const out = new Set([up]);
  if (/1K$/i.test(up)) out.add(up.replace(/1K$/i, "IK"));
  if (/LK$/i.test(up)) out.add(up.replace(/LK$/i, "IK"));
  if (/IK$/i.test(up)) {
    out.add(up.replace(/IK$/i, "1K"));
    out.add(up.replace(/IK$/i, "LK"));
  }
  return [...out];
}

/**
 * @param {string} raw
 * @returns {{ from: string, to: string, method: string } | null}
 */
function resolveSkuTypo(raw) {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  if (!cleaned) return null;
  if (SKU_TYPO_MAP[cleaned]) {
    return { from: cleaned, to: SKU_TYPO_MAP[cleaned], method: "typo_map" };
  }
  // 1K / LK → IK (India site canonical). Do not rewrite correct IK.
  if (/1K$/i.test(cleaned)) {
    return { from: cleaned, to: cleaned.replace(/1K$/i, "IK"), method: "suffix_1k_to_ik" };
  }
  if (/LK$/i.test(cleaned)) {
    return { from: cleaned, to: cleaned.replace(/LK$/i, "IK"), method: "suffix_lk_to_ik" };
  }
  return null;
}

/** Spec table labels → Product schema fields */
const ATTR_MAP = {
  watch: "officialSku",
  gender: "gender",
  "case material": "caseMaterial",
  "case shape": "caseShape",
  "dial shape": "caseShape",
  "case diameter": "caseSize",
  "case width": "caseSize",
  "dial color": "dialColor",
  "water resistance": "waterResistance",
  "watch movement": "movement",
  movement: "movement",
  "strap material": "strapMaterial",
  "band color": "strapColor",
  "strap color": "strapColor",
  "warranty years": "warrantyPeriod",
  warranty: "warrantyPeriod",
  "display type": "category",
};

/**
 * Normalize Timex IMS / India model numbers.
 * Keeps IMS compact as the merge key; exposes corrected `style` when a typo maps.
 * @returns {{
 *   compact: string,   // IMS key (uppercase, no separators) — used as product.sku
 *   ims: string,
 *   style: string,     // scrape / catalog style (may be typo-corrected)
 *   original: string,
 *   typoFrom: string|null,
 *   nearMatchMethod: string|null,
 *   styleCandidates: string[]
 * }}
 */
function normalizeSku(raw) {
  const original = String(raw || "").trim();
  const cleaned = original.toUpperCase().replace(/\s+/g, "");
  const compact = cleaned.replace(/[.\-_]/g, "");
  const typo = resolveSkuTypo(compact);
  const style = typo ? typo.to : compact;
  return {
    compact,
    ims: compact,
    style,
    original,
    typoFrom: typo ? typo.from : null,
    nearMatchMethod: typo ? typo.method : null,
    styleCandidates: [
      ...new Set([compact, style, ...regionSuffixAliases(compact)]),
    ],
  };
}

/** Keys that should resolve to the same batch / preview record. */
function skuMatchKeys(raw) {
  const n = normalizeSku(raw);
  return [
    ...new Set(
      [n.compact, n.style, n.typoFrom, n.original, ...n.styleCandidates]
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

function productJsonUrl(pdpOrHandle) {
  const s = String(pdpOrHandle || "").trim();
  if (!s) return null;
  if (/\/products\/[^/?#]+\.json$/i.test(s)) return absUrl(s);
  if (/^https?:\/\//i.test(s)) {
    const u = s.replace(/\/?(\?.*)?$/, "");
    if (/\/products\//i.test(u)) return `${u}.json`.replace(/\.json\.json$/i, ".json");
  }
  const handle = s.replace(/^\/+/, "").replace(/^products\//i, "");
  return `${SITE_ORIGIN}/products/${handle}.json`;
}

function pdpUrlFromHandle(handle) {
  return `${SITE_ORIGIN}/products/${String(handle || "").replace(/^\/+/, "")}`;
}

/**
 * Resolve Shopify handle via predictive search, then SKU-as-handle guess.
 * Tries IMS compact first, then typo-corrected / suffix aliases (IK vs 1K/LK).
 */
async function resolveProductUrl(sku, options = {}) {
  if (options.officialUrl) return options.officialUrl;

  const normalized = normalizeSku(sku);
  const queries = [
    ...new Set(
      [normalized.compact, normalized.style, ...normalized.styleCandidates].filter(
        Boolean
      )
    ),
  ];

  for (const q of queries) {
    const suggestUrl =
      `${SITE_ORIGIN}/search/suggest.json?q=${encodeURIComponent(q)}` +
      "&resources%5Btype%5D=product&resources%5Blimit%5D=8";

    try {
      const res = await fetchText(suggestUrl, {
        timeoutMs: options.timeoutMs,
        headers: { Accept: "application/json" },
      });
      if (res.ok && res.text) {
        const data = JSON.parse(res.text);
        const products =
          data?.resources?.results?.products ||
          data?.resources?.products ||
          [];
        const hit =
          products.find((p) =>
            String(p.handle || "")
              .toUpperCase()
              .includes(q)
          ) ||
          products.find((p) =>
            String(p.title || "")
              .toUpperCase()
              .includes(q)
          ) ||
          null;
        if (hit && hit.handle) return pdpUrlFromHandle(hit.handle);
      }
    } catch {
      // try next query
    }
    await sleep(Math.min(options.delayMs || 400, 300));
  }

  // Many TWEG PDPs use the SKU as handle (e.g. tweg26300)
  for (const q of queries) {
    const guessed = pdpUrlFromHandle(String(q).toLowerCase());
    try {
      const probe = await fetchText(productJsonUrl(guessed), {
        timeoutMs: options.timeoutMs,
        headers: { Accept: "application/json" },
      });
      if (probe.ok && probe.text && /"product"\s*:/.test(probe.text)) {
        return guessed;
      }
    } catch {
      /* ignore */
    }
    await sleep(200);
  }

  return null;
}

/** Extra keys: strip 2-char Timex region suffix (UJ/IK/LK/U9…) when site omits it. */
function regionBareKeys(compact) {
  const up = String(compact || "")
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  if (up.length < 10) return [];
  if (/[A-Z0-9]{2}$/i.test(up)) {
    const bare = up.slice(0, -2);
    // Keep only when bare still looks like a Timex model (TW…)
    if (/^TW/i.test(bare) && bare.length >= 8) return [bare];
  }
  return [];
}

/** True if haystack contains the IMS SKU or any conservative alias. */
function skuPresentOnPage(hayUpper, normalized) {
  const keys = [
    ...skuMatchKeys(normalized.original || normalized.compact),
    ...regionBareKeys(normalized.compact),
    ...regionBareKeys(normalized.style),
  ];
  return keys.some((k) => k && hayUpper.includes(k));
}

/** Which style form actually appears on the page (for near-match badge). */
function matchedStyleOnPage(hayUpper, normalized) {
  const preferred = [
    normalized.style,
    normalized.compact,
    ...normalized.styleCandidates,
    ...regionBareKeys(normalized.style),
    ...regionBareKeys(normalized.compact),
  ];
  for (const k of preferred) {
    const up = String(k || "")
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
    if (up && hayUpper.includes(up)) return up;
  }
  return normalized.style || normalized.compact;
}

function extractSpecsFromHtml(html) {
  const attrs = {};
  const re =
    /<tr[^>]*>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>\s*<td[^>]*>\s*:\s*<\/td>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = re.exec(html))) {
    const label = stripTags(m[1]).toLowerCase();
    const value = stripTags(m[2]);
    if (label && value) attrs[label] = value;
  }
  return attrs;
}

function extractImagesFromProductJson(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const urls = [];
  const seen = new Set();
  for (const img of images) {
    const src = String(img?.src || "").split("?")[0];
    if (!src || !/cdn\.shopify\.com/i.test(src)) continue;
    // Prefer full-size path without tiny size suffixes in query (already stripped)
    if (seen.has(src)) continue;
    seen.add(src);
    urls.push(src);
  }
  if (!urls.length && product?.image?.src) {
    urls.push(String(product.image.src).split("?")[0]);
  }
  return urls;
}

function parseShopifyProductJson(text) {
  const data = JSON.parse(text);
  const product = data.product || data;
  if (!product || !product.title) {
    throw Object.assign(new Error("not_found: invalid Shopify product JSON"), {
      code: "not_found",
    });
  }
  return product;
}

function mapFromShopify(product, html, skuInput, sourceUrl) {
  const sku = normalizeSku(skuInput);
  const attrs = html ? extractSpecsFromHtml(html) : {};
  const variant =
    (product.variants || []).find(
      (v) =>
        String(v.sku || "")
          .toUpperCase()
          .replace(/[.\-_\s]/g, "") === sku.compact
    ) ||
    (product.variants || [])[0] ||
    {};

  const officialSku =
    attrs.watch ||
    String(variant.sku || "").trim().toUpperCase() ||
    sku.compact;

  const mapped = {};
  for (const [label, field] of Object.entries(ATTR_MAP)) {
    if (attrs[label]) mapped[field] = attrs[label];
  }

  // Prefer explicit strap color; band color is a fallback
  if (!mapped.strapColor && attrs["band color"]) {
    mapped.strapColor = attrs["band color"];
  }

  const description =
    stripTags(product.body_html || "") ||
    stripTags(match1(html || "", /property="og:description"\s+content="([^"]+)"/i)) ||
    "";

  const title = String(product.title || "").trim() || `Timex ${sku.compact}`;
  const images = extractImagesFromProductJson(product);

  const priceAmount =
    variant.price != null && variant.price !== ""
      ? Number(variant.price)
      : null;
  const compareAt =
    variant.compare_at_price != null && variant.compare_at_price !== ""
      ? Number(variant.compare_at_price)
      : null;

  const { product: normalized, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact,
      officialSku,
      title,
      description,
      caseMaterial: mapped.caseMaterial || "",
      caseShape: mapped.caseShape || "",
      caseSize: normalizeCaseSize(mapped.caseSize || ""),
      dialColor: mapped.dialColor || "",
      waterResistance: mapped.waterResistance || "",
      movement: mapped.movement || "",
      strapMaterial: mapped.strapMaterial || "",
      strapColor: normalizeStrapColor(mapped.strapColor || ""),
      gender: mapped.gender || "",
      warrantyPeriod: mapped.warrantyPeriod || "",
      category: mapped.category || "",
      price: null,
      oldPrice: null,
      priceSource:
        priceAmount != null && Number.isFinite(priceAmount)
          ? {
              amount: priceAmount,
              mrp:
                compareAt != null && Number.isFinite(compareAt)
                  ? compareAt
                  : null,
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
        handle: product.handle || "",
        vendor: product.vendor || "",
        tags: product.tags || "",
        caseColor: attrs["case color"] || "",
        caseThickness: attrs["case thickness"] || "",
        glassMaterial: attrs["glass material"] || "",
        countryOfOrigin: attrs["country of origin"] || "",
        displayType: attrs["display type"] || "",
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
    normalized.warnings.push("specs_table_missing");
  }
  if (fieldUnmapped && Object.keys(fieldUnmapped).length) {
    normalized.warnings.push("unmapped_constrained_fields");
  }

  const metaDescription =
    match1(html || "", /property="og:description"\s+content="([^"]+)"/i) ||
    match1(html || "", /name="description"\s+content="([^"]+)"/i) ||
    "";

  Object.assign(normalized, buildSeo(normalized, { metaDescription }));
  return normalized;
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
  for (const name of [
    `${compact}.html`,
    `timex-${compact}.html`,
    `${compact.toLowerCase()}.html`,
  ]) {
    const candidate = path.join(fixtureDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function fixtureJsonPathForSku(fixtureDir, sku) {
  if (!fixtureDir) return null;
  const { compact } = normalizeSku(sku);
  for (const name of [
    `${compact}.json`,
    `timex-${compact}.json`,
    `${compact.toLowerCase()}.json`,
  ]) {
    const candidate = path.join(fixtureDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function fetchProductBundle(sku, options = {}) {
  if (options.htmlPath) {
    const htmlBundle = readFixtureHtml(options.htmlPath, options.officialUrl);
    let product = null;
    const jp = fixtureJsonPathForSku(options.fixtureDir, sku);
    if (jp) {
      product = parseShopifyProductJson(fs.readFileSync(jp, "utf8"));
    }
    return { ...htmlBundle, product };
  }

  if (options.preferFixture) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    const jp = fixtureJsonPathForSku(options.fixtureDir, sku);
    if (fp || jp) {
      const htmlBundle = fp
        ? readFixtureHtml(fp, options.officialUrl)
        : {
            html: "",
            sourceUrl: options.officialUrl || "",
            fromFixture: true,
          };
      const product = jp
        ? parseShopifyProductJson(fs.readFileSync(jp, "utf8"))
        : null;
      return { ...htmlBundle, product };
    }
  }

  let url = options.officialUrl || (await resolveProductUrl(sku, options));
  if (!url) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    const jp = fixtureJsonPathForSku(options.fixtureDir, sku);
    if (fp || jp) {
      const htmlBundle = fp
        ? readFixtureHtml(fp, options.officialUrl)
        : { html: "", sourceUrl: "", fromFixture: true };
      return {
        ...htmlBundle,
        product: jp
          ? parseShopifyProductJson(fs.readFileSync(jp, "utf8"))
          : null,
      };
    }
    const err = new Error(`not_found: no official URL for ${sku}`);
    err.code = "not_found";
    throw err;
  }

  const jsonUrl = productJsonUrl(url);
  const jsonRes = await fetchText(jsonUrl, {
    timeoutMs: options.timeoutMs,
    headers: { Accept: "application/json" },
  });
  if (!jsonRes.ok || !jsonRes.text) {
    throw Object.assign(
      new Error(`fetch_failed: HTTP ${jsonRes.status || "?"} for ${jsonUrl}`),
      { code: "fetch_failed" }
    );
  }
  const product = parseShopifyProductJson(jsonRes.text);
  const pdp = pdpUrlFromHandle(product.handle || url);
  await sleep(options.delayMs || 400);
  const htmlRes = await fetchText(pdp, { timeoutMs: options.timeoutMs });
  if (!htmlRes.ok || !htmlRes.text || htmlRes.text.length < 500) {
    return {
      html: "",
      sourceUrl: pdp,
      fromFixture: false,
      product,
      warnings: ["html_fetch_weak_specs_may_be_missing"],
    };
  }
  return {
    html: htmlRes.text,
    sourceUrl: htmlRes.url || pdp,
    fromFixture: false,
    product,
  };
}

async function enrichSku(sku, options = {}) {
  const normalized = normalizeSku(sku);
  try {
    const { html, sourceUrl, fromFixture, product, warnings } =
      await fetchProductBundle(sku, options);
    if (!product) {
      return {
        status: "not_found",
        sku: normalized.compact,
        brand: BRAND,
        source: SOURCE_OFFICIAL,
        reason: "Shopify product JSON missing",
        sourceUrl,
        scrapedAt: new Date().toISOString(),
      };
    }

    // Map using the page style when typo-corrected so officialSku aligns with site
    const mapSku =
      normalized.typoFrom && normalized.style !== normalized.compact
        ? normalized.style
        : sku;
    const mapped = mapFromShopify(product, html, mapSku, sourceUrl);
    // Always keep IMS compact as product.sku so staff-wins merge hits the IMS row
    mapped.sku = normalized.compact;
    mapped.fetchMode = fromFixture ? "fixture" : "live";
    if (Array.isArray(warnings) && warnings.length) {
      mapped.warnings = [...(mapped.warnings || []), ...warnings];
    }

    const hay = `${mapped.officialSku} ${sourceUrl} ${product.handle || ""} ${
      product.title || ""
    }`.toUpperCase();
    if (!skuPresentOnPage(hay, normalized)) {
      return {
        status: "not_found",
        sku: normalized.compact,
        brand: BRAND,
        source: SOURCE_OFFICIAL,
        reason: "SKU not present on resolved Timex India page",
        sourceUrl,
        scrapedAt: new Date().toISOString(),
      };
    }

    const matchedStyle = matchedStyleOnPage(hay, normalized);
    const isNear =
      Boolean(normalized.typoFrom) ||
      (matchedStyle && matchedStyle !== normalized.compact);
    if (isNear) {
      mapped.nearMatch = true;
      mapped.typoFrom = normalized.typoFrom || normalized.compact;
      mapped.imsSku = normalized.compact;
      mapped.matchedStyle = matchedStyle;
      mapped.nearMatchMethod =
        normalized.nearMatchMethod ||
        (matchedStyle !== normalized.compact ? "suffix_alias" : "typo_map");
      mapped.warnings = [
        ...(mapped.warnings || []),
        `near_match_${matchedStyle}`,
      ];
    }
    return mapped;
  } catch (err) {
    return {
      status: err.code || "error",
      sku: normalized.compact,
      brand: BRAND,
      source: SOURCE_OFFICIAL,
      reason: err.message,
      scrapedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  BRAND,
  SITE_ORIGIN,
  SOURCE_OFFICIAL,
  ATTR_MAP,
  SKU_TYPO_MAP,
  normalizeSku,
  skuMatchKeys,
  resolveSkuTypo,
  regionSuffixAliases,
  resolveProductUrl,
  extractSpecsFromHtml,
  mapFromShopify,
  fetchProductBundle,
  enrichSku,
  productJsonUrl,
};
