"use strict";

/**
 * Alexandre Christie enrichment — retailer-first (official site CF-blocked).
 *
 * Official: https://www.alexandrechristie.com/ (Node often gets HTTP 403 / CF).
 * Prefer official PDP only when a URL or fixture is provided.
 *
 * Resolve order:
 *   1. options.officialUrl / CSV official_url / REF_URLS / fixture
 *   2. On official miss (or no discoverable official): luxury retailer chain
 *      Collective → Tata Cliq Luxury → TGT Luxe → Ethos
 *   Tata Cliq always stays in the chain (lib/retailerFallback.js).
 *
 * First SKU: 2B58BFBROBO (Passion Quartz Multifunction Women 36 mm)
 *   Tata Cliq: …/alexandre-christie-passion-quartz-multifunction-women-36-mm-2b58bfbrobo/p-mp000000032996347
 *
 * Prefer brand-site CDN when available; retailer images otherwise. No auto-publish.
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
  enrichFromTataCliq,
  mapTataCliqProduct,
  looksLikeTataCliqPdp,
} = require("../lib/tatacliq");

const BRAND = "Alexandre Christie";
const SITE_ORIGIN = "https://www.alexandrechristie.com";
const SOURCE_OFFICIAL = "alexandre-christie";
const SOURCE_COLLECTIVE = RETAILER_SOURCE.COLLECTIVE;
const SOURCE_TATA = RETAILER_SOURCE.TATA;
const SOURCE_TGT = RETAILER_SOURCE.TGT;
const SOURCE_ETHOS = RETAILER_SOURCE.ETHOS;

const OFFICIAL_FAIL_CODES = new Set([
  "not_found",
  "fetch_failed",
  "error",
  "blocked",
]);

/** Known official PDPs when discoverable (compact SKU → URL). Currently empty — CF. */
const REF_URLS = {};

/** Known Tata Cliq Luxury PDPs (compact → URL). */
const TATA_CLIQ_REF_URLS = {
  "2B58BFBROBO":
    "https://luxury.tatacliq.com/alexandre-christie-passion-quartz-multifunction-women-36-mm-2b58bfbrobo/p-mp000000032996347",
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

function polishRetailerProduct(product, normalized) {
  if (!product || product.status !== "ok") return product;
  product.brand = BRAND;
  product.sku = normalized.compact;
  if (!product.officialSku) product.officialSku = normalized.compact;

  // Normalize ALL-CAPS brand prefix in Tata titles
  let title = String(product.title || "").trim();
  title = title
    .replace(/^ALEXANDRE\s+CHRISTIE\b/i, BRAND)
    .replace(/^ALEXANDRA\s+CHRISTIE\b/i, BRAND)
    .trim();
  if (title && !new RegExp(`^${BRAND}\\b`, "i").test(title)) {
    title = `${BRAND} ${title}`;
  }
  product.title = title;

  Object.assign(product, buildSeo(product, { metaDescription: "" }));
  return product;
}

function fixtureCandidates(sku, fixtureDir) {
  const n = normalizeSku(sku);
  const dir = fixtureDir || path.join(__dirname, "..", "fixtures");
  const names = [
    `alexandre-christie-${n.compact}.html`,
    `alexandra-christie-${n.compact}.html`,
    `tatacliq-${n.compact}.html`,
    `${n.compact}.html`,
  ];
  return names.map((name) => path.join(dir, name));
}

function resolveFixturePath(sku, options = {}) {
  if (options.htmlPath && fs.existsSync(options.htmlPath)) {
    return options.htmlPath;
  }
  if (!options.preferFixture && !options.htmlPath) return null;
  for (const p of fixtureCandidates(sku, options.fixtureDir)) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Lightweight official attempt — only when URL/fixture is known.
 * Full official catalog scrape is blocked by Cloudflare for Node.
 */
async function fetchOfficialBundle(sku, options = {}) {
  const normalized = normalizeSku(sku);
  const fixture = resolveFixturePath(sku, options);
  if (fixture) {
    const html = fs.readFileSync(fixture, "utf8");
    // Tata Cliq fixtures are common for this brand — detect and route
    if (looksLikeTataCliqPdp(html)) {
      return {
        kind: "tatacliq",
        html,
        sourceUrl:
          options.tataCliqUrl ||
          TATA_CLIQ_REF_URLS[normalized.compact] ||
          options.officialUrl ||
          null,
        fromFixture: true,
      };
    }
    return {
      kind: "official",
      html,
      sourceUrl: options.officialUrl || `fixture://${path.basename(fixture)}`,
      fromFixture: true,
    };
  }

  const url =
    options.officialUrl ||
    (options.refUrls && options.refUrls[normalized.compact]) ||
    REF_URLS[normalized.compact] ||
    null;

  if (!url) {
    const err = new Error(
      `not_found: no discoverable official URL for ${normalized.compact} (alexandrechristie.com CF-blocks Node; pass --url or use retailers)`
    );
    err.code = "not_found";
    throw err;
  }

  const res = await fetchText(url, {
    timeoutMs: options.timeoutMs || 30000,
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: SITE_ORIGIN + "/",
    },
  });
  if (!res.ok || !res.text || res.text.length < 500) {
    const code =
      res.status === 403 || res.status === 503 ? "blocked" : "fetch_failed";
    throw Object.assign(
      new Error(
        `${code}: HTTP ${res.status || "?"} for ${url} (official site often CF-challenges Node)`
      ),
      { code, sourceUrl: url }
    );
  }
  if (looksLikeTataCliqPdp(res.text)) {
    return {
      kind: "tatacliq",
      html: res.text,
      sourceUrl: res.url || url,
      fromFixture: false,
    };
  }
  return {
    kind: "official",
    html: res.text,
    sourceUrl: res.url || url,
    fromFixture: false,
  };
}

/**
 * Best-effort map of an official HTML page via JSON-LD Product when present.
 * Returns null when the page has no usable product payload.
 */
function mapOfficialHtml(html, sku, sourceUrl) {
  const normalized = normalizeSku(sku);
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let ld = null;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1].trim());
      const list = Array.isArray(data) ? data : [data];
      for (const item of list) {
        if (item && item["@type"] === "Product") {
          ld = item;
          break;
        }
      }
      if (ld) break;
    } catch {
      /* ignore */
    }
  }
  if (!ld) return null;

  const hay = `${ld.name || ""} ${ld.sku || ""} ${ld.mpn || ""} ${html}`
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  if (normalized.compact && !hay.includes(normalized.compact)) return null;

  const imagesRaw = ld.image;
  const images = (
    Array.isArray(imagesRaw) ? imagesRaw : imagesRaw ? [imagesRaw] : []
  )
    .map((u) => String(u || "").trim())
    .filter(Boolean)
    .map((u) => (u.startsWith("//") ? `https:${u}` : u));

  const offers = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
  const priceSource =
    offers && offers.price != null
      ? {
          amount: Number(offers.price),
          currency: offers.priceCurrency || "",
          label: String(offers.price),
        }
      : null;

  const product = {
    status: "ok",
    brand: BRAND,
    sku: normalized.compact,
    officialSku: String(ld.sku || ld.mpn || normalized.compact)
      .toUpperCase()
      .replace(/[.\-_\s]/g, ""),
    title: String(ld.name || `${BRAND} ${normalized.compact}`).trim(),
    description: String(ld.description || "").trim(),
    caseMaterial: "",
    caseShape: "",
    caseSize: "",
    dialColor: "",
    waterResistance: "",
    movement: "",
    strapMaterial: "",
    strapColor: "",
    gender: "",
    warrantyPeriod: "",
    category: "",
    price: null,
    oldPrice: null,
    priceSource,
    images,
    sourceUrl,
    source: SOURCE_OFFICIAL,
    scrapedAt: new Date().toISOString(),
    rawAttributes: {},
    extras: {},
    warnings: [],
  };
  Object.assign(product, buildSeo(product, { metaDescription: "" }));
  if (!product.images.length) product.warnings.push("no_sku_images");
  if (!product.description || product.description.length < 40) {
    product.warnings.push("description_short_or_missing");
  }
  return product;
}

async function enrichFromRetailerFallback(sku, options = {}) {
  const normalized = normalizeSku(sku);
  const { product } = await enrichFromRetailerChain(sku, {
    ...options,
    brandHint: BRAND,
    preset: "luxury",
    tataCliqUrl:
      options.tataCliqUrl ||
      TATA_CLIQ_REF_URLS[normalized.compact] ||
      null,
    tataCliqRefUrls: {
      ...TATA_CLIQ_REF_URLS,
      ...(options.tataCliqRefUrls || {}),
    },
    fixtureDir:
      options.fixtureDir || path.join(__dirname, "..", "fixtures"),
  });
  if (!product) return null;
  return polishRetailerProduct(product, normalized);
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

  // Prefer fixture / known official URL first when discoverable
  const hasOfficialHint = Boolean(
    options.officialUrl ||
      options.htmlPath ||
      options.preferFixture ||
      REF_URLS[normalized.compact]
  );

  if (hasOfficialHint) {
    try {
      const bundle = await fetchOfficialBundle(sku, options);
      if (bundle.kind === "tatacliq") {
        const product = mapTataCliqProduct(
          bundle.html,
          sku,
          bundle.sourceUrl,
          { brandHint: BRAND }
        );
        product.fetchMode = bundle.fromFixture ? "fixture" : "live";
        product.source = SOURCE_TATA;
        polishRetailerProduct(product, normalized);
        product.warnings = product.warnings || [];
        if (!product.warnings.includes("india_retailer_tatacliq_fallback")) {
          product.warnings.push("india_retailer_tatacliq_fallback");
        }
        if (options.delayMs) await sleep(options.delayMs);
        return product;
      }
      const mapped = mapOfficialHtml(bundle.html, sku, bundle.sourceUrl);
      if (mapped) {
        mapped.fetchMode = bundle.fromFixture ? "fixture" : "live";
        if (options.delayMs) await sleep(options.delayMs);
        return mapped;
      }
    } catch (err) {
      if (!OFFICIAL_FAIL_CODES.has(err.code || "error")) {
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
      // fall through to retailers
    }
  }

  if (!options.skipRetailerFallback) {
    const retailer = await enrichFromRetailerFallback(sku, options);
    if (retailer && retailer.status === "ok") return retailer;
  }

  return {
    status: "not_found",
    sku: normalized.compact,
    brand: BRAND,
    source: SOURCE_OFFICIAL,
    reason:
      "No official PDP (CF) and retailer chain missed — pass --tatacliq-url or add REF",
    sourceUrl: null,
    scrapedAt: new Date().toISOString(),
  };
}

module.exports = {
  BRAND,
  SITE_ORIGIN,
  SOURCE_OFFICIAL,
  SOURCE_COLLECTIVE,
  SOURCE_TATA,
  SOURCE_TGT,
  SOURCE_ETHOS,
  REF_URLS,
  TATA_CLIQ_REF_URLS,
  normalizeSku,
  skuMatchKeys,
  polishRetailerProduct,
  enrichFromRetailerFallback,
  enrichSku,
  enrichFromTataCliq,
};
