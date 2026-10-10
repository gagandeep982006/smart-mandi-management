const mysql = require("mysql2");
require("dotenv").config();

function createPool(prefix) {
    return mysql.createPool({
        host: process.env[`${prefix}_HOST`],
        port: process.env[`${prefix}_PORT`],
        user: process.env[`${prefix}_USER`],
        password: process.env[`${prefix}_PASSWORD`],
        database: process.env[`${prefix}_NAME`],

        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}


// PRIMARY
const primaryDB = createPool("PRIMARY_DB");


// SECONDARIES
const secondary1DB = createPool("SECONDARY1_DB");

const secondary2DB = createPool("SECONDARY2_DB");

const secondary3DB = createPool("SECONDARY3_DB");


module.exports = {
    primaryDB,
    secondary1DB,
    secondary2DB,
    secondary3DB
};