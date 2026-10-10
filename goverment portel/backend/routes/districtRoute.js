const express = require("express");

const {
    addDistrict,
    removeDistrict,
    getDistrictsByState,
    getTotalDistricts
} = require("../controllers/districtController");

const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");
const loadUserScope = require("../middleware/loadUserScope");

const router = express.Router();

router.post(
    "/adddistrict",
    authenticateToken,
    requirePermission("district.create"),
    loadUserScope,
    addDistrict
);

router.delete(
    "/deletedistrict/:district_id",
    authenticateToken,
    requirePermission("district.delete"),
    loadUserScope,
    removeDistrict
);

router.get(
    "/getdistrict/:state_id",
    authenticateToken,
    requirePermission("district.read"),
    loadUserScope,
    getDistrictsByState
);

router.get(
    "/total",
    authenticateToken,
    requirePermission("district.read"),
    loadUserScope,
    getTotalDistricts
);

module.exports = router;