const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");
const loadUserScope = require("../middleware/loadUserScope");

const {
    addMandi,
    removeMandi,
    updateMandi,
    getMandis,
    getTotalMandis
} = require("../controllers/mandiController");

router.post(
    "/addmandi",
    authenticateToken,
    requirePermission("mandi.create"),
    loadUserScope,
    addMandi
);

router.delete(
    "/removemandi/:mandi_id",
    authenticateToken,
    requirePermission("mandi.delete"),
    loadUserScope,
    removeMandi
);

router.patch(
    "/update/:mandi_id",
    authenticateToken,
    requirePermission("mandi.update"),
    loadUserScope,
    updateMandi
);

router.post(
    "/getmandis",
    authenticateToken,
    requirePermission("mandi.read"),
    loadUserScope,
    getMandis
);

router.get(
    "/gettotalmandis",
    authenticateToken,
    requirePermission("mandi.read"),
    loadUserScope,
    getTotalMandis
);

module.exports = router;