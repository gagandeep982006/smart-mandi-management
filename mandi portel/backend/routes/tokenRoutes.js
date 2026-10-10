const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");
const {
    markArrived,
    startProcessing,
    completeFarmer,
    markNotArrived,
    callFarmer,
    requestEarlyFarmer
} = require("../controllers/queueController");

// Token workflow status transitions: WAITING -> CALLED -> ARRIVED -> PROCESSING -> COMPLETED
// Or WAITING / CALLED -> NOT_ARRIVED (stopping point; farmer handles rescheduling via farmer portal)
router.post("/:token_id/call", authenticateToken, requirePermission("update"), callFarmer);
router.post("/:token_id/request-early", authenticateToken, requirePermission("update"), requestEarlyFarmer);
router.patch("/:token_id/arrive", authenticateToken, requirePermission("update"), markArrived);
router.patch("/:token_id/start-processing", authenticateToken, requirePermission("update"), startProcessing);
router.patch("/:token_id/complete", authenticateToken, requirePermission("update"), completeFarmer);
router.patch("/:token_id/not-arrived", authenticateToken, requirePermission("update"), markNotArrived);

module.exports = router;
