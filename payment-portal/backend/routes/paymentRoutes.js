const express = require("express");
const router = express.Router();
const { getPayments, getPaymentById, transitionPayment } = require("../controllers/paymentController");
const authenticatePaymentUser = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");

// All routes require authentication
router.use(authenticatePaymentUser);

// 1. List Payments (Requires payment.read)
router.get("/", requirePermission("payment.read"), getPayments);

// 2. View Payment Details (Requires payment.read)
router.get("/:payment_id", requirePermission("payment.read"), getPaymentById);

// 3. Status Transition (Validation and exact permission enforcement handled in centralized transition service)
router.post("/:payment_id/transition", transitionPayment);

module.exports = router;
