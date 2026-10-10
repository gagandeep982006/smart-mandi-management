/**
 * Calculates farmer allocation, total sold, and remaining quantity
 * for a specific crop and procurement session.
 * Strictly uses ONLY verified agricultural + irrigated land.
 */
async function calculateFarmerAllocation(db, farmerId, cropId, sessionId) {
    // 1. Get farmer's state and tehsil
    const [farmerRows] = await db.query(
        `SELECT farmer_id, state_id, tehsil_id FROM farmer WHERE farmer_id = ?`,
        [farmerId]
    );

    if (farmerRows.length === 0) {
        throw new Error("Farmer not found");
    }

    const stateId = farmerRows[0].state_id;

    // 2. Calculate eligible land area: strictly VERIFIED agricultural or irrigated land only
    const [landRows] = await db.query(
        `SELECT 
            COALESCE(SUM(area), 0) AS eligible_area,
            COUNT(*) AS eligible_plots
         FROM farmer_land
         WHERE farmer_id = ?
           AND land_verification = 'verified'
           AND land_type IN ('agricultural', 'irrigated')`,
        [farmerId]
    );

    const eligibleLandArea = parseFloat(landRows[0]?.eligible_area) || 0;

    // 3. Get procurement quota applicable to farmer's state and crop
    const [quotaRows] = await db.query(
        `SELECT amount, lsp, msp 
         FROM procurement_quota 
         WHERE state_id = ? AND crop_id = ?`,
        [stateId, cropId]
    );

    let quotaPerAcre = 0;
    let lsp = 0;
    let msp = 0;

    if (quotaRows.length > 0) {
        quotaPerAcre = parseFloat(quotaRows[0].amount) || 0;
        lsp = parseFloat(quotaRows[0].lsp) || 0;
        msp = parseFloat(quotaRows[0].msp) || lsp;
    } else {
        // Fallback: lookup by crop_id in procurement_quota
        const [fallbackQuota] = await db.query(
            `SELECT amount, lsp, msp FROM procurement_quota WHERE crop_id = ? LIMIT 1`,
            [cropId]
        );
        if (fallbackQuota.length > 0) {
            quotaPerAcre = parseFloat(fallbackQuota[0].amount) || 0;
            lsp = parseFloat(fallbackQuota[0].lsp) || 0;
            msp = parseFloat(fallbackQuota[0].msp) || lsp;
        }
    }

    // 4. Calculate allocated quantity
    const allocatedQuantity = parseFloat((eligibleLandArea * quotaPerAcre).toFixed(2));

    // 5. Calculate total actual sold / consumed quantity for this farmer across ALL crops
    // Strict Global Quota Rule: Farmer's allocated quota is GLOBAL across all crops.
    // Selling Crop A immediately deducts from available quota for Crop B.
    // Only COMPLETED bookings count as sold. CANCELLED or NOT_ARRIVED do NOT count as sold.
    let soldQuery = `
        SELECT 
            COALESCE(SUM(COALESCE(p.quantity_sold, b.quantity_approved)), 0) AS total_sold
         FROM booking b
         LEFT JOIN payment p ON b.booking_id = p.booking_id
         WHERE b.farmer_id = ? 
           AND b.status = 'COMPLETED'
    `;
    const soldParams = [farmerId];

    if (sessionId) {
        // If sessionId is provided, ensure we count completed sales across all concurrent/overlapping sessions
        const [targetSessionRows] = await db.query(
            `SELECT start_date, end_date FROM procurement_session WHERE session_id = ?`,
            [sessionId]
        );
        if (targetSessionRows.length > 0) {
            soldQuery += ` AND (b.session_id IN (
                SELECT session_id FROM procurement_session 
                WHERE (start_date <= ? AND end_date >= ?)
                   OR (YEAR(start_date) = YEAR(?))
            ) OR b.session_id IS NULL)`;
            soldParams.push(targetSessionRows[0].end_date, targetSessionRows[0].start_date, targetSessionRows[0].start_date);
        }
    }

    const [soldRows] = await db.query(soldQuery, soldParams);
    const totalSoldQuantity = parseFloat(soldRows[0]?.total_sold) || 0;

    // Crop-specific sold quantity for this specific crop
    const [cropSoldRows] = await db.query(
        `SELECT 
            COALESCE(SUM(COALESCE(p.quantity_sold, b.quantity_approved)), 0) AS crop_sold
         FROM booking b
         LEFT JOIN payment p ON b.booking_id = p.booking_id
         WHERE b.farmer_id = ? 
           AND b.crop_id = ?
           AND b.status = 'COMPLETED'`,
        [farmerId, cropId]
    );
    const cropSoldQuantity = parseFloat(cropSoldRows[0]?.crop_sold) || 0;

    // 6. Check for ANY active upcoming booking/token for this farmer across the system
    const [activeBookings] = await db.query(
        `SELECT 
            b.booking_id,
            b.crop_id,
            c.crop_name,
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
            qt.token_number,
            qt.service_date,
            qt.queue_position
         FROM booking b
         JOIN crop c ON b.crop_id = c.crop_id
         JOIN procurement_session ps ON b.session_id = ps.session_id
         JOIN mandi_counter mc ON b.counter_id = mc.counter_id
         JOIN mandi m ON mc.mandi_id = m.mandi_id
         LEFT JOIN queue_token qt ON b.booking_id = qt.booking_id
         WHERE b.farmer_id = ? 
           AND b.status IN ('BOOKED', 'WAITING', 'CALLED', 'ARRIVED', 'PROCESSING')
         ORDER BY b.booking_time ASC
         LIMIT 1`,
        [farmerId]
    );

    const upcomingBooking = activeBookings.length > 0 ? activeBookings[0] : null;
    const hasUpcomingBooking = Boolean(upcomingBooking);

    // 7. Calculate remaining quantity
    const remainingQuantity = Math.max(0, parseFloat((allocatedQuantity - totalSoldQuantity).toFixed(2)));

    // Farmer can book as long as remaining quantity > 0 and no upcoming active booking exists
    const canBook = remainingQuantity > 0 && !hasUpcomingBooking;

    return {
        farmer_id: Number(farmerId),
        crop_id: Number(cropId),
        session_id: Number(sessionId),
        eligible_land_area: eligibleLandArea,
        quota_per_acre: quotaPerAcre,
        lsp,
        msp,
        allocated_quantity: allocatedQuantity,
        total_sold_quantity: totalSoldQuantity,
        crop_sold_quantity: cropSoldQuantity,
        remaining_quantity: remainingQuantity,
        has_active_booking: hasUpcomingBooking,
        has_upcoming_booking: hasUpcomingBooking,
        active_booking: upcomingBooking,
        upcoming_booking: upcomingBooking,
        can_book: canBook
    };
}

module.exports = {
    calculateFarmerAllocation
};
