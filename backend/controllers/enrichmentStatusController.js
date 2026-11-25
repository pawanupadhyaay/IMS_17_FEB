"use strict";

const { Product } = require("../models/Product");
const {
  BRAND_CONFIG,
  getBrandConfig,
  buildBrandStatus,
  resolveBatchDir,
} = require("../utils/enrichmentStatus");

function unpublishedBrandFilter(brandLabel, reqUser) {
  const filter = {
    isPublished: false,
    brand: new RegExp(`^${brandLabel}$`, "i"),
    sku: { $exists: true, $nin: [null, ""] },
  };

  if (reqUser && (reqUser.role === "staff" || reqUser.role === "Staff")) {
    const allowed = reqUser.allowedBrands || [];
    if (allowed.length === 0) {
      filter.brand = "__NO_ASSIGNED_BRANDS__";
    } else if (
      !allowed.map((b) => String(b).toLowerCase()).includes(brandLabel.toLowerCase())
    ) {
      filter.brand = "__NOT_AUTHORIZED_BRAND__";
    }
  }

  return filter;
}

async function fetchUnpublishedForBrand(brandLabel, reqUser) {
  return Product.find(unpublishedBrandFilter(brandLabel, reqUser))
    .select("_id sku title brand")
    .lean();
}

// @desc    Enrichment progress summary for all pipeline brands
// @route   GET /api/enrichment/status
// @access  Private (IMS)
const getEnrichmentStatus = async (req, res) => {
  try {
    const includeSkus =
      req.query.include === "skus" ||
      req.query.includeSkus === "true" ||
      req.query.includeSkus === "1";

    const brands = [];
    for (const config of BRAND_CONFIG) {
      const products = await fetchUnpublishedForBrand(config.label, req.user);
      brands.push(buildBrandStatus(config, products, { includeSkus }));
    }

    const totals = brands.reduce(
      (acc, b) => {
        acc.total += b.total;
        acc.done += b.done;
        acc.left += b.left;
        acc.failed += b.failed;
        return acc;
      },
      { total: 0, done: 0, left: 0, failed: 0 }
    );

    res.json({
      success: true,
      data: {
        brands,
        totals,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Enrichment status failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to load enrichment status",
    });
  }
};

// @desc    Enrichment progress for one brand (always includes SKU lists)
// @route   GET /api/enrichment/status/:brand
// @access  Private (IMS)
const getEnrichmentBrandStatus = async (req, res) => {
  try {
    const config = getBrandConfig(req.params.brand);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Unknown enrichment brand "${req.params.brand}". Supported: ${BRAND_CONFIG.map(
          (b) => b.label
        ).join(", ")}`,
      });
    }

    const products = await fetchUnpublishedForBrand(config.label, req.user);
    const detail = buildBrandStatus(config, products, { includeSkus: true });

    res.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error("Enrichment brand status failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to load brand enrichment status",
    });
  }
};

// @desc    List enrichable brand keys
// @route   GET /api/enrichment/brands
// @access  Private (IMS)
const getEnrichmentBrands = async (req, res) => {
  res.json({
    success: true,
    data: {
      brands: BRAND_CONFIG.map((b) => ({
        key: b.key,
        brand: b.label,
        batchPresent: Boolean(resolveBatchDir(b.key)),
      })),
    },
  });
};

module.exports = {
  getEnrichmentStatus,
  getEnrichmentBrandStatus,
  getEnrichmentBrands,
};
