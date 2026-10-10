const { getWriteDatabase, initDatabaseRouter } = require("./databaserouter");

const VW_PAYMENT_DETAILS_SQL = `
CREATE OR REPLACE VIEW vw_payment_details AS
SELECT 
    p.payment_id,
    p.booking_id,
    p.farmer_id,
    p.mandi_id,
    p.crop_id,
    p.quantity_sold,
    p.rate_per_unit,
    p.total_payable_amount,
    p.payment_status,
    p.payment_date,
    p.created_at,
    p.updated_at,
    p.generated_by_user_id,

    -- Farmer Information
    f.name AS farmer_name,
    f.mobile_number AS farmer_mobile,
    f.email AS farmer_email,
    f.address AS farmer_address,
    f.state_id AS farmer_state_id,
    f.district_id AS farmer_district_id,
    f.tehsil_id AS farmer_tehsil_id,
    f.state_id AS state_id,
    f.district_id AS district_id,
    f.tehsil_id AS tehsil_id,
    f.aadhaar_lookup,
    f.aadhaar_verified,
    f.registration_date AS farmer_registration_date,
    f.status AS farmer_status,
    f.verification_status AS farmer_verification_status,
    fs.state_name AS farmer_state_name,
    fd.district_name AS farmer_district_name,
    ft.tehsil_name AS farmer_tehsil_name,

    -- Booking Information
    b.session_id,
    b.counter_id,
    b.quantity_req,
    b.quantity_approved,
    b.booking_time,
    b.status AS booking_status,
    b.created_at AS booking_created_at,

    -- Crop Information
    c.crop_name,
    c.crop_type,

    -- Mandi Details
    m.mandi_name,
    m.capacity AS mandi_capacity,
    m.tehsil_id AS mandi_tehsil_id,
    m.created_at AS mandi_created_at,
    ms.state_name AS mandi_state_name,
    md.district_name AS mandi_district_name,
    mt.tehsil_name AS mandi_tehsil_name,

    -- Mandi Counter Details
    mc.counter_number,
    mc.counter_name,
    mc.capacity_per_day AS counter_capacity_per_day,
    mc.status AS counter_status,
    mc.created_at AS counter_created_at,
    mcc.crop_name AS counter_supported_crop,

    -- Generating Mandi User Details
    mu.user_id AS counter_user_id,
    mud.full_name AS counter_user_name,
    mud.phone_number AS counter_user_phone,
    mud.email AS counter_user_email,
    mud.address AS counter_user_address

FROM payment p
JOIN farmer f ON p.farmer_id = f.farmer_id
JOIN state fs ON f.state_id = fs.state_id
LEFT JOIN district fd ON f.district_id = fd.district_id
LEFT JOIN tehsil ft ON f.tehsil_id = ft.tehsil_id
JOIN booking b ON p.booking_id = b.booking_id
JOIN crop c ON p.crop_id = c.crop_id
JOIN mandi m ON p.mandi_id = m.mandi_id
LEFT JOIN tehsil mt ON m.tehsil_id = mt.tehsil_id
LEFT JOIN district md ON mt.district_id = md.district_id
LEFT JOIN state ms ON md.state_id = ms.state_id
LEFT JOIN mandi_counter mc ON b.counter_id = mc.counter_id
LEFT JOIN crop mcc ON mc.crop_id = mcc.crop_id
LEFT JOIN mandi_users mu ON p.generated_by_user_id = mu.user_id
LEFT JOIN mandiuserdetails mud ON mu.user_id = mud.user_id;
`;

const VW_MANDI_COUNTER_USERS_SQL = `
CREATE OR REPLACE VIEW vw_mandi_counter_users AS
SELECT 
    mu.user_id AS user_id,
    mud.full_name AS full_name,
    mud.phone_number AS phone_number,
    mud.email AS email,
    mud.address AS address,
    muc.counter_id AS counter_id,
    mc.counter_number AS counter_number,
    mc.counter_name AS counter_name,
    mc.mandi_id AS mandi_id,
    m.mandi_name AS mandi_name,
    t.tehsil_id AS tehsil_id,
    t.tehsil_name AS tehsil_name,
    d.district_id AS district_id,
    d.district_name AS mandi_district_name,
    s.state_id AS state_id,
    s.state_name AS mandi_state_name
FROM mandi_users mu
LEFT JOIN mandiuserdetails mud ON mu.user_id = mud.user_id
JOIN mandi_user_counters muc ON mu.user_id = muc.user_id
JOIN mandi_counter mc ON muc.counter_id = mc.counter_id
JOIN mandi m ON mc.mandi_id = m.mandi_id
LEFT JOIN tehsil t ON m.tehsil_id = t.tehsil_id
LEFT JOIN district d ON t.district_id = d.district_id
LEFT JOIN state s ON d.state_id = s.state_id;
`;

/**
 * Ensures required Payment Portal tables and views exist on PRIMARY
 * and running SECONDARY MySQL databases serving reads.
 */
async function initializePaymentTables() {
    try {
        const primaryPool = getWriteDatabase().promise();

        const createProofTableSql = `
            CREATE TABLE IF NOT EXISTS payment_completion_proof (
                proof_id INT AUTO_INCREMENT PRIMARY KEY,
                payment_id INT NOT NULL,
                farmer_id INT NOT NULL,
                operator_id INT NOT NULL,
                screenshot LONGTEXT NOT NULL,
                completion_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                transaction_reference VARCHAR(100) NOT NULL,
                notes TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_payment_id (payment_id),
                INDEX idx_farmer_id (farmer_id),
                CONSTRAINT fk_proof_payment FOREIGN KEY (payment_id) REFERENCES payment (payment_id) ON DELETE CASCADE,
                CONSTRAINT fk_proof_farmer FOREIGN KEY (farmer_id) REFERENCES farmer (farmer_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await primaryPool.query(createProofTableSql);
        console.log("[DB Initializer] Verified 'payment_completion_proof' table on Primary DB.");

        // Gather all target databases serving reads and writes
        const routerInfo = initDatabaseRouter();
        const targets = [{ name: "Primary DB", pool: primaryPool }];

        if (routerInfo && Array.isArray(routerInfo.secondaries)) {
            for (const sec of routerInfo.secondaries) {
                if (sec.db && sec.status === "RUNNING") {
                    targets.push({ name: `${sec.name} DB`, pool: sec.db.promise() });
                }
            }
        }

        // Initialize views on write DB and all running read replica DBs
        for (const target of targets) {
            try {
                await target.pool.query(VW_PAYMENT_DETAILS_SQL);
                await target.pool.query(VW_MANDI_COUNTER_USERS_SQL);
                console.log(`[DB Initializer] Verified 'vw_payment_details' and 'vw_mandi_counter_users' views on ${target.name}.`);
            } catch (viewErr) {
                console.warn(`[DB Initializer Warning] Could not initialize views on ${target.name}:`, viewErr.message);
            }
        }
    } catch (err) {
        console.error("[DB Initializer Error] Failed to initialize payment tables/views:", err.message);
        throw err;
    }
}

module.exports = {
    initializePaymentTables,
    VW_PAYMENT_DETAILS_SQL,
    VW_MANDI_COUNTER_USERS_SQL
};
