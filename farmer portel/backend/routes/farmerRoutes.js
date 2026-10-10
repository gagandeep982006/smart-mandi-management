const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authenticateToken");
const {
    getProfile,
    getLand,
    getProcurementSessions,
    getAvailableCrops,
    getAvailableMandis,
    getAvailableCounters,
    getAvailableSlots,
    getAllocation,
    createBooking,
    getBookings,
    getCurrentBooking,
    cancelBooking,
    deleteBooking,
    deleteToken,
    rescheduleBooking,
    getToken,
    getPayments,
    getHistory,
    getRecentBookings,
    getDashboard,
    getEarlyCallRequests,
    respondEarlyCallRequest
} = require("../controller/farmerController");

// All farmer routes require valid JWT cookie via authenticateToken middleware
router.use(authenticateToken);

router.get("/profile", getProfile);
router.get("/land", getLand);
router.get("/procurement-sessions", getProcurementSessions);
router.get("/available-crops", getAvailableCrops);
router.get("/available-mandis", getAvailableMandis);
router.get("/available-counters", getAvailableCounters);
router.get("/available-slots", getAvailableSlots);
router.get("/allocation", getAllocation);

router.post("/bookings", createBooking);
router.get("/bookings", getBookings);
router.get("/bookings/current", getCurrentBooking);
router.patch("/bookings/:bookingId/cancel", cancelBooking);
router.delete("/bookings/:bookingId", deleteBooking);
router.patch("/bookings/:bookingId/reschedule", rescheduleBooking);

router.get("/token", getToken);
router.delete("/token", deleteToken);
router.delete("/token/:tokenId", deleteToken);
router.get("/early-call-requests", getEarlyCallRequests);
router.post("/early-call-requests/:requestId/respond", respondEarlyCallRequest);
router.get("/payment", getPayments);
router.get("/history", getHistory);
router.get("/recent-history", getRecentBookings);
router.get("/recent-bookings", getRecentBookings);
router.get("/dashboard", getDashboard);

module.exports = router;
