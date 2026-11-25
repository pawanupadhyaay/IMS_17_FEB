"use strict";

/**
 * The Collective (thecollective.in) PDP helpers — India retailer fallback when
 * an official brand PDP is missing. Prefer official brand CDN when present.
 *
 * PDP: https://www.thecollective.in/p/{linkRewrite}-{productId}.html
 * Product payload lives in Next.js RSC (`self.__next_f.push`) as productDetails.
 * Catalog discovery: RichRelevance find API filtered by Feature_Subbrand.
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
} = require("./normalize");

const COLLECTIVE_ORIGIN = "https://www.thecollective.in";
const IMAGE_ORIGIN = "https://imagescdn.thecollective.in";
const SOURCE_ID = "thecollective";
const RR_FIND =
  "https://recs.richrelevance.com/rrserver/api/find/v1/256f21a9ff270929";
const RR_PLACEMENT = "category_page.sort_desktop";

function absUrl(url, base = COLLECTIVE_ORIGIN) {
  if (!url) return "";
  const raw = String(url).trim();
  if (!raw) return "";
  if (raw.startsWith("//")) return `https:${raw}`;
  try {
    return new URL(raw, base).href.split("#")[0];
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

function compactSku(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
}

function extractBalancedObject(text, startIdx) {
  if (startIdx < 0 || startIdx >= text.length || text[startIdx] !== "{") {
    return null;
  }
  let i = startIdx;
  let depth = 0;
  let inStr = false;
  let esc = false;
  while (i < text.length) {
    const ch = text[i];
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
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
    i += 1;
  }
  return null;
}

/** Unescape Next.js RSC flight push payloads into searchable text. */
function extractRscCombined(html) {
  const pushes = [
    ...String(html || "").matchAll(
      /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g
    ),
  ].map((m) => m[1]);
  let combined = "";
  for (const p of pushes) {
    combined += p
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n")
      .replace(/\\u0026/g, "&");
  }
  return combined;
}

function extractProductDetails(html) {
  const combined = extractRscCombined(html);
  const haystacks = [combined, String(html || "")];
  for (const hay of haystacks) {
    const marker = '"productDetails":';
    const idx = hay.indexOf(marker);
    if (idx < 0) continue;
    const brace = hay.indexOf("{", idx + marker.length);
    const raw = extractBalancedObject(hay, brace);
    if (!raw) continue;
    try {
      return JSON.parse(raw);
    } catch {
      /* try next */
    }
  }
  return null;
}

function looksLikeCollectivePdp(html) {
  if (!html || html.length < 1000) return false;
  if (/productDetails/i.test(html) && /LinkRewrite/i.test(html)) return true;
  if (
    /thecollective\.in/i.test(html) &&
    /Master Collection|Hydroconquest|Longines|og:title/i.test(html)
  ) {
    return true;
  }
  return false;
}

function normalizeCollectiveUrl(urlOrPath) {
  const raw = String(urlOrPath || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    // Prefer /p/ canonical form (also accept /product/)
    return raw
      .replace(/\/product\//i, "/p/")
      .split("#")[0]
      .split("?")[0];
  }
  if (raw.startsWith("/")) {
    return absUrl(raw.replace(/^\/product\//i, "/p/"));
  }
  if (/^[a-z0-9-]+-\d+\.html$/i.test(raw)) {
    return `${COLLECTIVE_ORIGIN}/p/${raw}`;
  }
  return null;
}

function imageUrlFromMedia(img) {
  if (!img || !img.Name) return "";
  const ext = String(img.Extension || "jpg").toLowerCase().replace(/^\./, "");
  // /img/app/product/1/{productId}-{imageId}.jpg
  return `${IMAGE_ORIGIN}/img/app/product/1/${img.Name}.${ext}`;
}

function extractImages(data) {
  const images = [];
  const seen = new Set();
  const list = data?.Media?.Images;
  if (!Array.isArray(list)) return images;
  const ranked = [...list].sort(
    (a, b) => (Number(a.Position) || 999) - (Number(b.Position) || 999)
  );
  for (const img of ranked) {
    if (!img || img["360Image"]) continue;
    const url = imageUrlFromMedia(img);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    images.push(url);
  }
  return images.slice(0, 16);
}

function featuresToMap(data) {
  const map = {};
  const feat = data?.Features;
  if (feat && typeof feat === "object") {
    for (const [k, v] of Object.entries(feat)) {
      if (v == null || v === "") continue;
      map[k] = String(v).trim();
    }
  }
  const pdp = data?.PDPEnabledFeatures;
  if (Array.isArray(pdp)) {
    for (const row of pdp) {
      const key = String(row.DisplayName || row.FeatureName || "").trim();
      const val = String(row.FeatureValueName || "").trim();
      if (key && val) map[key] = val;
    }
  }
  return map;
}

function skuFromNameOrLink(data, fallback) {
  const link = String(data?.LinkRewrite || "");
  const mLink = link.match(/-(l\d{8,})$/i);
  if (mLink) return mLink[1].toUpperCase();
  const name = String(data?.Name || data?.MetaTitle || "");
  const mName = name.match(/\b(L\d(?:\.\d+){3,})\b/i);
  if (mName) return compactSku(mName[1]);
  return compactSku(fallback);
}

function pdpUrlFromDoc(doc) {
  const click = String(doc?.clickUrl || "");
  const m = click.match(/ct=(https?%3A%2F%2F[^&]+)/i);
  if (m) {
    try {
      return normalizeCollectiveUrl(decodeURIComponent(m[1]));
    } catch {
      /* fall through */
    }
  }
  const rewrite = doc?.LinkRewrite;
  const id = doc?.id;
  if (rewrite && id) {
    return `${COLLECTIVE_ORIGIN}/p/${rewrite}-${id}.html`;
  }
  return null;
}

function docMatchesSku(doc, compact) {
  if (!compact) return false;
  const hay = JSON.stringify(doc || {})
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  return hay.includes(compact);
}

/**
 * Resolve Collective PDP via RichRelevance catalog find (Subbrand filter + SKU query).
 */
async function resolveCollectiveUrlBySku(sku, options = {}) {
  const compact = compactSku(sku);
  if (!compact) return null;
  if (options.collectiveUrl) {
    return normalizeCollectiveUrl(options.collectiveUrl);
  }

  const brand = options.brandHint || "Longines";
  const queries = [
    compact,
    options.dottedSku || "",
    `*:*`,
  ].filter(Boolean);

  for (const query of queries) {
    const params = new URLSearchParams({
      lang: "en",
      returnMinimalRecItemData: "false",
      rows: query === "*:*" ? "200" : "40",
      start: "0",
      placements: RR_PLACEMENT,
      query,
    });
    const filters = [
      `Feature_Subbrand:"${brand}"`,
      'Feature_Restriction:"No_restriction"',
    ];
    let url = `${RR_FIND}?${params}`;
    for (const f of filters) {
      url += `&filter=${encodeURIComponent(f)}`;
    }
    try {
      const res = await fetchText(url, {
        timeoutMs: options.timeoutMs || 30000,
        retries: 1,
        headers: {
          Accept: "application/json",
          Referer: `${COLLECTIVE_ORIGIN}/`,
        },
      });
      if (!res.ok || !res.text) continue;
      let json;
      try {
        json = JSON.parse(res.text);
      } catch {
        continue;
      }
      const docs = json?.placements?.[0]?.docs || [];
      const hit = docs.find((d) => docMatchesSku(d, compact));
      if (hit) {
        const pdp = pdpUrlFromDoc(hit);
        if (pdp) return pdp;
      }
    } catch {
      /* try next query */
    }
    await sleep(options.delayMs || 250);
  }

  // Best-effort web search (often rate-limited)
  const searchQ = `site:thecollective.in ${compact} ${brand}`;
  const searchUrls = [
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQ)}`,
    `https://www.bing.com/search?q=${encodeURIComponent(searchQ)}`,
  ];
  for (const searchUrl of searchUrls) {
    try {
      const res = await fetchText(searchUrl, {
        timeoutMs: options.timeoutMs || 25000,
        retries: 0,
      });
      if (!res.ok || res.status === 202 || res.status === 403 || !res.text) {
        continue;
      }
      const candidates = [];
      for (const m of res.text.matchAll(/uddg=([^&"]+)/g)) {
        try {
          const u = decodeURIComponent(m[1]);
          if (/thecollective\.in\/(?:p|product)\//i.test(u)) {
            candidates.push(normalizeCollectiveUrl(u));
          }
        } catch {
          /* ignore */
        }
      }
      for (const m of res.text.matchAll(
        /https?:\/\/(?:www\.)?thecollective\.in\/(?:p|product)\/[a-z0-9%-]+\.html/gi
      )) {
        candidates.push(normalizeCollectiveUrl(m[0]));
      }
      for (const cand of [...new Set(candidates.filter(Boolean))].slice(0, 8)) {
        if (cand.toLowerCase().includes(compact.toLowerCase())) return cand;
        try {
          const page = await fetchText(cand, {
            timeoutMs: options.timeoutMs || 25000,
            retries: 0,
          });
          if (
            page.ok &&
            looksLikeCollectivePdp(page.text) &&
            page.text.toUpperCase().replace(/[.\-_\s]/g, "").includes(compact)
          ) {
            return page.url || cand;
          }
        } catch {
          /* next */
        }
      }
    } catch {
      /* next engine */
    }
  }

  return null;
}

function mapCollectiveProduct(html, skuInput, sourceUrl) {
  const data = extractProductDetails(html);
  if (!data) {
    throw Object.assign(
      new Error("thecollective not_found: no productDetails payload"),
      { code: "not_found", sourceUrl }
    );
  }

  const compact = compactSku(skuInput);
  const officialSku = skuFromNameOrLink(data, compact) || compact;
  const feat = featuresToMap(data);
  const subbrand =
    feat.Subbrand ||
    feat.Brand ||
    (String(data.ManufacturerInfo || "").includes("Longines")
      ? "Longines"
      : "") ||
    "Longines";

  const title =
    String(data.Name || "").replace(/\s+/g, " ").trim() ||
    match1(html, /property=["']og:title["']\s+content=["']([^"']+)/i).replace(
      /\s+Online.*$/i,
      ""
    ) ||
    `${subbrand} ${officialSku}`;

  const description =
    String(data.Description || data.ShortDescription || "")
      .replace(/\s+/g, " ")
      .trim() ||
    match1(
      html,
      /property=["']og:description["']\s+content=["']([^"']+)/i
    ) ||
    "";

  const priceAmount =
    data.SellingPrice != null
      ? Number(data.SellingPrice)
      : data.Price != null
        ? Number(data.Price)
        : null;

  const images = extractImages(data);
  const caseMaterial =
    feat["Case Material"] || feat.CaseMaterial || feat.Color || "";
  const dialColor = feat["Dial Color"] || feat.DialColor || "";
  const caseShape = feat["Dial Shape"] || feat.DialShape || "";
  const movement =
    feat["Movement Type"] || feat.MovementType || feat.Movement || "";
  const strapMaterial =
    feat["Band Material"] || feat.BandMaterial || "";
  const caseSize =
    feat["Dial Size"] || feat.DialSize || feat["Case Size"] || "";
  const warranty = feat.Warranty || feat["Warranty Details"] || "";
  const genderRaw = data.Gender || feat.Gender || "";
  const collection = feat.Collection || "";

  const { product, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: subbrand === "The Collective" ? "Longines" : subbrand || "Longines",
      sku: compact || officialSku,
      officialSku,
      title: title.replace(/^Buy\s+/i, "").trim(),
      description,
      caseMaterial: normalizeCaseMaterial(caseMaterial) || caseMaterial || "",
      caseShape: normalizeCaseShape(caseShape) || caseShape || "",
      caseSize: normalizeCaseSize(caseSize) || caseSize || "",
      dialColor: normalizeDialColor(dialColor) || dialColor || "",
      waterResistance: feat["Water Resistance"] || "",
      movement: normalizeMovement(movement) || movement || "",
      strapMaterial:
        normalizeStrapMaterial(strapMaterial) || strapMaterial || "",
      strapColor:
        normalizeStrapColor(feat["Strap Color"] || feat.Color || "") || "",
      gender: normalizeGender(genderRaw) || genderRaw || "",
      warrantyPeriod: warranty,
      category: "Luxury",
      price: null,
      oldPrice: null,
      priceSource:
        priceAmount != null && Number.isFinite(priceAmount)
          ? {
              amount: priceAmount,
              mrp: null,
              currency: "INR",
              label: `₹${Number(priceAmount).toLocaleString("en-IN")}`,
            }
          : null,
      images,
      sourceUrl:
        sourceUrl ||
        (data.LinkRewrite && data.ProductID
          ? `${COLLECTIVE_ORIGIN}/p/${data.LinkRewrite}-${data.ProductID}.html`
          : null),
      source: SOURCE_ID,
      scrapedAt: new Date().toISOString(),
      rawAttributes: feat,
      extras: {
        collection,
        productId: data.ProductID || "",
        styleCode: data.StyleCode || "",
        caseThickness: feat["Case Thickness"] || "",
        strapClosure: feat["Strap Closure"] || "",
        manufacturer: data.ManufacturerInfo || "",
      },
    });

  product.fieldMapped = fieldMapped;
  product.fieldUnmapped = fieldUnmapped;
  product.warnings = product.warnings || [];

  if (!product.description || product.description.length < 40) {
    product.warnings.push("description_short_or_missing");
  }
  if (!product.images.length) {
    product.warnings.push("no_sku_images");
  }
  if (fieldUnmapped && Object.keys(fieldUnmapped).length) {
    product.warnings.push("unmapped_constrained_fields");
  }

  return product;
}

async function fetchCollectiveHtml(url, options = {}) {
  const resolved = normalizeCollectiveUrl(url);
  if (!resolved) {
    throw Object.assign(new Error("thecollective: missing URL"), {
      code: "not_found",
    });
  }
  const res = await fetchText(resolved, {
    timeoutMs: options.timeoutMs || 45000,
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IN,en;q=0.9",
      Referer: `${COLLECTIVE_ORIGIN}/`,
    },
  });
  if (!res.ok || !res.text || res.text.length < 500) {
    throw Object.assign(
      new Error(
        `thecollective fetch_failed: HTTP ${res.status || "?"} for ${resolved}`
      ),
      { code: "fetch_failed", sourceUrl: resolved }
    );
  }
  if (!looksLikeCollectivePdp(res.text)) {
    throw Object.assign(
      new Error(
        `thecollective not_found: HTML at ${res.url || resolved} is not a product PDP`
      ),
      { code: "not_found", sourceUrl: res.url || resolved }
    );
  }
  return { html: res.text, sourceUrl: res.url || resolved };
}

async function enrichFromCollective(sku, options = {}) {
  let url = options.collectiveUrl || null;
  if (!url && options.resolveBySku !== false) {
    url = await resolveCollectiveUrlBySku(sku, options);
  }
  if (!url) {
    return {
      status: "not_found",
      sku: compactSku(sku),
      brand: options.brandHint || "Longines",
      source: SOURCE_ID,
      reason:
        "thecollective: no PDP URL (pass collectiveUrl or enable SKU search)",
      scrapedAt: new Date().toISOString(),
    };
  }

  const { html, sourceUrl } = await fetchCollectiveHtml(url, options);
  const product = mapCollectiveProduct(html, sku, sourceUrl);
  product.fetchMode = "live";

  const compact = product.sku;
  const hay = `${product.officialSku} ${product.title} ${html}`
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  if (compact && !hay.includes(compact)) {
    return {
      status: "not_found",
      sku: compact,
      brand: product.brand || "Longines",
      source: SOURCE_ID,
      reason: "SKU not present on The Collective page",
      sourceUrl,
      scrapedAt: new Date().toISOString(),
    };
  }
  return product;
}

module.exports = {
  COLLECTIVE_ORIGIN,
  IMAGE_ORIGIN,
  SOURCE_ID,
  compactSku,
  normalizeCollectiveUrl,
  looksLikeCollectivePdp,
  extractProductDetails,
  mapCollectiveProduct,
  resolveCollectiveUrlBySku,
  fetchCollectiveHtml,
  enrichFromCollective,
};
