const express = require("express");
const router = express.Router();
const { getDashboardStats, recomputeStats } = require("../controllers/dashboardController");
const { protect, imsOnly } = require("../middleware/auth");

router.use(protect, imsOnly);

router.get("/stats", getDashboardStats);
router.post("/stats/recompute", recomputeStats);

module.exports = router;

