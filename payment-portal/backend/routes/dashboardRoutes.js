const express = require("express");
const router = express.Router();
const { getDashboardStats, getDashboardRecentLogs } = require("../controllers/dashboardController");
const authenticatePaymentUser = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");

// All dashboard endpoints require authentication & payment.read permission
router.use(authenticatePaymentUser);
router.use(requirePermission("payment.read"));

// Live statistics summary for assigned state
router.get("/stats", getDashboardStats);

// Recent activity logs from MongoDB
router.get("/recent-logs", getDashboardRecentLogs);

module.exports = router;
