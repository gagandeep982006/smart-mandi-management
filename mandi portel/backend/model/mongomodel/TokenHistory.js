const mongoose = require("mongoose");

const TokenHistorySchema = new mongoose.Schema(
    {
        token_id: {
            type: Number,
            required: true
        },
        booking_id: {
            type: Number,
            required: true
        },
        counter_id: {
            type: Number,
            required: true
        },
        old_status: {
            type: String
        },
        new_status: {
            type: String
        },
        action: {
            type: String,
            required: true
        },
        changed_by: {
            type: Number
        },
        changed_at: {
            type: Date,
            default: Date.now
        },
        service_date: {
            type: Date
        },
        token_number: {
            type: String
        },
        queue_position: {
            type: Number
        },
        status: {
            type: String
        },
        issued_at: {
            type: Date
        },
        called_at: {
            type: Date
        },
        failed_at: {
            type: Date
        },
        arrival_time: {
            type: Date
        },
        processing_start_time: {
            type: Date
        },
        completion_time: {
            type: Date
        },
        session_id: {
            type: Number
        },
        archived_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "TokenHistory",
        versionKey: false
    }
);

TokenHistorySchema.index({ token_id: 1 });
TokenHistorySchema.index({ booking_id: 1 });
TokenHistorySchema.index({ counter_id: 1 });
TokenHistorySchema.index({ changed_at: -1 });
TokenHistorySchema.index({ archived_at: 1 });

module.exports = mongoose.model("TokenHistory", TokenHistorySchema);
