const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");
const verifyCounterAccess = require("../middleware/verifyCounterAccess");
const {
    getMyCounters,
    getCounterById,
    getCounterSummary,
    getCounterQueue,
    getCompletedFarmers,
    getCounterPayments,
    getCounterAvgTimes,
    updateCounterAvgTime
} = require("../controllers/counterController");
const { callNextFarmer } = require("../controllers/queueController");

// Get all assigned counters
router.get("/my", authenticateToken, requirePermission("read"), getMyCounters);

// Counter average procurement time settings (that Mandi only)
router.get("/avg-time", authenticateToken, requirePermission("read"), getCounterAvgTimes);
router.patch("/:counter_id/avg-time", authenticateToken, requirePermission("update"), updateCounterAvgTime);

// Specific counter routes
router.get("/:counter_id", authenticateToken, requirePermission("read"), verifyCounterAccess({ requireActive: false }), getCounterById);
router.get("/:counter_id/summary", authenticateToken, requirePermission("read"), verifyCounterAccess({ requireActive: false }), getCounterSummary);
router.get("/:counter_id/queue", authenticateToken, requirePermission("read"), verifyCounterAccess({ requireActive: false }), getCounterQueue);
router.get("/:counter_id/completed", authenticateToken, requirePermission("read"), verifyCounterAccess({ requireActive: false }), getCompletedFarmers);
router.get("/:counter_id/payments", authenticateToken, requirePermission("read"), verifyCounterAccess({ requireActive: false }), getCounterPayments);

// Queue action: call next farmer
router.post("/:counter_id/call-next", authenticateToken, requirePermission("update"), verifyCounterAccess({ requireActive: true }), callNextFarmer);

module.exports = router;
