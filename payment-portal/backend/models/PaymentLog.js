const mongoose = require("mongoose");

const retentionYears = parseInt(process.env.PAYMENT_LOG_RETENTION_YEARS, 10);
const expireAfterSeconds = retentionYears * 365 * 24 * 60 * 60; // Convert years to seconds

const PaymentLogSchema = new mongoose.Schema(
    {
        payment_id: {
            type: Number,
            index: true
        },
        state_id: {
            type: Number,
            required: true,
            index: true
        },
        operator_id: {
            type: Number,
            required: true
        },
        operator_username: {
            type: String,
            required: true
        },
        action: {
            type: String,
            required: true,
            enum: [
                "LOGIN",
                "LOGOUT",
                "VIEW_PAYMENT",
                "MARK_PROCESSING",
                "MARK_PAID",
                "MARK_FAILED",
                "CANCEL_PAYMENT",
                "RESTORE_PAYMENT",
                "RETRY_PAYMENT",
                "UNAUTHORIZED_ACCESS_ATTEMPT"
            ]
        },
        previous_status: {
            type: String,
            default: null
        },
        new_status: {
            type: String,
            default: null
        },
        amount: {
            type: Number,
            default: null
        },
        outcome: {
            type: String,
            required: true,
            enum: ["SUCCESS", "FAILURE", "DENIED"]
        },
        reason: {
            type: String,
            default: null
        },
        ip_address: {
            type: String,
            default: null
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        collection: "payment_portal_logs",
        versionKey: false
    }
);

// TTL index to automatically purge logs older than configured retention years
PaymentLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: expireAfterSeconds, name: "ttl_payment_logs" });
PaymentLogSchema.index({ state_id: 1, timestamp: -1 });

module.exports = mongoose.model("PaymentLog", PaymentLogSchema);
