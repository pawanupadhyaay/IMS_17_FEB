const express = require("express");
const router = express.Router();
const {
  createRazorpayOrder,
  verifyPayment,
  validateCoupon,
  getMyOrders,
  getPaymentDetails
} = require("../controllers/storeOrderController");
const { protect } = require("../middleware/auth");

router.post("/create-order", createRazorpayOrder);
router.post("/verify-payment", verifyPayment);
router.post("/validate-coupon", validateCoupon);
router.get("/my-orders", protect, getMyOrders);
router.get("/payment-details/:paymentId", getPaymentDetails);

module.exports = router;
