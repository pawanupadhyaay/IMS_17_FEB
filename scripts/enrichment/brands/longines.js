"use strict";

/**
 * Longines (longines.com) enrichment — Next.js Magento storefront.
 *
 * IMS SKUs are compact (L81154716). Official refs are dotted (L8.115.4.71.6).
 * PDP: https://www.longines.com/{locale}/p/{url_key}
 *   e.g. …/en-in/p/watch-longines-primaluna-l8-115-4-71-6
 *
 * Resolve order:
 *   1. options.officialUrl / CSV official_url
 *   2. In-memory sitemap index (en-in → en-us → global products.xml) by dashed SKU
 *   3. Heuristic /p/…-{dashed} guess (rarely works without collection slug)
 *   4. Fixtures under fixtures/longines-{compact}.html
 *   5. On official miss: The Collective → Tata Cliq Luxury → TGT Luxe
 *      (India retailers; Shopify search/products.json for TGT)
 *
 * Specs + images from __NEXT_DATA__ fallback (ProductPageDocument +
 * ProductPageAdditionalDocument + ProductAttributes). JSON-LD as fallback.
 * Prefer longines.com / api.ecom.longines.com first. No Ethos. No auto-publish.
 */

const path = require("path");
const fs = require("fs");
const { fetchText, sleep } = require("../lib/http");
const { buildSeo } = require("../lib/seo");
const {
  enrichFromTataCliq,
} = require("../lib/tatacliq");
const {
  enrichFromCollective,
} = require("../lib/thecollective");
const {
  enrichFromTgtLuxe,
} = require("../lib/tgtluxe");
const {
  normalizeProductFields,
  normalizeCaseSize,
  normalizeStrapColor,
  normalizeDialColor,
  normalizeWaterResistance,
  normalizeCaseMaterial,
  normalizeStrapMaterial,
  normalizeMovement,
  normalizeCaseShape,
  normalizeGender,
} = require("../lib/normalize");

const BRAND = "Longines";
const SITE_ORIGIN = "https://www.longines.com";
const MEDIA_ORIGIN = "https://api.ecom.longines.com/media/catalog/product";
const LOCALE = "en-in";
const SOURCE_OFFICIAL = "longines";
const SOURCE_COLLECTIVE = "thecollective";
const SOURCE_TATA = "tatacliq";
const SOURCE_TGT = "tgtluxe";

/** Official PDP missing — allow India retailer fallbacks */
const OFFICIAL_FAIL_CODES = new Set([
  "not_found",
  "fetch_failed",
  "error",
]);

/**
 * Known IMS / spreadsheet typos → correct Longines compact refs.
 * Example: L22734716 (IMS empty listing) → L27734716 (Master Collection on Collective).
 */
const SKU_TYPO_MAP = {
  L22734716: "L27734716",
};

const SKU_TYPO_ALIASES = Object.create(null);
for (const [typo, correct] of Object.entries(SKU_TYPO_MAP)) {
  const c = String(correct).toUpperCase();
  if (!SKU_TYPO_ALIASES[c]) SKU_TYPO_ALIASES[c] = [];
  SKU_TYPO_ALIASES[c].push(String(typo).toUpperCase());
}

/** Known Collective PDPs when RR/search is flaky (compact → URL). */
const COLLECTIVE_REF_URLS = {
  L27734716:
    "https://www.thecollective.in/p/men-silver-master-collection-watch-l27734716-1006973.html",
};

/** Known TGT Luxe PDPs when suggest/catalog is flaky (compact → URL). */
const TGT_LUXE_REF_URLS = {
  L23575707:
    "https://tgtluxe.com/products/longines-silver-dial-automatic-men-watch-l23575707",
  L37403587:
    "https://tgtluxe.com/products/longines-black-dial-quartz-men-watch-l37403587",
  L37813087:
    "https://tgtluxe.com/products/longines-sunray-green-dial-automatic-men-watch-l37813087",
  L48664926:
    "https://tgtluxe.com/products/longines-sunray-blue-dial-quartz-unisex-watch-l48664926",
  L49843087:
    "https://tgtluxe.com/products/longines-gilt-dial-automatic-unisex-watch-l49843087",
};

const SITEMAP_URLS = [
  `${SITE_ORIGIN}/en-in/sitemap/products.xml`,
  `${SITE_ORIGIN}/en-us/sitemap/products.xml`,
  `${SITE_ORIGIN}/sitemap/products.xml`,
];

/** @type {Map<string, string>|null} dashSku → preferred PDP URL */
let sitemapIndex = null;
let sitemapIndexPromise = null;

function resolveSkuTypo(raw) {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  if (!cleaned) return null;
  if (SKU_TYPO_MAP[cleaned]) {
    return { from: cleaned, to: SKU_TYPO_MAP[cleaned], method: "typo_map" };
  }
  return null;
}

function normalizeSku(raw) {
  const original = String(raw || "").trim();
  let compact = original.toUpperCase().replace(/[.\-_\s]/g, "");
  const typo = resolveSkuTypo(compact);
  let typoFrom = null;
  if (typo) {
    typoFrom = typo.from;
    compact = typo.to;
  }
  const dotted = toDottedSku(compact);
  const dashed = toDashedSku(dotted);
  const aliases = SKU_TYPO_ALIASES[compact] || [];
  return {
    compact,
    ims: typoFrom || compact,
    style: compact,
    original,
    dotted,
    dashed,
    typoFrom,
    nearMatchMethod: typo ? typo.method : null,
    styleCandidates: [
      ...new Set(
        [compact, dotted, dashed, typoFrom, ...aliases].filter(Boolean)
      ),
    ],
  };
}

/** L81154716 → L8.115.4.71.6 (standard modern Longines layout). */
function toDottedSku(compact) {
  const up = String(compact || "")
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  if (/^L\d\.\d{3}\.\d\.\d{2}\.\d$/i.test(String(compact || "").trim())) {
    return String(compact).trim().toUpperCase();
  }
  const m = up.match(/^L(\d)(\d{3})(\d)(\d{2})(\d)$/i);
  if (!m) return up;
  return `L${m[1]}.${m[2]}.${m[3]}.${m[4]}.${m[5]}`;
}

function toDashedSku(dottedOrCompact) {
  const dotted = toDottedSku(dottedOrCompact);
  return String(dotted)
    .toLowerCase()
    .replace(/\./g, "-");
}

function fromDottedOrDashed(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s.toUpperCase().replace(/[.\-_\s]/g, "");
}

function skuMatchKeys(raw) {
  const n = normalizeSku(raw);
  const aliases = SKU_TYPO_ALIASES[n.compact] || [];
  return [
    ...new Set(
      [
        n.compact,
        n.style,
        n.ims,
        n.dotted,
        n.dashed,
        n.typoFrom,
        n.original,
        ...aliases,
      ]
        .filter(Boolean)
        .map((s) => fromDottedOrDashed(s))
    ),
  ];
}

function absUrl(url, base = SITE_ORIGIN) {
  if (!url) return "";
  if (/^\/[a-z0-9]/i.test(url) && !url.startsWith("//")) {
    // Magento media relative path
    if (
      /watch-|longines-|product|hero|detailed/i.test(url) ||
      url.startsWith("/w/") ||
      url.startsWith("/l/")
    ) {
      return `${MEDIA_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`.replace(
        /\?.*$/,
        ""
      );
    }
  }
  try {
    return new URL(url, base).href.split("?")[0];
  } catch {
    return url;
  }
}

function mediaUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  const s = String(pathOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s.split("?")[0];
  const p = s.startsWith("/") ? s : `/${s}`;
  return `${MEDIA_ORIGIN}${p}`.split("?")[0];
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

function extractJsonLdProduct(html) {
  const blocks = String(html || "").match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!blocks) return null;
  for (const block of blocks) {
    const raw = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    try {
      const data = JSON.parse(raw);
      const candidates = Array.isArray(data) ? data : [data];
      for (const item of candidates) {
        if (item && (item["@type"] === "Product" || item.sku || item.mpn)) {
          return item;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function extractNextData(html) {
  const m = String(html || "").match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function fallbackEntry(fb, needle) {
  if (!fb || typeof fb !== "object") return null;
  const key = Object.keys(fb).find((k) => k.includes(needle));
  return key ? fb[key] : null;
}

function buildAttrOptionMaps(attrMeta) {
  /** @type {Record<string, Record<string, string>>} */
  const byCode = {};
  const items = attrMeta?.items || attrMeta?.attributeMetadata?.items || [];
  for (const attr of items) {
    const code = attr.attribute_code || attr.code;
    if (!code) continue;
    byCode[code] = {};
    for (const o of attr.attribute_options || attr.options || []) {
      const val = String(o.value ?? "");
      if (!val) continue;
      byCode[code][val] = String(o.label || "").trim();
    }
  }
  return byCode;
}

function resolveAttr(byCode, code, rawId) {
  if (rawId == null || rawId === "") return "";
  const ids = String(rawId)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const map = byCode[code] || {};
  const labels = ids.map((id) => map[id] || "").filter(Boolean);
  return labels.join(", ");
}

function pickDialColorLabel(label) {
  const raw = String(label || "").trim();
  if (!raw) return "";
  let mapped = normalizeDialColor(raw);
  if (mapped) return mapped;
  // "Opaline Ivory" / "Sunray blue" → try trailing color token(s)
  const parts = raw.split(/\s+/);
  for (let i = 0; i < parts.length; i++) {
    const slice = parts.slice(i).join(" ");
    mapped = normalizeDialColor(slice);
    if (mapped) return mapped;
  }
  return "";
}

function extractGenderFromMeta(metaDescription, html) {
  const hay = `${metaDescription || ""} ${stripTags(html).slice(0, 3000)}`.toLowerCase();
  if (/\bfor woman\b|\bfor women\b|\bwomen'?s\b|\bladies\b|\bwoman\b|\bfeminin/i.test(hay)) {
    return "Women";
  }
  if (/\bfor man\b|\bfor men\b|\bmen'?s\b|\bman\b|\bgent/i.test(hay)) {
    return "Men";
  }
  return "";
}

function extractImagesFromGallery(gallery, heroPath, skuCompact) {
  const urls = [];
  const seen = new Set();
  const compact = String(skuCompact || "")
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  // Dashed form often appears in Longines CDN filenames (l2-273-4-71-6)
  const dashed = compact
    ? compact.replace(/^L(\d)(\d{3})(\d)(\d{2})(\d)$/i, "L$1-$2-$3-$4-$5")
    : "";
  const push = (raw) => {
    if (!raw) return;
    let u = mediaUrl(raw);
    if (!u) return;
    if (/placeholder|default\/image/i.test(u)) return;
    if (!/longines\.com|api\.ecom\.longines/i.test(u)) return;
    // When filename embeds a different L-SKU, drop it (related / wrong PDP)
    if (compact) {
      const base = (u.split("/").pop() || "").toUpperCase().replace(/[.\-_\s]/g, "");
      const other = base.match(/L\d{8,}/g) || [];
      if (
        other.length &&
        !other.some(
          (t) => t === compact || t.includes(compact) || compact.includes(t)
        ) &&
        !base.includes(compact)
      ) {
        return;
      }
    }
    if (seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };

  push(heroPath);
  const list = Array.isArray(gallery) ? gallery : [];
  const ranked = [...list].sort((a, b) => {
    const pa = Number(a.position) || 999;
    const pb = Number(b.position) || 999;
    return pa - pb;
  });
  for (const g of ranked) {
    if (!g || g.disabled) continue;
    if (g.__typename === "ProductVideo") continue;
    push(g.url);
  }
  // Prefer URLs that mention this SKU when available
  if (compact) {
    const dashedNorm = dashed.toUpperCase().replace(/[.\-_\s]/g, "");
    const preferred = urls.filter((u) => {
      const up = u.toUpperCase().replace(/[.\-_\s]/g, "");
      return up.includes(compact) || (dashedNorm && up.includes(dashedNorm));
    });
    if (preferred.length) return preferred.slice(0, 16);
  }
  return urls.slice(0, 16);
}

function parseProductFromNext(html, skuInput, sourceUrl) {
  const sku = normalizeSku(skuInput);
  const nd = extractNextData(html);
  const fb = nd?.props?.pageProps?.fallback || {};
  const mainDoc = fallbackEntry(fb, "ProductPageDocument");
  const addDoc = fallbackEntry(fb, "ProductPageAdditionalDocument");
  const attrDoc = fallbackEntry(fb, "ProductAttributes");
  const main = mainDoc?.products?.items?.[0] || null;
  const add = addDoc?.products?.items?.[0] || null;
  const byCode = buildAttrOptionMaps(attrDoc?.attributeMetadata || attrDoc);

  if (!main && !add) return null;

  const officialSku =
    String(main?.sku || main?.product_sku || add?.sku || sku.dotted)
      .trim()
      .toUpperCase() || sku.dotted;

  const title =
    String(main?.name || add?.name || "").trim() ||
    `Longines ${officialSku}`;

  const shortHtml = main?.short_description?.html || "";
  const descHtml = main?.description?.html || "";
  const collectionHtml = stripTags(
    // Collection blurb sometimes only in SSR body; keep product paragraphs
    ""
  );
  let description = [stripTags(shortHtml), stripTags(descHtml), collectionHtml]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (description.length < 40) {
    description =
      stripTags(main?.meta_description || "") ||
      match1(html, /property=["']og:description["']\s+content=["']([^"']+)/i) ||
      description;
  }

  const caseMaterialLabel =
    resolveAttr(byCode, "case_material", add?.case_material ?? main?.case_material) ||
    "";
  const caseShapeLabel =
    resolveAttr(byCode, "case_shape", add?.case_shape ?? main?.case_shape) || "";
  const waterLabel =
    resolveAttr(
      byCode,
      "case_water_resistance",
      add?.case_water_resistance ?? main?.case_water_resistance
    ) || "";
  const dialLabel =
    resolveAttr(byCode, "dial_color", add?.dial_color ?? main?.dial_color) || "";
  const movementLabel =
    resolveAttr(byCode, "mvt_fct_type", add?.mvt_fct_type ?? main?.mvt_fct_type) ||
    "";
  const strapMaterialLabel =
    resolveAttr(
      byCode,
      "bracelet_material",
      add?.bracelet_material ?? main?.bracelet_material
    ) || "";
  const strapColorLabel =
    resolveAttr(
      byCode,
      "bracelet_color",
      add?.bracelet_color ?? main?.bracelet_color
    ) || "";
  const collectionLabel =
    resolveAttr(byCode, "watch_collection", add?.watch_collection) ||
    main?.preferred_category?.name ||
    "";
  const glassLabel = resolveAttr(byCode, "case_glass", add?.case_glass) || "";
  const buckleLabel =
    resolveAttr(byCode, "bracelet_buckle", add?.bracelet_buckle) || "";

  const caseSizeRaw =
    add?.case_dimension || main?.case_dimension || "";
  const warranty =
    main?.general_warranty || add?.general_warranty || "";

  const heroPath = main?.image?.path || "";
  const images = extractImagesFromGallery(
    add?.media_gallery,
    heroPath,
    sku.compact
  )

  const genderRaw = extractGenderFromMeta(
    main?.meta_description || "",
    html
  );

  const priceAmount =
    main?.base_price?.value != null ? Number(main.base_price.value) : null;
  const priceCurrency =
    main?.base_price?.currency ||
    (main?.base_price?.currency_symbol === "₹" ? "INR" : "") ||
    "INR";

  const rawAttributes = {
    officialSku,
    caseMaterial: caseMaterialLabel,
    caseShape: caseShapeLabel,
    caseSize: caseSizeRaw,
    caseThickness: add?.case_thickness || "",
    waterResistance: waterLabel,
    dialColor: dialLabel,
    movement: movementLabel,
    calibre: add?.mvt_fct_calibre_name || "",
    strapMaterial: strapMaterialLabel,
    strapColor: strapColorLabel,
    buckle: buckleLabel,
    crystal: glassLabel,
    collection: collectionLabel,
    warranty,
    gender: genderRaw,
  };

  return {
    title,
    description,
    officialSku: fromDottedOrDashed(officialSku) || sku.compact,
    dottedSku: toDottedSku(officialSku),
    images,
    genderRaw,
    caseMaterialLabel,
    caseShapeLabel,
    caseSizeRaw,
    waterLabel,
    dialLabel,
    movementLabel,
    strapMaterialLabel,
    strapColorLabel,
    warranty,
    collectionLabel,
    glassLabel,
    buckleLabel,
    calibre: add?.mvt_fct_calibre_name || "",
    priceAmount,
    priceCurrency,
    rawAttributes,
    urlKey: main?.url_key || "",
    sourceUrl:
      sourceUrl ||
      `${SITE_ORIGIN}/${LOCALE}/p/${main?.url_key || ""}`,
  };
}

function parseProductFromJsonLd(html, skuInput, sourceUrl) {
  const sku = normalizeSku(skuInput);
  const ld = extractJsonLdProduct(html);
  if (!ld) return null;
  const title = String(ld.name || "").trim() || `Longines ${sku.compact}`;
  const description = String(ld.description || "").replace(/\s+/g, " ").trim();
  const img =
    typeof ld.image === "string"
      ? ld.image
      : ld.image?.url ||
        (Array.isArray(ld.image) ? ld.image[0] : "");
  const images = img ? [absUrl(img)] : [];
  const ogImage = match1(
    html,
    /property=["']og:image["']\s+content=["']([^"']+)/i
  );
  if (ogImage) images.push(absUrl(ogImage));

  return {
    title,
    description,
    officialSku: fromDottedOrDashed(ld.sku) || sku.compact,
    dottedSku: toDottedSku(ld.sku || sku.compact),
    images: [...new Set(images)].slice(0, 12),
    genderRaw: extractGenderFromMeta(
      match1(html, /property=["']og:description["']\s+content=["']([^"']+)/i),
      html
    ),
    caseMaterialLabel: String(ld.material || ""),
    caseShapeLabel: "",
    caseSizeRaw: String(ld.width || ""),
    waterLabel: /water-resistant to\s*([\d.]+\s*bar)/i.test(description)
      ? `Water-resistant to ${description.match(/water-resistant to\s*([\d.]+\s*bar)/i)[1]}`
      : "",
    dialLabel: String(ld.color || ""),
    movementLabel: /quartz/i.test(description)
      ? "Quartz"
      : /automatic/i.test(description)
        ? "Automatic"
        : "",
    strapMaterialLabel: /stainless steel bracelet/i.test(description)
      ? "Stainless steel"
      : /leather/i.test(description)
        ? "Leather"
        : "",
    strapColorLabel: "",
    warranty: "",
    collectionLabel: "",
    glassLabel: "",
    buckleLabel: "",
    calibre: "",
    priceAmount:
      ld?.offers?.price != null ? Number(ld.offers.price) : null,
    priceCurrency: String(ld?.offers?.priceCurrency || "INR"),
    rawAttributes: {},
    urlKey: "",
    sourceUrl:
      sourceUrl ||
      match1(html, /property=["']og:url["']\s+content=["']([^"']+)/i) ||
      "",
  };
}

function mapParsed(parsed, skuInput, sourceUrl) {
  const sku = normalizeSku(skuInput);
  const dialColor =
    pickDialColorLabel(parsed.dialLabel) ||
    normalizeDialColor(parsed.dialLabel) ||
    "";

  const strapMaterial = normalizeStrapMaterial(parsed.strapMaterialLabel) || "";

  const { product: normalized, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact,
      officialSku: parsed.officialSku || sku.compact,
      title: parsed.title,
      description: parsed.description,
      caseMaterial: normalizeCaseMaterial(parsed.caseMaterialLabel) || "",
      caseShape: normalizeCaseShape(parsed.caseShapeLabel) || "",
      caseSize: normalizeCaseSize(parsed.caseSizeRaw || ""),
      dialColor,
      waterResistance:
        normalizeWaterResistance(parsed.waterLabel) || "",
      movement: normalizeMovement(parsed.movementLabel) || "",
      strapMaterial: strapMaterial || "",
      strapColor: normalizeStrapColor(parsed.strapColorLabel || "") || "",
      gender: normalizeGender(parsed.genderRaw) || parsed.genderRaw || "",
      warrantyPeriod: parsed.warranty || "",
      category: "Luxury",
      price: null,
      oldPrice: null,
      priceSource:
        parsed.priceAmount != null && Number.isFinite(parsed.priceAmount)
          ? {
              amount: parsed.priceAmount,
              mrp: null,
              currency: parsed.priceCurrency || "INR",
              label:
                parsed.priceCurrency === "INR"
                  ? `₹${Number(parsed.priceAmount).toLocaleString("en-IN")}`
                  : `${parsed.priceCurrency} ${parsed.priceAmount}`,
            }
          : null,
      images: parsed.images || [],
      sourceUrl: sourceUrl || parsed.sourceUrl,
      source: SOURCE_OFFICIAL,
      scrapedAt: new Date().toISOString(),
      rawAttributes: parsed.rawAttributes || {},
      extras: {
        collection: parsed.collectionLabel || "",
        crystal: parsed.glassLabel || "",
        buckle: parsed.buckleLabel || "",
        calibre: parsed.calibre || "",
        dottedSku: parsed.dottedSku || sku.dotted,
        urlKey: parsed.urlKey || "",
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
  if (fieldUnmapped && Object.keys(fieldUnmapped).length) {
    normalized.warnings.push("unmapped_constrained_fields");
  }

  Object.assign(
    normalized,
    buildSeo(normalized, { metaDescription: parsed.description })
  );
  return normalized;
}

function mapProduct(html, skuInput, sourceUrl) {
  const fromNext = parseProductFromNext(html, skuInput, sourceUrl);
  if (fromNext) return mapParsed(fromNext, skuInput, sourceUrl);
  const fromLd = parseProductFromJsonLd(html, skuInput, sourceUrl);
  if (fromLd) return mapParsed(fromLd, skuInput, sourceUrl);
  throw Object.assign(new Error("not_found: no Longines PDP payload"), {
    code: "not_found",
    sourceUrl,
  });
}

async function loadSitemapIndex(options = {}) {
  if (sitemapIndex && !options.forceReload) return sitemapIndex;
  if (sitemapIndexPromise && !options.forceReload) return sitemapIndexPromise;

  sitemapIndexPromise = (async () => {
    /** @type {Map<string, string>} */
    const map = new Map();
    for (const sitemapUrl of SITEMAP_URLS) {
      try {
        const res = await fetchText(sitemapUrl, {
          timeoutMs: options.timeoutMs || 60000,
          retries: 1,
        });
        if (!res.ok || !res.text) continue;
        const locs = [
          ...res.text.matchAll(/<loc>([^<]+)<\/loc>/gi),
        ].map((m) => m[1].trim());
        for (const loc of locs) {
          if (!/\/p\//i.test(loc)) continue;
          const m = loc.match(/-(l\d(?:-\d+){3,})\s*$/i);
          if (!m) continue;
          const dash = m[1].toLowerCase();
          if (!map.has(dash)) map.set(dash, loc);
          // Prefer en-in when we see it later in priority list — already first
        }
      } catch {
        /* try next sitemap */
      }
    }
    sitemapIndex = map;
    return map;
  })();

  return sitemapIndexPromise;
}

async function resolveProductUrl(sku, options = {}) {
  if (options.officialUrl) return options.officialUrl;
  const n = normalizeSku(sku);
  if (options.refUrls && options.refUrls[n.compact]) {
    return options.refUrls[n.compact];
  }

  const index = await loadSitemapIndex(options);
  const hit = index.get(n.dashed);
  if (hit) {
    // Prefer en-in host path when locale-less URL given
    if (!/\/en-[a-z]{2}\//i.test(hit)) {
      return hit.replace(
        `${SITE_ORIGIN}/p/`,
        `${SITE_ORIGIN}/${LOCALE}/p/`
      );
    }
    return hit;
  }

  // Last resort: cannot invent collection slug; return null so caller 404s
  return null;
}

function pdpUrlForSku(sku) {
  // Sync helper — only works after sitemap warmed or when dotted path known
  const n = normalizeSku(sku);
  if (sitemapIndex && sitemapIndex.has(n.dashed)) {
    return sitemapIndex.get(n.dashed);
  }
  return `${SITE_ORIGIN}/${LOCALE}/p/watch-longines-${n.dashed}`;
}

function fixturePathForSku(fixtureDir, sku) {
  if (!fixtureDir) return null;
  const { compact, dotted, dashed } = normalizeSku(sku);
  for (const name of [
    `longines-${compact}.html`,
    `${compact}.html`,
    `longines-${dotted}.html`,
    `${dashed}.html`,
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
    throw Object.assign(
      new Error(
        `not_found: no Longines PDP URL for ${normalizeSku(sku).compact} (sitemap miss)`
      ),
      { code: "not_found", sourceUrl: null }
    );
  }

  let res;
  try {
    res = await fetchText(url, { timeoutMs: options.timeoutMs || 45000 });
  } catch (err) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl || url);
    throw Object.assign(
      new Error(`fetch_failed: ${err.message} for ${url}`),
      { code: "fetch_failed", sourceUrl: url }
    );
  }

  if (!res.ok || !res.text || res.text.length < 2000) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl || url);
    throw Object.assign(
      new Error(`fetch_failed: HTTP ${res.status || "?"} for ${url}`),
      { code: "fetch_failed", sourceUrl: url }
    );
  }

  if (
    !/__NEXT_DATA__/i.test(res.text) &&
    !/application\/ld\+json/i.test(res.text)
  ) {
    throw Object.assign(
      new Error(`not_found: no Longines PDP content at ${url}`),
      { code: "not_found", sourceUrl: res.url || url }
    );
  }

  return {
    html: res.text,
    sourceUrl: res.url || url,
    fromFixture: false,
  };
}

function applyTypoMeta(product, normalized) {
  if (!product || product.status !== "ok") return product;
  if (normalized.typoFrom) {
    product.typoFrom = normalized.typoFrom;
    product.nearMatch = true;
    product.nearMatchMethod = normalized.nearMatchMethod || "typo_map";
    // Dual-key: IMS typo form + corrected compact (both exist in IMS)
    product.imsSkuAliases = [
      ...new Set(
        [
          normalized.typoFrom,
          normalized.compact,
          ...(Array.isArray(product.imsSkuAliases)
            ? product.imsSkuAliases
            : []),
          ...(SKU_TYPO_ALIASES[normalized.compact] || []),
        ].filter(Boolean)
      ),
    ];
    product.imsSku = normalized.typoFrom;
  }
  return product;
}

function shouldTryRetailerFallback(result, options = {}) {
  if (options.skipRetailerFallback) return false;
  if (
    options.collectiveOnly ||
    options.tataCliqOnly ||
    options.tgtLuxeOnly
  ) {
    return true;
  }
  if (
    options.collectiveUrl ||
    options.tataCliqUrl ||
    options.tgtLuxeUrl
  ) {
    return true;
  }
  if (!result || result.status === "ok") return false;
  const reason = String(result.reason || "");
  if (/HTTP\s*404/i.test(reason)) return true;
  if (/sitemap miss/i.test(reason)) return true;
  if (OFFICIAL_FAIL_CODES.has(result.status)) return true;
  return false;
}

async function enrichSkuFromCollective(sku, options = {}) {
  const normalized = normalizeSku(sku);
  try {
    const product = await enrichFromCollective(normalized.compact, {
      collectiveUrl:
        options.collectiveUrl ||
        COLLECTIVE_REF_URLS[normalized.compact] ||
        null,
      resolveBySku: options.resolveCollectiveBySku !== false,
      brandHint: BRAND,
      dottedSku: normalized.dotted,
      timeoutMs: options.timeoutMs,
      delayMs: options.delayMs,
    });
    if (product.status !== "ok") return product;
    // Keep IMS/request compact as merge key when it was a typo
    if (normalized.typoFrom) {
      product.sku = normalized.typoFrom;
      product.officialSku = product.officialSku || normalized.compact;
    } else {
      product.sku = normalized.compact;
    }
    Object.assign(product, buildSeo(product, { metaDescription: "" }));
    product.source = SOURCE_COLLECTIVE;
    product.warnings = product.warnings || [];
    if (!product.warnings.includes("india_retailer_collective_fallback")) {
      product.warnings.push("india_retailer_collective_fallback");
    }
    return applyTypoMeta(product, normalized);
  } catch (err) {
    return {
      status: err.code || "error",
      sku: normalized.typoFrom || normalized.compact,
      brand: BRAND,
      source: SOURCE_COLLECTIVE,
      reason: err.message,
      sourceUrl: err.sourceUrl || null,
      scrapedAt: new Date().toISOString(),
    };
  }
}

async function enrichSkuFromTataCliq(sku, options = {}) {
  const normalized = normalizeSku(sku);
  try {
    const product = await enrichFromTataCliq(normalized.compact, {
      tataCliqUrl: options.tataCliqUrl || null,
      resolveBySku: options.resolveTataCliqBySku !== false,
      brandHint: BRAND,
      dottedSku: normalized.dotted,
      timeoutMs: options.timeoutMs,
      delayMs: options.delayMs,
    });
    if (product.status !== "ok") return product;
    if (normalized.typoFrom) {
      product.sku = normalized.typoFrom;
      product.officialSku = product.officialSku || normalized.compact;
    } else {
      product.sku = normalized.compact;
    }
    Object.assign(product, buildSeo(product, { metaDescription: "" }));
    product.source = SOURCE_TATA;
    product.warnings = product.warnings || [];
    if (!product.warnings.includes("india_only_tatacliq_fallback")) {
      product.warnings.push("india_only_tatacliq_fallback");
    }
    return applyTypoMeta(product, normalized);
  } catch (err) {
    return {
      status: err.code || "error",
      sku: normalized.typoFrom || normalized.compact,
      brand: BRAND,
      source: SOURCE_TATA,
      reason: err.message,
      sourceUrl: err.sourceUrl || null,
      scrapedAt: new Date().toISOString(),
    };
  }
}

async function enrichSkuFromTgtLuxe(sku, options = {}) {
  const normalized = normalizeSku(sku);
  try {
    const product = await enrichFromTgtLuxe(normalized.compact, {
      tgtLuxeUrl:
        options.tgtLuxeUrl ||
        TGT_LUXE_REF_URLS[normalized.compact] ||
        null,
      resolveBySku: options.resolveTgtLuxeBySku !== false,
      brandHint: BRAND,
      dottedSku: normalized.dotted,
      timeoutMs: options.timeoutMs,
      delayMs: options.delayMs,
    });
    if (product.status !== "ok") return product;
    if (normalized.typoFrom) {
      product.sku = normalized.typoFrom;
      product.officialSku = product.officialSku || normalized.compact;
    } else {
      product.sku = normalized.compact;
    }
    Object.assign(product, buildSeo(product, { metaDescription: "" }));
    product.source = SOURCE_TGT;
    product.warnings = product.warnings || [];
    if (!product.warnings.includes("india_retailer_tgtluxe_fallback")) {
      product.warnings.push("india_retailer_tgtluxe_fallback");
    }
    return applyTypoMeta(product, normalized);
  } catch (err) {
    return {
      status: err.code || "error",
      sku: normalized.typoFrom || normalized.compact,
      brand: BRAND,
      source: SOURCE_TGT,
      reason: err.message,
      sourceUrl: err.sourceUrl || null,
      scrapedAt: new Date().toISOString(),
    };
  }
}

async function enrichSkuOfficial(sku, options = {}) {
  const normalized = normalizeSku(sku);
  try {
    const scrapeSku = normalized.compact;
    const { html, sourceUrl, fromFixture } = await fetchProductHtml(
      scrapeSku,
      options
    );
    const hay = html.toUpperCase().replace(/[.\-_\s]/g, "");
    if (
      !hay.includes(normalized.compact) &&
      !hay.includes(normalized.dotted.replace(/\./g, ""))
    ) {
      return {
        status: "not_found",
        sku: normalized.typoFrom || normalized.compact,
        brand: BRAND,
        source: SOURCE_OFFICIAL,
        reason: "SKU not present on Longines PDP",
        sourceUrl,
        scrapedAt: new Date().toISOString(),
      };
    }
    const mapped = mapProduct(html, scrapeSku, sourceUrl);
    if (normalized.typoFrom) {
      mapped.sku = normalized.typoFrom;
      mapped.officialSku = mapped.officialSku || normalized.compact;
    }
    mapped.fetchMode = fromFixture ? "fixture" : "live";
    mapped.source = SOURCE_OFFICIAL;
    applyTypoMeta(mapped, normalized);
    if (options.delayMs) await sleep(options.delayMs);
    return mapped;
  } catch (err) {
    return {
      status: err.code || "error",
      sku: normalized.typoFrom || normalized.compact,
      brand: BRAND,
      source: SOURCE_OFFICIAL,
      reason: err.message,
      sourceUrl: err.sourceUrl || null,
      scrapedAt: new Date().toISOString(),
    };
  }
}

async function enrichSku(sku, options = {}) {
  const normalized = normalizeSku(sku);

  if (options.collectiveOnly) {
    return enrichSkuFromCollective(sku, options);
  }
  if (options.tataCliqOnly) {
    return enrichSkuFromTataCliq(sku, options);
  }
  if (options.tgtLuxeOnly) {
    return enrichSkuFromTgtLuxe(sku, options);
  }

  const officialResult = await enrichSkuOfficial(sku, options);
  if (officialResult.status === "ok") return officialResult;

  if (!shouldTryRetailerFallback(officialResult, options)) {
    return officialResult;
  }

  const attempts = {};

  if (!options.skipCollective) {
    console.warn(
      `  official miss (${officialResult.status}: ${officialResult.reason}); trying The Collective…`
    );
    const coll = await enrichSkuFromCollective(sku, options);
    attempts.thecollective = {
      status: coll.status,
      reason: coll.reason || null,
      sourceUrl: coll.sourceUrl || null,
    };
    if (coll.status === "ok") {
      coll.officialFallbackReason = officialResult.reason;
      return coll;
    }
  }

  if (!options.skipTataCliq) {
    console.warn(`  Collective miss; trying Tata Cliq Luxury…`);
    const tata = await enrichSkuFromTataCliq(sku, options);
    attempts.tatacliq = {
      status: tata.status,
      reason: tata.reason || null,
      sourceUrl: tata.sourceUrl || null,
    };
    if (tata.status === "ok") {
      tata.officialFallbackReason = officialResult.reason;
      return tata;
    }
  }

  if (!options.skipTgtLuxe) {
    console.warn(`  Tata Cliq miss; trying TGT Luxe…`);
    const tgt = await enrichSkuFromTgtLuxe(sku, options);
    attempts.tgtluxe = {
      status: tgt.status,
      reason: tgt.reason || null,
      sourceUrl: tgt.sourceUrl || null,
    };
    if (tgt.status === "ok") {
      tgt.officialFallbackReason = officialResult.reason;
      return tgt;
    }
  }

  if (!options.skipEthos) {
    console.warn(`  TGT Luxe miss; trying Ethos…`);
    try {
      const { enrichFromEthos } = require("../lib/ethos");
      const {
        ETHOS_REF_URLS,
      } = require("../lib/retailerFallback");
      const ethos = await enrichFromEthos(normalized.compact, {
        brandHint: BRAND,
        ethosUrl: options.ethosUrl || ETHOS_REF_URLS[normalized.compact] || null,
        fixtureDir: options.fixtureDir || path.join(__dirname, "..", "fixtures"),
        timeoutMs: options.timeoutMs,
      });
      attempts.ethos = {
        status: ethos.status,
        reason: ethos.reason || null,
        sourceUrl: ethos.sourceUrl || null,
      };
      if (ethos.status === "ok") {
        ethos.officialFallbackReason = officialResult.reason;
        if (!ethos.warnings) ethos.warnings = [];
        if (!ethos.warnings.includes("india_retailer_ethos_fallback")) {
          ethos.warnings.push("india_retailer_ethos_fallback");
        }
        return ethos;
      }
    } catch (err) {
      attempts.ethos = {
        status: err.code || "error",
        reason: err.message,
        sourceUrl: null,
      };
    }
  }

  return {
    ...officialResult,
    retailerAttempts: attempts,
  };
}

module.exports = {
  BRAND,
  SITE_ORIGIN,
  MEDIA_ORIGIN,
  SOURCE_OFFICIAL,
  SOURCE_COLLECTIVE,
  SOURCE_TATA,
  SOURCE_TGT,
  LOCALE,
  SKU_TYPO_MAP,
  COLLECTIVE_REF_URLS,
  TGT_LUXE_REF_URLS,
  normalizeSku,
  resolveSkuTypo,
  skuMatchKeys,
  toDottedSku,
  toDashedSku,
  resolveProductUrl,
  pdpUrlForSku,
  loadSitemapIndex,
  extractJsonLdProduct,
  extractNextData,
  mapProduct,
  fetchProductHtml,
  enrichSku,
  enrichSkuFromCollective,
  enrichSkuFromTataCliq,
  enrichSkuFromTgtLuxe,
  shouldTryRetailerFallback,
};
