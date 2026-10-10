const mongoose = require("mongoose");

const farmerHistorySchema = new mongoose.Schema(
    {
        deleted_by: {
            type:Number,
            require:true
        },
        farmer_id: {
            type: Number,
            required: true
        },

        farmer_name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            trim: true
        },

        mobile_number: {
            type: String,
            required: true
        },

        address: {
            type: String,
            trim: true
        },

        aadhaar_lookup: {
            type: String,
            required: true,
            index: true
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
    "FarmerHistory",
    farmerHistorySchema
);