const { Product } = require("../models/Product");
const { Brand } = require("../models/Brand");
const { migrateLegacyImagesInline } = require("../utils/migrateLegacyImages");
const {
  getStrictStorefrontFilter,
  buildBrandMatchClause,
} = require("../utils/storeEligibility");
const mongoose = require("mongoose");

/**
 * Storefront listing: follows strict canonical filter (published, stock, title, image).
 */
const getStorefrontFilters = (customFilters = {}) => {
  return getStrictStorefrontFilter(customFilters);
};


const buildProductFilterFromQuery = async (query) => {
  const {
    brand,
    brandSlug,
    brandCategory,
    category,
    search,
  } = query;

  const customFilters = {};

  // Helper: Parse comma-separated query params and build an index-ready match clause
  const buildMultiMatch = (queryValue) => {
    if (!queryValue || String(queryValue).trim() === "") return null;
    const values = String(queryValue).split(",").map(v => v.trim()).filter(Boolean);
    if (values.length === 0) return null;
    // Exact matches (ignoring case via regex) for all selected options
    return { $in: values.map(v => new RegExp(`^${v}$`, "i")) };
  };

  // 1. Brand Handling (Supports brand name, slug, or category [luxury/fashion])
  let brandOptions = [];
  if (brand) {
    brandOptions = String(brand).split(",").map(v => v.trim()).filter(Boolean);
  }

  // 1a. Filter by brand category (luxury/fashion)
  if (brandCategory) {
    try {
      const brandsInCategory = await Brand.find({ 
        category: new RegExp(`^${brandCategory}$`, "i") 
      }).select("name").lean();
      brandsInCategory.forEach(b => {
        if (!brandOptions.includes(b.name)) brandOptions.push(b.name);
      });
    } catch (_) {}
  }

  if (brandSlug) {
    try {
      const slug = String(brandSlug).toLowerCase().trim();
      if (slug) {
        const b = await Brand.findOne({ slug }).select("name").lean();
        if (b?.name && !brandOptions.includes(b.name)) brandOptions.push(b.name);
      }
    } catch (_) {}
  }

  if (brandOptions.length > 0) {
    customFilters.brand = { $in: brandOptions.map(v => new RegExp(`^${v}$`, "i")) };
  }

  // 2. Specifications & Category Handling
  const filterableFields = [
    "category",
    "gender",
    "caseMaterial",
    "caseSize",
    "dialColor",
    "movement",
    "waterResistance"
  ];

  filterableFields.forEach(field => {
    const match = buildMultiMatch(query[field]);
    if (match) customFilters[field] = match;
  });

  // 3. Ultra Advance Search Handling (Tokenized Semantic Search)
  if (search) {
    const searchTerm = String(search).trim();
    const searchLower = searchTerm.toLowerCase();
    
    // Tokens Mapping
    const genderMap = { 
      'men': 'Male', 'mens': 'Male', 'male': 'Male',
      'women': 'Female', 'womens': 'Female', 'female': 'Female',
      'kids': 'Kids', 'unisex': 'Unisex'
    };
    const categoryMap = { 'luxury': 'luxury', 'fashion': 'fashion' };

    // 1. Tokenize the search query
    let tokens = searchLower.split(/\s+/);
    let semanticFilters = {};
    let remainingTokens = [];

    const allBrands = await Brand.find({}).select("name").lean();
    const brandNames = allBrands.map(b => b.name.toLowerCase());

    // 2. Identify Semantic Tokens
    for (let token of tokens) {
      if (genderMap[token]) {
        semanticFilters.gender = new RegExp(`^${genderMap[token]}$`, "i");
      } else if (categoryMap[token]) {
        // Find brands in this category instead of setting category directly (since products don't have category field usually, brands do)
        const brandsInCat = allBrands.filter(b => b.category?.toLowerCase() === categoryMap[token]).map(b => b.name);
        semanticFilters.brand = { $in: brandsInCat.map(v => new RegExp(`^${v}$`, "i")) };
      } else if (brandNames.includes(token)) {
        const originalBrand = allBrands.find(b => b.name.toLowerCase() === token);
        semanticFilters.brand = new RegExp(`^${originalBrand.name}$`, "i");
      } else {
        remainingTokens.push(token);
      }
    }

    // 3. Apply Multi-Intent Filters
    const remainingQuery = remainingTokens.join(" ");
    if (remainingQuery || Object.keys(semanticFilters).length > 0) {
      const criteria = [];

      // Add semantic filters (Gender, Brand, etc)
      Object.entries(semanticFilters).forEach(([key, val]) => {
        criteria.push({ [key]: val });
      });

      // Add keyword search for the rest (Only if 2+ chars to avoid matching 'a' in everything)
      if (remainingQuery) {
        if (remainingQuery.length >= 2) {
          const regex = new RegExp(remainingQuery, "i");
          criteria.push({
            $or: [
              { sku: remainingQuery },
              { sku: regex },
              { title: regex },
              { brand: regex },
              { tags: regex }
            ]
          });
        } else {
          // If only 1 char, only match exact SKU (useful for very specific IDs)
          criteria.push({ sku: remainingQuery });
        }
      }

      if (criteria.length > 0) {
        customFilters.$and = criteria;
      }
    }
  }

  return customFilters;
};

/**
 * Public store product listing.
 * Only returns products with a valid title and image (store-ready).
 * @route   GET /api/store/products
 * @access  Public
 */
const listProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 24,
      sortBy,
      sortOrder,
      type,
    } = req.query;

    const customFilters = await buildProductFilterFromQuery(req.query);

    const filter = getStorefrontFilters(customFilters);

    let sortOptions = { createdAt: -1 };

    // 🆕 New Arrivals
    if (type === "new") {
      sortOptions = { createdAt: -1 };
    } else if (sortBy) {
      sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const projection =
      "brand title slug sku price oldPrice inventory images imageUrl image.url ratings numReviews createdAt";

    const products = await Product.find(filter)
      .select(projection)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    products.forEach((p) => {
      Object.assign(p, migrateLegacyImagesInline(p));
    });

    // 🚀 Only count when pagination needed
    let total = null;
    if (!type || type !== "new") {
      total = await Product.countDocuments(filter);
    }

    res.json({
      success: true,
      data: products,
      pagination: total
        ? {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        }
        : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single product by slug (public store).
 * @route   GET /api/store/products/slug/:slug
 * @access  Public
 */
const getProductBySlug = async (req, res) => {
  try {
    const filter = getStorefrontFilters({ slug: req.params.slug });
    const product = await Product.findOne(filter)
      .select("-user -__v")
      .lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    Object.assign(product, migrateLegacyImagesInline(product));
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single product by ID (public store).
 * @route   GET /api/store/products/:id
 * @access  Public
 */






const getProductById = async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const filter = getStorefrontFilters({ _id: req.params.id });
    const product = await Product.findOne(filter)
      .select("-user -__v")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    Object.assign(product, migrateLegacyImagesInline(product));

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * Get featured products.
 * @route   GET /api/store/products/featured/list
 * @access  Public
 */
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 8, 24);
    const filter = getStorefrontFilters({ featured: true });
    const products = await Product.find(filter)
      .select("brand title slug price oldPrice inventory images image.url ratings numReviews")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // 🚀 Data Enrichment
    const allBrands = await Brand.find({}).select("name category slug").lean();
    const brandMap = {};
    allBrands.forEach(b => { brandMap[b.name.toLowerCase()] = { category: b.category, slug: b.slug }; });

    products.forEach((p) => {
      Object.assign(p, migrateLegacyImagesInline(p));
      const bInfo = brandMap[p.brand?.toLowerCase()];
      if (bInfo) {
        p.brandCategory = bInfo.category;
        p.brandSlug = bInfo.slug;
      }
    });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get new arrivals (homepage). Fixed 8 items, no pagination.
 * @route   GET /api/store/products/new-arrivals (or similar)
 * @access  Public
 */
const getNewArrivals = async (req, res) => {
  try {
    const { gender } = req.query;
    const customFilters = {};

    if (gender && gender !== 'ALL') {
      const g = gender.toUpperCase();
      if (g === 'MEN') {
        customFilters.gender = /^(Male|Men)$/i;
      } else if (g === 'WOMEN') {
        customFilters.gender = /^(Female|Women)$/i;
      } else {
        customFilters.gender = new RegExp(`^${gender}$`, "i");
      }
    }

    const filter = getStorefrontFilters(customFilters);
    const products = await Product.find(filter)
      .select("brand title slug price oldPrice inventory images image.url ratings numReviews createdAt")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    products.forEach((p) => {
      Object.assign(p, migrateLegacyImagesInline(p));
    });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all unique filter values and their counts.
 * Uses aggregation facet for efficiency across the entire collection.
 * @route   GET /api/store/products/filters
 * @access  Public
 */
const getFilters = async (req, res) => {
  try {
    const customFilters = await buildProductFilterFromQuery(req.query);
    const filter = getStorefrontFilters(customFilters);

    const facets = {
      category: [{ $match: { category: { $ne: "" } } }, { $group: { _id: "$category", count: { $sum: 1 } } }],
      brand: [{ $match: { brand: { $ne: "" } } }, { $group: { _id: "$brand", count: { $sum: 1 } } }],
      caseMaterial: [{ $match: { caseMaterial: { $ne: "" } } }, { $group: { _id: "$caseMaterial", count: { $sum: 1 } } }],
      caseSize: [{ $match: { caseSize: { $ne: "" } } }, { $group: { _id: "$caseSize", count: { $sum: 1 } } }],
      dialColor: [{ $match: { dialColor: { $ne: "" } } }, { $group: { _id: "$dialColor", count: { $sum: 1 } } }],
      gender: [{ $match: { gender: { $ne: "" } } }, { $group: { _id: "$gender", count: { $sum: 1 } } }],
      movement: [{ $match: { movement: { $ne: "" } } }, { $group: { _id: "$movement", count: { $sum: 1 } } }],
      waterResistance: [{ $match: { waterResistance: { $ne: "" } } }, { $group: { _id: "$waterResistance", count: { $sum: 1 } } }],
    };

    const aggregation = [
      { $match: filter },
      { $facet: facets }
    ];

    const results = await Product.aggregate(aggregation);
    const data = results[0];

    // Format results to { value, count }
    const formatted = {};
    Object.keys(data).forEach(key => {
      formatted[key] = data[key]
        .map(item => ({ value: item._id, count: item.count }))
        .sort((a, b) => String(a.value).localeCompare(String(b.value)));
    });

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get quick search suggestions (Autocomplete).
 * Returns limited fields: title, brand, sku, image, slug.
 * @route   GET /api/store/products/search/suggestions?q=...
 * @access  Public
 */
const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: { products: [], suggestions: [] } });
    }

    const searchTerm = String(q).trim().toLowerCase();

    // 1. Generate Product Filter using Intelligent Parser
    const queryFilter = await buildProductFilterFromQuery({ search: q });
    const filter = getStorefrontFilters(queryFilter);

    // 2. Fetch Matching Products
    const products = await Product.find(filter)
      .select("title brand sku slug images image.url price oldPrice")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    products.forEach((p) => {
      Object.assign(p, migrateLegacyImagesInline(p));
    });

    // 3. Generate Intelligent "Suggested Scopes" (Myntra Style)
    const suggestions = [];
    const tokens = searchTerm.split(/\s+/);

    // Keywords to watch for
    const genderTerms = ['men', 'mens', 'women', 'womens', 'male', 'female'];
    const categoryTerms = ['luxury', 'fashion'];

    const hasGender = tokens.some(t => genderTerms.includes(t));
    const hasCategory = tokens.some(t => categoryTerms.includes(t));

    // Logic for suggesting intent-based results
    if (hasCategory && !hasGender) {
      const cat = tokens.find(t => categoryTerms.includes(t));
      suggestions.push({ 
        label: `In Men's ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, 
        path: `/all-products?brandCategory=${cat}&gender=Male` 
      });
      suggestions.push({ 
        label: `In Women's ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, 
        path: `/all-products?brandCategory=${cat}&gender=Female` 
      });
    } else if (hasGender && !hasCategory) {
      const gen = tokens.find(t => genderTerms.includes(t));
      const gLabel = gen.toLowerCase().startsWith('w') ? 'Women' : 'Men';
      suggestions.push({ 
        label: `${gLabel}'s Luxury Collections`, 
        path: `/all-products?gender=${gLabel === 'Men' ? 'Male' : 'Female'}&brandCategory=luxury` 
      });
      suggestions.push({ 
        label: `${gLabel}'s Fashion Collections`, 
        path: `/all-products?gender=${gLabel === 'Men' ? 'Male' : 'Female'}&brandCategory=fashion` 
      });
    }

    // Always suggest the raw search as a collection if products were found
    if (products.length > 0) {
      suggestions.unshift({ 
        label: `View all matching results for "${q}"`, 
        path: `/all-products?search=${encodeURIComponent(q)}` 
      });
    }

    res.json({ success: true, data: { products, suggestions: suggestions.slice(0, 3) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listProducts,
  getProductBySlug,
  getProductById,
  getFeaturedProducts,
  getNewArrivals,
  getFilters,
  getSearchSuggestions,
};
