const express = require("express");
const router = express.Router();

const {
    getMyRecentLogs
} = require("../../controllers/mongocontroller/recentlogsController");

const authenticateToken = require("../../middleware/authenticateToken");

router.get(
    "/",
    authenticateToken,
    getMyRecentLogs
);

module.exports = router;