const mongoose = require("mongoose");

const MandiLoginLogsSchema = new mongoose.Schema(
    {
        user_id: {
            type: Number,
            required: true
        },
        username: {
            type: String,
            required: true
        },
        role: {
            type: String,
            required: true
        },
        login_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "MandiLoginLogs",
        versionKey: false
    }
);

module.exports = mongoose.model("MandiLoginLogs", MandiLoginLogsSchema);
