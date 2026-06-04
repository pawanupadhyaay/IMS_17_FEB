const express = require("express");
const router = express.Router();
const { createStoreQuery, getMyQueries } = require("../controllers/storeQueryController");
const { protect } = require("../middleware/auth");

// Public route for storefront contact form
router.post("/", createStoreQuery);

// Protected routes for customer portal
router.get("/my-queries", protect, getMyQueries);

module.exports = router;
