const express = require("express");

const {
    addState,
    removeState,
    getAllStates,
    getTotalStates
} = require("../controllers/stateController");

const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");
const loadUserScope = require("../middleware/loadUserScope");

const router = express.Router();

router.post(
    "/addstate",
    authenticateToken,
    requirePermission("state.create"),
    loadUserScope,
    addState
);

router.get(
    "/getstate",
    authenticateToken,
    requirePermission("state.read"),
    loadUserScope,
    getAllStates
);

router.delete(
    "/removestate/:state_id",
    authenticateToken,
    requirePermission("state.delete"),
    loadUserScope,
    removeState
);

router.get(
    "/total",
    authenticateToken,
    requirePermission("state.read"),
    loadUserScope,
    getTotalStates
);

module.exports = router;