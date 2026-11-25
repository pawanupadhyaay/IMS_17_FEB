"use strict";

const { mergeProductFields, scrapedToIncoming } = require("./merge");

const IMPORT_HEADERS = [
  "title",
  "brand",
  "sku",
  "category",
  "price",
  "oldPrice",
  "inventory",
  "description",
  "caseMaterial",
  "dialColor",
  "waterResistance",
  "warrantyPeriod",
  "movement",
  "gender",
  "strapColor",
  "strapMaterial",
  "caseShape",
  "caseSize",
  "imageSrc",
  "imagePosition",
  "slug",
  "isPublished",
];

function escapeCSV(value) {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function lookupExisting(sku, options) {
  if (!sku) return null;
  if (options.existing) return options.existing;
  const map = options.existingBySku;
  if (!map || typeof map.get !== "function") return null;
  const key = String(sku);
  return (
    map.get(key) ||
    map.get(key.toLowerCase()) ||
    map.get(key.toUpperCase()) ||
    null
  );
}

/**
 * Apply staff-wins merge so CSV cells for already-set fields are blank.
 * IMS import only writes non-empty cells — blank = leave staff data alone.
 */
function productForCsvRow(product, options = {}) {
  const existing = lookupExisting(product.sku, options);

  if (!existing) {
    return {
      fields: {
        sku: product.sku,
        brand: product.brand || "Balmain",
        title: product.title || "",
        category: product.category || "",
        description: product.description || "",
        caseMaterial: product.caseMaterial || "",
        dialColor: product.dialColor || "",
        waterResistance: product.waterResistance || "",
        warrantyPeriod: product.warrantyPeriod || "",
        movement: product.movement || "",
        gender: product.gender || "",
        strapColor: product.strapColor || "",
        strapMaterial: product.strapMaterial || "",
        caseShape: product.caseShape || "",
        caseSize: product.caseSize || "",
        slug: product.slug || "",
        price: product.price,
        oldPrice: product.oldPrice,
      },
      images:
        Array.isArray(product.images) && product.images.length
          ? product.images
          : [""],
      merge: null,
    };
  }

  const incoming = scrapedToIncoming(product);
  if (!options.includePrice) {
    delete incoming.price;
    delete incoming.oldPrice;
  }
  delete incoming.inventory;

  const merge = mergeProductFields(existing, incoming, {
    forceOverwrite: Boolean(options.forceOverwrite),
  });

  const fields = {
    sku: product.sku,
    brand: merge.patch.brand || "",
    title: merge.patch.title || "",
    category: merge.patch.category || "",
    description: merge.patch.description || "",
    caseMaterial: merge.patch.caseMaterial || "",
    dialColor: merge.patch.dialColor || "",
    waterResistance: merge.patch.waterResistance || "",
    warrantyPeriod: merge.patch.warrantyPeriod || "",
    movement: merge.patch.movement || "",
    gender: merge.patch.gender || "",
    strapColor: merge.patch.strapColor || "",
    strapMaterial: merge.patch.strapMaterial || "",
    caseShape: merge.patch.caseShape || "",
    caseSize: merge.patch.caseSize || "",
    slug: merge.patch.slug || "",
    price: merge.patch.price,
    oldPrice: merge.patch.oldPrice,
  };

  // Images only when merge says fill; otherwise one blank imageSrc row for text fields
  const images =
    merge.patch.images && merge.patch.images.length
      ? merge.patch.images
      : [""];

  return { fields, images, merge };
}

function rowFromFields(fields, imageSrc, imagePosition, options = {}) {
  const includePrice = Boolean(options.includePrice);
  const isPrimary = imagePosition === 1;

  return [
    isPrimary ? fields.title || "" : "",
    isPrimary ? fields.brand || "" : "",
    fields.sku || "",
    isPrimary ? fields.category || "" : "",
    isPrimary && includePrice && fields.price != null ? String(fields.price) : "",
    isPrimary && includePrice && fields.oldPrice != null
      ? String(fields.oldPrice)
      : "",
    "", // inventory — never invent; leave for IMS
    isPrimary ? fields.description || "" : "",
    isPrimary ? fields.caseMaterial || "" : "",
    isPrimary ? fields.dialColor || "" : "",
    isPrimary ? fields.waterResistance || "" : "",
    isPrimary ? fields.warrantyPeriod || "" : "",
    isPrimary ? fields.movement || "" : "",
    isPrimary ? fields.gender || "" : "",
    isPrimary ? fields.strapColor || "" : "",
    isPrimary ? fields.strapMaterial || "" : "",
    isPrimary ? fields.caseShape || "" : "",
    isPrimary ? fields.caseSize || "" : "",
    imageSrc || "",
    String(imagePosition),
    isPrimary ? fields.slug || "" : "",
    isPrimary ? "FALSE" : "",
  ];
}

/**
 * Build IMS import CSV text. One row per image (sku repeated), matching
 * GET /api/import/sample headers.
 *
 * Options:
 *   includePrice, forceOverwrite,
 *   existingBySku: Map(sku -> existing product) for staff-wins blanking
 *
 * Returns a string. Also attaches `.mergeReport` array for callers that care.
 */
function toImportCsv(products, options = {}) {
  const lines = [IMPORT_HEADERS.map(escapeCSV).join(",")];
  const mergeReport = [];

  for (const raw of products) {
    if (raw.status && raw.status !== "ok") continue;
    const { fields, images, merge } = productForCsvRow(raw, options);
    if (merge) {
      mergeReport.push({
        sku: raw.sku,
        fill: merge.fill,
        skip: merge.skip,
        isNew: merge.isNew,
        forceOverwrite: merge.forceOverwrite,
      });
    }

    const writePrice =
      Boolean(options.includePrice) && fields.price != null;

    images.forEach((src, idx) => {
      lines.push(
        rowFromFields(fields, src, idx + 1, { includePrice: writePrice })
          .map(escapeCSV)
          .join(",")
      );
    });
  }

  const csv = new String(lines.join("\n") + "\n");
  csv.mergeReport = mergeReport;
  return csv;
}

module.exports = {
  IMPORT_HEADERS,
  escapeCSV,
  toImportCsv,
  productForCsvRow,
};
