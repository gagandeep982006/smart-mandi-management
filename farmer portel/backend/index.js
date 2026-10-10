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

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS
const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5002",
    "http://127.0.0.1:5002"
];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
                return callback(null, true);
            }
            return callback(null, true);
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