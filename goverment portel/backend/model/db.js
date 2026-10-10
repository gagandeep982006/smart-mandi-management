const mysql = require("mysql2/promise");

require("dotenv").config();


async function createDatabase() {

    let connection;

    try {

        // Connect to MySQL Server
        connection = await mysql.createConnection({

            host: process.env.PRIMARY_DB_HOST,

            port: process.env.PRIMARY_DB_PORT,

            user: process.env.PRIMARY_DB_USER,

            password: process.env.PRIMARY_DB_PASSWORD
        });


        // Create Database
        await connection.query(`

            CREATE DATABASE IF NOT EXISTS
            \`${process.env.PRIMARY_DB_NAME}\`

        `);

    }

    catch (error) {

        throw error;

    }

    finally {

        if (connection) {

            await connection.end();

        }

    }

}


module.exports = createDatabase;