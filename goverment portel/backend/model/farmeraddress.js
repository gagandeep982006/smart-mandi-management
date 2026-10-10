const { getWriteDatabase } =
    require("../services/databaserouter");


async function initializeDatabase() {

    try {

        const db = getWriteDatabase().promise();


        // =========================
        // STATE TABLE
        // =========================

        await db.query(`
            CREATE TABLE IF NOT EXISTS state (

                state_id INT AUTO_INCREMENT PRIMARY KEY,

                state_name VARCHAR(100)
                    NOT NULL UNIQUE,

                state_code VARCHAR(10)
                    NOT NULL UNIQUE

            ) AUTO_INCREMENT = 1000
        `);


        // =========================
        // DISTRICT TABLE
        // =========================

        await db.query(`
            CREATE TABLE IF NOT EXISTS district (

                district_id INT AUTO_INCREMENT PRIMARY KEY,

                state_id INT NOT NULL,

                district_name VARCHAR(100)
                    NOT NULL,

                district_code VARCHAR(10)
                    NOT NULL UNIQUE,

                FOREIGN KEY (state_id)
                    REFERENCES state(state_id)
                    ON DELETE RESTRICT

            ) AUTO_INCREMENT = 1000
        `);


        // =========================
        // TEHSIL TABLE
        // =========================

        await db.query(`
            CREATE TABLE IF NOT EXISTS tehsil (

                tehsil_id INT AUTO_INCREMENT PRIMARY KEY,

                district_id INT NOT NULL,

                tehsil_name VARCHAR(100)
                    NOT NULL,

                tehsil_code VARCHAR(10)
                    NOT NULL UNIQUE,

                FOREIGN KEY (district_id)
                    REFERENCES district(district_id)
                    ON DELETE RESTRICT

            ) AUTO_INCREMENT = 1000
        `);


    }

    catch (error) {
        throw error;
    }

}


module.exports = initializeDatabase;