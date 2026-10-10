const { getWriteDatabase } = require("../services/databaserouter");

async function initializeProcurementSession() {
    try {
        const db = getWriteDatabase().promise();

        await db.query(`
            CREATE TABLE IF NOT EXISTS procurement_session (
                session_id INT AUTO_INCREMENT PRIMARY KEY,

                session_name VARCHAR(150) NOT NULL,

                start_date DATE NOT NULL,

                end_date DATE NOT NULL,

                crop_id INT NOT NULL,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT fk_procurement_session_crop
                    FOREIGN KEY (crop_id)
                    REFERENCES crop(crop_id)
                    ON DELETE RESTRICT
                    ON UPDATE CASCADE,

                INDEX idx_procurement_session_crop (crop_id)
            ) AUTO_INCREMENT = 1000;
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS procurement_quota (
                quota_id INT AUTO_INCREMENT PRIMARY KEY,

                state_id INT NOT NULL,

                crop_id INT NOT NULL,

                amount DECIMAL(12,2) NOT NULL,
                lsp DECIMAL(12,2) NOT NULL,
                msp DECIMAL(12,2) NOT NULL,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT fk_quota_state
                    FOREIGN KEY (state_id)
                    REFERENCES state(state_id)
                    ON DELETE RESTRICT
                    ON UPDATE CASCADE,

                CONSTRAINT fk_quota_crop
                    FOREIGN KEY (crop_id)
                    REFERENCES crop(crop_id)
                    ON DELETE RESTRICT
                    ON UPDATE CASCADE,

                INDEX idx_quota_state (state_id),
                INDEX idx_quota_crop (crop_id),

                UNIQUE (state_id, crop_id)
            ) AUTO_INCREMENT = 1000;
        `);

    } catch (error) {
    }
}

module.exports = initializeProcurementSession;