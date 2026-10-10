const { getWriteDatabase } = require("../services/databaserouter");

async function initializeViews() {
    try {
        const db = getWriteDatabase().promise();

        // 1. vw_app_users: User management read view (NO password_hash)
        await db.query(`
            CREATE OR REPLACE VIEW vw_app_users AS
            SELECT
                au.user_id,
                au.username,
                au.role,
                au.permissions,
                au.state_id,
                au.district_id,
                au.tehsil_id,
                s.state_name AS state,
                d.district_name AS district,
                t.tehsil_name AS tehsil,
                au.status,
                au.created_at
            FROM app_users au
            LEFT JOIN state s ON au.state_id = s.state_id
            LEFT JOIN district d ON au.district_id = d.district_id
            LEFT JOIN tehsil t ON au.tehsil_id = t.tehsil_id
        `);

        // 2. vw_farmers: Farmer & Bank details read view (NO aadhaar_hash, NO aadhaar_lookup)
        await db.query(`
            CREATE OR REPLACE VIEW vw_farmers AS
            SELECT
                f.farmer_id,
                f.name,
                f.mobile_number,
                f.email,
                f.address,
                f.state_id,
                f.district_id,
                f.tehsil_id,
                f.aadhaar_verified,
                f.aadhaar_verified_at,
                f.registration_date,
                f.status,
                f.verification_status,
                f.mobile_verified,
                f.mobile_verified_at,
                f.created_at,
                b.account_id,
                b.bank_name,
                b.account_number,
                b.ifsc_code,
                b.verification_status AS bank_verification_status
            FROM farmer f
            LEFT JOIN bank_account b ON f.farmer_id = b.farmer_id
        `);

        // 3. vw_mandis: Mandi read view with location details and computed status
        await db.query(`
            CREATE OR REPLACE VIEW vw_mandis AS
            SELECT
                m.mandi_id,
                m.mandi_name,
                m.tehsil_id,
                t.tehsil_name,
                d.district_id,
                d.district_name,
                s.state_id,
                s.state_name,
                m.capacity,
                m.created_at,
                CASE
                    WHEN COUNT(mc.counter_id) = 0
                        OR SUM(mc.status = 'active') = 0
                    THEN 'inactive'
                    ELSE 'active'
                END AS status
            FROM mandi m
            JOIN tehsil t ON m.tehsil_id = t.tehsil_id
            JOIN district d ON t.district_id = d.district_id
            JOIN state s ON d.state_id = s.state_id
            LEFT JOIN mandi_counter mc ON m.mandi_id = mc.mandi_id
            GROUP BY
                m.mandi_id,
                m.mandi_name,
                m.tehsil_id,
                t.tehsil_name,
                d.district_id,
                d.district_name,
                s.state_id,
                s.state_name,
                m.capacity,
                m.created_at
        `);

        // 4. vw_mandi_counters: Mandi counter read view with mandi and location scope
        await db.query(`
            CREATE OR REPLACE VIEW vw_mandi_counters AS
            SELECT
                mc.counter_id,
                mc.mandi_id,
                m.mandi_name,
                mc.counter_number,
                mc.counter_name,
                mc.crop_id,
                c.crop_name,
                mc.capacity_per_day,
                mc.status,
                mc.created_at,
                m.tehsil_id,
                t.district_id,
                d.state_id
            FROM mandi_counter mc
            JOIN mandi m ON mc.mandi_id = m.mandi_id
            JOIN tehsil t ON m.tehsil_id = t.tehsil_id
            JOIN district d ON t.district_id = d.district_id
            LEFT JOIN crop c ON mc.crop_id = c.crop_id
        `);

        // 5. vw_procurement_sessions: Procurement session read view joined with crop
        await db.query(`
            CREATE OR REPLACE VIEW vw_procurement_sessions AS
            SELECT
                ps.session_id,
                ps.session_name,
                ps.crop_id,
                c.crop_name,
                ps.start_date,
                ps.end_date,
                ps.created_at
            FROM procurement_session ps
            JOIN crop c ON ps.crop_id = c.crop_id
        `);

        // 6. vw_procurement_quota: Procurement quota read view with state and crop names
        await db.query(`
            CREATE OR REPLACE VIEW vw_procurement_quota AS
            SELECT
                pq.quota_id,
                pq.state_id,
                s.state_name,
                pq.crop_id,
                c.crop_name,
                pq.amount,
                pq.lsp,
                pq.msp,
                pq.created_at
            FROM procurement_quota pq
            JOIN state s ON pq.state_id = s.state_id
            JOIN crop c ON pq.crop_id = c.crop_id
        `);

        console.log("MySQL Views initialized successfully");
    } catch (error) {
        console.error("Initialize MySQL Views error:", error);
    }
}

module.exports = initializeViews;
