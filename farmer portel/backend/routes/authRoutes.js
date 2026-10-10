const express = require("express");
const {
    requestOtp,
    verifyOtp,
    logout,
    getMe
} = require("../controller/authController");
const authenticateToken = require("../middleware/authenticateToken");

const router = express.Router();

router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/logout", logout);
router.get("/me", authenticateToken, getMe);

module.exports = router;
