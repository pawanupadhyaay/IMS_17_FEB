const { Product } = require("../models/Product");
const { logActivity } = require("../utils/logActivity");
const { compareProductChanges } = require("../utils/compareProductChanges");
const { recomputeDashboardStats } = require("../utils/recomputeDashboardStats");
const { migrateUrlsToDoSpaces } = require("../utils/doSpacesImageMigrator");

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

// @desc    Import Products and overwrite specifications matching strictly by SKU
// @route   POST /api/import/csv
// @access  Private (Admin/Owner)
const importCSV = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "No CSV file uploaded" });
    }

    const csvText = req.file.buffer.toString("utf-8");
    const parsedLines = parseCSV(csvText);

    if (parsedLines.length < 2) {
      return res.status(400).json({ success: false, message: "CSV file is empty or missing headers" });
    }

    // Extract headers (first line) and normalize to lowercase/trimmed
    const headers = parsedLines[0].map(h => String(h).trim().toLowerCase());
    
    // Find key column positions
    const colIdx = {};
    headers.forEach((h, index) => {
      colIdx[h] = index;
    });

    // Make sure 'sku' exists in headers
    if (colIdx.sku === undefined) {
      return res.status(400).json({ success: false, message: "Required column 'sku' is missing from CSV file" });
    }

    // Group rows by SKU
    const skuGroups = {};
    for (let i = 1; i < parsedLines.length; i++) {
      const row = parsedLines[i];
      if (row.length <= 1 && row[0] === "") continue; // Skip empty rows

      const sku = row[colIdx.sku] ? String(row[colIdx.sku]).trim() : "";
      if (!sku) continue; // Skip rows with blank SKU

      if (!skuGroups[sku]) {
        skuGroups[sku] = [];
      }
      skuGroups[sku].push(row);
    }

    const skus = Object.keys(skuGroups);
    let totalProcessed = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const sku of skus) {
      totalProcessed++;
      try {
        const rows = skuGroups[sku];
        
        // Find primary row (has imagePosition = 1 or is simply the first row)
        let primaryRow = rows[0];
        if (colIdx.imageposition !== undefined) {
          const firstImgRow = rows.find(r => String(r[colIdx.imageposition]).trim() === "1");
          if (firstImgRow) primaryRow = firstImgRow;
        }

        // Aggregate image URLs across all rows for this SKU, sorting by position if available
        const imagesWithPos = [];
        rows.forEach(r => {
          const imgUrl = colIdx.imagesrc !== undefined ? String(r[colIdx.imagesrc]).trim() : "";
          if (imgUrl) {
            const posVal = colIdx.imageposition !== undefined ? parseInt(r[colIdx.imageposition]) : null;
            imagesWithPos.push({
              url: imgUrl,
              position: isNaN(posVal) || posVal === null ? 999 : posVal
            });
          }
        });

        // Sort images by position index
        imagesWithPos.sort((a, b) => a.position - b.position);
        const images = imagesWithPos.map(img => img.url);

        // Find existing product matching this SKU
        const product = await Product.findOne({ sku: new RegExp(`^${sku}$`, "i") });
        
        if (!product) {
          // SKU not found - skipped as per instruction to "track the product only from 'sku column' and change in software"
          skippedCount++;
          continue;
        }

        // Build update object based on primary row values (only if column is present in CSV)
        const updateData = {};

        const stringFields = [
          "title", "brand", "category", "description",
          "caseMaterial", "dialColor", "waterResistance", "warrantyPeriod",
          "movement", "gender", "strapColor", "strapMaterial", "caseShape", "caseSize", "slug"
        ];

        stringFields.forEach(field => {
          const idx = colIdx[field.toLowerCase()];
          if (idx !== undefined && String(primaryRow[idx]).trim() !== "") {
            updateData[field] = String(primaryRow[idx]).trim();
          }
        });

        // Numeric fields
        const numericFields = ["price", "oldprice", "inventory"];
        numericFields.forEach(field => {
          const idx = colIdx[field.toLowerCase()];
          if (idx !== undefined && String(primaryRow[idx]).trim() !== "") {
            const val = parseFloat(primaryRow[idx]);
            if (!isNaN(val)) {
              if (field === "oldprice") {
                updateData.oldPrice = val;
              } else {
                updateData[field] = val;
              }
            }
          }
        });

        // Boolean published state
        const pubIdx = colIdx.ispublished;
        if (pubIdx !== undefined && String(primaryRow[pubIdx]).trim() !== "") {
          const val = String(primaryRow[pubIdx]).trim().toUpperCase();
          updateData.isPublished = val === "TRUE";
        }

        // Images array
        if (images.length > 0) {
          // Migrate any external URLs to DigitalOcean Spaces
          const migratedImages = await migrateUrlsToDoSpaces(images);
          updateData.images = migratedImages;
        }

        // Compare values to track audit changes
        const changes = compareProductChanges(product, updateData);

        if (changes) {
          // Perform database update
          Object.assign(product, updateData);
          await product.save();

          // Log detailed activity asynchronously in background
          logActivity({
            actionType: "UPDATE",
            brand: product.brand || "",
            sku: product.sku || "",
            productId: product._id,
            adminId: req.user.id,
            adminName: req.user.name || "System",
            adminEmail: req.user.email || "",
            metadata: { isCSVImport: true },
            changes: changes
          });

          updatedCount++;
        } else {
          // No changes detected in the spreadsheet
          skippedCount++;
        }

      } catch (err) {
        failedCount++;
        errors.push({ sku, error: err.message });
        console.error(`Import error for SKU ${sku}:`, err);
      }
    }

    // Trigger dashboard stats recalculation in background to match new quantities
    if (updatedCount > 0) {
      setImmediate(async () => {
        try {
          await recomputeDashboardStats();
        } catch (e) {
          console.error("Dashboard recalculation failed after CSV import:", e);
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `CSV import completed. ${updatedCount} products updated, ${skippedCount} skipped, ${failedCount} failed.`,
      data: {
        totalProcessed,
        updatedCount,
        skippedCount,
        failedCount,
        errors
      }
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
