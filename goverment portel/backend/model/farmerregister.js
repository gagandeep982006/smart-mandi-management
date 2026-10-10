const { getWriteDatabase } = require("../services/databaserouter");

async function initializeDatabase() {
    try {
        const db = getWriteDatabase().promise();

        await db.query(`
            CREATE TABLE IF NOT EXISTS farmer (
                farmer_id INT AUTO_INCREMENT PRIMARY KEY,

                name VARCHAR(100) NOT NULL,
                mobile_number VARCHAR(15) NOT NULL UNIQUE,
                email VARCHAR(255) UNIQUE,
                address VARCHAR(255),

                state_id INT NOT NULL,
                district_id INT NOT NULL,
                tehsil_id INT NOT NULL,

                aadhaar_hash VARCHAR(255) NOT NULL,
                aadhaar_lookup VARCHAR(64) NOT NULL UNIQUE,
                aadhaar_verified BOOLEAN DEFAULT FALSE,
                aadhaar_verified_at TIMESTAMP NULL,

                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                status ENUM(
                    'active',
                    'inactive',
                    'suspended'
                ) DEFAULT 'active',

                verification_status BOOLEAN DEFAULT FALSE,

                mobile_verified BOOLEAN DEFAULT FALSE,
                mobile_verified_at TIMESTAMP NULL,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Foreign Keys
                CONSTRAINT fk_farmer_state
                    FOREIGN KEY (state_id)
                    REFERENCES state(state_id)
                    ON DELETE RESTRICT
                    ON UPDATE CASCADE,

                CONSTRAINT fk_farmer_district
                    FOREIGN KEY (district_id)
                    REFERENCES district(district_id)
                    ON DELETE RESTRICT
                    ON UPDATE CASCADE,

                CONSTRAINT fk_farmer_tehsil
                    FOREIGN KEY (tehsil_id)
                    REFERENCES tehsil(tehsil_id)
                    ON DELETE RESTRICT
                    ON UPDATE CASCADE,

                -- Indexes for faster queries
                INDEX idx_farmer_state (state_id),
                INDEX idx_farmer_district (district_id),
                INDEX idx_farmer_tehsil (tehsil_id)
            ) AUTO_INCREMENT = 1000;
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS bank_account (
                account_id INT AUTO_INCREMENT PRIMARY KEY,

                farmer_id INT NOT NULL UNIQUE,

                bank_name VARCHAR(100) NOT NULL,
                account_number VARCHAR(50) NOT NULL,
                ifsc_code VARCHAR(11) NOT NULL,

                verification_status BOOLEAN DEFAULT FALSE,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Foreign Key
                CONSTRAINT fk_bank_account_farmer
                    FOREIGN KEY (farmer_id)
                    REFERENCES farmer(farmer_id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,

                -- Index
                INDEX idx_bank_account_farmer (farmer_id)
            ) AUTO_INCREMENT = 1000;
        `);
        
    } catch (error) {

    }
}

module.exports = initializeDatabase;