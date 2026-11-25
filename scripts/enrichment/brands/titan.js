"use strict";

/**
 * Titan (titan.co.in) SFCC / Demandware PDP enrichment.
 *
 * SKU mapping (IMS ↔ site):
 *   IMS:        NU95198WM01
 *   Site pid:   nu95198wm01   (data-pid / JSON-LD sku|mpn)
 *   Style code: 95198WM01     (URL slug + Catalog image filenames)
 *
 * Rule: optional leading "NU"/"nu" is the IMS prefix; strip/add both ways.
 * Style code is alphanumeric (digits + letters), typically NNNNNN + letter suffix.
 *
 * Cloudflare often blocks Node/curl HTML; use --html fixtures/<SKU>.html.
 * Static catalog images under on/demandware.static are usually reachable.
 */

const path = require("path");
const fs = require("fs");
const { fetchText, sleep } = require("../lib/http");
const { buildSeo } = require("../lib/seo");
const { normalizeProductFields } = require("../lib/normalize");

const BRAND = "Titan";
const SITE_ORIGIN = "https://www.titan.co.in";
const SOURCE_OFFICIAL = "titan";
const CATALOG_IMAGE_BASE =
  `${SITE_ORIGIN}/on/demandware.static/-/Sites-titan-master-catalog/default/images/Titan/Catalog`;

/**
 * Known IMS / spreadsheet typos → correct titan.co.in style codes.
 * Scrape + catalog use the corrected style; Scan Titan can still match the typo form.
 * Prefer correcting IMS SKU to the mapped value when staff edit the listing.
 * Expandable — preferred over automatic digit-insert when both would match.
 */
const SKU_TYPO_MAP = {
  "9210QM01": "90210QM01",
  // IMS truncated "90" — Light Leathers IV multifunction green dial
  "134QL01": "90134QL01",
};

/**
 * Near-match limits (Cloudflare / discovery).
 * - PDP HTML + /search are often CF-blocked for Node/curl → use fixtures or catalog HEAD.
 * - Static Catalog images under on/demandware.static usually work without the bot wall.
 * - Auto-accept only a single high-confidence hit; multiple → not_found candidates.
 * - TWEG* codes are Timex India model numbers (not titan.co.in) — expect no Titan hit.
 */
const NEAR_MATCH_NOTES = {
  cloudflare:
    "Node/curl HTML fetch is often Cloudflare-blocked; use --html fixtures/ or --prefer-fixture. Catalog image HEAD still validates style codes.",
  tweg:
    "TWEG* SKUs are Timex India model numbers (e.g. shop.timexindia.com), not Titan styles on titan.co.in.",
};

/** Reverse: correct style → typo aliases (for batch index dual-keying). */
const SKU_TYPO_ALIASES = Object.create(null);
for (const [typo, correct] of Object.entries(SKU_TYPO_MAP)) {
  const c = String(correct).toUpperCase();
  if (!SKU_TYPO_ALIASES[c]) SKU_TYPO_ALIASES[c] = [];
  SKU_TYPO_ALIASES[c].push(String(typo).toUpperCase());
}

/**
 * @param {string} raw
 * @returns {{ from: string, to: string } | null}
 */
function resolveSkuTypo(raw) {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  if (!cleaned) return null;
  if (SKU_TYPO_MAP[cleaned]) {
    return { from: cleaned, to: SKU_TYPO_MAP[cleaned] };
  }
  const bare = cleaned.replace(/^NU/i, "");
  if (bare !== cleaned && SKU_TYPO_MAP[bare]) {
    return { from: bare, to: SKU_TYPO_MAP[bare] };
  }
  return null;
}

/** Map SFCC product-specs labels → Product schema fields */
const ATTR_MAP = {
  gender: "gender",
  "case material": "caseMaterial",
  "case shape": "caseShape",
  "case width": "caseSize",
  "dial color": "dialColor",
  "water resistance": "waterResistance",
  movement: "movement",
  "strap material": "strapMaterial",
  "strap color": "strapColor",
  "warranty period": "warrantyPeriod",
  function: "category",
  name: "title",
};

/**
 * Normalize Titan SKUs across IMS / SFCC pid / style-code forms.
 * Applies SKU_TYPO_MAP so IMS typos scrape the correct PDP.
 * @returns {{
 *   ims: string,          // NU95198WM01 (or NT… / TWEG… as stored in IMS)
 *   compact: string,      // matching key: style without NU (95198WM01)
 *   style: string,        // 95198WM01 (catalog / URL slug body) — corrected
 *   sitePid: string,      // nu95198wm01
 *   styleLower: string,   // 95198wm01
 *   original: string,
 *   typoFrom: string|null, // IMS typo if corrected (e.g. 9210QM01)
 *   styleCandidates: string[]  // catalog / search variants
 * }}
 */
function normalizeSku(raw) {
  const original = String(raw || "").trim();
  let cleaned = original.replace(/\s+/g, "").replace(/[.\-_]/g, "");

  // Drop accidental product suffixes from GTM (95198wm01_p)
  cleaned = cleaned.replace(/_p$/i, "");

  const typo = resolveSkuTypo(cleaned);
  let typoFrom = null;
  if (typo) {
    typoFrom = typo.from;
    // Preserve NU prefix if caller passed NU9210QM01
    cleaned = /^nu/i.test(cleaned) ? `NU${typo.to}` : typo.to;
  }

  // Edge / wearables letter prefixes — keep IMS form; do not force NU…
  if (/^(NT|TWEG)/i.test(cleaned)) {
    const ims = cleaned.toUpperCase();
    const style = ims;
    const styleLower = style.toLowerCase();
    const strippedNt = style.replace(/^NT/i, "");
    const styleCandidates = [...new Set([style, strippedNt].filter(Boolean))];
    return {
      ims,
      compact: ims,
      style,
      sitePid: styleLower,
      styleLower,
      original,
      typoFrom,
      styleCandidates,
    };
  }

  let body = cleaned;
  if (/^nu/i.test(body)) body = body.slice(2);

  const style = body.toUpperCase();
  const styleLower = style.toLowerCase();
  // Canonical NU… IMS form for digit-led Titan watch styles
  const ims = style ? `NU${style}` : "";
  const sitePid = style ? `nu${styleLower}` : "";
  // Matching key strips NU so IMS NU95198WM01 ↔ site 95198WM01 ↔ bare 95198WM01
  const compact = style || ims;

  return {
    ims,
    compact,
    style,
    sitePid,
    styleLower,
    original,
    typoFrom,
    styleCandidates: style ? [style] : [],
  };
}

/** All SKU keys that should resolve to the same batch/enrichment record. */
function skuMatchKeys(raw) {
  const n = normalizeSku(raw);
  const keys = new Set(
    [n.compact, n.style, n.ims, n.sitePid, n.typoFrom, n.original]
      .filter(Boolean)
      .map((s) => String(s).toUpperCase().replace(/[.\-_\s]/g, ""))
  );
  const addAlias = (a) => {
    const A = String(a || "")
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
    if (!A) return;
    keys.add(A);
    // IMS often stores digit-led typos with NU… (e.g. NU134QL01 ↔ 134QL01)
    if (!/^N[UT]/i.test(A)) keys.add(`NU${A}`);
  };
  const aliases = SKU_TYPO_ALIASES[n.style] || [];
  for (const a of aliases) addAlias(a);
  if (n.typoFrom) addAlias(n.typoFrom);
  return [...keys].filter(Boolean);
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

/**
 * Specs live in SFCC list items:
 *   <li class="product-specs-attribute">
 *     <div class="product-specs-name">Gender</div>
 *     <div class="product-specs-value">Women</div>
 *   </li>
 */
function extractAttributes(html) {
  const attrs = {};
  const re =
    /<li[^>]*class="[^"]*product-specs-attribute[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*product-specs-name[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div[^>]*class="[^"]*product-specs-value[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = re.exec(html))) {
    const label = stripTags(m[1]).toLowerCase();
    const value = stripTags(m[2]);
    if (label && value) attrs[label] = value;
  }
  return attrs;
}

function extractJsonLdProduct(html) {
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1]);
      const candidates = [];
      if (Array.isArray(data)) candidates.push(...data);
      else if (data && Array.isArray(data["@graph"])) {
        candidates.push(...data["@graph"]);
      } else if (data) candidates.push(data);

      for (const node of candidates) {
        if (!node || typeof node !== "object") continue;
        const type = node["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((t) => String(t).toLowerCase() === "product")) {
          return node;
        }
      }
    } catch {
      // ignore malformed blocks
    }
  }
  return null;
}

function extractTitle(html, attrs, ld) {
  return (
    stripTags(
      match1(html, /<h1[^>]*class="[^"]*product-name-heading[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
    ) ||
    (attrs && attrs.name) ||
    (ld && ld.name) ||
    stripTags(match1(html, /property="og:title"\s+content="([^"]+)"/i)) ||
    ""
  );
}

function extractOfficialSku(html, ld) {
  const fromPid = match1(html, /data-pid=["']([^"']+)["']/i);
  if (fromPid) return fromPid;
  if (ld && (ld.sku || ld.mpn)) return String(ld.sku || ld.mpn);
  return "";
}

function extractPriceInr(html, ld) {
  const salesHidden = match1(html, /class="salesPriceValue"[^>]*value="([\d.]+)"/i);
  const listHidden = match1(html, /class="listPriceValue"[^>]*value="([\d.]+)"/i);
  const salesContent = match1(
    html,
    /class="[^"]*price-text[^"]*"[^>]*content="([\d,]+)"/i
  );
  const listContent = match1(
    html,
    /class="strike-through\s+list"[\s\S]*?content="([\d,]+)"/i
  );

  let amount =
    salesHidden ||
    (salesContent ? salesContent.replace(/,/g, "") : "") ||
    (ld && ld.offers && ld.offers.price != null ? String(ld.offers.price) : "");
  let mrp =
    listHidden ||
    (listContent ? listContent.replace(/,/g, "") : "") ||
    "";

  amount = amount ? Number(amount) : null;
  mrp = mrp ? Number(mrp) : null;

  if (amount == null && mrp == null) return null;

  const currency =
    (ld && ld.offers && ld.offers.priceCurrency) ||
    match1(html, /itemprop="priceCurrency"\s+content="([^"]+)"/i) ||
    "INR";

  const label =
    amount != null
      ? `₹ ${amount.toLocaleString("en-IN")}${
          mrp != null ? ` (MRP ₹ ${mrp.toLocaleString("en-IN")})` : ""
        }`
      : mrp != null
        ? `MRP ₹ ${mrp.toLocaleString("en-IN")}`
        : "";

  return {
    amount,
    mrp,
    currency,
    label,
  };
}

/**
 * Prefer stable catalog paths without SFCC /dw/<hash>/ segments.
 * Filenames: 95198WM01_1.jpg … (style code, not NU prefix).
 */
function stabilizeCatalogUrl(url, style) {
  const raw = String(url || "").split("?")[0].replace(/\\+/g, "");
  if (!raw) return "";
  const fileMatch = raw.match(
    new RegExp(
      `(${style}[_-]\\d+\\.(?:jpe?g|png|webp|gif))`,
      "i"
    )
  );
  if (fileMatch) {
    return `${CATALOG_IMAGE_BASE}/${fileMatch[1]}`;
  }
  // Strip /dw/image/v2/.../ prefix and dw* hash folders
  let u = raw
    .replace(/https?:\/\/[^/]+\/dw\/image\/v2\/[^/]+\//i, `${SITE_ORIGIN}/`)
    .replace(/\/default\/dw[a-f0-9]+\//i, "/default/");
  return absUrl(u.split("?")[0]);
}

function extractImages(html, style, ld) {
  const styleKey = String(style || "").toUpperCase();
  if (!styleKey) return [];

  const urls = [];
  const absRe =
    /https?:\/\/[^"'\\\s>]+\.(?:jpe?g|png|webp)/gi;
  let m;
  while ((m = absRe.exec(html))) {
    if (new RegExp(`${styleKey}_\\d+`, "i").test(m[0])) urls.push(m[0]);
  }

  const relRe = new RegExp(
    `(?:src|data-src|content|hi-res-url)=["']([^"']*${styleKey}[_-]\\d+[^"']*)["']`,
    "gi"
  );
  while ((m = relRe.exec(html))) urls.push(absUrl(m[1]));

  if (ld && Array.isArray(ld.image)) {
    for (const img of ld.image) urls.push(String(img));
  } else if (ld && typeof ld.image === "string") {
    urls.push(ld.image);
  }

  const og = match1(html, /property="og:image"\s+content="([^"]+)"/i);
  if (og) urls.push(og);

  const byFile = new Map();
  for (const raw of urls) {
    const url = stabilizeCatalogUrl(raw, styleKey);
    if (!url) continue;
    if (!new RegExp(`${styleKey}_\\d+`, "i").test(url)) continue;
    const file = url.split("/").pop().toUpperCase();
    if (!byFile.has(file)) byFile.set(file, url);
  }

  return [...byFile.entries()]
    .sort((a, b) => {
      const num = (name) => {
        const n = name.match(/_(\d+)\./);
        return n ? Number(n[1]) : 99;
      };
      return num(a[0]) - num(b[0]) || a[0].localeCompare(b[0]);
    })
    .map(([, url]) => url);
}

/**
 * When HTML has few/no images (trimmed fixture), synthesize known Catalog URLs
 * by probing _1…_N pattern is left to download step; here just build candidates
 * from style if HTML yielded nothing.
 */
function synthesizeCatalogImages(style, count = 7) {
  const styleKey = String(style || "").toUpperCase();
  if (!styleKey) return [];
  const out = [];
  for (let i = 1; i <= count; i++) {
    out.push(`${CATALOG_IMAGE_BASE}/${styleKey}_${i}.jpg`);
  }
  return out;
}

function extractMetaDescription(html, ld) {
  return (
    match1(html, /property="og:description"\s+content="([^"]+)"/i) ||
    match1(html, /name="description"\s+content="([^"]+)"/i) ||
    (ld && ld.description) ||
    ""
  );
}

/**
 * Prefer the correct style code for batch output (after typo map).
 * Bare digit-led / NU… / NT… / TWEG… spelling rules still apply to the
 * *corrected* style so Scan Titan + import use 90210QM01 not the IMS typo.
 */
function imsSkuForOutput(skuInput, normalized) {
  // After typo correction, prefer the corrected bare style for digit-led SKUs
  // (New Listings often store without NU). Keep NT/TWEG as-is.
  if (normalized.typoFrom && normalized.style) {
    const orig = String(skuInput || "")
      .trim()
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
    if (/^NU/i.test(orig)) return normalized.ims;
    return normalized.style;
  }
  const orig = String(skuInput || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  if (!orig) return normalized.ims;
  if (/^(NT|TWEG)/i.test(orig)) return orig;
  if (/^NU/i.test(orig)) return normalized.ims;
  // Bare digit-led style as stored in New Listings — keep without forcing NU
  if (/^\d/.test(orig)) return orig;
  return normalized.ims || orig;
}

/**
 * @param {object} [nearMeta]
 * @param {boolean} [nearMeta.nearMatch]
 * @param {string} [nearMeta.matchedStyle]
 * @param {string} [nearMeta.imsSku] original IMS / request SKU
 * @param {string} [nearMeta.confidence]
 * @param {string} [nearMeta.nearMatchMethod]
 * @param {string|null} [nearMeta.typoFrom]
 */
function mapProduct(html, skuInput, sourceUrl, nearMeta = null) {
  const sku = normalizeSku(skuInput);
  const ld = extractJsonLdProduct(html);
  const attrs = extractAttributes(html);
  const title = extractTitle(html, attrs, ld);
  const officialSku = extractOfficialSku(html, ld) || sku.sitePid;
  const price = extractPriceInr(html, ld);
  let images = extractImages(html, sku.style, ld);
  if (!images.length) {
    for (const styleCand of sku.styleCandidates || [sku.style]) {
      images = synthesizeCatalogImages(styleCand, 7);
      if (images.length) break;
    }
  }
  const metaDescription = extractMetaDescription(html, ld);

  const mapped = {};
  for (const [label, field] of Object.entries(ATTR_MAP)) {
    if (attrs[label]) mapped[field] = attrs[label];
  }
  // Constrained enums (Metal→Stainless Steel, Women→Female, 24 Months→2 years, …)
  // are applied only via shared lib/normalize.js — do not duplicate here.

  const description =
    (attrs["warranty detail"]
      ? `${title || mapped.title || ""}. ${attrs["warranty detail"]}`.trim()
      : "") ||
    (ld && ld.description) ||
    metaDescription ||
    "";

  const imsOriginal =
    (nearMeta && nearMeta.imsSku) ||
    String(skuInput || "").trim() ||
    null;
  const typoFrom =
    (nearMeta && nearMeta.typoFrom) || sku.typoFrom || null;
  const isNear =
    Boolean(nearMeta && nearMeta.nearMatch) || Boolean(typoFrom);

  const { product, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields(
      {
        status: "ok",
        brand: BRAND,
        sku: imsSkuForOutput(skuInput, sku),
        officialSku,
        styleCode: sku.style,
        sitePid: sku.sitePid,
        typoFrom,
        nearMatch: isNear || undefined,
        matchedStyle: isNear ? sku.style : undefined,
        imsSku: isNear ? imsOriginal : undefined,
        confidence: isNear
          ? (nearMeta && nearMeta.confidence) || "high"
          : undefined,
        nearMatchMethod: isNear
          ? (nearMeta && nearMeta.nearMatchMethod) ||
            (typoFrom ? "typo_map" : "unknown")
          : undefined,
        imsSkuAliases: (() => {
          const raw = [
            ...(typoFrom ? [typoFrom] : []),
            ...(SKU_TYPO_ALIASES[sku.style] || []),
            ...(isNear && imsOriginal ? [imsOriginal] : []),
          ];
          const out = [];
          for (const a of raw) {
            const u = String(a || "")
              .toUpperCase()
              .replace(/[.\-_\s]/g, "");
            if (!u) continue;
            out.push(u);
            // IMS often stores digit-led typos with NU… (e.g. NU134QL01)
            if (/^\d/.test(u)) out.push(`NU${u}`);
            const bare = u.replace(/^NU/i, "");
            if (bare !== u) out.push(bare);
          }
          return out.filter((v, i, a) => a.indexOf(v) === i);
        })(),
        title: title || mapped.title || `Titan ${sku.style}`,
        description,
        caseMaterial: mapped.caseMaterial || "",
        caseShape: mapped.caseShape || "",
        caseSize: mapped.caseSize || "",
        dialColor: mapped.dialColor || "",
        waterResistance: mapped.waterResistance || "",
        movement: mapped.movement || "",
        strapMaterial: mapped.strapMaterial || "",
        strapColor: mapped.strapColor || "",
        gender: mapped.gender || "",
        warrantyPeriod: mapped.warrantyPeriod || "",
        category: mapped.category || "",
        // INR on brand site — still opt-in via --include-price (staff IMS price wins)
        price: null,
        oldPrice: null,
        priceSource: price,
        images,
        sourceUrl,
        source: SOURCE_OFFICIAL,
        scrapedAt: new Date().toISOString(),
        rawAttributes: attrs,
        extras: {
          collection: attrs.collection || "",
          displayBrand: attrs["display brand"] || "",
          glassMaterial: attrs["glass material"] || "",
          lockMechanism: attrs["lock mechanism"] || "",
          function: attrs.function || "",
          caseLength: attrs["case length"] || "",
          caseThickness: attrs["case thickness"] || "",
          warrantyDetail: attrs["warranty detail"] || "",
          styleCode: sku.style,
          sitePid: sku.sitePid,
        },
      },
      { brandNames: [BRAND] }
    );

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
    (/product-specs-attribute/i.test(html) ||
      /application\/ld\+json/i.test(html)) &&
    (/data-pid=/i.test(html) ||
      /product-name-heading/i.test(html) ||
      /og:title/i.test(html))
  );
}

function searchUrlsForSku(sku) {
  const n = normalizeSku(sku);
  const q = [
    n.style,
    n.styleLower,
    n.sitePid,
    n.ims,
    ...(n.styleCandidates || []),
  ].filter(Boolean);
  return [
    ...new Set(
      q.map(
        (term) =>
          `${SITE_ORIGIN}/search?q=${encodeURIComponent(term)}&lang=en_IN`
      )
    ),
  ];
}

/**
 * Known PDP URL patterns for Titan SFCC.
 * Slug usually ends with style code (95198wm01) — sometimes with nu prefix.
 */
function guessedPdpUrls(sku) {
  const { styleLower, sitePid } = normalizeSku(sku);
  if (!styleLower) return [];
  return [
    `${SITE_ORIGIN}/product/titan-purple-dial-analog-watch-for-women-${styleLower}.html`,
    `${SITE_ORIGIN}/product/titan-purple-dial-analog-watch-for-women-${sitePid}.html`,
  ];
}

async function resolveProductUrl(sku, options = {}) {
  if (options.officialUrl) return options.officialUrl;

  const { styleLower, style } = normalizeSku(sku);

  // Reference SKU — known good PDP
  const REF = {
    "95198WM01":
      "https://www.titan.co.in/product/titan-purple-dial-analog-watch-for-women-95198wm01.html",
  };
  if (REF[style]) return REF[style];

  for (const url of searchUrlsForSku(sku)) {
    try {
      const res = await fetchText(url, { timeoutMs: options.timeoutMs });
      if (!res.ok) continue;
      if (looksLikeProductHtml(res.text) && res.url) return res.url;
      const link = match1(
        res.text,
        new RegExp(
          `href="([^"]*${styleLower}[^"]*\\.html)"`,
          "i"
        )
      );
      if (link) return absUrl(link);
      if (res.url && res.url.toLowerCase().includes(styleLower)) return res.url;
    } catch {
      // Cloudflare / network
    }
    await sleep(options.delayMs || 1000);
  }

  if (options.allowGuessedUrl) {
    const guesses = guessedPdpUrls(sku);
    if (guesses.length) return guesses[0];
  }
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
  const { ims, style, sitePid } = normalizeSku(sku);
  const candidates = [
    path.join(fixtureDir, `${ims}.html`),
    path.join(fixtureDir, `${style}.html`),
    path.join(fixtureDir, `${sitePid}.html`),
    path.join(fixtureDir, `titan-${style}.html`),
    path.join(fixtureDir, `titan-${ims}.html`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

async function fetchProductHtml(sku, options = {}) {
  if (options.htmlPath) {
    return readFixtureHtml(options.htmlPath, options.officialUrl);
  }

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
          `fetch_failed: HTTP ${res.status || "?"} for ${url} (Cloudflare may be blocking Node)`
        ),
        { code: "fetch_failed" }
      );
    }
    // Detect Cloudflare challenge / block pages
    if (
      /Attention Required|cf-error-details|Just a moment/i.test(res.text) &&
      !looksLikeProductHtml(res.text)
    ) {
      throw Object.assign(
        new Error(
          `fetch_failed: Cloudflare blocked ${url} (save PDP HTML → fixtures/)`
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

function levenshtein(a, b) {
  const s = String(a || "");
  const t = String(b || "");
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const rows = s.length + 1;
  const cols = t.length + 1;
  const prev = new Array(cols);
  const cur = new Array(cols);
  for (let j = 0; j < cols; j++) prev[j] = j;
  for (let i = 1; i < rows; i++) {
    cur[0] = i;
    for (let j = 1; j < cols; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j < cols; j++) prev[j] = cur[j];
  }
  return prev[cols - 1];
}

/** Split digit-led Titan style into numeric run + letter suffix (QM01, WL06, …). */
function splitDigitStyle(style) {
  const m = String(style || "")
    .toUpperCase()
    .match(/^(\d+)([A-Z]+\d*)$/);
  if (!m) return null;
  return { numeric: m[1], suffix: m[2], style: `${m[1]}${m[2]}` };
}

function sameLetterSuffix(a, b) {
  const sa = splitDigitStyle(a);
  const sb = splitDigitStyle(b);
  if (!sa || !sb) return false;
  return sa.suffix === sb.suffix;
}

/**
 * Generate digit-insertion / 90-prefix style candidates (not yet validated).
 * @returns {{ style: string, method: string, editDistance: number }[]}
 */
function generateDigitNearCandidates(rawStyle) {
  const parts = splitDigitStyle(rawStyle);
  if (!parts) return [];
  const { numeric, suffix } = parts;
  const base = `${numeric}${suffix}`;
  const out = new Map();

  const add = (style, method) => {
    const s = String(style || "").toUpperCase();
    if (!s || s === base) return;
    const editDistance = levenshtein(base, s);
    const prev = out.get(s);
    if (!prev || editDistance < prev.editDistance) {
      out.set(s, { style: s, method, editDistance });
    }
  };

  for (let i = 0; i <= numeric.length; i++) {
    for (const d of "0123456789") {
      add(`${numeric.slice(0, i)}${d}${numeric.slice(i)}${suffix}`, "digit_insert");
    }
  }

  // Common IMS truncation of Titan 90xxx styles (134→90134, edit distance 2)
  if (numeric.length <= 4 && !numeric.startsWith("90")) {
    add(`90${numeric}${suffix}`, "ninety_prefix");
  }

  return [...out.values()];
}

/** NU / bare prefix variants of a request SKU (for search + catalog keys). */
function nuPrefixVariants(raw) {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  if (!cleaned) return [];
  const bare = cleaned.replace(/^NU/i, "");
  const withNu = bare ? `NU${bare}` : "";
  return [...new Set([cleaned, bare, withNu].filter(Boolean))];
}

async function catalogStyleExists(style, options = {}) {
  const styleKey = String(style || "").toUpperCase();
  if (!styleKey) return false;
  const url = `${CATALOG_IMAGE_BASE}/${styleKey}_1.jpg`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMs || 12000
    );
    try {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "image/jpeg,image/*;q=0.8,*/*;q=0.5",
        },
      });
      return Boolean(res.ok);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

/**
 * Probe titan.co.in /search for product links (often CF-blocked for Node).
 * @returns {Promise<{ style: string, url: string, method: string }[]>}
 */
async function searchNearMatchHits(sku, options = {}) {
  const hits = [];
  const seen = new Set();
  for (const url of searchUrlsForSku(sku)) {
    try {
      const res = await fetchText(url, { timeoutMs: options.timeoutMs || 20000 });
      if (!res.ok || !res.text) continue;
      if (/Attention Required|cf-error-details|Just a moment/i.test(res.text)) {
        continue;
      }
      const re = /href="([^"]*\/product\/[^"]+-([a-z0-9]+)\.html[^"]*)"/gi;
      let m;
      while ((m = re.exec(res.text))) {
        const href = absUrl(m[1]);
        const style = String(m[2] || "")
          .toUpperCase()
          .replace(/^NU/, "");
        if (!style || seen.has(style)) continue;
        seen.add(style);
        hits.push({ style, url: href, method: "search" });
      }
    } catch {
      // CF / network
    }
    await sleep(options.delayMs || 400);
  }
  return hits;
}

function isHighConfidenceNear(cand, originalStyle) {
  if (!cand || !cand.style) return false;
  if (!sameLetterSuffix(originalStyle, cand.style)) return false;
  if (cand.method === "typo_map") return true;
  if (cand.method === "digit_insert" && cand.editDistance === 1) return true;
  if (cand.method === "ninety_prefix" && cand.editDistance <= 2) return true;
  if (cand.method === "search" && cand.editDistance <= 2) return true;
  if (cand.method === "nu_prefix" && cand.editDistance === 0) return true;
  return false;
}

/**
 * Discover near-match styles when exact PDP resolution fails.
 * Conservative: auto-accept only a single high-confidence candidate.
 *
 * @returns {Promise<{
 *   accepted: null|{ style: string, method: string, confidence: string, editDistance: number, url?: string },
 *   candidates: object[],
 *   note: string|null
 * }>}
 */
async function discoverNearMatch(rawSku, options = {}) {
  const original = String(rawSku || "").trim();
  const normalized = normalizeSku(original);
  // Discover against the *pre-typo* bare style when possible
  const bareOriginal = String(original)
    .toUpperCase()
    .replace(/[.\-_\s]/g, "")
    .replace(/^NU/i, "");
  const probeStyle =
    (normalized.typoFrom && bareOriginal) || normalized.style || bareOriginal;

  const notes = [];
  if (/^TWEG/i.test(bareOriginal) || /^TWEG/i.test(normalized.style)) {
    // TWEG* belongs on Timex India — use brands/timex.js / run-timex.js
    notes.push(NEAR_MATCH_NOTES.tweg);
  }

  const candidates = [];
  const seen = new Set();

  const pushCand = (c) => {
    if (!c || !c.style) return;
    const key = c.style.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(c);
  };

  // 1) Known typo map (also applied in normalizeSku — surface for discovery)
  const typo = resolveSkuTypo(original);
  if (typo) {
    pushCand({
      style: typo.to,
      method: "typo_map",
      editDistance: levenshtein(typo.from, typo.to),
      confidence: "high",
    });
  }

  // 2) NU / bare variants that differ from current normalized style
  for (const v of nuPrefixVariants(original)) {
    const n = normalizeSku(v);
    if (n.style && n.style !== probeStyle) {
      pushCand({
        style: n.style,
        method: "nu_prefix",
        editDistance: levenshtein(probeStyle, n.style),
      });
    }
  }

  // 3) Digit-insert / 90-prefix against catalog images (CF-tolerant)
  const digitCands = generateDigitNearCandidates(probeStyle);
  const concurrency = Math.min(8, digitCands.length || 1);
  let idx = 0;
  async function worker() {
    while (idx < digitCands.length) {
      const i = idx++;
      const c = digitCands[i];
      const ok = await catalogStyleExists(c.style, options);
      if (ok) {
        pushCand({
          ...c,
          catalogHit: true,
        });
      }
    }
  }
  await Promise.all(
    Array.from({ length: concurrency }, () => worker())
  );

  // 4) Search page fallback (often CF-blocked)
  let searchBlocked = false;
  try {
    const searchHits = await searchNearMatchHits(original, options);
    if (!searchHits.length) {
      // empty may mean CF or true miss — try one HEAD of search to detect block
      searchBlocked = true;
    }
    for (const h of searchHits) {
      if (!sameLetterSuffix(probeStyle, h.style) && splitDigitStyle(probeStyle)) {
        // keep only same-suffix when we have a digit-led original
        if (splitDigitStyle(h.style)) continue;
      }
      pushCand({
        style: h.style,
        method: "search",
        url: h.url,
        editDistance: levenshtein(probeStyle, h.style),
      });
    }
  } catch {
    searchBlocked = true;
  }
  if (searchBlocked) notes.push(NEAR_MATCH_NOTES.cloudflare);

  // Score / filter high-confidence
  const high = candidates.filter((c) => isHighConfidenceNear(c, probeStyle));
  // Prefer typo_map, then lowest edit distance
  high.sort((a, b) => {
    const rank = (m) =>
      m === "typo_map" ? 0 : m === "digit_insert" ? 1 : m === "ninety_prefix" ? 2 : 3;
    return rank(a.method) - rank(b.method) || a.editDistance - b.editDistance;
  });

  let accepted = null;
  const typoHits = high.filter((c) => c.method === "typo_map");
  if (typoHits.length === 1) {
    // Known typo map always wins — do not compete with other catalog ED1 hits
    accepted = { ...typoHits[0], confidence: "high" };
  } else if (high.length === 1) {
    accepted = {
      ...high[0],
      confidence: "high",
    };
  } else if (high.length > 1) {
    // Multiple clear hits (e.g. 9210 → 90210 and 95210 without typo map) — never guess
    notes.push(
      `Multiple high-confidence near matches (${high
        .map((c) => c.style)
        .join(", ")}); manual pick required`
    );
  }

  return {
    accepted,
    candidates: candidates.map((c) => ({
      style: c.style,
      method: c.method,
      editDistance: c.editDistance,
      catalogHit: Boolean(c.catalogHit),
      url: c.url || null,
      highConfidence: isHighConfidenceNear(c, probeStyle),
    })),
    note: notes.length ? notes.join(" ") : null,
  };
}

async function enrichSkuOnce(sku, options = {}, nearMeta = null) {
  const normalized = normalizeSku(sku);
  const { html, sourceUrl, fromFixture } = await fetchProductHtml(sku, options);
  const product = mapProduct(html, sku, sourceUrl, nearMeta);
  product.fetchMode = fromFixture ? "fixture" : "live";
  product.source = SOURCE_OFFICIAL;

  const hay = `${product.officialSku} ${product.styleCode} ${sourceUrl} ${html}`.toUpperCase();
  const tokens = [
    normalized.style,
    normalized.ims,
    normalized.sitePid,
    normalized.compact,
    ...(normalized.styleCandidates || []),
    nearMeta && nearMeta.matchedStyle,
    nearMeta && nearMeta.imsSku,
  ]
    .filter(Boolean)
    .map((t) => String(t).toUpperCase().replace(/[.\-_\s]/g, ""));
  if (!tokens.some((t) => hay.includes(t) || hay.includes(t.replace(/^NU/, "")))) {
    const err = new Error("SKU / style code not present on resolved page");
    err.code = "not_found";
    err.sourceUrl = sourceUrl;
    throw err;
  }
  return product;
}

async function enrichSku(sku, options = {}) {
  const originalRequest = String(sku || "").trim();
  const normalized = normalizeSku(sku);
  const nearMetaFromTypo = normalized.typoFrom
    ? {
        nearMatch: true,
        matchedStyle: normalized.style,
        imsSku: originalRequest,
        confidence: "high",
        nearMatchMethod: "typo_map",
        typoFrom: normalized.typoFrom,
      }
    : null;

  try {
    return await enrichSkuOnce(sku, options, nearMetaFromTypo);
  } catch (err) {
    const failStatus = err.code || "error";
    const baseFail = {
      status: failStatus,
      sku: imsSkuForOutput(sku, normalized),
      brand: BRAND,
      source: SOURCE_OFFICIAL,
      reason: err.message,
      sourceUrl: err.sourceUrl || null,
      scrapedAt: new Date().toISOString(),
      imsSku: originalRequest,
    };

    // Only run near-match discovery on miss / fetch walls (not on map bugs)
    if (
      options.skipNearMatch ||
      (failStatus !== "not_found" && failStatus !== "fetch_failed")
    ) {
      return baseFail;
    }

    try {
      const discovery = await discoverNearMatch(originalRequest, options);
      if (discovery.accepted) {
        const matchedStyle = discovery.accepted.style;
        const nearMeta = {
          nearMatch: true,
          matchedStyle,
          imsSku: originalRequest,
          confidence: discovery.accepted.confidence || "high",
          nearMatchMethod: discovery.accepted.method,
          typoFrom:
            normalized.typoFrom ||
            String(originalRequest)
              .toUpperCase()
              .replace(/[.\-_\s]/g, "")
              .replace(/^NU/i, ""),
        };
        try {
          const product = await enrichSkuOnce(
            matchedStyle,
            {
              ...options,
              // Avoid infinite near-match recursion on the matched style
              skipNearMatch: true,
              officialUrl:
                discovery.accepted.url || options.officialUrl || null,
            },
            nearMeta
          );
          return product;
        } catch (innerErr) {
          return {
            ...baseFail,
            status: innerErr.code || "not_found",
            reason: `near_match_accepted_${matchedStyle}_but_scrape_failed: ${innerErr.message}`,
            nearMatchCandidates: discovery.candidates,
            nearMatchNote: discovery.note,
            matchedStyle,
          };
        }
      }

      const reasonBits = [err.message];
      if (discovery.candidates && discovery.candidates.length) {
        reasonBits.push("near-match candidates listed; none auto-accepted");
      } else if (
        discovery.note &&
        /TWEG\*/i.test(discovery.note)
      ) {
        reasonBits.push(
          "TWEG* SKUs are Timex India model numbers, not on titan.co.in"
        );
      }
      return {
        ...baseFail,
        nearMatchCandidates: discovery.candidates,
        nearMatchNote: discovery.note,
        reason: reasonBits.join(" — "),
      };
    } catch (discoverErr) {
      return {
        ...baseFail,
        nearMatchNote: discoverErr.message,
      };
    }
  }
}

module.exports = {
  BRAND,
  SITE_ORIGIN,
  SOURCE_OFFICIAL,
  CATALOG_IMAGE_BASE,
  ATTR_MAP,
  SKU_TYPO_MAP,
  SKU_TYPO_ALIASES,
  NEAR_MATCH_NOTES,
  resolveSkuTypo,
  normalizeSku,
  skuMatchKeys,
  extractAttributes,
  extractImages,
  extractJsonLdProduct,
  stabilizeCatalogUrl,
  synthesizeCatalogImages,
  mapProduct,
  resolveProductUrl,
  fetchProductHtml,
  enrichSku,
  looksLikeProductHtml,
  levenshtein,
  splitDigitStyle,
  generateDigitNearCandidates,
  discoverNearMatch,
  catalogStyleExists,
};
