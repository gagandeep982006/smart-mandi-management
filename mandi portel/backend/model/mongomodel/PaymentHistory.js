const mongoose = require("mongoose");

const PaymentHistorySchema = new mongoose.Schema(
    {
        payment_id: {
            type: Number,
            required: true
        },
        booking_id: {
            type: Number,
            required: true
        },
        farmer_id: {
            type: Number,
            required: true
        },
        mandi_id: {
            type: Number,
            required: true
        },
        crop_id: {
            type: Number,
            required: true
        },
        quantity_sold: {
            type: Number,
            required: true
        },
        rate_per_unit: {
            type: Number,
            required: true
        },
        total_payable_amount: {
            type: Number,
            required: true
        },
        payment_status: {
            type: String,
            required: true
        },
        payment_date: {
            type: Date
        },
        created_at: {
            type: Date
        },
        session_id: {
            type: Number,
            required: true
        },
        archived_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "PaymentHistory",
        versionKey: false
    }
);

PaymentHistorySchema.index({ session_id: 1 });
PaymentHistorySchema.index({ payment_id: 1 });
PaymentHistorySchema.index({ booking_id: 1 });

module.exports = mongoose.model("PaymentHistory", PaymentHistorySchema);
