const { getWriteDatabase, getReadDatabase } = require("../services/databaserouter");
const FarmerHistory = require("../model/mongomodel/FarmerHistory");
const {
    isValidAadhaar,
    generateAadhaarLookup,
    generateAadhaarHash
} = require("../services/aadhaarSecurity");
const {
    applyLocationScope,
    validateLocationInScope
} = require("../utils/locationScope");

const RecentLogs = require("../model/mongomodel/RecentLogs")


const addFarmer = async (req, res) => {

    let db;
    try {
        const readDb = getReadDatabase().promise();
        const pool = getWriteDatabase().promise();
        db = await pool.getConnection();

        const {
            name,
            mobile_number,
            email,
            address,
            state_id,
            district_id,
            tehsil_id,
            aadhaar_number,

            bank_name,
            account_number,
            ifsc_code
        } = req.body;

        // Validate and derive location from user scope
        let targetStateId = state_id;
        let targetDistrictId = district_id;
        let targetTehsilId = tehsil_id;

        if (req.userScope) {
            const scopeCheck = validateLocationInScope(req.userScope, {
                state_id,
                district_id,
                tehsil_id
            });
            if (!scopeCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    message: scopeCheck.message || "Unauthorized location scope"
                });
            }

            if (req.userScope.state_id !== null) {
                targetStateId = req.userScope.state_id;
            }
            if (req.userScope.district_id !== null) {
                targetDistrictId = req.userScope.district_id;
            }
            if (req.userScope.tehsil_id !== null) {
                targetTehsilId = req.userScope.tehsil_id;
            }
        }

        // Farmer required fields
        if (
            !name ||
            !mobile_number ||
            !targetStateId ||
            !targetDistrictId ||
            !targetTehsilId ||
            !aadhaar_number
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Name, mobile number, state, district, tehsil and Aadhaar number are required"
            });
        }

        // Validate 12-digit Aadhaar format
        if (!isValidAadhaar(aadhaar_number)) {
            return res.status(400).json({
                success: false,
                message: "Aadhaar number must be a valid 12-digit number"
            });
        }

        // Bank required fields
        if (
            !bank_name ||
            !account_number ||
            !ifsc_code
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Bank name, account number and IFSC code are required"
            });
        }

        // Check if Aadhaar blind index already exists
        const aadhaarLookup = generateAadhaarLookup(aadhaar_number);
        const [existingFarmer] = await readDb.query(
            "SELECT farmer_id FROM farmer WHERE aadhaar_lookup = ?",
            [aadhaarLookup]
        );
        if (existingFarmer.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Aadhaar number already exists"
            });
        }

        const aadhaarHash = await generateAadhaarHash(aadhaar_number);

        // Start transaction
        await db.beginTransaction();


        // -------------------------
        // Add Farmer
        // -------------------------

        const farmerQuery = `
            INSERT INTO farmer (
                name,
                mobile_number,
                email,
                address,
                state_id,
                district_id,
                tehsil_id,
                aadhaar_hash,
                aadhaar_lookup
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [farmerResult] = await db.query(
            farmerQuery,
            [
                name,
                mobile_number,
                email || null,
                address || null,
                targetStateId,
                targetDistrictId,
                targetTehsilId,
                aadhaarHash,
                aadhaarLookup
            ]
        );

        const farmer_id = farmerResult.insertId;


        // -------------------------
        // Add Bank Account
        // -------------------------

        const bankQuery = `
            INSERT INTO bank_account (
                farmer_id,
                bank_name,
                account_number,
                ifsc_code
            )
            VALUES (?, ?, ?, ?)
        `;

        await db.query(
            bankQuery,
            [
                farmer_id,
                bank_name,
                account_number,
                ifsc_code
            ]
        );


        // Both successful
        await db.commit();

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Farmer " + String(farmer_id) + " added successfully"
        });

        return res.status(201).json({
            success: true,
            message: "Farmer and bank details added successfully",
            farmer_id: farmer_id
        });


    } catch (error) {

        // Undo both operations
        await db.rollback();


        if (error.status === 403) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }


        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message:
                    "Mobile number, email, Aadhaar number or bank account already exists"
            });
        }


        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid state, district, tehsil or farmer reference"
            });
        }


        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


const deleteFarmerUser = async (req, res) => {
    try {
        const { farmer_id } = req.params;

        if (!farmer_id) {
            return res.status(400).json({
                success: false,
                message: "Farmer ID is required"
            });
        }

        // 1. Get farmer details before deleting (scoped)
        const selectQuery = `
            SELECT
                farmer_id,
                name,
                email,
                mobile_number,
                address,
                aadhaar_lookup
            FROM farmer
            WHERE farmer_id = ?
        `;

        const scopedSelect = applyLocationScope(selectQuery, [farmer_id], req.userScope, {
            stateColumn: "state_id",
            districtColumn: "district_id",
            tehsilColumn: "tehsil_id"
        });

        const readDb = getReadDatabase().promise();
        const writeDb = getWriteDatabase().promise();

        const [farmers] = await readDb.query(
            scopedSelect.query,
            scopedSelect.values
        );

        if (farmers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer not found"
            });
        }

        const farmer = farmers[0];

        // 2. Store farmer in MongoDB history
        await FarmerHistory.create({
            deleted_by:req.user.user_id,
            farmer_id: farmer.farmer_id,
            farmer_name: farmer.name,
            email: farmer.email,
            mobile_number: farmer.mobile_number,
            address: farmer.address,
            aadhaar_lookup: farmer.aadhaar_lookup
        });

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Farmer id " + String(farmer_id) + " remove successfully"
        });

        // 3. Delete farmer from MySQL (scoped)
        // farmer_land will be deleted automatically
        // because of ON DELETE CASCADE
        const deleteQuery = `
            DELETE FROM farmer
            WHERE farmer_id = ?
        `;

        const scopedDelete = applyLocationScope(deleteQuery, [farmer_id], req.userScope, {
            stateColumn: "state_id",
            districtColumn: "district_id",
            tehsilColumn: "tehsil_id"
        });

        const [result] = await writeDb.query(
            scopedDelete.query,
            scopedDelete.values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer could not be deleted"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Farmer deleted successfully and history stored"
        });

    } catch (error) {

        if (error.statusCode === 403) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getFarmerByAadhaar = async (req, res) => {
    try {
        const { aadhaar_number } = req.params;

        if (!aadhaar_number) {
            return res.status(400).json({
                success: false,
                message: "Aadhaar number or farmer ID is required"
            });
        }

        const cleanParam = String(aadhaar_number).trim();
        const isAadhaar = isValidAadhaar(cleanParam);
        const db = getReadDatabase().promise();
        let targetFarmerId;

        if (isAadhaar) {
            const lookup = generateAadhaarLookup(cleanParam);
            const [lookupRows] = await db.query(
                "SELECT farmer_id FROM farmer WHERE aadhaar_lookup = ?",
                [lookup]
            );
            if (lookupRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Farmer not found"
                });
            }
            targetFarmerId = lookupRows[0].farmer_id;
        } else {
            targetFarmerId = cleanParam;
        }

        const baseQuery = `
            SELECT 
                farmer_id,
                name,
                mobile_number,
                email,
                address,
                state_id,
                district_id,
                tehsil_id,
                aadhaar_verified,
                aadhaar_verified_at,
                registration_date,
                status,
                verification_status,
                mobile_verified,
                mobile_verified_at,
                created_at,

                -- Bank Details
                account_id,
                bank_name,
                account_number,
                ifsc_code,
                bank_verification_status

            FROM vw_farmers
            WHERE farmer_id = ?
        `;

        const scoped = applyLocationScope(baseQuery, [targetFarmerId], req.userScope, {
            stateColumn: "state_id",
            districtColumn: "district_id",
            tehsilColumn: "tehsil_id"
        });

        const [result] = await db.query(
            scoped.query,
            scoped.values
        );

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer not found"
            });
        }

        return res.status(200).json({
            success: true,
            farmer: result[0]
        });

    } catch (error) {

        if (error.statusCode === 403) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getFarmers = async (req, res) => {
    try {
        // Pagination from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Filters from body
        const {
            state_id,
            district_id,
            tehsil_id,
            status
        } = req.body;

        // Validate pagination
        if (page < 1 || limit < 1) {
            return res.status(400).json({
                success: false,
                message: "Page and limit must be greater than 0"
            });
        }

        // Validate status
        const validStatuses = [
            "active",
            "inactive",
            "suspended"
        ];

        if (
            status &&
            !validStatuses.includes(status.toLowerCase())
        ) {
            return res.status(400).json({
                success: false,
                message: "Status must be active, inactive, or suspended"
            });
        }

        const offset = (page - 1) * limit;

        // Build WHERE conditions for user-supplied filters
        const conditions = [];
        const values = [];

        // If user is global admin (no authoritative scope), allow filtering by user-provided location
        if (!req.userScope || req.userScope.state_id === null) {
            if (state_id) {
                conditions.push("f.state_id = ?");
                values.push(state_id);
            }
        }
        if (!req.userScope || req.userScope.district_id === null) {
            if (district_id) {
                conditions.push("f.district_id = ?");
                values.push(district_id);
            }
        }
        if (!req.userScope || req.userScope.tehsil_id === null) {
            if (tehsil_id) {
                conditions.push("f.tehsil_id = ?");
                values.push(tehsil_id);
            }
        }

        if (status) {
            conditions.push("f.status = ?");
            values.push(status.toLowerCase());
        }

        // WHERE clause
        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        // ------------------------------------------------
        // Get total + verification + suspended counts
        // ------------------------------------------------

        const countQuery = `
            SELECT
                COUNT(*) AS total_farmers,

                SUM(
                    CASE
                        WHEN f.aadhaar_verified = TRUE
                         AND f.verification_status = TRUE
                        THEN 1
                        ELSE 0
                    END
                ) AS verified_farmers,

                SUM(
                    CASE
                        WHEN f.status = 'suspended'
                        THEN 1
                        ELSE 0
                    END
                ) AS suspended_farmers

            FROM farmer f

            ${whereClause}
        `;

        const scopedCount = applyLocationScope(countQuery, values, req.userScope, {
            stateColumn: "f.state_id",
            districtColumn: "f.district_id",
            tehsilColumn: "f.tehsil_id"
        });

        const db = getReadDatabase().promise();

        const [countResult] = await db.query(
            scopedCount.query,
            scopedCount.values
        );

        const totalFarmers =
            Number(countResult[0].total_farmers) || 0;

        const verifiedFarmers =
            Number(countResult[0].verified_farmers) || 0;

        const suspendedFarmers =
            Number(countResult[0].suspended_farmers) || 0;

        const notVerifiedFarmers =
            totalFarmers - verifiedFarmers;


        // ------------------------------------------------
        // Get paginated farmer data
        // ------------------------------------------------

        const farmerQuery = `
            SELECT
                f.farmer_id,
                f.name,
                f.mobile_number,
                f.email,
                f.address,
                f.state_id,
                f.district_id,
                f.tehsil_id,
                f.aadhaar_verified,
                f.registration_date,
                f.status,
                f.account_number
            FROM vw_farmers f
            ${whereClause}
            ORDER BY f.farmer_id
            LIMIT ? OFFSET ?
        `;

        const farmerValues = [
            ...values,
            limit,
            offset
        ];

        const scopedFarmer = applyLocationScope(farmerQuery, farmerValues, req.userScope, {
            stateColumn: "f.state_id",
            districtColumn: "f.district_id",
            tehsilColumn: "f.tehsil_id"
        });

        const [result] = await db.query(
            scopedFarmer.query,
            scopedFarmer.values
        );


        // ------------------------------------------------
        // Response
        // ------------------------------------------------

        return res.status(200).json({
            success: true,

            page: page,
            limit: limit,

            total: totalFarmers,

            verified: verifiedFarmers,

            not_verified: notVerifiedFarmers,

            suspended: suspendedFarmers,

            farmers: result
        });

    } catch (error) {

        if (error.statusCode === 403) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        console.error("Get farmers error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updateFarmer = async (req, res) => {
    let db;

    try {
        // --------------------------------
        // Get transaction connection
        // --------------------------------

        const readDb = getReadDatabase().promise();
        const pool = getWriteDatabase().promise();
        db = await pool.getConnection();

        const { farmer_id } = req.params;

        if (!farmer_id) {
            return res.status(400).json({
                success: false,
                message: "Farmer ID is required"
            });
        }

        // Verify farmer exists within user location scope
        const checkConditions = ["f.farmer_id = ?"];
        const checkValues = [farmer_id];
        applyLocationScope(checkConditions, checkValues, req.userScope, "f");

        const [existingFarmers] = await readDb.query(
            `SELECT f.farmer_id, f.state_id, f.district_id, f.tehsil_id
             FROM farmer f
             WHERE ${checkConditions.join(" AND ")}`,
            checkValues
        );

        if (existingFarmers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer not found"
            });
        }

        const existingFarmer = existingFarmers[0];


        // --------------------------------
        // Get data from body
        // --------------------------------

        const {
            // Farmer details
            name,
            mobile_number,
            email,
            address,
            state_id,
            district_id,
            tehsil_id,
            aadhaar_number,

            // Farmer verification
            aadhaar_verified,
            verification_status,
            mobile_verified,

            // Farmer status
            status,

            // Bank details
            bank_name,
            account_number,
            ifsc_code,

            // Bank verification
            bank_verification_status

        } = req.body;


        // --------------------------------
        // Validate farmer status
        // --------------------------------

        const validStatuses = [
            "active",
            "inactive",
            "suspended"
        ];

        if (
            status !== undefined &&
            !validStatuses.includes(status.toLowerCase())
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Status must be active, inactive, or suspended"
            });
        }


        // --------------------------------
        // Validate boolean fields
        // --------------------------------

        const booleanFields = {
            aadhaar_verified,
            verification_status,
            mobile_verified,
            bank_verification_status
        };

        for (const [field, value] of Object.entries(booleanFields)) {

            if (
                value !== undefined &&
                value !== true &&
                value !== false &&
                value !== 0 &&
                value !== 1
            ) {
                return res.status(400).json({
                    success: false,
                    message: `${field} must be true or false`
                });
            }
        }


        // --------------------------------
        // Farmer fields
        // --------------------------------

        const farmerFields = [];
        const farmerValues = [];


        if (name !== undefined) {
            farmerFields.push("name = ?");
            farmerValues.push(name);
        }

        if (mobile_number !== undefined) {
            farmerFields.push("mobile_number = ?");
            farmerValues.push(mobile_number);
        }

        if (email !== undefined) {
            farmerFields.push("email = ?");
            farmerValues.push(email || null);
        }

        if (address !== undefined) {
            farmerFields.push("address = ?");
            farmerValues.push(address || null);
        }

        // Validate new location fields against user scope
        if (state_id !== undefined || district_id !== undefined || tehsil_id !== undefined) {
            const scopeCheck = validateLocationInScope(req.userScope, {
                state_id: state_id !== undefined ? state_id : existingFarmer.state_id,
                district_id: district_id !== undefined ? district_id : existingFarmer.district_id,
                tehsil_id: tehsil_id !== undefined ? tehsil_id : existingFarmer.tehsil_id
            });
            if (!scopeCheck.allowed) {
                return res.status(403).json({
                    success: false,
                    message: scopeCheck.message || "Cannot move farmer outside allowed location scope"
                });
            }
        }

        if (state_id !== undefined) {
            farmerFields.push("state_id = ?");
            farmerValues.push(state_id);
        }

        if (district_id !== undefined) {
            farmerFields.push("district_id = ?");
            farmerValues.push(district_id);
        }

        if (tehsil_id !== undefined) {
            farmerFields.push("tehsil_id = ?");
            farmerValues.push(tehsil_id);
        }

        if (aadhaar_number !== undefined && aadhaar_number !== null && String(aadhaar_number).trim() !== "") {
            const cleanAadhaar = String(aadhaar_number).trim();
            if (!isValidAadhaar(cleanAadhaar)) {
                return res.status(400).json({
                    success: false,
                    message: "Aadhaar number must be a valid 12-digit number"
                });
            }

            const lookup = generateAadhaarLookup(cleanAadhaar);

            // Check if another farmer already has this Aadhaar
            const [dupAadhaar] = await readDb.query(
                "SELECT farmer_id FROM farmer WHERE aadhaar_lookup = ? AND farmer_id != ?",
                [lookup, farmer_id]
            );

            if (dupAadhaar.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Aadhaar number already exists for another farmer"
                });
            }

            const hash = await generateAadhaarHash(cleanAadhaar);
            farmerFields.push("aadhaar_hash = ?");
            farmerValues.push(hash);
            farmerFields.push("aadhaar_lookup = ?");
            farmerValues.push(lookup);
        }


        // --------------------------------
        // Farmer verification
        // --------------------------------

        if (aadhaar_verified !== undefined) {
            farmerFields.push("aadhaar_verified = ?");
            farmerValues.push(aadhaar_verified);
        }

        if (verification_status !== undefined) {
            farmerFields.push("verification_status = ?");
            farmerValues.push(verification_status);
        }

        if (mobile_verified !== undefined) {
            farmerFields.push("mobile_verified = ?");
            farmerValues.push(mobile_verified);
        }


        // --------------------------------
        // Farmer status
        // --------------------------------

        if (status !== undefined) {
            farmerFields.push("status = ?");
            farmerValues.push(status.toLowerCase());
        }


        // --------------------------------
        // Bank fields
        // --------------------------------

        const bankFields = [];
        const bankValues = [];


        if (bank_name !== undefined) {
            bankFields.push("bank_name = ?");
            bankValues.push(bank_name);
        }

        if (account_number !== undefined) {
            bankFields.push("account_number = ?");
            bankValues.push(account_number);
        }

        if (ifsc_code !== undefined) {
            bankFields.push("ifsc_code = ?");
            bankValues.push(ifsc_code);
        }


        // --------------------------------
        // Bank verification
        // --------------------------------

        if (bank_verification_status !== undefined) {
            bankFields.push("verification_status = ?");
            bankValues.push(bank_verification_status);
        }


        // --------------------------------
        // Check if anything to update
        // --------------------------------

        if (
            farmerFields.length === 0 &&
            bankFields.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "No fields provided for update"
            });
        }


        // --------------------------------
        // Start transaction
        // --------------------------------

        await db.beginTransaction();


        // --------------------------------
        // Update farmer
        // --------------------------------

        if (farmerFields.length > 0) {
            const baseFarmerQuery = `
                UPDATE farmer
                SET ${farmerFields.join(", ")}
                WHERE farmer_id = ?
            `;

            const scopedFarmerUpdate = applyLocationScope(
                baseFarmerQuery,
                [...farmerValues, farmer_id],
                req.userScope,
                {
                    stateColumn: "state_id",
                    districtColumn: "district_id",
                    tehsilColumn: "tehsil_id"
                }
            );

            const [farmerResult] = await db.query(
                scopedFarmerUpdate.query,
                scopedFarmerUpdate.values
            );

            if (farmerResult.affectedRows === 0) {

                await db.rollback();

                return res.status(404).json({
                    success: false,
                    message: "Farmer not found"
                });
            }
        }


        // --------------------------------
        // Update bank details
        // --------------------------------

        if (bankFields.length > 0) {

            bankValues.push(farmer_id);

            const bankQuery = `
                UPDATE bank_account
                SET ${bankFields.join(", ")}
                WHERE farmer_id = ?
            `;

            await db.query(
                bankQuery,
                bankValues
            );
        }


        // --------------------------------
        // Commit transaction
        // --------------------------------

        await db.commit();

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Farmer id " + String(farmer_id) + " details updated"
        });

        return res.status(200).json({
            success: true,
            message: "Farmer details updated successfully"
        });


    } catch (error) {

        // --------------------------------
        // Rollback transaction
        // --------------------------------

        if (db) {
            await db.rollback();
        }


        // --------------------------------
        // Permission error
        // --------------------------------

        if (error.statusCode === 403) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }


        // --------------------------------
        // Duplicate value
        // --------------------------------

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message:
                    "Mobile number, email or Aadhaar number already exists"
            });
        }


        // --------------------------------
        // Invalid foreign key
        // --------------------------------

        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid state, district or tehsil"
            });
        }


        console.error(
            "Update farmer error:",
            error
        );


        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    } finally {

        // --------------------------------
        // Release connection
        // --------------------------------

        if (db) {
            db.release();
        }
    }
};

const getFarmerVerification = async (req, res) => {
    try {
        const { farmer_id } = req.params;

        if (!farmer_id) {
            return res.status(400).json({
                success: false,
                message: "Farmer ID is required"
            });
        }

        const query = `
            SELECT
                farmer_id,
                aadhaar_verified,
                aadhaar_verified_at,
                mobile_verified,
                mobile_verified_at,
                verification_status,
                bank_verification_status
            FROM vw_farmers
            WHERE farmer_id = ?
        `;

        const scoped = applyLocationScope(query, [farmer_id], req.userScope, {
            stateColumn: "state_id",
            districtColumn: "district_id",
            tehsilColumn: "tehsil_id"
        });

        const db = getReadDatabase().promise();
        const [result] = await db.query(
            scoped.query,
            scoped.values
        );

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer not found"
            });
        }

        return res.status(200).json({
            success: true,
            verification: result[0]
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getTotalFarmers = async (req, res) => {
    try {
        const baseQuery = `
            SELECT COUNT(*) AS total_farmers
            FROM farmer f
        `;

        const scoped = applyLocationScope(baseQuery, [], req.userScope, {
            stateColumn: "f.state_id",
            districtColumn: "f.district_id",
            tehsilColumn: "f.tehsil_id"
        });

        const db = getReadDatabase().promise();
        const [result] = await db.query(scoped.query, scoped.values);

        return res.status(200).json({
            success: true,
            total_farmers: result[0].total_farmers
        });

    } catch (error) {

        if (error.statusCode === 403) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


module.exports = {
    addFarmer,deleteFarmerUser,getFarmerByAadhaar,getFarmers,updateFarmer,getFarmerVerification,getTotalFarmers
};