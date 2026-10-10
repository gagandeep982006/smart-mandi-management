const mongoose = require("mongoose");

const mandiHistorySchema = new mongoose.Schema(
    {
        deleted_by: {
            type:Number,
            require:true
        },
        mandi_id: {
            type: Number,
            required: true
        },

        mandi_name: {
            type: String,
            required: true,
            trim: true
        },

        tehsil_id: {
            type: Number,
            required: true
        },

        capacity: {
            type: Number,
            required: true
        },

        deleted_at: {
            type: Date,
            default: Date.now,

            // Automatically delete after 3 months
            expires: 60 * 60 * 24 * 90
        }
    }
);

module.exports = mongoose.model(
    "MandiHistory",
    mandiHistorySchema
);