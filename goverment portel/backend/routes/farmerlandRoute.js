const express = require("express");

const router = express.Router();

const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");
const loadUserScope = require("../middleware/loadUserScope");

const {
    addFarmerLand,
    removeFarmerLand,
    getFarmerLand,
    changeLandVerificationStatus
} = require("../controllers/farmerLandController");

router.post(
    "/addland",
    authenticateToken,
    requirePermission("farmer_land.create"),
    loadUserScope,
    addFarmerLand
);

router.delete(
    "/removeland/:land_id",
    authenticateToken,
    requirePermission("farmer_land.delete"),
    loadUserScope,
    removeFarmerLand
);

router.get(
    "/farmer/:farmer_id",
    authenticateToken,
    requirePermission("farmer_land.read"),
    loadUserScope,
    getFarmerLand
);

router.patch(
    "/:land_id/verification",
    authenticateToken,
    requirePermission("farmer_land.update"),
    loadUserScope,
    changeLandVerificationStatus
);

module.exports = router;