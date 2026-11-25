"use strict";

/**
 * Michael Kors (michaelkors.com) enrichment — Fossil Group / SFCC storefront.
 *
 * PDP: https://www.michaelkors.com/{slug}/{SKU}.html
 *   e.g. …/mini-lexington-black-tone-watch/MK7688.html
 *
 * IMS SKUs are compact refs (MK7688). Resolve order:
 *   1. options.officialUrl / CSV official_url
 *   2. REF_URLS map
 *   3. Search page PDP link (often Akamai-blocked for Node)
 *   4. Fixtures under fixtures/michael-kors-{SKU}.html / {SKU}.html
 *   5. On official miss: Collective → Tata Cliq Luxury → TGT Luxe → Ethos
 *
 * Specs from PDP bullet list + JSON-LD Product. Images from
 * assets.michaelkors.com (SKU in filename; prefer ECOM_Image_Large).
 * Prefer official CDN. USD price not written to IMS by default.
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

const BRAND = "Michael Kors";
const SITE_ORIGIN = "https://www.michaelkors.com";
const SOURCE_OFFICIAL = "michael-kors";
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
  MK7688:
    "https://www.michaelkors.com/mini-lexington-black-tone-watch/MK7688.html",
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
      [n.compact, n.original]
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

function extractJsonLdProduct(html) {
  const blocks = String(html || "").match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!blocks) return null;
  for (const block of blocks) {
    const raw = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    try {
      const data = JSON.parse(raw);
      const list = Array.isArray(data) ? data : [data];
      for (const item of list) {
        if (!item) continue;
        if (item["@type"] === "Product" || item.sku || item.mpn) return item;
        if (Array.isArray(item["@graph"])) {
          const p = item["@graph"].find(
            (g) => g && (g["@type"] === "Product" || g.sku)
          );
          if (p) return p;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Pull • bullet specs from PDP body. */
function extractBullets(html) {
  const bullets = [];
  const re = /[•·]\s*([^•·<\n]{2,120})/g;
  let m;
  while ((m = re.exec(String(html || ""))) !== null) {
    const t = stripTags(m[1]).replace(/\s+/g, " ").trim();
    if (t && t.length >= 2 && t.length < 100) bullets.push(t);
  }
  return [...new Set(bullets)];
}

/**
 * Map MK bullet / free-text specs → product fields.
 * @returns {{ attrs: Record<string,string>, mapped: Record<string,string> }}
 */
function specsFromBullets(bullets, ld) {
  const attrs = {};
  const mapped = {};
  const all = bullets.slice();

  if (ld?.color) attrs.color = String(ld.color);
  if (ld?.description) attrs.ldDescription = String(ld.description);

  for (const b of all) {
    const low = b.toLowerCase();
    attrs[`bullet:${b}`] = b;

    if (/^\d+\s*mm\b/i.test(b) || /\b\d+\s*mm\s+case\b/i.test(low)) {
      mapped.caseSize = b.replace(/\s*case\s*$/i, "").trim();
    } else if (/stainless\s*steel/i.test(b)) {
      mapped.caseMaterial = "Stainless Steel";
      if (!mapped.strapMaterial) mapped.strapMaterial = "Stainless Steel";
    } else if (/quartz/i.test(b)) {
      mapped.movement = /chrono/i.test(b) ? "Quartz Chronograph" : "Quartz";
    } else if (/water\s*resistant/i.test(b) || /\b\d+\s*atm\b/i.test(low)) {
      mapped.waterResistance = b;
    } else if (/warrant/i.test(b)) {
      mapped.warrantyPeriod = b;
    } else if (/leather/i.test(b)) {
      mapped.strapMaterial = "Leather";
    } else if (/silicone|rubber/i.test(b)) {
      mapped.strapMaterial = /silicone/i.test(b) ? "Silicone" : "Rubber";
    } else if (/(black|gold|silver|rose|two[\s-]?tone)[\s-]?tone/i.test(b)) {
      if (/black/i.test(b)) mapped.dialColor = mapped.dialColor || "Black";
      if (/gold/i.test(b) && !/rose/i.test(b)) {
        mapped.dialColor = mapped.dialColor || "Gold";
      }
      if (/rose/i.test(b)) mapped.dialColor = mapped.dialColor || "Rose Gold";
      if (/silver/i.test(b)) mapped.dialColor = mapped.dialColor || "Silver";
      if (/two/i.test(b)) mapped.dialColor = mapped.dialColor || "Two Toned";
      mapped.strapColor = mapped.strapColor || mapped.dialColor;
    }
  }

  if (!mapped.dialColor && ld?.color) {
    mapped.dialColor = String(ld.color);
  }
  if (!mapped.strapColor && mapped.dialColor) {
    mapped.strapColor = mapped.dialColor;
  }

  const cat = String(ld?.category || "");
  if (/women/i.test(cat)) mapped.gender = "Female";
  else if (/men/i.test(cat)) mapped.gender = "Male";

  return { attrs, mapped };
}

function extractImages(html, skuCompact) {
  const urls = [];
  const seen = new Set();
  const skuUp = String(skuCompact || "").toUpperCase();
  const skuRe = new RegExp(`/${skuUp}[-_]`, "i");

  const push = (raw) => {
    if (!raw) return;
    let u = decodeEntities(String(raw).split("?")[0].trim());
    u = absUrl(u);
    if (!/assets\.michaelkors\.com/i.test(u)) return;
    if (/logo|icon|sprite|favicon|swatch|thumbnail/i.test(u)) return;
    // SKU-strict: filename must contain SKU (avoid related-product pollution)
    if (skuUp && !skuRe.test(u) && !u.toUpperCase().includes(`/${skuUp}-`)) {
      return;
    }
    // Prefer Large; skip Zoom duplicates of same asset
    if (/ECOM_Image_Zoom|ECOM_.*Thumbnail|ECOM_Retina/i.test(u)) return;
    if (seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };

  const ld = extractJsonLdProduct(html);
  if (ld) {
    const imgs = Array.isArray(ld.image) ? ld.image : ld.image ? [ld.image] : [];
    for (const img of imgs) push(typeof img === "string" ? img : img?.url);
  }
  push(match1(html, /property=["']og:image["']\s+content=["']([^"']+)/i));

  const all = String(html || "").match(
    /https:\/\/assets\.michaelkors\.com\/transform\/[^"'\\\s>]+/gi
  );
  if (all) {
    for (const u of all) {
      if (/ECOM_Image_Large/i.test(u) || /ECOM_Image_Medium/i.test(u)) {
        push(u);
      }
    }
  }

  // Prefer Large over Medium; order by _1, _2, …
  const score = (u) => {
    const large = /ECOM_Image_Large/i.test(u) ? 0 : 10;
    const n = Number((u.match(/_(\d+)-tif/i) || u.match(/_(\d+)\./i) || [])[1] || 99);
    return large * 100 + n;
  };
  return urls.sort((a, b) => score(a) - score(b));
}

function resolveProductUrl(sku, options = {}) {
  if (options.officialUrl) return options.officialUrl;
  const { compact } = normalizeSku(sku);
  const map = options.refUrls || REF_URLS;
  if (map[compact]) return map[compact];
  return null;
}

function pdpFromSearchHtml(html, skuCompact) {
  const up = String(skuCompact || "").toUpperCase();
  const re = new RegExp(
    `href=["'](https?://www\\.michaelkors\\.com/[^"']+/${up}\\.html[^"']*)["']`,
    "i"
  );
  const m = String(html || "").match(re);
  if (m) return m[1].split("?")[0];
  const re2 = new RegExp(`/[^"'\\s]+/${up}\\.html`, "i");
  const m2 = String(html || "").match(re2);
  return m2 ? absUrl(m2[0].split("?")[0]) : null;
}

function fixturePathForSku(fixtureDir, sku) {
  if (!fixtureDir) return null;
  const { compact } = normalizeSku(sku);
  for (const name of [
    `michael-kors-${compact}.html`,
    `${compact}.html`,
    `mk-${compact}.html`,
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
      match1(html, /rel=["']canonical["']\s+href=["']([^"']+)/i) ||
      `file://${path.resolve(filePath)}`,
    fromFixture: true,
  };
}

function isMkPdpHtml(html) {
  const t = String(html || "");
  if (t.length < 2000) return false;
  if (/Access Denied|Pardon Our Interruption|bot.?detect/i.test(t) && t.length < 20000) {
    return false;
  }
  return (
    /michaelkors\.com/i.test(t) ||
    /assets\.michaelkors\.com/i.test(t) ||
    /"@type"\s*:\s*"Product"/i.test(t)
  );
}

async function fetchProductHtml(sku, options = {}) {
  if (options.htmlPath) {
    return readFixtureHtml(options.htmlPath, options.officialUrl);
  }
  if (options.preferFixture) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl);
  }

  const { compact } = normalizeSku(sku);
  let url = resolveProductUrl(sku, options);

  if (!url) {
    try {
      const searchUrl = `${SITE_ORIGIN}/search?q=${encodeURIComponent(compact)}`;
      const search = await fetchText(searchUrl, {
        timeoutMs: options.timeoutMs || 30000,
      });
      if (search.ok && search.text) {
        url = pdpFromSearchHtml(search.text, compact);
      }
    } catch {
      /* fall through */
    }
  }

  if (!url) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl);
    throw Object.assign(
      new Error(
        `not_found: no Michael Kors PDP URL for ${compact} (Akamai often blocks Node — use --html fixtures/michael-kors-${compact}.html)`
      ),
      { code: "not_found" }
    );
  }

  const res = await fetchText(url, { timeoutMs: options.timeoutMs || 45000 });
  if (
    !res.ok ||
    !res.text ||
    res.text.length < 2000 ||
    !isMkPdpHtml(res.text)
  ) {
    const fp = fixturePathForSku(options.fixtureDir, sku);
    if (fp) return readFixtureHtml(fp, options.officialUrl || url);
    throw Object.assign(
      new Error(`fetch_failed: HTTP ${res.status || "?"} for ${url}`),
      { code: "fetch_failed", sourceUrl: url }
    );
  }
  return { html: res.text, sourceUrl: res.url || url, fromFixture: false };
}

function offerPrice(ld) {
  const offers = ld?.offers;
  if (!offers) return null;
  const list = Array.isArray(offers) ? offers : [offers];
  for (const o of list) {
    if (o && o.price != null) {
      const n = Number(o.price);
      if (Number.isFinite(n)) {
        return {
          amount: n,
          currency: String(o.priceCurrency || "USD").toUpperCase(),
        };
      }
    }
  }
  return null;
}

function mapProduct(html, skuInput, sourceUrl) {
  const sku = normalizeSku(skuInput);
  const ld = extractJsonLdProduct(html);
  const bullets = extractBullets(html);
  const { attrs, mapped } = specsFromBullets(bullets, ld);

  const title =
    String(ld?.name || "").trim() ||
    match1(html, /property=["']og:title["']\s+content=["']([^"']+)/i)
      .replace(/\s*[|/].*Michael Kors.*/i, "")
      .replace(/\s+in\s+BLACK.*/i, "")
      .trim() ||
    `Michael Kors ${sku.compact}`;

  const blurbMatch = String(html || "").match(
    /([A-Z][a-z]+ evolves[\s\S]{40,450}?\.)/
  );
  const blurb = blurbMatch
    ? stripTags(blurbMatch[1]).replace(/\s+/g, " ").trim()
    : "";
  const metaDesc =
    match1(html, /name=["']description["']\s+content=["']([^"']+)/i) ||
    match1(html, /property=["']og:description["']\s+content=["']([^"']+)/i);
  const desc =
    blurb && blurb.length >= 40
      ? blurb
      : metaDesc && !/Buy online today/i.test(metaDesc)
        ? metaDesc
        : blurb || metaDesc || "";

  const images = extractImages(html, sku.compact);
  const officialSku =
    String(ld?.sku || ld?.mpn || "")
      .toUpperCase()
      .replace(/[.\-_\s]/g, "") || sku.compact;

  const price = offerPrice(ld);

  const { product: normalized, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact,
      officialSku,
      title,
      description: desc,
      caseMaterial: mapped.caseMaterial || "",
      caseShape: "",
      caseSize: normalizeCaseSize(mapped.caseSize || ""),
      dialColor: mapped.dialColor || "",
      waterResistance: mapped.waterResistance || "",
      movement: mapped.movement || "",
      strapMaterial: mapped.strapMaterial || "",
      strapColor: normalizeStrapColor(mapped.strapColor || ""),
      gender: mapped.gender || "",
      warrantyPeriod: mapped.warrantyPeriod || "",
      category: /chrono/i.test(`${title} ${mapped.movement || ""}`)
        ? "Chronograph"
        : "Fashion",
      price: null,
      oldPrice: null,
      priceSource: price
        ? {
            amount: price.amount,
            mrp: price.amount,
            currency: price.currency,
            label:
              price.currency === "USD"
                ? `$${price.amount}`
                : `${price.currency} ${price.amount}`,
          }
        : null,
      images,
      sourceUrl,
      source: SOURCE_OFFICIAL,
      scrapedAt: new Date().toISOString(),
      rawAttributes: attrs,
      extras: {
        color: attrs.color || "",
        bullets,
        platform: "michaelkors.com",
      },
    });

  normalized.fieldMapped = fieldMapped;
  normalized.fieldUnmapped = fieldUnmapped;
  normalized.warnings = normalized.warnings || [];
  if (!normalized.description || normalized.description.length < 40) {
    normalized.warnings.push("description_short_or_missing");
  }
  if (!normalized.images.length) normalized.warnings.push("no_sku_images");
  if (!bullets.length) normalized.warnings.push("bullets_missing");
  if (fieldUnmapped && Object.keys(fieldUnmapped).length) {
    normalized.warnings.push("unmapped_constrained_fields");
  }

  Object.assign(normalized, buildSeo(normalized, { metaDescription: desc }));
  return normalized;
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
    const { html, sourceUrl, fromFixture } = await fetchProductHtml(
      sku,
      options
    );
    const hay = html.toUpperCase().replace(/[.\-_\s]/g, "");
    if (!hay.includes(normalized.compact)) {
      if (!options.skipRetailerFallback) {
        const retailer = await enrichFromRetailerFallback(sku, options);
        if (retailer && retailer.status === "ok") return retailer;
      }
      return {
        status: "not_found",
        sku: normalized.compact,
        brand: BRAND,
        source: SOURCE_OFFICIAL,
        reason: "SKU not present on Michael Kors PDP",
        sourceUrl,
        scrapedAt: new Date().toISOString(),
      };
    }
    const mapped = mapProduct(html, sku, sourceUrl);
    mapped.fetchMode = fromFixture ? "fixture" : "live";
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
  normalizeSku,
  skuMatchKeys,
  resolveProductUrl,
  pdpFromSearchHtml,
  extractBullets,
  extractImages,
  extractJsonLdProduct,
  mapProduct,
  fetchProductHtml,
  enrichFromRetailerFallback,
  enrichSku,
};
