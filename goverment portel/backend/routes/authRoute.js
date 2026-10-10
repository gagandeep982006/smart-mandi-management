const express = require("express");

const {
    register,
    logout,
    getMe,
    requestOtp,
    verifyOtp,
    getProfile
} = require("../controllers/authController");
const authenticateToken = require("../middleware/authenticateToken");

const router = express.Router();

router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/register", register);
router.post("/logout", logout);
router.get("/me", authenticateToken, getMe);
router.get("/profile", authenticateToken, getProfile);

module.exports = router;