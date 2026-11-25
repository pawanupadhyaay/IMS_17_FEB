"use strict";

/**
 * Thomas Earnshaw (thomas-earnshaw.com) enrichment — Shopify storefront.
 *
 * PDP: https://thomas-earnshaw.com/products/{handle}
 *   e.g. …/products/engineer-arkwright-skeleton-automatic-trafalgar-teal-es-8334-44
 *
 * IMS SKUs look like ES-8334-44 (hyphenated). Compact key strips separators (ES833444).
 * Resolve order:
 *   1. options.officialUrl / CSV official_url
 *   2. REF_URLS map
 *   3. Shopify predictive search by SKU
 *   4. Handle /products/{sku-lower}.json probe
 *   5. On official miss: Collective → Tata Cliq Luxury → TGT Luxe → Ethos
 *
 * Specs from PDP specifications table. Images from Shopify CDN with SKU in filename.
 * Prefer official Earnshaw images. Price is USD — not written to IMS by default.
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
  normalizeProductFields,
  normalizeCaseSize,
  normalizeStrapColor,
} = require("../lib/normalize");

const BRAND = "Earnshaw";
const SITE_ORIGIN = "https://thomas-earnshaw.com";
const SOURCE_OFFICIAL = "earnshaw";
const SOURCE_COLLECTIVE = RETAILER_SOURCE.COLLECTIVE;
const SOURCE_TATA = RETAILER_SOURCE.TATA;
const SOURCE_TGT = RETAILER_SOURCE.TGT;
const SOURCE_ETHOS = RETAILER_SOURCE.ETHOS;

const OFFICIAL_FAIL_CODES = new Set([
  "not_found",
  "fetch_failed",
  "error",
]);

/** Known official PDPs (compact SKU → URL). */
const REF_URLS = {
  ES833444:
    "https://thomas-earnshaw.com/products/engineer-arkwright-skeleton-automatic-trafalgar-teal-es-8334-44",
  ES8006II:
    "https://thomas-earnshaw.com/products/heritage-longitude-dual-time-skeleton-automatic-ebon-precision-es-8006-ii",
};

/** IMS typos → official compact SKU (ll vs II lookalike). */
const SKU_TYPO_MAP = {
  ES8006LL: "ES8006II",
};

const SKU_TYPO_ALIASES = Object.create(null);
for (const [typo, correct] of Object.entries(SKU_TYPO_MAP)) {
  const c = String(correct).toUpperCase();
  if (!SKU_TYPO_ALIASES[c]) SKU_TYPO_ALIASES[c] = [];
  SKU_TYPO_ALIASES[c].push(String(typo).toUpperCase());
}

/** Prefer US catalog pricing — Node IP often gets a geo-market amount still labelled USD. */
const SHOP_FETCH_HEADERS = {
  Cookie: "cart_currency=USD; localization=US",
  "Accept-Language": "en-US,en;q=0.9",
};

const ATTR_MAP = {
  movement: "movement",
  "case material": "caseMaterial",
  "case size (mm)": "caseSize",
  "case size": "caseSize",
  "case diameter": "caseSize",
  "dial colour": "dialColor",
  "dial color": "dialColor",
  colour: "dialColor",
  color: "dialColor",
  band: "strapMaterial",
  bracelet: "strapMaterial",
  "strap material": "strapMaterial",
  "water resistance": "waterResistance",
  warranty: "warrantyPeriod",
  gender: "gender",
};

/**
 * @param {string} raw
 * @returns {{
 *   compact: string,
 *   ims: string,
 *   style: string,
 *   dashed: string,
 *   original: string,
 *   typoFrom: null,
 *   nearMatchMethod: null,
 *   styleCandidates: string[]
 * }}
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
  return null;
}

function normalizeSku(raw) {
  const original = String(raw || "").trim();
  const upper = original.toUpperCase().replace(/\s+/g, "");
  let compact = upper.replace(/[.\-_]/g, "");
  const typo = resolveSkuTypo(compact);
  let typoFrom = null;
  if (typo) {
    typoFrom = typo.from;
    compact = typo.to;
  }
  // Prefer canonical ES-####-## when compact is ES + 4 digits + 2 alnum
  let dashed = upper;
  if (/^ES\d{4}[0-9A-Z]{2}$/i.test(compact)) {
    dashed = `ES-${compact.slice(2, 6)}-${compact.slice(6)}`;
  } else if (/^ES-\d{4}-[0-9A-Z]{2}$/i.test(upper)) {
    dashed = upper;
  }
  const aliases = SKU_TYPO_ALIASES[compact] || [];
  return {
    compact,
    ims: typoFrom || compact,
    style: dashed || compact,
    dashed: dashed || compact,
    original,
    typoFrom,
    nearMatchMethod: typo ? typo.method : null,
    styleCandidates: [
      ...new Set(
        [compact, dashed, upper, original, typoFrom, ...aliases].filter(Boolean)
      ),
    ],
  };
}

function skuMatchKeys(raw) {
  const n = normalizeSku(raw);
  const aliases = SKU_TYPO_ALIASES[n.compact] || [];
  return [
    ...new Set(
      [
        n.compact,
        n.style,
        n.dashed,
        n.original,
        n.typoFrom,
        ...n.styleCandidates,
        ...aliases,
      ]
        .filter(Boolean)
        .map((s) => String(s).toUpperCase().replace(/[.\-_\s]/g, ""))
        .concat(
          [n.dashed, n.style, n.original, n.typoFrom]
            .filter(Boolean)
            .map((s) => String(s).toUpperCase())
        )
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
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
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
    const u = s.replace(/\?.*$/, "").replace(/\/$/, "");
    if (/\/products\//i.test(u)) {
      return `${u}.json`.replace(/\.json\.json$/i, ".json");
    }
  }
  const handle = s.replace(/^\/+/, "").replace(/^products\//i, "");
  return `${SITE_ORIGIN}/products/${handle}.json`;
}

function pdpUrlFromHandle(handle) {
  return `${SITE_ORIGIN}/products/${String(handle || "").replace(/^\/+/, "")}`;
}

function cleanOfficialUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url, SITE_ORIGIN);
    u.search = "";
    u.hash = "";
    return u.href.replace(/\/$/, "");
  } catch {
    return String(url).split("?")[0];
  }
}

/**
 * Resolve Shopify handle via predictive search, then SKU-as-handle guess.
 */
async function resolveProductUrl(sku, options = {}) {
  if (options.officialUrl) return cleanOfficialUrl(options.officialUrl);

  const normalized = normalizeSku(sku);
  if (options.refUrls && options.refUrls[normalized.compact]) {
    return options.refUrls[normalized.compact];
  }
  if (REF_URLS[normalized.compact]) return REF_URLS[normalized.compact];

  const queries = [
    ...new Set(
      [
        normalized.dashed,
        normalized.style,
        normalized.compact,
        normalized.original,
        ...normalized.styleCandidates,
      ].filter(Boolean)
    ),
  ];

  for (const q of queries) {
    const suggestUrl =
      `${SITE_ORIGIN}/search/suggest.json?q=${encodeURIComponent(q)}` +
      "&resources%5Btype%5D=product&resources%5Blimit%5D=8";
    try {
      const res = await fetchText(suggestUrl, {
        timeoutMs: options.timeoutMs || 45000,
        headers: { Accept: "application/json" },
      });
      if (res.ok && res.text) {
        const data = JSON.parse(res.text);
        const products =
          data?.resources?.results?.products ||
          data?.resources?.products ||
          [];
        const qUp = String(q).toUpperCase().replace(/[.\-_\s]/g, "");
        const hit =
          products.find((p) =>
            String(p.handle || "")
              .toUpperCase()
              .replace(/[.\-_\s]/g, "")
              .includes(qUp)
          ) ||
          products.find((p) =>
            String(p.title || "")
              .toUpperCase()
              .replace(/[.\-_\s]/g, "")
              .includes(qUp)
          ) ||
          null;
        if (hit && hit.handle) return pdpUrlFromHandle(hit.handle);
      }
    } catch {
      /* try next */
    }
    await sleep(Math.min(options.delayMs || 400, 300));
  }

  // Probe common handle forms
  const handleGuesses = [
    String(normalized.dashed || "").toLowerCase(),
    String(normalized.compact || "").toLowerCase(),
  ].filter(Boolean);

  for (const handle of handleGuesses) {
    const guessed = pdpUrlFromHandle(handle);
    try {
      const probe = await fetchText(productJsonUrl(guessed), {
        timeoutMs: options.timeoutMs || 45000,
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

function skuTokensForImage(skuNorm) {
  const tokens = new Set();
  for (const raw of [
    skuNorm.dashed,
    skuNorm.style,
    skuNorm.compact,
    skuNorm.original,
  ]) {
    const s = String(raw || "").trim();
    if (!s) continue;
    tokens.add(s.toLowerCase());
    tokens.add(s.toLowerCase().replace(/[.\-_\s]/g, ""));
  }
  return [...tokens].filter(Boolean);
}

/**
 * Prefer shop-hosted /cdn/shop/files/… — Node often gets 403 from
 * cdn.shopify.com while thomas-earnshaw.com proxies the same asset.
 */
function canonicalizeEarnshawImage(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw, SITE_ORIGIN);
    const base = (u.pathname.split("/").pop() || "").split("?")[0];
    if (!base || !/\.(?:png|jpe?g|webp|gif)$/i.test(base)) return "";
    // Always rewrite to shop CDN path (stable + fetchable from Node)
    if (
      /cdn\.shopify\.com$/i.test(u.hostname) ||
      /thomas-earnshaw\.com$/i.test(u.hostname)
    ) {
      return `${SITE_ORIGIN}/cdn/shop/files/${base}`;
    }
    return `${u.origin}${u.pathname}`.split("?")[0];
  } catch {
    return "";
  }
}

function extractImagesFromProductJson(product, skuNorm) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const urls = [];
  const seen = new Set();
  const tokens = skuTokensForImage(skuNorm);

  const push = (raw) => {
    const src = canonicalizeEarnshawImage(raw);
    if (!src) return;
    const base = (src.split("/").pop() || "").toLowerCase();
    // SKU-strict: filename must mention this SKU (dashed or compact)
    if (tokens.length && !tokens.some((t) => base.includes(t))) return;
    if (seen.has(src)) return;
    seen.add(src);
    urls.push(src);
  };

  for (const img of images) push(img?.src);
  if (!urls.length && product?.image?.src) push(product.image.src);
  return urls.slice(0, 12);
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

/**
 * Specs table: th/td pairs + dual-column rows (Case Size / Thickness, etc.).
 * Water resistance uses an "active" ATM marker.
 */
function extractSpecsFromHtml(html) {
  const attrs = {};
  const raw = String(html || "");

  // Dual-header rows: <th>Case Size (mm)</th><th>Case Thickness (mm)</th>
  // followed by <td>40.8</td><td>11.9</td>
  const dualRe =
    /<th[^>]*class="[^"]*table_title[^"]*"[^>]*>\s*([^<]+?)\s*<\/th>\s*<th[^>]*class="[^"]*table_title[^"]*"[^>]*>\s*([^<]+?)\s*<\/th>[\s\S]{0,400}?<td[^>]*class="[^"]*table_content[^"]*"[^>]*>\s*([^<]+?)\s*<\/td>\s*<td[^>]*class="[^"]*table_content[^"]*"[^>]*>\s*([^<]+?)\s*<\/td>/gi;
  let m;
  while ((m = dualRe.exec(raw))) {
    const l1 = stripTags(m[1]).toLowerCase();
    const l2 = stripTags(m[2]).toLowerCase();
    const v1 = stripTags(m[3]);
    const v2 = stripTags(m[4]);
    if (l1 && v1) attrs[l1] = v1;
    if (l2 && v2) attrs[l2] = v2;
  }

  // Single th → next td
  const singleRe =
    /<th[^>]*class="[^"]*table_title[^"]*"[^>]*>\s*([^<]+?)\s*<\/th>[\s\S]{0,600}?<td[^>]*class="[^"]*table_content[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/td>/gi;
  while ((m = singleRe.exec(raw))) {
    const label = stripTags(m[1]).toLowerCase();
    if (!label || attrs[label]) continue;
    // Skip water-resistance container (handled below)
    if (/water resistance/i.test(label)) continue;
    const value = stripTags(m[2]);
    if (value) attrs[label] = value;
  }

  // Active ATM marker
  const atm = raw.match(
    /water-resistance-content__item\s+active[^>]*>\s*<i>\s*(\d+)\s*ATM\s*<\/i>/i
  );
  if (atm) {
    attrs["water resistance"] = `${atm[1]} ATM`;
  } else {
    const atmFallback = match1(
      raw,
      /Water Resistance[\s\S]{0,400}?(\d+)\s*ATM/i
    );
    if (atmFallback) attrs["water resistance"] = `${atmFallback} ATM`;
  }

  // Icon blocks under specifications_*
  const moveBlock = match1(
    raw,
    /specifications_movement[\s\S]{0,800}?>([\s\S]{5,200}?)<\//i
  );
  if (moveBlock && !attrs.movement) {
    const t = stripTags(moveBlock);
    if (t.length >= 5 && t.length < 120) attrs.movement = t;
  }

  return attrs;
}

function inferStrapFields(bandRaw) {
  const band = String(bandRaw || "");
  let strapMaterial = "";
  let strapColor = "";
  if (/stainless\s*steel|bracelet/i.test(band)) {
    strapMaterial = "Stainless Steel";
  } else if (/leather/i.test(band)) {
    strapMaterial = "Leather";
  } else if (/rubber|silicone/i.test(band)) {
    strapMaterial = "Rubber";
  } else if (band) {
    strapMaterial = band;
  }
  if (/two[\s-]*tone/i.test(band)) strapColor = "Two Tone";
  else if (/black/i.test(band)) strapColor = "Black";
  else if (/brown/i.test(band)) strapColor = "Brown";
  else if (/silver/i.test(band)) strapColor = "Silver";
  else if (/gold/i.test(band)) strapColor = "Gold";
  return { strapMaterial, strapColor };
}

function mapMovement(raw) {
  const s = String(raw || "");
  if (/automatic/i.test(s)) return "Automatic";
  if (/quartz/i.test(s)) return "Quartz";
  if (/manual|hand[\s-]*wind/i.test(s)) return "Manual";
  return s;
}

function buildTitle(product, html) {
  const og =
    match1(html || "", /property=["']og:title["']\s+content=["']([^"']+)/i) ||
    "";
  const shopify = String(product?.title || "").trim();
  if (og) {
    // "Trafalgar Teal | Engineer Arkwright Skeleton Automatic"
    const parts = og
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      // Prefer collection/model first, colour last
      return `${parts.slice(1).join(" ")} ${parts[0]}`.replace(/\s+/g, " ").trim();
    }
    return og.replace(/\s*\|\s*Thomas Earnshaw.*/i, "").trim();
  }
  return shopify || `Earnshaw ${product?.handle || ""}`.trim();
}

function mapFromShopify(product, html, skuInput, sourceUrl) {
  const sku = normalizeSku(skuInput);
  const attrs = html ? extractSpecsFromHtml(html) : {};
  const variant =
    (product.variants || []).find((v) => {
      const vs = String(v.sku || "")
        .toUpperCase()
        .replace(/[.\-_\s]/g, "");
      return vs && (vs === sku.compact || skuMatchKeys(skuInput).includes(vs));
    }) ||
    (product.variants || [])[0] ||
    {};

  const officialSku =
    String(variant.sku || "").trim().toUpperCase() || sku.dashed || sku.compact;

  const mapped = {};
  for (const [label, field] of Object.entries(ATTR_MAP)) {
    if (attrs[label]) mapped[field] = attrs[label];
  }

  const bandRaw = attrs.band || attrs.bracelet || "";
  const strap = inferStrapFields(bandRaw);
  if (!mapped.strapMaterial) mapped.strapMaterial = strap.strapMaterial;
  if (/stainless\s*steel/i.test(mapped.strapMaterial || "")) {
    mapped.strapMaterial = "Stainless Steel";
  }
  const strapColor =
    normalizeStrapColor(strap.strapColor) || strap.strapColor || "";

  if (/stainless\s*steel/i.test(mapped.caseMaterial || "")) {
    mapped.caseMaterial = "Stainless Steel";
  }
  mapped.movement = mapMovement(mapped.movement || attrs.movement || "");

  const description =
    stripTags(product.body_html || "") ||
    stripTags(
      match1(html || "", /property=["']og:description["']\s+content=["']([^"']+)/i)
    ) ||
    "";

  const title = buildTitle(product, html);
  const images = extractImagesFromProductJson(product, sku);

  // Prefer og:price from HTML — Shopify JSON can geo-localize amounts while
  // still labelling currency USD (Node IP vs browser market).
  const ogPrice = match1(
    html || "",
    /property=["']og:price:amount["']\s+content=["']([^"']+)/i
  );
  const ogCurrency =
    match1(
      html || "",
      /property=["']og:price:currency["']\s+content=["']([^"']+)/i
    ) ||
    match1(
      html || "",
      /property=["']product:price:currency["']\s+content=["']([^"']+)/i
    ) ||
    String(variant.price_currency || "").trim() ||
    "USD";

  let priceAmount =
    ogPrice && Number.isFinite(Number(ogPrice)) ? Number(ogPrice) : null;
  if (priceAmount == null && variant.price != null && variant.price !== "") {
    priceAmount = Number(variant.price);
  }
  const compareAt =
    variant.compare_at_price != null && variant.compare_at_price !== ""
      ? Number(variant.compare_at_price)
      : null;
  const priceCurrency = String(ogCurrency || "USD").toUpperCase();
  const priceLabel =
    priceAmount != null && Number.isFinite(priceAmount)
      ? priceCurrency === "USD"
        ? `$${Number(priceAmount).toLocaleString("en-US")}`
        : priceCurrency === "INR"
          ? `₹${Number(priceAmount).toLocaleString("en-IN")}`
          : `${priceCurrency} ${Number(priceAmount).toLocaleString("en-US")}`
      : null;

  const warrantyRaw = mapped.warrantyPeriod || attrs.warranty || "";
  let warrantyPeriod = warrantyRaw;
  const wYears = String(warrantyRaw).match(/(\d+)\s*years?/i);
  if (wYears) warrantyPeriod = `${wYears[1]} years`;

  const { product: normalized, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact,
      officialSku,
      title,
      description,
      caseMaterial: mapped.caseMaterial || "",
      caseShape: "",
      caseSize: normalizeCaseSize(
        mapped.caseSize ? String(mapped.caseSize) : ""
      ),
      dialColor: mapped.dialColor || "",
      waterResistance: mapped.waterResistance || "",
      movement: mapped.movement || "",
      strapMaterial: mapped.strapMaterial || "",
      strapColor,
      gender: mapped.gender || "",
      warrantyPeriod: warrantyPeriod || "",
      category: "Luxury",
      price: null,
      oldPrice: null,
      priceSource:
        priceAmount != null && Number.isFinite(priceAmount)
          ? {
              amount: priceAmount,
              mrp:
                compareAt != null &&
                Number.isFinite(compareAt) &&
                // Only keep compare-at when same market scale as chosen amount
                (ogPrice
                  ? Math.abs(compareAt - priceAmount) / Math.max(priceAmount, 1) <
                    0.5
                  : true)
                  ? compareAt
                  : priceAmount,
              currency: priceCurrency,
              label: priceLabel,
            }
          : null,
      images,
      sourceUrl: cleanOfficialUrl(sourceUrl) || sourceUrl,
      source: SOURCE_OFFICIAL,
      scrapedAt: new Date().toISOString(),
      rawAttributes: attrs,
      extras: {
        handle: product.handle || "",
        vendor: product.vendor || "",
        productType: product.product_type || "",
        tags: product.tags || "",
        caseThickness: attrs["case thickness (mm)"] || attrs["case thickness"] || "",
        lugToLug: attrs["lug to lug (mm)"] || attrs["lug to lug"] || "",
        weight: attrs["weight (g)"] || attrs.weight || "",
        lens: attrs.lens || "",
        crownType: attrs["crown type"] || "",
        indexLuminous: attrs["index & luminous"] || "",
        bandRaw,
        collection: product.vendor || "",
      },
    });

  normalized.fieldMapped = fieldMapped;
  normalized.fieldUnmapped = fieldUnmapped;
  normalized.warnings = normalized.warnings || [];
  normalized.styleCode = sku.dashed;

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
    match1(html || "", /property=["']og:description["']\s+content=["']([^"']+)/i) ||
    match1(html || "", /name=["']description["']\s+content=["']([^"']+)/i) ||
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
      match1(html, /property=["']og:url["']\s+content=["']([^"']+)/i) ||
      `file://${path.resolve(filePath)}`,
    fromFixture: true,
  };
}

function fixturePathForSku(fixtureDir, sku) {
  if (!fixtureDir) return null;
  const { compact, dashed } = normalizeSku(sku);
  for (const name of [
    `earnshaw-${dashed}.html`,
    `earnshaw-${compact}.html`,
    `${dashed}.html`,
    `${compact}.html`,
    `${compact.toLowerCase()}.html`,
  ]) {
    const candidate = path.join(fixtureDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function fixtureJsonPathForSku(fixtureDir, sku) {
  if (!fixtureDir) return null;
  const { compact, dashed } = normalizeSku(sku);
  for (const name of [
    `earnshaw-${dashed}.json`,
    `earnshaw-${compact}.json`,
    `${dashed}.json`,
    `${compact}.json`,
    `${compact.toLowerCase()}.json`,
  ]) {
    const candidate = path.join(fixtureDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function skuPresentOnBundle(product, sourceUrl, normalized) {
  const hay = `${product?.handle || ""} ${product?.title || ""} ${
    sourceUrl || ""
  } ${(product?.variants || []).map((v) => v.sku).join(" ")}`
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");
  return skuMatchKeys(normalized.original || normalized.compact).some(
    (k) => k && hay.includes(String(k).replace(/[.\-_\s]/g, ""))
  );
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

  let url =
    cleanOfficialUrl(options.officialUrl) ||
    (await resolveProductUrl(sku, {
      ...options,
      refUrls: { ...REF_URLS, ...(options.refUrls || {}) },
    }));
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
    timeoutMs: options.timeoutMs || 45000,
    headers: { Accept: "application/json", ...SHOP_FETCH_HEADERS },
  });
  if (!jsonRes.ok || !jsonRes.text) {
    throw Object.assign(
      new Error(`fetch_failed: HTTP ${jsonRes.status || "?"} for ${jsonUrl}`),
      { code: "fetch_failed", sourceUrl: url }
    );
  }
  const product = parseShopifyProductJson(jsonRes.text);
  const pdp = pdpUrlFromHandle(product.handle || url);
  await sleep(options.delayMs || 400);
  const htmlRes = await fetchText(pdp, {
    timeoutMs: options.timeoutMs || 45000,
    headers: { ...SHOP_FETCH_HEADERS },
  });
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

async function enrichFromRetailerFallback(sku, options = {}) {
  const { product } = await enrichFromRetailerChain(sku, {
    ...options,
    brandHint: BRAND,
    preset: "luxury",
    fixtureDir:
      options.fixtureDir || path.join(__dirname, "..", "fixtures"),
  });
  return product;
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

  try {
    const { html, sourceUrl, fromFixture, product, warnings } =
      await fetchProductBundle(sku, options);
    if (!product) {
      if (!options.skipRetailerFallback) {
        const retailer = await enrichFromRetailerFallback(sku, options);
        if (retailer && retailer.status === "ok") return retailer;
      }
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

    if (!skuPresentOnBundle(product, sourceUrl, normalized)) {
      if (!options.skipRetailerFallback) {
        const retailer = await enrichFromRetailerFallback(sku, options);
        if (retailer && retailer.status === "ok") return retailer;
      }
      return {
        status: "not_found",
        sku: normalized.compact,
        brand: BRAND,
        source: SOURCE_OFFICIAL,
        reason: "SKU not present on resolved Earnshaw PDP",
        sourceUrl,
        scrapedAt: new Date().toISOString(),
      };
    }

    const mapped = mapFromShopify(product, html, sku, sourceUrl);
    mapped.sku = normalized.typoFrom || normalized.compact;
    if (normalized.typoFrom) {
      mapped.typoFrom = normalized.typoFrom;
      mapped.officialSku = normalized.dashed || normalized.compact;
      mapped.nearMatch = true;
      mapped.nearMatchMethod = normalized.nearMatchMethod || "typo_map";
      mapped.imsSku = normalized.typoFrom;
      mapped.imsSkuAliases = [
        ...new Set(
          [
            normalized.typoFrom,
            normalized.compact,
            normalized.dashed,
            ...(SKU_TYPO_ALIASES[normalized.compact] || []),
          ].filter(Boolean)
        ),
      ];
    }
    mapped.fetchMode = fromFixture ? "fixture" : "live";
    if (Array.isArray(warnings) && warnings.length) {
      mapped.warnings = [...(mapped.warnings || []), ...warnings];
    }
    if (options.delayMs) await sleep(options.delayMs);
    return mapped;
  } catch (err) {
    if (
      !options.skipRetailerFallback &&
      OFFICIAL_FAIL_CODES.has(err.code || "error")
    ) {
      const retailer = await enrichFromRetailerFallback(sku, options);
      if (retailer && retailer.status === "ok") return retailer;
    }
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
  ATTR_MAP,
  normalizeSku,
  skuMatchKeys,
  resolveProductUrl,
  extractSpecsFromHtml,
  extractImagesFromProductJson,
  mapFromShopify,
  fetchProductBundle,
  enrichFromRetailerFallback,
  enrichSku,
  productJsonUrl,
};
