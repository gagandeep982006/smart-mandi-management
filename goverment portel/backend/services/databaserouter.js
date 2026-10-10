const {
    primaryDB,
    secondary1DB,
    secondary2DB,
    secondary3DB
} = require("../config/database");

const secondaryDatabases = [
    {
        name: "SECONDARY1",
        db: secondary1DB,
        status: process.env.SECONDARY1_DB_STATUS
    },
    {
        name: "SECONDARY2",
        db: secondary2DB,
        status: process.env.SECONDARY2_DB_STATUS
    },
    {
        name: "SECONDARY3",
        db: secondary3DB,
        status: process.env.SECONDARY3_DB_STATUS
    }
];
function getWriteDatabase() {
    return primaryDB;
}
function getReadDatabase() {
    const runningDatabases = secondaryDatabases.filter(
        database => database.status === "RUNNING"
    );

    if (runningDatabases.length === 0) {

        console.warn(
            "No Secondary DB is running. Using Primary DB for reads."
        );

        return primaryDB;
    }
    const randomIndex = Math.floor(
        Math.random() * runningDatabases.length
    );

    const selectedDatabase = runningDatabases[randomIndex];

    return selectedDatabase.db;
}


module.exports = {
    getWriteDatabase,
    getReadDatabase
};