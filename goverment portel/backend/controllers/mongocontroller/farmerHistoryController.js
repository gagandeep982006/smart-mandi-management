const FarmerHistory = require("../../model/mongomodel/FarmerHistory");
const { generateAadhaarLookup, isValidAadhaar } = require("../../services/aadhaarSecurity");

const addFarmerHistory = async (req, res) => {
    try {
        const {
            farmer_id,
            farmer_name,
            email,
            mobile_number,
            address,
            aadhaar_number,
            aadhaar_lookup
        } = req.body;

        const resolvedLookup = aadhaar_lookup || (aadhaar_number && isValidAadhaar(aadhaar_number) ? generateAadhaarLookup(aadhaar_number) : null);

        // Required fields
        if (
            !farmer_id ||
            !farmer_name ||
            !mobile_number ||
            !resolvedLookup
        ) {
            return res.status(400).json({
                success: false,
                message: "Farmer ID, farmer name, mobile number and Aadhaar identifier are required"
            });
        }

        const farmerHistory = await FarmerHistory.create({
            farmer_id,
            farmer_name,
            email: email || null,
            mobile_number,
            address: address || null,
            aadhaar_lookup: resolvedLookup
        });

        return res.status(201).json({
            success: true,
            message: "Farmer history added successfully",
            history_id: farmerHistory._id
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const searchFarmerByAadhaar = async (req, res) => {
    try {
        const { aadhaar_number } = req.query;

        if (!aadhaar_number) {
            return res.status(400).json({
                success: false,
                message: "Aadhaar number is required"
            });
        }

        const lookup = isValidAadhaar(aadhaar_number) ? generateAadhaarLookup(aadhaar_number) : aadhaar_number;

        const farmer = await FarmerHistory.findOne({
            aadhaar_lookup: lookup
        }).select("-aadhaar_lookup");

        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: "Farmer history not found"
            });
        }

        return res.status(200).json({
            success: true,
            farmer: farmer
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    addFarmerHistory,
    searchFarmerByAadhaar
};