const express = require("express");
const router = express.Router();
const { getDistricts, getTehsils } = require("../controllers/locationController");
const authenticatePaymentUser = require("../middleware/authMiddleware");

// Both endpoints are protected by authentication and scoped to user's state
router.get("/districts", authenticatePaymentUser, getDistricts);
router.get("/tehsils", authenticatePaymentUser, getTehsils);

module.exports = router;
