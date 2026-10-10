const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const verifyTwoFactorAuth = require("../middleware/verifyTwoFactorAuth");
const router = express.Router();

const {
    addMandiUser,getMandiUserById,getMandiUsers,deleteMandiUser,updateMandiUserStatus
} = require("../controllers/mandiUserController");

// 1. Create Mandi User
router.post(
    "/add",
    authenticateToken,
    verifyTwoFactorAuth,
    addMandiUser
);

// 2. Read Single Mandi User by ID
router.get(
    "/mandi-users/:user_id",
    authenticateToken,
    verifyTwoFactorAuth,
    getMandiUserById
);

// 3. Read/List Mandi Users (paginated with filters)
router.post(
    "/mandi-users",
    authenticateToken,
    verifyTwoFactorAuth,
    getMandiUsers
);

// 4. Delete Mandi User
router.delete(
    "/mandi-users/:user_id",
    authenticateToken,
    verifyTwoFactorAuth,
    deleteMandiUser
);

// 5. Update Mandi User Status
router.patch(
    "/mandi-users/:user_id/status",
    authenticateToken,
    verifyTwoFactorAuth,
    updateMandiUserStatus
);

module.exports = router;