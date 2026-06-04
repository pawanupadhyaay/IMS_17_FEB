const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/auth");
const { downloadSampleCSV, importCSV } = require("../controllers/importController");

// Multer memory storage configuration for streaming file buffers safely
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Route to download sample CSV - Publicly accessible for reference
router.get("/sample", downloadSampleCSV);

// Route to process CSV Import - protected and processed via Multer memory parser
router.post("/csv", protect, upload.single("file"), importCSV);

module.exports = router;
