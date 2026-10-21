const { getReadDatabase, getWriteDatabase } = require("../services/databaserouter");
const MandiRecentLogs = require("../model/mongomodel/MandiRecentLogs");
const BookingHistory = require("../model/mongomodel/BookingHistory");
const TokenHistory = require("../model/mongomodel/TokenHistory");
const PaymentHistory = require("../model/mongomodel/PaymentHistory");
const { isMandiWorkingDay, getMandiOperatingHours } = require("../services/slotService");


async function getAndAuthorizeToken(tokenId, user, requireActive = true) {
    const readDb = getReadDatabase().promise();

    const [rows] = await readDb.query(
        `SELECT 
            qt.*,
            b.farmer_id,
            b.crop_id,
            b.session_id,
            b.booking_time,
            b.quantity_approved,
            b.status as booking_status,
            mc.mandi_id,
            mc.status as counter_status,
            f.name as farmer_name
         FROM queue_token qt
         JOIN booking b ON qt.booking_id = b.booking_id
         JOIN mandi_counter mc ON qt.counter_id = mc.counter_id
         JOIN farmer f ON b.farmer_id = f.farmer_id
         WHERE qt.token_id = ?`,
        [tokenId]
    );

    if (rows.length === 0) {
        const error = new Error("Token not found");
        error.statusCode = 404;
        throw error;
    }

    const token = rows[0];

    // Check Mandi access
    if (Number(token.mandi_id) !== Number(user.mandi_id)) {
        const error = new Error("Access denied: Token belongs to another Mandi");
        error.statusCode = 403;
        throw error;
    }

    // Check Counter assignment
    const assignedCounters = Array.isArray(user.counter_ids) ? user.counter_ids : [];
    if (!assignedCounters.includes(Number(token.counter_id))) {
        const error = new Error("Access denied: You are not assigned to this counter");
        error.statusCode = 403;
        throw error;
    }

    // Check Counter active status
    if (requireActive && token.counter_status !== "active") {
        const error = new Error("Counter is inactive. Operational actions are disabled.");
        error.statusCode = 403;
        throw error;
    }

    // Check future date restriction: cannot perform operational actions on future-scheduled tokens
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tokenServiceDate = new Date(token.service_date);
    tokenServiceDate.setHours(0, 0, 0, 0);

    if (tokenServiceDate > today) {
        const error = new Error("Operational actions are disabled for future scheduled tokens. View only.");
        error.statusCode = 400;
        throw error;
    }

    return token;
}

function getSlotTimingStatus(bookingTime, serviceDate) {
    if (!bookingTime) return { status: 'IN_SLOT', isSlotActive: true, isBeforeSlot: false, isPastSlot: false, isUpcoming: false, timeStr: 'N/A' };

    let bookingHours = 0;
    let bookingMinutes = 0;
    let timeStr = 'N/A';

    if (typeof bookingTime === 'string') {
        const trimmed = bookingTime.trim();
        const m = trimmed.match(/(?:^|\s|T)(\d{1,2}):(\d{2})/);
        if (m) {
            bookingHours = parseInt(m[1], 10);
            bookingMinutes = parseInt(m[2], 10);
            const period = bookingHours >= 12 ? 'PM' : 'AM';
            const displayH = bookingHours % 12 || 12;
            timeStr = `${String(displayH).padStart(2, '0')}:${String(bookingMinutes).padStart(2, '0')} ${period}`;
        }
    }

    if (timeStr === 'N/A') {
        const bookingDate = new Date(bookingTime);
        if (!isNaN(bookingDate.getTime())) {
            const istTimeFormatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                minute: 'numeric',
                hourCycle: 'h23'
            });
            const parts = istTimeFormatter.formatToParts(bookingDate);
            bookingHours = parseInt(parts.find(p => p.type === 'hour')?.value || 0, 10);
            bookingMinutes = parseInt(parts.find(p => p.type === 'minute')?.value || 0, 10);

            timeStr = bookingDate.toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).toUpperCase();
        }
    }

    const now = new Date();
    const istNowDateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const todayIstStr = istNowDateFormatter.format(now); // "YYYY-MM-DD"

    const istNowFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23'
    });
    const nowParts = istNowFormatter.formatToParts(now);
    const nowHours = parseInt(nowParts.find(p => p.type === 'hour')?.value || 0, 10);
    const nowMinutes = parseInt(nowParts.find(p => p.type === 'minute')?.value || 0, 10);

    let parsedServiceDateStr = '';
    if (serviceDate) {
        if (typeof serviceDate === 'string') {
            parsedServiceDateStr = serviceDate.trim().substring(0, 10);
        } else if (serviceDate instanceof Date) {
            parsedServiceDateStr = istNowDateFormatter.format(serviceDate);
        }
    }

    const isFutureDate = parsedServiceDateStr && parsedServiceDateStr > todayIstStr;
    const isPastDate = parsedServiceDateStr && parsedServiceDateStr < todayIstStr;

    // IF FUTURE DATE: Never mark as passed! Calculate upcoming status based on server IST date and time
    if (isFutureDate) {
        const [sYear, sMonth, sDay] = parsedServiceDateStr.split('-').map(Number);
        const [tYear, tMonth, tDay] = todayIstStr.split('-').map(Number);
        const diffDays = Math.round((Date.UTC(sYear, sMonth - 1, sDay) - Date.UTC(tYear, tMonth - 1, tDay)) / (1000 * 60 * 60 * 24));

        const nowTotalMinutes = nowHours * 60 + nowMinutes;
        const slotTotalMinutes = bookingHours * 60 + bookingMinutes;
        const totalMinutesUntil = (diffDays * 24 * 60) + (slotTotalMinutes - nowTotalMinutes);

        let remainingLabel = `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
        if (diffDays === 1) {
            const hoursUntil = Math.floor(totalMinutesUntil / 60);
            if (hoursUntil > 0 && hoursUntil < 24) {
                remainingLabel = `Tomorrow (in ${hoursUntil}h)`;
            } else {
                remainingLabel = 'Tomorrow';
            }
        }

        return {
            status: 'UPCOMING_SLOT',
            isSlotActive: false,
            isBeforeSlot: true,
            isPastSlot: false,
            isUpcoming: true,
            daysUntilSlot: diffDays,
            minutesUntilSlot: totalMinutesUntil,
            remainingLabel,
            timeStr
        };
    }

    // IF PAST DATE:
    if (isPastDate) {
        return {
            status: 'PAST_SLOT',
            isSlotActive: false,
            isBeforeSlot: false,
            isPastSlot: true,
            isUpcoming: false,
            timeStr,
            minutesPastSlot: 0
        };
    }

    // FOR TODAY:
    const slotTotalMinutes = bookingHours * 60 + bookingMinutes;
    const nowTotalMinutes = nowHours * 60 + nowMinutes;

    const earlyAllowanceMinutes = 15;
    const slotDurationMinutes = 30;

    const earliestCallMinute = slotTotalMinutes - earlyAllowanceMinutes;
    const slotEndMinute = slotTotalMinutes + slotDurationMinutes;

    if (nowTotalMinutes < earliestCallMinute) {
        return {
            status: 'BEFORE_SLOT',
            isSlotActive: false,
            isBeforeSlot: true,
            isPastSlot: false,
            isUpcoming: true,
            timeStr,
            minutesUntilSlot: slotTotalMinutes - nowTotalMinutes,
            remainingLabel: `In ${slotTotalMinutes - nowTotalMinutes}m`
        };
    } else if (nowTotalMinutes > slotEndMinute) {
        return {
            status: 'PAST_SLOT',
            isSlotActive: false,
            isBeforeSlot: false,
            isPastSlot: true,
            isUpcoming: false,
            timeStr,
            minutesPastSlot: nowTotalMinutes - slotEndMinute
        };
    } else {
        return {
            status: 'IN_SLOT',
            isSlotActive: true,
            isBeforeSlot: false,
            isPastSlot: false,
            isUpcoming: false,
            timeStr
        };
    }
}

const callNextFarmer = async (req, res) => {
    let conn;
    try {
        const counter = req.counter;
        const readDb = getReadDatabase().promise();

        // 1. Find the next WAITING token for today
        const [waitingTokens] = await readDb.query(
            `SELECT 
                qt.token_id,
                qt.token_number,
                qt.queue_position,
                qt.booking_id,
                qt.counter_id,
                qt.service_date,
                qt.early_request_status,
                b.session_id,
                b.farmer_id,
                b.crop_id,
                b.quantity_req,
                b.quantity_approved,
                b.booking_time,
                f.name as farmer_name
             FROM queue_token qt
             JOIN booking b ON qt.booking_id = b.booking_id
             JOIN farmer f ON b.farmer_id = f.farmer_id
             WHERE qt.counter_id = ? 
               AND qt.service_date = CURDATE() 
               AND qt.status = 'WAITING'
             ORDER BY b.booking_time ASC, qt.queue_position ASC
             LIMIT 1`,
            [counter.counter_id]
        );

        if (waitingTokens.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No waiting farmers remaining in today's queue"
            });
        }

        const nextToken = waitingTokens[0];

        // Validate appointment slot time
        const timing = getSlotTimingStatus(nextToken.booking_time);
        if (timing.isBeforeSlot && nextToken.early_request_status !== "ACCEPTED") {
            return res.status(400).json({
                success: false,
                code: "BEFORE_SLOT_TIME",
                can_request_early: true,
                token_id: nextToken.token_id,
                farmer_name: nextToken.farmer_name,
                scheduled_time: timing.timeStr,
                message: `Current time is before ${nextToken.farmer_name}'s scheduled appointment (${timing.timeStr}). Please send an Early Arrival Request first and wait for farmer acceptance in Farmer Portal.`
            });
        }

        // 2. Perform transaction on Primary DB
        const pool = getWriteDatabase().promise();
        conn = await pool.getConnection();

        await conn.beginTransaction();

        // Update queue_token
        await conn.query(
            `UPDATE queue_token
             SET status = 'CALLED', called_at = NOW()
             WHERE token_id = ?`,
            [nextToken.token_id]
        );

        // Update booking
        await conn.query(
            `UPDATE booking
             SET status = 'CALLED'
             WHERE booking_id = ?`,
            [nextToken.booking_id]
        );

        await conn.commit();

        // 3. Post-commit MongoDB logging & token history document
        try {
            await MandiRecentLogs.create({
                user_id: req.user.user_id,
                username: "operator",
                recent_activity: `Token ${nextToken.token_number} called (${nextToken.farmer_name})`
            });

            await TokenHistory.create({
                token_id: nextToken.token_id,
                booking_id: nextToken.booking_id,
                counter_id: nextToken.counter_id,
                old_status: "WAITING",
                new_status: "CALLED",
                action: "CALL_NEXT",
                changed_by: req.user.user_id,
                changed_at: new Date(),
                service_date: nextToken.service_date,
                token_number: nextToken.token_number,
                queue_position: nextToken.queue_position,
                status: "CALLED",
                called_at: new Date(),
                session_id: nextToken.session_id
            });

            await BookingHistory.create({
                booking_id: nextToken.booking_id,
                farmer_id: nextToken.farmer_id,
                crop_id: nextToken.crop_id,
                session_id: nextToken.session_id,
                counter_id: nextToken.counter_id,
                quantity_req: nextToken.quantity_req,
                quantity_approved: nextToken.quantity_approved,
                booking_time: nextToken.booking_time,
                status: "CALLED"
            });
        } catch (mongoErr) {
            console.error("MongoDB history logging error on callNext:", mongoErr.message);
        }

        return res.status(200).json({
            success: true,
            message: `Token ${nextToken.token_number} called successfully`,
            data: {
                token_id: nextToken.token_id,
                token_number: nextToken.token_number,
                farmer_name: nextToken.farmer_name,
                status: "CALLED"
            }
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("callNextFarmer error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    } finally {
        if (conn) conn.release();
    }
};

const markArrived = async (req, res) => {
    let conn;
    try {
        const tokenId = Number(req.params.token_id);
        const token = await getAndAuthorizeToken(tokenId, req.user, true);

        if (token.status !== "CALLED") {
            return res.status(400).json({
                success: false,
                message: `Cannot mark as arrived. Current token status is ${token.status} (expected: CALLED)`
            });
        }

        const pool = getWriteDatabase().promise();
        conn = await pool.getConnection();

        await conn.beginTransaction();

        await conn.query(
            `UPDATE queue_token
             SET status = 'ARRIVED', arrival_time = NOW()
             WHERE token_id = ?`,
            [tokenId]
        );

        await conn.query(
            `UPDATE booking
             SET status = 'ARRIVED'
             WHERE booking_id = ?`,
            [token.booking_id]
        );

        await conn.commit();

        try {
            await MandiRecentLogs.create({
                user_id: req.user.user_id,
                username: "operator",
                recent_activity: `Token ${token.token_number} marked arrived (${token.farmer_name})`
            });

            await TokenHistory.create({
                token_id: token.token_id,
                booking_id: token.booking_id,
                counter_id: token.counter_id,
                old_status: "CALLED",
                new_status: "ARRIVED",
                action: "MARK_ARRIVED",
                changed_by: req.user.user_id,
                changed_at: new Date(),
                service_date: token.service_date,
                token_number: token.token_number,
                queue_position: token.queue_position,
                status: "ARRIVED",
                arrival_time: new Date(),
                session_id: token.session_id
            });
        } catch (mongoErr) {
            console.error("MongoDB logging error in markArrived:", mongoErr.message);
        }

        return res.status(200).json({
            success: true,
            message: `Token ${token.token_number} marked as arrived`,
            data: { token_id: tokenId, status: "ARRIVED" }
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("markArrived error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    } finally {
        if (conn) conn.release();
    }
};

const startProcessing = async (req, res) => {
    let conn;
    try {
        const tokenId = Number(req.params.token_id);
        const token = await getAndAuthorizeToken(tokenId, req.user, true);

        if (token.status !== "ARRIVED" && token.status !== "CALLED") {
            return res.status(400).json({
                success: false,
                message: `Cannot start processing. Current status is ${token.status} (expected: ARRIVED)`
            });
        }

        const pool = getWriteDatabase().promise();
        conn = await pool.getConnection();

        await conn.beginTransaction();

        await conn.query(
            `UPDATE queue_token
             SET status = 'PROCESSING', processing_start_time = NOW()
             WHERE token_id = ?`,
            [tokenId]
        );

        await conn.query(
            `UPDATE booking
             SET status = 'PROCESSING'
             WHERE booking_id = ?`,
            [token.booking_id]
        );

        await conn.commit();

        try {
            await MandiRecentLogs.create({
                user_id: req.user.user_id,
                username: "operator",
                recent_activity: `Token ${token.token_number} started processing (${token.farmer_name})`
            });

            await TokenHistory.create({
                token_id: token.token_id,
                booking_id: token.booking_id,
                counter_id: token.counter_id,
                old_status: token.status,
                new_status: "PROCESSING",
                action: "START_PROCESSING",
                changed_by: req.user.user_id,
                changed_at: new Date(),
                service_date: token.service_date,
                token_number: token.token_number,
                queue_position: token.queue_position,
                status: "PROCESSING",
                processing_start_time: new Date(),
                session_id: token.session_id
            });
        } catch (mongoErr) {
            console.error("MongoDB logging error in startProcessing:", mongoErr.message);
        }

        return res.status(200).json({
            success: true,
            message: `Token ${token.token_number} started processing`,
            data: { token_id: tokenId, status: "PROCESSING" }
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("startProcessing error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    } finally {
        if (conn) conn.release();
    }
};

const completeFarmer = async (req, res) => {
    let conn;
    try {
        const tokenId = Number(req.params.token_id);
        const token = await getAndAuthorizeToken(tokenId, req.user, true);

        if (token.status !== "PROCESSING" && token.status !== "ARRIVED") {
            return res.status(400).json({
                success: false,
                message: `Cannot complete farmer. Current status is ${token.status} (expected: PROCESSING)`
            });
        }

        const readDb = getReadDatabase().promise();
        // Dynamic lookup of state-wise LSP and MSP strictly from procurement_quota table
        const [quotaRows] = await readDb.query(
            `SELECT pq.lsp, pq.msp, pq.amount, s.state_name, c.crop_name
             FROM procurement_quota pq
             JOIN vw_mandis vm ON vm.mandi_id = ? AND pq.state_id = vm.state_id
             JOIN state s ON pq.state_id = s.state_id
             JOIN crop c ON pq.crop_id = c.crop_id
             WHERE pq.crop_id = ?
             LIMIT 1`,
            [token.mandi_id, token.crop_id]
        );

        let lsp = 0;
        let msp = 0;
        let quotaState = "";
        let cropName = "";

        if (quotaRows.length > 0) {
            lsp = parseFloat(quotaRows[0].lsp) || 0;
            msp = parseFloat(quotaRows[0].msp) || lsp;
            quotaState = quotaRows[0].state_name;
            cropName = quotaRows[0].crop_name;
        } else {
            // Secondary lookup in procurement_quota by crop_id
            const [fallbackQuota] = await readDb.query(
                `SELECT pq.lsp, pq.msp, pq.amount, s.state_name, c.crop_name 
                 FROM procurement_quota pq
                 JOIN state s ON pq.state_id = s.state_id
                 JOIN crop c ON pq.crop_id = c.crop_id
                 WHERE pq.crop_id = ? 
                 LIMIT 1`,
                [token.crop_id]
            );
            if (fallbackQuota.length > 0) {
                lsp = parseFloat(fallbackQuota[0].lsp) || 0;
                msp = parseFloat(fallbackQuota[0].msp) || lsp;
                quotaState = fallbackQuota[0].state_name;
                cropName = fallbackQuota[0].crop_name;
            } else {
                return res.status(400).json({
                    success: false,
                    message: `Procurement quota not found in procurement_quota table for crop ${token.crop_id}. Please configure state procurement quota.`
                });
            }
        }

        // Quality grade: A = 1.0, B = 0.5, C = 0.0
        let qualityFactor = 1.0;
        const grade = (req.body.quality_grade || req.body.quality || "A").toString().toUpperCase();
        if (grade === "B") {
            qualityFactor = 0.5;
        } else if (grade === "C") {
            qualityFactor = 0.0;
        } else if (typeof req.body.quality_factor === "number") {
            qualityFactor = Math.max(0, Math.min(1, req.body.quality_factor));
        }

        const quantitySold = parseFloat(req.body.quantity_sold) || parseFloat(token.quantity_approved) || 0;
        // rate = LSP + quality_factor * (MSP - LSP)
        const ratePerUnit = parseFloat((lsp + qualityFactor * (msp - lsp)).toFixed(2));
        const totalAmount = parseFloat((quantitySold * ratePerUnit).toFixed(2));

        const pool = getWriteDatabase().promise();
        conn = await pool.getConnection();

        await conn.beginTransaction();

        // 1. Update queue_token
        await conn.query(
            `UPDATE queue_token
             SET status = 'COMPLETED', completion_time = NOW()
             WHERE token_id = ?`,
            [tokenId]
        );

        // 2. Update booking
        await conn.query(
            `UPDATE booking
             SET status = 'COMPLETED'
             WHERE booking_id = ?`,
            [token.booking_id]
        );

        // 3. Prevent duplicate payment: insert payment if not exists
        const [paymentResult] = await conn.query(
            `INSERT INTO payment 
             (booking_id, farmer_id, mandi_id, crop_id, quantity_sold, rate_per_unit, total_payable_amount, payment_status, payment_date, generated_by_user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW(), ?)
             ON DUPLICATE KEY UPDATE 
                quantity_sold = VALUES(quantity_sold),
                rate_per_unit = VALUES(rate_per_unit),
                total_payable_amount = VALUES(total_payable_amount),
                payment_status = VALUES(payment_status),
                payment_date = VALUES(payment_date),
                generated_by_user_id = IFNULL(payment.generated_by_user_id, VALUES(generated_by_user_id))`,
            [token.booking_id, token.farmer_id, token.mandi_id, token.crop_id, quantitySold, ratePerUnit, totalAmount, req.user?.user_id || null]
        );

        const paymentId = paymentResult.insertId || 0;

        await conn.commit();

        // 4. Post-commit MongoDB logging & token history document
        try {
            await MandiRecentLogs.create({
                user_id: req.user.user_id,
                username: "operator",
                recent_activity: `Farmer completed for token ${token.token_number}. Payment created.`
            });

            await TokenHistory.create({
                token_id: token.token_id,
                booking_id: token.booking_id,
                counter_id: token.counter_id,
                old_status: token.status,
                new_status: "COMPLETED",
                action: "COMPLETE",
                changed_by: req.user.user_id,
                changed_at: new Date(),
                service_date: token.service_date,
                token_number: token.token_number,
                queue_position: token.queue_position,
                status: "COMPLETED",
                completion_time: new Date(),
                session_id: token.session_id
            });

            await BookingHistory.create({
                booking_id: token.booking_id,
                farmer_id: token.farmer_id,
                crop_id: token.crop_id,
                session_id: token.session_id,
                counter_id: token.counter_id,
                quantity_req: token.quantity_approved,
                quantity_approved: token.quantity_approved,
                booking_time: token.service_date,
                status: "COMPLETED"
            });

            if (paymentId > 0) {
                await PaymentHistory.create({
                    payment_id: paymentId,
                    booking_id: token.booking_id,
                    farmer_id: token.farmer_id,
                    mandi_id: token.mandi_id,
                    crop_id: token.crop_id,
                    quantity_sold: quantitySold,
                    rate_per_unit: ratePerUnit,
                    total_payable_amount: totalAmount,
                    payment_status: "PENDING",
                    payment_date: new Date(),
                    session_id: token.session_id
                });
            }
        } catch (mongoErr) {
            console.error("MongoDB logging error in completeFarmer:", mongoErr.message);
        }

        return res.status(200).json({
            success: true,
            message: `Farmer ${token.farmer_name} completed successfully. Payable Amount: ₹${totalAmount.toFixed(2)} (Rate: ₹${ratePerUnit}/q [MSP: ₹${msp}, LSP: ₹${lsp}])`,
            data: {
                token_id: tokenId,
                token_number: token.token_number,
                farmer_name: token.farmer_name,
                crop_name: cropName || token.crop_name,
                status: "COMPLETED",
                payment_id: paymentId,
                total_payable_amount: totalAmount,
                rate_per_unit: ratePerUnit,
                quantity_sold: quantitySold,
                quality_grade: grade,
                quota_info: {
                    state_name: quotaState,
                    lsp: lsp,
                    msp: msp
                }
            }
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("completeFarmer error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * POST /api/tokens/:token_id/call
 * Calls a specific farmer from today's queue (validates slot time or early acceptance)
 */
const callFarmer = async (req, res) => {
    let conn;
    try {
        const tokenId = Number(req.params.token_id);
        const token = await getAndAuthorizeToken(tokenId, req.user, true);

        if (token.status !== "WAITING") {
            return res.status(400).json({
                success: false,
                message: `Cannot call farmer. Current token status is ${token.status} (expected: WAITING)`
            });
        }

        const timing = getSlotTimingStatus(token.booking_time);

        if (timing.isBeforeSlot && token.early_request_status !== 'ACCEPTED') {
            return res.status(400).json({
                success: false,
                code: "BEFORE_SLOT_TIME",
                can_request_early: true,
                token_id: tokenId,
                farmer_name: token.farmer_name,
                scheduled_time: timing.timeStr,
                message: `Current time is before ${token.farmer_name}'s scheduled appointment (${timing.timeStr}). Please send an Early Arrival Request first and wait for farmer acceptance in Farmer Portal.`
            });
        }

        const pool = getWriteDatabase().promise();
        conn = await pool.getConnection();

        await conn.beginTransaction();

        await conn.query(
            `UPDATE queue_token
             SET status = 'CALLED', called_at = NOW()
             WHERE token_id = ?`,
            [tokenId]
        );

        await conn.query(
            `UPDATE booking
             SET status = 'CALLED'
             WHERE booking_id = ?`,
            [token.booking_id]
        );

        await conn.commit();

        try {
            await MandiRecentLogs.create({
                user_id: req.user.user_id,
                username: "operator",
                recent_activity: `Token ${token.token_number} called (${token.farmer_name})`
            });

            await TokenHistory.create({
                token_id: token.token_id,
                booking_id: token.booking_id,
                counter_id: token.counter_id,
                old_status: "WAITING",
                new_status: "CALLED",
                action: "CALL_FARMER",
                changed_by: req.user.user_id,
                changed_at: new Date(),
                service_date: token.service_date,
                token_number: token.token_number,
                queue_position: token.queue_position,
                status: "CALLED",
                called_at: new Date(),
                session_id: token.session_id
            });
        } catch (mongoErr) {
            console.error("MongoDB logging error in callFarmer:", mongoErr.message);
        }

        return res.status(200).json({
            success: true,
            message: `Token ${token.token_number} (${token.farmer_name}) called successfully`,
            data: {
                token_id: tokenId,
                token_number: token.token_number,
                farmer_name: token.farmer_name,
                status: "CALLED"
            }
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("callFarmer error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * POST /api/tokens/:token_id/request-early
 * Sends an early arrival request to any farmer scheduled for today's service date
 */
const requestEarlyFarmer = async (req, res) => {
    let conn;
    try {
        const tokenId = Number(req.params.token_id);
        const token = await getAndAuthorizeToken(tokenId, req.user, true);

        if (token.status !== "WAITING") {
            return res.status(400).json({
                success: false,
                message: `Can only send early arrival request to WAITING farmers. Current status: ${token.status}`
            });
        }

        const pool = getWriteDatabase().promise();
        conn = await pool.getConnection();

        await conn.beginTransaction();

        const message = req.body?.message || 'Intake counter is ready early. Can you arrive now for procurement?';

        await conn.query(
            `UPDATE queue_token 
             SET early_request_status = 'PENDING',
                 early_req_time = NOW(),
                 early_operator_message = ?,
                 early_farmer_response = NULL,
                 early_responded_at = NULL
             WHERE token_id = ?`,
            [message, tokenId]
        );

        await conn.commit();

        try {
            await MandiRecentLogs.create({
                user_id: req.user.user_id,
                username: "operator",
                recent_activity: `Early arrival request sent to ${token.farmer_name} (Token ${token.token_number})`
            });
        } catch (mongoErr) {
            console.error("MongoDB logging error in requestEarlyFarmer:", mongoErr.message);
        }

        return res.status(200).json({
            success: true,
            message: `Early arrival request sent to ${token.farmer_name}. Awaiting farmer response in Farmer Portal.`,
            data: {
                token_id: tokenId,
                early_request_status: "PENDING"
            }
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("requestEarlyFarmer error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * PATCH /api/tokens/:token_id/not-arrived
 * Marks a called farmer as NOT_ARRIVED. Keeps records for history.
 * Enforces rule: Cannot mark not arrived before the scheduled slot time has passed.
 */
const markNotArrived = async (req, res) => {
    let conn;
    try {
        const tokenId = Number(req.params.token_id);
        const token = await getAndAuthorizeToken(tokenId, req.user, true);

        if (token.status !== "CALLED" && token.status !== "WAITING") {
            return res.status(400).json({
                success: false,
                message: `Cannot mark not arrived. Current status is ${token.status}`
            });
        }

        // Check slot timing: cannot mark not arrived before scheduled slot has passed
        const timing = getSlotTimingStatus(token.booking_time);
        if (timing.isBeforeSlot || timing.isSlotActive) {
            return res.status(400).json({
                success: false,
                message: `Cannot mark farmer as Not Arrived before their scheduled appointment time has passed. Scheduled slot is ${timing.timeStr}.`
            });
        }

        const pool = getWriteDatabase().promise();
        conn = await pool.getConnection();

        await conn.beginTransaction();

        await conn.query(
            `UPDATE queue_token
             SET status = 'NOT_ARRIVED', failed_at = NOW()
             WHERE token_id = ?`,
            [tokenId]
        );

        await conn.query(
            `UPDATE booking
             SET status = 'NOT_ARRIVED'
             WHERE booking_id = ?`,
            [token.booking_id]
        );

        await conn.commit();

        try {
            await MandiRecentLogs.create({
                user_id: req.user.user_id,
                username: "operator",
                recent_activity: `Farmer marked not arrived for token ${token.token_number}`
            });

            await TokenHistory.create({
                token_id: token.token_id,
                booking_id: token.booking_id,
                counter_id: token.counter_id,
                service_date: token.service_date,
                token_number: token.token_number,
                queue_position: token.queue_position,
                old_status: token.status,
                new_status: "NOT_ARRIVED",
                action: "MARK_NOT_ARRIVED",
                changed_by: req.user.user_id,
                changed_at: new Date(),
                status: "NOT_ARRIVED",
                failed_at: new Date(),
                session_id: token.session_id
            });
        } catch (mongoErr) {
            console.error("MongoDB logging error in markNotArrived:", mongoErr.message);
        }

        return res.status(200).json({
            success: true,
            message: `Token ${token.token_number} marked as not arrived`,
            data: { token_id: tokenId, status: "NOT_ARRIVED" }
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("markNotArrived error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = {
    callNextFarmer,
    callFarmer,
    requestEarlyFarmer,
    markArrived,
    startProcessing,
    completeFarmer,
    markNotArrived,
    getSlotTimingStatus
};

