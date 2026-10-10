const express = require("express");

const {
    addTehsil,
    removeTehsil,
    getTehsilsByDistrict,
    getTotalTehsils
} = require("../controllers/tehsilController");

const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");
const loadUserScope = require("../middleware/loadUserScope");

const router = express.Router();

router.post(
    "/addtehsil",
    authenticateToken,
    requirePermission("tehsil.create"),
    loadUserScope,
    addTehsil
);

router.delete(
    "/removetehsil/:tehsil_id",
    authenticateToken,
    requirePermission("tehsil.delete"),
    loadUserScope,
    removeTehsil
);

router.get(
    "/gettehsil/:district_id",
    authenticateToken,
    requirePermission("tehsil.read"),
    loadUserScope,
    getTehsilsByDistrict
);

router.get(
    "/total",
    authenticateToken,
    requirePermission("tehsil.read"),
    loadUserScope,
    getTotalTehsils
);

module.exports = router;