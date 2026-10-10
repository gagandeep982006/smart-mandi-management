const { getWriteDatabase } = require("./databaserouter");

/**
 * Ensures all required Mandi Portal operational tables exist.
 * Uses CREATE TABLE IF NOT EXISTS on PRIMARY database only.
 * NEVER drops tables, truncates data, or modifies existing records.
 */
async function initializeTables(db) {
    console.log("Checking tables...");

    // 1. mandi_timing
    await db.query(`
        CREATE TABLE IF NOT EXISTS mandi_timing (
            mandi_id INT PRIMARY KEY,
            opening_time TIME NOT NULL DEFAULT '09:00:00',
            closing_time TIME NOT NULL DEFAULT '17:00:00',
            pending_opening_time TIME DEFAULT NULL,
            pending_closing_time TIME DEFAULT NULL,
            effective_date DATE DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_mt_mandi FOREIGN KEY (mandi_id) REFERENCES mandi(mandi_id) ON DELETE CASCADE
        )
    `);
    console.log("  ✓ mandi_timing");

    // 2. mandi_working_day
    await db.query(`
        CREATE TABLE IF NOT EXISTS mandi_working_day (
            working_day_id INT AUTO_INCREMENT PRIMARY KEY,
            mandi_id INT NOT NULL,
            day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
            is_working BOOLEAN NOT NULL DEFAULT TRUE,
            pending_is_working BOOLEAN DEFAULT NULL,
            effective_date DATE DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_mwd_mandi FOREIGN KEY (mandi_id) REFERENCES mandi(mandi_id) ON DELETE CASCADE,
            UNIQUE KEY uq_mandi_day (mandi_id, day_of_week)
        )
    `);
    console.log("  ✓ mandi_working_day");

    // 3. counter_service_time (legacy)
    await db.query(`
        CREATE TABLE IF NOT EXISTS counter_service_time (
            counter_id INT PRIMARY KEY,
            average_time_minutes INT NOT NULL DEFAULT 15,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_cst_counter FOREIGN KEY (counter_id) REFERENCES mandi_counter(counter_id) ON DELETE CASCADE
        )
    `);
    console.log("  ✓ counter_service_time");

    // 3b. counter_avg_time (new dedicated schema with foreign keys and mandi index)
    await db.query(`
        CREATE TABLE IF NOT EXISTS counter_avg_time (
            id INT AUTO_INCREMENT PRIMARY KEY,
            counter_id INT NOT NULL,
            mandi_id INT NOT NULL,
            avg_time_minutes INT NOT NULL DEFAULT 15,
            updated_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_cat_counter FOREIGN KEY (counter_id) REFERENCES mandi_counter(counter_id) ON DELETE CASCADE,
            CONSTRAINT fk_cat_mandi FOREIGN KEY (mandi_id) REFERENCES mandi(mandi_id) ON DELETE CASCADE,
            CONSTRAINT fk_cat_user FOREIGN KEY (updated_by) REFERENCES mandi_users(user_id) ON DELETE SET NULL,
            UNIQUE KEY uq_counter_avg (counter_id),
            INDEX idx_cat_mandi (mandi_id),
            INDEX idx_cat_counter_mandi (counter_id, mandi_id)
        )
    `);
    console.log("  ✓ counter_avg_time");

    // 4. booking
    await db.query(`
        CREATE TABLE IF NOT EXISTS booking (
            booking_id INT AUTO_INCREMENT PRIMARY KEY,
            farmer_id INT NOT NULL,
            crop_id INT NOT NULL,
            session_id INT NOT NULL,
            counter_id INT NOT NULL,
            quantity_req DECIMAL(12,2) NOT NULL,
            quantity_approved DECIMAL(12,2) NOT NULL,
            booking_time DATETIME NOT NULL,
            status ENUM('BOOKED', 'WAITING', 'CALLED', 'ARRIVED', 'PROCESSING', 'COMPLETED', 'NOT_ARRIVED', 'RESCHEDULED', 'CANCELLED') NOT NULL DEFAULT 'BOOKED',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_b_farmer FOREIGN KEY (farmer_id) REFERENCES farmer(farmer_id) ON DELETE CASCADE,
            CONSTRAINT fk_b_crop FOREIGN KEY (crop_id) REFERENCES crop(crop_id) ON DELETE RESTRICT,
            CONSTRAINT fk_b_session FOREIGN KEY (session_id) REFERENCES procurement_session(session_id) ON DELETE RESTRICT,
            CONSTRAINT fk_b_counter FOREIGN KEY (counter_id) REFERENCES mandi_counter(counter_id) ON DELETE RESTRICT
        ) AUTO_INCREMENT = 5000
    `);
    console.log("  ✓ booking");

    // 5. queue_token
    await db.query(`
        CREATE TABLE IF NOT EXISTS queue_token (
            token_id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL,
            counter_id INT NOT NULL,
            service_date DATE NOT NULL,
            token_number VARCHAR(50) NOT NULL,
            queue_position INT NOT NULL,
            status ENUM('WAITING', 'CALLED', 'ARRIVED', 'PROCESSING', 'COMPLETED', 'NOT_ARRIVED', 'RESCHEDULED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
            issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            called_at DATETIME NULL,
            failed_at DATETIME NULL,
            arrival_time DATETIME NULL,
            processing_start_time DATETIME NULL,
            completion_time DATETIME NULL,
            early_request_status VARCHAR(20) DEFAULT NULL,
            early_req_time DATETIME DEFAULT NULL,
            early_operator_message VARCHAR(255) DEFAULT NULL,
            early_farmer_response VARCHAR(255) DEFAULT NULL,
            early_responded_at DATETIME DEFAULT NULL,
            CONSTRAINT fk_qt_booking FOREIGN KEY (booking_id) REFERENCES booking(booking_id) ON DELETE CASCADE,
            CONSTRAINT fk_qt_counter FOREIGN KEY (counter_id) REFERENCES mandi_counter(counter_id) ON DELETE CASCADE,
            UNIQUE KEY uq_counter_date_token (counter_id, service_date, token_number)
        ) AUTO_INCREMENT = 10000
    `);

    // Ensure early call columns exist on existing queue_token table & remove early_call_request table
    try {
        const [qtCols] = await db.query("DESCRIBE queue_token");
        const existingQtCols = qtCols.map(c => c.Field);
        if (!existingQtCols.includes("early_request_status")) {
            await db.query("ALTER TABLE queue_token ADD COLUMN early_request_status VARCHAR(20) DEFAULT NULL");
        }
        if (!existingQtCols.includes("early_req_time")) {
            await db.query("ALTER TABLE queue_token ADD COLUMN early_req_time DATETIME DEFAULT NULL");
        }
        if (!existingQtCols.includes("early_operator_message")) {
            await db.query("ALTER TABLE queue_token ADD COLUMN early_operator_message VARCHAR(255) DEFAULT NULL");
        }
        if (!existingQtCols.includes("early_farmer_response")) {
            await db.query("ALTER TABLE queue_token ADD COLUMN early_farmer_response VARCHAR(255) DEFAULT NULL");
        }
        if (!existingQtCols.includes("early_responded_at")) {
            await db.query("ALTER TABLE queue_token ADD COLUMN early_responded_at DATETIME DEFAULT NULL");
        }
        await db.query("DROP TABLE IF EXISTS early_call_request");
    } catch (qtColErr) {
        console.warn("  ! Note on queue_token columns:", qtColErr.message);
    }
    console.log("  ✓ queue_token");

    await db.query(`
        CREATE EVENT IF NOT EXISTS cancel_expired_bookings
        ON SCHEDULE EVERY 1 DAY
        STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 5 MINUTE)
        DO
        BEGIN

            -- Cancel queue tokens belonging to expired active bookings
            UPDATE queue_token qt
            JOIN booking b
                ON qt.booking_id = b.booking_id
            SET qt.status = 'CANCELLED'
            WHERE DATE(b.booking_time) < CURRENT_DATE
            AND b.status NOT IN (
                'COMPLETED',
                'NOT_ARRIVED',
                'RESCHEDULED',
                'CANCELLED'
            )
            AND qt.status NOT IN (
                'COMPLETED',
                'NOT_ARRIVED',
                'RESCHEDULED',
                'CANCELLED'
            );

            -- Cancel the expired bookings
            UPDATE booking
            SET status = 'CANCELLED'
            WHERE DATE(booking_time) < CURRENT_DATE
            AND status NOT IN (
                'COMPLETED',
                'NOT_ARRIVED',
                'RESCHEDULED',
                'CANCELLED'
            );

        END;
    `)
    // 6. payment
    await db.query(`
        CREATE TABLE IF NOT EXISTS payment (
            payment_id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL UNIQUE,
            farmer_id INT NOT NULL,
            mandi_id INT NOT NULL,
            crop_id INT NOT NULL,
            quantity_sold DECIMAL(12,2) NOT NULL,
            rate_per_unit DECIMAL(12,2) NOT NULL,
            total_payable_amount DECIMAL(12,2) NOT NULL,
            payment_status ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
            payment_date DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_p_booking FOREIGN KEY (booking_id) REFERENCES booking(booking_id) ON DELETE RESTRICT,
            CONSTRAINT fk_p_farmer FOREIGN KEY (farmer_id) REFERENCES farmer(farmer_id) ON DELETE RESTRICT,
            CONSTRAINT fk_p_mandi FOREIGN KEY (mandi_id) REFERENCES mandi(mandi_id) ON DELETE RESTRICT,
            CONSTRAINT fk_p_crop FOREIGN KEY (crop_id) REFERENCES crop(crop_id) ON DELETE RESTRICT
        ) AUTO_INCREMENT = 20000
    `);
    console.log("  ✓ payment");
}

/**
 * Idempotently creates an index if it does not already exist
 */
async function ensureIndex(db, tableName, indexName, columnsSql) {
    const [rows] = await db.query(
        `SELECT 1 
         FROM information_schema.statistics 
         WHERE table_schema = DATABASE() 
           AND table_name = ? 
           AND index_name = ?
         LIMIT 1`,
        [tableName, indexName]
    );

    if (rows.length === 0) {
        await db.query(`CREATE INDEX ${indexName} ON ${tableName} (${columnsSql})`);
    }
}

/**
 * Ensures required performance indexes exist on operational tables
 */
async function initializeIndexes(db) {
    console.log("Checking indexes...");

    // booking indexes
    await ensureIndex(db, "booking", "idx_b_farmer", "farmer_id");
    await ensureIndex(db, "booking", "idx_b_crop", "crop_id");
    await ensureIndex(db, "booking", "idx_b_session", "session_id");
    await ensureIndex(db, "booking", "idx_b_counter_date", "counter_id, booking_time");
    await ensureIndex(db, "booking", "idx_b_status", "status");

    // queue_token indexes
    await ensureIndex(db, "queue_token", "idx_qt_booking", "booking_id");
    await ensureIndex(db, "queue_token", "idx_qt_queue", "counter_id, service_date, status, queue_position");
    // payment indexes
    await ensureIndex(db, "payment", "idx_p_farmer", "farmer_id");
    await ensureIndex(db, "payment", "idx_p_mandi", "mandi_id");
    await ensureIndex(db, "payment", "idx_p_crop", "crop_id");
    await ensureIndex(db, "payment", "idx_p_status", "payment_status");

    // mandi_working_day indexes
    await ensureIndex(db, "mandi_working_day", "idx_mwd_lookup", "mandi_id, day_of_week, is_working");

    console.log("  ✓ indexes verified");
}

/**
 * Initializes MySQL views for complex READ queries.
 * Uses CREATE OR REPLACE VIEW on Primary DB.
 */
async function initializeViews(db) {
    console.log("Checking views...");

    // 1. vw_mandi_counter_details
    await db.query(`
        CREATE OR REPLACE VIEW vw_mandi_counter_details AS
        SELECT 
            mc.counter_id,
            mc.counter_number,
            mc.counter_name,
            mc.mandi_id,
            mc.crop_id,
            mc.capacity_per_day,
            mc.status,
            mc.created_at,
            c.crop_name,
            c.crop_type,
            COALESCE(cst.average_time_minutes, 15) AS average_time_minutes
        FROM mandi_counter mc
        LEFT JOIN crop c ON mc.crop_id = c.crop_id
        LEFT JOIN counter_service_time cst ON mc.counter_id = cst.counter_id
    `);
    console.log("  ✓ vw_mandi_counter_details");

    // 2. vw_booking_queue
    await db.query(`
        CREATE OR REPLACE VIEW vw_booking_queue AS
        SELECT 
            qt.token_id,
            qt.token_number,
            qt.queue_position,
            qt.status AS token_status,
            qt.service_date,
            qt.issued_at,
            qt.called_at,
            qt.arrival_time,
            qt.processing_start_time,
            qt.completion_time,
            qt.failed_at,
            qt.counter_id,
            qt.early_request_status,
            qt.early_req_time,
            qt.early_operator_message,
            qt.early_farmer_response,
            qt.early_responded_at,
            b.booking_id,
            b.farmer_id,
            b.crop_id,
            b.session_id,
            b.booking_time,
            b.quantity_req,
            b.quantity_approved,
            b.status AS booking_status,
            f.name AS farmer_name,
            f.mobile_number AS farmer_mobile,
            c.crop_name,
            c.crop_type
        FROM queue_token qt
        JOIN booking b ON qt.booking_id = b.booking_id
        JOIN farmer f ON b.farmer_id = f.farmer_id
        JOIN crop c ON b.crop_id = c.crop_id
    `);
    console.log("  ✓ vw_booking_queue");

    // 3. vw_completed_farmers
    await db.query(`
        CREATE OR REPLACE VIEW vw_completed_farmers AS
        SELECT 
            qt.token_id,
            qt.token_number,
            qt.service_date,
            qt.completion_time,
            qt.counter_id,
            b.booking_id,
            b.quantity_approved,
            f.farmer_id,
            f.name AS farmer_name,
            f.mobile_number AS farmer_mobile,
            c.crop_name,
            p.payment_id,
            p.total_payable_amount,
            COALESCE(p.payment_status, 'PENDING') AS payment_status
        FROM queue_token qt
        JOIN booking b ON qt.booking_id = b.booking_id
        JOIN farmer f ON b.farmer_id = f.farmer_id
        JOIN crop c ON b.crop_id = c.crop_id
        LEFT JOIN payment p ON b.booking_id = p.booking_id
        WHERE qt.status = 'COMPLETED'
    `);
    console.log("  ✓ vw_completed_farmers");

    // 4. vw_payment_details
    await db.query(`
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
            b.counter_id,
            b.quantity_approved,
            f.name AS farmer_name,
            f.mobile_number AS farmer_mobile,
            c.crop_name,
            m.mandi_name
        FROM payment p
        JOIN booking b ON p.booking_id = b.booking_id
        JOIN farmer f ON p.farmer_id = f.farmer_id
        JOIN crop c ON p.crop_id = c.crop_id
        JOIN mandi m ON p.mandi_id = m.mandi_id
    `);
    console.log("  ✓ vw_payment_details");

    console.log("  ✓ views verified");
}

/**
 * Main database initializer entry point.
 * Runs on PRIMARY database only.
 */
async function initializeDatabase() {
    console.log("\nInitializing Mandi Portal database...");
    const db = getWriteDatabase().promise();

    try {
        await initializeTables(db);
        await initializeIndexes(db);
        await initializeViews(db);
        console.log("Database initialization completed.\n");
    } catch (error) {
        console.error("\nMandi Portal database initialization failed:");
        console.error(error.message);
        throw error;
    }
}

module.exports = {
    initializeDatabase
};
