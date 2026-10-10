const { getWriteDatabase } = require("../services/databaserouter");

async function initializeFarmerLand() {
    try {
        const db = getWriteDatabase().promise();

        await db.query(`
            CREATE TABLE IF NOT EXISTS farmer_land (
                land_id INT AUTO_INCREMENT PRIMARY KEY,

                farmer_id INT NOT NULL,

                area DECIMAL(12,2) NOT NULL,

                ownership_type ENUM(
                    'owned',
                    'leased',
                    'shared'
                ) NOT NULL,

                land_type ENUM(
                    'agricultural',
                    'irrigated',
                    'non_irrigated'
                ) NOT NULL,

                land_verification ENUM(
                    'pending',
                    'verified',
                    'rejected'
                ) NOT NULL DEFAULT 'pending',

                land_verified_at TIMESTAMP NULL,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT fk_farmer_land_farmer
                    FOREIGN KEY (farmer_id)
                    REFERENCES farmer(farmer_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,

                INDEX idx_farmer_land_farmer (farmer_id)

            ) AUTO_INCREMENT = 1000;
        `);


    } catch (error) {

    }
}

module.exports = initializeFarmerLand;