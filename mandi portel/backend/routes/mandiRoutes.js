const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");
const {
    getMandiMe,
    getMandiTiming,
    updateMandiTiming,
    getMandiWorkingDays,
    updateMandiWorkingDays
} = require("../controllers/mandiController");

router.get("/me", authenticateToken, requirePermission("read"), getMandiMe);
router.get("/timing", authenticateToken, requirePermission("read"), getMandiTiming);
router.patch("/timing", authenticateToken, requirePermission("update"), updateMandiTiming);
router.get("/working-days", authenticateToken, requirePermission("read"), getMandiWorkingDays);
router.patch("/working-days", authenticateToken, requirePermission("update"), updateMandiWorkingDays);

module.exports = router;
