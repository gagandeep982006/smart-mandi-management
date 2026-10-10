const mongoose = require("mongoose");

const recentLogsSchema = new mongoose.Schema(
    {
        user_id: {
            type:Number,
            require:true
        },
        username: {
            type: String,
            required: true,
            trim: true
        },

        recent_activity: {
            type: String,
            required: true,
            trim:true
        },

        navigate_at:{
            type: Date,
            default: Date.now,
            expires: 60 * 60 * 24
        }
    }
);

module.exports = mongoose.model(
    "RecentLogs",
    recentLogsSchema
);