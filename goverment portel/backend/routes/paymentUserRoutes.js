const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authenticateToken");
const verifyTwoFactorAuth = require("../middleware/verifyTwoFactorAuth");

const {
    getPaymentUsers,
    addPaymentUser,
    updatePaymentUserStatus,
    deletePaymentUser,
    verifyTwoFactorPassword
} = require("../controllers/paymentUserController");

// 1. Fetch State Payment Users (Admin/DBA + 2-Factor Verification)
router.get("/", authenticateToken, verifyTwoFactorAuth, getPaymentUsers);

// 2. Add State Payment User (Protected by Admin/DBA + 2-Factor Verification)
router.post("/", authenticateToken, verifyTwoFactorAuth, addPaymentUser);

// 3. Update Status (Protected by Admin/DBA + 2-Factor Verification)
router.patch("/:id/status", authenticateToken, verifyTwoFactorAuth, updatePaymentUserStatus);

// 4. Delete (Protected by Admin/DBA + 2-Factor Verification)
router.delete("/:id", authenticateToken, verifyTwoFactorAuth, deletePaymentUser);

// 5. Verify 2FA password check endpoint
router.post("/verify-2fa", authenticateToken, verifyTwoFactorPassword);

module.exports = router;
