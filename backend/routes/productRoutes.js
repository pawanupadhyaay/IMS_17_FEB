const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  patchProduct,
  deleteProduct,
  getBrands,
  bulkPatchProducts,
  bulkDeleteProducts,
} = require("../controllers/productController");
const {
  pullBalmainEnrichment,
  pullTitanEnrichment,
  pullTimexEnrichment,
  pullTissotEnrichment,
  pullFossilEnrichment,
  pullCasioEnrichment,
  pullSeikoEnrichment,
  pullLonginesEnrichment,
  pullRadoEnrichment,
  pullEmporioArmaniEnrichment,
  pullArmaniExchangeEnrichment,
  pullEarnshawEnrichment,
  pullAlexandreChristieEnrichment,
  pullMichaelKorsEnrichment,
  pullProductEnrichment,
  publishProduct,
} = require("../controllers/enrichmentController");
const { protect, imsOnly } = require("../middleware/auth");

// All routes are protected
router.use(protect, imsOnly);

router.get("/brands/list", getBrands);
router.patch("/bulk/update", bulkPatchProducts);
router.post("/bulk/delete", bulkDeleteProducts);
router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.patch("/:id", patchProduct); // Optimized partial update endpoint
router.delete("/:id", deleteProduct);
router.post("/:id/enrich", pullProductEnrichment);
router.post("/:id/enrich/balmain", pullBalmainEnrichment);
router.post("/:id/enrich/titan", pullTitanEnrichment);
router.post("/:id/enrich/timex", pullTimexEnrichment);
router.post("/:id/enrich/tissot", pullTissotEnrichment);
router.post("/:id/enrich/fossil", pullFossilEnrichment);
router.post("/:id/enrich/casio", pullCasioEnrichment);
router.post("/:id/enrich/seiko", pullSeikoEnrichment);
router.post("/:id/enrich/longines", pullLonginesEnrichment);
router.post("/:id/enrich/rado", pullRadoEnrichment);
router.post("/:id/enrich/emporio-armani", pullEmporioArmaniEnrichment);
router.post("/:id/enrich/armani-exchange", pullArmaniExchangeEnrichment);
router.post("/:id/enrich/earnshaw", pullEarnshawEnrichment);
router.post("/:id/enrich/alexandre-christie", pullAlexandreChristieEnrichment);
router.post("/:id/enrich/michael-kors", pullMichaelKorsEnrichment);
router.post("/:id/publish", publishProduct);

module.exports = router;

