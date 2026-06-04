const express = require("express");
const router = express.Router();
const {
  listProducts,
  getProductBySlug,
  getProductById,
  getFeaturedProducts,
  getNewArrivals,
  getFilters,
  getSearchSuggestions,
} = require("../controllers/storeProductController");

// All store product routes are PUBLIC (no auth required)

router.get("/home/new-arrivals", getNewArrivals);
router.get("/featured/list", getFeaturedProducts);
router.get("/filters", getFilters);
router.get("/search/suggestions", getSearchSuggestions);
router.get("/slug/:slug", getProductBySlug);
router.get("/", listProducts);
router.get("/:id", getProductById);

module.exports = router;
