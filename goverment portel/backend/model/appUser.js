const { getWriteDatabase } = require("../services/databaserouter");

async function initializeAppUsers() {
    try {
        const db = getWriteDatabase().promise();

        await db.query(`
            CREATE TABLE IF NOT EXISTS app_users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                role VARCHAR(50) NOT NULL DEFAULT 'user',
                permissions TEXT NOT NULL,
                state_id INT NULL,
                district_id INT NULL,
                tehsil_id INT NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT fk_app_user_state
                    FOREIGN KEY (state_id)
                    REFERENCES state(state_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,

                CONSTRAINT fk_app_user_district
                    FOREIGN KEY (district_id)
                    REFERENCES district(district_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,

                CONSTRAINT fk_app_user_tehsil
                    FOREIGN KEY (tehsil_id)
                    REFERENCES tehsil(tehsil_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            ) AUTO_INCREMENT = 1000;
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS userdetails (
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
                CONSTRAINT fk_userdetails_app_users
                    FOREIGN KEY (user_id)
                    REFERENCES app_users(user_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            );
        `);

        // Enforce that userdetails can ONLY be deleted when the parent app_users record is deleted
        await db.query(`DROP TRIGGER IF EXISTS prevent_direct_delete_userdetails`);
        await db.query(`
            CREATE TRIGGER prevent_direct_delete_userdetails
            BEFORE DELETE ON userdetails
            FOR EACH ROW
            BEGIN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Direct deletion of userdetails is prohibited. Details are deleted only when the user account is deleted.';
            END;
        `);

        // Ensure schema compatibility for pre-existing tables
        try {
            const [roleCols] = await db.query("SHOW COLUMNS FROM app_users LIKE 'role'");
            if (roleCols.length === 0) {
                await db.query("ALTER TABLE app_users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user' AFTER username");
            }
        } catch (e) {
            console.error("Migration error adding role column:", e.message);
        }

        try {
            await db.query("ALTER TABLE app_users MODIFY COLUMN permissions TEXT NOT NULL");
        } catch (e) {
            console.error("Migration error altering permissions column:", e.message);
        }

    } catch (error) {
        console.error("Initialize app_users table error:", error);
    }
}

module.exports = initializeAppUsers;
