const { getWriteDatabase } = require("../services/databaserouter");

async function initializeDatabase() {
    try {
        const db = getWriteDatabase().promise();

        // ============================================
        // MANDI USERS
        // ============================================
        await db.query(`
            CREATE TABLE IF NOT EXISTS mandi_users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,

                username VARCHAR(100) NOT NULL UNIQUE,

                role VARCHAR(50) NOT NULL DEFAULT 'user',
                permissions TEXT NOT NULL,

                mandi_id INT NOT NULL,

                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT fk_mandi_user_mandi_id
                    FOREIGN KEY (mandi_id)
                    REFERENCES mandi(mandi_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE

            ) AUTO_INCREMENT = 1000;
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS mandi_user_counters (
                user_id INT NOT NULL,
                counter_id INT NOT NULL,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                PRIMARY KEY (user_id, counter_id),

                CONSTRAINT fk_muc_user
                    FOREIGN KEY (user_id)
                    REFERENCES mandi_users(user_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,

                CONSTRAINT fk_muc_counter
                    FOREIGN KEY (counter_id)
                    REFERENCES mandi_counter(counter_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE

            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS mandiuserdetails (
                detail_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                full_name VARCHAR(150) NOT NULL,
                phone_number VARCHAR(15) NOT NULL UNIQUE,
                email VARCHAR(255) NULL,
                address TEXT NULL,
                aadhaar_lookup VARCHAR(64) NULL UNIQUE,
                aadhaar_hash VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_mandiuserdetails_mandi_users
                    FOREIGN KEY (user_id)
                    REFERENCES mandi_users(user_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            );
        `);

        // Enforce that mandiuserdetails can ONLY be deleted when the parent mandi_users record is deleted
        await db.query(`DROP TRIGGER IF EXISTS prevent_direct_delete_mandiuserdetails`);
        await db.query(`
            CREATE TRIGGER prevent_direct_delete_mandiuserdetails
            BEFORE DELETE ON mandiuserdetails
            FOR EACH ROW
            BEGIN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Direct deletion of mandiuserdetails is prohibited. Details are deleted only when the Mandi user is deleted.';
            END;
        `);

    } catch (error) {
        throw error;
    }
}

module.exports = initializeDatabase;