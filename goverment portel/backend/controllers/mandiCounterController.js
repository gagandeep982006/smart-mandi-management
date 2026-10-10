const { getWriteDatabase, getReadDatabase } = require("../services/databaserouter");
const { applyLocationScope } = require("../utils/locationScope");
const MandiCounterHistory = require("../model/mongomodel/MandiCounterHistory");
const RecentLogs = require("../model/mongomodel/RecentLogs")

const addMandiCounter = async (req, res) => {
    try {
        const {
            mandi_id,
            counter_number,
            counter_name,
            crop_id,
            capacity_per_day,
            status
        } = req.body;

        // -----------------------------------------
        // Required fields
        // -----------------------------------------

        if (
            !mandi_id ||
            !counter_number ||
            !counter_name ||
            !crop_id ||
            capacity_per_day === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Mandi ID, counter number, counter name, crop ID and capacity per day are required"
            });
        }

        // -----------------------------------------
        // Validate capacity
        // -----------------------------------------

        if (capacity_per_day <= 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Capacity per day must be greater than 0"
            });
        }

        // -----------------------------------------
        // Validate status
        // -----------------------------------------

        if (
            status !== undefined &&
            status !== "active" &&
            status !== "inactive"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Status must be active or inactive"
            });
        }

        const readDb = getReadDatabase().promise();
        const writeDb = getWriteDatabase().promise();

        // -----------------------------------------
        // Get mandi capacity (scoped)
        // -----------------------------------------

        const mandiQuery = `
            SELECT m.capacity
            FROM vw_mandis m
            WHERE m.mandi_id = ?
        `;

        const scopedMandi = applyLocationScope(mandiQuery, [mandi_id], req.userScope, {
            stateColumn: "m.state_id",
            districtColumn: "m.district_id",
            tehsilColumn: "m.tehsil_id"
        });

        const [mandis] = await readDb.query(
            scopedMandi.query,
            scopedMandi.values
        );

        if (mandis.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi not found"
            });
        }

        const mandiCapacity =
            Number(mandis[0].capacity);

        // -----------------------------------------
        // Get existing counter capacity
        // -----------------------------------------

        const [capacityResult] = await readDb.query(
            `
            SELECT COALESCE(
                SUM(capacity_per_day),
                0
            ) AS total_capacity
            FROM mandi_counter
            WHERE mandi_id = ?
            `,
            [mandi_id]
        );

        const existingCapacity =
            Number(
                capacityResult[0].total_capacity
            );

        // -----------------------------------------
        // Calculate new total capacity
        // -----------------------------------------

        const newTotalCapacity =
            existingCapacity +
            Number(capacity_per_day);

        // -----------------------------------------
        // Check mandi capacity
        // -----------------------------------------

        if (newTotalCapacity > mandiCapacity) {
            return res.status(400).json({
                success: false,
                message:
                    "Total capacity of mandi counters cannot exceed mandi capacity",
                mandi_capacity: mandiCapacity,
                existing_counter_capacity:
                    existingCapacity,
                requested_counter_capacity:
                    Number(capacity_per_day),
                remaining_capacity:
                    mandiCapacity - existingCapacity
            });
        }

        // -----------------------------------------
        // Insert counter
        // -----------------------------------------

        const query = `
            INSERT INTO mandi_counter (
                mandi_id,
                counter_number,
                counter_name,
                crop_id,
                capacity_per_day,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const [result] = await writeDb.query(
            query,
            [
                mandi_id,
                counter_number,
                counter_name,
                crop_id,
                capacity_per_day,
                status || "active"
            ]
        );

        // -----------------------------------------
        // Success
        // -----------------------------------------

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Mandi counter " + String(result.insertId) + " added successfully"
        });

        return res.status(201).json({
            success: true,
            message:
                "Mandi counter added successfully",
            counter_id: result.insertId
        });

    } catch (error) {

        // Duplicate counter number
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message:
                    "Counter number already exists in this mandi"
            });
        }

        // Invalid foreign key
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid mandi ID or crop ID"
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Internal server error"
        });
    }
};

const removeMandiCounter = async (req, res) => {
    try {
        const { counter_id } = req.params;

        if (!counter_id) {
            return res.status(400).json({
                success: false,
                message: "Counter ID is required"
            });
        }

        const getCounterQuery = `
            SELECT
                mc.counter_id,
                mc.mandi_id,
                mc.counter_name,
                mc.status
            FROM vw_mandi_counters mc
            WHERE mc.counter_id = ?
        `;

        const scopedGetCounter = applyLocationScope(
            getCounterQuery,
            [counter_id],
            req.userScope,
            {
                stateColumn: "mc.state_id",
                districtColumn: "mc.district_id",
                tehsilColumn: "mc.tehsil_id"
            }
        );

        // READ operation
        const readDb = getReadDatabase().promise();

        const [counterRows] = await readDb.query(
            scopedGetCounter.query,
            scopedGetCounter.values
        );

        // Counter doesn't exist OR is outside user's location
        if (counterRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi counter not found"
            });
        }

        const counter = counterRows[0];

        const deleteQuery = `
            DELETE mc
            FROM mandi_counter mc
            JOIN mandi m
                ON mc.mandi_id = m.mandi_id
            JOIN tehsil t
                ON m.tehsil_id = t.tehsil_id
            JOIN district d
                ON t.district_id = d.district_id
            WHERE mc.counter_id = ?
        `;

        const scopedDelete = applyLocationScope(
            deleteQuery,
            [counter_id],
            req.userScope,
            {
                stateColumn: "d.state_id",
                districtColumn: "d.district_id",
                tehsilColumn: "m.tehsil_id"
            }
        );

        // WRITE operation
        const writeDb = getWriteDatabase().promise();

        const [result] = await writeDb.query(
            scopedDelete.query,
            scopedDelete.values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi counter not found"
            });
        }
        
        await MandiCounterHistory.create({
            deleted_by: req.user.user_id,
            counter_id: counter.counter_id,
            mandi_id: counter.mandi_id,
            counter_name: counter.counter_name,
            status: counter.status
        });

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Mandi counter id " + String(counter.counter_id) + " removed"
        });

        return res.status(200).json({
            success: true,
            message: "Mandi counter removed successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updateMandiCounter = async (req, res) => {
    try {
        const { counter_id } = req.params;

        const {
            counter_number,
            counter_name,
            crop_id,
            capacity_per_day,
            status
        } = req.body;

        // -----------------------------------------
        // Validate counter ID
        // -----------------------------------------

        if (!counter_id) {
            return res.status(400).json({
                success: false,
                message: "Counter ID is required"
            });
        }

        // -----------------------------------------
        // At least one field must be provided
        // -----------------------------------------

        if (
            counter_number === undefined &&
            counter_name === undefined &&
            crop_id === undefined &&
            capacity_per_day === undefined &&
            status === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "At least one field is required to update"
            });
        }

        // -----------------------------------------
        // Validate counter number
        // -----------------------------------------

        if (
            counter_number !== undefined &&
            (
                counter_number === null ||
                counter_number <= 0
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Counter number must be greater than 0"
            });
        }

        // -----------------------------------------
        // Validate counter name
        // -----------------------------------------

        if (
            counter_name !== undefined &&
            (
                counter_name === null ||
                String(counter_name).trim() === ""
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Counter name cannot be empty"
            });
        }

        // -----------------------------------------
        // Validate crop ID
        // -----------------------------------------

        if (
            crop_id !== undefined &&
            (
                crop_id === null ||
                crop_id <= 0
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid crop ID"
            });
        }

        // -----------------------------------------
        // Validate capacity
        // -----------------------------------------

        if (
            capacity_per_day !== undefined &&
            (
                capacity_per_day === null ||
                capacity_per_day <= 0
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Capacity per day must be greater than 0"
            });
        }

        // -----------------------------------------
        // Validate status
        // -----------------------------------------

        if (
            status !== undefined &&
            status !== "active" &&
            status !== "inactive"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Status must be either active or inactive"
            });
        }

        const readDb = getReadDatabase().promise();
        const writeDb = getWriteDatabase().promise();

        // -----------------------------------------
        // Get existing counter information (scoped)
        // -----------------------------------------

        const counterQuery = `
            SELECT
                mc.counter_id,
                mc.mandi_id,
                mc.capacity_per_day
            FROM vw_mandi_counters mc
            WHERE mc.counter_id = ?
        `;

        const scopedCounter = applyLocationScope(counterQuery, [counter_id], req.userScope, {
            stateColumn: "mc.state_id",
            districtColumn: "mc.district_id",
            tehsilColumn: "mc.tehsil_id"
        });

        const [counterRows] = await readDb.query(
            scopedCounter.query,
            scopedCounter.values
        );

        if (counterRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi counter not found"
            });
        }

        const existingCounter = counterRows[0];

        // -----------------------------------------
        // Capacity validation
        // Only required when capacity is being changed
        // -----------------------------------------

        if (capacity_per_day !== undefined) {

            // Get mandi capacity
            const [mandiRows] = await readDb.query(
                `
                SELECT capacity
                FROM mandi
                WHERE mandi_id = ?
                `,
                [existingCounter.mandi_id]
            );

            if (mandiRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Mandi not found"
                });
            }

            const mandiCapacity =
                Number(mandiRows[0].capacity);

            // Get total capacity of OTHER counters
            const [capacityRows] = await readDb.query(
                `
                SELECT COALESCE(
                    SUM(capacity_per_day),
                    0
                ) AS total_capacity
                FROM mandi_counter
                WHERE mandi_id = ?
                  AND counter_id != ?
                `,
                [
                    existingCounter.mandi_id,
                    counter_id
                ]
            );

            const otherCountersCapacity =
                Number(
                    capacityRows[0].total_capacity
                );

            // New total after update
            const newTotalCapacity =
                otherCountersCapacity +
                Number(capacity_per_day);

            // -----------------------------------------
            // Check mandi capacity
            // -----------------------------------------

            if (newTotalCapacity > mandiCapacity) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Total capacity of mandi counters cannot exceed mandi capacity",

                    mandi_capacity:
                        mandiCapacity,

                    other_counters_capacity:
                        otherCountersCapacity,

                    requested_counter_capacity:
                        Number(capacity_per_day),

                    remaining_capacity:
                        mandiCapacity -
                        otherCountersCapacity
                });
            }
        }

        // -----------------------------------------
        // Build dynamic UPDATE query
        // -----------------------------------------

        const updateFields = [];
        const updateValues = [];

        if (counter_number !== undefined) {
            updateFields.push(
                "counter_number = ?"
            );

            updateValues.push(
                counter_number
            );
        }

        if (counter_name !== undefined) {
            updateFields.push(
                "counter_name = ?"
            );

            updateValues.push(
                String(counter_name).trim()
            );
        }

        if (crop_id !== undefined) {
            updateFields.push(
                "crop_id = ?"
            );

            updateValues.push(
                crop_id
            );
        }

        if (capacity_per_day !== undefined) {
            updateFields.push(
                "capacity_per_day = ?"
            );

            updateValues.push(
                capacity_per_day
            );
        }

        if (status !== undefined) {
            updateFields.push(
                "status = ?"
            );

            updateValues.push(
                status
            );
        }

        // -----------------------------------------
        // Update counter (scoped)
        // -----------------------------------------

        const updateConditions = ["mc.counter_id = ?"];
        const updateCondValues = [counter_id];

        if (req.userScope) {
            if (req.userScope.state_id !== null) {
                updateConditions.push("d.state_id = ?");
                updateCondValues.push(req.userScope.state_id);
            }
            if (req.userScope.district_id !== null) {
                updateConditions.push("d.district_id = ?");
                updateCondValues.push(req.userScope.district_id);
            }
            if (req.userScope.tehsil_id !== null) {
                updateConditions.push("m.tehsil_id = ?");
                updateCondValues.push(req.userScope.tehsil_id);
            }
        }

        const query = `
            UPDATE mandi_counter mc
            JOIN mandi m ON mc.mandi_id = m.mandi_id
            JOIN tehsil t ON m.tehsil_id = t.tehsil_id
            JOIN district d ON t.district_id = d.district_id
            SET ${updateFields.map(f => `mc.${f}`).join(", ")}
            WHERE ${updateConditions.join(" AND ")}
        `;

        const [result] = await writeDb.query(
            query,
            [...updateValues, ...updateCondValues]
        );

        // -----------------------------------------
        // Success
        // -----------------------------------------

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "mandi counter id " + String(counter_id) + " updated"
        });

        return res.status(200).json({
            success: true,
            message:
                "Mandi counter updated successfully"
        });

    } catch (error) {

        // -----------------------------------------
        // Duplicate counter number
        // -----------------------------------------

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message:
                    "Counter number already exists in this mandi"
            });
        }

        // -----------------------------------------
        // Invalid crop ID
        // -----------------------------------------

        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                success: false,
                message: "Invalid crop ID"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getCountersByMandi = async (req, res) => {
    try {
        const { mandi_id } = req.params;

        if (!mandi_id) {
            return res.status(400).json({
                success: false,
                message: "Mandi ID is required"
            });
        }

        const db = getReadDatabase().promise();

        // Verify mandi belongs to user's location scope
        const mandiQuery = `
            SELECT m.mandi_id
            FROM vw_mandis m
            WHERE m.mandi_id = ?
        `;

        const scopedMandi = applyLocationScope(mandiQuery, [mandi_id], req.userScope, {
            stateColumn: "m.state_id",
            districtColumn: "m.district_id",
            tehsilColumn: "m.tehsil_id"
        });

        const [mandis] = await db.query(
            scopedMandi.query,
            scopedMandi.values
        );

        if (mandis.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi not found"
            });
        }

        const query = `
            SELECT
                counter_id,
                mandi_id,
                counter_number,
                counter_name,
                crop_id,
                crop_name,
                capacity_per_day,
                status,
                created_at
            FROM vw_mandi_counters
            WHERE mandi_id = ?
            ORDER BY counter_number
        `;

        const [rows] = await db.query(
            query,
            [mandi_id]
        );

        return res.status(200).json({
            success: true,
            mandi_id: Number(mandi_id),
            counters: rows
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getMandisByTehsil = async (req, res) => {
    try {
        const { tehsil_id } = req.params;

        if (!tehsil_id) {
            return res.status(400).json({
                success: false,
                message: "Tehsil ID is required"
            });
        }

        const db = getReadDatabase().promise();

        const query = `
            SELECT
                m.mandi_id,
                m.mandi_name,
                m.capacity
            FROM vw_mandis m
            WHERE m.tehsil_id = ?
            ORDER BY m.mandi_id ASC
        `;

        const scoped = applyLocationScope(query, [tehsil_id], req.userScope, {
            stateColumn: "m.state_id",
            districtColumn: "m.district_id",
            tehsilColumn: "m.tehsil_id"
        });

        const [mandis] = await db.query(
            scoped.query,
            scoped.values
        );

        return res.status(200).json({
            success: true,
            data: mandis
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getTotalMandiCounters = async (req, res) => {
    try {
        const db = getReadDatabase().promise();

        const query = `
            SELECT COUNT(*) AS totalCounters
            FROM vw_mandi_counters mc
        `;

        const scoped = applyLocationScope(query, [], req.userScope, {
            stateColumn: "mc.state_id",
            districtColumn: "mc.district_id",
            tehsilColumn: "mc.tehsil_id"
        });

        const [result] = await db.query(scoped.query, scoped.values);

        return res.status(200).json({
            success: true,
            totalCounters: result[0].totalCounters
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    addMandiCounter,
    removeMandiCounter,
    updateMandiCounter,
    getCountersByMandi,
    getMandisByTehsil,
    getTotalMandiCounters
};