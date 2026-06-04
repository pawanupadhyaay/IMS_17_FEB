const { Product } = require("../models/Product");
const ActivityLog = require("../models/ActivityLog");
const { Readable } = require("stream");

// Helper function to escape CSV values
const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// @desc    Export products to CSV (streaming - memory efficient for large datasets)
// @route   GET /api/export/csv
// @access  Private
const exportToCSV = async (req, res) => {
  try {
    const { brand, category, search, page, limit, exportType, stockFilter, ids } = req.query;

    // Build filter
    const filter = {};
    if (ids) {
      const idArray = Array.isArray(ids) ? ids : String(ids).split(',').map(id => id.trim());
      filter._id = { $in: idArray };
    } else {
      if (brand) filter.brand = new RegExp(`^${brand}$`, "i");
      if (category) filter.category = new RegExp(`^${category}$`, "i");
      if (search) {
        const searchRegex = new RegExp(search, "i");
        filter.$or = [
          { brand: searchRegex },
          { sku: searchRegex },
          { category: searchRegex },
          { description: searchRegex },
        ];
      }

      // Apply stockFilter: "moreThanOne" (inventory > 1) or "zero" (inventory === 0)
      if (stockFilter === "moreThanOne") {
        filter.inventory = { $gt: 1 };
      } else if (stockFilter === "zero") {
        filter.inventory = 0;
      }
    }

    // Set response headers for streaming
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="inventory-export-${Date.now()}.csv"`
    );

    // CSV headers based on exportType
    let headers;
    if (exportType === "simple") {
      headers = ["SKU", "Price", "Inventory"];
    } else if (exportType === "website") {
      headers = [
        "Title",
        "Brand",
        "SKU",
        "Category",
        "Price",
        "Description",
        "Inventory",
        "Case Material",
        "Dial Color",
        "Water Resistance",
        "Warranty Period",
        "Movement",
        "Gender",
        "Strap Color",
        "Strap Material",
        "Case Shape",
        "Case Size",
        "Image Src",
        "Image Position"
      ];
    } else {
      headers = [
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
    }

    // Write headers
    res.write(headers.map(escapeCSV).join(",") + "\n");

    // Build query - apply projection & optional pagination
    let query = Product.find(filter);
    if (exportType === "simple") {
      query = query.select("sku price inventory");
    } else if (exportType === "website") {
      query = query.select("title brand sku category price description inventory caseMaterial dialColor waterResistance warrantyPeriod movement gender strapColor strapMaterial caseShape caseSize images");
    } else {
      query = query.select("title brand sku category price oldPrice inventory description caseMaterial dialColor waterResistance warrantyPeriod movement gender strapColor strapMaterial caseShape caseSize images slug isPublished");
    }

    if (page && limit && page !== "all") {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      query = query.skip(skip).limit(parseInt(limit));
    }

    const cursor = query.lean().cursor();

    let rowCount = 0;
    for await (const product of cursor) {
      if (exportType === "simple") {
        const row = [
          product.sku || "",
          product.price || 0,
          product.inventory || 0,
        ];
        res.write(row.map(escapeCSV).join(",") + "\n");
        rowCount++;
      } else if (exportType === "website") {
        const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
        
        if (images.length === 0) {
          const row = [
            product.title || "",
            product.brand || "",
            product.sku || "",
            product.category || "",
            product.price || 0,
            product.description || "",
            product.inventory || 0,
            product.caseMaterial || "",
            product.dialColor || "",
            product.waterResistance || "",
            product.warrantyPeriod || "",
            product.movement || "",
            product.gender || "",
            product.strapColor || "",
            product.strapMaterial || "",
            product.caseShape || "",
            product.caseSize || "",
            "", // Image Src
            ""  // Image Position
          ];
          res.write(row.map(escapeCSV).join(",") + "\n");
          rowCount++;
        } else {
          for (let i = 0; i < images.length; i++) {
            let row;
            if (i === 0) {
              row = [
                product.title || "",
                product.brand || "",
                product.sku || "",
                product.category || "",
                product.price || 0,
                product.description || "",
                product.inventory || 0,
                product.caseMaterial || "",
                product.dialColor || "",
                product.waterResistance || "",
                product.warrantyPeriod || "",
                product.movement || "",
                product.gender || "",
                product.strapColor || "",
                product.strapMaterial || "",
                product.caseShape || "",
                product.caseSize || "",
                images[i], // Image Src
                1          // Image Position
              ];
            } else {
              row = [
                "", // Title
                "", // Brand
                product.sku || "", // SKU
                "", // Category
                "", // Price
                "", // Description
                "", // Inventory
                "", // Case Material
                "", // Dial Color
                "", // Water Resistance
                "", // Warranty Period
                "", // Movement
                "", // Gender
                "", // Strap Color
                "", // Strap Material
                "", // Case Shape
                "", // Case Size
                images[i], // Image Src
                i + 1      // Image Position
              ];
            }
            res.write(row.map(escapeCSV).join(",") + "\n");
            rowCount++;
          }
        }
      } else {
        const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
        
        if (images.length === 0) {
          const row = [
            product.title || "",
            product.brand || "",
            product.sku || "",
            product.category || "",
            product.price || 0,
            product.oldPrice || product.price || 0,
            product.inventory || 0,
            product.description || "",
            product.caseMaterial || "",
            product.dialColor || "",
            product.waterResistance || "",
            product.warrantyPeriod || "",
            product.movement || "",
            product.gender || "",
            product.strapColor || "",
            product.strapMaterial || "",
            product.caseShape || "",
            product.caseSize || "",
            "", // imageSrc
            "", // imagePosition
            product.slug || "",
            product.isPublished ? "TRUE" : "FALSE"
          ];
          res.write(row.map(escapeCSV).join(",") + "\n");
          rowCount++;
        } else {
          for (let i = 0; i < images.length; i++) {
            let row;
            if (i === 0) {
              row = [
                product.title || "",
                product.brand || "",
                product.sku || "",
                product.category || "",
                product.price || 0,
                product.oldPrice || product.price || 0,
                product.inventory || 0,
                product.description || "",
                product.caseMaterial || "",
                product.dialColor || "",
                product.waterResistance || "",
                product.warrantyPeriod || "",
                product.movement || "",
                product.gender || "",
                product.strapColor || "",
                product.strapMaterial || "",
                product.caseShape || "",
                product.caseSize || "",
                images[i], // imageSrc
                1,         // imagePosition
                product.slug || "",
                product.isPublished ? "TRUE" : "FALSE"
              ];
            } else {
              row = [
                "", // Title
                "", // Brand
                product.sku || "", // SKU
                "", // Category
                "", // Price
                "", // Old Price
                "", // Inventory
                "", // Description
                "", // Case Material
                "", // Dial Color
                "", // Water Resistance
                "", // Warranty Period
                "", // Movement
                "", // Gender
                "", // Strap Color
                "", // Strap Material
                "", // Case Shape
                "", // Case Size
                images[i], // imageSrc
                i + 1,     // imagePosition
                "", // Slug
                ""  // isPublished
              ];
            }
            res.write(row.map(escapeCSV).join(",") + "\n");
            rowCount++;
          }
        }
      }

      // Flush every 100 rows to prevent buffer buildup
      if (rowCount % 100 === 0) {
        res.flushHeaders?.();
      }
    }

    res.end();
  } catch (error) {
    console.error("CSV Export Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    } else {
      res.end();
    }
  }
};

// @desc    Export activity logs to CSV (streaming - memory efficient for large datasets)
// @route   GET /api/export/activity-logs/csv
// @access  Private
const exportActivityLogsToCSV = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10000, // Large limit for export
      brand,
      action,
      actionType,
      admin,
      adminId,
      search,
      startDate,
      endDate,
    } = req.query;

    // Build dynamic filter object (same logic as getActivityLogs)
    const filter = {};

    if (brand) {
      filter.brand = new RegExp(`^${brand}$`, "i");
    }

    const actionFilter = action || actionType;
    if (actionFilter) {
      filter.actionType = actionFilter;
    }

    const adminFilter = admin || adminId;
    if (adminFilter) {
      filter.adminId = adminFilter;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { brand: searchRegex },
        { sku: searchRegex },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateTime;
      }
    }

    // Set response headers for streaming
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="activity-logs-export-${Date.now()}.csv"`
    );

    // CSV headers
    const headers = [
      "Brand",
      "SKU",
      "Action",
      "Admin Name",
      "Admin Email",
      "Timestamp",
    ];

    // Write headers
    res.write(headers.map(escapeCSV).join(",") + "\n");

    // Stream activity logs from database (memory efficient)
    const cursor = ActivityLog.find(filter)
      .select("brand sku actionType adminName adminEmail createdAt")
      .sort({ createdAt: -1 })
      .lean()
      .cursor();

    let rowCount = 0;
    for await (const log of cursor) {
      const timestamp = log.createdAt
        ? new Date(log.createdAt).toISOString()
        : "";
      const row = [
        log.brand || "",
        log.sku || "",
        log.actionType || "",
        log.adminName || "",
        log.adminEmail || "",
        timestamp,
      ];

      res.write(row.map(escapeCSV).join(",") + "\n");
      rowCount++;

      // Flush every 100 rows to prevent buffer buildup
      if (rowCount % 100 === 0) {
        res.flushHeaders?.();
      }
    }

    res.end();
  } catch (error) {
    console.error("Activity Logs CSV Export Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    } else {
      res.end();
    }
  }
};

module.exports = {
  exportToCSV,
  exportActivityLogsToCSV,
};

