"use strict";

/**
 * Emporio Armani enrichment — official armani.com first, Amazon.in fallback.
 *
 * Official PDP:
 *   https://www.armani.com/en/emporio-armani/{slug}-cod-{SKU}-{COLOR}/
 *   e.g. …/quartz-watch-cod-AR70021-NLP-NLC/
 *   India locale also works: /en-in/emporio-armani/…
 *
 * Resolve order:
 *   1. options.officialUrl / CSV official_url / REF_URLS
 *   2. Fixtures under fixtures/emporio-armani-{SKU}.html
 *   3. Live armani.com fetch (JSON-LD + Nuxt technicalDetails)
 *   4. On official miss/block: Amazon.in → Tata Cliq Luxury → Ethos
 *
 * Prefer armani.com CDN images. Retailer fallbacks for misses. No auto-publish.
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
  normalizeGender,
} = require("../lib/normalize");

const BRAND = "Emporio Armani";
const SITE_ORIGIN = "https://www.armani.com";
const AMAZON_ORIGIN = "https://www.amazon.in";
const SOURCE_OFFICIAL = "emporio-armani";
const SOURCE_AMAZON = "amazon";
const SOURCE_TATA = RETAILER_SOURCE.TATA;
const SOURCE_ETHOS = RETAILER_SOURCE.ETHOS;

const OFFICIAL_FAIL_CODES = new Set([
  "not_found",
  "fetch_failed",
  "error",
  "blocked",
]);

/** Known official PDPs (compact SKU → URL). */
const REF_URLS = {
  AR70021:
    "https://www.armani.com/en/emporio-armani/quartz-watch-cod-AR70021-NLP-NLC/",
};

/** Known Amazon India PDPs (compact SKU → URL). */
const REF_AMAZON = {
  AR70021:
    "https://www.amazon.in/Emporio-Armani-Black-Watch-AR70021/dp/B0H8YBZ2L9",
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
        if (item["@type"] === "Product") return item;
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

/**
 * Armani technicalDetails are a <br>-separated list without labels.
 * Typical watch order (observed for AR70021):
 *   Movement | Dial | Case size | Case material | Strap color | Strap material | Water
 */
function parseArmaniTechnicalDetails(raw) {
  const parts = String(raw || "")
    .split(/<br\s*\/?>/i)
    .map((p) => stripTags(p))
    .map((p) => p.trim())
    .filter(Boolean);

  const attrs = {};
  const leftover = [];

  for (const part of parts) {
    if (/quartz|automatic|mechanical|hand\s*wind|2\s*hand|3\s*hand|chrono/i.test(part)) {
      attrs.movement = part.replace(/\/\s*2\s*hand/i, "").replace(/\s+/g, " ").trim();
      if (/quartz/i.test(part)) attrs.movement = "Quartz";
      else if (/automatic/i.test(part)) attrs.movement = "Automatic";
      continue;
    }
    if (/^\d+(?:\.\d+)?\s*mm$/i.test(part)) {
      attrs.caseSize = part;
      continue;
    }
    if (/\b\d+\s*ATM\b/i.test(part) || /\b\d+\s*m(?:eters?)?\b/i.test(part)) {
      attrs.waterResistance = part;
      continue;
    }
    if (/ceramic|stainless|steel|titanium|gold|leather|rubber|resin|brass/i.test(part)) {
      if (!attrs.caseMaterial && !/bracelet|strap|band/i.test(part)) {
        // "Black Ceramic" as strap often appears after plain "Ceramic" case
        if (/^(black|white|grey|gray|blue|brown|silver|gold)\s+ceramic$/i.test(part)) {
          attrs.strapMaterial = "Ceramic";
          if (!attrs.strapColor) {
            attrs.strapColor = part.split(/\s+/)[0];
          }
        } else if (/leather|rubber|nato|fabric/i.test(part)) {
          attrs.strapMaterial = part;
        } else {
          attrs.caseMaterial = /ceramic/i.test(part)
            ? "Ceramic"
            : /stainless|steel/i.test(part)
              ? "Stainless Steel"
              : part;
        }
      } else if (!attrs.strapMaterial) {
        attrs.strapMaterial = /ceramic/i.test(part)
          ? "Ceramic"
          : /leather/i.test(part)
            ? "Leather"
            : /rubber/i.test(part)
              ? "Rubber"
              : /stainless|steel/i.test(part)
                ? "Stainless Steel"
                : part;
      }
      continue;
    }
    if (
      /^(black|white|blue|brown|silver|gold|grey|gray|green|red|pink|champagne|ivory|beige)$/i.test(
        part
      )
    ) {
      if (!attrs.dialColor) attrs.dialColor = part;
      else if (!attrs.strapColor) attrs.strapColor = part;
      continue;
    }
    leftover.push(part);
  }

  // Positional fallback when pattern matching left gaps
  if (parts.length >= 7) {
    if (!attrs.movement) attrs.movement = parts[0];
    if (!attrs.dialColor) attrs.dialColor = parts[1];
    if (!attrs.caseSize) attrs.caseSize = parts[2];
    if (!attrs.caseMaterial) attrs.caseMaterial = parts[3];
    if (!attrs.strapColor) attrs.strapColor = parts[4];
    if (!attrs.strapMaterial) attrs.strapMaterial = parts[5];
    if (!attrs.waterResistance) attrs.waterResistance = parts[6];
  }

  attrs._parts = parts;
  attrs._leftover = leftover;
  return attrs;
}

function extractArmaniNuxtSpecs(html) {
  const m = String(html || "").match(
    /<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!m) return { attrs: {}, description: "", images: [], skuCode: "" };

  let nuxt;
  try {
    nuxt = JSON.parse(m[1]);
  } catch {
    return { attrs: {}, description: "", images: [], skuCode: "" };
  }
  if (!Array.isArray(nuxt)) {
    return { attrs: {}, description: "", images: [], skuCode: "" };
  }

  let techRaw = "";
  let description = "";
  let skuCode = "";
  const images = [];

  for (let i = 0; i < nuxt.length; i++) {
    const v = nuxt[i];
    if (typeof v === "string") {
      if (
        /<br\s*\/?>/i.test(v) &&
        /\d+\s*mm/i.test(v) &&
        /(quartz|ATM|ceramic|steel)/i.test(v)
      ) {
        techRaw = v;
      }
      if (
        !description &&
        v.length > 80 &&
        v.length < 1200 &&
        /\d+\s*mm/i.test(v) &&
        /case|dial|bracelet|quartz/i.test(v) &&
        !/^https?:/i.test(v)
      ) {
        description = v.replace(/\s+/g, " ").trim();
      }
      if (/^AR\d{4,}[A-Z0-9]*$/i.test(v) && v.length < 24) {
        skuCode = skuCode || v.toUpperCase();
      }
      if (
        /^https:\/\/assets-cf\.armani\.com\/image\/upload\/[^"'?\s]+\.(?:jpe?g|png|webp)$/i.test(
          v
        )
      ) {
        images.push(v);
      }
    }
  }

  // Prefer editorial description pointer when present in productDetails-shaped dicts
  for (const v of nuxt) {
    if (v && typeof v === "object" && !Array.isArray(v) && v.editoralDescription != null) {
      const ed = nuxt[v.editoralDescription];
      if (typeof ed === "string" && ed.length > 40) {
        description = ed.replace(/\s+/g, " ").trim();
      }
      if (v.technicalDetails != null) {
        const td = nuxt[v.technicalDetails];
        if (typeof td === "string") techRaw = td;
        else if (Array.isArray(td) && typeof nuxt[td[0]] === "string") {
          techRaw = nuxt[td[0]];
        }
      }
      if (v.SkuCode != null && typeof nuxt[v.SkuCode] === "string") {
        skuCode = String(nuxt[v.SkuCode]).toUpperCase();
      }
    }
  }

  return {
    attrs: parseArmaniTechnicalDetails(techRaw),
    description,
    images: [...new Set(images)],
    skuCode,
    techRaw,
  };
}

function extractArmaniImages(html, skuCompact) {
  const urls = [];
  const seen = new Set();
  const sku = String(skuCompact || "").toUpperCase();

  const push = (raw) => {
    if (!raw) return;
    let u = decodeEntities(String(raw).trim());
    // Prefer untransformed CDN URLs (strip Cloudinary-style transforms)
    u = u.replace(
      /\/image\/upload\/(?:f_auto[^/]*|q_auto[^/]*|ar_[^/]*|w_\d+|c_fill|,)+\/+/gi,
      "/image/upload/"
    );
    u = absUrl(u);
    if (!/assets-cf\.armani\.com|armani\.com\/image/i.test(u)) return;
    if (sku && !u.toUpperCase().includes(sku)) return;
    if (/logo|icon|sprite|placeholder/i.test(u)) return;
    // Dedupe by filename so versioned + unversioned CDN paths collapse
    const base = u.split("/").pop().split("?")[0].toUpperCase();
    if (!base || seen.has(base)) return;
    seen.add(base);
    urls.push(u);
  };

  const ld = extractJsonLdProduct(html);
  if (ld) {
    const imgs = Array.isArray(ld.image) ? ld.image : ld.image ? [ld.image] : [];
    for (const img of imgs) push(typeof img === "string" ? img : img?.url);
  }

  const nuxt = extractArmaniNuxtSpecs(html);
  for (const img of nuxt.images) push(img);

  const all = String(html || "").match(
    /https:\/\/assets-cf\.armani\.com\/image\/upload\/[^"'?\s>]+\.(?:jpe?g|png|webp)/gi
  );
  if (all) {
    for (const u of all) push(u);
  }

  // Prefer versioned CDN URLs (…/upload/vNNNN/file.jpg) over bare paths
  const preferVersioned = (list) => {
    const byBase = new Map();
    for (const u of list) {
      const base = u.split("/").pop().split("?")[0].toUpperCase();
      const prev = byBase.get(base);
      if (!prev) {
        byBase.set(base, u);
        continue;
      }
      const prevHasV = /\/upload\/v\d+\//i.test(prev);
      const curHasV = /\/upload\/v\d+\//i.test(u);
      if (curHasV && !prevHasV) byBase.set(base, u);
    }
    return [...byBase.values()];
  };

  // Prefer F (front), D (detail), R (rear) order when present
  const rank = (u) => {
    const up = u.toUpperCase();
    if (/_F_/.test(up)) return 1;
    if (/_D_/.test(up)) return 2;
    if (/_R_/.test(up)) return 3;
    return 9;
  };
  return preferVersioned(urls).sort((a, b) => rank(a) - rank(b));
}

function extractGenderFromArmani(html, breadcrumbHint) {
  const pg = match1(html, /productgender=["']([^"']+)/i);
  if (pg) return pg;
  const hay = `${breadcrumbHint || ""} ${html.slice(0, 50000)}`;
  if (/\/woman\/|"woman"|Accessories for woman/i.test(hay)) return "Women";
  if (/\/man\/|"man"|Accessories for man/i.test(hay)) return "Men";
  return "";
}

function inferFromDescription(description, attrs) {
  const d = String(description || "");
  const out = { ...attrs };
  if (!out.caseSize) {
    const m = d.match(/(\d+(?:\.\d+)?)\s*mm/i);
    if (m) out.caseSize = `${m[1]}mm`;
  }
  if (!out.caseMaterial && /ceramic/i.test(d)) out.caseMaterial = "Ceramic";
  if (!out.caseMaterial && /stainless\s*steel/i.test(d)) {
    out.caseMaterial = "Stainless Steel";
  }
  if (!out.strapMaterial && /ceramic\s+bracelet/i.test(d)) {
    out.strapMaterial = "Ceramic";
  }
  if (!out.strapMaterial && /leather/i.test(d)) out.strapMaterial = "Leather";
  if (!out.movement && /quartz/i.test(d)) out.movement = "Quartz";
  if (!out.dialColor) {
    const m = d.match(/\b(black|white|blue|silver|champagne|mother of pearl)\s+sunray\s+dial/i);
    if (m) out.dialColor = m[1];
  }
  if (!out.caseShape && /round\s+case/i.test(d)) out.caseShape = "Round";
  return out;
}

function mapOfficialProduct(html, skuInput, sourceUrl) {
  const sku = normalizeSku(skuInput);
  const ld = extractJsonLdProduct(html);
  const nuxt = extractArmaniNuxtSpecs(html);
  let attrs = inferFromDescription(
    nuxt.description || String(ld?.description || ""),
    nuxt.attrs || {}
  );

  const titleRaw =
    String(ld?.name || "").trim() ||
    match1(html, /property=["']og:title["']\s+content=["']([^"']+)/i)
      .replace(/\s*\|\s*Emporio Armani.*/i, "")
      .trim() ||
    `Emporio Armani ${sku.compact}`;

  const description =
    nuxt.description ||
    String(ld?.description || "").trim() ||
    match1(html, /property=["']og:description["']\s+content=["']([^"']+)/i);

  const title =
    /quartz watch/i.test(titleRaw) && attrs.caseSize
      ? `Emporio Armani ${attrs.dialColor || "Black"} Ceramic ${attrs.caseSize}`.replace(
          /\s+/g,
          " "
        )
      : titleRaw;

  const images = extractArmaniImages(html, sku.compact);
  const genderRaw = extractGenderFromArmani(html, description);

  let officialSku = sku.compact;
  if (nuxt.skuCode) {
    const m = String(nuxt.skuCode).match(/^(AR\d+)/i);
    officialSku = (m ? m[1] : nuxt.skuCode)
      .toUpperCase()
      .replace(/[.\-_\s]/g, "");
  }

  const offer = ld?.offers;
  const priceAmount =
    offer && offer.price != null ? Number(offer.price) : null;
  const priceCurrency = String(offer?.priceCurrency || "USD").toUpperCase();

  if (/ceramic/i.test(attrs.caseMaterial || "")) attrs.caseMaterial = "Ceramic";
  if (/ceramic/i.test(attrs.strapMaterial || "")) attrs.strapMaterial = "Ceramic";
  if (/quartz/i.test(attrs.movement || "")) attrs.movement = "Quartz";

  const { product: normalized, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact,
      officialSku,
      title: title.trim(),
      description,
      caseMaterial: attrs.caseMaterial || "",
      caseShape: attrs.caseShape || "",
      caseSize: normalizeCaseSize(attrs.caseSize || ""),
      dialColor: attrs.dialColor || "",
      waterResistance: attrs.waterResistance || "",
      movement: attrs.movement || "",
      strapMaterial: attrs.strapMaterial || "",
      strapColor: attrs.strapColor || "",
      gender: genderRaw || "",
      warrantyPeriod: "",
      category: "Fashion",
      price: null,
      oldPrice: null,
      priceSource:
        priceAmount != null && Number.isFinite(priceAmount)
          ? {
              amount: priceAmount,
              mrp: priceAmount,
              currency: priceCurrency,
              label:
                priceCurrency === "INR"
                  ? `₹${priceAmount.toLocaleString("en-IN")}`
                  : `${priceCurrency} ${priceAmount}`,
            }
          : null,
      images,
      sourceUrl,
      source: SOURCE_OFFICIAL,
      scrapedAt: new Date().toISOString(),
      rawAttributes: attrs,
      extras: {
        techRaw: nuxt.techRaw || "",
        colorCode: match1(sourceUrl, /cod-AR\d+-([A-Z0-9-]+)/i) || "",
        brandLabel: String(ld?.brand?.name || BRAND),
      },
    });

  if (genderRaw && !normalized.gender) {
    normalized.gender = normalizeGender(genderRaw) || "";
  }

  normalized.fieldMapped = fieldMapped;
  normalized.fieldUnmapped = fieldUnmapped;
  normalized.warnings = normalized.warnings || [];
  if (!normalized.description || normalized.description.length < 40) {
    normalized.warnings.push("description_short_or_missing");
  }
  if (!normalized.images.length) normalized.warnings.push("no_sku_images");
  if (!(attrs._parts || []).length) {
    normalized.warnings.push("tech_attrs_missing");
  }
  if (fieldUnmapped && Object.keys(fieldUnmapped).length) {
    normalized.warnings.push("unmapped_constrained_fields");
  }

  Object.assign(
    normalized,
    buildSeo(normalized, { metaDescription: description })
  );
  return normalized;
}

/* -------------------- Amazon India -------------------- */

function extractAmazonImages(html) {
  const urls = [];
  const seen = new Set();
  const push = (raw) => {
    if (!raw) return;
    let u = decodeEntities(String(raw).trim());
    if (!/^https:\/\/m\.media-amazon\.com\/images\/I\//i.test(u)) return;
    // Prefer hi-res _SL1000_ / drop tiny thumbs
    if (/\._(SS|SX|SY|UX|UY)\d+_/i.test(u) && !/\._SL\d+_/i.test(u)) return;
    u = u.replace(/\._[^.]+_\./, ".");
    // Keep SL1000 when present in original
    const hi = String(raw).match(
      /(https:\/\/m\.media-amazon\.com\/images\/I\/[^"']+\._SL\d+_\.jpg)/i
    );
    if (hi) u = hi[1];
    if (seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };

  const hiRes = String(html || "").matchAll(/"hiRes"\s*:\s*"(https:[^"]+)"/g);
  for (const m of hiRes) push(m[1]);
  const old = String(html || "").matchAll(
    /data-old-hires=["'](https:[^"']+)/g
  );
  for (const m of old) push(m[1]);

  return urls;
}

function cleanAmazonVal(raw) {
  return decodeEntities(String(raw || ""))
    .replace(/&rlm;|&lrm;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAmazonAttrs(html) {
  const attrs = {};
  const text = String(html || "");

  // Prefer <tr><th>Label</th><td>Value</td> pairs (tech / detail tables)
  const tableRows = text.matchAll(
    /<tr[^>]*>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi
  );
  const tableLabelMap = {
    "movement type": "movement",
    movement: "movement",
    "dial colour": "dialColor",
    "dial color": "dialColor",
    "band colour": "strapColor",
    "band color": "strapColor",
    "band material": "strapMaterial",
    "band material type": "strapMaterial",
    "case material": "caseMaterial",
    "case shape": "caseShape",
    "case diameter": "caseSize",
    "water resistance depth": "waterResistance",
    "water resistance level": "waterResistance",
    "water resistance": "waterResistance",
    "display type": "displayType",
    "clasp type": "clasp",
    "closure type": "clasp",
    brand: "brand",
    "model name": "officialSku",
    "model number": "officialSku",
  };
  for (const row of tableRows) {
    const label = cleanAmazonVal(stripTags(row[1])).toLowerCase();
    const value = cleanAmazonVal(stripTags(row[2]));
    if (!label || !value || value.length > 80) continue;
    const field = tableLabelMap[label];
    if (field && !attrs[field]) attrs[field] = value;
  }

  // Detail bullets: "Item model number : AR70021" / "Department : Womens"
  // Amazon wraps labels across newlines with &rlm;/&lrm; entities.
  const bulletMap = [
    ["item model number", "officialSku"],
    ["model number", "officialSku"],
    ["department", "gender"],
  ];
  for (const [label, field] of bulletMap) {
    if (attrs[field]) continue;
    const re = new RegExp(
      `${label}[\\s\\S]{0,200}?:[\\s\\S]{0,120}?<span[^>]*>\\s*([^<]{1,40})\\s*</span>`,
      "i"
    );
    const m = text.match(re);
    if (m) {
      const v = cleanAmazonVal(m[1]);
      if (v && !/[{}]/.test(v) && v.length < 40) attrs[field] = v;
    }
  }

  // Case material near table cell
  if (!attrs.caseMaterial) {
    const caseMat = text.match(
      /Case Material[\s\S]{0,160}?(Ceramic|Stainless Steel|Titanium|Resin)/i
    );
    if (caseMat) attrs.caseMaterial = caseMat[1];
  }

  // Dimensions: 32 x 14 x 8 Millimeters → case size 32mm
  if (!attrs.caseSize) {
    const dims = text.match(
      /Item Dimensions LxWxH[\s\S]{0,200}?(\d+)\s*[x×]\s*\d+\s*[x×]\s*\d+\s*Millimeters/i
    );
    if (dims) attrs.caseSize = `${dims[1]}mm`;
  }
  // Also from "32mm case" marketing copy when tables omit diameter
  if (!attrs.caseSize) {
    const m = text.match(/\b(\d{2}(?:\.\d+)?)\s*mm\s+case\b/i);
    if (m) attrs.caseSize = `${m[1]}mm`;
  }

  // Normalize movement to a short token when Amazon dumps a sentence
  if (attrs.movement && attrs.movement.length > 40) {
    if (/quartz/i.test(attrs.movement)) attrs.movement = "Quartz";
    else if (/automatic/i.test(attrs.movement)) attrs.movement = "Automatic";
    else delete attrs.movement;
  }

  return attrs;
}

function extractAmazonPrice(html) {
  const whole = match1(html, /class=["']a-price-whole["'][^>]*>([\s\S]*?)</i)
    .replace(/[,.\s]/g, "")
    .replace(/<[^>]+>/g, "");
  const frac = match1(html, /class=["']a-price-fraction["'][^>]*>([\s\S]*?)</i);
  if (whole && /^\d+$/.test(whole)) {
    const amount = Number(frac && /^\d+$/.test(frac) ? `${whole}.${frac}` : whole);
    if (Number.isFinite(amount)) {
      return { amount, currency: "INR" };
    }
  }
  const off = match1(html, /"priceAmount"\s*:\s*([0-9.]+)/);
  if (off) {
    const amount = Number(off);
    if (Number.isFinite(amount)) return { amount, currency: "INR" };
  }
  return null;
}

function mapAmazonProduct(html, skuInput, sourceUrl) {
  const sku = normalizeSku(skuInput);
  const attrs = extractAmazonAttrs(html);

  const title =
    match1(html, /id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)
      .replace(/\s+/g, " ")
      .trim() ||
    match1(html, /<title>([^<]+)/i)
      .replace(/\s+at Amazon\.in.*/i, "")
      .replace(/^Buy\s+/i, "")
      .trim() ||
    `Emporio Armani ${sku.compact}`;

  const description =
    stripTags(
      match1(
        html,
        /id=["']productDescription["'][\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i
      )
    ) ||
    stripTags(
      match1(html, /id=["']feature-bullets["'][\s\S]{0,2500}/i)
    ).slice(0, 600) ||
    "";

  const images = extractAmazonImages(html);
  const price = extractAmazonPrice(html);

  let gender = attrs.gender || "";
  if (!gender) {
    const dept = match1(
      html,
      /Department\s*(?:&rlm;)?\s*:\s*(?:&lrm;)?\s*([^<\n]+)/i
    );
    if (dept) gender = dept;
  }
  if (/women|woman|ladies|womens/i.test(gender)) gender = "Women";
  else if (/^men|man|gents|mens/i.test(gender.trim())) gender = "Men";
  else if (/unisex/i.test(gender)) gender = "Unisex";
  else gender = gender.trim();

  let movement = attrs.movement || "";
  if (/quartz/i.test(movement)) movement = "Quartz";

  let caseMaterial = attrs.caseMaterial || "";
  if (/ceramic/i.test(caseMaterial)) caseMaterial = "Ceramic";
  else if (/stainless|steel/i.test(caseMaterial)) {
    caseMaterial = "Stainless Steel";
  }

  let water = attrs.waterResistance || "";
  if (/(\d+)\s*Metres?/i.test(water)) {
    water = water.replace(/(\d+)\s*Metres?/i, "$1 meters");
  }

  const officialSku = String(attrs.officialSku || sku.compact)
    .toUpperCase()
    .replace(/[.\-_\s]/g, "");

  const { product: normalized, mapped: fieldMapped, unmapped: fieldUnmapped } =
    normalizeProductFields({
      status: "ok",
      brand: BRAND,
      sku: sku.compact,
      officialSku,
      title,
      description:
        description ||
        `${title}. Emporio Armani reference ${sku.compact}.`,
      caseMaterial,
      caseShape: attrs.caseShape || "",
      caseSize: normalizeCaseSize(attrs.caseSize || ""),
      dialColor: attrs.dialColor || "",
      waterResistance: water,
      movement,
      strapMaterial: attrs.strapMaterial || "",
      strapColor: attrs.strapColor || "",
      gender,
      warrantyPeriod: "",
      category: "Fashion",
      price: null,
      oldPrice: null,
      priceSource:
        price && Number.isFinite(price.amount)
          ? {
              amount: price.amount,
              mrp: price.amount,
              currency: "INR",
              label: `₹${Number(price.amount).toLocaleString("en-IN")}`,
            }
          : null,
      images,
      sourceUrl,
      source: SOURCE_AMAZON,
      scrapedAt: new Date().toISOString(),
      rawAttributes: attrs,
      extras: {
        asin: match1(html, /"asin"\s*:\s*"([A-Z0-9]{10})"/i) || "",
        clasp: attrs.clasp || "",
        displayType: attrs.displayType || "",
      },
    });

  if (gender && !normalized.gender) {
    normalized.gender = normalizeGender(gender) || "";
  }

  normalized.fieldMapped = fieldMapped;
  normalized.fieldUnmapped = fieldUnmapped;
  normalized.warnings = normalized.warnings || [];
  if (!normalized.images.length) normalized.warnings.push("no_sku_images");
  if (!Object.keys(attrs).length) normalized.warnings.push("attrs_missing");
  if (fieldUnmapped && Object.keys(fieldUnmapped).length) {
    normalized.warnings.push("unmapped_constrained_fields");
  }

  Object.assign(
    normalized,
    buildSeo(normalized, {
      metaDescription: normalized.description,
    })
  );
  return normalized;
}

/* -------------------- Fetch / resolve -------------------- */

function isArmaniPdpHtml(html) {
  if (!html || html.length < 1500) return false;
  if (/application\/ld\+json/i.test(html) && /Emporio Armani/i.test(html)) {
    return true;
  }
  if (/__NUXT_DATA__/i.test(html) && /AR\d{4,}/i.test(html)) return true;
  if (/assets-cf\.armani\.com\/image\/upload/i.test(html)) return true;
  return false;
}

function isAmazonPdpHtml(html) {
  if (!html || html.length < 2000) return false;
  if (/id=["']productTitle["']/i.test(html)) return true;
  if (/amazon\.in/i.test(html) && /"asin"\s*:/i.test(html)) return true;
  return false;
}

function isBlockedHtml(html) {
  if (!html) return true;
  if (/Robot Check|enter the characters you see|api-services-support@amazon/i.test(html)) {
    return true;
  }
  if (/Access Denied|cf-browser-verification|Just a moment|Attention Required/i.test(html)) {
    return true;
  }
  if (html.length < 1500 && /captcha|challenge/i.test(html)) return true;
  return false;
}

function fixturePathForSku(fixtureDir, sku, kind = "official") {
  if (!fixtureDir) return null;
  const { compact } = normalizeSku(sku);
  const names =
    kind === "amazon"
      ? [
          `amazon-${compact}.html`,
          `amazon-in-${compact}.html`,
          `${compact}-amazon.html`,
        ]
      : [
          `emporio-armani-${compact}.html`,
          `armani-${compact}.html`,
          `${compact}.html`,
          `${compact.toLowerCase()}.html`,
        ];
  for (const name of names) {
    const candidate = path.join(fixtureDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function readFixtureHtml(filePath, sourceUrl) {
  const html = fs.readFileSync(filePath, "utf8");
  return {
    html,
    sourceUrl:
      sourceUrl ||
      match1(html, /property=["']og:url["']\s+content=["']([^"']+)/i) ||
      `file://${path.resolve(filePath)}`,
    fromFixture: true,
  };
}

function resolveOfficialUrl(sku, options = {}) {
  if (options.officialUrl) return options.officialUrl;
  const { compact } = normalizeSku(sku);
  if (options.refUrls && options.refUrls[compact]) {
    return options.refUrls[compact];
  }
  if (REF_URLS[compact]) return REF_URLS[compact];
  return null;
}

function resolveAmazonUrl(sku, options = {}) {
  if (options.amazonUrl) return options.amazonUrl;
  const { compact } = normalizeSku(sku);
  if (options.refAmazon && options.refAmazon[compact]) {
    return options.refAmazon[compact];
  }
  if (REF_AMAZON[compact]) return REF_AMAZON[compact];
  return null;
}

/**
 * Soft search on armani.com for a PDP link containing the SKU.
 * Note: search often returns HTTP 404 with a still-usable body — parse anyway.
 */
async function searchOfficialUrl(sku, options = {}) {
  const { compact } = normalizeSku(sku);
  const queries = [
    `${SITE_ORIGIN}/en/search/?q=${encodeURIComponent(compact)}`,
    `${SITE_ORIGIN}/en-in/search/?q=${encodeURIComponent(compact)}`,
  ];
  for (const searchUrl of queries) {
    try {
      const res = await fetchText(searchUrl, {
        timeoutMs: options.timeoutMs || 45000,
        headers: {
          Referer: `${SITE_ORIGIN}/en/`,
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (!res.text) continue;
      const re = new RegExp(
        `https?://(?:www\\.)?armani\\.com/[^"'\\s]*cod-${compact}-[^"'\\s/]+/?`,
        "i"
      );
      const m = res.text.match(re);
      if (m) return m[0].split("&")[0];
      const re2 = new RegExp(
        `/[a-z]{2}(?:-[a-z]{2})?/emporio-armani/[^"'\\s]*cod-${compact}-[^"'\\s/]+/?`,
        "i"
      );
      const m2 = res.text.match(re2);
      if (m2) return absUrl(m2[0]);
    } catch {
      /* next */
    }
  }
  return null;
}

/**
 * Candidate official PDP URLs when search/REF miss.
 * Live pattern: …/emporio-armani/{slug}-cod-{SKU}-{COLOR}/
 */
function guessOfficialUrls(sku) {
  const { compact } = normalizeSku(sku);
  // Prefer the live ROW pattern that works for most catalog SKUs first.
  const locales = ["en", "en-in"];
  const slugs = ["quartz-watch", "watch", "automatic-watch", "chronograph-watch"];
  const colors = ["NLP-NLC", "NLN-NLN", "NLB-NLB", "NLC-NLC"];
  const urls = [];
  for (const loc of locales) {
    for (const slug of slugs) {
      for (const color of colors) {
        urls.push(
          `${SITE_ORIGIN}/${loc}/emporio-armani/${slug}-cod-${compact}-${color}/`
        );
      }
    }
  }
  return urls;
}

async function tryFetchOfficialPdp(url, options = {}) {
  const res = await fetchText(url, {
    timeoutMs: options.timeoutMs || 45000,
    retries: options.retries != null ? options.retries : 1,
    headers: {
      Referer: `${SITE_ORIGIN}/en/`,
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (
    res.ok &&
    res.text &&
    !isBlockedHtml(res.text) &&
    isArmaniPdpHtml(res.text)
  ) {
    return {
      html: res.text,
      sourceUrl: res.url || url,
      fromFixture: false,
    };
  }
  return null;
}

async function fetchOfficialHtml(sku, options = {}) {
  if (options.htmlPath && !options.amazonOnly) {
    return readFixtureHtml(options.htmlPath, options.officialUrl);
  }
  if (options.preferFixture) {
    const fp = fixturePathForSku(options.fixtureDir, sku, "official");
    if (fp) return readFixtureHtml(fp, options.officialUrl);
  }

  const candidates = [];
  const resolved = resolveOfficialUrl(sku, options);
  if (resolved) candidates.push(resolved);
  // Guess before site search — Armani search often 404s without PDP links.
  if (!options.skipUrlGuess) {
    for (const g of guessOfficialUrls(sku)) {
      if (!candidates.includes(g)) candidates.push(g);
    }
  }

  let lastUrl = null;
  let lastRes = null;
  let tried = 0;

  async function tryList(urls) {
    for (const url of urls) {
      lastUrl = url;
      tried += 1;
      try {
        const hit = await tryFetchOfficialPdp(url, {
          ...options,
          retries: tried <= 2 ? 2 : 0,
        });
        if (hit) return hit;
        lastRes = { url };
      } catch (err) {
        lastRes = { url, err };
      }
    }
    return null;
  }

  const hit = await tryList(candidates);
  if (hit) return hit;

  if (!options.skipSearch) {
    const searched = await searchOfficialUrl(sku, options);
    if (searched && !candidates.includes(searched)) {
      const searchHit = await tryList([searched]);
      if (searchHit) return searchHit;
    }
  }

  const fp = fixturePathForSku(options.fixtureDir, sku, "official");
  if (fp) return readFixtureHtml(fp, lastUrl || options.officialUrl);

  if (!candidates.length) {
    throw Object.assign(
      new Error(`not_found: no Emporio Armani official PDP for ${sku}`),
      { code: "not_found", sourceUrl: null }
    );
  }

  throw Object.assign(
    new Error(
      `not_found: no Emporio Armani official PDP for ${sku}${
        lastUrl ? ` (tried ${tried} urls, last ${lastUrl})` : ""
      }`
    ),
    {
      code: "not_found",
      sourceUrl: lastUrl || null,
      detail: lastRes || null,
    }
  );
}

async function fetchAmazonHtml(sku, options = {}) {
  if (options.amazonHtmlPath) {
    return readFixtureHtml(options.amazonHtmlPath, options.amazonUrl);
  }
  if (options.preferFixture || options.preferAmazonFixture) {
    const fp = fixturePathForSku(options.fixtureDir, sku, "amazon");
    if (fp) return readFixtureHtml(fp, options.amazonUrl);
  }

  const url = resolveAmazonUrl(sku, options);
  if (!url) {
    const fp = fixturePathForSku(options.fixtureDir, sku, "amazon");
    if (fp) return readFixtureHtml(fp, options.amazonUrl);
    throw Object.assign(
      new Error(`not_found: no Amazon.in URL for Emporio Armani ${sku}`),
      { code: "not_found", sourceUrl: null }
    );
  }

  const res = await fetchText(url, {
    timeoutMs: options.timeoutMs || 45000,
    headers: {
      Referer: "https://www.amazon.in/",
      "Accept-Language": "en-IN,en;q=0.9",
    },
  });

  if (
    !res.ok ||
    !res.text ||
    isBlockedHtml(res.text) ||
    !isAmazonPdpHtml(res.text)
  ) {
    const fp = fixturePathForSku(options.fixtureDir, sku, "amazon");
    if (fp) return readFixtureHtml(fp, url);
    throw Object.assign(
      new Error(
        `fetch_failed: Amazon HTTP ${res.status || "?"} / blocked for ${url}`
      ),
      {
        code: isBlockedHtml(res.text) ? "blocked" : "fetch_failed",
        sourceUrl: url,
      }
    );
  }

  return {
    html: res.text,
    sourceUrl: res.url || url,
    fromFixture: false,
  };
}

async function enrichFromAmazon(sku, options = {}) {
  const normalized = normalizeSku(sku);
  try {
    const { html, sourceUrl, fromFixture } = await fetchAmazonHtml(sku, options);
    const hay = html.toUpperCase().replace(/[.\-_\s]/g, "");
    if (!hay.includes(normalized.compact)) {
      return {
        status: "not_found",
        sku: normalized.compact,
        brand: BRAND,
        source: SOURCE_AMAZON,
        reason: "SKU not present on Amazon PDP",
        sourceUrl,
        scrapedAt: new Date().toISOString(),
      };
    }
    const mapped = mapAmazonProduct(html, sku, sourceUrl);
    mapped.fetchMode = fromFixture ? "fixture" : "live";
    return mapped;
  } catch (err) {
    return {
      status: err.code || "error",
      sku: normalized.compact,
      brand: BRAND,
      source: SOURCE_AMAZON,
      reason: err.message,
      sourceUrl: err.sourceUrl || null,
      scrapedAt: new Date().toISOString(),
    };
  }
}

async function enrichFromRetailerFallback(sku, options = {}) {
  const { product } = await enrichFromRetailerChain(sku, {
    ...options,
    brandHint: BRAND,
    preset: "armani",
    fixtureDir:
      options.fixtureDir || path.join(__dirname, "..", "fixtures"),
  });
  return product;
}

async function tryMissFallbacks(sku, options = {}) {
  if (!options.skipAmazonFallback) {
    const amazon = await enrichFromAmazon(sku, options);
    if (amazon && amazon.status === "ok") return amazon;
  }
  if (!options.skipRetailerFallback) {
    const retailer = await enrichFromRetailerFallback(sku, options);
    if (retailer && retailer.status === "ok") return retailer;
  }
  return null;
}

async function enrichSku(sku, options = {}) {
  const normalized = normalizeSku(sku);

  if (options.amazonOnly) {
    return enrichFromAmazon(sku, options);
  }
  if (options.tataCliqOnly || options.ethosOnly) {
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
    const { html, sourceUrl, fromFixture } = await fetchOfficialHtml(
      sku,
      options
    );
    const hay = html.toUpperCase().replace(/[.\-_\s]/g, "");
    if (!hay.includes(normalized.compact)) {
      const recovered = await tryMissFallbacks(sku, options);
      if (recovered) return recovered;
      return {
        status: "not_found",
        sku: normalized.compact,
        brand: BRAND,
        source: SOURCE_OFFICIAL,
        reason: "SKU not present on Armani PDP",
        sourceUrl,
        scrapedAt: new Date().toISOString(),
      };
    }
    const mapped = mapOfficialProduct(html, sku, sourceUrl);
    mapped.fetchMode = fromFixture ? "fixture" : "live";
    if (options.delayMs) await sleep(options.delayMs);
    return mapped;
  } catch (err) {
    if (OFFICIAL_FAIL_CODES.has(err.code || "error")) {
      const recovered = await tryMissFallbacks(sku, options);
      if (recovered) return recovered;
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
  AMAZON_ORIGIN,
  SOURCE_OFFICIAL,
  SOURCE_AMAZON,
  SOURCE_TATA,
  SOURCE_ETHOS,
  REF_URLS,
  REF_AMAZON,
  normalizeSku,
  skuMatchKeys,
  resolveOfficialUrl,
  resolveAmazonUrl,
  parseArmaniTechnicalDetails,
  extractArmaniNuxtSpecs,
  extractArmaniImages,
  extractAmazonImages,
  extractAmazonAttrs,
  mapOfficialProduct,
  mapAmazonProduct,
  fetchOfficialHtml,
  fetchAmazonHtml,
  enrichFromAmazon,
  enrichFromRetailerFallback,
  enrichSku,
};
