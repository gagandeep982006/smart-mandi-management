const mongoose = require("mongoose");

const BookingHistorySchema = new mongoose.Schema(
    {
        booking_id: {
            type: Number,
            required: true
        },
        farmer_id: {
            type: Number,
            required: true
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
            default: Date.now
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

BookingHistorySchema.index({ session_id: 1 });
BookingHistorySchema.index({ booking_id: 1 });

module.exports = mongoose.model("BookingHistory", BookingHistorySchema);
