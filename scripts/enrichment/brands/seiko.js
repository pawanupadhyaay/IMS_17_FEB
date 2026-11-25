"use strict";

/**
 * Seiko enrichment — prefer official India Shopify (seikowatches.co.in),
 * fall back to seikowatches.com (Sitecore, in-en locale).
 *
 * India (Shopify) resolve order:
 *   1. options.officialUrl / CSV official_url
 *   2. Predictive search /search/suggest.json?q=SKU
 *   3. Handle guess …-{sku lower} via /products/{handle}.json
 *   4. Catalog crawl /products.json (cached in-process)
 *   5. Fixture JSON/HTML under fixtures/
 *
 * Global (Sitecore) resolve order when India misses:
 *   1. Marsflag site search
 *   2. Heuristic collection + slug candidates
 *
 * Cloudflare often blocks Node against seikowatches.co.in — use fixtures /
 * browser-saved product JSON; Get details passes preferFixture: true.
 * Official brand images only (no Ethos/Helios). Do not auto-publish.
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

const BRAND = "Seiko";
const INDIA_ORIGIN = "https://seikowatches.co.in";
const GLOBAL_ORIGIN = "https://www.seikowatches.com";
const SITE_ORIGIN = INDIA_ORIGIN; // preferred official
const PREFERRED_LOCALE = "in-en";
const SOURCE_OFFICIAL = "seiko";
const SOURCE_INDIA = "seiko-india";
const SOURCE_GLOBAL = "seiko-global";
const MARSFLAG_SEARCH =
  "https://finder.api.mf.marsflag.com/api/v1/finder_service/documents/0ecf9cce/search";

const COLLECTIONS = [
  "prospex",
  "presage",
  "5sports",
  "astron",
  "kingseiko",
  "discovermore",
  "seiko-power-design-project",
];

const TITLE_COLLECTION_HINTS = [
  [/prospex|speedtimer|diver|alpinist/i, ["prospex"]],
  [/presage|cocktail|style\s*60|urushi|bonsai/i, ["presage"]],
  [/5\s*sports|seiko\s*5|field|snxs|skx/i, ["5sports"]],
  [/astron|gps\s*solar/i, ["astron"]],
  [/king\s*seiko/i, ["kingseiko"]],
  [/dress|essentials|ladies|classic\s*titanium/i, ["discovermore"]],
];

/** Shopify body_html / feature labels → schema fields */
const SHOPIFY_ATTR_MAP = {
  gender: "gender",
  movement: "movement",
  "movement type": "movement",
  calibre: "caliber",
  caliber: "caliber",
  case: "caseMaterial",
  "case material": "caseMaterial",
  "case size": "caseSizeRaw",
  "case shape": "caseShape",
  "dial colour": "dialColor",
  "dial color": "dialColor",
  "water resistance": "waterResistance",
  clasp: "clasp",
  "glass type": "crystal",
  crystal: "crystal",
  "band material": "strapMaterial",
  "bracelet material": "strapMaterial",
  "strap material": "strapMaterial",
  "band colour": "strapColor",
  "band color": "strapColor",
  "strap color": "strapColor",
};

/** Global Sitecore SSR labels */
const GLOBAL_ATTR_MAP = {
  "caliber number": "caliber",
  "movement type": "movement",
  "case material": "caseMaterial",
  "case size": "caseSizeRaw",
  "water resistance": "waterResistance",
  "band material": "strapMaterial",
  "bracelet material": "strapMaterial",
  "strap material": "strapMaterial",
  clasp: "clasp",
  crystal: "crystal",
  weight: "weight",
  "distance between lugs": "lugWidth",
};

let catalogCache = null; // Map skuUpper → { handle, title, barcode }

function normalizeSku(raw) {
  const original = String(raw || "").trim();
  const compact = original.toUpperCase().replace(/[\s_\-]/g, "");
  const base = stripCountrySuffix(compact);
  const styleCandidates = [...new Set([compact, base].filter(Boolean))];
  return {
    compact,
    ims: compact,
    style: compact,
    base,
    original,
    typoFrom: null,
    nearMatchMethod: null,
    styleCandidates,
  };
}

function stripCountrySuffix(compact) {
  const up = String(compact || "").toUpperCase();
  const m = up.match(/^(.*?)(J1|K1|K2|K3|P1|P2|P3)$/);
  return m ? m[1] : up;
}

function skuMatchKeys(raw) {
  const n = normalizeSku(raw);
  return [...new Set([n.compact, n.base].filter(Boolean))];
}

function absUrl(url, base = INDIA_ORIGIN) {
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
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function match1(html, re) {
  const m = String(html || "").match(re);
  return m ? decodeEntities(m[1].trim()) : "";
}

function isCloudflareChallenge(text) {
  const t = String(text || "");
  return (
    /Verifying your connection/i.test(t) ||
    /cf-injected-html|cf_chl_opt|Enable JavaScript and cookies/i.test(t)
  );
}

function isIndiaUrl(url) {
  return /seikowatches\.co\.in/i.test(String(url || ""));
}

function isGlobalUrl(url) {
  return /seikowatches\.com/i.test(String(url || ""));
}

function productJsonUrl(pdpOrHandle) {
  const s = String(pdpOrHandle || "").trim();
  if (!s) return null;
  if (/\/products\/[^/?#]+\.json$/i.test(s)) return absUrl(s, INDIA_ORIGIN);
  if (/^https?:\/\//i.test(s)) {
    const u = s.replace(/\/?(\?.*)?$/, "").replace(/#.*$/, "");
    if (/\/products\//i.test(u)) return `${u}.json`.replace(/\.json\.json$/i, ".json");
  }
  const handle = s.replace(/^\/+/, "").replace(/^products\//i, "");
  return `${INDIA_ORIGIN}/products/${handle}.json`;
}

function pdpUrlFromHandle(handle) {
  return `${INDIA_ORIGIN}/products/${String(handle || "").replace(/^\/+/, "")}`;
}

function parseShopifyProductJson(text) {
  const data = typeof text === "string" ? JSON.parse(text) : text;
  const product = data.product || data;
  if (!product || !product.title) {
    throw Object.assign(new Error("not_found: invalid Shopify product JSON"), {
      code: "not_found",
    });
  }
  return product;
}

function skuHitsHaystack(hay, sku) {
  const n = normalizeSku(sku);
  const up = String(hay || "").toUpperCase().replace(/[\s_\-]/g, "");
  return (
    (n.compact && up.includes(n.compact)) ||
    (n.base && n.base.length >= 5 && up.includes(n.base))
  );
}

function pickSearchHit(products, sku) {
  const n = normalizeSku(sku);
  const list = products || [];
  const score = (p) => {
    const handle = String(p.handle || "").toUpperCase();
    const title = String(p.title || "").toUpperCase();
    const hay = `${handle} ${title}`;
    let s = 0;
    if (handle.endsWith(n.compact) || handle.endsWith(`-${n.compact}`)) s += 50;
    if (title.includes(n.compact)) s += 40;
    if (handle.includes(n.compact)) s += 30;
    if (n.base && title.includes(n.base)) s += 20;
    if (n.base && handle.includes(n.base)) s += 15;
    if (!skuHitsHaystack(hay, sku)) s -= 100;
    return s;
  };
  const ranked = list
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return ranked[0]?.p || null;
}

async function indiaSuggest(sku, options = {}) {
  const n = normalizeSku(sku);
  const queries = [...new Set([n.compact, n.base].filter(Boolean))];
  for (const q of queries) {
    const suggestUrl =
      `${INDIA_ORIGIN}/search/suggest.json?q=${encodeURIComponent(q)}` +
      "&resources%5Btype%5D=product&resources%5Blimit%5D=10";
    try {
      const res = await fetchText(suggestUrl, {
        timeoutMs: options.timeoutMs || 20000,
        headers: { Accept: "application/json" },
      });
      if (!res.ok || !res.text || isCloudflareChallenge(res.text)) continue;
      const data = JSON.parse(res.text);
      const products =
        data?.resources?.results?.products ||
        data?.resources?.products ||
        [];
      const hit = pickSearchHit(products, sku);
      if (hit?.handle) {
        return {
          url: pdpUrlFromHandle(hit.handle),
          handle: hit.handle,
          via: "india_suggest",
          query: q,
        };
      }
    } catch {
      /* next */
    }
    if (options.delayMs) await sleep(Math.min(options.delayMs, 250));
  }
  return null;
}

async function loadIndiaCatalog(options = {}) {
  if (catalogCache) return catalogCache;
  const bySku = new Map();
  for (let page = 1; page <= 40; page++) {
    const url = `${INDIA_ORIGIN}/products.json?limit=250&page=${page}`;
    try {
      const res = await fetchText(url, {
        timeoutMs: options.timeoutMs || 30000,
        headers: { Accept: "application/json" },
      });
      if (!res.ok || !res.text || isCloudflareChallenge(res.text)) break;
      const data = JSON.parse(res.text);
      const products = data.products || [];
      if (!products.length) break;
      for (const p of products) {
        const handle = String(p.handle || "");
        const title = String(p.title || "");
        const barcode = String(p.variants?.[0]?.barcode || "")
          .toUpperCase()
          .replace(/[\s_\-]/g, "");
        const hay = `${handle} ${title} ${barcode}`.toUpperCase();
        const m = hay.match(
          /\b([A-Z]{2,5}\d{2,5}[A-Z]?(?:J1|K1|K2|K3|P1|P2|P3)?)\b/
        );
        // Index by barcode and by trailing -SKU in handle/title
        if (barcode) bySku.set(barcode, { handle, title, barcode });
        const handleSku = handle.match(/-([a-z0-9]+)$/i);
        if (handleSku) {
          const k = handleSku[1].toUpperCase();
          if (!bySku.has(k)) bySku.set(k, { handle, title, barcode });
        }
        if (m) {
          const k = m[1].toUpperCase();
          if (!bySku.has(k)) bySku.set(k, { handle, title, barcode });
        }
      }
      if (products.length < 250) break;
    } catch {
      break;
    }
    if (options.delayMs) await sleep(Math.min(options.delayMs, 200));
  }
  catalogCache = bySku;
  return bySku;
}

async function resolveIndiaUrl(sku, options = {}) {
  if (options.officialUrl && isIndiaUrl(options.officialUrl)) {
    return {
      url: options.officialUrl.split("?")[0].replace(/\/$/, ""),
      via: "official_url",
    };
  }
  if (options.officialUrl && /\/products\//i.test(options.officialUrl) && !isGlobalUrl(options.officialUrl)) {
    return { url: options.officialUrl, via: "official_url" };
  }

  const suggest = await indiaSuggest(sku, options);
  if (suggest) return suggest;

  const n = normalizeSku(sku);
  // Common handle pattern: …-{sku lower}
  for (const q of [n.compact, n.base]) {
    if (!q) continue;
    const guessHandle = String(q).toLowerCase();
    // try exact handle = sku
    for (const handle of [guessHandle, `seiko-${guessHandle}`]) {
      const probe = productJsonUrl(handle);
      try {
        const res = await fetchText(probe, {
          timeoutMs: options.timeoutMs || 15000,
          headers: { Accept: "application/json" },
        });
        if (
          res.ok &&
          res.text &&
          !isCloudflareChallenge(res.text) &&
          /"product"\s*:/.test(res.text)
        ) {
          return { url: pdpUrlFromHandle(handle), handle, via: "handle_guess" };
        }
      } catch {
        /* next */
      }
    }
  }

  try {
    const catalog = await loadIndiaCatalog(options);
    for (const key of skuMatchKeys(sku)) {
      const hit = catalog.get(key);
      if (hit?.handle) {
        return {
          url: pdpUrlFromHandle(hit.handle),
          handle: hit.handle,
          via: "india_catalog",
        };
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

function extractShopifyAttrs(bodyHtml) {
  const attrs = {};
  const html = String(bodyHtml || "");
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(html))) {
    const text = stripTags(m[1]).replace(/\s+/g, " ").trim();
    const kv = text.match(/^([^:]+?)\s*:\s*(.+)$/);
    if (!kv) continue;
    const label = kv[1].toLowerCase().trim();
    const value = kv[2].trim();
    if (label && value) attrs[label] = value;
  }
  return attrs;
}

function extractCaseSizeMm(caseSizeRaw) {
  const s = String(caseSizeRaw || "");
  const diam = s.match(/Diameter\s*[:=]?\s*([\d.]+)\s*mm/i);
  if (diam) return normalizeCaseSize(diam[1]);
  // Avoid mistaking thickness for diameter when both present
  if (/Thickness/i.test(s) && !/Diameter/i.test(s)) {
    const any = s.match(/([\d.]+)\s*mm/i);
    return any ? normalizeCaseSize(any[1]) : "";
  }
  const any = s.match(/([\d.]+)\s*mm/i);
  return any ? normalizeCaseSize(any[1]) : "";
}

function extractImagesFromProductJson(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const urls = [];
  const seen = new Set();
  for (const img of images) {
    const src = String(img?.src || "").split("?")[0];
    if (!src || !/cdn\.shopify\.com/i.test(src)) continue;
    if (seen.has(src)) continue;
    seen.add(src);
    urls.push(src);
  }
  if (!urls.length && product?.image?.src) {
    urls.push(String(product.image.src).split("?")[0]);
  }
  return urls;
}

function mapMovement(raw) {
  const s = String(raw || "");
  if (/gps\s*solar/i.test(s)) return "Solar";
  if (/automatic/i.test(s)) return "Automatic";
  if (/solar/i.test(s)) return "Solar";
  if (/quartz/i.test(s)) return "Quartz";
  if (/kinetic/i.test(s)) return "Kinetic";
  if (/spring\s*drive/i.test(s)) return "Spring Drive";
  if (/mechanical/i.test(s)) return "Mechanical";
  return s;
}

function mapCaseMaterial(raw) {
  const s = String(raw || "");
  if (/titanium/i.test(s)) return "Titanium";
  if (/stainless/i.test(s)) return "Stainless Steel";
  if (/ceramic/i.test(s)) return "Ceramic";
  if (/gold/i.test(s)) return "Gold";
  if (/resin/i.test(s)) return "Resin";
  return s;
}

function mapStrapMaterial(raw, tags = "") {
  const tagStr = String(tags || "");
  if (/Band Material_Titanium/i.test(tagStr)) return "Titanium";
  if (/Band Material_Leather/i.test(tagStr)) return "Leather";
  const s = `${raw} ${tagStr}`;
  if (/leather/i.test(s)) return "Leather";
  if (/silicone|rubber|urethane/i.test(s)) return "Rubber";
  if (/titanium/i.test(s)) return "Titanium";
  if (/metal|stainless|bracelet|steel/i.test(s)) return "Stainless Steel";
  if (/nylon|fabric|textile/i.test(s)) return "Fabric";
  return String(raw || "");
}

/** "Purple (Edo purple, gradient)" / Dial_colour_Purple → base color for normalize */
function mapDialColor(raw, tags = "") {
  const s = String(raw || "").trim();
  if (s) {
    const head = s.split(/[,(/\-]/)[0].trim();
    if (head) return head;
  }
  const tag = String(tags || "").match(/Dial_colour_([A-Za-z ]+)/i);
  return tag ? tag[1].trim() : "";
}

function mapWaterResistance(raw) {
  const s = String(raw || "");
  const bar = s.match(/(\d+)\s*bar/i);
  if (bar) {
    const m = Number(bar[1]) * 10;
    return `${m}m (${bar[1]} ATM)`;
  }
  const meters = s.match(/(\d+)\s*m/i);
  if (meters) {
    const m = Number(meters[1]);
    const atm = m >= 10 ? Math.round(m / 10) : null;
    return atm ? `${m}m (${atm} ATM)` : `${m}m`;
  }
  return s;
}

function mapFromShopify(product, skuInput, sourceUrl, meta = {}) {
  const sku = normalizeSku(skuInput);
  const attrs = extractShopifyAttrs(product.body_html || "");
  const variant = (product.variants || [])[0] || {};
  const barcode = String(variant.barcode || "")
    .toUpperCase()
    .replace(/[\s_\-]/g, "");
  const officialSku =
    barcode ||
    (skuHitsHaystack(product.title, sku) ? sku.compact : sku.compact);

  const mapped = {};
  for (const [label, field] of Object.entries(SHOPIFY_ATTR_MAP)) {
    if (attrs[label]) mapped[field] = attrs[label];
  }

  const descriptionParts = [];
  const body = String(product.body_html || "");
  const descChunk = body.match(
    /Product Description\s*:?\s*<\/h4>([\s\S]*?)(?:<h4|$)/i
  );
  if (descChunk) {
    const paras = [...descChunk[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((x) => stripTags(x[1]))
      .filter((t) => t.length >= 40);
    descriptionParts.push(...paras.slice(0, 4));
  }
  if (!descriptionParts.length) {
    const loose = stripTags(body);
    if (loose.length >= 60) descriptionParts.push(loose.slice(0, 1200));
  }
  const description = descriptionParts.join(" ").trim();

  const collection =
    String(product.product_type || "").trim() ||
    (String(product.tags || "").match(/\b(ASTRON|PROSPEX|PRESAGE|5\s*SPORTS)\b/i) ||
      [])[0] ||
    "";

  const title =
    String(product.title || "").trim() ||
    [BRAND, collection, sku.compact].filter(Boolean).join(" ");

  const images = extractImagesFromProductJson(product);
  const priceAmount =
    variant.price != null && variant.price !== ""
      ? Number(variant.price)
      : null;

  const tags = String(product.tags || "");
  const caseSize = extractCaseSizeMm(mapped.caseSizeRaw || attrs["case size"]);
  const movement = mapMovement(mapped.movement || "");
  const caseMaterial = mapCaseMaterial(mapped.caseMaterial || "");
  const strapMaterial = mapStrapMaterial(mapped.strapMaterial || "", tags);
  const waterResistance = mapWaterResistance(mapped.waterResistance || "");
  const dialColor = mapDialColor(mapped.dialColor || "", tags);
  const gender = mapped.gender || "";

  const { product: normalized, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact,
      officialSku,
      imsSku: sku.compact,
      title,
      description,
      caseMaterial,
      caseShape: mapped.caseShape || "",
      caseSize,
      dialColor,
      waterResistance,
      movement,
      strapMaterial,
      strapColor: normalizeStrapColor(mapped.strapColor || ""),
      gender: gender || "",
      warrantyPeriod: "",
      category: "",
      price: null,
      oldPrice: null,
      priceSource:
        priceAmount != null && Number.isFinite(priceAmount)
          ? {
              amount: priceAmount,
              mrp: null,
              currency: "INR",
              label: `₹${priceAmount.toLocaleString("en-IN")}`,
            }
          : null,
      images,
      sourceUrl,
      source: SOURCE_INDIA,
      scrapedAt: new Date().toISOString(),
      rawAttributes: attrs,
      extras: {
        collection,
        caliber: mapped.caliber || attrs.calibre || attrs.caliber || "",
        crystal: mapped.crystal || attrs["glass type"] || "",
        clasp: mapped.clasp || attrs.clasp || "",
        handle: product.handle || "",
        vendor: product.vendor || "",
        tags,
        resolveVia: meta.via || "india_shopify",
        httpStatus: meta.httpStatus || 200,
        site: "seikowatches.co.in",
      },
    });

  normalized.fieldMapped = fieldMapped;
  normalized.fieldUnmapped = fieldUnmapped;
  normalized.warnings = normalized.warnings || [];
  normalized.httpStatus = meta.httpStatus || 200;
  normalized.attemptedUrls = meta.attemptedUrls || [];

  if (!normalized.description || normalized.description.length < 40) {
    normalized.warnings.push("description_short_or_missing");
  }
  if (!normalized.images.length) {
    normalized.warnings.push("no_sku_images");
  }
  if (!Object.keys(attrs).length) {
    normalized.warnings.push("shopify_feature_attrs_missing");
  }

  Object.assign(normalized, buildSeo(normalized, { metaDescription: description }));
  return normalized;
}

function fixtureJsonPathForSku(fixtureDir, sku) {
  if (!fixtureDir) return null;
  const { compact, base } = normalizeSku(sku);
  for (const name of [
    `${compact}.json`,
    `seiko-${compact}.json`,
    `${compact.toLowerCase()}.json`,
    `${base}.json`,
  ]) {
    const candidate = path.join(fixtureDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function fixtureHtmlPathForSku(fixtureDir, sku) {
  if (!fixtureDir) return null;
  const { compact, base } = normalizeSku(sku);
  for (const name of [
    `${compact}.html`,
    `seiko-${compact}.html`,
    `${compact.toLowerCase()}.html`,
    `${base}.html`,
  ]) {
    const candidate = path.join(fixtureDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function fetchIndiaProduct(sku, options = {}) {
  const attempted = [];

  if (options.preferFixture || options.htmlPath) {
    const jp =
      options.htmlPath && /\.json$/i.test(options.htmlPath)
        ? options.htmlPath
        : fixtureJsonPathForSku(options.fixtureDir, sku);
    if (jp) {
      const product = parseShopifyProductJson(fs.readFileSync(jp, "utf8"));
      const url =
        options.officialUrl ||
        pdpUrlFromHandle(product.handle) ||
        `file://${path.resolve(jp)}`;
      return {
        product,
        sourceUrl: url,
        fromFixture: true,
        via: "fixture",
        attemptedUrls: [url],
        httpStatus: 200,
      };
    }
  }

  const resolved = await resolveIndiaUrl(sku, options);
  if (resolved?.url) {
    attempted.push(resolved.url);
    const jsonUrl = productJsonUrl(resolved.url);
    attempted.push(jsonUrl);
    try {
      const res = await fetchText(jsonUrl, {
        timeoutMs: options.timeoutMs || 30000,
        headers: { Accept: "application/json" },
      });
      if (
        res.ok &&
        res.text &&
        !isCloudflareChallenge(res.text) &&
        /"product"\s*:/.test(res.text)
      ) {
        const product = parseShopifyProductJson(res.text);
        return {
          product,
          sourceUrl: pdpUrlFromHandle(product.handle || resolved.handle),
          fromFixture: false,
          via: resolved.via,
          attemptedUrls: attempted,
          httpStatus: res.status || 200,
        };
      }
    } catch {
      /* fall through */
    }
  }

  // Fixture fallback after live CF/miss
  const jp = fixtureJsonPathForSku(options.fixtureDir, sku);
  if (jp) {
    const product = parseShopifyProductJson(fs.readFileSync(jp, "utf8"));
    const url =
      options.officialUrl ||
      pdpUrlFromHandle(product.handle) ||
      `file://${path.resolve(jp)}`;
    return {
      product,
      sourceUrl: url,
      fromFixture: true,
      via: "fixture_after_live_miss",
      attemptedUrls: attempted,
      httpStatus: 200,
    };
  }

  return null;
}

/* -------------------- Global Sitecore fallback -------------------- */

function parsePdpPath(url) {
  const m = String(url || "").match(
    /seikowatches\.com\/([a-z0-9-]+)\/products\/([^/]+)\/([a-zA-Z0-9]+)\/?/i
  );
  if (!m) return null;
  return { locale: m[1], collection: m[2], slug: m[3] };
}

function globalPdpUrl(locale, collection, slug) {
  return `${GLOBAL_ORIGIN}/${locale}/products/${collection}/${String(slug).toLowerCase()}`;
}

function rewriteLocale(url, locale = PREFERRED_LOCALE) {
  const parsed = parsePdpPath(url);
  if (!parsed) return url;
  return globalPdpUrl(locale, parsed.collection, parsed.slug);
}

function collectionHintsFromTitle(title) {
  const ordered = [];
  for (const [re, cols] of TITLE_COLLECTION_HINTS) {
    if (re.test(String(title || ""))) ordered.push(...cols);
  }
  return [...new Set([...ordered, ...COLLECTIONS])];
}

function slugCandidates(sku) {
  const n = normalizeSku(sku);
  return [...new Set([n.compact, n.base].filter(Boolean).map((s) => s.toLowerCase()))];
}

async function marsflagSearch(query, options = {}) {
  const q = String(query || "").trim();
  if (!q) return { hits: 0, docs: [] };
  const url = `${MARSFLAG_SEARCH}?q=${encodeURIComponent(q)}`;
  const res = await fetchText(url, {
    timeoutMs: options.timeoutMs || 20000,
    retries: 1,
    headers: { Accept: "application/json" },
  });
  if (!res.ok || !res.text) {
    throw Object.assign(new Error(`marsflag_http_${res.status}`), {
      code: "search_failed",
      sourceUrl: url,
    });
  }
  const data = JSON.parse(res.text);
  const organic = data.organic || {};
  return { hits: organic.hits || 0, docs: organic.docs || [], raw: data };
}

function scoreSearchDoc(doc, sku) {
  const n = normalizeSku(sku);
  const u = String(doc.url || "");
  const parsed = parsePdpPath(u);
  if (!parsed) return null;
  if (
    /^(lineup|features|about|field|skx)$/i.test(parsed.slug) ||
    /lineup/i.test(parsed.collection)
  ) {
    return null;
  }
  let score = 0;
  if (parsed.locale.toLowerCase() === PREFERRED_LOCALE) score += 50;
  else if (/^(us-en|uk-en|global-en|au-en|middleeast-en)$/i.test(parsed.locale))
    score += 20;
  const slugUp = String(parsed.slug).toUpperCase();
  if (slugUp === n.compact) score += 45;
  else if (slugUp === n.base) score += 35;
  else if (n.compact.startsWith(slugUp) || slugUp.startsWith(n.base)) score += 20;
  else score -= 30;
  const hay = `${doc.title || ""} ${doc.start_text || ""}`.toUpperCase();
  if (hay.includes(n.compact)) score += 20;
  else if (hay.includes(n.base)) score += 10;
  if ((doc.drilldown || []).includes("Products")) score += 5;
  return { score, ...parsed, url: u, title: doc.title || "" };
}

function pickSearchCandidates(docs, sku, limit = 8) {
  const scored = [];
  const seen = new Set();
  for (const doc of docs || []) {
    const s = scoreSearchDoc(doc, sku);
    if (!s || s.score < 10) continue;
    const key = `${s.collection}/${s.slug}`.toLowerCase();
    if (seen.has(key) && s.locale.toLowerCase() !== PREFERRED_LOCALE) continue;
    seen.add(key);
    scored.push(s);
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

async function resolveGlobalCandidateUrls(sku, options = {}) {
  const urls = [];
  const seen = new Set();
  const push = (url, meta = {}) => {
    if (!url || seen.has(url) || isIndiaUrl(url)) return;
    seen.add(url);
    urls.push({ url, ...meta });
  };

  if (options.officialUrl && isGlobalUrl(options.officialUrl)) {
    push(options.officialUrl, { via: "official_url" });
    push(rewriteLocale(options.officialUrl), { via: "official_url_in_en" });
  }

  for (const q of skuMatchKeys(sku)) {
    try {
      const { docs, hits } = await marsflagSearch(q, options);
      for (const p of pickSearchCandidates(docs, sku)) {
        push(rewriteLocale(p.url), {
          via: "marsflag",
          query: q,
          hits,
          score: p.score,
        });
        if (p.locale.toLowerCase() !== PREFERRED_LOCALE) {
          push(p.url, { via: "marsflag_locale", query: q, hits, score: p.score });
        }
      }
      if (options.delayMs) await sleep(Math.min(options.delayMs, 400));
    } catch {
      /* continue heuristics */
    }
  }

  const cols = collectionHintsFromTitle(options.title);
  for (const slug of slugCandidates(sku)) {
    for (const col of cols) {
      push(globalPdpUrl(PREFERRED_LOCALE, col, slug), { via: "heuristic" });
    }
  }
  return urls;
}

function isSoft404(html, finalUrl) {
  const ogUrl = match1(html, /property=["']og:url["']\s+content=["']([^"']+)/i);
  if (/\/error\/404/i.test(ogUrl) || /\/error\/404/i.test(finalUrl || "")) {
    return true;
  }
  if (/Page Not Found/i.test(html) && !/Caliber Number/i.test(html)) {
    return true;
  }
  const title = match1(html, /<title[^>]*>([\s\S]*?)<\/title>/i).replace(
    /\s+/g,
    " "
  );
  if (
    /^Seiko Watch Corporation$/i.test(title.trim()) &&
    !/Caliber Number/i.test(html)
  ) {
    return true;
  }
  return false;
}

function isProductHtml(html) {
  if (!html || html.length < 5000) return false;
  if (isSoft404(html)) return false;
  if (/Caliber Number/i.test(html)) return true;
  if (
    /Product--Image\/All\/Seiko/i.test(html) &&
    /property=["']og:title["']/i.test(html)
  ) {
    return true;
  }
  return false;
}

function extractTechAttrs(html) {
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
    "Caliber Number",
    "Movement Type",
    "Precision",
    "Power reserve",
    "Jewels",
    "Functions",
    "Case Material",
    "Case Size",
    "Crystal",
    "Crystal Coating",
    "LumiBrite",
    "Clasp",
    "Distance between lugs",
    "Water Resistance",
    "Weight",
    "Features",
    "Band Material",
    "Bracelet / Strap",
    "Strap Material",
  ];
  const labelSet = new Set(labels.map((l) => l.toLowerCase()));
  const attrs = {};
  for (let i = 0; i < tokens.length - 1; i++) {
    const key = tokens[i];
    if (!labelSet.has(key.toLowerCase())) continue;
    const val = tokens[i + 1];
    if (!val || labelSet.has(val.toLowerCase())) continue;
    if (/^(movement|case\/band|other details|specifications)$/i.test(val)) {
      continue;
    }
    attrs[key.toLowerCase()] = val;
  }
  return attrs;
}

function extractDescription(html) {
  const og = match1(
    html,
    /property=["']og:description["']\s+content=["']([^"']+)/i
  );
  const chunk = String(html || "").match(
    /productInformation-detail[\s\S]{0,8000}?Specifications/i
  );
  if (chunk) {
    const paras = [...chunk[0].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => stripTags(m[1]))
      .filter((t) => t.length >= 60 && !/^INR/i.test(t));
    if (paras.length) return paras.slice(0, 3).join(" ");
  }
  return og || "";
}

function extractImages(html, skuKeys) {
  const urls = [];
  const seen = new Set();
  const keys = (skuKeys || [])
    .map((k) => String(k).toUpperCase().replace(/[\s_\-]/g, ""))
    .filter(Boolean);
  const bases = [
    ...new Set(keys.map((k) => stripCountrySuffix(k)).filter((b) => b.length >= 5)),
  ];
  const urlMatchesSku = (u) => {
    const up = String(u || "")
      .toUpperCase()
      .replace(/[\s_\-]/g, "");
    if (keys.some((k) => k && up.includes(k))) return true;
    // Country-suffix variants (SRPE07P1 ↔ SRPE07K1) share the same base
    return bases.some((b) => b && up.includes(b));
  };
  const push = (raw) => {
    if (!raw) return;
    let u = decodeEntities(String(raw).trim());
    if (!u || /^data:/i.test(u)) return;
    u = absUrl(u.split("#")[0], GLOBAL_ORIGIN).replace(/\?.*$/, "");
    if (!/seikowatches\.com/i.test(u)) return;
    if (/\.svg$/i.test(u)) return;
    if (!/\/-\/media\//i.test(u) && !/\.(png|jpe?g|webp)$/i.test(u)) return;
    if (/ThumbnailSeikoLogo|SeikoLogo|Find--Your--Timepiece|favicon/i.test(u)) {
      return;
    }
    // Global PDP HTML embeds related watches — require this SKU (or base) in path
    if (keys.length && !urlMatchesSku(u)) return;
    if (seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };
  push(match1(html, /property=["']og:image["']\s+content=["']([^"']+)/i));
  const attrs = String(html || "").match(
    /(?:data-src|data-lazy|src)=["']([^"']+)["']/gi
  );
  if (attrs) {
    for (const a of attrs) {
      const m = a.match(/=["']([^"']+)["']/);
      if (m) push(m[1]);
    }
  }
  return urls
    .sort((a, b) => {
      const score = (u) => {
        let s = 0;
        const up = u.toUpperCase().replace(/[\s_\-]/g, "");
        for (const k of keys) {
          if (k && up.includes(k)) s += 20;
        }
        for (const b of bases) {
          if (b && up.includes(b)) s += 10;
        }
        if (/Product--Image\/All\/Seiko/i.test(u)) s += 15;
        if (/product_detail/i.test(u)) s += 8;
        if (/_ima_\d/i.test(u)) s += 5;
        return s;
      };
      return score(b) - score(a);
    })
    .slice(0, 12);
}

function extractPriceInr(html) {
  const text = stripTags(html);
  const m = text.match(/INR\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return null;
  const amount = Number(String(m[1]).replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

function extractGender(html, title) {
  const hay = `${title} ${stripTags(html).slice(0, 5000)}`;
  if (/\bWomen'?s\b|\bLadies\b|\bWoman\b/i.test(hay)) return "Women";
  if (/\bMen'?s\b|\bMen\b|\bGent/i.test(hay)) return "Men";
  return "";
}

function extractCollection(html, sourceUrl) {
  const parsed = parsePdpPath(sourceUrl);
  if (parsed?.collection && parsed.collection !== "discovermore") {
    const map = {
      prospex: "Prospex",
      presage: "Presage",
      "5sports": "5 Sports",
      astron: "Astron",
      kingseiko: "King Seiko",
      discovermore: "Seiko",
      "seiko-power-design-project": "Seiko",
    };
    return map[parsed.collection.toLowerCase()] || parsed.collection;
  }
  return parsed?.collection || "";
}

function mapProductGlobal(html, skuInput, sourceUrl, resolveMeta = {}) {
  const sku = normalizeSku(skuInput);
  const attrs = extractTechAttrs(html);
  const mapped = {};
  for (const [label, field] of Object.entries(GLOBAL_ATTR_MAP)) {
    if (attrs[label]) mapped[field] = attrs[label];
  }
  const h1 = stripTags(match1(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
  const ogTitle = match1(
    html,
    /property=["']og:title["']\s+content=["']([^"']+)/i
  )
    .replace(/\s*\|\s*Seiko.*$/i, "")
    .trim();
  const officialSku = (h1 || ogTitle || sku.compact)
    .toUpperCase()
    .replace(/[\s_\-]/g, "");
  const collection = extractCollection(html, sourceUrl);
  const title =
    [BRAND, collection, officialSku].filter(Boolean).join(" ") ||
    `Seiko ${sku.compact}`;
  const description = extractDescription(html);
  const images = extractImages(html, [
    sku.compact,
    sku.base,
    officialSku,
    stripCountrySuffix(officialSku),
  ]);
  const priceAmount = extractPriceInr(html);
  const gender = extractGender(html, title);
  const caseSize = extractCaseSizeMm(mapped.caseSizeRaw || attrs["case size"]);
  const movement = mapMovement(mapped.movement || "");
  const caseMaterial = mapCaseMaterial(mapped.caseMaterial || "");
  const strapMaterial = mapStrapMaterial(
    mapped.strapMaterial || attrs["bracelet / strap"] || ""
  );
  const waterResistance = mapWaterResistance(mapped.waterResistance || "");

  const { product: normalized, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact,
      officialSku,
      imsSku: sku.compact,
      title,
      description,
      caseMaterial,
      caseShape: "",
      caseSize,
      dialColor: "",
      waterResistance,
      movement,
      strapMaterial,
      strapColor: normalizeStrapColor(""),
      gender: gender || "",
      warrantyPeriod: "",
      category: "",
      price: null,
      oldPrice: null,
      priceSource:
        priceAmount != null
          ? {
              amount: priceAmount,
              mrp: null,
              currency: "INR",
              label: `₹${priceAmount.toLocaleString("en-IN")}`,
            }
          : null,
      images,
      sourceUrl,
      source: SOURCE_GLOBAL,
      scrapedAt: new Date().toISOString(),
      rawAttributes: attrs,
      extras: {
        collection,
        caliber: mapped.caliber || attrs["caliber number"] || "",
        crystal: mapped.crystal || attrs.crystal || "",
        weight: mapped.weight || attrs.weight || "",
        resolveVia: resolveMeta.via || null,
        resolvedSlug: parsePdpPath(sourceUrl)?.slug || null,
        httpStatus: resolveMeta.httpStatus || 200,
        site: "seikowatches.com",
      },
    });

  normalized.fieldMapped = fieldMapped;
  normalized.fieldUnmapped = fieldUnmapped;
  normalized.warnings = normalized.warnings || [];
  normalized.httpStatus = resolveMeta.httpStatus || 200;
  normalized.attemptedUrls = resolveMeta.attemptedUrls || [];

  if (officialSku && officialSku !== sku.compact && officialSku === sku.base) {
    normalized.nearMatch = true;
    normalized.typoFrom = sku.compact;
    normalized.matchedStyle = officialSku;
    normalized.nearMatchMethod = "suffix_strip";
  }
  if (!normalized.description || normalized.description.length < 40) {
    normalized.warnings.push("description_short_or_missing");
  }
  if (!normalized.images.length) {
    normalized.warnings.push("no_sku_images");
  }
  if (!Object.keys(attrs).length) {
    normalized.warnings.push("tech_attrs_missing");
  }
  Object.assign(normalized, buildSeo(normalized, { metaDescription: description }));
  return normalized;
}

async function fetchAndValidateGlobal(url, options = {}) {
  const res = await fetchText(url, { timeoutMs: options.timeoutMs || 30000 });
  const finalUrl = res.url || url;
  if (res.status === 403) {
    return {
      ok: false,
      status: "forbidden",
      httpStatus: 403,
      sourceUrl: finalUrl,
      reason: `HTTP 403 for ${finalUrl}`,
    };
  }
  if (res.status === 404) {
    return {
      ok: false,
      status: "not_found",
      httpStatus: 404,
      sourceUrl: finalUrl,
      reason: `HTTP 404 for ${finalUrl}`,
    };
  }
  if (!res.text || res.text.length < 1000) {
    return {
      ok: false,
      status: "fetch_failed",
      httpStatus: res.status || 0,
      sourceUrl: finalUrl,
      reason: `empty/short body HTTP ${res.status} for ${finalUrl}`,
    };
  }
  if (isSoft404(res.text, finalUrl) || !isProductHtml(res.text)) {
    return {
      ok: false,
      status: "not_found",
      httpStatus: res.status || 200,
      sourceUrl: finalUrl,
      reason: `soft_404 (HTTP ${res.status}, og:url error/404 or no PDP specs) at ${finalUrl}`,
      soft404: true,
    };
  }
  return {
    ok: true,
    html: res.text,
    sourceUrl: finalUrl,
    httpStatus: res.status || 200,
  };
}

async function fetchGlobalProduct(sku, options = {}) {
  // Prefer India official_url skip — only when forced or India already failed
  if (options.officialUrl && isGlobalUrl(options.officialUrl)) {
    const got = await fetchAndValidateGlobal(options.officialUrl, options);
    if (got.ok) {
      return { ...got, via: "official_url", attemptedUrls: [options.officialUrl] };
    }
  }

  const fp = fixtureHtmlPathForSku(options.fixtureDir, sku);
  if (options.preferFixture && fp && !fixtureJsonPathForSku(options.fixtureDir, sku)) {
    const html = fs.readFileSync(fp, "utf8");
    return {
      ok: true,
      html,
      sourceUrl:
        options.officialUrl ||
        match1(html, /property=["']og:url["']\s+content=["']([^"']+)/i) ||
        `file://${path.resolve(fp)}`,
      httpStatus: 200,
      fromFixture: true,
      via: "fixture",
      attemptedUrls: [],
    };
  }

  const candidates = await resolveGlobalCandidateUrls(sku, options);
  const attempted = [];
  let lastFail = null;
  for (const cand of candidates) {
    attempted.push(cand.url);
    try {
      const got = await fetchAndValidateGlobal(cand.url, options);
      if (got.ok) {
        return {
          ...got,
          via: cand.via,
          attemptedUrls: attempted,
          fromFixture: false,
        };
      }
      lastFail = { ...got, via: cand.via };
    } catch (err) {
      lastFail = {
        ok: false,
        status: "fetch_failed",
        httpStatus: 0,
        sourceUrl: cand.url,
        reason: err.message,
        via: cand.via,
      };
    }
    if (options.delayMs) await sleep(Math.min(options.delayMs, 350));
  }

  if (fp) {
    const html = fs.readFileSync(fp, "utf8");
    return {
      ok: true,
      html,
      sourceUrl:
        options.officialUrl ||
        match1(html, /property=["']og:url["']\s+content=["']([^"']+)/i) ||
        `file://${path.resolve(fp)}`,
      httpStatus: 200,
      fromFixture: true,
      via: "fixture_after_live_miss",
      attemptedUrls: attempted,
    };
  }

  return {
    ok: false,
    status: lastFail?.status || "not_found",
    httpStatus: lastFail?.httpStatus || 0,
    sourceUrl: lastFail?.sourceUrl || null,
    reason:
      lastFail?.reason ||
      `not_found: no Seiko PDP for ${normalizeSku(sku).compact}`,
    soft404: Boolean(lastFail?.soft404),
    attemptedUrls: attempted,
  };
}

function resolveProductUrl(sku, options = {}) {
  if (options.officialUrl) return options.officialUrl;
  const n = normalizeSku(sku);
  return pdpUrlFromHandle(String(n.compact).toLowerCase());
}

async function resolveCandidateUrls(sku, options = {}) {
  const india = await resolveIndiaUrl(sku, options);
  const urls = [];
  if (india?.url) urls.push({ url: india.url, via: india.via });
  const global = await resolveGlobalCandidateUrls(sku, options);
  return { urls: [...urls, ...global], searchError: null };
}

async function enrichSku(sku, options = {}) {
  const normalized = normalizeSku(sku);
  const attempted = [];

  try {
    // 1) India Shopify preferred
    const india = await fetchIndiaProduct(sku, options);
    if (india?.product) {
      const mapped = mapFromShopify(
        india.product,
        sku,
        india.sourceUrl,
        {
          via: india.via,
          httpStatus: india.httpStatus || 200,
          attemptedUrls: india.attemptedUrls || [],
        }
      );
      mapped.fetchMode = india.fromFixture ? "fixture" : "live";
      mapped.source = SOURCE_INDIA;
      if (options.delayMs) await sleep(options.delayMs);
      return mapped;
    }
    if (india?.attemptedUrls) attempted.push(...india.attemptedUrls);

    // 2) Global Sitecore fallback
    const global = await fetchGlobalProduct(sku, {
      ...options,
      // Don't force India official_url onto global path
      officialUrl:
        options.officialUrl && isGlobalUrl(options.officialUrl)
          ? options.officialUrl
          : undefined,
    });
    if (global.ok && global.html) {
      const mapped = mapProductGlobal(global.html, sku, global.sourceUrl, {
        via: global.via,
        httpStatus: global.httpStatus || 200,
        attemptedUrls: [...attempted, ...(global.attemptedUrls || [])],
      });
      mapped.fetchMode = global.fromFixture ? "fixture" : "live";
      mapped.source = SOURCE_GLOBAL;
      if (options.delayMs) await sleep(options.delayMs);
      return mapped;
    }

    return {
      status: global.status || "not_found",
      sku: normalized.compact,
      brand: BRAND,
      source: SOURCE_OFFICIAL,
      reason:
        global.reason ||
        `not_found: no Seiko PDP on seikowatches.co.in or seikowatches.com for ${normalized.compact}`,
      sourceUrl: global.sourceUrl || null,
      httpStatus: global.httpStatus || 0,
      attemptedUrls: [...attempted, ...(global.attemptedUrls || [])],
      soft404: Boolean(global.soft404),
      scrapedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: err.code || "error",
      sku: normalized.compact,
      brand: BRAND,
      source: SOURCE_OFFICIAL,
      reason: err.message,
      sourceUrl: err.sourceUrl || null,
      httpStatus: err.httpStatus || 0,
      attemptedUrls: err.attemptedUrls || attempted,
      soft404: Boolean(err.soft404),
      scrapedAt: new Date().toISOString(),
    };
  }
}

// Back-compat aliases used by older callers / tests
const ATTR_MAP = GLOBAL_ATTR_MAP;
const mapProduct = mapProductGlobal;
const fetchProductHtml = async (sku, options = {}) => {
  const india = await fetchIndiaProduct(sku, options);
  if (india?.product) {
    return {
      html: india.product.body_html || "",
      sourceUrl: india.sourceUrl,
      fromFixture: india.fromFixture,
      httpStatus: india.httpStatus || 200,
      resolveVia: india.via,
      attemptedUrls: india.attemptedUrls || [],
      product: india.product,
    };
  }
  const global = await fetchGlobalProduct(sku, options);
  if (!global.ok) {
    throw Object.assign(new Error(global.reason || "not_found"), {
      code: global.status || "not_found",
      sourceUrl: global.sourceUrl,
      httpStatus: global.httpStatus,
      attemptedUrls: global.attemptedUrls,
      soft404: global.soft404,
    });
  }
  return {
    html: global.html,
    sourceUrl: global.sourceUrl,
    fromFixture: global.fromFixture,
    httpStatus: global.httpStatus,
    resolveVia: global.via,
    attemptedUrls: global.attemptedUrls || [],
  };
};

module.exports = {
  BRAND,
  SITE_ORIGIN,
  INDIA_ORIGIN,
  GLOBAL_ORIGIN,
  PREFERRED_LOCALE,
  SOURCE_OFFICIAL,
  SOURCE_INDIA,
  SOURCE_GLOBAL,
  COLLECTIONS,
  ATTR_MAP,
  SHOPIFY_ATTR_MAP,
  normalizeSku,
  skuMatchKeys,
  stripCountrySuffix,
  resolveProductUrl,
  resolveCandidateUrls,
  resolveIndiaUrl,
  marsflagSearch,
  isSoft404,
  isProductHtml,
  extractTechAttrs,
  extractImages,
  extractShopifyAttrs,
  mapProduct,
  mapFromShopify,
  fetchProductHtml,
  fetchIndiaProduct,
  enrichSku,
  pdpUrl: globalPdpUrl,
  pdpUrlFromHandle,
  rewriteLocale,
};
