const express = require("express");
const router = express.Router();
const { optionalAuth } = require("../middleware/auth");
const { subscribeToBackInStock } = require("../controllers/notificationController");

// Public route that optionally parses JWT token for logged in users
router.post("/subscribe", optionalAuth, subscribeToBackInStock);

module.exports = router;
