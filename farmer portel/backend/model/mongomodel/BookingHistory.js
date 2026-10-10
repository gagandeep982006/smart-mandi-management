const mongoose = require("mongoose");

const BookingHistorySchema = new mongoose.Schema(
    {
        booking_id: {
            type: Number,
            required: true
        },
        farmer_id: {
            type: Number,
            required: true,
            index: true
        },
        crop_id: {
            type: Number,
            required: true
        },
        session_id: {
            type: Number,
            required: true
        },
        counter_id: {
            type: Number
        },
        quantity_req: {
            type: Number,
            required: true
        },
        quantity_approved: {
            type: Number,
            required: true
        },
        booking_time: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            required: true
        },
        created_at: {
            type: Date,
            default: Date.now,
            index: true
        },
        archived_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "BookingHistory",
        versionKey: false
    }
);

BookingHistorySchema.index({ farmer_id: 1, created_at: -1 });
BookingHistorySchema.index({ farmer_id: 1, booking_time: -1 });
BookingHistorySchema.index({ session_id: 1 });
BookingHistorySchema.index({ booking_id: 1 });

module.exports = mongoose.model("BookingHistory", BookingHistorySchema);
