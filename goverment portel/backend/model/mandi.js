const { getWriteDatabase } = require("../services/databaserouter");

async function initializeDatabase() {
    try {
        const db = getWriteDatabase().promise();

        await db.query(`
            CREATE TABLE IF NOT EXISTS mandi (
                mandi_id INT AUTO_INCREMENT PRIMARY KEY,
                mandi_name VARCHAR(100) NOT NULL,

                tehsil_id INT NOT NULL,

                capacity DECIMAL(12,2) NOT NULL,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Foreign Keys
                CONSTRAINT fk_mandi_tehsil
                    FOREIGN KEY (tehsil_id)
                    REFERENCES tehsil(tehsil_id)
                    ON DELETE RESTRICT
                    ON UPDATE CASCADE,

                CONSTRAINT uq_mandi_name_tehsil
                    UNIQUE (mandi_name, tehsil_id),
                -- Indexes for faster queries
                INDEX idx_mandi_tehsil (tehsil_id)
            ) AUTO_INCREMENT = 1000;
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS mandi_counter (
                counter_id INT AUTO_INCREMENT PRIMARY KEY,

                mandi_id INT NOT NULL,
                counter_number INT NOT NULL,
                counter_name VARCHAR(100) NOT NULL,

                crop_id INT NOT NULL,

                capacity_per_day DECIMAL(12,2) NOT NULL,

                status ENUM(
                    'active',
                    'inactive'
                ) DEFAULT 'active',

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Foreign Keys
                CONSTRAINT fk_counter_mandi
                    FOREIGN KEY (mandi_id)
                    REFERENCES mandi(mandi_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,

                CONSTRAINT fk_counter_crop
                    FOREIGN KEY (crop_id)
                    REFERENCES crop(crop_id)
                    ON DELETE RESTRICT
                    ON UPDATE CASCADE,

                -- Indexes
                INDEX idx_counter_mandi (mandi_id),
                INDEX idx_counter_crop (crop_id),

                -- Counter number should be unique within a mandi
                UNIQUE (mandi_id, counter_number)
            ) AUTO_INCREMENT = 1000;
        `);

    } catch (error) {
    }
}

module.exports = initializeDatabase;