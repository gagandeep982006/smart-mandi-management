const { getWriteDatabase } = require("../services/databaserouter");

async function initializeCrop() {
    try {
        const db = getWriteDatabase().promise();

        await db.query(`
            CREATE TABLE IF NOT EXISTS crop (
                crop_id INT AUTO_INCREMENT PRIMARY KEY,

                crop_name VARCHAR(100) NOT NULL,

                crop_type ENUM(
                    'rabi',
                    'kharif',
                    'zaid'
                ) NOT NULL,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                UNIQUE (crop_name, crop_type)
            ) AUTO_INCREMENT = 1000;
        `);

    } catch (error) {
    }
}

module.exports = initializeCrop;