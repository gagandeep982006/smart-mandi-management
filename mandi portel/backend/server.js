const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// 1. Load dotenv
dotenv.config({
    path: path.resolve(__dirname, ".env")
});

const { validateSecurityConfig } = require("./services/securityStore");
validateSecurityConfig();

// 2. Create Express app
const app = express();
app.set("trust proxy", 1);

// 3. Configure express.json()
app.use(express.json());

// 4. Configure cookie-parser
app.use(cookieParser());

// 5. Configure CORS
const parseAllowedOrigins = () => {
    const defaultOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5001",
        "http://127.0.0.1:5001",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ];
    const configured = (process.env.FRONTEND_URL || "")
        .split(",")
        .map(o => o.trim().replace(/\/+$/, ""))
        .filter(Boolean);
    return [...new Set([...defaultOrigins, ...configured])];
};

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) {
                return callback(null, true);
            }

            const normalizedOrigin = origin.trim().replace(/\/+$/, "");
            const allowedOrigins = parseAllowedOrigins();

            if (
                allowedOrigins.includes(normalizedOrigin) ||
                (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin))
            ) {
                return callback(null, true);
            }

            console.log("Blocked CORS origin:", origin);
            return callback(null, false);
        },

        credentials: true
    })
);

// Database Readiness State Tracking
let isDatabaseReady = false;
let databaseInitError = null;

// Health check endpoints (accessible regardless of DB state)
app.get(["/health", "/api/health"], (req, res) => {
    if (isDatabaseReady) {
        return res.status(200).json({
            status: "OK",
            service: "Mandi Portal Backend",
            database: "CONNECTED",
            timestamp: new Date().toISOString()
        });
    }

    return res.status(503).json({
        status: "UNAVAILABLE",
        service: "Mandi Portal Backend",
        database: "DISCONNECTED",
        error: databaseInitError ? databaseInitError.message : "Database initialization pending",
        timestamp: new Date().toISOString()
    });
});

// Guard middleware for database-dependent API routes:
// Rejects requests with 503 instead of failing silently when database is unavailable.
app.use("/api", (req, res, next) => {
    if (req.path === "/health" || req.path === "/status") {
        return next();
    }

    if (!isDatabaseReady) {
        return res.status(503).json({
            success: false,
            error: "DATABASE_UNAVAILABLE",
            message: "Database connection is not available. Please verify Aiven MySQL status and environment variables.",
            details: databaseInitError ? databaseInitError.message : "Database initialization pending"
        });
    }

    next();
});

// 6. Register routes
const authRoutes = require("./routes/authRoutes");
const mandiRoutes = require("./routes/mandiRoutes");
const counterRoutes = require("./routes/counterRoutes");
const tokenRoutes = require("./routes/tokenRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const authenticateToken = require("./middleware/authenticateToken");
const { getRecentLogs } = require("./controllers/mandiController");

app.use("/api/auth", authRoutes);
app.use("/api/mandi", mandiRoutes);
app.use("/api/counters", counterRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/payments", paymentRoutes);
app.get("/api/recent-logs", authenticateToken, getRecentLogs);

// Global error handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

// 7. Initialize services and start server
const { initDatabaseRouter, verifyDatabaseConnections } = require("./services/databaserouter");
const { initializeDatabase } = require("./services/databaseInitializer");
const connectMongoDB = require("./services/mongoConnection");
const { initHistoryCleanupScheduler } = require("./services/historyCleanupService");

const PORT = process.env.PORT || 5001;

// Start Express and bind to port immediately as required by Render
const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Mandi Portal Backend running on port ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(` Health check: http://localhost:${PORT}/health`);
    console.log(`====================================================`);
});

async function initBackendServices() {
    try {
        console.log("\n[Startup] Initializing MySQL Database Router...");
        initDatabaseRouter();

        console.log("[Startup] Verifying MySQL Connection Pools...");
        await verifyDatabaseConnections();

        console.log("[Startup] Verifying Mandi Portal Operational Tables...");
        await initializeDatabase();

        // Mark database as successfully ready to accept traffic
        isDatabaseReady = true;
        databaseInitError = null;
        console.log("[Startup] ✓ Database is ready and operational.\n");

        // Connect to MongoDB for operational history
        try {
            await connectMongoDB();
            initHistoryCleanupScheduler();
        } catch (mongoErr) {
            console.warn("[Startup] MongoDB connection warning:", mongoErr.message);
        }
    } catch (error) {
        isDatabaseReady = false;
        databaseInitError = error;
        console.error("\n====================================================");
        console.error(" [CRITICAL] Database initialization failed during startup:");
        console.error(" Error:", error.message);
        console.error(" Status: Port is bound to prevent Render crash, but API routes will return 503 until database is reachable.");
        console.error("====================================================\n");
    }
}

// Run async initialization
initBackendServices();

module.exports = { app, server };
