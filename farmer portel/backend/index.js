const express = require("express");
const connectMongoDB = require("./config/mongo");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require('path')

// Load environment variables
dotenv.config({
    path: path.resolve(__dirname, ".env")
});

const { validateSecurityConfig } = require("./services/securityStore");
validateSecurityConfig();

const app = express();
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS
const parseAllowedOrigins = () => {
    const defaultOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:5002",
        "http://127.0.0.1:5002"
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
        credentials: true
    })
);

// Port
const PORT = process.env.PORT || 5002;

connectMongoDB();

const otp_table = require('./model/otp_table');
otp_table();

const initFarmerDb = require('./database/initFarmerDb');
initFarmerDb();
// Routes
const authRoutes = require("./routes/authRoutes");
const farmerRoutes = require("./routes/farmerRoutes");
app.use("/api/auth", authRoutes);
app.use("/api/farmer", farmerRoutes);

// Serve static frontend in production/fallback
const frontendBuild = path.resolve(__dirname, "../frontend/build");
const frontendDist = path.resolve(__dirname, "../frontend/dist");
const fs = require("fs");
const staticDir = fs.existsSync(frontendBuild) ? frontendBuild : (fs.existsSync(frontendDist) ? frontendDist : null);
if (staticDir) {
    app.use(express.static(staticDir));
    app.use((req, res, next) => {
        if (req.path.startsWith("/api")) return next();
        res.sendFile(path.join(staticDir, "index.html"));
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`Farmer Portal Backend running on port ${PORT}`);
});