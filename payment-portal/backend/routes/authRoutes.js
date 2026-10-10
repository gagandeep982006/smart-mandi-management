const express = require("express");
const router = express.Router();
const { getMe, logout, requestOtp, verifyOtp, getProfile } = require("../controllers/authController");
const authenticatePaymentUser = require("../middleware/authMiddleware");

// Public authentication endpoints
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);

// Authenticated session check
router.get("/me", authenticatePaymentUser, getMe);

// Read-only profile
router.get("/profile", authenticatePaymentUser, getProfile);

// Logout
router.post("/logout", authenticatePaymentUser, logout);

module.exports = router;
