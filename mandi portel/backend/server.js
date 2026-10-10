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

// 3. Configure express.json()
app.use(express.json());

// 4. Configure cookie-parser
app.use(cookieParser());

// 5. Configure CORS
const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5001",
    "http://127.0.0.1:5001",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
];

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) {
                return callback(null, true);
            }

            // Remove trailing slash before comparison
            const normalizedOrigin = origin.replace(/\/$/, "");

            if (allowedOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
            }

            console.log("Blocked CORS origin:", origin);
            return callback(new Error("Not allowed by CORS"));
        },

        credentials: true
    })
);

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

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", service: "Mandi Portal Backend" });
});

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

async function startServer() {
    try {
        // Initialize MySQL database router/connections
        initDatabaseRouter();

        // Verify MySQL connection pools
        await verifyDatabaseConnections();

        // Automatically initialize operational tables, indexes, and views
        await initializeDatabase();

        // Connect to MongoDB
        await connectMongoDB();

        // Initialize Procurement Session History Cleanup Scheduler (every 1 hour)
        initHistoryCleanupScheduler();

        // Express listens only after DB initialization succeeds
        app.listen(PORT, () => {
            console.log(`Mandi Portal Backend running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup aborted due to initialization failure:", error.message);
        process.exit(1);
    }
}

startServer();
