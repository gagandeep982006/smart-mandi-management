const mongoose = require("mongoose");

const loginLogsSchema = new mongoose.Schema(
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

        role: {
            type: String,
            required: true,
            trim:true
        },

        Login_at:{
            type: Date,
            default: Date.now,
            expires: 60 * 60 * 24 * 7
        }
    }
);

module.exports = mongoose.model(
    "LoginLogs",
    loginLogsSchema
);