const { getWriteDatabase, getReadDatabase } = require("../database/databaserouter");
const {
    isMandiWorkingDay,
    getMandiOperatingHours,
    getMandiScheduleDetails,
    getCounterServiceTime,
    generateSlotsForDate,
    getCounterBookedQuantity,
    getServerCurrentDateTime,
    normalizeDateStr
} = require("../services/slotService");
const { calculateFarmerAllocation } = require("../services/allocationService");
const BookingHistory = require("../model/mongomodel/BookingHistory");

async function generateUniqueTokenNumber(conn) {
    for (let i = 0; i < 10; i++) {
        const rand = Math.floor(100000 + Math.random() * 900000);
        const candidate = `T_${rand}`;
        const [existing] = await conn.query(
            `SELECT token_id FROM queue_token WHERE token_number = ? LIMIT 1`,
            [candidate]
        );
        if (existing.length === 0) {
            return candidate;
        }
    }
    return `T_${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
}

/**
 * Extracts YYYY-MM-DD string strictly in Indian Standard Time (Asia/Kolkata, UTC+5:30)
 * Prevents UTC timezone serialization from shifting dates backward to the previous day.
 */
function getIndianDateStr(input) {
    if (!input) return "";
    if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
        return input.trim();
    }
    const d = new Date(input);
    if (isNaN(d.getTime())) return String(input).substring(0, 10);
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
}

/**
 * Returns current date and time parts strictly in Indian Standard Time (Asia/Kolkata, UTC+5:30)
 */
function getIndianNow() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hourCycle: 'h23'
    });
    const parts = formatter.formatToParts(now);
    const getVal = (type) => parts.find(p => p.type === type)?.value;
    const year = getVal('year');
    const month = getVal('month');
    const day = getVal('day');
    const hour = parseInt(getVal('hour') || 0, 10);
    const minute = parseInt(getVal('minute') || 0, 10);
    return {
        dateStr: `${year}-${month}-${day}`,
        hours: hour,
        minutes: minute,
        totalMinutes: hour * 60 + minute
    };
}

/**
 * Calculates calendar days difference until appointment date strictly in IST.
 * Returns:
 *   >= 2 : 2 or more days before appointment (permitted for cancellation/reschedule)
 *   1    : 1 day before appointment (blocked)
 *   <= 0 : Day of appointment or past (blocked unless NOT_ARRIVED)
 */
function getDaysUntilAppointment(appointmentDateInput) {
    if (!appointmentDateInput) return 0;
    const dateStr = getIndianDateStr(appointmentDateInput);
    const todayStr = getIndianNow().dateStr;

    const [appY, appM, appD] = dateStr.split("-").map(Number);
    const [todY, todM, todD] = todayStr.split("-").map(Number);

    if (isNaN(appY) || isNaN(todY)) return 0;

    const appUtc = Date.UTC(appY, appM - 1, appD);
    const todUtc = Date.UTC(todY, todM - 1, todD);

    return Math.round((appUtc - todUtc) / (1000 * 60 * 60 * 24));
}

function formatToIndianTime(val) {
    if (!val) return 'N/A';
    if (typeof val === 'string') {
        const trimmed = val.trim();
        const timeMatch = trimmed.match(/(?:^|\s|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (timeMatch) {
            let h = parseInt(timeMatch[1], 10);
            const m = timeMatch[2];
            const period = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${String(h).padStart(2, '0')}:${m} ${period}`;
        }
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).toUpperCase();
}

/**
 * GET /api/farmer/profile
 * Returns full farmer profile, bank account, and safe Aadhaar information
 */
const getProfile = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const readDb = getReadDatabase().promise();

        const [farmers] = await readDb.query(
            `SELECT 
                f.farmer_id,
                f.name,
                f.mobile_number,
                f.email,
                f.address,
                f.state_id,
                f.district_id,
                f.tehsil_id,
                f.aadhaar_verified,
                f.registration_date,
                f.status,
                f.verification_status,
                f.mobile_verified,
                s.state_name,
                d.district_name,
                t.tehsil_name,
                t.tehsil_code,
                b.account_id,
                b.bank_name,
                b.account_number,
                b.ifsc_code,
                b.verification_status AS bank_verification_status,
                f.aadhaar_lookup
             FROM farmer f
             LEFT JOIN state s ON f.state_id = s.state_id
             LEFT JOIN district d ON f.district_id = d.district_id
             LEFT JOIN tehsil t ON f.tehsil_id = t.tehsil_id
             LEFT JOIN bank_account b ON f.farmer_id = b.farmer_id
             WHERE f.farmer_id = ?`,
            [farmerId]
        );

        if (farmers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer profile not found"
            });
        }

        const farmer = farmers[0];

        // Format Aadhaar display securely
        const displayAadhaar = "XXXX-XXXX-" + (farmer.mobile_number ? farmer.mobile_number.slice(-4) : "0000");

        // Include land summary
        const [landRows] = await readDb.query(
            `SELECT 
                COALESCE(SUM(area), 0) AS total_area,
                COALESCE(SUM(CASE WHEN land_verification = 'verified' AND land_type IN ('agricultural', 'irrigated') THEN area ELSE 0 END), 0) AS eligible_area
             FROM farmer_land 
             WHERE farmer_id = ?`,
            [farmerId]
        );
        const totalLand = parseFloat(landRows[0]?.total_area) || 0;
        const eligibleLand = parseFloat(landRows[0]?.eligible_area) || 0;

        return res.status(200).json({
            success: true,
            data: {
                farmer_id: farmer.farmer_id,
                name: farmer.name,
                aadhaar_number: displayAadhaar,
                mobile_number: farmer.mobile_number,
                email: farmer.email || "Not Provided",
                address: farmer.address || "Not Provided",
                state_id: farmer.state_id,
                state_name: farmer.state_name,
                district_id: farmer.district_id,
                district_name: farmer.district_name,
                tehsil_id: farmer.tehsil_id,
                tehsil_name: farmer.tehsil_name,
                tehsil_code: farmer.tehsil_code,
                registration_date: farmer.registration_date,
                status: farmer.status,
                verification_status: Boolean(farmer.verification_status),
                mobile_verified: Boolean(farmer.mobile_verified),
                aadhaar_verified: Boolean(farmer.aadhaar_verified),
                total_eligible_land: eligibleLand,
                eligible_land_acres: eligibleLand,
                total_land_acres: totalLand,
                land_summary: {
                    total_eligible_land: eligibleLand,
                    eligible_area: eligibleLand,
                    total_area: totalLand
                },
                bank_account: farmer.account_id ? {
                    account_id: farmer.account_id,
                    bank_name: farmer.bank_name,
                    account_number: farmer.account_number,
                    ifsc_code: farmer.ifsc_code,
                    verification_status: Boolean(farmer.bank_verification_status)
                } : null
            }
        });
    } catch (error) {
        console.error("getProfile error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * GET /api/farmer/land
 * Returns land records with land_id (no plot reference numbers), area strictly in ACRES,
 * and eligible land area considering ONLY verified agricultural + irrigated land.
 */
const getLand = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const readDb = getReadDatabase().promise();

        const [lands] = await readDb.query(
            `SELECT 
                land_id,
                farmer_id,
                area,
                ownership_type,
                land_type,
                land_verification,
                land_verified_at,
                created_at,
                state_name,
                district_name,
                tehsil_name
             FROM vw_farmer_land_details
             WHERE farmer_id = ?
             ORDER BY land_id ASC`,
            [farmerId]
        );

        let totalArea = 0;
        let eligibleSellingArea = 0;

        const formattedPlots = lands.map(plot => {
            const areaNum = parseFloat(plot.area) || 0;
            totalArea += areaNum;

            // Selling allocation considers ONLY verified agricultural or irrigated land
            const isEligible = plot.land_verification === "verified" &&
                (plot.land_type === "agricultural" || plot.land_type === "irrigated");

            if (isEligible) {
                eligibleSellingArea += areaNum;
            }

            return {
                land_id: plot.land_id,
                area: areaNum,
                area_acres: areaNum,
                ownership_type: plot.ownership_type,
                land_type: plot.land_type,
                irrigation_status: plot.land_type === "irrigated" ? "Irrigated" : (plot.land_type === "agricultural" ? "Agricultural" : "Non-Irrigated"),
                verification_status: plot.land_verification,
                land_verification: plot.land_verification,
                is_eligible_for_selling: isEligible,
                verified_at: plot.land_verified_at
            };
        });

        const eligibleVal = parseFloat(eligibleSellingArea.toFixed(2));
        const totalVal = parseFloat(totalArea.toFixed(2));

        return res.status(200).json({
            success: true,
            data: {
                plots: formattedPlots,
                all_plots: formattedPlots,
                eligible_land_plots: formattedPlots.filter(p => p.is_eligible_for_selling),
                total_plots: formattedPlots.length,
                total_area_acres: totalVal,
                eligible_selling_land_acres: eligibleVal,
                total_eligible_land: eligibleVal,
                eligible_area: eligibleVal
            }
        });
    } catch (error) {
        console.error("getLand error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * GET /api/farmer/procurement-sessions
 * Returns active procurement sessions (where current date falls within session dates)
 */
const getProcurementSessions = async (req, res) => {
    try {
        const readDb = getReadDatabase().promise();
        const includeAll = req.query.all === "true";

        let sql = `
            SELECT 
                ps.session_id,
                ps.session_name,
                ps.crop_id,
                c.crop_name,
                c.crop_type,
                ps.start_date,
                ps.end_date,
                ps.created_at,
                CASE 
                    WHEN CURDATE() BETWEEN ps.start_date AND ps.end_date THEN 1 
                    ELSE 0 
                END AS is_active
            FROM procurement_session ps
            JOIN crop c ON ps.crop_id = c.crop_id
        `;

        if (!includeAll) {
            sql += ` WHERE CURDATE() BETWEEN ps.start_date AND ps.end_date`;
        }

        sql += ` ORDER BY ps.start_date ASC, ps.end_date ASC`;

        const [sessions] = await readDb.query(sql);

        return res.status(200).json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error("getProcurementSessions error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * GET /api/farmer/available-crops
 * STRICT REQUIREMENT: Only returns crops that are assigned to the specified procurement session.
 */
const getAvailableCrops = async (req, res) => {
    try {
        const sessionId = req.query.session_id ? Number(req.query.session_id) : null;
        const farmerId = req.user?.farmer_id;
        const readDb = getReadDatabase().promise();

        let sql = `
            SELECT DISTINCT
                c.crop_id,
                c.crop_name,
                c.crop_type,
                ps.session_id,
                ps.session_name,
                ps.start_date,
                ps.end_date,
                COALESCE(
                    pq.msp,
                    pq.lsp,
                    (SELECT COALESCE(pq2.msp, pq2.lsp) FROM procurement_quota pq2 WHERE pq2.crop_id = c.crop_id LIMIT 1)
                ) AS msp_price
            FROM procurement_session ps
            JOIN crop c ON ps.crop_id = c.crop_id
            LEFT JOIN farmer f ON f.farmer_id = ?
            LEFT JOIN procurement_quota pq ON pq.crop_id = c.crop_id AND pq.state_id = f.state_id
            WHERE CURDATE() BETWEEN ps.start_date AND ps.end_date
        `;
        const params = [farmerId || null];

        if (sessionId) {
            sql += ` AND ps.session_id = ?`;
            params.push(sessionId);
        }

        sql += ` ORDER BY c.crop_name ASC`;

        const [crops] = await readDb.query(sql, params);

        return res.status(200).json({
            success: true,
            data: crops
        });
    } catch (error) {
        console.error("getAvailableCrops error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * GET /api/farmer/available-mandis
 * Returns mandis located in farmer's registered tehsil
 */
const getAvailableMandis = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const readDb = getReadDatabase().promise();

        const [farmerRows] = await readDb.query(
            `SELECT tehsil_id FROM farmer WHERE farmer_id = ?`,
            [farmerId]
        );

        if (farmerRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer not found"
            });
        }

        const tehsilId = farmerRows[0].tehsil_id;
        const cropId = req.query.crop_id ? Number(req.query.crop_id) : null;

        let sql = `
            SELECT DISTINCT 
                m.mandi_id,
                m.mandi_name,
                m.tehsil_id,
                t.tehsil_name,
                m.capacity
            FROM mandi m
            JOIN tehsil t ON m.tehsil_id = t.tehsil_id
        `;
        const params = [];

        if (cropId) {
            sql += ` JOIN mandi_counter mc ON m.mandi_id = mc.mandi_id AND mc.crop_id = ? AND LOWER(mc.status) = 'active'`;
            params.push(cropId);
        } else {
            sql += ` JOIN mandi_counter mc ON m.mandi_id = mc.mandi_id AND LOWER(mc.status) = 'active'`;
        }

        sql += ` WHERE m.tehsil_id = ? ORDER BY m.mandi_name ASC`;
        params.push(tehsilId);

        const [mandis] = await readDb.query(sql, params);

        const formattedMandis = await Promise.all(mandis.map(async (m) => {
            const capMt = parseFloat(m.capacity) || 500;
            const schedule = await getMandiScheduleDetails(m.mandi_id, null, readDb);
            return {
                ...m,
                capacity: capMt,
                capacity_mt: capMt,
                capacity_qtl: parseFloat((capMt * 10).toFixed(2)),
                capacity_unit: "MT/Day",
                schedule: {
                    opening_time: schedule.timing.opening_time,
                    closing_time: schedule.timing.closing_time,
                    active_opening_time: schedule.timing.active_opening_time,
                    active_closing_time: schedule.timing.active_closing_time,
                    pending_opening_time: schedule.timing.pending_opening_time,
                    pending_closing_time: schedule.timing.pending_closing_time,
                    effective_date: schedule.timing.effective_date,
                    mandi_effect_timing_date: schedule.timing.effective_date,
                    has_pending_timing: schedule.has_pending_timing,
                    working_days: schedule.working_days,
                    has_pending_working_days: schedule.has_pending_working_days,
                    has_any_pending: schedule.has_any_pending
                }
            };
        }));

        return res.status(200).json({
            success: true,
            data: formattedMandis
        });
    } catch (error) {
        console.error("getAvailableMandis error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * GET /api/farmer/available-counters
 * Returns active counters for selected mandi and crop
 */
const getAvailableCounters = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const mandiId = Number(req.query.mandi_id);
        const cropId = Number(req.query.crop_id);
        const targetDate = req.query.date || req.query.service_date || null;

        if (!mandiId || !cropId) {
            return res.status(400).json({
                success: false,
                message: "mandi_id and crop_id query parameters are required"
            });
        }

        const readDb = getReadDatabase().promise();

        // Validate mandi belongs to farmer's tehsil
        const [farmerRows] = await readDb.query(
            `SELECT f.tehsil_id 
             FROM farmer f 
             JOIN mandi m ON f.tehsil_id = m.tehsil_id 
             WHERE f.farmer_id = ? AND m.mandi_id = ?`,
            [farmerId, mandiId]
        );

        if (farmerRows.length === 0) {
            return res.status(403).json({
                success: false,
                message: "Selected mandi is outside your registered tehsil jurisdiction."
            });
        }

        const [counters] = await readDb.query(
            `SELECT 
                mc.counter_id,
                mc.mandi_id,
                mc.counter_number,
                mc.counter_name,
                mc.crop_id,
                c.crop_name,
                mc.capacity_per_day,
                mc.status
             FROM mandi_counter mc
             JOIN crop c ON mc.crop_id = c.crop_id
             WHERE mc.mandi_id = ? 
               AND mc.crop_id = ? 
               AND LOWER(TRIM(mc.status)) = 'active'
             ORDER BY mc.counter_number ASC`,
            [mandiId, cropId]
        );

        // Filter strictly active counters only
        const activeCounters = (counters || []).filter(c => String(c.status || '').trim().toLowerCase() === 'active');

        // Enrich counters with service time respecting 7-day delay and real-time booked quantity in MT/QTL
        const enriched = await Promise.all(activeCounters.map(async (cnt) => {
            const avgTime = await getCounterServiceTime(cnt.counter_id, targetDate);
            const capacityMt = parseFloat(cnt.capacity_per_day) || 10;
            const capacityQtl = parseFloat((capacityMt * 10).toFixed(2));
            let bookedQtyQtl = 0;
            let bookedCount = 0;

            if (targetDate) {
                const [bRows] = await readDb.query(
                    `SELECT COUNT(*) AS cnt, 
                            COALESCE(SUM(COALESCE(quantity_approved, quantity_req)), 0) AS total_qty 
                     FROM booking 
                     WHERE counter_id = ? AND DATE(booking_time) = DATE(?) 
                       AND status NOT IN ('CANCELLED', 'NOT_ARRIVED')`,
                    [cnt.counter_id, targetDate]
                );
                bookedCount = bRows[0].cnt;
                bookedQtyQtl = parseFloat(bRows[0].total_qty) || 0;
            }

            const bookedQtyMt = parseFloat((bookedQtyQtl / 10).toFixed(2));
            const remainingQtl = Math.max(0, parseFloat((capacityQtl - bookedQtyQtl).toFixed(2)));
            const remainingMt = parseFloat((remainingQtl / 10).toFixed(2));
            const isFull = targetDate ? (bookedQtyQtl >= capacityQtl) : false;

            return {
                ...cnt,
                average_time_minutes: avgTime,
                daily_capacity: capacityMt,
                daily_capacity_mt: capacityMt,
                daily_capacity_qtl: capacityQtl,
                capacity_unit: "MT/Day",
                booked_quantity_qtl: bookedQtyQtl,
                booked_quantity_mt: bookedQtyMt,
                booked_farmers: bookedCount,
                remaining_capacity_qtl: remainingQtl,
                remaining_capacity_mt: remainingMt,
                is_full: isFull,
                full_message: isFull ? `Mandi counter is full for ${targetDate || 'selected date'}. Daily intake capacity of ${capacityMt} MT (${capacityQtl} QTL) has been reached.` : null
            };
        }));

        return res.status(200).json({
            success: true,
            data: enriched
        });
    } catch (error) {
        console.error("getAvailableCounters error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * GET /api/farmer/available-slots
 * Generates slots for a counter and date with strict one-farmer-per-slot calculation.
 * Shared logic for both new booking and reschedule.
 */
const getAvailableSlots = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const mandiId = Number(req.query.mandi_id);
        const counterId = Number(req.query.counter_id);
        const targetDate = req.query.date || req.query.booking_date || req.query.service_date;
        const excludeBookingId = req.query.exclude_booking_id ? Number(req.query.exclude_booking_id) : null;

        if (!mandiId || !counterId || !targetDate) {
            return res.status(400).json({
                success: false,
                message: "mandi_id, counter_id, and date are required"
            });
        }

        const readDb = getReadDatabase().promise();

        // 1. Verify mandi access: either belongs to farmer's tehsil or is from the booking being rescheduled
        let isMandiValid = false;
        if (excludeBookingId) {
            const [bookingMatch] = await readDb.query(
                `SELECT b.booking_id FROM booking b 
                 JOIN mandi_counter mc ON b.counter_id = mc.counter_id 
                 WHERE b.booking_id = ? AND b.farmer_id = ? AND mc.mandi_id = ?`,
                [excludeBookingId, farmerId, mandiId]
            );
            if (bookingMatch.length > 0) {
                isMandiValid = true;
            }
        }

        if (!isMandiValid) {
            const [checkMandi] = await readDb.query(
                `SELECT f.farmer_id 
                 FROM farmer f 
                 JOIN mandi m ON f.tehsil_id = m.tehsil_id 
                 WHERE f.farmer_id = ? AND m.mandi_id = ?`,
                [farmerId, mandiId]
            );
            if (checkMandi.length > 0) {
                isMandiValid = true;
            }
        }

        if (!isMandiValid) {
            return res.status(403).json({
                success: false,
                message: "Selected mandi is not valid for your registered tehsil."
            });
        }

        // 1b. Verify counter exists, belongs to this mandi, and is active
        const [counterCheck] = await readDb.query(
            `SELECT counter_id, status FROM mandi_counter WHERE counter_id = ? AND mandi_id = ? AND LOWER(TRIM(status)) = 'active'`,
            [counterId, mandiId]
        );

        if (counterCheck.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Selected counter is inactive or does not exist."
            });
        }

        // 2. Date window check using server/DB current date: within next 7 days, not in past
        const serverNow = await getServerCurrentDateTime(readDb);
        const targetDateStr = normalizeDateStr(targetDate);

        if (!targetDateStr) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format. Expected YYYY-MM-DD."
            });
        }

        if (targetDateStr < serverNow.dateStr) {
            return res.status(400).json({
                success: false,
                message: "Booking date cannot be in the past."
            });
        }

        const [dY, dM, dD] = serverNow.dateStr.split('-').map(Number);
        const [tY, tM, tD] = targetDateStr.split('-').map(Number);
        const curUtc = Date.UTC(dY, dM - 1, dD);
        const targetUtc = Date.UTC(tY, tM - 1, tD);
        const diffDays = Math.round((targetUtc - curUtc) / (1000 * 60 * 60 * 24));

        if (diffDays > 7) {
            return res.status(400).json({
                success: false,
                message: "Booking date must be within the next 7 days."
            });
        }

        // 3. Generate slots using shared slot availability service
        const slotData = await generateSlotsForDate(mandiId, counterId, targetDate, excludeBookingId);

        return res.status(200).json({
            success: true,
            data: slotData
        });
    } catch (error) {
        console.error("getAvailableSlots error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * GET /api/farmer/allocation
 * Validates crop/session combination and returns farmer allocated, sold, and remaining quantity
 */
const getAllocation = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const cropId = Number(req.query.crop_id);
        const sessionId = Number(req.query.session_id);

        if (!cropId || !sessionId) {
            return res.status(400).json({
                success: false,
                message: "crop_id and session_id are required"
            });
        }

        const readDb = getReadDatabase().promise();

        // Authoritative crop/session validation: reject immediately if crop does not belong to session
        const [sessionRows] = await readDb.query(
            `SELECT ps.session_id, ps.session_name, ps.crop_id, c.crop_name, ps.start_date, ps.end_date 
             FROM procurement_session ps
             JOIN crop c ON ps.crop_id = c.crop_id
             WHERE ps.session_id = ? AND ps.crop_id = ?`,
            [sessionId, cropId]
        );

        if (sessionRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Selected crop is not available in this procurement session."
            });
        }

        const session = sessionRows[0];
        const allocation = await calculateFarmerAllocation(readDb, farmerId, cropId, sessionId);

        let statusMessage = "You can book procurement slots for this crop.";
        if (allocation.remaining_quantity <= 0) {
            statusMessage = "You have already sold your full allocated quota across all crops in this procurement session.";
        } else if (allocation.has_upcoming_booking) {
            statusMessage = "You already have an upcoming booking/token. Please complete, reschedule, or cancel it before booking another slot.";
        }

        return res.status(200).json({
            success: true,
            data: {
                ...allocation,
                session_name: session.session_name,
                crop_name: session.crop_name,
                session_start_date: session.start_date,
                session_end_date: session.end_date,
                status_message: statusMessage
            }
        });
    } catch (error) {
        console.error("getAllocation error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * POST /api/farmer/bookings
 * Authoritative slot booking and token creation executed inside a PRIMARY database transaction.
 */
const createBooking = async (req, res) => {
    const pool = getWriteDatabase().promise();
    let conn;

    try {
        const farmerId = req.user.farmer_id;
        const session_id = Number(req.body.session_id);
        const crop_id = Number(req.body.crop_id);
        const mandi_id = Number(req.body.mandi_id);
        const counter_id = Number(req.body.counter_id);
        const booking_date = req.body.booking_date || req.body.service_date;
        const booking_time = req.body.booking_time;
        const quantity_req = req.body.quantity_req != null ? req.body.quantity_req : req.body.requested_quantity;

        if (!session_id || !crop_id || !mandi_id || !counter_id || !booking_date || !booking_time || quantity_req == null) {
            return res.status(400).json({
                success: false,
                message: "All booking details (session_id, crop_id, mandi_id, counter_id, booking_date, booking_time, quantity_req) are required."
            });
        }

        const requestedQty = parseFloat(quantity_req);
        if (isNaN(requestedQty) || requestedQty <= 0) {
            return res.status(400).json({
                success: false,
                message: "Requested quantity must be greater than 0."
            });
        }

        // Format and validate datetime
        const cleanTime = String(booking_time).trim();
        const normalizedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
        const targetDateTimeStr = `${booking_date} ${normalizedTime}`;
        const bookingDateTime = new Date(targetDateTimeStr);

        if (isNaN(bookingDateTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking date or time format."
            });
        }

        // Date window validation: next 7 days, not past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDateObj = new Date(booking_date);
        targetDateObj.setHours(0, 0, 0, 0);

        if (targetDateObj < today) {
            return res.status(400).json({
                success: false,
                message: "Booking date cannot be in the past."
            });
        }

        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 7);
        if (targetDateObj > maxDate) {
            return res.status(400).json({
                success: false,
                message: "Booking date must be within the next 7 days."
            });
        }

        // Acquire dedicated connection and begin PRIMARY transaction
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Farmer verification re-check inside transaction
        const [vRows] = await conn.query(
            `SELECT f.farmer_id, f.status, f.mobile_verified, f.verification_status AS farmer_verified,
                    f.tehsil_id, t.tehsil_code,
                    COALESCE(b.verification_status, 0) AS bank_verified
             FROM farmer f
             JOIN tehsil t ON f.tehsil_id = t.tehsil_id
             LEFT JOIN bank_account b ON f.farmer_id = b.farmer_id
             WHERE f.farmer_id = ?
             FOR UPDATE`,
            [farmerId]
        );

        if (vRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: "Farmer record not found." });
        }

        const fRecord = vRows[0];
        if (fRecord.status !== "active" || !fRecord.mobile_verified || !fRecord.farmer_verified || !fRecord.bank_verified) {
            await conn.rollback();
            return res.status(403).json({
                success: false,
                message: "You have not completed all required verification."
            });
        }

        // 2. Validate Session and Crop compatibility
        const [sessionRows] = await conn.query(
            `SELECT session_id, crop_id, start_date, end_date 
             FROM procurement_session 
             WHERE session_id = ? AND crop_id = ? 
             FOR UPDATE`,
            [session_id, crop_id]
        );

        if (sessionRows.length === 0) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Selected crop is not available in this procurement session."
            });
        }

        const session = sessionRows[0];
        const sessionStartDate = new Date(session.start_date);
        sessionStartDate.setHours(0, 0, 0, 0);
        const sessionEndDate = new Date(session.end_date);
        sessionEndDate.setHours(23, 59, 59, 999);

        if (today < sessionStartDate || today > sessionEndDate) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "The procurement session is currently closed."
            });
        }

        if (targetDateObj > sessionEndDate) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "The selected date is outside the procurement session."
            });
        }

        // 3. Validate Mandi eligibility for farmer's tehsil
        const [mandiRows] = await conn.query(
            `SELECT mandi_id, tehsil_id FROM mandi WHERE mandi_id = ? AND tehsil_id = ?`,
            [mandi_id, fRecord.tehsil_id]
        );

        if (mandiRows.length === 0) {
            await conn.rollback();
            return res.status(403).json({
                success: false,
                message: "Selected mandi is not valid for your registered tehsil."
            });
        }

        // 4. Validate Counter
        const [counterRows] = await conn.query(
            `SELECT counter_id, capacity_per_day, status 
             FROM mandi_counter 
             WHERE counter_id = ? AND mandi_id = ? AND crop_id = ? 
             FOR UPDATE`,
            [counter_id, mandi_id, crop_id]
        );

        if (counterRows.length === 0 || String(counterRows[0].status || '').trim().toLowerCase() !== "active") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Selected counter is not active or does not handle this crop."
            });
        }

        const counter = counterRows[0];
        const capacityPerDay = parseFloat(counter.capacity_per_day) || 10;

        // 5. Mandi working day check on Primary DB transaction
        const isWorking = await isMandiWorkingDay(mandi_id, booking_date, conn);
        if (!isWorking) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "The mandi is closed on the selected date."
            });
        }

        // 6. Mandi operating hours check on Primary DB transaction for booking_date
        const operatingHours = await getMandiOperatingHours(mandi_id, booking_date, conn);
        const [openH, openM] = operatingHours.opening_time.split(":").map(Number);
        const [closeH, closeM] = operatingHours.closing_time.split(":").map(Number);
        const [slotH, slotM] = booking_time.split(":").map(Number);

        const slotMinutes = slotH * 60 + slotM;
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        if (slotMinutes < openMinutes || slotMinutes >= closeMinutes) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "The selected time is outside mandi working hours."
            });
        }

        // Same-day check: Do not allow booking for past time slots strictly in IST
        const istNow = getIndianNow();
        const bookingDateStr = getIndianDateStr(booking_date);
        if (bookingDateStr === istNow.dateStr) {
            if (slotMinutes <= istNow.totalMinutes) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Cannot book a time slot in the past. Please select an upcoming slot."
                });
            }
        }

        // 7. Check if farmer already has ANY upcoming active booking/token across the system
        const [upcomingBookings] = await conn.query(
            `SELECT booking_id, booking_time, status FROM booking 
             WHERE farmer_id = ? 
               AND status IN ('BOOKED', 'WAITING', 'CALLED', 'ARRIVED', 'PROCESSING') 
             FOR UPDATE`,
            [farmerId]
        );

        if (upcomingBookings.length > 0) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "You already have an upcoming booking/token."
            });
        }

        // 8. Authoritative Allocation & Remaining Quantity re-check inside transaction
        const allocation = await calculateFarmerAllocation(conn, farmerId, crop_id, session_id);

        if (allocation.remaining_quantity <= 0) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "You have already sold your full allocated quota across all crops in this procurement session."
            });
        }

        if (requestedQty > allocation.remaining_quantity) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: `You have only ${allocation.remaining_quantity} QTL remaining in your total session quota across all crops.`
            });
        }

        // 9. Counter Daily Capacity check in MT and Quintals (1 MT = 10 QTL) inside transaction
        const capacityMt = parseFloat(counter.capacity_per_day) || 10;
        const capacityQtl = parseFloat((capacityMt * 10).toFixed(2));

        const [qtyRows] = await conn.query(
            `SELECT COALESCE(SUM(COALESCE(quantity_approved, quantity_req)), 0) AS total_booked_qty 
             FROM booking 
             WHERE counter_id = ? AND DATE(booking_time) = DATE(?) 
               AND status NOT IN ('CANCELLED', 'NOT_ARRIVED') 
             FOR UPDATE`,
            [counter_id, booking_date]
        );

        const currentBookedQtl = parseFloat(qtyRows[0]?.total_booked_qty) || 0;
        if (currentBookedQtl >= capacityQtl) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: `Mandi counter is full for ${booking_date} for this crop. Daily intake capacity of ${capacityMt} MT (${capacityQtl} Quintals) has already been reached.`
            });
        }

        if ((currentBookedQtl + requestedQty) > capacityQtl) {
            const availableSpaceQtl = Math.max(0, parseFloat((capacityQtl - currentBookedQtl).toFixed(2)));
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: `Mandi counter capacity insufficient for ${booking_date}. Only ${availableSpaceQtl} Quintals intake capacity remains at this counter on this date.`
            });
        }

        // 10. STRICT ONE-FARMER-PER-TIME-SLOT check inside transaction
        const [slotOccupancy] = await conn.query(
            `SELECT booking_id FROM booking 
             WHERE counter_id = ? 
               AND booking_time = ? 
               AND status NOT IN ('CANCELLED', 'NOT_ARRIVED') 
             FOR UPDATE`,
            [counter_id, targetDateTimeStr]
        );

        if (slotOccupancy.length > 0) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "This time slot is already booked."
            });
        }

        // 11. Token generation: Randomly like T_value (e.g. T_481920) so multiple bookings have distinct tokens
        const generatedTokenNumber = await generateUniqueTokenNumber(conn);

        // Queue position on this counter and date
        const [tokenPosRows] = await conn.query(
            `SELECT COALESCE(MAX(queue_position), 0) AS max_pos 
             FROM queue_token 
             WHERE counter_id = ? AND service_date = ? 
             FOR UPDATE`,
            [counter_id, booking_date]
        );
        const newQueuePos = Number(tokenPosRows[0]?.max_pos) + 1;

        // 12. Insert Booking row
        const [insertBookingResult] = await conn.query(
            `INSERT INTO booking 
             (farmer_id, crop_id, session_id, counter_id, quantity_req, quantity_approved, booking_time, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'WAITING')`,
            [farmerId, crop_id, session_id, counter_id, requestedQty, requestedQty, targetDateTimeStr]
        );

        const finalBookingId = insertBookingResult.insertId;

        // 13. Insert Queue Token row
        const [insertTokenResult] = await conn.query(
            `INSERT INTO queue_token 
             (booking_id, counter_id, service_date, token_number, queue_position, status, issued_at)
             VALUES (?, ?, ?, ?, ?, 'WAITING', NOW())`,
            [finalBookingId, counter_id, booking_date, generatedTokenNumber, newQueuePos]
        );

        const finalTokenId = insertTokenResult.insertId;

        // Commit transaction to Primary MySQL
        await conn.commit();

        // 14. Mirror into MongoDB BookingHistory for fast paginated recent history
        try {
            await BookingHistory.create({
                booking_id: finalBookingId,
                farmer_id: farmerId,
                crop_id,
                session_id,
                counter_id,
                quantity_req: requestedQty,
                quantity_approved: requestedQty,
                booking_time: bookingDateTime,
                status: "WAITING",
                created_at: new Date(),
                archived_at: new Date()
            });
        } catch (mongoErr) {
            console.error("MongoDB BookingHistory log notice:", mongoErr.message);
        }

        return res.status(201).json({
            success: true,
            message: "Slot booked successfully.",
            data: {
                booking_id: finalBookingId,
                token_id: finalTokenId,
                token_number: generatedTokenNumber,
                queue_position: newQueuePos,
                service_date: booking_date,
                booking_time: targetDateTimeStr,
                quantity_approved: requestedQty,
                status: "WAITING"
            }
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("createBooking error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/farmer/bookings
 * Returns all bookings for the authenticated farmer
 */
const getBookings = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const readDb = getReadDatabase().promise();

        const defaultLimit = parseInt(process.env.PAGINATION_LIMIT, 10) || 10;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
        const offset = (page - 1) * limit;

        // 1. Total records count at database level
        const [countRows] = await readDb.query(
            `SELECT COUNT(*) AS total FROM vw_farmer_booking_details WHERE farmer_id = ?`,
            [farmerId]
        );
        const total = Number(countRows[0]?.total || 0);

        // 2. Fetch paginated records using SQL LIMIT and OFFSET
        const [bookings] = await readDb.query(
            `SELECT 
                booking_id,
                farmer_id,
                crop_id,
                crop_name,
                crop_type,
                session_id,
                session_name,
                counter_id,
                counter_name,
                counter_number,
                mandi_id,
                mandi_name,
                quantity_req,
                quantity_approved,
                booking_time,
                booking_status AS status,
                booking_created_at AS created_at,
                token_id,
                token_number,
                queue_position,
                service_date,
                token_status,
                payment_id,
                payment_status,
                total_payable_amount
             FROM vw_farmer_booking_details
             WHERE farmer_id = ?
             ORDER BY 
                 CASE 
                     WHEN booking_status IN ('CALLED', 'PROCESSING', 'ARRIVED', 'WAITING', 'BOOKED') THEN 1
                     WHEN booking_status = 'COMPLETED' THEN 2
                     WHEN booking_status IN ('RESCHEDULED', 'CANCELLED', 'NOT_ARRIVED') THEN 3
                     ELSE 4
                 END ASC,
                 booking_time DESC,
                 booking_created_at DESC
             LIMIT ? OFFSET ?`,
            [farmerId, limit, offset]
        );

        const enrichedBookings = bookings.map(b => {
            const isCalledOrArrived = ["CALLED", "ARRIVED", "PROCESSING", "COMPLETED"].includes(b.status);
            const isNotArrived = b.status === "NOT_ARRIVED";
            const daysUntil = getDaysUntilAppointment(b.booking_time || b.service_date);

            // Enforce 30-minute security lock after booking creation
            let within30MinWait = false;
            let remainingWaitMinutes = 0;
            if (b.created_at && b.status !== "CANCELLED" && b.status !== "COMPLETED") {
                const createdAtMs = new Date(b.created_at).getTime();
                const elapsedMs = Date.now() - createdAtMs;
                const requiredWaitMs = 30 * 60 * 1000;
                if (elapsedMs < requiredWaitMs) {
                    within30MinWait = true;
                    remainingWaitMinutes = Math.max(1, Math.ceil((requiredWaitMs - elapsedMs) / (60 * 1000)));
                }
            }

            const canCancel = !isCalledOrArrived && b.status !== "CANCELLED" && (isNotArrived || daysUntil >= 2) && !within30MinWait;
            const canReschedule = !isCalledOrArrived && b.status !== "CANCELLED" && (isNotArrived || daysUntil >= 2);

            let lockReason = null;
            if (isCalledOrArrived) {
                lockReason = "Called or arrived at counter - cancellation and rescheduling disabled";
            } else if (within30MinWait) {
                lockReason = `Cancellation locked for security: ${remainingWaitMinutes} minute(s) remaining (minimum 30 minutes required after booking)`;
            } else if (!isNotArrived && daysUntil < 2 && b.status !== "CANCELLED") {
                lockReason = "Cannot reschedule or cancel 1 day before or on appointment day (must be at least 2 days prior)";
            }

            return {
                ...b,
                can_cancel: canCancel,
                can_reschedule: canReschedule,
                days_until_appointment: daysUntil,
                remaining_cancellation_wait_minutes: remainingWaitMinutes,
                lock_reason: lockReason
            };
        });

        const totalPages = Math.ceil(total / limit) || 1;
        const hasMore = page < totalPages;

        return res.status(200).json({
            success: true,
            data: enrichedBookings,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                has_more: hasMore
            }
        });
    } catch (error) {
        console.error("getBookings error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * GET /api/farmer/bookings/current
 * Returns the currently active upcoming booking (if any)
 */
const getCurrentBooking = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const readDb = getReadDatabase().promise();

        const [activeBookings] = await readDb.query(
            `SELECT 
                b.booking_id,
                b.farmer_id,
                b.crop_id,
                c.crop_name,
                c.crop_type,
                b.session_id,
                ps.session_name,
                b.counter_id,
                mc.counter_name,
                mc.counter_number,
                mc.mandi_id,
                m.mandi_name,
                b.quantity_req,
                b.quantity_approved,
                b.booking_time,
                b.status,
                b.created_at,
                qt.token_id,
                qt.token_number,
                qt.queue_position,
                qt.service_date,
                qt.status AS token_status,
                qt.called_at,
                qt.arrival_time,
                qt.processing_start_time
             FROM booking b
             JOIN crop c ON b.crop_id = c.crop_id
             JOIN procurement_session ps ON b.session_id = ps.session_id
             JOIN mandi_counter mc ON b.counter_id = mc.counter_id
             JOIN mandi m ON mc.mandi_id = m.mandi_id
             LEFT JOIN queue_token qt ON b.booking_id = qt.booking_id
             WHERE b.farmer_id = ? 
               AND b.status IN ('BOOKED', 'WAITING', 'CALLED', 'ARRIVED', 'PROCESSING', 'NOT_ARRIVED')
             ORDER BY 
                 CASE 
                     WHEN b.status IN ('WAITING', 'BOOKED', 'CALLED', 'ARRIVED', 'PROCESSING') THEN 1 
                     WHEN b.status = 'NOT_ARRIVED' THEN 2 
                     ELSE 3 
                 END ASC,
                 b.booking_time ASC
             LIMIT 1`,
            [farmerId]
        );

        if (activeBookings.length === 0) {
            return res.status(200).json({
                success: true,
                data: null
            });
        }

        const current = activeBookings[0];
        const isCalledOrArrived = ["CALLED", "ARRIVED", "PROCESSING", "COMPLETED"].includes(current.status);
        const isNotArrived = current.status === "NOT_ARRIVED";
        const daysUntil = getDaysUntilAppointment(current.booking_time || current.service_date);

        // Enforce 30-minute security lock after booking creation
        let within30MinWait = false;
        let remainingWaitMinutes = 0;
        if (current.created_at && current.status !== "CANCELLED" && current.status !== "COMPLETED") {
            const createdAtMs = new Date(current.created_at).getTime();
            const elapsedMs = Date.now() - createdAtMs;
            const requiredWaitMs = 30 * 60 * 1000;
            if (elapsedMs < requiredWaitMs) {
                within30MinWait = true;
                remainingWaitMinutes = Math.max(1, Math.ceil((requiredWaitMs - elapsedMs) / (60 * 1000)));
            }
        }

        const canCancel = !isCalledOrArrived && current.status !== "CANCELLED" && (isNotArrived || daysUntil >= 2) && !within30MinWait;
        const canReschedule = !isCalledOrArrived && current.status !== "CANCELLED" && (isNotArrived || daysUntil >= 2);

        let lockReason = null;
        if (isCalledOrArrived) {
            lockReason = "Called or arrived at counter - cancellation and rescheduling disabled";
        } else if (within30MinWait) {
            lockReason = `Cancellation locked for security: ${remainingWaitMinutes} minute(s) remaining (minimum 30 minutes required after booking)`;
        } else if (!isNotArrived && daysUntil < 2) {
            lockReason = "Cannot reschedule or cancel 1 day before or on appointment day (must be at least 2 days prior)";
        }

        return res.status(200).json({
            success: true,
            data: {
                ...current,
                can_cancel: canCancel,
                can_reschedule: canReschedule,
                days_until_appointment: daysUntil,
                remaining_cancellation_wait_minutes: remainingWaitMinutes,
                lock_reason: lockReason
            }
        });
    } catch (error) {
        console.error("getCurrentBooking error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * PATCH /api/farmer/bookings/:bookingId/cancel
 * Cancels a booking and its corresponding queue token
 */
const cancelBooking = async (req, res) => {
    const pool = getWriteDatabase().promise();
    let conn;

    try {
        const farmerId = req.user.farmer_id;
        const bookingId = Number(req.params.bookingId);

        if (!bookingId || isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required."
            });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verify ownership and status
        const [bookings] = await conn.query(
            `SELECT booking_id, farmer_id, status, booking_time, created_at FROM booking 
             WHERE booking_id = ? AND farmer_id = ? 
             FOR UPDATE`,
            [bookingId, farmerId]
        );

        if (bookings.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                success: false,
                message: "Booking not found or does not belong to you."
            });
        }

        const booking = bookings[0];

        if (booking.status === "COMPLETED") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Completed sales cannot be cancelled."
            });
        }

        if (booking.status === "CANCELLED") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Booking is already cancelled."
            });
        }

        if (booking.status === "PROCESSING") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot cancel a booking currently being processed at the counter."
            });
        }

        // Enforce 30-minute security wait time after booking creation before cancellation is permitted
        if (booking.created_at) {
            const createdAtMs = new Date(booking.created_at).getTime();
            const elapsedMs = Date.now() - createdAtMs;
            const requiredWaitMs = 30 * 60 * 1000;
            if (elapsedMs < requiredWaitMs) {
                await conn.rollback();
                const remainingMinutes = Math.max(1, Math.ceil((requiredWaitMs - elapsedMs) / (60 * 1000)));
                return res.status(400).json({
                    success: false,
                    message: `Cancellation locked for security: ${remainingMinutes} minute(s) remaining (minimum 30 minutes required after booking)`,
                    remaining_wait_minutes: remainingMinutes
                });
            }
        }

        // Check associated token status
        const [tokenRows] = await conn.query(
            `SELECT token_id, status FROM queue_token WHERE booking_id = ? FOR UPDATE`,
            [bookingId]
        );
        const tokenStatus = tokenRows[0]?.status;

        // Block cancellation if farmer has been called or has arrived
        if (booking.status === "CALLED" || booking.status === "ARRIVED" || tokenStatus === "CALLED" || tokenStatus === "ARRIVED") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot cancel your booking once you have been called or arrived at the mandi."
            });
        }

        // Enforce: Cannot cancel 1 day before or on appointment day; permitted 2+ days prior OR if marked NOT_ARRIVED
        if (booking.status !== "NOT_ARRIVED" && tokenStatus !== "NOT_ARRIVED") {
            const daysUntil = getDaysUntilAppointment(booking.booking_time);
            if (daysUntil < 2) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Cancellation is only permitted at least 2 days prior to your scheduled appointment date. You cannot cancel on or 1 day before your scheduled appointment date."
                });
            }
        }

        // Cancel booking
        await conn.query(
            `UPDATE booking SET status = 'CANCELLED' WHERE booking_id = ?`,
            [bookingId]
        );

        // Cancel queue token
        await conn.query(
            `UPDATE queue_token SET status = 'CANCELLED' 
             WHERE booking_id = ? AND status NOT IN ('COMPLETED', 'CANCELLED')`,
            [bookingId]
        );

        // Clean up any non-completed payments associated with this cancelled booking
        await conn.query(
            `DELETE FROM payment WHERE booking_id = ? AND payment_status != 'COMPLETED'`,
            [bookingId]
        );

        await conn.commit();

        // Update MongoDB BookingHistory
        try {
            await BookingHistory.updateOne(
                { booking_id: bookingId },
                { $set: { status: "CANCELLED", archived_at: new Date() } }
            );
        } catch (mErr) {
            console.error("MongoDB cancel sync notice:", mErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully. Allocated quota has been released back."
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("cancelBooking error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * Safely deletes a booking and its corresponding queue token and payment.
 * Strictly respects MySQL Foreign Key constraints:
 * 1. payment (has fk_p_booking ON DELETE RESTRICT) -> MUST be deleted first
 * 2. queue_token (has fk_qt_booking referencing booking) -> deleted next
 * 3. booking -> deleted last once dependencies are cleared
 */
async function deleteBookingCascade(conn, bookingId) {
    // 1. Delete associated payment first (payment has fk_p_booking ON DELETE RESTRICT)
    await conn.query(`DELETE FROM payment WHERE booking_id = ?`, [bookingId]);

    // 2. Delete associated queue token
    await conn.query(`DELETE FROM queue_token WHERE booking_id = ?`, [bookingId]);

    // 3. Delete booking
    await conn.query(`DELETE FROM booking WHERE booking_id = ?`, [bookingId]);

    // 4. Clean up MongoDB history
    try {
        await BookingHistory.deleteOne({ booking_id: bookingId });
    } catch (mErr) {
        console.warn("MongoDB delete sync warning:", mErr.message);
    }
}

/**
 * DELETE /api/farmer/bookings/:bookingId
 * Completely deletes a booking, its queue token, and corresponding payment.
 * Enforces: payment deleted -> queue token deleted -> booking deleted.
 */
const deleteBooking = async (req, res) => {
    const pool = getWriteDatabase().promise();
    let conn;

    try {
        const farmerId = req.user.farmer_id;
        const bookingId = Number(req.params.bookingId);

        if (!bookingId || isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required."
            });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verify booking belongs to this farmer
        const [bookings] = await conn.query(
            `SELECT booking_id, farmer_id, status, booking_time FROM booking 
             WHERE booking_id = ? AND farmer_id = ? 
             FOR UPDATE`,
            [bookingId, farmerId]
        );

        if (bookings.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                success: false,
                message: "Booking not found or does not belong to you."
            });
        }

        const booking = bookings[0];

        if (booking.status === "COMPLETED") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Completed sales cannot be deleted."
            });
        }

        if (booking.status === "PROCESSING") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot delete a booking currently being processed at the counter."
            });
        }

        // Check associated token status
        const [tokenRows] = await conn.query(
            `SELECT token_id, status FROM queue_token WHERE booking_id = ? FOR UPDATE`,
            [bookingId]
        );
        const tokenStatus = tokenRows[0]?.status;

        if (booking.status === "CALLED" || booking.status === "ARRIVED" || tokenStatus === "CALLED" || tokenStatus === "ARRIVED") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot delete your appointment once you have been called or arrived at the mandi."
            });
        }

        if (booking.status !== "NOT_ARRIVED" && booking.status !== "CANCELLED" && tokenStatus !== "NOT_ARRIVED") {
            const daysUntil = getDaysUntilAppointment(booking.booking_time);
            if (daysUntil < 2) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Deletion is only permitted at least 2 days prior to your scheduled appointment date. You cannot delete on or 1 day before your scheduled appointment date."
                });
            }
        }

        // Execute ordered cascading delete: payment -> queue_token -> booking
        await deleteBookingCascade(conn, bookingId);

        await conn.commit();

        return res.status(200).json({
            success: true,
            message: "Booking, token, and associated payment records deleted successfully."
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("deleteBooking error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * DELETE /api/farmer/token or DELETE /api/farmer/token/:tokenId
 * Deletes the farmer's queue token, its corresponding booking, and any associated payment.
 * Enforces: payment deleted -> queue token deleted -> booking deleted.
 */
const deleteToken = async (req, res) => {
    const pool = getWriteDatabase().promise();
    let conn;

    try {
        const farmerId = req.user.farmer_id;
        const tokenId = req.params.tokenId ? Number(req.params.tokenId) : null;

        conn = await pool.getConnection();
        await conn.beginTransaction();

        let tokenQuery = `
            SELECT qt.token_id, qt.booking_id, qt.status, b.booking_time, qt.service_date 
            FROM queue_token qt
            JOIN booking b ON qt.booking_id = b.booking_id
            WHERE b.farmer_id = ?
        `;
        const params = [farmerId];

        if (tokenId) {
            tokenQuery += ` AND qt.token_id = ?`;
            params.push(tokenId);
        } else {
            tokenQuery += ` AND qt.status IN ('WAITING', 'CALLED', 'ARRIVED', 'PROCESSING', 'NOT_ARRIVED') ORDER BY qt.issued_at DESC LIMIT 1`;
        }
        tokenQuery += ` FOR UPDATE`;

        const [tokens] = await conn.query(tokenQuery, params);

        if (tokens.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                success: false,
                message: "No active token found to delete."
            });
        }

        const target = tokens[0];

        if (target.status === "COMPLETED") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Completed tokens cannot be deleted."
            });
        }

        if (target.status === "PROCESSING") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot delete a token currently being processed at the counter."
            });
        }

        if (target.status === "CALLED" || target.status === "ARRIVED") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot delete your token once you have been called or arrived at the mandi."
            });
        }

        if (target.status !== "NOT_ARRIVED" && target.status !== "CANCELLED") {
            const daysUntil = getDaysUntilAppointment(target.booking_time || target.service_date);
            if (daysUntil < 2) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Deletion is only permitted at least 2 days prior to your scheduled appointment date. You cannot delete on or 1 day before your scheduled appointment date."
                });
            }
        }

        // Execute ordered cascading delete: payment -> queue_token -> booking
        await deleteBookingCascade(conn, target.booking_id);

        await conn.commit();

        return res.status(200).json({
            success: true,
            message: "Token, booking, and associated payment records deleted successfully."
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("deleteToken error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * PATCH /api/farmer/bookings/:bookingId/reschedule
 * Reschedules an active booking using the same backend slot availability logic.
 */
const rescheduleBooking = async (req, res) => {
    const pool = getWriteDatabase().promise();
    let conn;

    try {
        const farmerId = req.user.farmer_id;
        const bookingId = Number(req.params.bookingId);
        const new_date = req.body.new_date || req.body.service_date || req.body.booking_date;
        const new_time = req.body.new_time || req.body.booking_time;
        const counter_id = req.body.counter_id ? Number(req.body.counter_id) : null;
        const mandi_id = req.body.mandi_id ? Number(req.body.mandi_id) : null;

        if (!bookingId || isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid booking ID is required."
            });
        }

        if (!new_date || !new_time) {
            return res.status(400).json({
                success: false,
                message: "New date and time are required."
            });
        }

        const cleanNewTime = String(new_time).trim();
        const normalizedNewTime = cleanNewTime.length === 5 ? `${cleanNewTime}:00` : cleanNewTime;
        const newTargetDateTimeStr = `${new_date} ${normalizedNewTime}`;
        const newBookingDateTime = new Date(newTargetDateTimeStr);

        if (isNaN(newBookingDateTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid date or time format."
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minRescheduleDate = new Date(today);
        minRescheduleDate.setDate(minRescheduleDate.getDate() + 2);

        const newDateObj = new Date(new_date);
        newDateObj.setHours(0, 0, 0, 0);

        if (newDateObj < minRescheduleDate) {
            return res.status(400).json({
                success: false,
                message: "Rescheduling must be to a future date that is at least 1 full day after today (minimum 2 days ahead of current date)."
            });
        }

        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 7);
        if (newDateObj > maxDate) {
            return res.status(400).json({
                success: false,
                message: "New date must be within the next 7 days."
            });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Verify ownership and booking status
        const [bookings] = await conn.query(
            `SELECT b.*, mc.mandi_id, t.tehsil_code 
             FROM booking b 
             JOIN mandi_counter mc ON b.counter_id = mc.counter_id 
             JOIN farmer f ON b.farmer_id = f.farmer_id
             JOIN tehsil t ON f.tehsil_id = t.tehsil_id
             WHERE b.booking_id = ? AND b.farmer_id = ? 
             FOR UPDATE`,
            [bookingId, farmerId]
        );

        if (bookings.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                success: false,
                message: "Booking not found or does not belong to you."
            });
        }

        const booking = bookings[0];

        if (booking.status === "COMPLETED") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Completed sales cannot be rescheduled."
            });
        }

        if (booking.status === "CANCELLED") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Cancelled bookings cannot be rescheduled. Please book a new slot."
            });
        }

        if (booking.status === "PROCESSING") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot reschedule a booking currently being processed at the counter."
            });
        }

        // Check associated token status
        const [tokenRows] = await conn.query(
            `SELECT token_id, status FROM queue_token WHERE booking_id = ? FOR UPDATE`,
            [bookingId]
        );
        const tokenStatus = tokenRows[0]?.status;

        // Block rescheduling if farmer has been called or has arrived
        if (booking.status === "CALLED" || booking.status === "ARRIVED" || tokenStatus === "CALLED" || tokenStatus === "ARRIVED") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot reschedule your booking once you have been called or arrived at the mandi."
            });
        }

        // Enforce: Cannot reschedule 1 day before or on appointment day; permitted 2+ days prior OR if marked NOT_ARRIVED
        if (booking.status !== "NOT_ARRIVED" && tokenStatus !== "NOT_ARRIVED") {
            const daysUntil = getDaysUntilAppointment(booking.booking_time);
            if (daysUntil < 2) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Rescheduling is only permitted at least 2 days prior to your scheduled appointment date. You cannot reschedule on or 1 day before your scheduled appointment date."
                });
            }
        }

        const targetMandiId = mandi_id || booking.mandi_id;
        const targetCounterId = counter_id || booking.counter_id;

        // 2. Validate session end date
        const [sessions] = await conn.query(
            `SELECT end_date FROM procurement_session WHERE session_id = ?`,
            [booking.session_id]
        );

        if (sessions.length > 0) {
            const sessionEnd = new Date(sessions[0].end_date);
            sessionEnd.setHours(23, 59, 59, 999);
            if (newDateObj > sessionEnd) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: "The selected date is outside the procurement session."
                });
            }
        }

        // 3. Validate Counter
        const [counterRows] = await conn.query(
            `SELECT counter_id, capacity_per_day, status 
             FROM mandi_counter 
             WHERE counter_id = ? AND mandi_id = ? AND crop_id = ? 
             FOR UPDATE`,
            [targetCounterId, targetMandiId, booking.crop_id]
        );

        if (counterRows.length === 0 || String(counterRows[0].status || '').trim().toLowerCase() !== "active") {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "Selected counter is not active or does not handle this crop."
            });
        }

        const counter = counterRows[0];
        const capacityPerDay = parseFloat(counter.capacity_per_day) || 10;

        // 4. Mandi working day check on Primary DB transaction
        const isWorking = await isMandiWorkingDay(targetMandiId, new_date, conn);
        if (!isWorking) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "The mandi is closed on the selected date."
            });
        }

        // 5. Mandi timing check on Primary DB transaction for new_date
        const operatingHours = await getMandiOperatingHours(targetMandiId, new_date, conn);
        const [openH, openM] = operatingHours.opening_time.split(":").map(Number);
        const [closeH, closeM] = operatingHours.closing_time.split(":").map(Number);
        const [slotH, slotM] = new_time.split(":").map(Number);

        const slotMinutes = slotH * 60 + slotM;
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        if (slotMinutes < openMinutes || slotMinutes >= closeMinutes) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "The selected time is outside mandi working hours."
            });
        }

        // Global allocation check: ensure farmer still has quota across all crops in this session
        const allocation = await calculateFarmerAllocation(conn, farmerId, booking.crop_id, booking.session_id);
        const bookingReqQty = parseFloat(booking.quantity_approved || booking.quantity_req) || 0;
        if (bookingReqQty > allocation.remaining_quantity) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: `Cannot reschedule: requested quantity (${bookingReqQty} QTL) exceeds remaining session quota of ${allocation.remaining_quantity} QTL.`
            });
        }

        // 6. Check Counter Daily Capacity on new date in MT and Quintals (1 MT = 10 QTL) (excluding this booking)
        const capacityMt = parseFloat(counter.capacity_per_day) || 10;
        const capacityQtl = parseFloat((capacityMt * 10).toFixed(2));

        const [qtyRows] = await conn.query(
            `SELECT COALESCE(SUM(COALESCE(quantity_approved, quantity_req)), 0) AS total_booked_qty 
             FROM booking 
             WHERE counter_id = ? AND DATE(booking_time) = DATE(?) 
               AND booking_id != ? 
               AND status NOT IN ('CANCELLED', 'NOT_ARRIVED') 
             FOR UPDATE`,
            [targetCounterId, new_date, bookingId]
        );

        const currentBookedQtl = parseFloat(qtyRows[0]?.total_booked_qty) || 0;

        if (currentBookedQtl >= capacityQtl || (currentBookedQtl + bookingReqQty) > capacityQtl) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: `Mandi counter is full for ${service_date} for this crop. Daily counter intake capacity of ${capacityMt} MT (${capacityQtl} Quintals) has been reached for the selected date.`
            });
        }

        // 7. Strict one-farmer-per-slot check on new date/time
        const [slotOccupancy] = await conn.query(
            `SELECT booking_id FROM booking 
             WHERE counter_id = ? 
               AND booking_time = ? 
               AND booking_id != ? 
               AND status NOT IN ('CANCELLED', 'NOT_ARRIVED') 
             FOR UPDATE`,
            [targetCounterId, newTargetDateTimeStr, bookingId]
        );

        if (slotOccupancy.length > 0) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: "This time slot is already booked."
            });
        }

        // 8. Queue position on new date
        const [tokenPosRows] = await conn.query(
            `SELECT COALESCE(MAX(queue_position), 0) AS max_pos 
             FROM queue_token 
             WHERE counter_id = ? AND service_date = ? 
             FOR UPDATE`,
            [targetCounterId, new_date]
        );
        const newQueuePos = Number(tokenPosRows[0]?.max_pos) + 1;

        // Token number: Keep existing T_ token or generate new random T_ token
        const [existingTokenRows] = await conn.query(
            `SELECT token_number FROM queue_token WHERE booking_id = ? LIMIT 1`,
            [bookingId]
        );
        let newTokenNumber = existingTokenRows[0]?.token_number;
        if (!newTokenNumber || !newTokenNumber.startsWith("T_")) {
            newTokenNumber = await generateUniqueTokenNumber(conn);
        }

        // 9. Update booking
        await conn.query(
            `UPDATE booking 
             SET counter_id = ?, booking_time = ?, status = 'WAITING' 
             WHERE booking_id = ?`,
            [targetCounterId, newTargetDateTimeStr, bookingId]
        );

        // 10. Update queue token
        await conn.query(
            `UPDATE queue_token 
             SET counter_id = ?,
                 service_date = ?,
                 token_number = ?,
                 queue_position = ?,
                 status = 'WAITING',
                 issued_at = NOW(),
                 called_at = NULL,
                 failed_at = NULL,
                 arrival_time = NULL,
                 processing_start_time = NULL,
                 completion_time = NULL,
                 early_request_status = NULL,
                 early_req_time = NULL,
                 early_operator_message = NULL,
                 early_farmer_response = NULL,
                 early_responded_at = NULL
             WHERE booking_id = ?`,
            [targetCounterId, new_date, newTokenNumber, newQueuePos, bookingId]
        );

        await conn.commit();

        // Update MongoDB BookingHistory
        try {
            await BookingHistory.updateOne(
                { booking_id: bookingId },
                {
                    $set: {
                        counter_id: targetCounterId,
                        booking_time: newBookingDateTime,
                        status: "WAITING",
                        archived_at: new Date()
                    }
                }
            );
        } catch (mErr) {
            console.error("MongoDB reschedule sync notice:", mErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Booking rescheduled successfully.",
            data: {
                booking_id: bookingId,
                new_date,
                new_time,
                token_number: newTokenNumber,
                queue_position: newQueuePos
            }
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("rescheduleBooking error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/farmer/token
 * Returns live queue information for the token page:
 * 1. Farmer's token number
 * 2. Farmer's current status
 * 3. Number of farmers ahead
 * 4. Current farmer being called (NAME ONLY, no mobile/Aadhaar)
 * 5. Current procurement status
 * 6. Approximate waiting time (clearly marked as approximate)
 */
const getToken = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const readDb = getReadDatabase().promise();

        // 1. Fetch farmer's latest active token using view
        const [tokens] = await readDb.query(
            `SELECT * FROM vw_farmer_token_details
             WHERE farmer_id = ?
             ORDER BY issued_at DESC
             LIMIT 1`,
            [farmerId]
        );

        if (tokens.length === 0) {
            return res.status(200).json({
                success: true,
                data: null
            });
        }

        const token = tokens[0];
        let farmersAhead = 0;
        let currentlyCalled = null;
        let approximateWaitMinutes = 0;

        // 2. Average service time for this counter from database table
        const avgMinutes = await getCounterServiceTime(token.counter_id, token.service_date);
        const avgM = Number(avgMinutes) || 10;

        // 3. Check live queue if token is active
        if (["WAITING", "CALLED", "ARRIVED", "PROCESSING"].includes(token.token_status)) {
            // Count farmers ahead on this counter on this date based on scheduled appointment time
            const [aheadRows] = await readDb.query(
                `SELECT COUNT(*) AS ahead_count 
                 FROM vw_booking_queue
                 WHERE counter_id = ? 
                   AND service_date = ? 
                   AND booking_id != ?
                   AND token_status IN ('WAITING', 'CALLED', 'ARRIVED', 'PROCESSING')
                   AND (
                       booking_time < ? 
                       OR (booking_time = ? AND queue_position < ?)
                   )`,
                [
                    token.counter_id, 
                    token.service_date, 
                    token.booking_id, 
                    token.booking_time, 
                    token.booking_time, 
                    token.queue_position
                ]
            );

            farmersAhead = Number(aheadRows[0]?.ahead_count) || 0;

            // Approximate waiting time = strictly other farmers ahead * counter average service time (do NOT include current farmer)
            if (token.token_status === "WAITING" || token.token_status === "ARRIVED") {
                approximateWaitMinutes = farmersAhead * avgM;
            } else {
                approximateWaitMinutes = 0;
            }

            // 4. Currently called / active farmer at counter with detailed procurement progress stage
            const [calledRows] = await readDb.query(
                `SELECT 
                    token_number, 
                    token_status AS status, 
                    farmer_name,
                    called_at,
                    arrival_time,
                    processing_start_time
                 FROM vw_booking_queue
                 WHERE counter_id = ? 
                   AND service_date = ? 
                   AND token_status IN ('CALLED', 'ARRIVED', 'PROCESSING') 
                 ORDER BY FIELD(token_status, 'PROCESSING', 'ARRIVED', 'CALLED') 
                 LIMIT 1`,
                [token.counter_id, token.service_date]
            );

            if (calledRows.length > 0) {
                const cStatus = calledRows[0].status;
                let stageText = "Called to Counter (Reporting In-Progress)";
                if (cStatus === "PROCESSING") {
                    stageText = "Weighment & Quality Testing Underway";
                } else if (cStatus === "ARRIVED") {
                    stageText = "Arrived at Counter (Awaiting Processing)";
                }

                currentlyCalled = {
                    token_number: calledRows[0].token_number,
                    farmer_name: calledRows[0].farmer_name,
                    status: cStatus,
                    procurement_stage: stageText,
                    started_at: calledRows[0].processing_start_time || calledRows[0].arrival_time || calledRows[0].called_at
                };
            }
        }

        // 5. Fetch any active early call request from Mandi counter for this farmer
        let earlyCallRequest = null;
        if (token.early_request_status === 'PENDING') {
            earlyCallRequest = {
                request_id: token.token_id,
                token_id: token.token_id,
                booking_id: token.booking_id,
                counter_id: token.counter_id,
                counter_name: token.counter_name,
                counter_number: token.counter_number,
                mandi_id: token.mandi_id,
                mandi_name: token.mandi_name,
                service_date: token.service_date,
                scheduled_time: token.booking_time,
                scheduled_time_formatted: formatToIndianTime(token.booking_time),
                status: token.early_request_status,
                operator_message: token.early_operator_message,
                requested_at: token.early_req_time,
                requested_at_formatted: formatToIndianTime(token.early_req_time)
            };
        }

        return res.status(200).json({
            success: true,
            data: {
                ...token,
                status: token.token_status,
                farmer_name: token.farmer_name,
                farmers_ahead: farmersAhead,
                currently_called: currentlyCalled,
                average_service_time_minutes: avgM,
                approximate_waiting_time_minutes: approximateWaitMinutes,
                early_call_request: earlyCallRequest
            }
        });
    } catch (error) {
        console.error("getToken error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * GET /api/farmer/payment
 * Returns payments with authoritative TOTAL PAYABLE AMOUNT
 */
const getPayments = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const readDb = getReadDatabase().promise();

        const [payments] = await readDb.query(
            `SELECT 
                p.payment_id,
                p.booking_id,
                p.farmer_id,
                p.mandi_id,
                m.mandi_name,
                p.crop_id,
                c.crop_name,
                p.quantity_sold,
                p.rate_per_unit,
                p.total_payable_amount,
                p.payment_status,
                p.payment_date,
                p.created_at,
                b.booking_time,
                -- Payment Proof details
                pcp.proof_id,
                pcp.screenshot,
                pcp.completion_date AS proof_completion_date,
                pcp.transaction_reference,
                pcp.notes AS proof_notes,
                -- Payment Officer / User details
                pu.payment_user_id AS operator_id,
                pu.username AS operator_username,
                pu.role AS operator_role,
                pus.state_name AS operator_state_name
             FROM payment p
             JOIN booking b ON p.booking_id = b.booking_id
             JOIN crop c ON p.crop_id = c.crop_id
             JOIN mandi m ON p.mandi_id = m.mandi_id
             LEFT JOIN payment_completion_proof pcp ON pcp.proof_id = (
                SELECT MAX(p2.proof_id) 
                FROM payment_completion_proof p2 
                WHERE p2.payment_id = p.payment_id
             )
             LEFT JOIN payment_users pu ON pcp.operator_id = pu.payment_user_id
             LEFT JOIN state pus ON pu.state_id = pus.state_id
             WHERE p.farmer_id = ?
             ORDER BY p.payment_date DESC, p.created_at DESC`,
            [farmerId]
        );

        return res.status(200).json({
            success: true,
            data: payments
        });
    } catch (error) {
        console.error("getPayments error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * GET /api/farmer/history
 * Sales history: strictly COMPLETED procurement/sales history within last Z years from env
 */
const getHistory = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const readDb = getReadDatabase().promise();
        const salesHistoryYears = parseInt(process.env.FARMER_SALES_HISTORY_YEARS, 10);
        const defaultLimit = parseInt(process.env.PAGINATION_LIMIT, 10) || 10;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
        const offset = (page - 1) * limit;

        // 1. Total count of completed sales records at database level
        const [countRows] = await readDb.query(
            `SELECT COUNT(*) AS total
             FROM booking b
             WHERE b.farmer_id = ? 
               AND b.status = 'COMPLETED'
               AND b.booking_time >= DATE_SUB(NOW(), INTERVAL ? YEAR)`,
            [farmerId, salesHistoryYears]
        );
        const total = Number(countRows[0]?.total || 0);

        // 2. Retrieve COMPLETED procurement records within last Z years with SQL LIMIT and OFFSET
        const [completedSales] = await readDb.query(
            `SELECT 
                b.booking_id,
                b.session_id,
                ps.session_name,
                b.crop_id,
                c.crop_name,
                c.crop_type,
                b.quantity_approved,
                b.booking_time,
                m.mandi_name,
                mc.counter_name,
                p.payment_id,
                COALESCE(p.quantity_sold, b.quantity_approved) AS quantity_sold,
                COALESCE(p.rate_per_unit, pq.msp, pq.lsp) AS rate_per_unit,
                p.total_payable_amount,
                p.payment_status,
                p.payment_date
             FROM booking b
             JOIN farmer f ON b.farmer_id = f.farmer_id
             JOIN procurement_session ps ON b.session_id = ps.session_id
             JOIN crop c ON b.crop_id = c.crop_id
             JOIN mandi_counter mc ON b.counter_id = mc.counter_id
             JOIN mandi m ON mc.mandi_id = m.mandi_id
             LEFT JOIN procurement_quota pq ON pq.crop_id = b.crop_id AND pq.state_id = f.state_id
             LEFT JOIN payment p ON b.booking_id = p.booking_id
             WHERE b.farmer_id = ? 
               AND b.status = 'COMPLETED'
               AND b.booking_time >= DATE_SUB(NOW(), INTERVAL ? YEAR)
             ORDER BY b.booking_time DESC
             LIMIT ? OFFSET ?`,
            [farmerId, salesHistoryYears, limit, offset]
        );

        // Group completed sales by (session_id + crop_id) for continuous multi-sale quota consumption tracking
        const sessionCropMap = {};
        for (const sale of completedSales) {
            const key = `${sale.session_id}_${sale.crop_id}`;
            if (!sessionCropMap[key]) {
                const alloc = await calculateFarmerAllocation(readDb, farmerId, sale.crop_id, sale.session_id);
                sessionCropMap[key] = {
                    session_id: sale.session_id,
                    session_name: sale.session_name,
                    crop_id: sale.crop_id,
                    crop_name: sale.crop_name,
                    allocated_quantity: alloc.allocated_quantity,
                    total_sold_quantity: alloc.total_sold_quantity,
                    remaining_quantity: alloc.remaining_quantity,
                    eligible_land_acres: alloc.eligible_land_area,
                    quota_per_acre: alloc.quota_per_acre,
                    msp: alloc.msp,
                    lsp: alloc.lsp,
                    sales_transactions: []
                };
            }
            sessionCropMap[key].sales_transactions.push(sale);
        }

        const totalPages = Math.ceil(total / limit) || 1;
        const hasMore = page < totalPages;

        return res.status(200).json({
            success: true,
            data: Object.values(sessionCropMap),
            items: completedSales,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                has_more: hasMore
            },
            history_years_configured: salesHistoryYears
        });
    } catch (error) {
        console.error("getHistory error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * GET /api/farmer/recent-bookings
 * Retrieves recent booking history from MongoDB with pagination
 * Filtered to RECENT_BOOKING_DAYS from backend .env
 */
const getRecentBookings = async (req, res) => {
    try {
        const farmerId = Number(req.user.farmer_id);
        const recentDays = parseInt(process.env.RECENT_BOOKING_DAYS, 10);

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - recentDays);

        const query = {
            farmer_id: farmerId,
            $or: [
                { created_at: { $gte: cutoffDate } },
                { booking_time: { $gte: cutoffDate } }
            ]
        };

        const total = await BookingHistory.countDocuments(query);
        const items = await BookingHistory.find(query)
            .sort({ booking_time: -1, created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return res.status(200).json({
            success: true,
            data: {
                items,
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
                hasNext: page * limit < total,
                retention_days: recentDays
            }
        });
    } catch (error) {
        console.error("getRecentBookings error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getDashboard = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const readDb = getReadDatabase().promise();

        // 1. Profile
        const [farmerRows] = await readDb.query(
            `SELECT 
                f.farmer_id, f.name, f.mobile_number, 
                s.state_name, d.district_name, t.tehsil_name 
             FROM farmer f
             LEFT JOIN state s ON f.state_id = s.state_id
             LEFT JOIN district d ON f.district_id = d.district_id
             LEFT JOIN tehsil t ON f.tehsil_id = t.tehsil_id
             WHERE f.farmer_id = ?`,
            [farmerId]
        );

        if (farmerRows.length === 0) {
            return res.status(404).json({ success: false, message: "Farmer not found." });
        }

        const farmerInfo = farmerRows[0];

        // 2. Active sessions and quota tracking
        const [activeSessions] = await readDb.query(
            `SELECT 
                ps.session_id, ps.session_name, ps.crop_id, 
                c.crop_name, c.crop_type, ps.start_date, ps.end_date
             FROM procurement_session ps
             JOIN crop c ON ps.crop_id = c.crop_id
             WHERE CURDATE() BETWEEN ps.start_date AND ps.end_date
             ORDER BY ps.end_date ASC`
        );

        const sessionAllocations = [];
        for (const s of activeSessions) {
            const alloc = await calculateFarmerAllocation(readDb, farmerId, s.crop_id, s.session_id);
            sessionAllocations.push({
                ...s,
                allocation: alloc
            });
        }

        // 3. Upcoming booking / token
        const [activeBookings] = await readDb.query(
            `SELECT 
                b.booking_id, b.crop_id, c.crop_name, b.session_id, ps.session_name,
                b.counter_id, mc.mandi_id, m.mandi_name, mc.counter_name, mc.counter_number,
                b.quantity_req, b.quantity_approved, b.booking_time, b.status, b.created_at,
                DATE(b.booking_time) AS service_date,
                qt.token_id, qt.token_number, qt.queue_position, qt.status AS token_status
             FROM booking b
             JOIN crop c ON b.crop_id = c.crop_id
             JOIN procurement_session ps ON b.session_id = ps.session_id
             JOIN mandi_counter mc ON b.counter_id = mc.counter_id
             JOIN mandi m ON mc.mandi_id = m.mandi_id
             LEFT JOIN queue_token qt ON b.booking_id = qt.booking_id
             WHERE b.farmer_id = ? 
               AND b.status IN ('BOOKED', 'WAITING', 'CALLED', 'ARRIVED', 'PROCESSING', 'NOT_ARRIVED')
             ORDER BY 
                 CASE 
                     WHEN b.status IN ('WAITING', 'BOOKED', 'CALLED', 'ARRIVED', 'PROCESSING') THEN 1 
                     WHEN b.status = 'NOT_ARRIVED' THEN 2 
                     ELSE 3 
                 END ASC,
                 b.booking_time ASC
             LIMIT 1`,
            [farmerId]
        );

        let currentBooking = null;
        if (activeBookings.length > 0) {
            const cb = activeBookings[0];
            const isCalledOrArrived = ["CALLED", "ARRIVED", "PROCESSING", "COMPLETED"].includes(cb.status);
            const isNotArrived = cb.status === "NOT_ARRIVED";
            const daysUntil = getDaysUntilAppointment(cb.booking_time);

            // Enforce 30-minute security lock after booking creation
            let within30MinWait = false;
            let remainingWaitMinutes = 0;
            if (cb.created_at && cb.status !== "CANCELLED" && cb.status !== "COMPLETED") {
                const createdAtMs = new Date(cb.created_at).getTime();
                const elapsedMs = Date.now() - createdAtMs;
                const requiredWaitMs = 30 * 60 * 1000;
                if (elapsedMs < requiredWaitMs) {
                    within30MinWait = true;
                    remainingWaitMinutes = Math.max(1, Math.ceil((requiredWaitMs - elapsedMs) / (60 * 1000)));
                }
            }

            const canCancel = !isCalledOrArrived && cb.status !== "CANCELLED" && (isNotArrived || daysUntil >= 2) && !within30MinWait;
            const canReschedule = !isCalledOrArrived && cb.status !== "CANCELLED" && (isNotArrived || daysUntil >= 2);

            let lockReason = null;
            if (isCalledOrArrived) {
                lockReason = "Called or arrived at counter - cancellation and rescheduling disabled";
            } else if (within30MinWait) {
                lockReason = `Cancellation locked for security: ${remainingWaitMinutes} minute(s) remaining (minimum 30 minutes required after booking)`;
            } else if (!isNotArrived && daysUntil < 2) {
                lockReason = "Cannot reschedule or cancel 1 day before or on appointment day (must be at least 2 days prior)";
            }

            currentBooking = {
                ...cb,
                can_cancel: canCancel,
                can_reschedule: canReschedule,
                days_until_appointment: daysUntil,
                remaining_cancellation_wait_minutes: remainingWaitMinutes,
                lock_reason: lockReason
            };
        }

        // 4. Latest payment
        const [recentPayments] = await readDb.query(
            `SELECT 
                p.payment_id, p.total_payable_amount, p.quantity_sold, 
                p.payment_status, p.payment_date, c.crop_name, m.mandi_name
             FROM payment p
             JOIN crop c ON p.crop_id = c.crop_id
             JOIN mandi m ON p.mandi_id = m.mandi_id
             WHERE p.farmer_id = ?
             ORDER BY p.payment_date DESC, p.created_at DESC
             LIMIT 1`,
            [farmerId]
        );
        const latestPayment = recentPayments.length > 0 ? recentPayments[0] : null;

        // 5. Eligible land area
        const [landRows] = await readDb.query(
            `SELECT COALESCE(SUM(area), 0) AS eligible_area 
             FROM farmer_land 
             WHERE farmer_id = ? 
               AND land_verification = 'verified' 
               AND land_type IN ('agricultural', 'irrigated')`,
            [farmerId]
        );
        const eligibleLand = parseFloat(landRows[0]?.eligible_area) || 0;

        // 6. State procurement quota per acre for the farmer's state (Haryana attribute amount = 50.00 QTL/acre)
        const [quotaRateRows] = await readDb.query(
            `SELECT amount FROM procurement_quota WHERE state_id = ? LIMIT 1`,
            [farmerInfo.state_id || 1001]
        );
        const stateQuotaPerAcre = parseFloat(quotaRateRows[0]?.amount) || 50;

        // Total allocated quota for farmer based on verified land area * state quota rate (1 Acre * 50 QTL/acre = 50 QTL)
        const totalAllocatedQuota = parseFloat((eligibleLand * stateQuotaPerAcre).toFixed(2));

        // Total sold across completed bookings for this farmer
        const [totalSoldRows] = await readDb.query(
            `SELECT COALESCE(SUM(COALESCE(p.quantity_sold, b.quantity_approved)), 0) AS total_sold 
             FROM booking b 
             LEFT JOIN payment p ON b.booking_id = p.booking_id 
             WHERE b.farmer_id = ? AND b.status = 'COMPLETED'`,
            [farmerId]
        );
        const totalSoldQuota = parseFloat(totalSoldRows[0]?.total_sold) || 0;
        const totalRemainingQuota = Math.max(0, parseFloat((totalAllocatedQuota - totalSoldQuota).toFixed(2)));

        // Crop-specific completed sales for this farmer across this session/all crops
        const [cropSoldRows] = await readDb.query(
            `SELECT b.crop_id, COALESCE(SUM(COALESCE(p.quantity_sold, b.quantity_approved)), 0) AS crop_sold 
             FROM booking b 
             LEFT JOIN payment p ON b.booking_id = p.booking_id 
             WHERE b.farmer_id = ? AND b.status = 'COMPLETED'
             GROUP BY b.crop_id`,
            [farmerId]
        );
        const cropSoldMap = {};
        for (const row of cropSoldRows) {
            cropSoldMap[row.crop_id] = parseFloat(row.crop_sold) || 0;
        }

        // Quota summary structured for frontend dashboard cards and progress bars
        // Quota is GLOBAL for the procurement session, shared across all crops
        const quotaSummary = sessionAllocations.map((s) => ({
            session_id: s.session_id,
            session_name: s.session_name,
            crop_id: s.crop_id,
            crop_name: s.crop_name,
            crop_type: s.crop_type,
            // Specific crop sold
            crop_sold_quantity: cropSoldMap[s.crop_id] || 0,
            // Global quota metrics shared across all crops
            global_allocated_quantity: totalAllocatedQuota,
            global_sold_quantity: totalSoldQuota,
            global_remaining_quantity: totalRemainingQuota,
            // Maintained for backward compatibility:
            allocated_quantity: totalAllocatedQuota,
            total_sold_quantity: totalSoldQuota,
            remaining_quantity: totalRemainingQuota,
            eligible_land: s.allocation.eligible_land_area,
            quota_per_acre: s.allocation.quota_per_acre,
            active_booking_quantity: s.allocation.active_booking_quantity || 0
        }));

        // Fetch recent bookings (last 5) for dashboard mini-table
        const [recentBookingsList] = await readDb.query(
            `SELECT 
                b.booking_id, b.crop_id, c.crop_name, b.session_id, ps.session_name,
                b.counter_id, mc.mandi_id,
                b.quantity_req, b.quantity_approved, b.booking_time, b.status,
                DATE(b.booking_time) AS service_date,
                m.mandi_name, mc.counter_name,
                qt.token_number
             FROM booking b
             JOIN crop c ON b.crop_id = c.crop_id
             JOIN procurement_session ps ON b.session_id = ps.session_id
             JOIN mandi_counter mc ON b.counter_id = mc.counter_id
             JOIN mandi m ON mc.mandi_id = m.mandi_id
             LEFT JOIN queue_token qt ON b.booking_id = qt.booking_id
             WHERE b.farmer_id = ?
             ORDER BY b.booking_time DESC, b.created_at DESC
             LIMIT 5`,
            [farmerId]
        );

        return res.status(200).json({
            success: true,
            data: {
                farmer: farmerInfo,
                land_summary: {
                    total_eligible_land: eligibleLand,
                    eligible_area: eligibleLand
                },
                eligible_land_acres: eligibleLand,
                quota_per_acre: stateQuotaPerAcre,
                total_allocated_quota: totalAllocatedQuota,
                total_sold_quota: totalSoldQuota,
                total_remaining_quota: totalRemainingQuota,
                quota_summary: quotaSummary,
                active_sessions: sessionAllocations,
                active_booking: currentBooking,
                current_booking: currentBooking,
                upcoming_booking: currentBooking,
                recent_bookings: recentBookingsList,
                latest_payment: latestPayment
            }
        });
    } catch (error) {
        console.error("getDashboard error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

/**
 * GET /api/farmer/early-call-requests
 * Returns pending early call requests for the logged-in farmer
 */
const getEarlyCallRequests = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const readDb = getReadDatabase().promise();
        const indianToday = getIndianNow().dateStr;

        const [requests] = await readDb.query(
            `SELECT 
                token_id AS request_id,
                token_id,
                booking_id,
                counter_id,
                mandi_id,
                service_date,
                booking_time AS scheduled_time,
                'EARLY_ARRIVAL' AS request_type,
                early_request_status AS status,
                early_operator_message AS operator_message,
                early_req_time AS requested_at,
                token_number,
                counter_name,
                counter_number,
                mandi_name
             FROM vw_farmer_token_details
             WHERE farmer_id = ? 
               AND early_request_status = 'PENDING'
               AND (service_date = CURDATE() OR service_date = ?)
             ORDER BY token_id DESC`,
            [farmerId, indianToday]
        );

        const enrichedRequests = requests.map(r => ({
            ...r,
            scheduled_time_formatted: formatToIndianTime(r.scheduled_time),
            requested_at_formatted: formatToIndianTime(r.requested_at)
        }));

        return res.status(200).json({
            success: true,
            data: enrichedRequests,
            early_call_request: enrichedRequests.length > 0 ? enrichedRequests[0] : null
        });
    } catch (error) {
        console.error("getEarlyCallRequests error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve early call requests"
        });
    }
};

/**
 * POST /api/farmer/early-call-requests/:requestId/respond
 * Farmer accepts or declines an early call request
 */
const respondEarlyCallRequest = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;
        const requestId = Number(req.params.requestId);
        const { action, response: customResponse } = req.body;

        const normalizedAction = (action === 'ACCEPT' || action === 'ACCEPTED') ? 'ACCEPTED' : 
                                 (action === 'DECLINE' || action === 'DECLINED') ? 'DECLINED' : null;

        if (!requestId || !normalizedAction) {
            return res.status(400).json({
                success: false,
                message: "Valid requestId and action ('ACCEPTED' or 'DECLINED') are required"
            });
        }

        const pool = getWriteDatabase().promise();
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            const [rows] = await conn.query(
                `SELECT qt.* FROM queue_token qt
                 JOIN booking b ON qt.booking_id = b.booking_id
                 WHERE qt.token_id = ? AND b.farmer_id = ? FOR UPDATE`,
                [requestId, farmerId]
            );

            if (rows.length === 0) {
                await conn.rollback();
                return res.status(404).json({
                    success: false,
                    message: "Early call request not found or not assigned to you"
                });
            }

            const reqRecord = rows[0];
            if (reqRecord.early_request_status !== "PENDING") {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Request has already been ${reqRecord.early_request_status ? reqRecord.early_request_status.toLowerCase() : 'resolved'}`
                });
            }

            const responseText = customResponse || (normalizedAction === "ACCEPTED" 
                ? "Farmer accepted early call. Reporting to counter now."
                : "Farmer declined early call. Keeping original slot.");

            await conn.query(
                `UPDATE queue_token 
                 SET early_request_status = ?, early_farmer_response = ?, early_responded_at = NOW() 
                 WHERE token_id = ?`,
                [normalizedAction, responseText, requestId]
            );

            await conn.commit();

            return res.status(200).json({
                success: true,
                message: normalizedAction === "ACCEPTED" 
                    ? "Early call request accepted! Please proceed to your designated mandi counter now."
                    : "Early call request declined. Your scheduled slot remains unchanged.",
                data: {
                    request_id: requestId,
                    token_id: requestId,
                    status: normalizedAction
                }
            });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error("respondEarlyCallRequest error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to process response"
        });
    }
};

module.exports = {
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
    getUpcomingBooking: getCurrentBooking,
    cancelBooking,
    deleteBooking,
    deleteToken,
    deleteBookingCascade,
    rescheduleBooking,
    getToken,
    getPayments,
    getHistory,
    getRecentBookings,
    getDashboard,
    getEarlyCallRequests,
    respondEarlyCallRequest
};
