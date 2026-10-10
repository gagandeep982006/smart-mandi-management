const mongoose = require("mongoose");

const mandiCounterHistorySchema = new mongoose.Schema(
    {
        deleted_by: {
            type:Number,
            require:true
        },
        counter_id:{
            type: Number,
            required: true
        },
        mandi_id: {
            type: Number,
            required: true
        },

        counter_name: {
            type: String,
            required: true,
            trim: true
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
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
    "MandiCounterHistory",
    mandiCounterHistorySchema
);