const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const { validateSecurityConfig } = require("./services/securityStore");
validateSecurityConfig();

const { verifyDatabaseConnections } = require("./services/databaserouter");
const { initializePaymentTables } = require("./services/databaseInitializer");
const authRoutes = require("./routes/authRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const locationRoutes = require("./routes/locationRoutes");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5004;

const parseAllowedOrigins = () => {
    const defaultOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3004",
        "http://127.0.0.1:3004",
        "http://localhost:5004",
        "http://127.0.0.1:5004"
    ];
    const configured = (process.env.FRONTEND_URL || "")
        .split(",")
        .map(o => o.trim().replace(/\/+$/, ""))
        .filter(Boolean);
    return [...new Set([...defaultOrigins, ...configured])];
};

// 1. CORS Configuration with Credentials
app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            const normalized = origin.trim().replace(/\/+$/, "");
            const allowedOrigins = parseAllowedOrigins();
            if (
                allowedOrigins.includes(normalized) ||
                (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized))
            ) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"]
    })
);

// 2. Middlewares (supports base64 screenshot upload up to 50MB)
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Database Readiness State
let isDatabaseReady = false;
let databaseInitError = null;

// 3. Health Check
app.get(["/health", "/api/health"], (req, res) => {
    if (isDatabaseReady) {
        return res.status(200).json({
            status: "OK",
            service: "Payment Portal Backend",
            database: "CONNECTED",
            port: PORT,
            timestamp: new Date().toISOString()
        });
    }

    return res.status(503).json({
        status: "UNAVAILABLE",
        service: "Payment Portal Backend",
        database: "DISCONNECTED",
        error: databaseInitError ? databaseInitError.message : "Database initialization pending",
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// Guard middleware for database-dependent API routes
app.use("/api", (req, res, next) => {
    if (req.path === "/health") return next();

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

// 4. API Routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/locations", locationRoutes);

// 5. 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.url} not found`
    });
});

// 6. Centralized Error Handler
app.use((err, req, res, next) => {
    console.error("[Global Error Handler]:", err);
    const status = err.statusCode || 500;
    res.status(status).json({
        success: false,
        message: err.message || "Internal server error"
    });
});

// 7. Start Server and Initialize Database Connections
const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Payment Portal Backend running on http://localhost:${PORT}`);
    console.log(` Primary/Secondary MySQL Topology Active`);
    console.log(`====================================================`);
});

async function initBackendServices() {
    try {
        // Connect MongoDB for Audit Logs
        try {
            const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/farmer_history";
            await mongoose.connect(mongoUri);
            console.log("[MongoDB] Connected successfully for Payment Portal audit logs.");
        } catch (mongoErr) {
            console.warn("[MongoDB] Connection warning:", mongoErr.message);
        }

        // Verify MySQL Primary & Secondary DBs
        await verifyDatabaseConnections();

        // Ensure Payment Portal tables exist on Primary
        await initializePaymentTables();

        isDatabaseReady = true;
        databaseInitError = null;
        console.log("[Payment Portal] Database initialized and ready for requests.\n");
    } catch (err) {
        isDatabaseReady = false;
        databaseInitError = err;
        console.error("\n[CRITICAL STARTUP ERROR] Database initialization failed:");
        console.error(err.message);
        console.error("Server remains listening on port " + PORT + " to report health status, but API routes will return 503.\n");
    }
}

initBackendServices();

module.exports = { app, server };
