const express = require("express");
const router = express.Router();
const { logout, getMe, requestOtp, verifyOtp, getProfile } = require("../controllers/authController");
const authenticateToken = require("../middleware/authenticateToken");

// Public endpoints
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/logout", logout);

// Protected endpoints
router.get("/me", authenticateToken, getMe);
router.get("/profile", authenticateToken, getProfile);

module.exports = router;
