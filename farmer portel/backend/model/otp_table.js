const { getWriteDatabase } =
    require("../database/databaserouter");


async function initializeDatabase() {

    try {

        const db = getWriteDatabase().promise();


        await db.query(`
            CREATE TABLE IF NOT EXISTS farmer_login_otp (
                otp_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                farmer_id INT NOT NULL,
                otp_hash VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                attempts INT NOT NULL DEFAULT 0,
                verified BOOLEAN NOT NULL DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT fk_farmer_login_otp_farmer
                    FOREIGN KEY (farmer_id)
                    REFERENCES farmer(farmer_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,

                INDEX idx_farmer_login_otp_farmer (farmer_id),
                INDEX idx_farmer_login_otp_lookup (
                    farmer_id,
                    verified,
                    created_at
                ),
                INDEX idx_farmer_login_otp_expiry (expires_at)
            ) ENGINE=InnoDB;
        `);
        await db.query(`
            CREATE EVENT IF NOT EXISTS delete_expired_farmer_otps
            ON SCHEDULE EVERY 1 MINUTE
            DO
                DELETE FROM farmer_login_otp
                WHERE expires_at <= NOW(); 
        `);
    }

    catch (error) {
        throw error;
    }

}


module.exports = initializeDatabase;