const { Product } = require("../models/Product");
const { Brand } = require("../models/Brand");
const ActivityLog = require("../models/ActivityLog");
const { compareProductChanges } = require("../utils/compareProductChanges");
const { recomputeDashboardStats } = require("../utils/recomputeDashboardStats");
const { migrateUrlsToDoSpaces } = require("../utils/doSpacesImageMigrator");
const { hasMinimalStorefrontData } = require("../utils/storeEligibility");
const { generateProductSlug } = require("../utils/slugify");
const { clearBrandsCache } = require("./productController");

// Zero-dependency CSV parser that safely respects quotes, escaped quotes, embedded commas and newlines
function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        // Escaped double-quotes: ""
        row[row.length - 1] += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push("");
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

// Escapes CSV values properly
const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// @desc    Download Reference Sample CSV template
// @route   GET /api/import/sample
// @access  Public
const downloadSampleCSV = async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="sample-inventory-import.csv"'
    );

    const headers = [
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
      "isPublished"
    ];

    // Write header line
    res.write(headers.map(escapeCSV).join(",") + "\n");

    // Sample data rows (1st watch: Rolex Submariner with 2 images on 2 rows; 2nd watch: Seiko 5 Sports with 1 image on 1 row)
    const sampleRows = [
      [
        "Rolex Submariner Date",
        "Rolex",
        "RLX-SUB-100",
        "Luxury",
        "1250000",
        "1350000",
        "5",
        "A premium watch crafted from Oystersteel featuring a black dial and a cerachrom bezel.",
        "Oystersteel",
        "Black",
        "300m",
        "5 Years",
        "Automatic",
        "Men",
        "Silver",
        "Oystersteel",
        "Round",
        "41mm",
        "https://sgp1.digitaloceanspaces.com/samaywatch-assets/ims/rolex-sub-1.jpg",
        "1",
        "rolex-submariner-date",
        "TRUE"
      ],
      [
        "", // Blank for multi-row image references
        "",
        "RLX-SUB-100", // Associated SKU
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "https://sgp1.digitaloceanspaces.com/samaywatch-assets/ims/rolex-sub-2.jpg",
        "2",
        "",
        ""
      ],
      [
        "Seiko 5 Sports Automatic",
        "Seiko",
        "SKO-5SP-200",
        "Sport",
        "28500",
        "32000",
        "12",
        "Classic Seiko automatic mechanical watch with standard military dial design and calendar.",
        "Stainless Steel",
        "Deep Blue",
        "100m",
        "2 Years",
        "Automatic",
        "Men",
        "Blue",
        "Nylon Fabric",
        "Round",
        "42.5mm",
        "https://sgp1.digitaloceanspaces.com/samaywatch-assets/ims/seiko-5-1.jpg",
        "1",
        "seiko-5-sports-automatic",
        "TRUE"
      ]
    ];

    for (const r of sampleRows) {
      res.write(r.map(escapeCSV).join(",") + "\n");
    }

    res.end();
  } catch (error) {
    console.error("Sample CSV download error:", error);
    res.status(500).json({ message: "Failed to download sample CSV template" });
  }
};

// Header aliases: sheet column names (lowercase, spaces/underscores/dashes removed) -> our field key
const HEADER_ALIASES = {
  sku: ["sku", "itemcode", "modelnumber", "modelno", "variantsku"],
  title: ["title", "productname", "name"],
  brand: ["brand", "vendor"],
  price: ["price", "sellingprice", "variantprice"],
  oldprice: ["oldprice", "compareatprice", "variantcompareatprice"],
  inventory: ["inventory", "stock", "qty", "quantity", "variantinventoryqty"],
  imagesrc: ["imagesrc", "imageurl", "image"],
  imageposition: ["imageposition"],
  ispublished: ["ispublished", "published"],
};

const STRING_FIELDS = [
  "title", "brand", "category", "description",
  "caseMaterial", "dialColor", "waterResistance", "warrantyPeriod",
  "movement", "gender", "strapColor", "strapMaterial", "caseShape", "caseSize", "slug"
];

const WATCH_TYPE_CATEGORIES = ["Analog", "Digital", "Automatic", "Quartz"];

const normalizeHeader = (h) => String(h || "").replace(/^﻿/, "").trim().toLowerCase().replace(/[\s_\-]+/g, "");

// Map every header to a column index; the first matching column wins
function buildColumnIndex(headerRow) {
  const colIdx = {};
  const normalized = headerRow.map(normalizeHeader);
  normalized.forEach((h, index) => {
    if (h && colIdx[h] === undefined) colIdx[h] = index;
  });
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (colIdx[key] !== undefined) continue;
    const found = aliases.find((a) => colIdx[a] !== undefined);
    if (found) colIdx[key] = colIdx[found];
  }
  return colIdx;
}

const cellOf = (row, idx) => (idx === undefined || row[idx] === undefined ? "" : String(row[idx]).trim());

// "₹1,25,000" / "Rs. 4,999.00" -> number; "" -> undefined; anything else -> NaN
function parseNumberCell(raw) {
  const cleaned = raw.replace(/^rs\.?/i, "").replace(/[₹,\s]/g, "");
  if (cleaned === "") return undefined;
  return Number(cleaned);
}

function parseBooleanCell(raw) {
  const v = raw.toLowerCase();
  if (["true", "yes", "y", "1"].includes(v)) return true;
  if (["false", "no", "n", "0"].includes(v)) return false;
  return null;
}

// Read one SKU group into the fields to save. Returns { data, images, problems }
function readSkuGroup(rows, colIdx) {
  const problems = [];
  const data = {};

  // Primary row: the one with imagePosition 1, else the first row
  let primary = rows[0].cells;
  if (colIdx.imageposition !== undefined) {
    const first = rows.find((r) => cellOf(r.cells, colIdx.imageposition) === "1");
    if (first) primary = first.cells;
  }

  STRING_FIELDS.forEach((field) => {
    const value = cellOf(primary, colIdx[field.toLowerCase()]);
    if (value !== "") data[field] = value;
  });

  const numeric = [["price", "price", "Price"], ["oldprice", "oldPrice", "Old price"], ["inventory", "inventory", "Inventory"]];
  numeric.forEach(([col, field, label]) => {
    const raw = cellOf(primary, colIdx[col]);
    const num = parseNumberCell(raw);
    if (num === undefined) return;
    if (!Number.isFinite(num)) {
      problems.push(`${label} "${raw}" is not a number`);
    } else if (num < 0) {
      problems.push(`${label} cannot be negative (${raw})`);
    } else if (field === "inventory" && !Number.isInteger(num)) {
      problems.push(`Inventory must be a whole number (${raw})`);
    } else {
      data[field] = num;
    }
  });

  const pubRaw = cellOf(primary, colIdx.ispublished);
  if (pubRaw !== "") {
    const pub = parseBooleanCell(pubRaw);
    if (pub === null) problems.push(`isPublished "${pubRaw}" should be TRUE or FALSE`);
    else data.isPublished = pub;
  }

  // Images from every row of this SKU, ordered by imagePosition
  const imagesWithPos = [];
  rows.forEach((r) => {
    const url = cellOf(r.cells, colIdx.imagesrc);
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
      problems.push(`Row ${r.rowNumber}: image "${url.slice(0, 60)}" is not a valid link`);
      return;
    }
    const pos = parseInt(cellOf(r.cells, colIdx.imageposition));
    imagesWithPos.push({ url, position: Number.isNaN(pos) ? 999 : pos });
  });
  imagesWithPos.sort((a, b) => a.position - b.position);
  const images = [...new Set(imagesWithPos.map((i) => i.url))];
  if (images.length > 0) data.images = images;

  return { data, images, problems };
}

// Move external image links to DigitalOcean one product at a time, after the response is sent.
// Only replaces images that nobody has changed in the meantime.
function migrateImportImagesInBackground(jobs) {
  if (jobs.length === 0) return;
  setImmediate(async () => {
    for (const { productId, images } of jobs) {
      try {
        const needsMigration = images.some((img) => /^https?:\/\//i.test(img) && !img.includes("digitaloceanspaces.com"));
        if (!needsMigration) continue;
        const migrated = await migrateUrlsToDoSpaces(images);
        if (JSON.stringify(migrated) !== JSON.stringify(images)) {
          await Product.updateOne({ _id: productId, images }, { $set: { images: migrated } });
        }
      } catch (err) {
        console.error(`CSV import image migration failed for product ${productId}:`, err.message);
      }
    }
  });
}

function notifyBackInStockInBackground(productIds) {
  if (productIds.length === 0) return;
  setImmediate(async () => {
    const { checkAndNotifyBackInStock } = require("../utils/notificationService");
    for (const { id, inventory } of productIds) {
      await checkAndNotifyBackInStock(id, inventory);
    }
  });
}

const writeErrorSku = (we) => {
  const op = typeof we.getOperation === "function" ? we.getOperation() : we.err?.op;
  return op?.sku || op?.q?._id || null;
};

const friendlyDbError = (msg = "") => {
  if (/E11000/.test(msg) && /slug/.test(msg)) return "Slug is already used by another product";
  if (/E11000/.test(msg) && /sku/.test(msg)) return "SKU already exists";
  return msg || "Could not be saved";
};

// @desc    Import products from CSV: updates existing SKUs, creates new ones,
//          saves every valid SKU and reports the invalid ones with row numbers
// @route   POST /api/import/csv
// @access  Private (IMS)
const importCSV = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "No CSV file uploaded" });
    }

    const csvText = req.file.buffer.toString("utf-8").replace(/^﻿/, "");
    const parsedLines = parseCSV(csvText);

    if (parsedLines.length < 2) {
      return res.status(400).json({ success: false, message: "CSV file is empty or missing headers" });
    }

    const colIdx = buildColumnIndex(parsedLines[0]);
    if (colIdx.sku === undefined) {
      return res.status(400).json({ success: false, message: "Required column 'sku' is missing from CSV file" });
    }

    const errors = [];
    const addError = (row, sku, error) => errors.push({ row, sku, error });

    // Group rows by SKU (case-insensitive), keeping spreadsheet row numbers (header = row 1)
    const groups = new Map();
    for (let i = 1; i < parsedLines.length; i++) {
      const cells = parsedLines[i];
      const rowNumber = i + 1;
      if (cells.every((c) => String(c).trim() === "")) continue;

      const sku = cellOf(cells, colIdx.sku);
      if (!sku) {
        addError(String(rowNumber), "", "SKU is empty");
        continue;
      }
      const key = sku.toLowerCase();
      if (!groups.has(key)) groups.set(key, { sku, rows: [] });
      groups.get(key).rows.push({ rowNumber, cells });
    }

    const skus = [...groups.values()].map((g) => g.sku);

    // One query for every SKU in the sheet
    const existingProducts = skus.length
      ? await Product.find({ sku: { $in: skus } }).collation({ locale: "en", strength: 2 }).lean()
      : [];
    const existingBySku = new Map();
    existingProducts.forEach((p) => {
      const key = String(p.sku || "").trim().toLowerCase();
      if (key && !existingBySku.has(key)) existingBySku.set(key, p);
    });

    // Brand master for new products' category, same rule as the product save hook
    const brandCategory = new Map();
    (await Brand.find({}).select("name category").lean()).forEach((b) => {
      if (b.name) brandCategory.set(b.name.trim().toLowerCase(), b.category);
    });

    const updateOps = [];
    const updateMeta = [];
    const newDocs = [];
    const newMeta = [];
    let unchangedCount = 0;

    for (const [key, group] of groups) {
      const rowLabel = group.rows.map((r) => r.rowNumber).join(", ");
      const { data, images, problems } = readSkuGroup(group.rows, colIdx);
      const existing = existingBySku.get(key);

      if (!existing && !data.brand) {
        problems.push("Brand is required to create a new product");
      }
      if (problems.length > 0) {
        addError(rowLabel, group.sku, problems.join("; "));
        continue;
      }

      if (existing) {
        const merged = { ...existing, ...data };
        const changes = compareProductChanges(existing, merged);
        const otherChanged =
          (data.title !== undefined && data.title !== (existing.title || "")) ||
          (data.slug !== undefined && data.slug !== (existing.slug || "")) ||
          (data.strapMaterial !== undefined && data.strapMaterial !== (existing.strapMaterial || "")) ||
          (data.isPublished !== undefined && data.isPublished !== existing.isPublished);
        if (!changes && !otherChanged) {
          unchangedCount++;
          continue;
        }
        updateOps.push({ updateOne: { filter: { _id: existing._id }, update: { $set: data } } });
        updateMeta.push({ rowLabel, sku: existing.sku, existing, data, changes, images });
      } else {
        const doc = { ...data, sku: group.sku, user: req.user.id };
        if (doc.oldPrice === undefined) doc.oldPrice = doc.price || 0;
        if (doc.isPublished === undefined) doc.isPublished = hasMinimalStorefrontData(doc);
        const cat = brandCategory.get(doc.brand.toLowerCase());
        if (cat && (!doc.category || WATCH_TYPE_CATEGORIES.includes(doc.category))) {
          if (WATCH_TYPE_CATEGORIES.includes(doc.category) && !doc.movement) doc.movement = doc.category;
          doc.category = cat;
        }
        if (!doc.slug) doc.slug = generateProductSlug(doc.brand, doc.sku);
        newDocs.push(doc);
        newMeta.push({ rowLabel, sku: group.sku, images });
      }
    }

    // ---- Save updates (one round trip) ----
    const failedUpdateSkus = new Set();
    if (updateOps.length > 0) {
      try {
        await Product.bulkWrite(updateOps, { ordered: false });
      } catch (err) {
        const writeErrors = [].concat(err.writeErrors || err.result?.getWriteErrors?.() || []);
        if (writeErrors.length === 0) throw err;
        writeErrors.forEach((we) => {
          const meta = updateMeta[we.index];
          if (!meta) return;
          failedUpdateSkus.add(meta.sku);
          addError(meta.rowLabel, meta.sku, friendlyDbError(we.errmsg || we.err?.errmsg));
        });
      }
    }
    const savedUpdates = updateMeta.filter((m) => !failedUpdateSkus.has(m.sku));

    // ---- Save new products (one round trip) ----
    let savedNew = [];
    if (newDocs.length > 0) {
      let insertError = null;
      try {
        await Product.insertMany(newDocs, { ordered: false });
      } catch (err) {
        insertError = err;
      }
      // Read back what actually got created, so the counts are exact
      const created = await Product.find({ sku: { $in: newDocs.map((d) => d.sku) } })
        .select("_id sku brand inventory")
        .lean();
      const createdBySku = new Map(created.map((p) => [p.sku, p]));
      const reasonBySku = new Map();
      [].concat(insertError?.writeErrors || []).forEach((we) => {
        const sku = writeErrorSku(we);
        if (sku) reasonBySku.set(sku, friendlyDbError(we.errmsg || we.err?.errmsg));
      });
      newMeta.forEach((meta) => {
        const p = createdBySku.get(meta.sku);
        if (p) savedNew.push({ ...meta, product: p });
        else addError(meta.rowLabel, meta.sku, reasonBySku.get(meta.sku) || friendlyDbError(insertError?.message));
      });
    }

    // ---- Background work: activity log, images, alerts, dashboard ----
    const admin = { adminId: req.user.id, adminName: req.user.name || "System", adminEmail: req.user.email || "" };
    const logs = [
      ...savedUpdates.map((m) => ({
        actionType: "UPDATE", entityType: "PRODUCT", brand: m.data.brand || m.existing.brand || "", sku: m.sku,
        productId: m.existing._id, ...admin, metadata: { isCSVImport: true }, changes: m.changes,
      })),
      ...savedNew.map((m) => ({
        actionType: "CREATE", entityType: "PRODUCT", brand: m.product.brand || "", sku: m.sku,
        productId: m.product._id, ...admin, metadata: { isCSVImport: true },
      })),
    ];
    if (logs.length > 0) {
      setImmediate(async () => {
        try {
          await ActivityLog.insertMany(logs, { ordered: false });
        } catch (e) {
          console.error("CSV import activity log insert failed:", e.message);
        }
      });
    }

    const imageJobs = [
      ...savedUpdates.filter((m) => m.images.length > 0).map((m) => ({ productId: m.existing._id, images: m.images })),
      ...savedNew.filter((m) => m.images.length > 0).map((m) => ({ productId: m.product._id, images: m.images })),
    ];
    migrateImportImagesInBackground(imageJobs);

    notifyBackInStockInBackground(
      savedUpdates
        .filter((m) => m.data.inventory > 0 && m.data.inventory !== m.existing.inventory)
        .map((m) => ({ id: m.existing._id, inventory: m.data.inventory }))
    );

    const updatedCount = savedUpdates.length;
    const createdCount = savedNew.length;
    if (updatedCount > 0 || createdCount > 0) {
      clearBrandsCache();
      setImmediate(async () => {
        try {
          await recomputeDashboardStats();
        } catch (e) {
          console.error("Dashboard recalculation failed after CSV import:", e);
        }
      });
    }

    errors.sort((a, b) => parseInt(a.row) - parseInt(b.row));
    const failedCount = errors.length;

    res.status(200).json({
      success: true,
      message: `CSV import completed. ${createdCount} created, ${updatedCount} updated, ${unchangedCount} unchanged, ${failedCount} with errors.`,
      data: {
        totalProcessed: groups.size,
        createdCount,
        updatedCount,
        unchangedCount,
        skippedCount: unchangedCount,
        failedCount,
        imagesInBackground: imageJobs.length,
        errors,
      },
    });
  } catch (error) {
    console.error("CSV Import overall handler error:", error);
    res.status(500).json({ success: false, message: "Import failed", error: error.message });
  }
};

module.exports = {
  downloadSampleCSV,
  importCSV
};
