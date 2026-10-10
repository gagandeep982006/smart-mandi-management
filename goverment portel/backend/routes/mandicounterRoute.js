const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");
const loadUserScope = require("../middleware/loadUserScope");

const {
    addMandiCounter,
    removeMandiCounter,
    updateMandiCounter,
    getCountersByMandi,
    getMandisByTehsil,
    getTotalMandiCounters
} = require("../controllers/mandiCounterController");

router.post(
    "/addcounter",
    authenticateToken,
    requirePermission("mandi_counter.create"),
    loadUserScope,
    addMandiCounter
);

router.delete(
    "/removecounter/:counter_id",
    authenticateToken,
    requirePermission("mandi_counter.delete"),
    loadUserScope,
    removeMandiCounter
);

router.put(
    "/updatecounter/:counter_id",
    authenticateToken,
    requirePermission("mandi_counter.update"),
    loadUserScope,
    updateMandiCounter
);

router.get(
    "/mandicounter/:mandi_id",
    authenticateToken,
    requirePermission("mandi_counter.read"),
    loadUserScope,
    getCountersByMandi
);

router.get(
    "/tehsil/:tehsil_id",
    authenticateToken,
    requirePermission("mandi.read"),
    loadUserScope,
    getMandisByTehsil
);

router.get(
    "/total",
    authenticateToken,
    requirePermission("mandi_counter.read"),
    loadUserScope,
    getTotalMandiCounters
);

module.exports = router;