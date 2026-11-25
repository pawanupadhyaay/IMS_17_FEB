"use strict";

function truncate(str, max) {
  const s = String(str || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trim()}…`;
}

/** Compact IMS SKU + dotted brand form (e.g. B48303382 / B4830.33.82). */
function skuForms(rawSku) {
  const original = String(rawSku || "").trim();
  const compact = original.toUpperCase().replace(/[\s.\-_]/g, "");
  let dotted = original.toUpperCase().replace(/\s+/g, "");
  const m = compact.match(/^(B)(\d{4})(\d{2})(\d{2})$/i);
  if (m) dotted = `${m[1]}${m[2]}.${m[3]}.${m[4]}`.toUpperCase();
  const forms = [];
  if (compact) forms.push(compact);
  if (dotted && dotted !== compact) forms.push(dotted);
  return { compact, dotted, forms };
}

function ensureSkuForms(text, forms, max) {
  let out = String(text || "").trim();
  for (const form of forms) {
    if (form && !out.toUpperCase().includes(form.toUpperCase())) {
      out = out ? `${out} ${form}` : form;
    }
  }
  return truncate(out, max);
}

function buildSeo(product, options = {}) {
  const brand = product.brand || "Balmain";
  const { compact, dotted, forms } = skuForms(product.sku);
  const titleCore = product.title || product.sku || "Watch";
  const titleForSeo = new RegExp(`^${brand}\\b`, "i").test(titleCore)
    ? titleCore
    : `${brand} ${titleCore}`;
  const seoTitle = ensureSkuForms(`${titleForSeo} | Samay Watch`, forms, 70);

  const descSource =
    options.metaDescription ||
    product.description ||
    `${brand} ${titleCore}${product.caseSize ? ` ${product.caseSize}` : ""}${
      product.movement ? `, ${product.movement}` : ""
    }.`;
  const seoDescription = ensureSkuForms(descSource, forms, 160);

  const keywords = [
    brand,
    compact,
    dotted !== compact ? dotted : null,
    product.sku,
    product.title,
    product.caseSize,
    product.movement,
    product.gender,
    product.dialColor,
    "Swiss watch",
    "Samay Watch",
  ]
    .filter(Boolean)
    .map((k) => String(k).trim())
    .filter((v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);

  return {
    seoTitle,
    seoDescription,
    seoKeywords: keywords.join(", "),
    seoImage: (product.images && product.images[0]) || "",
  };
}

module.exports = { buildSeo, truncate, skuForms };
