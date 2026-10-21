const mysql = require("mysql2");
require("dotenv").config();

function createPool(prefix) {
    const rawHost = process.env[`${prefix}_HOST`];
    if (!rawHost) return null;
    const host = String(rawHost).trim();
    const port = Number(process.env[`${prefix}_PORT`]) || 3306;

    const sslDisabled = process.env[`${prefix}_SSL`] === "false" || process.env.DB_SSL === "false";
    const ssl = sslDisabled
        ? undefined
        : {
            rejectUnauthorized: process.env[`${prefix}_SSL_REJECT_UNAUTHORIZED`] === "true" || process.env.DB_SSL_REJECT_UNAUTHORIZED === "true"
        };

    const config = {
        host: host,
        port: port,
        user: process.env[`${prefix}_USER`],
        password: process.env[`${prefix}_PASSWORD`],
        database: process.env[`${prefix}_NAME`],
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        timezone: '+05:30',
        dateStrings: true
    };

    if (ssl) {
        config.ssl = ssl;
    }

    const pool = mysql.createPool(config);
    pool.on('connection', (conn) => {
        conn.query("SET time_zone = '+05:30'");
    });
    return pool;
}

const primaryDB = createPool("PRIMARY_DB");

const secondary1DB = createPool("SECONDARY1_DB");
const secondary2DB = createPool("SECONDARY2_DB");
const secondary3DB = createPool("SECONDARY3_DB");

module.exports = {
    primaryDB,
    secondary1DB,
    secondary2DB,
    secondary3DB
};