const { getReadDatabase } = require("./databaserouter");

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Checks whether a target date is a working day for the Mandi.
 * Respects 7-day effective date for newly configured working days.
 */
async function isMandiWorkingDay(mandiId, targetDate) {
    const readDb = getReadDatabase().promise();
    const dateObj = new Date(targetDate);
    const dayName = DAYS[dateObj.getDay()];

    const [rows] = await readDb.query(
        `SELECT is_working, pending_is_working, effective_date 
         FROM mandi_working_day 
         WHERE mandi_id = ? AND day_of_week = ?`,
        [mandiId, dayName]
    );

    // If no row exists, default to working Monday-Saturday
    if (rows.length === 0) {
        return dayName !== "Sunday";
    }

    const row = rows[0];
    if (row.pending_is_working != null && row.effective_date != null) {
        const tDate = new Date(targetDate).toISOString().slice(0, 10);
        const effDate = new Date(row.effective_date).toISOString().slice(0, 10);
        if (tDate >= effDate) {
            return Boolean(row.pending_is_working);
        }
    }

    return Boolean(row.is_working);
}

/**
 * Retrieves operating hours for a Mandi.
 * Respects 7-day effective date for newly configured operating hours.
 */
async function getMandiOperatingHours(mandiId, targetDate = null) {
    const readDb = getReadDatabase().promise();
    const [rows] = await readDb.query(
        `SELECT opening_time, closing_time, pending_opening_time, pending_closing_time, effective_date 
         FROM mandi_timing 
         WHERE mandi_id = ?`,
        [mandiId]
    );

    if (rows.length === 0) {
        return { opening_time: "09:00:00", closing_time: "17:00:00" };
    }

    const row = rows[0];
    if (row.pending_opening_time && row.pending_closing_time && row.effective_date) {
        const checkDate = targetDate ? new Date(targetDate) : new Date();
        const tDate = checkDate.toISOString().slice(0, 10);
        const effDate = new Date(row.effective_date).toISOString().slice(0, 10);
        if (tDate >= effDate) {
            return {
                opening_time: row.pending_opening_time,
                closing_time: row.pending_closing_time
            };
        }
    }

    return {
        opening_time: row.opening_time,
        closing_time: row.closing_time
    };
}

/**
 * Retrieves average processing time in minutes for a counter.
 * A newly updated average time comes into effect AFTER 7 DAYS.
 * For dates prior to the 7-day effective date, the active counter_service_time is preserved.
 */
async function getCounterServiceTime(counterId, targetDate = null) {
    const readDb = getReadDatabase().promise();

    const [catRows] = await readDb.query(
        `SELECT avg_time_minutes, effective_date FROM counter_avg_time WHERE counter_id = ?`,
        [counterId]
    );

    const [cstRows] = await readDb.query(
        `SELECT average_time_minutes FROM counter_service_time WHERE counter_id = ?`,
        [counterId]
    );
    const activeServiceTime = cstRows.length > 0 && cstRows[0].average_time_minutes != null
        ? Number(cstRows[0].average_time_minutes)
        : null;

    if (catRows.length > 0 && catRows[0].avg_time_minutes != null) {
        const cat = catRows[0];
        if (cat.effective_date != null) {
            const checkDate = targetDate ? new Date(targetDate) : new Date();
            const tDate = checkDate.toISOString().slice(0, 10);
            const effDate = new Date(cat.effective_date).toISOString().slice(0, 10);

            if (tDate >= effDate) {
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
 * Generates slots for a counter on a given date
 */
async function generateSlotsForDate(mandiId, counterId, targetDate) {
    const isWorking = await isMandiWorkingDay(mandiId, targetDate);
    if (!isWorking) {
        return [];
    }

    const { opening_time, closing_time } = await getMandiOperatingHours(mandiId, targetDate);
    const avgMinutes = await getCounterServiceTime(counterId, targetDate);

    const [openH, openM] = opening_time.split(":").map(Number);
    const [closeH, closeM] = closing_time.split(":").map(Number);

    const startMinutes = openH * 60 + openM;
    const endMinutes = closeH * 60 + closeM;

    const slots = [];
    for (let m = startMinutes; m + avgMinutes <= endMinutes; m += avgMinutes) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        slots.push(`${hh}:${mm}`);
    }

    return slots;
}

module.exports = {
    isMandiWorkingDay,
    getMandiOperatingHours,
    getCounterServiceTime,
    generateSlotsForDate
};
