const express = require("express");

const router = express.Router();

const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");
const loadUserScope = require("../middleware/loadUserScope");
const {
    addFarmer,
    deleteFarmerUser,
    getFarmerByAadhaar,
    getFarmers,
    updateFarmer,
    getFarmerVerification,
    getTotalFarmers
} = require("../controllers/farmerController");

router.post(
    "/",
    authenticateToken,
    requirePermission("farmer.read"),
    loadUserScope,
    getFarmers
);

router.post(
    "/addfarmer",
    authenticateToken,
    requirePermission("farmer.create", "bank_account.create"),
    loadUserScope,
    addFarmer
);

router.delete(
    "/removefarmer/:farmer_id",
    authenticateToken,
    requirePermission("farmer.delete"),
    loadUserScope,
    deleteFarmerUser
);

router.get(
    "/getfarmer/aadhaar/:aadhaar_number",
    authenticateToken,
    requirePermission("farmer.read"),
    loadUserScope,
    getFarmerByAadhaar
);

router.put(
    "/update/:farmer_id",
    authenticateToken,
    requirePermission("farmer.update"),
    loadUserScope,
    updateFarmer
);

router.get(
    "/:farmer_id/verification",
    authenticateToken,
    requirePermission("farmer.read"),
    loadUserScope,
    getFarmerVerification
);

router.get(
    "/total",
    authenticateToken,
    requirePermission("farmer.read"),
    loadUserScope,
    getTotalFarmers
);

module.exports = router;