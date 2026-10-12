const mysql = require("mysql2");

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

    const config = {
        host: host,
        port: port,
        user: user,
        password: password,
        database: database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };

    if (ssl) {
        config.ssl = ssl;
    }

    return mysql.createPool(config);
}

let primaryDB = null;
let secondaryDatabases = [];

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

    return {
        writeDB: primaryDB,
        secondaries: secondaryDatabases
    };
}

// Initialize on module load
initDatabaseRouter();

/**
 * Returns the write database connection pool (strictly PRIMARY).
 */
function getWriteDatabase() {
    if (!primaryDB) {
        initDatabaseRouter();
    }
    return primaryDB;
}

/**
 * Randomly selects an available Secondary DB for each read request.
 * Falls back to Primary if no Secondary is running or available.
 */
function getReadDatabase() {
    if (!primaryDB) {
        initDatabaseRouter();
    }

    // Filter running secondary databases
    const runningDatabases = secondaryDatabases.filter(
        item => item.db && item.status === "RUNNING"
    );

    if (runningDatabases.length === 0) {
        return primaryDB;
    }

    // Random selection per read request (no round-robin)
    const randomIndex = Math.floor(Math.random() * runningDatabases.length);
    return runningDatabases[randomIndex].db;
}

/**
 * Verifies connectivity of Primary and all available Secondary databases
 */
async function verifyDatabaseConnections() {
    try {
        const writeDb = getWriteDatabase().promise();
        await writeDb.query("SELECT 1");
        console.log("[DB Router] Primary Database (Write) connected successfully.");

        for (const sec of secondaryDatabases) {
            if (sec.db && sec.status === "RUNNING") {
                try {
                    await sec.db.promise().query("SELECT 1");
                    console.log(`[DB Router] ${sec.name} Database (Read) connected successfully.`);
                } catch (secErr) {
                    console.warn(`[DB Router] ${sec.name} connection warning:`, secErr.message);
                }
            }
        }
    } catch (err) {
        console.error("[DB Router] Primary Database connection error:", err.message);
    }
}

module.exports = {
    getWriteDatabase,
    getReadDatabase,
    initDatabaseRouter,
    verifyDatabaseConnections
};
