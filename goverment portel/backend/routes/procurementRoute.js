const express = require("express");

const router = express.Router();

const authenticateToken = require("../middleware/authenticateToken");
const requirePermission = require("../middleware/requirePermission");
const loadUserScope = require("../middleware/loadUserScope");

const {
    addProcurementSession,
    removeProcurementSession,
    getProcurementSessions,
    updateProcurementSessionDates,
    getTotalProcurementSessions,
    getProcurementChartStats
} = require("../controllers/procurementSessionController");

const {
    addProcurementQuota,
    removeProcurementQuota,
    updateProcurementQuota,
    getProcurementQuotaByState
} = require("../controllers/procurementQuotaController");

router.get(
    "/chart-stats",
    authenticateToken,
    getProcurementChartStats
);

router.get(
    "/total",
    authenticateToken,
    requirePermission("procurement_session.read"),
    loadUserScope,
    getTotalProcurementSessions
);

router.post(
    "/addprocurementsession",
    authenticateToken,
    requirePermission("procurement_session.create"),
    loadUserScope,
    addProcurementSession
);

router.post(
    "/addprocurementQuota",
    authenticateToken,
    requirePermission("procurement_quota.create"),
    loadUserScope,
    addProcurementQuota
);


router.delete(
    "/removeprocurementsession/:session_id",
    authenticateToken,
    requirePermission("procurement_session.delete"),
    loadUserScope,
    removeProcurementSession
);

router.get(
    "/",
    authenticateToken,
    requirePermission("procurement_session.read"),
    loadUserScope,
    getProcurementSessions
);

router.patch(
    "/:session_id/dates",
    authenticateToken,
    requirePermission("procurement_session.update"),
    loadUserScope,
    updateProcurementSessionDates
);

router.delete(
    "/removeprocurementquota/:quota_id",
    authenticateToken,
    requirePermission("procurement_quota.delete"),
    loadUserScope,
    removeProcurementQuota
);

router.put(
    "/updatequota/:quota_id",
    authenticateToken,
    requirePermission("procurement_quota.update"),
    loadUserScope,
    updateProcurementQuota
);

router.get(
    "/quota/state/:state_id",
    authenticateToken,
    requirePermission("procurement_quota.read"),
    loadUserScope,
    getProcurementQuotaByState
);

module.exports = router;