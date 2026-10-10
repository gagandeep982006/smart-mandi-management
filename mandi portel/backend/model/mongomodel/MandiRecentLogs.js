const mongoose = require("mongoose");

const MandiRecentLogsSchema = new mongoose.Schema(
    {
        user_id: {
            type: Number,
            required: true
        },
        username: {
            type: String,
            required: true
        },
        recent_activity: {
            type: String,
            required: true
        },
        navigate_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "MandiRecentLogs",
        versionKey: false
    }
);

module.exports = mongoose.model("MandiRecentLogs", MandiRecentLogsSchema);
