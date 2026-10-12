const { getWriteDatabase } = require("./databaserouter");

/**
 * Mandi Portal Database Readiness Verification.
 * 
 * In accordance with the system architecture, Mandi Portal operates on existing tables
 * provisioned and managed by the Government Portal.
 * 
 * This module performs non-destructive table readiness verification using SHOW TABLES.
 * It NEVER executes CREATE TABLE, ALTER TABLE, DROP TABLE, TRUNCATE, or other destructive
 * DDL schema migrations at runtime.
 */
const EXPECTED_OPERATIONAL_TABLES = [
    "mandi",
    "mandi_counter",
    "mandi_users",
    "farmer",
    "crop",
    "procurement_session",
    "booking",
    "queue_token",
    "payment"
];

async function verifyTables(db) {
    console.log("Checking tables...");

    try {
        const [rows] = await db.query("SHOW TABLES");
        const existingTables = new Set(
            rows.map(row => Object.values(row)[0].toLowerCase())
        );

        let verifiedCount = 0;
        for (const tableName of EXPECTED_OPERATIONAL_TABLES) {
            if (existingTables.has(tableName.toLowerCase())) {
                console.log(`  ✓ ${tableName}`);
                verifiedCount++;
            } else {
                console.warn(`  ⚠ Table '${tableName}' not yet found. Ensure Government Portal schema has been loaded.`);
            }
        }

        console.log(`Table verification completed (${verifiedCount}/${EXPECTED_OPERATIONAL_TABLES.length} verified).`);
    } catch (err) {
        console.error("Table verification query error:", err.message);
        throw err;
    }
}

/**
 * Main database initializer entry point.
 * Performs read-only readiness check on PRIMARY database.
 */
async function initializeDatabase() {
    console.log("\nInitializing Mandi Portal database...");
    const writePool = getWriteDatabase();
    if (!writePool) {
        throw new Error("Primary Database connection pool is unavailable.");
    }

    const db = writePool.promise();

    try {
        await verifyTables(db);
        console.log("Mandi Portal database initialization completed.\n");
    } catch (error) {
        console.error("\nMandi Portal database initialization failed:");
        console.error(error.message);
        throw error;
    }
}

module.exports = {
    initializeDatabase
};
