const mysql = require("mysql2");

function createPool(prefix) {
    const host = process.env[`${prefix}_HOST`];
    if (!host) {
        return null;
    }

    return mysql.createPool({
        host: host,
        port: Number(process.env[`${prefix}_PORT`]) || 3306,
        user: process.env[`${prefix}_USER`],
        password: process.env[`${prefix}_PASSWORD`],
        database: process.env[`${prefix}_NAME`],
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
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

    // Filter only running secondary databases
    const runningDatabases = secondaryDatabases.filter(
        item => item.db && item.status === "RUNNING"
    );

    if (runningDatabases.length === 0) {
        console.warn("No Secondary DB is running. Using Primary DB for reads.");
        selectedReadDatabase = primaryDB;
        selectedReadDatabaseName = "PRIMARY (fallback)";
    } else {
        // Randomly select one RUNNING secondary once at startup
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

// Initialize on module load
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

async function verifyDatabaseConnections() {
    try {
        const writeDb = getWriteDatabase().promise();
        await writeDb.query("SELECT 1");
        console.log("Primary Database (Write) connected successfully.");

        const readDb = getReadDatabase().promise();
        await readDb.query("SELECT 1");
        console.log(`Read Database (${selectedReadDatabaseName}) connected successfully.`);
    } catch (err) {
        console.error("Database connection verification warning:", err.message);
    }
}

module.exports = {
    getWriteDatabase,
    getReadDatabase,
    initDatabaseRouter,
    verifyDatabaseConnections
};
