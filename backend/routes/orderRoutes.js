const express = require("express");
const router = express.Router();
const { createOrder, getOrder, getMyOrders } = require("../controllers/orderController");
const { protect, optionalAuth } = require("../middleware/auth");

// POST /api/orders - Create order (public for guest, optional auth for logged-in users)
router.post("/", optionalAuth, createOrder);

// Protected routes - require auth
router.get("/", protect, getMyOrders);
router.get("/:id", protect, getOrder);

module.exports = router;
