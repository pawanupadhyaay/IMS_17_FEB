"use strict";

/**
 * TGT Luxe (tgtluxe.com) Shopify helpers — India retailer fallback when an
 * official brand PDP is missing. Prefer official / Collective / Tata Cliq first.
 *
 * Discovery: /search/suggest.json → /products/{handle}.json → products.json catalog.
 * Specs are often thin (empty body_html); infer dial/movement/gender from handle/title.
 */

const { fetchText, sleep } = require("./http");
const {
  normalizeProductFields,
  normalizeCaseSize,
  normalizeDialColor,
  normalizeCaseMaterial,
  normalizeStrapMaterial,
  normalizeMovement,
  normalizeCaseShape,
  normalizeGender,
  normalizeStrapColor,
  normalizeWaterResistance,
} = require("./normalize");

const TGT_ORIGIN = "https://tgtluxe.com";
const SOURCE_ID = "tgtluxe";

/** @type {Map<string, {handle: string, title: string, sku: string}>|null} */
let catalogCache = null;
let catalogCachePromise = null;

function compactSku(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
}

function absUrl(url, base = TGT_ORIGIN) {
  if (!url) return "";
  const raw = String(url).trim();
  if (!raw) return "";
  if (raw.startsWith("//")) return `https:${raw}`;
  try {
    return new URL(raw, base).href.split("#")[0].split("?")[0];
  } catch {
    return raw;
  }
}

function stripTags(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function pdpUrlFromHandle(handle) {
  const h = String(handle || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!h) return null;
  return `${TGT_ORIGIN}/products/${h}`;
}

function productJsonUrl(handle) {
  const h = String(handle || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!h) return null;
  return `${TGT_ORIGIN}/products/${h}.json`;
}

function normalizeTgtLuxeUrl(urlOrHandle) {
  const raw = String(urlOrHandle || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    const u = absUrl(raw);
    const m = u.match(/\/products\/([^/?#]+)/i);
    if (m) return pdpUrlFromHandle(m[1]);
    return u;
  }
  if (raw.startsWith("/products/")) return absUrl(raw);
  if (/^[a-z0-9][a-z0-9-]*$/i.test(raw)) return pdpUrlFromHandle(raw);
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
  // Also catch "Label : Value" paragraphs / table rows
  const rowRe =
    /(?:^|>)([^<:]{2,40})\s*[:=]\s*([^<:\n]{1,80})(?:<|$)/gi;
  while ((m = rowRe.exec(html))) {
    const label = stripTags(m[1]).toLowerCase().trim();
    const value = stripTags(m[2]).trim();
    if (label && value && label.length < 40 && !attrs[label]) {
      attrs[label] = value;
    }
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
    if (seen.has(src)) continue;
    seen.add(src);
    urls.push(src);
  }
  if (!urls.length && product?.image?.src) {
    urls.push(String(product.image.src).split("?")[0]);
  }
  return urls;
}

/**
 * TGT Luxe handles often look like:
 *   longines-black-dial-quartz-men-watch-l37403587
 *   longines-sunray-blue-dial-quartz-unisex-watch-l48664926
 */
function inferFromHandleAndTitle(handle, title) {
  const h = String(handle || "").toLowerCase();
  const t = String(title || "").toLowerCase();
  const hay = `${h} ${t}`;

  let dialColor = "";
  // Prefer segment immediately before "-dial-" (skip leading brand slug)
  const dialHandle = h.match(
    /(?:^|-)((?:sunray-)?(?:black|blue|white|silver|green|gilt|gold|ivory|grey|gray|brown|champagne|cream|mother-of-pearl|[a-z]+))-dial(?:-|$)/i
  );
  if (dialHandle) {
    dialColor = dialHandle[1].replace(/-/g, " ").replace(/\s+/g, " ").trim();
  }
  // Fallback: brand-{color}-dial-…
  if (!dialColor) {
    const afterBrand = h.match(
      /^(?:longines|tissot|rado|omega)-(.+?)-dial-/i
    );
    if (afterBrand) {
      dialColor = afterBrand[1].replace(/-/g, " ").trim();
    }
  }
  if (!dialColor) {
    const dialTitle = t.match(
      /\b((?:sunray\s+)?(?:black|blue|white|silver|green|gilt|gold|ivory|grey|gray|brown|champagne|mother[-\s]?of[-\s]?pearl))\b/i
    );
    if (dialTitle) dialColor = dialTitle[1];
  }
  // Drop accidental brand words
  dialColor = dialColor
    .replace(/^(longines|tissot|rado|omega)\s+/i, "")
    .trim();

  let movement = "";
  if (/\bquartz\b/i.test(hay)) movement = "Quartz";
  else if (/\bautomatic\b/i.test(hay)) movement = "Automatic";
  else if (/\bmechanical\b/i.test(hay)) movement = "Mechanical";
  else if (/\bsolar\b/i.test(hay)) movement = "Solar";

  let gender = "";
  if (/\bunisex\b/i.test(hay)) {
    gender = "Unisex";
  } else if (/\bwomen(?:'s|s)?\b|\bladies\b|\bfemale\b/i.test(hay)) {
    gender = "Female";
  } else if (/\bmen(?:'s|s)?\b|\bmale\b/i.test(hay)) {
    gender = "Male";
  }

  return { dialColor, movement, gender };
}

function skuInHaystack(sku, ...parts) {
  const compact = compactSku(sku);
  if (!compact) return false;
  const hay = compactSku(parts.filter(Boolean).join(" "));
  return hay.includes(compact);
}

/** Coerce thin TGT dial strings onto IMS dial-color options. */
function coerceDialColor(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!s) return "";
  let n = normalizeDialColor(s);
  if (n) return n;
  if (/gilt/i.test(s)) {
    return normalizeDialColor("Sunray Gilt") || "Sunray Gilt";
  }
  const withoutSunray = s.replace(/^sunray\s+/i, "").trim();
  n = normalizeDialColor(withoutSunray);
  if (n) return n;
  const head = withoutSunray.split(/[/,(\-]/)[0].trim();
  return normalizeDialColor(head) || "";
}

async function suggestBySku(sku, options = {}) {
  const compact = compactSku(sku);
  if (!compact) return null;
  const queries = [compact];
  if (options.dottedSku) queries.push(String(options.dottedSku));
  if (options.brandHint) queries.push(`${options.brandHint} ${compact}`);

  for (const q of [...new Set(queries.filter(Boolean))]) {
    const suggestUrl =
      `${TGT_ORIGIN}/search/suggest.json?q=${encodeURIComponent(q)}` +
      "&resources%5Btype%5D=product&resources%5Blimit%5D=10";
    try {
      const res = await fetchText(suggestUrl, {
        timeoutMs: options.timeoutMs || 20000,
        headers: { Accept: "application/json" },
      });
      if (!res.ok || !res.text) continue;
      const data = JSON.parse(res.text);
      const products =
        data?.resources?.results?.products ||
        data?.resources?.products ||
        [];
      for (const p of products) {
        if (skuInHaystack(compact, p.title, p.handle, p.url)) {
          return {
            url: pdpUrlFromHandle(p.handle),
            handle: p.handle,
            via: "tgtluxe_suggest",
            query: q,
          };
        }
      }
    } catch {
      /* next */
    }
    if (options.delayMs) await sleep(Math.min(options.delayMs, 250));
  }
  return null;
}

async function loadCatalogIndex(options = {}) {
  if (catalogCache) return catalogCache;
  if (catalogCachePromise) return catalogCachePromise;

  catalogCachePromise = (async () => {
    const bySku = new Map();
    for (let page = 1; page <= 80; page++) {
      const url = `${TGT_ORIGIN}/products.json?limit=250&page=${page}`;
      try {
        const res = await fetchText(url, {
          timeoutMs: options.timeoutMs || 30000,
          headers: { Accept: "application/json" },
        });
        if (!res.ok || !res.text) break;
        const data = JSON.parse(res.text);
        const products = data.products || [];
        if (!products.length) break;
        for (const p of products) {
          const handle = String(p.handle || "");
          const title = String(p.title || "");
          const variantSku = compactSku(p.variants?.[0]?.sku || "");
          const keys = new Set();
          if (variantSku) keys.add(variantSku);
          const handleSku = handle.match(/-(l\d{8,})$/i);
          if (handleSku) keys.add(compactSku(handleSku[1]));
          const titleSku = title.match(/\b(L\d(?:\.\d+){3,}|\bL\d{8,})\b/i);
          if (titleSku) keys.add(compactSku(titleSku[1]));
          for (const k of keys) {
            if (!bySku.has(k)) {
              bySku.set(k, { handle, title, sku: variantSku || k });
            }
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
  })();

  try {
    return await catalogCachePromise;
  } finally {
    catalogCachePromise = null;
  }
}

async function resolveTgtLuxeUrlBySku(sku, options = {}) {
  const compact = compactSku(sku);
  if (!compact) return null;

  if (options.tgtLuxeUrl) {
    const url = normalizeTgtLuxeUrl(options.tgtLuxeUrl);
    if (url) return { url, handle: url.split("/products/")[1], via: "tgtluxe_url" };
  }

  const suggest = await suggestBySku(sku, options);
  if (suggest) return suggest;

  // Handle guess: many TGT Longines PDPs end with -{sku lower}
  const guessHandles = [
    String(compact).toLowerCase(),
    `longines-${String(compact).toLowerCase()}`,
  ];
  for (const handle of guessHandles) {
    const probe = productJsonUrl(handle);
    try {
      const res = await fetchText(probe, {
        timeoutMs: options.timeoutMs || 15000,
        headers: { Accept: "application/json" },
      });
      if (res.ok && res.text && /"product"\s*:/.test(res.text)) {
        return { url: pdpUrlFromHandle(handle), handle, via: "handle_guess" };
      }
    } catch {
      /* next */
    }
  }

  try {
    const catalog = await loadCatalogIndex(options);
    const hit = catalog.get(compact);
    if (hit?.handle) {
      return {
        url: pdpUrlFromHandle(hit.handle),
        handle: hit.handle,
        via: "tgtluxe_catalog",
      };
    }
  } catch {
    /* ignore */
  }

  return null;
}

async function fetchTgtLuxeProductJson(urlOrHandle, options = {}) {
  const pdp = normalizeTgtLuxeUrl(urlOrHandle);
  if (!pdp) {
    throw Object.assign(new Error("tgtluxe: missing URL"), { code: "not_found" });
  }
  const m = pdp.match(/\/products\/([^/?#]+)/i);
  if (!m) {
    throw Object.assign(new Error(`tgtluxe: not a product URL: ${pdp}`), {
      code: "not_found",
    });
  }
  const handle = m[1];
  const jsonUrl = productJsonUrl(handle);
  const res = await fetchText(jsonUrl, {
    timeoutMs: options.timeoutMs || 30000,
    headers: { Accept: "application/json" },
  });
  if (!res.ok || !res.text) {
    throw Object.assign(
      new Error(`tgtluxe fetch_failed: HTTP ${res.status || "?"} for ${jsonUrl}`),
      { code: "fetch_failed", sourceUrl: pdp }
    );
  }
  let data;
  try {
    data = JSON.parse(res.text);
  } catch {
    throw Object.assign(
      new Error(`tgtluxe not_found: invalid JSON at ${jsonUrl}`),
      { code: "not_found", sourceUrl: pdp }
    );
  }
  const product = data && data.product;
  if (!product || !product.handle) {
    throw Object.assign(
      new Error(`tgtluxe not_found: no product payload at ${jsonUrl}`),
      { code: "not_found", sourceUrl: pdp }
    );
  }
  return {
    product,
    sourceUrl: pdpUrlFromHandle(product.handle) || pdp,
    handle: product.handle,
  };
}

function mapTgtLuxeProduct(shopifyProduct, skuInput, sourceUrl, options = {}) {
  const compact = compactSku(skuInput);
  const brandHint = options.brandHint || "Longines";
  const attrs = extractShopifyAttrs(shopifyProduct.body_html || "");
  const inferred = inferFromHandleAndTitle(
    shopifyProduct.handle,
    shopifyProduct.title
  );
  const variant = (shopifyProduct.variants || [])[0] || {};
  const variantSku = compactSku(variant.sku || "");
  const officialSku = variantSku || compact;

  const title =
    String(shopifyProduct.title || "").trim() ||
    `${brandHint} ${officialSku}`;

  let description = stripTags(shopifyProduct.body_html || "");
  if (description.length < 40) {
    const bits = [
      title,
      inferred.movement && `${inferred.movement} movement`,
      inferred.dialColor && `${inferred.dialColor} dial`,
      inferred.gender && inferred.gender,
    ].filter(Boolean);
    description = bits.join(". ");
  }

  const images = extractImagesFromProductJson(shopifyProduct);
  const priceAmount =
    variant.price != null && variant.price !== ""
      ? Number(variant.price)
      : null;

  const dialColor =
    coerceDialColor(
      attrs["dial color"] || attrs.dial || attrs.color || inferred.dialColor || ""
    ) || "";
  const movement =
    normalizeMovement(
      attrs.movement || attrs["movement type"] || inferred.movement || ""
    ) ||
    attrs.movement ||
    inferred.movement ||
    "";
  const gender =
    normalizeGender(
      attrs.gender || inferred.gender || ""
    ) ||
    attrs.gender ||
    inferred.gender ||
    "";
  const caseMaterial =
    normalizeCaseMaterial(
      attrs["case material"] || attrs.case || ""
    ) ||
    attrs["case material"] ||
    "";
  const strapMaterial =
    normalizeStrapMaterial(
      attrs["strap material"] || attrs["band material"] || attrs.strap || ""
    ) ||
    attrs["strap material"] ||
    attrs["band material"] ||
    "";
  const caseSize = normalizeCaseSize(
    attrs["case size"] || attrs["dial size"] || attrs.diameter || ""
  );
  const caseShape =
    normalizeCaseShape(attrs["case shape"] || attrs["dial shape"] || "") ||
    attrs["case shape"] ||
    "";
  const waterResistance = normalizeWaterResistance(
    attrs["water resistance"] || attrs.water || ""
  );
  const strapColor =
    normalizeStrapColor(attrs["strap color"] || attrs["band color"] || "") ||
    "";

  const { product, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: brandHint,
      sku: compact || officialSku,
      officialSku,
      title,
      description,
      caseMaterial,
      caseShape,
      caseSize,
      dialColor,
      waterResistance,
      movement,
      strapMaterial,
      strapColor,
      gender,
      warrantyPeriod: attrs.warranty || attrs["warranty period"] || "",
      category: "Luxury",
      price: null,
      oldPrice: null,
      priceSource:
        priceAmount != null && Number.isFinite(priceAmount)
          ? {
              amount: priceAmount,
              mrp:
                variant.compare_at_price != null && variant.compare_at_price !== ""
                  ? Number(variant.compare_at_price)
                  : null,
              currency: "INR",
              label: `₹${Number(priceAmount).toLocaleString("en-IN")}`,
            }
          : null,
      images,
      sourceUrl:
        sourceUrl || pdpUrlFromHandle(shopifyProduct.handle) || null,
      source: SOURCE_ID,
      scrapedAt: new Date().toISOString(),
      rawAttributes: {
        ...attrs,
        inferredDialColor: inferred.dialColor || "",
        inferredMovement: inferred.movement || "",
        inferredGender: inferred.gender || "",
        variantSku,
        handle: shopifyProduct.handle || "",
        vendor: shopifyProduct.vendor || "",
        tags: shopifyProduct.tags || "",
        templateSuffix: shopifyProduct.template_suffix || "",
      },
      extras: {
        handle: shopifyProduct.handle || "",
        vendor: shopifyProduct.vendor || "",
        templateSuffix: shopifyProduct.template_suffix || "",
        shopifyProductId: shopifyProduct.id || "",
        resolveVia: options.resolveVia || "",
      },
    });

  product.fieldMapped = fieldMapped;
  product.fieldUnmapped = fieldUnmapped;
  product.warnings = product.warnings || [];

  if (!product.description || product.description.length < 40) {
    product.warnings.push("description_short_or_missing");
  }
  if (!Object.keys(attrs).length) {
    product.warnings.push("shopify_feature_attrs_missing");
  }
  if (!product.images.length) {
    product.warnings.push("no_sku_images");
  }
  if (fieldUnmapped && Object.keys(fieldUnmapped).length) {
    product.warnings.push("unmapped_constrained_fields");
  }

  return product;
}

async function enrichFromTgtLuxe(sku, options = {}) {
  const brandHint = options.brandHint || "Longines";
  const compact = compactSku(sku);

  let resolved = null;
  if (options.tgtLuxeUrl) {
    resolved = {
      url: normalizeTgtLuxeUrl(options.tgtLuxeUrl),
      via: "tgtluxe_url",
    };
  } else if (options.resolveBySku !== false) {
    resolved = await resolveTgtLuxeUrlBySku(sku, options);
  }

  if (!resolved?.url) {
    return {
      status: "not_found",
      sku: compact,
      brand: brandHint,
      source: SOURCE_ID,
      reason: "tgtluxe: no PDP URL (pass tgtLuxeUrl or enable SKU search)",
      scrapedAt: new Date().toISOString(),
    };
  }

  const { product: shopifyProduct, sourceUrl } = await fetchTgtLuxeProductJson(
    resolved.url,
    options
  );
  const product = mapTgtLuxeProduct(shopifyProduct, sku, sourceUrl, {
    ...options,
    brandHint,
    resolveVia: resolved.via || "",
  });
  product.fetchMode = "live";

  const hay = [
    product.officialSku,
    product.title,
    shopifyProduct.handle,
    shopifyProduct.variants?.[0]?.sku,
    JSON.stringify(shopifyProduct.images || []).slice(0, 500),
  ]
    .join(" ")
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  if (compact && !hay.includes(compact)) {
    return {
      status: "not_found",
      sku: compact,
      brand: brandHint,
      source: SOURCE_ID,
      reason: "SKU not present on TGT Luxe product",
      sourceUrl,
      scrapedAt: new Date().toISOString(),
    };
  }

  if (options.delayMs) await sleep(options.delayMs);
  return product;
}

module.exports = {
  TGT_ORIGIN,
  SOURCE_ID,
  compactSku,
  normalizeTgtLuxeUrl,
  pdpUrlFromHandle,
  productJsonUrl,
  suggestBySku,
  loadCatalogIndex,
  resolveTgtLuxeUrlBySku,
  fetchTgtLuxeProductJson,
  mapTgtLuxeProduct,
  enrichFromTgtLuxe,
  inferFromHandleAndTitle,
};
