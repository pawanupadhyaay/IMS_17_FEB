const express = require("express");
const router = express.Router();
const {
  getEnrichmentStatus,
  getEnrichmentBrandStatus,
  getEnrichmentBrands,
} = require("../controllers/enrichmentStatusController");
const { protect, imsOnly } = require("../middleware/auth");

router.use(protect, imsOnly);

router.get("/brands", getEnrichmentBrands);
router.get("/status", getEnrichmentStatus);
router.get("/status/:brand", getEnrichmentBrandStatus);

module.exports = router;
