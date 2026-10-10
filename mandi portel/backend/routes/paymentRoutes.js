const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");
const { getPaymentById } = require("../controllers/paymentController");

router.get("/:payment_id", authenticateToken, requirePermission("read"), getPaymentById);

module.exports = router;
