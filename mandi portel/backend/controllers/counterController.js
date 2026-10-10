const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { getReadDatabase, getWriteDatabase } = require("../services/databaserouter");
const { getMandiOperatingHours, getCounterServiceTime } = require("../services/slotService");
const MandiRecentLogs = require("../model/mongomodel/MandiRecentLogs");
const { getSlotTimingStatus } = require("./queueController");

/**
 * Validates whether a target date is within the permitted 7-day window (today + 6 days)
 */
function isValidDateWindow(dateStr) {
    const target = new Date(dateStr + "T00:00:00");
    if (isNaN(target.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 6); // 7-day window inclusive

    return target >= today && target <= maxDate;
}

const getMyCounters = async (req, res) => {
    try {
        const assignedCounterIds = Array.isArray(req.user.counter_ids) ? req.user.counter_ids : [];

        if (assignedCounterIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        const readDb = getReadDatabase().promise();
        const placeholders = assignedCounterIds.map(() => "?").join(",");

        const [counters] = await readDb.query(
            `SELECT 
                counter_id,
                counter_number,
                counter_name,
                mandi_id,
                crop_id,
                capacity_per_day,
                status,
                crop_name,
                crop_type,
                average_time_minutes
             FROM vw_mandi_counter_details
             WHERE mandi_id = ? AND counter_id IN (${placeholders})
             ORDER BY counter_number ASC`,
            [req.user.mandi_id, ...assignedCounterIds]
        );

        // Fetch Mandi total capacity per day from vw_mandis
        const [mandiRows] = await readDb.query(
            `SELECT mandi_id, mandi_name, capacity, state_id, state_name FROM vw_mandis WHERE mandi_id = ?`,
            [req.user.mandi_id]
        );
        const mandiCapacity = parseFloat(mandiRows[0]?.capacity || 0);

        // Fetch today's capacity used, queue count, dynamic quota, and active token for each counter
        const enrichedCounters = await Promise.all(
            counters.map(async (counter) => {
                // Today's approved quantity usage strictly by counter_id and service_date
                const [usageRows] = await readDb.query(
                    `SELECT COALESCE(SUM(b.quantity_approved), 0) as used_capacity
                     FROM booking b
                     JOIN queue_token qt ON b.booking_id = qt.booking_id
                     WHERE b.counter_id = ? 
                       AND qt.service_date = CURDATE()
                       AND b.status NOT IN ('CANCELLED')`,
                    [counter.counter_id]
                );

                const usedCapacityQtl = parseFloat(Number(usageRows[0].used_capacity || 0).toFixed(2));
                const dailyCapacityMT = parseFloat(Number(counter.capacity_per_day || 0).toFixed(2));
                const dailyCapacityQtl = parseFloat((dailyCapacityMT * 10).toFixed(2));
                const remainingCapacityQtl = parseFloat(Math.max(0, dailyCapacityQtl - usedCapacityQtl).toFixed(2));
                const remainingCapacityMT = parseFloat((remainingCapacityQtl / 10).toFixed(2));
                const usedCapacityMT = parseFloat((usedCapacityQtl / 10).toFixed(2));
                const mandiCapacityMT = mandiCapacity;
                const mandiCapacityQtl = parseFloat((mandiCapacityMT * 10).toFixed(2));

                // Dynamic state-wise quota lookup from procurement_quota table
                const [quotaRows] = await readDb.query(
                    `SELECT pq.quota_id, pq.state_id, s.state_name, pq.crop_id, c.crop_name, pq.amount, pq.lsp, pq.msp
                     FROM procurement_quota pq
                     JOIN vw_mandis vm ON vm.mandi_id = ? AND pq.state_id = vm.state_id
                     JOIN state s ON pq.state_id = s.state_id
                     JOIN crop c ON pq.crop_id = c.crop_id
                     WHERE pq.crop_id = ?
                     LIMIT 1`,
                    [counter.mandi_id, counter.crop_id]
                );

                const cropQuota = quotaRows.length > 0 ? {
                    quota_id: quotaRows[0].quota_id,
                    state_id: quotaRows[0].state_id,
                    state_name: quotaRows[0].state_name,
                    crop_id: quotaRows[0].crop_id,
                    crop_name: quotaRows[0].crop_name,
                    lsp: parseFloat(quotaRows[0].lsp) || 0,
                    msp: parseFloat(quotaRows[0].msp) || 0,
                    amount: parseFloat(quotaRows[0].amount) || 0
                } : null;

                // Queue counts for today
                const [queueRows] = await readDb.query(
                    `SELECT 
                        COUNT(CASE WHEN status IN ('WAITING', 'CALLED', 'ARRIVED', 'PROCESSING') THEN 1 END) as active_queue_count,
                        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_count
                     FROM queue_token
                     WHERE counter_id = ? AND service_date = CURDATE()`,
                    [counter.counter_id]
                );

                // Current active token (CALLED or PROCESSING)
                const [activeTokenRows] = await readDb.query(
                    `SELECT token_number, status, queue_position
                     FROM queue_token
                     WHERE counter_id = ? AND service_date = CURDATE() AND status IN ('CALLED', 'PROCESSING')
                     ORDER BY FIELD(status, 'PROCESSING', 'CALLED')
                     LIMIT 1`,
                    [counter.counter_id]
                );

                return {
                    counter_id: counter.counter_id,
                    counter_number: counter.counter_number,
                    counter_name: counter.counter_name,
                    mandi_id: counter.mandi_id,
                    crop_id: counter.crop_id,
                    crop_name: counter.crop_name,
                    crop_type: counter.crop_type,
                    capacity_per_day: dailyCapacityMT,
                    capacity_per_day_mt: dailyCapacityMT,
                    capacity_per_day_qtl: dailyCapacityQtl,
                    mandi_capacity: mandiCapacityMT,
                    mandi_capacity_mt: mandiCapacityMT,
                    mandi_capacity_qtl: mandiCapacityQtl,
                    used_capacity: usedCapacityQtl,
                    used_capacity_qtl: usedCapacityQtl,
                    used_capacity_mt: usedCapacityMT,
                    remaining_capacity: remainingCapacityQtl,
                    remaining_capacity_qtl: remainingCapacityQtl,
                    remaining_capacity_mt: remainingCapacityMT,
                    crop_quota: cropQuota,
                    average_time_minutes: counter.average_time_minutes,
                    status: counter.status,
                    current_queue_count: queueRows[0].active_queue_count || 0,
                    completed_count: queueRows[0].completed_count || 0,
                    current_token: activeTokenRows.length > 0 ? activeTokenRows[0] : null
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: enrichedCounters
        });
    } catch (error) {
        console.error("getMyCounters error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getCounterById = async (req, res) => {
    try {
        const counter = req.counter;
        const readDb = getReadDatabase().promise();

        // Get crop details
        const [cropRows] = await readDb.query(
            `SELECT crop_id, crop_name, crop_type FROM crop WHERE crop_id = ?`,
            [counter.crop_id]
        );

        // Get Mandi details including capacity and regional jurisdiction
        const [mandiRows] = await readDb.query(
            `SELECT mandi_id, mandi_name, tehsil_id, tehsil_name, district_id, district_name, state_id, state_name, capacity 
             FROM vw_mandis 
             WHERE mandi_id = ?`,
            [counter.mandi_id]
        );

        // Dynamic state-wise quota lookup from procurement_quota table
        const [quotaRows] = await readDb.query(
            `SELECT pq.quota_id, pq.state_id, s.state_name, pq.crop_id, c.crop_name, pq.amount, pq.lsp, pq.msp
             FROM procurement_quota pq
             JOIN vw_mandis vm ON vm.mandi_id = ? AND pq.state_id = vm.state_id
             JOIN state s ON pq.state_id = s.state_id
             JOIN crop c ON pq.crop_id = c.crop_id
             WHERE pq.crop_id = ?
             LIMIT 1`,
            [counter.mandi_id, counter.crop_id]
        );

        let cropQuota = null;
        if (quotaRows.length > 0) {
            cropQuota = {
                quota_id: quotaRows[0].quota_id,
                state_id: quotaRows[0].state_id,
                state_name: quotaRows[0].state_name,
                crop_id: quotaRows[0].crop_id,
                crop_name: quotaRows[0].crop_name,
                lsp: parseFloat(quotaRows[0].lsp) || 0,
                msp: parseFloat(quotaRows[0].msp) || 0,
                amount: parseFloat(quotaRows[0].amount) || 0
            };
        } else {
            // Secondary fallback by crop alone if state quota not yet matched
            const [fallbackQuota] = await readDb.query(
                `SELECT pq.quota_id, pq.state_id, s.state_name, pq.crop_id, c.crop_name, pq.amount, pq.lsp, pq.msp
                 FROM procurement_quota pq
                 JOIN state s ON pq.state_id = s.state_id
                 JOIN crop c ON pq.crop_id = c.crop_id
                 WHERE pq.crop_id = ?
                 LIMIT 1`,
                [counter.crop_id]
            );
            if (fallbackQuota.length > 0) {
                cropQuota = {
                    quota_id: fallbackQuota[0].quota_id,
                    state_id: fallbackQuota[0].state_id,
                    state_name: fallbackQuota[0].state_name,
                    crop_id: fallbackQuota[0].crop_id,
                    crop_name: fallbackQuota[0].crop_name,
                    lsp: parseFloat(fallbackQuota[0].lsp) || 0,
                    msp: parseFloat(fallbackQuota[0].msp) || 0,
                    amount: parseFloat(fallbackQuota[0].amount) || 0
                };
            }
        }

        const hours = await getMandiOperatingHours(counter.mandi_id);
        const avgTime = await getCounterServiceTime(counter.counter_id);

        return res.status(200).json({
            success: true,
            data: {
                counter_id: counter.counter_id,
                counter_number: counter.counter_number,
                counter_name: counter.counter_name,
                status: counter.status,
                capacity_per_day: parseFloat(counter.capacity_per_day) || 0,
                capacity_per_day_mt: parseFloat(counter.capacity_per_day) || 0,
                capacity_per_day_qtl: parseFloat(((parseFloat(counter.capacity_per_day) || 0) * 10).toFixed(2)),
                crop: cropRows[0] || null,
                crop_quota: cropQuota,
                mandi: mandiRows[0] ? {
                    ...mandiRows[0],
                    capacity: parseFloat(mandiRows[0].capacity) || 0,
                    capacity_mt: parseFloat(mandiRows[0].capacity) || 0,
                    capacity_qtl: parseFloat(((parseFloat(mandiRows[0].capacity) || 0) * 10).toFixed(2))
                } : null,
                average_time_minutes: avgTime,
                operating_hours: hours
            }
        });
    } catch (error) {
        console.error("getCounterById error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getCounterSummary = async (req, res) => {
    try {
        const counter = req.counter;
        const readDb = getReadDatabase().promise();

        // Target service date: allow query param ?date=YYYY-MM-DD, default to CURDATE()
        let targetDate = req.query.date;
        if (!targetDate) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const day = String(now.getDate()).padStart(2, "0");
            targetDate = `${year}-${month}-${day}`;
        }

        // 1. Total scheduled quantity and total farmers coming for target service_date
        const [totalDayRows] = await readDb.query(
            `SELECT 
                COALESCE(SUM(b.quantity_approved), 0) as total_day_quantity,
                COUNT(*) as total_farmers_count
             FROM booking b
             JOIN queue_token qt ON b.booking_id = qt.booking_id
             WHERE b.counter_id = ? 
               AND qt.service_date = ?
               AND b.status NOT IN ('CANCELLED')`,
            [counter.counter_id, targetDate]
        );

        // 2. Completed quantity and completed farmers count (calculated strictly when farmers are COMPLETED)
        const [completedRows] = await readDb.query(
            `SELECT 
                COALESCE(SUM(COALESCE(p.quantity_sold, b.quantity_approved)), 0) as completed_quantity,
                COUNT(*) as completed_farmers_count
             FROM booking b
             JOIN queue_token qt ON b.booking_id = qt.booking_id
             LEFT JOIN payment p ON b.booking_id = p.booking_id
             WHERE b.counter_id = ? 
               AND qt.service_date = ?
               AND qt.status = 'COMPLETED'`,
            [counter.counter_id, targetDate]
        );

        const totalDayQuantity = parseFloat(Number(totalDayRows[0]?.total_day_quantity || 0).toFixed(2));
        const totalFarmersCount = Number(totalDayRows[0]?.total_farmers_count || 0);
        const completedQuantity = parseFloat(Number(completedRows[0]?.completed_quantity || 0).toFixed(2));
        const completedFarmersCount = Number(completedRows[0]?.completed_farmers_count || 0);

        // Remaining quantity according to total farmers coming to that day minus completed
        const remainingQuantity = parseFloat(Math.max(0, totalDayQuantity - completedQuantity).toFixed(2));
        const remainingFarmersCount = Math.max(0, totalFarmersCount - completedFarmersCount);

        const capacityPerDayMT = parseFloat(Number(counter.capacity_per_day || 0).toFixed(2));
        const capacityPerDayQtl = parseFloat((capacityPerDayMT * 10).toFixed(2));

        // Queue counts by status for target service_date
        const [statusRows] = await readDb.query(
            `SELECT 
                COUNT(CASE WHEN status = 'WAITING' THEN 1 END) as waiting,
                COUNT(CASE WHEN status = 'CALLED' THEN 1 END) as called,
                COUNT(CASE WHEN status = 'ARRIVED' THEN 1 END) as arrived,
                COUNT(CASE WHEN status = 'PROCESSING' THEN 1 END) as processing,
                COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'NOT_ARRIVED' THEN 1 END) as not_arrived,
                COUNT(*) as total_today
             FROM queue_token
             WHERE counter_id = ? AND service_date = ?`,
            [counter.counter_id, targetDate]
        );

        // Next waiting token for target service_date ordered strictly by slot time (booking_time)
        const [nextRows] = await readDb.query(
            `SELECT 
                qt.token_id, 
                qt.token_number, 
                qt.queue_position, 
                b.booking_time,
                f.name as farmer_name
             FROM queue_token qt
             JOIN booking b ON qt.booking_id = b.booking_id
             JOIN farmer f ON b.farmer_id = f.farmer_id
             WHERE qt.counter_id = ? AND qt.service_date = ? AND qt.status = 'WAITING'
             ORDER BY b.booking_time ASC, qt.queue_position ASC
             LIMIT 1`,
            [counter.counter_id, targetDate]
        );

        // Current active token (CALLED, ARRIVED or PROCESSING) for target service_date
        const [currentActive] = await readDb.query(
            `SELECT token_id, token_number, status, queue_position
             FROM queue_token
             WHERE counter_id = ? AND service_date = ? AND status IN ('PROCESSING', 'ARRIVED', 'CALLED')
             ORDER BY 
                CASE 
                    WHEN status = 'PROCESSING' THEN 1
                    WHEN status = 'ARRIVED' THEN 2
                    WHEN status = 'CALLED' THEN 3
                    ELSE 4
                END ASC
             LIMIT 1`,
            [counter.counter_id, targetDate]
        );

        const avgTime = await getCounterServiceTime(counter.counter_id);

        // Fetch Mandi details from vw_mandis
        const [mandiRows] = await readDb.query(
            `SELECT mandi_id, mandi_name, capacity, state_name FROM vw_mandis WHERE mandi_id = ?`,
            [counter.mandi_id]
        );
        const mandiCapacity = parseFloat(mandiRows[0]?.capacity || 0);

        // Fetch dynamic state-wise crop quota
        const [quotaRows] = await readDb.query(
            `SELECT pq.quota_id, pq.state_id, s.state_name, pq.crop_id, c.crop_name, pq.amount, pq.lsp, pq.msp
             FROM procurement_quota pq
             JOIN vw_mandis vm ON vm.mandi_id = ? AND pq.state_id = vm.state_id
             JOIN state s ON pq.state_id = s.state_id
             JOIN crop c ON pq.crop_id = c.crop_id
             WHERE pq.crop_id = ?
             LIMIT 1`,
            [counter.mandi_id, counter.crop_id]
        );

        const cropQuota = quotaRows.length > 0 ? {
            state_name: quotaRows[0].state_name,
            crop_name: quotaRows[0].crop_name,
            lsp: parseFloat(quotaRows[0].lsp) || 0,
            msp: parseFloat(quotaRows[0].msp) || 0,
            amount: parseFloat(quotaRows[0].amount) || 0
        } : null;

        return res.status(200).json({
            success: true,
            service_date: targetDate,
            data: {
                counter_id: counter.counter_id,
                counter_number: counter.counter_number,
                counter_name: counter.counter_name,
                status: counter.status,
                total_day_quantity: totalDayQuantity,
                completed_quantity: completedQuantity,
                remaining_quantity: remainingQuantity,
                total_farmers_count: totalFarmersCount,
                completed_farmers_count: completedFarmersCount,
                remaining_farmers_count: remainingFarmersCount,
                capacity_per_day: capacityPerDayMT,
                capacity_per_day_mt: capacityPerDayMT,
                capacity_per_day_qtl: capacityPerDayQtl,
                mandi_capacity: mandiCapacity,
                mandi_capacity_mt: mandiCapacity,
                mandi_capacity_qtl: parseFloat((mandiCapacity * 10).toFixed(2)),
                crop_quota: cropQuota,
                used_capacity: completedQuantity,
                remaining_capacity: remainingQuantity,
                average_processing_time: avgTime,
                counts: statusRows[0] || {},
                next_token: nextRows[0] || null,
                current_active_token: currentActive[0] || null
            }
        });
    } catch (error) {
        console.error("getCounterSummary error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


const getCounterQueue = async (req, res) => {
    try {
        const counter = req.counter;
        const readDb = getReadDatabase().promise();

        // Default to today if date not provided
        let targetDate = req.query.date;
        if (!targetDate) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const day = String(now.getDate()).padStart(2, "0");
            targetDate = `${year}-${month}-${day}`;
        }

        // Enforce 7-day window rule
        if (!isValidDateWindow(targetDate)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date: Allowed range is strictly from today up to the next 6 days"
            });
        }

        // Filters: by default 'active' hides COMPLETED and NOT_ARRIVED from main view
        const filter = (req.query.filter || "active").toLowerCase();
        let filterClause = "";
        const baseParams = [counter.counter_id, targetDate];

        if (filter === "active") {
            filterClause += " AND token_status NOT IN ('COMPLETED', 'NOT_ARRIVED', 'CANCELLED')";
        } else if (filter === "completed") {
            filterClause += " AND token_status = 'COMPLETED'";
        } else if (filter === "no_show" || filter === "not_arrived") {
            filterClause += " AND token_status = 'NOT_ARRIVED'";
        }

        // Search by token number, farmer name, or phone number
        if (req.query.search && req.query.search.trim()) {
            const searchPattern = `%${req.query.search.trim()}%`;
            filterClause += " AND (token_number LIKE ? OR farmer_name LIKE ? OR farmer_mobile LIKE ?)";
            baseParams.push(searchPattern, searchPattern, searchPattern);
        }

        // Total count matching criteria
        const [countResult] = await readDb.query(
            `SELECT COUNT(*) as total FROM vw_booking_queue WHERE counter_id = ? AND service_date = ? ${filterClause}`,
            baseParams
        );
        const total = countResult[0]?.total || 0;

        // Pagination
        const isAll = req.query.all === "true";
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
        const offset = (page - 1) * limit;

        const queryParams = [...baseParams];
        let paginationSql = "";
        if (!isAll) {
            paginationSql = " LIMIT ? OFFSET ?";
            queryParams.push(limit, offset);
        }

        const [tokens] = await readDb.query(
            `SELECT 
                token_id,
                token_number,
                queue_position,
                token_status,
                service_date,
                issued_at,
                called_at,
                arrival_time,
                processing_start_time,
                completion_time,
                failed_at,
                early_request_status,
                early_req_time,
                early_operator_message,
                early_farmer_response,
                early_responded_at,
                booking_id,
                booking_time,
                quantity_req,
                quantity_approved,
                booking_status,
                farmer_id,
                farmer_name,
                farmer_mobile,
                crop_id,
                crop_name,
                crop_type
             FROM vw_booking_queue
             WHERE counter_id = ? AND service_date = ? ${filterClause}
             ORDER BY 
                CASE 
                    WHEN token_status = 'PROCESSING' THEN 1
                    WHEN token_status = 'ARRIVED' THEN 2
                    WHEN token_status = 'CALLED' THEN 3
                    WHEN token_status = 'WAITING' THEN 4
                    ELSE 5
                END ASC,
                booking_time ASC,
                queue_position ASC
             ${paginationSql}`,
            queryParams
        );

        const istNowDateFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const todayStr = istNowDateFormatter.format(new Date());
        const isToday = (targetDate === todayStr);

        const enrichedTokens = tokens.map((t) => {
            const timing = getSlotTimingStatus(t.booking_time, t.service_date || targetDate);
            const earlyStatus = t.early_request_status || null;

            const isWaiting = (t.token_status === "WAITING");
            const canCall = isToday && isWaiting && (timing.isSlotActive || timing.isPastSlot || (timing.isBeforeSlot && earlyStatus === "ACCEPTED"));
            const canRequestEarly = isToday && isWaiting && timing.isBeforeSlot && (!earlyStatus || earlyStatus === "DECLINED");
            const canMarkNotArrived = isToday && (t.token_status === "WAITING" || t.token_status === "CALLED") && timing.isPastSlot;

            return {
                ...t,
                is_today: isToday,
                slot_timing: timing,
                early_request_status: earlyStatus,
                can_call: canCall,
                can_request_early: canRequestEarly,
                can_mark_not_arrived: canMarkNotArrived
            };
        });

        return res.status(200).json({
            success: true,
            service_date: targetDate,
            total: total,
            page: isAll ? 1 : page,
            limit: isAll ? total : limit,
            has_more: isAll ? false : (offset + tokens.length < total),
            count: enrichedTokens.length,
            data: enrichedTokens
        });
    } catch (error) {
        console.error("getCounterQueue error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getCompletedFarmers = async (req, res) => {
    try {
        const counter = req.counter;
        const readDb = getReadDatabase().promise();

        const retentionDays = parseInt(process.env.COMPLETED_FARMERS_RETENTION_DAYS || process.env.COMPLETED_RETENTION_DAYS, 10);
        const page = parseInt(req.query.page, 10);
        const count = parseInt(req.query.count || req.query.limit, 10);

        const [totalRows] = await readDb.query(
            `SELECT COUNT(*) as total
             FROM vw_completed_farmers
             WHERE counter_id = ? 
               AND service_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
            [counter.counter_id, retentionDays]
        );
        const total = totalRows[0]?.total || 0;

        let querySql = `SELECT 
                token_id,
                token_number,
                service_date,
                completion_time,
                booking_id,
                quantity_approved,
                farmer_id,
                farmer_name,
                farmer_mobile,
                crop_name,
                payment_id,
                total_payable_amount,
                payment_status
             FROM vw_completed_farmers
             WHERE counter_id = ? 
               AND service_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             ORDER BY completion_time DESC`;
        const queryParams = [counter.counter_id, retentionDays];

        if (page && count) {
            const offset = (page - 1) * count;
            querySql += ` LIMIT ? OFFSET ?`;
            queryParams.push(count, offset);
        }

        const [rows] = await readDb.query(querySql, queryParams);

        return res.status(200).json({
            success: true,
            retention_days: retentionDays,
            total,
            page: page || 1,
            count: rows.length,
            total_pages: count ? Math.ceil(total / count) : 1,
            data: rows
        });
    } catch (error) {
        console.error("getCompletedFarmers error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getCounterPayments = async (req, res) => {
    try {
        const counter = req.counter;
        const readDb = getReadDatabase().promise();

        const [rows] = await readDb.query(
            `SELECT 
                payment_id,
                booking_id,
                farmer_id,
                crop_id,
                quantity_sold,
                rate_per_unit,
                total_payable_amount,
                payment_status,
                payment_date,
                created_at,
                farmer_name,
                farmer_mobile,
                crop_name
             FROM vw_payment_details
             WHERE counter_id = ?
             ORDER BY created_at DESC`,
            [counter.counter_id]
        );

        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        console.error("getCounterPayments error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getCounterAvgTimes = async (req, res) => {
    try {
        const mandiId = req.user.mandi_id;
        const readDb = getReadDatabase().promise();

        const [counters] = await readDb.query(
            `SELECT 
                mc.counter_id,
                mc.counter_number,
                mc.counter_name,
                mc.mandi_id,
                mc.crop_id,
                mc.capacity_per_day,
                mc.status,
                c.crop_name,
                c.crop_type,
                cat.avg_time_minutes as cat_avg_time_minutes,
                cat.effective_date,
                cat.updated_at as timing_updated_at,
                u.username as updated_by_username,
                cst.average_time_minutes as cst_average_time_minutes,
                CASE WHEN cat.effective_date IS NOT NULL AND cat.effective_date > CURDATE() THEN 1 ELSE 0 END as has_pending_change
             FROM mandi_counter mc
             JOIN crop c ON mc.crop_id = c.crop_id
             LEFT JOIN counter_avg_time cat ON mc.counter_id = cat.counter_id
             LEFT JOIN counter_service_time cst ON mc.counter_id = cst.counter_id
             LEFT JOIN mandi_users u ON cat.updated_by = u.user_id
             WHERE mc.mandi_id = ?
             ORDER BY mc.counter_number ASC`,
            [mandiId]
        );

        const formattedCounters = counters.map(counter => {
            const hasPending = Boolean(counter.has_pending_change);
            const currentAvg = hasPending
                ? Number(counter.cst_average_time_minutes || 15)
                : Number(counter.cat_avg_time_minutes || counter.cst_average_time_minutes || 15);
            const pendingAvg = hasPending ? Number(counter.cat_avg_time_minutes) : null;
            const effectiveDate = hasPending ? counter.effective_date : null;

            return {
                ...counter,
                avg_time_minutes: currentAvg,
                current_avg_time: currentAvg,
                pending_avg_time: pendingAvg,
                effective_date: effectiveDate,
                has_pending_change: hasPending
            };
        });

        // Also fetch Mandi info from vw_mandis
        const [mandiRows] = await readDb.query(
            `SELECT mandi_id, mandi_name, capacity, state_name FROM vw_mandis WHERE mandi_id = ?`,
            [mandiId]
        );

        return res.status(200).json({
            success: true,
            mandi: mandiRows[0] || { mandi_id: mandiId },
            data: formattedCounters
        });
    } catch (error) {
        console.error("getCounterAvgTimes error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updateCounterAvgTime = async (req, res) => {
    try {
        const counterId = Number(req.params.counter_id);
        const { avg_time_minutes, password } = req.body;

        if (!password || !password.trim()) {
            return res.status(400).json({
                success: false,
                message: "Verification password is required to update counter average procurement time."
            });
        }

        const avgMinutes = parseInt(avg_time_minutes, 10);
        if (isNaN(avgMinutes) || avgMinutes < 1 || avgMinutes > 240) {
            return res.status(400).json({
                success: false,
                message: "Average procurement time must be a valid number between 1 and 240 minutes."
            });
        }

        const readDb = getReadDatabase().promise();

        // 1. Verify operator credentials & role in mandi_users
        const [userRows] = await readDb.query(
            `SELECT user_id, username, role, mandi_id, status FROM mandi_users WHERE user_id = ?`,
            [req.user.user_id]
        );

        if (userRows.length === 0 || userRows[0].status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Active mandi user account not found."
            });
        }

        const operator = userRows[0];

        // Ensure role is mandi_operator (or admin/DBA)
        const allowedRoles = ["mandi_operator", "admin", "dba", "mandi_admin"];
        if (!allowedRoles.includes(operator.role?.toLowerCase())) {
            return res.status(403).json({
                success: false,
                message: "Permission denied: Only mandi_operator can modify counter average procurement time."
            });
        }

        // 2. Verify counter belongs to this Mandi only
        const [counterRows] = await readDb.query(
            `SELECT counter_id, counter_number, counter_name, mandi_id, crop_id FROM mandi_counter WHERE counter_id = ?`,
            [counterId]
        );

        if (counterRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Counter not found."
            });
        }

        const targetCounter = counterRows[0];
        if (Number(targetCounter.mandi_id) !== Number(req.user.mandi_id)) {
            return res.status(403).json({
                success: false,
                message: "Access denied: You can only configure counters belonging to your assigned Mandi facility."
            });
        }

        // 3. Password Verification (matches MANDI_TIMING_SETTINGS_PASSWORD or GOV_SECURITY_VERIFICATION_PASSWORD)
        const expectedPassword = process.env.MANDI_TIMING_SETTINGS_PASSWORD || process.env.GOV_SECURITY_VERIFICATION_PASSWORD;
        const isPasswordMatch = expectedPassword && password === expectedPassword;

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Verification failed: Incorrect administrative password."
            });
        }

        // 4. Update counter_avg_time with effective_date set to 7 days from today on PRIMARY write DB.
        // NOTE: Counter average time comes into effect AFTER 7 DAYS.
        // We do NOT immediately overwrite counter_service_time so active and upcoming slot calculations are preserved.
        const writeDb = getWriteDatabase().promise();

        // If counter_avg_time already has a mature record (effective_date <= CURDATE() or NULL), sync it to counter_service_time
        const [matureCat] = await writeDb.query(
            `SELECT avg_time_minutes FROM counter_avg_time WHERE counter_id = ? AND (effective_date IS NULL OR effective_date <= CURDATE())`,
            [counterId]
        );
        if (matureCat.length > 0) {
            await writeDb.query(
                `INSERT INTO counter_service_time (counter_id, average_time_minutes)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE average_time_minutes = VALUES(average_time_minutes)`,
                [counterId, matureCat[0].avg_time_minutes]
            );
        } else {
            await writeDb.query(
                `INSERT INTO counter_service_time (counter_id, average_time_minutes)
                 VALUES (?, 15)
                 ON DUPLICATE KEY UPDATE average_time_minutes = average_time_minutes`,
                [counterId]
            );
        }

        await writeDb.query(
            `INSERT INTO counter_avg_time (counter_id, mandi_id, avg_time_minutes, updated_by, effective_date)
             VALUES (?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 7 DAY))
             ON DUPLICATE KEY UPDATE 
                avg_time_minutes = VALUES(avg_time_minutes),
                updated_by = VALUES(updated_by),
                effective_date = DATE_ADD(CURDATE(), INTERVAL 7 DAY)`,
            [counterId, req.user.mandi_id, avgMinutes, req.user.user_id]
        );

        const [catRow] = await writeDb.query(
            `SELECT effective_date FROM counter_avg_time WHERE counter_id = ?`,
            [counterId]
        );
        const effectiveDate = catRow[0]?.effective_date;

        // 5. Audit Logging to MongoDB
        try {
            await MandiRecentLogs.create({
                user_id: req.user.user_id,
                username: operator.username,
                recent_activity: `Average procurement time for Counter #${targetCounter.counter_number} (${targetCounter.counter_name}) scheduled to ${avgMinutes} mins (Effective in 7 days).`
            });
        } catch (mongoErr) {
            console.error("MongoDB logging error in updateCounterAvgTime:", mongoErr.message);
        }

        return res.status(200).json({
            success: true,
            message: `Counter #${targetCounter.counter_number} average procurement time update to ${avgMinutes} minutes scheduled successfully. It will become effective on ${effectiveDate ? new Date(effectiveDate).toLocaleDateString() : '7 days from today'}.`,
            data: {
                counter_id: counterId,
                counter_number: targetCounter.counter_number,
                counter_name: targetCounter.counter_name,
                pending_avg_time: avgMinutes,
                effective_date: effectiveDate,
                has_pending_change: true,
                updated_by: operator.username
            }
        });
    } catch (error) {
        console.error("updateCounterAvgTime error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

module.exports = {
    getMyCounters,
    getCounterById,
    getCounterSummary,
    getCounterQueue,
    getCompletedFarmers,
    getCounterPayments,
    getCounterAvgTimes,
    updateCounterAvgTime
};
