const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const verifyTwoFactorAuth = require("../middleware/verifyTwoFactorAuth");
const router = express.Router();

const {
    addAppUser,
    addUser,
    getUsers,
    deleteUser,
    updateUserStatus,
    getUserById
} = require("../controllers/appUserController");

// 1. Create App User
router.post(
    "/",
    authenticateToken,
    verifyTwoFactorAuth,
    addUser
);

router.post(
    "/users",
    authenticateToken,
    verifyTwoFactorAuth,
    addUser
);

// 2. Read/List App Users (paginated with filters)
router.post(
    "/getusers",
    authenticateToken,
    verifyTwoFactorAuth,
    getUsers
);

// 3. Read Single App User by ID
router.get(
    "/getusers/:user_id",
    authenticateToken,
    verifyTwoFactorAuth,
    getUserById
);

// 4. Delete App User
router.delete(
    "/users/:user_id",
    authenticateToken,
    verifyTwoFactorAuth,
    deleteUser
);

// 5. Update App User Status
router.patch(
    "/users/:user_id/status",
    authenticateToken,
    verifyTwoFactorAuth,
    updateUserStatus
);

module.exports = router;