const express = require("express");
const connectMongoDB = require("./config/mongo");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require('path')
dotenv.config({
    path: path.resolve(__dirname, ".env")
});

if (!process.env.AADHAAR_PEPPER) {
    console.error("CONFIGURATION ERROR: AADHAAR_PEPPER environment variable is missing.");
}

const { validateSecurityConfig } = require("./services/securityStore");
validateSecurityConfig();

const app = express();

const createDatabase = require("./model/db");
const createfarmeraddress = require('./model/farmeraddress');
const createfarmerregister = require('./model/farmerregister');
const createfarmerlandtable = require('./model/farmerland');
const createcroptable = require('./model/farmercrop');
const createprocurementsessiontable = require('./model/initializeProcurementSession');
const createmanditable = require('./model/mandi');
const createmandiuser = require('./model/mandiUser');
const createpaymentuser = require('./model/paymentUser');
const initializeAppUsers = require('./model/appUser');
const cookieParser = require("cookie-parser");
const initializeViews = require("./model/views");

async function initDb() {
    try {
        await createDatabase();
        await createfarmeraddress();
        await initializeAppUsers();
        await createfarmerregister();
        await createfarmerlandtable();
        await createcroptable();
        await createprocurementsessiontable();
        await createmanditable();
        await createmandiuser();
        await createpaymentuser();
        await initializeViews();
    } catch (err) {
        console.error("Database initialization error:", err);
    }
}
initDb();

const allowedOrigins = [
    process.env.FRONTEND_URL
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());
connectMongoDB();

//router
const authRoutes = require("./routes/authRoute");
app.use(
    "/api/auth",
    authRoutes
);

const stateRoutes =require("./routes/stateRoute");
app.use(
    "/api/location/state",
    stateRoutes
);

const districtRoute = require('./routes/districtRoute');
app.use("/api/location/district",districtRoute);

const tehsilRoute = require('./routes/tehsilRoute');
app.use("/api/location/tehsil",tehsilRoute)

const farmerRoutes = require("./routes/farmerRoute");
app.use("/api/farmer", farmerRoutes);

const farmerlandRoute = require('./routes/farmerlandRoute');
app.use("/api/farmer/land/",farmerlandRoute)

const cropRoute = require('./routes/cropRoute');
app.use("/api/crops",cropRoute);

const procurementRoute = require('./routes/procurementRoute');
app.use("/api/procurement",procurementRoute);

const farmerHistoryRoutes = require("./routes/mongoroute/farmerHistoryRoutes");
app.use("/api/farmer-history", farmerHistoryRoutes);

const mandiRoutes = require("./routes/mandiRoute");
app.use("/api/mandis", mandiRoutes);

const mandicounterRoutes = require("./routes/mandicounterRoute");
app.use("/api/mandicounters", mandicounterRoutes);

const appUserRoutes = require("./routes/appUserRoute");
app.use("/api/app-users", appUserRoutes);

const recentlogs = require("./routes/mongoroute/recentlogsRoute");
app.use("/api/recent-log", recentlogs);
app.use("/api/recent-logs", recentlogs);

const mandiappuser = require('./routes/mandiUserRoute');
app.use("/api/mandi-app-user",mandiappuser);

const paymentUserRoutes = require('./routes/paymentUserRoutes');
app.use("/api/payment-users", paymentUserRoutes);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;