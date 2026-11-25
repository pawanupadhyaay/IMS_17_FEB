"use strict";

/**
 * Ethos Watch Boutiques (ethoswatches.com) — miss-recovery retailer fallback.
 * Prefer official brand CDN whenever a brand PDP exists. Ethos is last-resort
 * after Collective / Tata Cliq / TGT Luxe / Amazon as configured per brand.
 *
 * PDP: https://www.ethoswatches.com/product-{slug}-{sku}.html
 * Specs: JSON-LD Product + on-page "Brand / Model No / Case Size / …" labels.
 * Live Node fetches often hit Cloudflare; pass ethosUrl / fixture HTML when blocked.
 */

const fs = require("fs");
const path = require("path");
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

const ETHOS_ORIGIN = "https://www.ethoswatches.com";
const SOURCE_ID = "ethos";

function compactSku(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
}

function absUrl(url, base = ETHOS_ORIGIN) {
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

function normalizeEthosUrl(urlOrPath) {
  const raw = String(urlOrPath || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return absUrl(raw);
  if (raw.startsWith("/")) return absUrl(raw);
  if (/^product-[a-z0-9-]+\.html$/i.test(raw)) return absUrl(`/${raw}`);
  return null;
}

function looksLikeEthosPdp(html) {
  const text = String(html || "");
  if (/Just a moment|cf-browser-verification|challenge-platform/i.test(text)) {
    return false;
  }
  return (
    /"@type"\s*:\s*"Product"/i.test(text) ||
    (/Model No/i.test(text) && /ethoswatches/i.test(text)) ||
    /cdn-media\.ethoswatches\.com\/media\/catalog\/product/i.test(text)
  );
}

function isCloudflareChallenge(html, status) {
  if (status === 403 || status === 503) return true;
  return /Just a moment|cf-browser-verification|challenge-platform/i.test(
    String(html || "")
  );
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
      // ignore
    }
  }
  return out;
}

function extractLabeledSpecs(html) {
  const map = {};
  const text = decodeEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n")
      .replace(/\s+/g, " ")
  );
  const labels = [
    "Brand",
    "Collection",
    "Series",
    "Model No",
    "Movement",
    "Calibre",
    "Case Size",
    "Case Thickness",
    "Case Shape",
    "Case Material",
    "Case Back",
    "Glass Material",
    "Dial Colour",
    "Dial Color",
    "Hands",
    "Indexes",
    "Strap Material",
    "Strap Colour",
    "Strap Color",
    "Clasp Type",
    "EAN",
    "Gender",
    "Water Resistance (M)",
    "Water Resistance",
    "Warranty Period",
    "Country of Origin",
    "Features",
  ];
  for (const label of labels) {
    const re = new RegExp(
      `${label.replace(/[()]/g, "\\$&")}\\s+([^\\n]{1,80}?)(?=\\s+(?:${labels
        .map((l) => l.replace(/[()]/g, "\\$&"))
        .join("|")}|FULL SPECIFICATION|ABOUT THE)|$)`,
      "i"
    );
    const m = text.match(re);
    if (m && m[1]) map[label] = m[1].trim();
  }
  // Simpler pairwise fallbacks
  const pairRe =
    /(Brand|Collection|Model No|Movement|Case Size|Case Shape|Case Material|Dial Colou?r|Strap Material|Strap Colou?r|Gender|Water Resistance(?: \(M\))?|Warranty Period)\s+([A-Za-z0-9][A-Za-z0-9 .\/&+-]{0,60})/gi;
  let pm;
  while ((pm = pairRe.exec(text))) {
    const key = pm[1].trim();
    if (!map[key]) map[key] = pm[2].trim();
  }
  return map;
}

function upgradeEthosImage(url) {
  const u = absUrl(url);
  if (!u) return "";
  // Prefer uncached Magento path when cache hash is present
  return u
    .replace(/\/cache\/[a-f0-9]+\//i, "/")
    .replace(/-large(\.(?:jpg|jpeg|png|webp))/i, "$1")
    .replace(/-hover(\.(?:jpg|jpeg|png|webp))/i, "$1");
}

function extractEthosImages(html, ld) {
  const urls = [];
  const seen = new Set();
  const push = (u) => {
    let url = upgradeEthosImage(u);
    if (!url) return;
    if (!/ethoswatches\.com\/.*catalog\/product/i.test(url)) return;
    if (/close-cookies|ethos-logo|menu\/|calibre\//i.test(url)) return;
    const key = url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    urls.push(url);
  };

  const ldImgs = ld && ld.image;
  const arr = Array.isArray(ldImgs) ? ldImgs : ldImgs ? [ldImgs] : [];
  for (const u of arr) push(u);

  const og = match1(html, /property="og:image"\s+content="([^"]+)"/i);
  if (og) push(og);

  const imgRe =
    /https?:\/\/(?:cdn-media|cdn2|images|www)\.ethoswatches\.com\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi;
  let m;
  while ((m = imgRe.exec(html))) {
    push(m[0]);
  }

  return urls.slice(0, 12);
}

function extractEthosPdpCandidates(html) {
  const candidates = [];
  const decoded = String(html || "")
    .replace(/&amp;/g, "&")
    .replace(/%2F/gi, "/")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/");

  const re =
    /https?:\/\/(?:www\.)?ethoswatches\.com\/product-[a-z0-9-]+\.html/gi;
  let m;
  while ((m = re.exec(decoded))) {
    const url = m[0].split("&")[0].replace(/[.,;)]+$/, "");
    if (!candidates.includes(url)) candidates.push(url);
  }
  const pathRe = /(?:www\.)?ethoswatches\.com(\/product-[a-z0-9-]+\.html)/gi;
  while ((m = pathRe.exec(decoded))) {
    const url = absUrl(m[1]);
    if (!candidates.includes(url)) candidates.push(url);
  }
  // Bing / redirect wrappers often bury the real URL in u= / url=
  const nested = /[?&](?:u|url|r)=([^&"']+)/gi;
  while ((m = nested.exec(decoded))) {
    try {
      const decodedUrl = decodeURIComponent(m[1]);
      if (/ethoswatches\.com\/product-/i.test(decodedUrl)) {
        const hit = decodedUrl.match(
          /https?:\/\/(?:www\.)?ethoswatches\.com\/product-[a-z0-9-]+\.html/i
        );
        if (hit && !candidates.includes(hit[0])) candidates.push(hit[0]);
      }
    } catch {
      // ignore
    }
  }
  return candidates;
}

function brandSlugHints(brandHint) {
  const b = String(brandHint || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const hints = [];
  if (b) hints.push(b);
  if (/emporio/.test(b)) hints.push("emporio-armani", "armani");
  if (/armani-exchange|exchange/.test(b)) {
    hints.push("armani-exchange", "exchange");
  }
  if (/rado/.test(b)) hints.push("rado", "rado-coupole", "rado-coupole-classic");
  if (/longines/.test(b)) hints.push("longines");
  if (/balmain/.test(b)) hints.push("balmain");
  return [...new Set(hints.filter(Boolean))];
}

function guessEthosUrls(sku, options = {}) {
  const compact = compactSku(sku);
  if (!compact) return [];
  const skuLower = compact.toLowerCase();
  const brandHints = brandSlugHints(options.brandHint);
  const urls = [];
  for (const slug of brandHints) {
    urls.push(`${ETHOS_ORIGIN}/product-${slug}-${skuLower}.html`);
  }
  urls.push(`${ETHOS_ORIGIN}/product-${skuLower}.html`);
  return [...new Set(urls)];
}

/**
 * Best-effort SKU → Ethos PDP via URL guesses + Bing/DDG + on-site search.
 */
async function resolveEthosUrlBySku(sku, options = {}) {
  const compact = compactSku(sku);
  if (!compact) return null;

  if (options.ethosUrl) return normalizeEthosUrl(options.ethosUrl);
  if (options.refUrls && options.refUrls[compact]) {
    return normalizeEthosUrl(options.refUrls[compact]);
  }

  const brandHint = options.brandHint || "";
  const guessed = guessEthosUrls(compact, options);
  for (const url of guessed.slice(0, 6)) {
    try {
      const page = await fetchText(url, {
        timeoutMs: options.timeoutMs || 25000,
        retries: 0,
        headers: { Referer: `${ETHOS_ORIGIN}/` },
      });
      if (isCloudflareChallenge(page.text, page.status)) continue;
      if (page.ok && looksLikeEthosPdp(page.text)) {
        const hay = page.text.toUpperCase().replace(/[.\-_\s]/g, "");
        if (hay.includes(compact)) return page.url || url;
      }
    } catch {
      // next
    }
    await sleep(options.delayMs || 250);
  }

  const queries = [
    `site:ethoswatches.com ${compact} ${brandHint}`.trim(),
    `site:ethoswatches.com/product- ${compact}`,
  ];
  const searchUrls = [];
  for (const q of queries) {
    searchUrls.push(`https://www.bing.com/search?q=${encodeURIComponent(q)}`);
    searchUrls.push(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`
    );
  }
  searchUrls.push(
    `${ETHOS_ORIGIN}/catalogsearch/result/?q=${encodeURIComponent(compact)}`
  );

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
            : ETHOS_ORIGIN + "/",
        },
      });
      if (!res.ok || res.status === 202 || !res.text) continue;
      if (isCloudflareChallenge(res.text, res.status)) continue;
      if (
        /anomaly|captcha|challenge/i.test(res.text) &&
        !/product-[a-z0-9-]+\.html/i.test(res.text)
      ) {
        continue;
      }
      for (const url of extractEthosPdpCandidates(res.text)) {
        if (!candidates.includes(url)) candidates.push(url);
      }
      if (candidates.length) break;
    } catch {
      // next
    }
    await sleep(options.delayMs || 400);
  }

  for (const url of candidates.slice(0, 8)) {
    try {
      const page = await fetchText(url, {
        timeoutMs: options.timeoutMs || 25000,
        headers: { Referer: `${ETHOS_ORIGIN}/` },
      });
      if (isCloudflareChallenge(page.text, page.status)) continue;
      if (!page.ok || !looksLikeEthosPdp(page.text)) continue;
      const hay = page.text.toUpperCase().replace(/[.\-_\s]/g, "");
      if (hay.includes(compact)) return page.url || url;
    } catch {
      // next
    }
    await sleep(options.delayMs || 400);
  }
  return null;
}

function mapEthosProduct(html, skuInput, sourceUrl, options = {}) {
  const compact = compactSku(skuInput);
  const brandFallback = options.brandHint || "Watch";
  const ld = extractJsonLdProducts(html)[0] || null;
  const specs = extractLabeledSpecs(html);

  const modelNumber =
    (ld && (ld.sku || ld.mpn || ld.model)) ||
    specs["Model No"] ||
    compact;

  const title =
    (ld && ld.name) ||
    match1(html, /property="og:title"\s+content="([^"]+)"/i) ||
    match1(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() ||
    `${brandFallback} ${modelNumber}`;

  const description = (ld && ld.description) || "";
  const dialColor = specs["Dial Colour"] || specs["Dial Color"] || "";
  const waterRaw =
    specs["Water Resistance (M)"] || specs["Water Resistance"] || "";
  const water =
    normalizeWaterResistance(
      /\d/.test(waterRaw) && !/m/i.test(waterRaw)
        ? `${waterRaw} m`
        : waterRaw
    ) || waterRaw;

  const priceAmount =
    ld && ld.offers && ld.offers.price != null
      ? Number(ld.offers.price)
      : null;

  const images = extractEthosImages(html, ld);

  const { product, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: (ld && ld.brand) || specs.Brand || brandFallback,
      sku: compact || compactSku(modelNumber),
      officialSku: String(modelNumber || "").trim(),
      title: String(title)
        .replace(/\s*\|\s*Ethos.*$/i, "")
        .trim(),
      description,
      caseMaterial:
        normalizeCaseMaterial(specs["Case Material"] || (ld && ld.material) || "") ||
        specs["Case Material"] ||
        "",
      caseShape:
        normalizeCaseShape(specs["Case Shape"] || "") ||
        specs["Case Shape"] ||
        "",
      caseSize: normalizeCaseSize(specs["Case Size"] || "") || "",
      dialColor: normalizeDialColor(dialColor) || dialColor || "",
      waterResistance: water || "",
      movement:
        normalizeMovement(specs.Movement || "") || specs.Movement || "",
      strapMaterial:
        normalizeStrapMaterial(specs["Strap Material"] || "") ||
        specs["Strap Material"] ||
        "",
      strapColor:
        normalizeStrapColor(
          specs["Strap Colour"] || specs["Strap Color"] || ""
        ) ||
        specs["Strap Colour"] ||
        specs["Strap Color"] ||
        "",
      gender: normalizeGender(specs.Gender || "") || specs.Gender || "",
      warrantyPeriod: specs["Warranty Period"] || "",
      category: "Luxury",
      price: null,
      oldPrice: null,
      priceSource:
        priceAmount != null && Number.isFinite(priceAmount)
          ? {
              amount: priceAmount,
              currency: (ld.offers && ld.offers.priceCurrency) || "INR",
              label: `₹${Number(priceAmount).toLocaleString("en-IN")}`,
            }
          : null,
      images,
      sourceUrl,
      source: SOURCE_ID,
      scrapedAt: new Date().toISOString(),
      rawAttributes: specs,
      extras: {
        collectionName: specs.Collection || "",
        calibre: specs.Calibre || "",
        caseThickness: specs["Case Thickness"] || "",
        glassMaterial: specs["Glass Material"] || "",
        ean: specs.EAN || (ld && ld.gtin) || "",
        features: specs.Features || "",
      },
    });

  product.fieldMapped = fieldMapped;
  product.fieldUnmapped = fieldUnmapped;
  product.warnings = product.warnings || [];
  if (!product.description || product.description.length < 40) {
    product.warnings.push("description_short_or_missing");
  }
  if (!product.images.length) product.warnings.push("no_sku_images");
  if (fieldUnmapped && Object.keys(fieldUnmapped).length) {
    product.warnings.push("unmapped_constrained_fields");
  }
  return product;
}

function readFixtureHtml(filePath, sourceUrl) {
  const html = fs.readFileSync(filePath, "utf8");
  return { html, sourceUrl: sourceUrl || null, fromFixture: true };
}

function fixturePathForSku(fixtureDir, sku) {
  if (!fixtureDir) return null;
  const compact = compactSku(sku);
  const names = [
    `ethos-${compact}.html`,
    `ethoswatches-${compact}.html`,
    `${compact}-ethos.html`,
  ];
  for (const name of names) {
    const fp = path.join(fixtureDir, name);
    if (fs.existsSync(fp)) return fp;
  }
  return null;
}

async function fetchEthosHtml(url, options = {}) {
  if (options.ethosHtmlPath) {
    return readFixtureHtml(options.ethosHtmlPath, options.ethosUrl || url);
  }
  const fp = fixturePathForSku(options.fixtureDir, options.sku || "");
  if (fp && options.preferFixture) {
    return readFixtureHtml(fp, options.ethosUrl || url);
  }

  const resolved = normalizeEthosUrl(url);
  if (!resolved) {
    throw Object.assign(new Error("ethos: missing URL"), { code: "not_found" });
  }
  const res = await fetchText(resolved, {
    timeoutMs: options.timeoutMs || 30000,
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IN,en;q=0.9",
      Referer: `${ETHOS_ORIGIN}/`,
    },
  });
  if (isCloudflareChallenge(res.text, res.status)) {
    const fixture = fixturePathForSku(options.fixtureDir, options.sku || "");
    if (fixture) return readFixtureHtml(fixture, resolved);
    throw Object.assign(
      new Error(`ethos blocked: Cloudflare challenge for ${resolved}`),
      { code: "blocked", sourceUrl: resolved }
    );
  }
  if (!res.ok || !res.text || res.text.length < 500) {
    throw Object.assign(
      new Error(`ethos fetch_failed: HTTP ${res.status || "?"} for ${resolved}`),
      { code: "fetch_failed", sourceUrl: resolved }
    );
  }
  if (!looksLikeEthosPdp(res.text)) {
    throw Object.assign(
      new Error(`ethos not_found: HTML at ${res.url || resolved} is not a PDP`),
      { code: "not_found", sourceUrl: res.url || resolved }
    );
  }
  return { html: res.text, sourceUrl: res.url || resolved, fromFixture: false };
}

async function enrichFromEthos(sku, options = {}) {
  const brandHint = options.brandHint || "Watch";
  const compact = compactSku(sku);
  let url = options.ethosUrl || null;
  if (!url && options.refUrls && options.refUrls[compact]) {
    url = options.refUrls[compact];
  }
  if (!url && options.resolveBySku !== false) {
    url = await resolveEthosUrlBySku(sku, { ...options, sku: compact });
  }
  if (!url && options.ethosHtmlPath) {
    url = options.ethosUrl || `${ETHOS_ORIGIN}/`;
  }
  if (!url) {
    return {
      status: "not_found",
      sku: compact,
      brand: brandHint,
      source: SOURCE_ID,
      reason: "ethos: no PDP URL (pass ethosUrl or enable SKU search)",
      scrapedAt: new Date().toISOString(),
    };
  }

  try {
    const { html, sourceUrl, fromFixture } = await fetchEthosHtml(url, {
      ...options,
      sku: compact,
    });
    const product = mapEthosProduct(html, sku, sourceUrl, options);
    product.fetchMode = fromFixture ? "fixture" : "live";

    const hay = `${product.officialSku} ${product.title} ${html}`
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
    if (compact && !hay.includes(compact)) {
      return {
        status: "not_found",
        sku: compact,
        brand: brandHint,
        source: SOURCE_ID,
        reason: "SKU not present on Ethos page",
        sourceUrl,
        scrapedAt: new Date().toISOString(),
      };
    }
    return product;
  } catch (err) {
    return {
      status: err.code || "error",
      sku: compact,
      brand: brandHint,
      source: SOURCE_ID,
      reason: err.message,
      sourceUrl: err.sourceUrl || url || null,
      scrapedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  ETHOS_ORIGIN,
  SOURCE_ID,
  compactSku,
  normalizeEthosUrl,
  looksLikeEthosPdp,
  extractJsonLdProducts,
  mapEthosProduct,
  resolveEthosUrlBySku,
  fetchEthosHtml,
  enrichFromEthos,
  guessEthosUrls,
};
