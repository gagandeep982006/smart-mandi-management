const express = require("express");

const router = express.Router();

const authenticateToken = require("../../middleware/authenticateToken");
const requirePermission = require("../../middleware/requirePermission");

const {
    addFarmerHistory,
    searchFarmerByAadhaar
} = require("../../controllers/mongocontroller/farmerHistoryController");

router.post(
    "/",
    authenticateToken,
    requirePermission("farmer_history.create"),
    addFarmerHistory
);

router.get(
    "/search",
    authenticateToken,
    requirePermission("farmer_history.read"),
    searchFarmerByAadhaar
);

module.exports = router;