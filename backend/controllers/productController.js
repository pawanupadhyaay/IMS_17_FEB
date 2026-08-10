const mongoose = require("mongoose");
const { Product, validateProduct } = require("../models/Product");
const DashboardStats = require("../models/DashboardStats");
const ActivityLog = require("../models/ActivityLog");
const { logActivity } = require("../utils/logActivity");
const { migrateLegacyImages, migrateLegacyImagesInline } = require("../utils/migrateLegacyImages");
const { compareProductChanges } = require("../utils/compareProductChanges");
const { isStorefrontEligible, hasMinimalStorefrontData } = require("../utils/storeEligibility");
const { migrateUrlsToDoSpaces, migrateUrlsToDoSpacesInBackground } = require("../utils/doSpacesImageMigrator");

// Keep image sequence deterministic and sync first image as primary.
const normalizeImageList = (images) => {
  if (!Array.isArray(images)) return [];
  const seen = new Set();
  return images
    .map((img) => (typeof img === "string" ? img.trim() : ""))
    .filter((img) => {
      if (!img || seen.has(img)) return false;
      seen.add(img);
      return true;
    });
};

const applyImageNormalization = (payload) => {
  if (!payload || typeof payload !== "object") return payload;

  if (Array.isArray(payload.images)) {
    const seen = new Set();
    payload.images = payload.images
      .map((img) => (typeof img === "string" ? img.trim() : ""))
      .filter((img) => {
        if (!img || seen.has(img)) return false;
        seen.add(img);
        return true;
      });
    // Schema has only images[]; first = primary for dashboard IMAGE column
  }

  return payload;
};

// @desc    Get all products with filters and pagination
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      brand,
      category,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = req.query;

    // Build filter
    const filter = {};
    
    // Scoped Brand whitelisting permissions for staff members
    if (req.user && (req.user.role === 'staff' || req.user.role === 'Staff')) {
      const allowedBrands = req.user.allowedBrands || [];
      if (allowedBrands.length > 0) {
        if (brand) {
          if (!allowedBrands.map(b => b.toLowerCase()).includes(brand.toLowerCase())) {
            filter.brand = "__NOT_AUTHORIZED_BRAND__";
          } else {
            filter.brand = new RegExp(`^${brand}$`, "i");
          }
        } else {
          filter.brand = { $in: allowedBrands.map(b => new RegExp(`^${b}$`, "i")) };
        }
      } else {
        filter.brand = "__NO_ASSIGNED_BRANDS__";
      }
    } else {
      if (brand) {
        filter.brand = new RegExp(`^${brand}$`, "i");
      }
    }
    if (category) {
      filter.category = new RegExp(`^${category}$`, "i");
    }
    if (search) {
      // Optimize search: use text index if available, otherwise regex
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { title: searchRegex },
        { brand: searchRegex },
        { sku: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
      ];
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    let sortObj = {};
    if (sortBy === "title") {
      sortObj = {
        brand: sortOrder === "asc" ? 1 : -1,
        title: sortOrder === "asc" ? 1 : -1,
      };
    } else {
      sortObj = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    }

    // Get products with projection - only fetch fields needed for list view
    // Include legacy fields for migration: imageUrl, image.url
    // This reduces payload size significantly (especially for 10k+ products)
    const projection = "title brand sku category inventory price oldPrice images imageUrl image.url createdAt warrantyPeriod";
    const products = await Product.find(filter)
      .select(projection)
      .sort(sortObj)
      .collation({ locale: "en", strength: 2 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Debug: Log to verify images are included
    if (products.length > 0) {
      console.log('GET /api/products - Sample product images:', products[0].images);
    }

    // Get total count
    const total = await Product.countDocuments(filter);

    // Get stats for all matching products (beyond current page)
    let brandStats = null;
    if (brand || search || category || startDate || endDate) {
      const statsAggregation = await Product.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalInventory: {
              $sum: { $convert: { input: "$inventory", to: "double", onError: 0, onNull: 0 } },
            },
            totalValue: {
              $sum: {
                $multiply: [
                  { $convert: { input: "$price", to: "double", onError: 0, onNull: 0 } },
                  { $convert: { input: "$inventory", to: "double", onError: 0, onNull: 0 } },
                ],
              },
            },
          },
        },
      ]);
      brandStats = statsAggregation[0] || { totalProducts: 0, totalInventory: 0, totalValue: 0 };
    }

    res.json({
      success: true,
      data: products,
      brandStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
const getProduct = async (req, res) => {
  try {
    // Include legacy fields for migration: imageUrl, image.url
    const product = await Product.findById(req.params.id)
      .select('brand sku category inventory price oldPrice images imageUrl image.url description title caseMaterial dialColor waterResistance warrantyPeriod movement gender strapColor caseShape caseSize strapMaterial createdAt updatedAt')
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Debug: Log to verify images are included
    console.log('GET /api/products/:id - Product images:', product.images);
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private
// @route   POST /api/products
// @access  Private
const createProduct = async (req, res) => {
  try {
    const { error } = validateProduct(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Default behavior: oldPrice = price when product is created
    const productData = {
      ...req.body,
      user: req.user.id,
    };

    applyImageNormalization(productData);

    productData.isPublished = hasMinimalStorefrontData(productData);

    // If oldPrice not provided, set it to price
    if (productData.oldPrice === undefined || productData.oldPrice === null || productData.oldPrice === 0) {
      productData.oldPrice = productData.price || 0;
    }

    const product = await Product.create(productData);

    // Trigger background DO Spaces migration for any external/local image URLs
    if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
      migrateUrlsToDoSpacesInBackground(product._id, productData.images);
    }

    // Clear brands cache when new product is created
    clearBrandsCache();

    // Trigger background stats update
    updateDashboardStatsInBackground();

    // Log activity (non-blocking)
    console.log('Activity log triggered: CREATE', product.sku || 'N/A')
    logActivity({
      actionType: 'CREATE',
      brand: product.brand || '',
      sku: product.sku || '',
      productId: product._id,
      adminId: req.user.id,
      adminName: req.user.name || 'Unknown',
      adminEmail: req.user.email || '',
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update product (full update)
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const { error } = validateProduct(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Fetch existing product to get previous price
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const previousPrice = currentProduct.price || 0;
    const updateData = { ...req.body };

    applyImageNormalization(updateData);

    // Handle oldPrice logic based on checkbox and price change
    if (updateData.price !== undefined) {
      const priceChanged = updateData.price !== previousPrice;

      if (updateData.samePriceChecked === true) {
        // If checkbox checked: oldPrice = new price
        updateData.oldPrice = updateData.price;
      } else if (priceChanged) {
        // If checkbox not checked and price changed: oldPrice = previous price
        updateData.oldPrice = previousPrice;
      }
    }

    // Remove samePriceChecked from updateData (it's not a database field)
    delete updateData.samePriceChecked;

    const mergedForStore = { ...currentProduct.toObject(), ...updateData };
    updateData.isPublished = hasMinimalStorefrontData(mergedForStore);

    // Track changes before updating
    const changes = compareProductChanges(currentProduct, updateData);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Trigger background DO Spaces migration for any external/local image URLs
    if (updateData.images && Array.isArray(updateData.images) && updateData.images.length > 0) {
      migrateUrlsToDoSpacesInBackground(product._id, updateData.images);
    }

    // Clear brands cache if brand was updated
    if (req.body.brand !== undefined) {
      clearBrandsCache();
    }

    // Trigger background stats update
    updateDashboardStatsInBackground();

    // Log activity (non-blocking) with changes
    console.log('Activity log triggered: UPDATE', product.sku || 'N/A')
    logActivity({
      actionType: 'UPDATE',
      brand: product.brand || '',
      sku: product.sku || '',
      productId: product._id,
      adminId: req.user.id,
      adminName: req.user.name || 'Unknown',
      adminEmail: req.user.email || '',
      changes: changes,
    });

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Partially update product (optimized for minimal payload)
// @route   PATCH /api/products/:id
// @access  Private
const patchProduct = async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const { id } = req.params;
    const updates = req.body;

    if (Array.isArray(updates.images)) {
      console.log(`[${requestId}] PATCH req.body.images (incoming):`, updates.images.length, updates.images);
    }

    // Validate only provided fields
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Fetch existing product to get previous price and calculate changes
    const currentProduct = await Product.findById(id);
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const previousPrice = currentProduct.price || 0;

    // Build update object with $set for partial updates
    const updateObj = {};
    const allowedFields = [
      "brand",
      "title",
      "sku",
      "category",
      "inventory",
      "price",
      "oldPrice",
      "description",
      "images",
      "samePriceChecked",
      // Product Details (flat fields)
      "caseMaterial",
      "dialColor",
      "waterResistance",
      "warrantyPeriod",
      "movement",
      "gender",
      "strapColor",
      "caseShape",
      "caseSize",
      "strapMaterial",
    ];

    for (const key of Object.keys(updates)) {
      if (!allowedFields.includes(key)) continue;
      updateObj[key] = updates[key];
    }
    applyImageNormalization(updateObj);

    // Handle oldPrice logic based on checkbox and price change
    if (updates.price !== undefined) {
      const priceChanged = updates.price !== previousPrice;

      if (updates.samePriceChecked === true) {
        // If checkbox checked: oldPrice = new price
        updateObj.oldPrice = updates.price;
      } else if (priceChanged) {
        // If checkbox not checked and price changed: oldPrice = previous price
        updateObj.oldPrice = previousPrice;
      }
    }

    if (Object.keys(updateObj).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    // Remove samePriceChecked from updateObj (it's not a database field)
    delete updateObj.samePriceChecked;

    // Create a temporary product object with updates to compare changes & publish status
    const updatedProductData = { ...currentProduct.toObject(), ...updateObj };
    updateObj.isPublished = hasMinimalStorefrontData(updatedProductData);

    // Track changes before updating
    const changes = compareProductChanges(currentProduct, updatedProductData);

    // Single atomic database update
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateObj },
      { new: true, runValidators: true }
    ).lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Trigger background DO Spaces migration for any external/local image URLs
    if (updateObj.images && Array.isArray(updateObj.images) && updateObj.images.length > 0) {
      migrateUrlsToDoSpacesInBackground(id, updateObj.images);
    }

    // Clear brands cache if brand was updated
    if (updates.brand !== undefined) {
      clearBrandsCache();
    }

    // Trigger background stats update
    updateDashboardStatsInBackground();

    console.log(`[${requestId}] PATCH done - saved product.images:`, product?.images);

    // Log activity (non-blocking) with changes
    logActivity({
      actionType: 'UPDATE',
      brand: product.brand || '',
      sku: product.sku || '',
      productId: product._id,
      adminId: req.user.id,
      adminName: req.user.name || 'Unknown',
      adminEmail: req.user.email || '',
      changes: changes,
    });

    // Return full product immediately
    res.json({ success: true, data: product });
  } catch (error) {
    // Handle duplicate SKU error
    if (error.code === 11000) {
      return res.status(400).json({ message: "SKU already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk partially update products
// @route   PATCH /api/products/bulk/update
// @access  Private
const bulkPatchProducts = async (req, res) => {
  const requestId = `${Date.now()}-bulk-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const { ids, data: updates } = req.body;

    // Automatically migrate any pasted external image URLs to DigitalOcean Spaces in bulk update
    if (updates && updates.images && Array.isArray(updates.images)) {
      updates.images = await migrateUrlsToDoSpaces(updates.images);
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No product IDs provided" });
    }
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Filter allowed fields
    const allowedFields = [
      "brand", "title", "sku", "category", "inventory", "price", "oldPrice", 
      "description", "images", "samePriceChecked", "caseMaterial", "dialColor", 
      "waterResistance", "warrantyPeriod", "movement", "gender", "strapColor", 
      "caseShape", "caseSize", "strapMaterial"
    ];

    const updateObj = {};
    for (const key of Object.keys(updates)) {
      if (!allowedFields.includes(key)) continue;
      updateObj[key] = updates[key];
    }
    applyImageNormalization(updateObj);
    
    if (Object.keys(updateObj).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const samePriceChecked = updateObj.samePriceChecked;
    delete updateObj.samePriceChecked;

    // Fetch all products to process logic (oldPrice, isPublished, activity logging)
    const products = await Product.find({ _id: { $in: ids } });
    if (products.length === 0) {
      return res.status(404).json({ message: "No matching products found" });
    }

    const bulkOps = [];
    const activityLogs = [];
    let brandUpdated = updates.brand !== undefined;

    for (const currentProduct of products) {
      const productUpdateObj = { ...updateObj };
      const previousPrice = currentProduct.price || 0;

      if (productUpdateObj.price !== undefined) {
        const priceChanged = productUpdateObj.price !== previousPrice;
        if (samePriceChecked === true) {
          productUpdateObj.oldPrice = productUpdateObj.price;
        } else if (priceChanged) {
          productUpdateObj.oldPrice = previousPrice;
        }
      }

      // Check publish eligibility
      const updatedProductData = { ...currentProduct.toObject(), ...productUpdateObj };
      const eligible = hasMinimalStorefrontData(updatedProductData);
      productUpdateObj.isPublished = eligible;

      // Track changes
      const changes = compareProductChanges(currentProduct, updatedProductData);

      bulkOps.push({
        updateOne: {
          filter: { _id: currentProduct._id },
          update: { $set: productUpdateObj }
        }
      });

      activityLogs.push({
        actionType: 'UPDATE',
        entityType: 'PRODUCT',
        brand: updatedProductData.brand || '',
        sku: updatedProductData.sku || '',
        productId: currentProduct._id,
        adminId: req.user.id,
        adminName: req.user.name || 'Unknown',
        adminEmail: req.user.email || '',
        metadata: { isBulk: true },
        changes: changes
      });
    }

    // Execute bulk DB updates
    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps, { ordered: false });
    }

    // Execute bulk Activity Log insertions
    if (activityLogs.length > 0) {
      // Async so we don't block response
      setImmediate(async () => {
        try {
          await ActivityLog.insertMany(activityLogs, { ordered: false });
        } catch(e) {
           console.error("Bulk ActivityLog insert failed", e);
        }
      });
    }

    if (brandUpdated) clearBrandsCache();
    updateDashboardStatsInBackground();

    res.json({ success: true, message: `${products.length} products updated successfully` });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "SKU conflict during bulk update" });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk delete products
// @route   POST /api/products/bulk/delete
// @access  Private
const bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No product IDs provided" });
    }

    const products = await Product.find({ _id: { $in: ids } });
    if (products.length === 0) {
      return res.status(404).json({ message: "No matching products found" });
    }

    // Perform deletion
    await Product.deleteMany({ _id: { $in: ids } });

    // Activity Logs
    const activityLogs = products.map(product => ({
      actionType: 'DELETE',
      entityType: 'PRODUCT',
      brand: product.brand || '',
      sku: product.sku || '',
      productId: product._id,
      adminId: req.user.id,
      adminName: req.user.name || 'Unknown',
      adminEmail: req.user.email || '',
      metadata: { isBulk: true },
    }));

    if (activityLogs.length > 0) {
      setImmediate(async () => {
        try {
          await ActivityLog.insertMany(activityLogs, { ordered: false });
        } catch(e) {
          console.error("Bulk ActivityLog insert failed", e);
        }
      });
    }

    clearBrandsCache();
    updateDashboardStatsInBackground();

    res.json({ success: true, message: `${products.length} products deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Clear brands cache when product is deleted
    clearBrandsCache();

    // Trigger background stats update
    updateDashboardStatsInBackground();

    // Log activity (non-blocking) - log before product is deleted
    console.log('Activity log triggered: DELETE', product.sku || 'N/A')
    logActivity({
      actionType: 'DELETE',
      brand: product.brand || '',
      sku: product.sku || '',
      productId: product._id,
      adminId: req.user.id,
      adminName: req.user.name || 'Unknown',
      adminEmail: req.user.email || '',
    });

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Simple in-memory cache for brands (cleared on product create/update/delete)
let brandsCache = null;
let brandsCacheTime = null;
const BRANDS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// @desc    Get unique brands
// @route   GET /api/products/brands/list
// @access  Private
const getBrands = async (req, res) => {
  try {
    // Return cached brands if available and not expired
    const now = Date.now();
    if (brandsCache && brandsCacheTime && (now - brandsCacheTime) < BRANDS_CACHE_TTL) {
      return res.json({ success: true, data: brandsCache });
    }

    // Fetch brands from database (using index for faster query)
    const brands = await Product.distinct("brand", { brand: { $ne: "" } });
    const sortedBrands = brands.sort();

    // Cache the result
    brandsCache = sortedBrands;
    brandsCacheTime = now;

    res.json({ success: true, data: sortedBrands });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to clear brands cache (call after product create/update/delete)
const clearBrandsCache = () => {
  brandsCache = null;
  brandsCacheTime = null;
};

// Background function to update dashboard stats (non-blocking)
const updateDashboardStatsInBackground = async () => {
  // Run in background without blocking the response
  setImmediate(async () => {
    try {
      const inv = {
        $convert: { input: "$inventory", to: "double", onError: 0, onNull: 0 },
      };
      const prc = {
        $convert: { input: "$price", to: "double", onError: 0, onNull: 0 },
      };

      const stats = await Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStock: { $sum: inv },
            totalStoreValue: {
              $sum: {
                $multiply: [
                  // Business rule: Σ(price of in-stock products)
                  { $cond: [{ $gt: [inv, 0] }, prc, 0] },
                  1
                ]
              }
            },
            outOfStockCount: {
              $sum: {
                $cond: [
                  { $eq: [inv, 0] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalProducts: 0,
        totalStock: 0,
        totalStoreValue: 0,
        outOfStockCount: 0
      };

      await DashboardStats.updateStats({
        totalProducts: result.totalProducts || 0,
        totalStock: result.totalStock || 0,
        totalStoreValue: Math.round((result.totalStoreValue || 0) * 100) / 100,
        outOfStockCount: result.outOfStockCount || 0,
      });
    } catch (error) {
      console.error("Background stats update failed:", error);
      // Don't throw - this is background operation
    }
  });
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  patchProduct,
  deleteProduct,
  getBrands,
  bulkPatchProducts,
  bulkDeleteProducts,
  updateDashboardStatsInBackground,
};

