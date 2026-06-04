const express = require("express");
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  sendOtp, 
  updateProfile, 
  forgotPassword, 
  resetPassword,
  sendPhoneOtp,
  verifyPhoneOtp,
  completePhoneRegistration,
  sendEmailOtp,
  verifyEmailOtp,
  completeEmailRegistration,
  changePassword,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Register route - can be easily commented out later
router.post("/send-otp", sendOtp);
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getMe);
router.put("/update-me", protect, updateProfile);

// Password & Address CRUD Endpoints
router.put("/change-password", protect, changePassword);
router.route("/addresses")
  .get(protect, getAddresses)
  .post(protect, addAddress);
router.route("/addresses/:id")
  .put(protect, updateAddress)
  .delete(protect, deleteAddress);

// Unified Frictionless Phone OTP-First Login & Register
router.post("/phone-login/send-otp", sendPhoneOtp);
router.post("/phone-login/verify-otp", verifyPhoneOtp);
router.post("/phone-login/complete-registration", completePhoneRegistration);

// Unified Frictionless Email OTP-First Login & Register
router.post("/email-login/send-otp", sendEmailOtp);
router.post("/email-login/verify-otp", verifyEmailOtp);
router.post("/email-login/complete-registration", completeEmailRegistration);

module.exports = router;

