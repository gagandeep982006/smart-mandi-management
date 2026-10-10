const express = require("express");

const router = express.Router();

const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");

const {
    addCrop,
    removeCrop,
    getCrops,
    getTotalCrops,
    updateCrop
} = require("../controllers/cropController");

router.post(
    "/addcrop",
    authenticateToken,
    requirePermission("crop.create"),
    addCrop
);

router.delete(
    "/removecrop/:crop_id",
    authenticateToken,
    requirePermission("crop.delete"),
    removeCrop
);

router.get(
    "/getcrops",
    authenticateToken,
    requirePermission("crop.read"),
    getCrops
);

router.get(
    "/total",
    authenticateToken,
    requirePermission("crop.read"),
    getTotalCrops
);

router.put(
    "/update/:crop_id",
    authenticateToken,
    requirePermission("crop.update"),
    updateCrop
);

module.exports = router;