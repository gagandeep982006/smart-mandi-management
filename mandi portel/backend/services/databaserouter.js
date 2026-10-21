const mysql = require("mysql2");
const dns = require("dns").promises;

function createPool(prefix) {
    const rawHost = process.env[`${prefix}_HOST`];
    if (!rawHost) {
        return null;
    }

    const host = String(rawHost).trim();
    const port = Number(process.env[`${prefix}_PORT`]) || 3306;
    const user = process.env[`${prefix}_USER`];
    const password = process.env[`${prefix}_PASSWORD`];
    const database = process.env[`${prefix}_NAME`];

    const sslDisabled = process.env[`${prefix}_SSL`] === "false" || process.env.DB_SSL === "false";
    const ssl = sslDisabled
        ? undefined
        : {
            rejectUnauthorized: process.env[`${prefix}_SSL_REJECT_UNAUTHORIZED`] === "true" || process.env.DB_SSL_REJECT_UNAUTHORIZED === "true"
        };

    const poolConfig = {
        host: host,
        port: port,
        user: user,
        password: password,
        database: database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 10000,
        timezone: '+05:30',
        dateStrings: true
    };

    if (ssl) {
        poolConfig.ssl = ssl;
    }

    const pool = mysql.createPool(poolConfig);
    pool.on('connection', (conn) => {
        conn.query("SET time_zone = '+05:30'");
    });
    return pool;
}

let primaryDB = null;
let secondaryDatabases = [];
let selectedReadDatabase = null;
let selectedReadDatabaseName = null;

function initDatabaseRouter() {
    if (!primaryDB) {
        primaryDB = createPool("PRIMARY_DB");
    }

    secondaryDatabases = [
        {
            name: "SECONDARY1",
            db: createPool("SECONDARY1_DB"),
            status: process.env.SECONDARY1_DB_STATUS
        },
        {
            name: "SECONDARY2",
            db: createPool("SECONDARY2_DB"),
            status: process.env.SECONDARY2_DB_STATUS
        },
        {
            name: "SECONDARY3",
            db: createPool("SECONDARY3_DB"),
            status: process.env.SECONDARY3_DB_STATUS
        }
    ];

    const runningDatabases = secondaryDatabases.filter(
        item => item.db && item.status === "RUNNING"
    );

    if (runningDatabases.length === 0) {
        console.warn("Database Router: No Secondary DB is running. Using Primary DB for reads.");
        selectedReadDatabase = primaryDB;
        selectedReadDatabaseName = "PRIMARY (fallback)";
    } else {
        const randomIndex = Math.floor(Math.random() * runningDatabases.length);
        const selected = runningDatabases[randomIndex];
        selectedReadDatabase = selected.db;
        selectedReadDatabaseName = selected.name;
        console.log(`Database Router: Selected ${selected.name} for all read operations.`);
    }

    return {
        writeDB: primaryDB,
        readDB: selectedReadDatabase,
        readDBName: selectedReadDatabaseName
    };
}

initDatabaseRouter();

function getWriteDatabase() {
    if (!primaryDB) {
        initDatabaseRouter();
    }
    return primaryDB;
}

function getReadDatabase() {
    if (!selectedReadDatabase) {
        initDatabaseRouter();
    }
    return selectedReadDatabase;
}

async function checkHostDns(host) {
    try {
        const res = await dns.lookup(host);
        return { ok: true, ip: res.address };
    } catch (err) {
        return { ok: false, error: err.code || err.message };
    }
}

async function verifyDatabaseConnections() {
    const rawHost = process.env.PRIMARY_DB_HOST;
    const primaryHost = rawHost ? String(rawHost).trim() : null;
    const primaryPort = Number(process.env.PRIMARY_DB_PORT) || 3306;
    const primaryUser = process.env.PRIMARY_DB_USER || "unknown";
    const primaryDbName = process.env.PRIMARY_DB_NAME || "unknown";

    if (!primaryHost) {
        throw new Error("PRIMARY_DB_HOST environment variable is not defined.");
    }

    console.log(`[DB Router] Verifying Primary Database connection...`);
    console.log(`[DB Router] Host: ${primaryHost}, Port: ${primaryPort}, User: ${primaryUser}, Database: ${primaryDbName}`);

    if (primaryHost !== "localhost" && primaryHost !== "127.0.0.1") {
        const dnsCheck = await checkHostDns(primaryHost);
        if (!dnsCheck.ok) {
            console.error(`\n================================================================================`);
            console.error(`[DB Router] CRITICAL: DNS RESOLUTION FAILED FOR DATABASE`);
            console.error(`[DB Router] Hostname : ${primaryHost}`);
            console.error(`[DB Router] Error    : getaddrinfo ${dnsCheck.error}`);
            console.error(`[DB Router] Root Cause: The hostname does not exist in DNS (NXDOMAIN).`);
            console.error(`[DB Router] Possible reasons:`);
            console.error(`  1. The database service is POWERED OFF / STOPPED.`);
            console.error(`     -> DNS records may be removed for powered-off cloud services.`);
            console.error(`     -> Fix: Ensure your database service is running.`);
            console.error(`  2. The service was recreated or has a new hostname.`);
            console.error(`     -> Fix: Verify host and port in environment variables.`);
            console.error(`================================================================================\n`);
            throw new Error(`getaddrinfo ${dnsCheck.error} ${primaryHost}`);
        } else {
            console.log(`[DB Router] DNS resolved successfully: ${primaryHost} -> ${dnsCheck.ip}`);
        }
    }

    const writePool = getWriteDatabase();
    if (!writePool) {
        throw new Error("Failed to create Primary database connection pool.");
    }

    const writeDb = writePool.promise();
    await writeDb.query("SELECT 1");
    console.log("[DB Router] Primary Database (Write) connected successfully.");

    if (selectedReadDatabase) {
        try {
            const readDb = selectedReadDatabase.promise();
            await readDb.query("SELECT 1");
            console.log(`[DB Router] Read Database (${selectedReadDatabaseName}) connected successfully.`);
        } catch (readErr) {
            console.warn(`[DB Router] Read Database (${selectedReadDatabaseName}) check failed:`, readErr.message);
            console.warn(`[DB Router] Falling back to Primary DB for read operations.`);
            selectedReadDatabase = primaryDB;
            selectedReadDatabaseName = "PRIMARY (fallback)";
        }
    }
}

module.exports = {
    getWriteDatabase,
    getReadDatabase,
    initDatabaseRouter,
    verifyDatabaseConnections
};
