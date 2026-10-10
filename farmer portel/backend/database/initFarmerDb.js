const { getWriteDatabase } = require("./databaserouter");

/**
 * Initializes and synchronizes farmer database tables and maintenance events
 * Executes strictly on PRIMARY write DB
 */
async function initFarmerDb() {
    try {
        const pool = getWriteDatabase().promise();

        // Ensure deprecated aadhaar_lookup_table is removed; farmer.aadhaar_lookup attribute is used instead
        await pool.query(`DROP TABLE IF EXISTS aadhaar_lookup_table`);

        // 2. Add effective_date column to counter_avg_time if not already present
        const [colRows] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'counter_avg_time' 
              AND COLUMN_NAME = 'effective_date'
        `);

        if (colRows.length === 0) {
            await pool.query(`
                ALTER TABLE counter_avg_time 
                ADD COLUMN effective_date DATE NULL
            `);
            await pool.query(`
                UPDATE counter_avg_time 
                SET effective_date = DATE(updated_at) 
                WHERE effective_date IS NULL
            `);
        }

        // Ensure pending schedule attributes and effective_date exist on mandi_timing
        const [mtCols] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'mandi_timing'
        `);
        const mtColNames = mtCols.map(c => c.COLUMN_NAME);
        if (!mtColNames.includes("pending_opening_time")) {
            await pool.query("ALTER TABLE mandi_timing ADD COLUMN pending_opening_time TIME NULL");
        }
        if (!mtColNames.includes("pending_closing_time")) {
            await pool.query("ALTER TABLE mandi_timing ADD COLUMN pending_closing_time TIME NULL");
        }
        if (!mtColNames.includes("effective_date")) {
            await pool.query("ALTER TABLE mandi_timing ADD COLUMN effective_date DATE NULL");
        }

        // Ensure pending schedule attributes and effective_date exist on mandi_working_day
        const [mwdCols] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'mandi_working_day'
        `);
        const mwdColNames = mwdCols.map(c => c.COLUMN_NAME);
        if (!mwdColNames.includes("pending_is_working")) {
            await pool.query("ALTER TABLE mandi_working_day ADD COLUMN pending_is_working TINYINT(1) NULL");
        }
        if (!mwdColNames.includes("effective_date")) {
            await pool.query("ALTER TABLE mandi_working_day ADD COLUMN effective_date DATE NULL");
        }

        // 3. Configure procurement history cleanup event based on configured Y years
        const retentionYears = parseInt(process.env.FARMER_PROCUREMENT_HISTORY_RETENTION_YEARS, 10);

        // Try to enable event scheduler (swallow error if user does not have SUPER privilege)
        try {
            await pool.query("SET GLOBAL event_scheduler = ON");
        } catch (evtErr) {
            // Ignore privilege warning if event_scheduler cannot be altered directly
        }

        try {
            await pool.query("DROP EVENT IF EXISTS cleanup_old_procurement_history");
            await pool.query(`
                CREATE EVENT cleanup_old_procurement_history
                ON SCHEDULE EVERY 1 DAY
                STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 10 MINUTE)
                DO
                BEGIN
                    DELETE p FROM payment p
                    JOIN booking b ON p.booking_id = b.booking_id
                    WHERE b.status = 'COMPLETED'
                      AND b.booking_time < DATE_SUB(CURRENT_DATE, INTERVAL ${retentionYears} YEAR);

                    DELETE qt FROM queue_token qt
                    JOIN booking b ON qt.booking_id = b.booking_id
                    WHERE b.status = 'COMPLETED'
                      AND b.booking_time < DATE_SUB(CURRENT_DATE, INTERVAL ${retentionYears} YEAR);

                    DELETE FROM booking
                    WHERE status = 'COMPLETED'
                      AND booking_time < DATE_SUB(CURRENT_DATE, INTERVAL ${retentionYears} YEAR);
                END
            `);
            console.log(`[Database] Configured cleanup_old_procurement_history event with ${retentionYears}-year retention.`);
        } catch (eventErr) {
            console.warn("[Database] Notice regarding event scheduler:", eventErr.message);
        }

        // 4. Ensure early call request attributes exist on queue_token
        try {
            const [cols] = await pool.query("DESCRIBE queue_token");
            const existing = cols.map(c => c.Field);
            if (!existing.includes("early_request_status")) {
                await pool.query("ALTER TABLE queue_token ADD COLUMN early_request_status VARCHAR(20) DEFAULT NULL");
            }
            if (!existing.includes("early_req_time")) {
                await pool.query("ALTER TABLE queue_token ADD COLUMN early_req_time DATETIME DEFAULT NULL");
            }
            if (!existing.includes("early_operator_message")) {
                await pool.query("ALTER TABLE queue_token ADD COLUMN early_operator_message VARCHAR(255) DEFAULT NULL");
            }
            if (!existing.includes("early_farmer_response")) {
                await pool.query("ALTER TABLE queue_token ADD COLUMN early_farmer_response VARCHAR(255) DEFAULT NULL");
            }
            if (!existing.includes("early_responded_at")) {
                await pool.query("ALTER TABLE queue_token ADD COLUMN early_responded_at DATETIME DEFAULT NULL");
            }
            await pool.query("DROP TABLE IF EXISTS early_call_request");
        } catch (alterErr) {
            console.warn("[Database] Notice on queue_token attributes:", alterErr.message);
        }

        // 5. Create or Replace Read Views for optimized multi-join reading
        await pool.query(`
            CREATE OR REPLACE VIEW vw_farmer_token_details AS
            SELECT 
                qt.token_id,
                qt.token_number,
                qt.queue_position,
                qt.status AS token_status,
                qt.service_date,
                qt.counter_id,
                qt.issued_at,
                qt.called_at,
                qt.arrival_time,
                qt.processing_start_time,
                qt.completion_time,
                qt.failed_at,
                qt.early_request_status,
                qt.early_req_time,
                qt.early_operator_message,
                qt.early_farmer_response,
                qt.early_responded_at,
                b.booking_id,
                b.farmer_id,
                b.session_id,
                b.booking_time,
                b.quantity_req,
                b.quantity_approved,
                b.status AS booking_status,
                f.name AS farmer_name,
                f.mobile_number AS farmer_mobile,
                c.crop_id,
                c.crop_name,
                c.crop_type,
                mc.counter_name,
                mc.counter_number,
                m.mandi_id,
                m.mandi_name,
                m.tehsil_id
            FROM queue_token qt
            JOIN booking b ON qt.booking_id = b.booking_id
            JOIN farmer f ON b.farmer_id = f.farmer_id
            JOIN crop c ON b.crop_id = c.crop_id
            JOIN mandi_counter mc ON qt.counter_id = mc.counter_id
            JOIN mandi m ON mc.mandi_id = m.mandi_id
        `);

        await pool.query(`
            CREATE OR REPLACE VIEW vw_farmer_booking_details AS
            SELECT 
                b.booking_id,
                b.farmer_id,
                b.crop_id,
                b.session_id,
                b.counter_id,
                b.quantity_req,
                b.quantity_approved,
                b.booking_time,
                b.status AS booking_status,
                b.created_at AS booking_created_at,
                f.name AS farmer_name,
                f.mobile_number AS farmer_mobile,
                c.crop_name,
                c.crop_type,
                ps.session_name,
                ps.start_date,
                ps.end_date,
                mc.counter_name,
                mc.counter_number,
                m.mandi_id,
                m.mandi_name,
                qt.token_id,
                qt.token_number,
                qt.queue_position,
                qt.status AS token_status,
                qt.service_date,
                qt.early_request_status,
                qt.early_req_time,
                p.payment_id,
                p.payment_status,
                p.total_payable_amount,
                p.payment_date
            FROM booking b
            JOIN farmer f ON b.farmer_id = f.farmer_id
            JOIN crop c ON b.crop_id = c.crop_id
            LEFT JOIN procurement_session ps ON b.session_id = ps.session_id
            LEFT JOIN mandi_counter mc ON b.counter_id = mc.counter_id
            LEFT JOIN mandi m ON mc.mandi_id = m.mandi_id
            LEFT JOIN queue_token qt ON b.booking_id = qt.booking_id
            LEFT JOIN payment p ON b.booking_id = p.booking_id
        `);

        await pool.query(`
            CREATE OR REPLACE VIEW vw_farmer_land_details AS
            SELECT 
                fl.land_id,
                fl.farmer_id,
                fl.area,
                fl.ownership_type,
                fl.land_type,
                fl.land_verification,
                fl.land_verified_at,
                fl.created_at,
                f.name AS farmer_name,
                f.mobile_number AS farmer_mobile,
                f.state_id,
                f.district_id,
                f.tehsil_id,
                s.state_name,
                d.district_name,
                t.tehsil_name
            FROM farmer_land fl
            JOIN farmer f ON fl.farmer_id = f.farmer_id
            LEFT JOIN state s ON f.state_id = s.state_id
            LEFT JOIN district d ON f.district_id = d.district_id
            LEFT JOIN tehsil t ON f.tehsil_id = t.tehsil_id
        `);

        console.log("[Database] Farmer DB tables, views, and events initialized successfully.");
    } catch (err) {
        console.error("[Database] Error in initFarmerDb:", err.message);
    }
}

module.exports = initFarmerDb;
