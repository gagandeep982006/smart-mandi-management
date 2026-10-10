const { getWriteDatabase } = require("../services/databaserouter");

async function initializePaymentUserDatabase() {
    try {
        const db = getWriteDatabase().promise();

        // 1. Create dedicated payment_users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS payment_users (
                payment_user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                role VARCHAR(50) NOT NULL DEFAULT 'payment_officer',
                permissions TEXT NOT NULL,
                state_id INT NOT NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_payment_users_state
                    FOREIGN KEY (state_id)
                    REFERENCES state(state_id)
                    ON DELETE RESTRICT
                    ON UPDATE CASCADE
            ) AUTO_INCREMENT = 1000;
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS paymentuserdetails (
                detail_id INT AUTO_INCREMENT PRIMARY KEY,
                payment_user_id INT NOT NULL UNIQUE,
                full_name VARCHAR(150) NOT NULL,
                phone_number VARCHAR(15) NOT NULL UNIQUE,
                email VARCHAR(255) NULL,
                address TEXT NULL,
                aadhaar_lookup VARCHAR(64) NULL UNIQUE,
                aadhaar_hash VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_paymentuserdetails_payment_users
                    FOREIGN KEY (payment_user_id)
                    REFERENCES payment_users(payment_user_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            );
        `);

        // Enforce that paymentuserdetails can ONLY be deleted when the parent payment_users record is deleted
        await db.query(`DROP TRIGGER IF EXISTS prevent_direct_delete_paymentuserdetails`);
        await db.query(`
            CREATE TRIGGER prevent_direct_delete_paymentuserdetails
            BEFORE DELETE ON paymentuserdetails
            FOR EACH ROW
            BEGIN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Direct deletion of paymentuserdetails is prohibited. Details are deleted only when Payment user is deleted.';
            END;
        `);

        // 2. Create view vw_payment_users
        await db.query(`
            CREATE OR REPLACE VIEW vw_payment_users AS
            SELECT 
                pu.payment_user_id,
                pu.payment_user_id AS user_id,
                pu.username,
                pu.role,
                pu.permissions,
                pu.state_id,
                s.state_name AS state,
                s.state_code,
                pu.status,
                pu.created_at,
                pu.updated_at
            FROM payment_users pu
            JOIN state s ON pu.state_id = s.state_id;
        `);
    } catch (error) {
        console.error("Payment user database initialization error:", error);
        throw error;
    }
}

module.exports = initializePaymentUserDatabase;
