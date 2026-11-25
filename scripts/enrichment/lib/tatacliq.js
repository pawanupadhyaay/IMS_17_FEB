"use strict";

/**
 * Tata Cliq Luxury PDP helpers — India-only fallback when an official brand
 * PDP is missing (404 / not listed). Prefer brand-site assets whenever they exist.
 */

const { fetchText, sleep } = require("./http");
const {
  normalizeProductFields,
  normalizeCaseSize,
} = require("./normalize");

const TATA_ORIGIN = "https://luxury.tatacliq.com";
const SOURCE_ID = "tatacliq";

function absUrl(url, base = TATA_ORIGIN) {
  if (!url) return "";
  const raw = String(url).trim();
  if (!raw) return "";
  if (raw.startsWith("//")) return `https:${raw}`;
  try {
    return new URL(raw, base).href;
  } catch {
    return raw;
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

function match1(html, re) {
  const m = String(html || "").match(re);
  return m ? decodeEntities(m[1].trim()) : "";
}

function extractBalancedObject(html, startIdx) {
  if (startIdx < 0 || startIdx >= html.length || html[startIdx] !== "{") {
    return null;
  }
  let i = startIdx;
  let depth = 0;
  let inStr = false;
  let esc = false;
  while (i < html.length) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') {
      inStr = true;
    } else if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return html.slice(startIdx, i + 1);
    }
    i += 1;
  }
  return null;
}

function extractProductDescriptionData(html) {
  const marker = '"productDescriptionData"';
  const idx = String(html || "").indexOf(marker);
  if (idx < 0) return null;
  const brace = html.indexOf("{", idx + marker.length);
  const raw = extractBalancedObject(html, brace);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractJsonLdProducts(html) {
  const out = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1].trim());
      const list = Array.isArray(data) ? data : [data];
      for (const item of list) {
        if (item && item["@type"] === "Product") out.push(item);
      }
    } catch {
      // ignore malformed blocks
    }
  }
  return out;
}

function detailsToMap(details) {
  const map = {};
  if (!Array.isArray(details)) return map;
  for (const row of details) {
    if (!row || !row.key) continue;
    const key = String(row.key).trim();
    const value = String(row.value == null ? "" : row.value).trim();
    if (key && value) map[key] = value;
  }
  return map;
}

function classificationsToMap(groups) {
  const map = {};
  if (!Array.isArray(groups)) return map;
  for (const g of groups) {
    Object.assign(map, detailsToMap(g && g.specifications));
  }
  return map;
}

function pickImageUrl(galleryImages) {
  if (!Array.isArray(galleryImages)) return "";
  const prefer = [
    "luxurySuperZoom",
    "luxuryZoom",
    "luxuryProduct",
    "luxurySearchPage",
  ];
  for (const key of prefer) {
    const hit = galleryImages.find((g) => g && g.key === key && g.value);
    if (hit) return absUrl(hit.value);
  }
  const first = galleryImages.find((g) => g && g.value);
  return first ? absUrl(first.value) : "";
}

function extractGalleryImages(data, html) {
  const urls = [];
  const seen = new Set();
  const push = (u) => {
    const url = absUrl(u).split("?")[0];
    if (!url || !/img\.tatacliq\.com/i.test(url)) return;
    // Prefer largest size when duplicates differ only by WxH folder
    const fileKey = url.replace(/\/\d+Wx\d+H\//i, "/");
    if (seen.has(fileKey)) return;
    seen.add(fileKey);
    urls.push(url);
  };

  const list = data && data.galleryImagesList;
  if (Array.isArray(list)) {
    for (const entry of list) {
      if (!entry || entry.mediaType === "Video") continue;
      push(pickImageUrl(entry.galleryImages));
    }
  }

  if (!urls.length) {
    const ld = extractJsonLdProducts(html)[0];
    const imgs = ld && ld.image;
    const arr = Array.isArray(imgs) ? imgs : imgs ? [imgs] : [];
    for (const u of arr) push(u);
  }

  // Upgrade any remaining small sizes to SuperZoom path when possible
  return urls.map((u) =>
    u.replace(/\/\d+Wx\d+H\//i, "/1316Wx1468H/").replace(
      /_\d+Wx\d+H_/i,
      "_1316Wx1468H_"
    )
  );
}

function priceFromObject(obj) {
  if (!obj || typeof obj !== "object") return null;
  const amount =
    obj.doubleValue != null
      ? Number(obj.doubleValue)
      : obj.value != null
        ? Number(obj.value)
        : null;
  const currency = obj.currencyIso || "INR";
  const label =
    obj.commaFormattedValueNoDecimal ||
    obj.formattedValueNoDecimal ||
    obj.commaFormattedValue ||
    (amount != null ? `${currency} ${amount}` : "");
  if (amount == null && !label) return null;
  return { amount, currency, label };
}

function looksLikeTataCliqPdp(html) {
  return (
    /productDescriptionData/i.test(html) ||
    (/application\/ld\+json/i.test(html) &&
      /"@type"\s*:\s*"Product"/i.test(html) &&
      /tatacliq/i.test(html))
  );
}

function normalizeTataCliqUrl(urlOrId) {
  const raw = String(urlOrId || "").trim();
  if (!raw) return null;
  if (/^mp\d+$/i.test(raw)) {
    return `${TATA_ORIGIN}/p-${raw.toLowerCase()}`;
  }
  if (/^https?:\/\//i.test(raw)) return raw.split("#")[0];
  if (raw.startsWith("/")) return absUrl(raw);
  if (/\/p-mp\d+/i.test(raw)) return absUrl(`/${raw.replace(/^\//, "")}`);
  return null;
}

function extractTataCliqPdpCandidates(html) {
  const candidates = [];
  const decoded = String(html || "")
    .replace(/&amp;/g, "&")
    .replace(/%2F/gi, "/")
    .replace(/%2D/gi, "-")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/");

  const re =
    /https?:\/\/(?:www\.)?luxury\.tatacliq\.com\/[a-z0-9%-]+\/p-mp\d+/gi;
  let m;
  while ((m = re.exec(decoded))) {
    const url = m[0].split("&")[0].replace(/[.,;)]+$/, "");
    if (!candidates.includes(url)) candidates.push(url);
  }
  const pathRe = /luxury\.tatacliq\.com(\/[a-z0-9-]+\/p-mp\d+)/gi;
  while ((m = pathRe.exec(decoded))) {
    const url = absUrl(m[1]);
    if (!candidates.includes(url)) candidates.push(url);
  }
  return candidates;
}

/**
 * Best-effort SKU → Tata Cliq Luxury PDP via public web search.
 * Tata Cliq on-site search often returns 0 hits for compact brand refs;
 * DuckDuckGo HTML frequently challenges Node (HTTP 202 / captcha).
 */
async function resolveTataCliqUrlBySku(sku, options = {}) {
  const compact = String(sku || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-\s]/g, "");
  if (!compact) return null;

  const brandHint = options.brandHint || "Balmain";
  const dotted = options.dottedSku || "";
  const queries = [
    `site:luxury.tatacliq.com ${compact} ${brandHint}`,
    dotted
      ? `site:luxury.tatacliq.com "${dotted}" ${brandHint}`
      : null,
  ].filter(Boolean);

  const searchUrls = [];
  for (const q of queries) {
    searchUrls.push(`https://www.bing.com/search?q=${encodeURIComponent(q)}`);
    searchUrls.push(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`
    );
  }

  const candidates = [];
  for (const searchUrl of searchUrls) {
    try {
      const res = await fetchText(searchUrl, {
        timeoutMs: options.timeoutMs || 25000,
        retries: 1,
        headers: {
          Accept: "text/html",
          Referer: searchUrl.includes("bing.com")
            ? "https://www.bing.com/"
            : "https://html.duckduckgo.com/",
        },
      });
      // DuckDuckGo often returns 202 + captcha to Node — skip those bodies
      if (!res.ok || res.status === 202 || !res.text) continue;
      if (/anomaly|captcha|challenge/i.test(res.text) && !/p-mp\d+/i.test(res.text)) {
        continue;
      }
      for (const url of extractTataCliqPdpCandidates(res.text)) {
        if (!candidates.includes(url)) candidates.push(url);
      }
      if (candidates.length) break;
    } catch {
      // try next engine
    }
    await sleep(options.delayMs || 400);
  }

  for (const url of candidates.slice(0, 8)) {
    try {
      const page = await fetchText(url, { timeoutMs: options.timeoutMs });
      if (!page.ok || !looksLikeTataCliqPdp(page.text)) continue;
      const hay = page.text.toUpperCase();
      if (hay.includes(compact)) return page.url || url;
    } catch {
      // try next candidate
    }
    await sleep(options.delayMs || 600);
  }
  return null;
}

function mapTataCliqProduct(html, skuInput, sourceUrl, options = {}) {
  const compact = String(skuInput || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-\s]/g, "");
  const brandFallback = options.brandHint || "Balmain";
  const data = extractProductDescriptionData(html);
  const ld = extractJsonLdProducts(html)[0] || null;
  const detailMap = {
    ...classificationsToMap(data && data.classifications),
    ...detailsToMap(data && data.details),
  };

  const modelNumber =
    detailMap["Model Number"] ||
    detailMap["Style Code"] ||
    (html.match(
      new RegExp(
        `\\b(L\\d(?:\\.\\d+){3,}|L\\d{8,}|B\\d{8}|R\\d{7,}|AR\\d{4,}|AX\\d{4,})\\b`,
        "i"
      )
    ) || [])[1] ||
    compact;

  // Prefer the longer of productTitle / productName (Tata often shortens Title)
  const titleCandidates = [
    data && data.productName,
    data && data.productTitle,
    ld && ld.name,
    match1(html, /property="og:title"\s+content="([^"]+)"/i).replace(
      /\s+Online.*$/i,
      ""
    ),
    `${brandFallback} ${modelNumber}`,
  ]
    .map((t) => String(t || "").trim())
    .filter(Boolean);
  titleCandidates.sort((a, b) => b.length - a.length);
  const title = titleCandidates[0] || `${brandFallback} ${modelNumber}`;

  const description =
    (data && (data.productDescription || data.styleNote)) ||
    (ld && ld.description) ||
    "";

  const price =
    priceFromObject(data && data.winningSellerPrice) ||
    priceFromObject(data && data.mrpPrice) ||
    (ld && ld.offers
      ? {
          amount: Number(ld.offers.price),
          currency: ld.offers.priceCurrency || "INR",
          label: ld.offers.price
            ? `₹${Number(ld.offers.price).toLocaleString("en-IN")}`
            : "",
        }
      : null);

  const images = extractGalleryImages(data, html);
  const genderRaw =
    (data && data.gender) || detailMap.Gender || "";
  const strapMaterial = detailMap["Strap Type"] || "";
  const strapColor =
    detailMap["Strap Color Brand"] || detailMap["Strap Color"] || "";

  const { product, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: (data && data.brandName) || brandFallback,
      sku: compact || String(modelNumber || "").toUpperCase().replace(/\W/g, ""),
      officialSku: modelNumber,
      title: String(title).replace(/^Buy\s+/i, "").trim(),
      description,
      caseMaterial: detailMap.Case || detailMap["Case Material"] || "",
      caseShape: detailMap["Dial Shape"] || "",
      caseSize: normalizeCaseSize(
        detailMap["Dial Diameter"] || detailMap["Case Size"] || ""
      ),
      dialColor: detailMap["Dial Color"] || detailMap["Dial Color Brand"] || "",
      waterResistance: detailMap["Water Resistance"] || "",
      movement: detailMap.Movement || "",
      strapMaterial,
      strapColor,
      gender: genderRaw,
      warrantyPeriod:
        detailMap["Warranty Details"] ||
        (Array.isArray(data && data.warranty) ? data.warranty[0] : "") ||
        "",
      category: "",
      price: null,
      oldPrice: null,
      priceSource: price,
      images,
      sourceUrl,
      source: SOURCE_ID,
      scrapedAt: new Date().toISOString(),
      rawAttributes: detailMap,
      extras: {
        collectionName: detailMap["Collection Name"] || "",
        functionality: detailMap.Functionality || "",
        strapWidth: detailMap["Strap Width"] || "",
        bandStyle: detailMap["Band Style"] || "",
        occasion: detailMap.Occasion || "",
        productListingId:
          (data && (data.productListingId || data.baseProductListingId)) || "",
        sellerName: (data && data.winningSellerName) || "",
      },
    });

  product.fieldMapped = fieldMapped;
  product.fieldUnmapped = fieldUnmapped;

  if (!product.description || product.description.length < 40) {
    product.warnings = product.warnings || [];
    product.warnings.push("description_short_or_missing");
  }
  if (fieldUnmapped && Object.keys(fieldUnmapped).length) {
    product.warnings = product.warnings || [];
    product.warnings.push("unmapped_constrained_fields");
  }
  if (!product.images.length) {
    product.warnings = product.warnings || [];
    product.warnings.push("no_sku_images");
  }

  return product;
}

async function fetchTataCliqHtml(url, options = {}) {
  const resolved = normalizeTataCliqUrl(url);
  if (!resolved) {
    const err = new Error("tatacliq: missing URL");
    err.code = "not_found";
    throw err;
  }
  const res = await fetchText(resolved, {
    timeoutMs: options.timeoutMs || 30000,
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IN,en;q=0.9",
      Referer: TATA_ORIGIN + "/",
    },
  });
  if (!res.ok || !res.text || res.text.length < 500) {
    throw Object.assign(
      new Error(
        `tatacliq fetch_failed: HTTP ${res.status || "?"} for ${resolved}`
      ),
      { code: "fetch_failed" }
    );
  }
  if (!looksLikeTataCliqPdp(res.text)) {
    throw Object.assign(
      new Error(`tatacliq not_found: HTML at ${res.url} is not a product PDP`),
      { code: "not_found" }
    );
  }
  return { html: res.text, sourceUrl: res.url || resolved };
}

async function enrichFromTataCliq(sku, options = {}) {
  const brandHint = options.brandHint || "Balmain";
  const compactKey = String(sku || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-\s]/g, "");
  let url = options.tataCliqUrl || null;
  if (!url && options.refUrls && options.refUrls[compactKey]) {
    url = options.refUrls[compactKey];
  }
  if (!url && options.resolveBySku !== false) {
    url = await resolveTataCliqUrlBySku(sku, options);
  }
  if (!url) {
    return {
      status: "not_found",
      sku: String(sku || "")
        .trim()
        .toUpperCase()
        .replace(/[.\-\s]/g, ""),
      brand: brandHint,
      source: SOURCE_ID,
      reason: "tatacliq: no PDP URL (pass tataCliqUrl or enable SKU search)",
      scrapedAt: new Date().toISOString(),
    };
  }

  const { html, sourceUrl } = await fetchTataCliqHtml(url, options);
  const product = mapTataCliqProduct(html, sku, sourceUrl, options);
  product.fetchMode = "live";

  const compact = product.sku;
  const hay = `${product.officialSku} ${product.title} ${html}`
    .toUpperCase()
    .replace(/[.\-\s]/g, "");
  if (compact && !hay.includes(compact)) {
    return {
      status: "not_found",
      sku: compact,
      brand: brandHint,
      source: SOURCE_ID,
      reason: "SKU not present on Tata Cliq page",
      sourceUrl,
      scrapedAt: new Date().toISOString(),
    };
  }
  return product;
}

module.exports = {
  TATA_ORIGIN,
  SOURCE_ID,
  normalizeTataCliqUrl,
  looksLikeTataCliqPdp,
  extractProductDescriptionData,
  mapTataCliqProduct,
  resolveTataCliqUrlBySku,
  fetchTataCliqHtml,
  enrichFromTataCliq,
};
