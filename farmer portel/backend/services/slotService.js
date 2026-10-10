const { getReadDatabase } = require("../database/databaserouter");

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Returns current date and time strictly from the server / MySQL DB (in Asia/Kolkata IST)
 */
async function getServerCurrentDateTime(db) {
    try {
        const [rows] = await db.query(
            "SELECT DATE_FORMAT(NOW(), '%Y-%m-%d') as cur_date, DATE_FORMAT(NOW(), '%H:%i:%s') as cur_time"
        );
        if (rows && rows.length > 0 && rows[0].cur_date) {
            const dateStr = rows[0].cur_date;
            const timeStr = rows[0].cur_time || "00:00:00";
            const [h, m, s] = timeStr.split(":").map(Number);
            return {
                dateStr,
                timeStr,
                hours: h || 0,
                minutes: m || 0,
                totalMinutes: (h || 0) * 60 + (m || 0)
            };
        }
    } catch (e) {
        console.error("Error querying DB current time:", e.message);
    }

    // Fallback using Intl Asia/Kolkata
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "numeric", minute: "numeric", second: "numeric",
        hourCycle: "h23"
    });
    const parts = formatter.formatToParts(now);
    const getVal = (type) => parts.find(p => p.type === type)?.value;
    const year = getVal("year");
    const month = getVal("month");
    const day = getVal("day");
    const hour = parseInt(getVal("hour") || "0", 10);
    const minute = parseInt(getVal("minute") || "0", 10);
    return {
        dateStr: `${year}-${month}-${day}`,
        timeStr: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
        hours: hour,
        minutes: minute,
        totalMinutes: hour * 60 + minute
    };
}

/**
 * Normalizes input date to YYYY-MM-DD
 */
function normalizeDateStr(d) {
    if (!d) return "";
    if (typeof d === "string") {
        return d.substring(0, 10);
    }
    if (d instanceof Date) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }
    return String(d).substring(0, 10);
}

/**
 * Checks whether a target date is a working day for the Mandi.
 * Respects 7-day effective date for newly configured working days:
 * - Dates prior to effective_date follow active is_working
 * - Dates on or after effective_date follow pending_is_working
 * Defaults to Monday-Saturday working, Sunday closed if not configured.
 * Supports running on provided dbConnection (e.g. Primary DB inside transaction).
 */
async function isMandiWorkingDay(mandiId, targetDate, dbConnection = null) {
    const db = dbConnection ? (dbConnection.promise ? dbConnection.promise() : dbConnection) : getReadDatabase().promise();
    const dateStr = normalizeDateStr(targetDate);

    const [rows] = await db.query(
        `SELECT 
            day_of_week,
            is_working,
            pending_is_working,
            DATE_FORMAT(effective_date, '%Y-%m-%d') AS effective_date,
            CASE 
                WHEN pending_is_working IS NOT NULL 
                     AND effective_date IS NOT NULL 
                     AND ? >= effective_date 
                THEN pending_is_working 
                ELSE is_working 
            END AS effective_is_working
         FROM mandi_working_day 
         WHERE mandi_id = ? AND day_of_week = DAYNAME(?)`,
        [dateStr, mandiId, dateStr]
    );

    if (rows.length === 0) {
        const [dayRows] = await db.query("SELECT DAYNAME(?) as day_name", [dateStr]);
        const dayName = dayRows[0]?.day_name;
        return dayName !== "Sunday";
    }

    return Boolean(rows[0].effective_is_working);
}

/**
 * Retrieves operating hours for a Mandi.
 * Respects 7-day effective date for newly configured operating hours:
 * - Dates prior to effective_date follow active opening_time & closing_time
 * - Dates on or after effective_date follow pending_opening_time & pending_closing_time
 * Supports running on provided dbConnection (e.g. Primary DB inside transaction).
 */
async function getMandiOperatingHours(mandiId, targetDate = null, dbConnection = null) {
    const db = dbConnection ? (dbConnection.promise ? dbConnection.promise() : dbConnection) : getReadDatabase().promise();
    const dateStr = targetDate ? normalizeDateStr(targetDate) : null;

    const [rows] = await db.query(
        `SELECT 
            opening_time AS active_opening_time,
            closing_time AS active_closing_time,
            pending_opening_time,
            pending_closing_time,
            DATE_FORMAT(effective_date, '%Y-%m-%d') AS effective_date,
            DATE_FORMAT(effective_date, '%Y-%m-%d') AS mandi_effect_timing_date,
            CASE 
                WHEN pending_opening_time IS NOT NULL 
                     AND effective_date IS NOT NULL 
                     AND (? IS NULL OR ? >= effective_date) 
                THEN pending_opening_time 
                ELSE opening_time 
            END AS opening_time,
            CASE 
                WHEN pending_closing_time IS NOT NULL 
                     AND effective_date IS NOT NULL 
                     AND (? IS NULL OR ? >= effective_date) 
                THEN pending_closing_time 
                ELSE closing_time 
            END AS closing_time
         FROM mandi_timing 
         WHERE mandi_id = ?`,
        [dateStr, dateStr, dateStr, dateStr, mandiId]
    );

    if (rows.length === 0) {
        return { 
            opening_time: "09:00:00", 
            closing_time: "17:00:00",
            active_opening_time: "09:00:00",
            active_closing_time: "17:00:00",
            pending_opening_time: null,
            pending_closing_time: null,
            effective_date: null,
            mandi_effect_timing_date: null,
            has_pending_change: false
        };
    }

    const row = rows[0];
    const hasPending = Boolean(row.pending_opening_time && row.pending_closing_time && row.effective_date);
    return {
        opening_time: row.opening_time,
        closing_time: row.closing_time,
        active_opening_time: row.active_opening_time,
        active_closing_time: row.active_closing_time,
        pending_opening_time: row.pending_opening_time,
        pending_closing_time: row.pending_closing_time,
        effective_date: row.effective_date,
        mandi_effect_timing_date: row.effective_date,
        has_pending_change: hasPending
    };
}

/**
 * Retrieves comprehensive schedule details for a Mandi:
 * Operating hours and 7-day working schedule, with active, pending, and effective values.
 */
async function getMandiScheduleDetails(mandiId, targetDate = null, dbConnection = null) {
    const db = dbConnection ? (dbConnection.promise ? dbConnection.promise() : dbConnection) : getReadDatabase().promise();
    const dateStr = targetDate ? normalizeDateStr(targetDate) : null;

    const timing = await getMandiOperatingHours(mandiId, dateStr, db);

    const [dayRows] = await db.query(
        `SELECT 
            working_day_id,
            day_of_week,
            is_working,
            pending_is_working,
            DATE_FORMAT(effective_date, '%Y-%m-%d') AS effective_date,
            DATE_FORMAT(effective_date, '%Y-%m-%d') AS mandi_effective_working_day,
            CASE 
                WHEN pending_is_working IS NOT NULL 
                     AND effective_date IS NOT NULL 
                     AND (? IS NULL OR ? >= effective_date) 
                THEN pending_is_working 
                ELSE is_working 
            END AS effective_is_working,
            CASE 
                WHEN pending_is_working IS NOT NULL 
                     AND effective_date IS NOT NULL 
                     AND effective_date > CURDATE() 
                THEN 1 
                ELSE 0 
            END AS has_pending_change
         FROM mandi_working_day 
         WHERE mandi_id = ?
         ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`,
        [dateStr, dateStr, mandiId]
    );

    const workingDays = dayRows.length > 0 ? dayRows : DAYS.filter(d => d !== "Sunday").map(d => ({
        day_of_week: d,
        is_working: 1,
        pending_is_working: null,
        effective_date: null,
        mandi_effective_working_day: null,
        effective_is_working: 1,
        has_pending_change: 0
    }));

    const hasPendingTiming = Boolean(timing.has_pending_change);
    const hasPendingWorkingDays = workingDays.some(d => d.has_pending_change === 1);

    return {
        mandi_id: mandiId,
        target_date: dateStr,
        timing,
        working_days: workingDays,
        has_pending_timing: hasPendingTiming,
        has_pending_working_days: hasPendingWorkingDays,
        has_any_pending: hasPendingTiming || hasPendingWorkingDays
    };
}

/**
 * Retrieves average processing time in minutes for a counter.
 * A newly updated average time comes into effect AFTER 7 DAYS.
 * For dates prior to the 7-day effective date, the active counter_service_time is preserved.
 * Supports running on provided dbConnection (e.g. Primary DB inside transaction).
 */
async function getCounterServiceTime(counterId, targetDate = null, dbConnection = null) {
    const db = dbConnection ? (dbConnection.promise ? dbConnection.promise() : dbConnection) : getReadDatabase().promise();
    
    const [catRows] = await db.query(
        `SELECT avg_time_minutes, DATE_FORMAT(effective_date, '%Y-%m-%d') AS effective_date 
         FROM counter_avg_time WHERE counter_id = ?`,
        [counterId]
    );

    const [cstRows] = await db.query(
        `SELECT average_time_minutes FROM counter_service_time WHERE counter_id = ?`,
        [counterId]
    );
    const activeServiceTime = cstRows.length > 0 && cstRows[0].average_time_minutes != null
        ? Number(cstRows[0].average_time_minutes)
        : null;

    if (catRows.length > 0 && catRows[0].avg_time_minutes != null) {
        const cat = catRows[0];
        if (cat.effective_date != null) {
            const dateStr = targetDate ? normalizeDateStr(targetDate) : normalizeDateStr(new Date());
            if (dateStr >= cat.effective_date) {
                return Number(cat.avg_time_minutes);
            } else {
                return activeServiceTime ?? 15;
            }
        } else {
            return Number(cat.avg_time_minutes);
        }
    }

    return activeServiceTime ?? 15;
}

/**
 * Generates slots for a counter on a given date with strict one-farmer-per-slot enforcement
 * and counter daily capacity checking.
 * Shared service used for both NEW BOOKINGS and RESCHEDULING.
 */
async function generateSlotsForDate(mandiId, counterId, targetDate, excludeBookingId = null) {
    const readDb = getReadDatabase().promise();

    // 1. Check working day
    const isWorking = await isMandiWorkingDay(mandiId, targetDate, readDb);
    const opHours = await getMandiOperatingHours(mandiId, targetDate, readDb);
    const { opening_time, closing_time } = opHours;

    if (!isWorking) {
        return {
            is_working: false,
            message: "Mandi is closed on the selected date",
            date: targetDate,
            opening_time,
            closing_time,
            active_opening_time: opHours.active_opening_time,
            active_closing_time: opHours.active_closing_time,
            pending_opening_time: opHours.pending_opening_time,
            pending_closing_time: opHours.pending_closing_time,
            timing_effective_date: opHours.effective_date,
            has_pending_timing_change: opHours.has_pending_change,
            slots: [],
            daily_capacity: 0,
            booked_count: 0,
            remaining_capacity: 0
        };
    }

    // 2. Operating hours & service time
    const avgMinutes = await getCounterServiceTime(counterId, targetDate, readDb);

    // 3. Get counter daily capacity in MT/Day (1 MT = 10 QTL) and verify active status
    const [counterRows] = await readDb.query(
        `SELECT capacity_per_day, status FROM mandi_counter WHERE counter_id = ?`,
        [counterId]
    );

    if (counterRows.length === 0 || String(counterRows[0].status || '').trim().toLowerCase() !== 'active') {
        return {
            is_working: false,
            message: "Selected counter is inactive or does not exist",
            slots: [],
            daily_capacity: 0,
            booked_count: 0,
            remaining_capacity: 0
        };
    }

    const capacityPerDayMt = parseFloat(counterRows[0].capacity_per_day) || 10;
    const capacityPerDayQtl = parseFloat((capacityPerDayMt * 10).toFixed(2));

    // 4. Get all active bookings for this counter on targetDate
    let bookingsSql = `
        SELECT booking_id, TIME_FORMAT(TIME(booking_time), '%H:%i') AS slot_time, 
               quantity_req, quantity_approved
        FROM booking
        WHERE counter_id = ?
          AND DATE(booking_time) = DATE(?)
          AND status NOT IN ('CANCELLED', 'NOT_ARRIVED')
    `;
    const bookingParams = [counterId, targetDate];

    if (excludeBookingId) {
        bookingsSql += ` AND booking_id != ?`;
        bookingParams.push(excludeBookingId);
    }

    const [activeBookings] = await readDb.query(bookingsSql, bookingParams);

    // Sum total booked quantity in Quintals and track reserved slot times
    const bookedTimeSet = new Set();
    let totalBookedQtl = 0;
    activeBookings.forEach(b => {
        if (b.slot_time) {
            bookedTimeSet.add(b.slot_time);
        }
        totalBookedQtl += parseFloat(b.quantity_approved || b.quantity_req) || 0;
    });

    totalBookedQtl = parseFloat(totalBookedQtl.toFixed(2));
    const totalBookedMt = parseFloat((totalBookedQtl / 10).toFixed(2));
    const remainingCapacityQtl = Math.max(0, parseFloat((capacityPerDayQtl - totalBookedQtl).toFixed(2)));
    const remainingCapacityMt = parseFloat((remainingCapacityQtl / 10).toFixed(2));
    const isCounterFull = totalBookedQtl >= capacityPerDayQtl;

    // 5. Generate slots from opening_time to closing_time
    const [openH, openM] = opening_time.split(":").map(Number);
    const [closeH, closeM] = closing_time.split(":").map(Number);

    const startMinutes = openH * 60 + openM;
    const endMinutes = closeH * 60 + closeM;

    // Check target date against server/DB current date and time
    const serverNow = await getServerCurrentDateTime(readDb);
    const targetDateStr = normalizeDateStr(targetDate);
    const isToday = (targetDateStr === serverNow.dateStr);
    const isPastDate = (targetDateStr < serverNow.dateStr);

    if (isPastDate) {
        return {
            is_working: false,
            message: "Target appointment date is in the past",
            slots: [],
            daily_capacity: capacityPerDayMt,
            daily_capacity_mt: capacityPerDayMt,
            daily_capacity_qtl: capacityPerDayQtl,
            capacity_unit: "MT/Day",
            booked_quantity_qtl: totalBookedQtl,
            booked_quantity_mt: totalBookedMt,
            remaining_capacity_qtl: remainingCapacityQtl,
            remaining_capacity_mt: remainingCapacityMt,
            is_full: false,
            date: targetDateStr
        };
    }

    const slots = [];
    for (let m = startMinutes; m + avgMinutes <= endMinutes; m += avgMinutes) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        const timeKey = `${hh}:${mm}`;

        const endMTotal = m + avgMinutes;
        const endHH = String(Math.floor(endMTotal / 60)).padStart(2, "0");
        const endMM = String(endMTotal % 60).padStart(2, "0");

        // Requirement: For today: show only slots whose time has not passed
        if (isToday && m <= serverNow.totalMinutes) {
            continue; // Skip passed slots for today
        }

        const isSlotBooked = bookedTimeSet.has(timeKey);

        let slotStatus = "AVAILABLE";
        let isAvailable = true;

        if (isSlotBooked) {
            slotStatus = "BOOKED";
            isAvailable = false;
        } else if (isCounterFull) {
            slotStatus = "FULL";
            isAvailable = false;
        }

        slots.push({
            time: timeKey,
            start_time: `${timeKey}:00`,
            end_time: `${endHH}:${endMM}:00`,
            status: slotStatus,
            available: isAvailable,
            is_past: false
        });
    }

    return {
        is_working: true,
        date: targetDate,
        opening_time,
        closing_time,
        active_opening_time: opHours.active_opening_time,
        active_closing_time: opHours.active_closing_time,
        pending_opening_time: opHours.pending_opening_time,
        pending_closing_time: opHours.pending_closing_time,
        timing_effective_date: opHours.effective_date,
        has_pending_timing_change: opHours.has_pending_change,
        is_timing_pending_applied: Boolean(opHours.has_pending_change && targetDateStr >= opHours.effective_date),
        service_time_minutes: avgMinutes,
        daily_capacity: capacityPerDayMt,
        daily_capacity_mt: capacityPerDayMt,
        daily_capacity_qtl: capacityPerDayQtl,
        capacity_unit: "MT/Day",
        booked_quantity_qtl: totalBookedQtl,
        booked_quantity_mt: totalBookedMt,
        remaining_capacity_qtl: remainingCapacityQtl,
        remaining_capacity_mt: remainingCapacityMt,
        is_full: isCounterFull,
        message: isCounterFull ? `Mandi counter is full for ${targetDate}. Daily intake capacity of ${capacityPerDayMt} MT (${capacityPerDayQtl} QTL) has been reached.` : null,
        slots
    };
}

/**
 * Retrieves total booked quantity for a counter on a given date
 */
async function getCounterBookedQuantity(db, counterId, targetDate, excludeBookingId = null) {
    let sql = `
        SELECT COALESCE(SUM(COALESCE(quantity_approved, quantity_req)), 0) AS total_booked
        FROM booking
        WHERE counter_id = ?
          AND DATE(booking_time) = DATE(?)
          AND status NOT IN ('CANCELLED', 'NOT_ARRIVED')
    `;
    const params = [counterId, targetDate];

    if (excludeBookingId) {
        sql += ` AND booking_id != ?`;
        params.push(excludeBookingId);
    }

    const [rows] = await db.query(sql, params);
    return parseFloat(rows[0]?.total_booked) || 0;
}

module.exports = {
    isMandiWorkingDay,
    getMandiOperatingHours,
    getMandiScheduleDetails,
    getCounterServiceTime,
    generateSlotsForDate,
    getCounterBookedQuantity,
    getServerCurrentDateTime,
    normalizeDateStr
};
