const { getWriteDatabase, getReadDatabase } =
    require("../services/databaserouter");

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { generateAadhaarLookup, generateAadhaarHash } = require("../services/aadhaarSecurity");
const RecentLogs = require("../model/mongomodel/RecentLogs");

const addMandiUser = async (req, res) => {
    let connection;
    let transactionStarted = false;

    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        if (
            req.user.role !== "admin" &&
            req.user.role !== "dba"
        ) {
            return res.status(403).json({
                success: false,
                message: "Only admin or DBA can add Mandi users"
            });
        }

        const {
            username,
            role,
            permissions,
            mandi_id,
            counter_ids,
            full_name,
            phone_number,
            email,
            address,
            aadhaar
        } = req.body;

        if (
            !username ||
            !role ||
            !permissions ||
            !mandi_id
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Username, role, permissions and mandi_id are required"
            });
        }

        if (!Array.isArray(permissions)) {
            return res.status(400).json({
                success: false,
                message: "Permissions must be an array"
            });
        }

        if (!Array.isArray(counter_ids) || counter_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one counter must be assigned"
            });
        }

        const readDb = getReadDatabase().promise();

        const [mandis] = await readDb.query(
            `
            SELECT mandi_id
            FROM mandi
            WHERE mandi_id = ?
            `,
            [mandi_id]
        );

        if (mandis.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi not found"
            });
        }

        const placeholders = counter_ids
            .map(() => "?")
            .join(",");

        const [counters] = await readDb.query(
            `
            SELECT counter_id, mandi_id
            FROM mandi_counter
            WHERE counter_id IN (${placeholders})
            `,
            counter_ids
        );

        if (counters.length !== counter_ids.length) {
            return res.status(400).json({
                success: false,
                message: "One or more counter IDs are invalid"
            });
        }

        // Make sure every counter belongs to this mandi
        const invalidCounter = counters.find(
            counter =>
                Number(counter.mandi_id) !== Number(mandi_id)
        );

        if (invalidCounter) {
            return res.status(400).json({
                success: false,
                message:
                    `Counter ${invalidCounter.counter_id} does not belong to this mandi`
            });
        }

        const pool = getWriteDatabase().promise();

        connection = await pool.getConnection();

        await connection.beginTransaction();
        transactionStarted = true;

        const [userResult] = await connection.query(
            `
            INSERT INTO mandi_users (
                username,
                role,
                permissions,
                mandi_id,
                status
            )
            VALUES (?, ?, ?, ?, 'active')
            `,
            [
                username.trim(),
                role,
                JSON.stringify(permissions),
                mandi_id
            ]
        );

        const user_id = userResult.insertId;

        const counterPlaceholders = counter_ids
            .map(() => "(?, ?)")
            .join(",");

        const counterValues = [];

        for (const counter_id of counter_ids) {
            counterValues.push(user_id, counter_id);
        }

        await connection.query(
            `
            INSERT INTO mandi_user_counters (
                user_id,
                counter_id
            )
            VALUES ${counterPlaceholders}
            `,
            counterValues
        );

        const assignedPhone = phone_number
            ? String(phone_number).trim().replace(/\D/g, "")
            : `9802${String(user_id).padStart(6, '0')}`;
        const userFullName = full_name ? String(full_name).trim() : username.trim();
        const userEmail = email ? String(email).trim() : `${username.trim().toLowerCase()}@mandi.gov.in`;
        const userAddress = address ? String(address).trim() : `Mandi Operational Yard Complex, Mandi #${mandi_id}`;
        const aadhaarNum = aadhaar ? String(aadhaar).trim() : `6000${String(user_id).padStart(8, '0')}`;
        const aadhaarLookup = generateAadhaarLookup(aadhaarNum);
        const aadhaarHash = await generateAadhaarHash(aadhaarNum);

        await connection.query(
            `INSERT INTO mandiuserdetails (user_id, full_name, phone_number, email, address, aadhaar_lookup, aadhaar_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), phone_number = VALUES(phone_number), email = VALUES(email), address = VALUES(address)`,
            [user_id, userFullName, assignedPhone, userEmail, userAddress, aadhaarLookup, aadhaarHash]
        );

        await connection.commit();
        transactionStarted = false;
        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity:
                `Mandi user ${username.trim()} added successfully`
        });

        const [newUser] = await pool.query(
            `
            SELECT
                user_id,
                username,
                role,
                mandi_id,
                created_at
            FROM mandi_users
            WHERE user_id = ?
            `,
            [user_id]
        );

        return res.status(201).json({
            success: true,
            message: "Mandi user created successfully",
            data: newUser[0]
        });

    } catch (error) {

        console.error("Add Mandi user error:", error);

        // Rollback only if transaction actually started
        if (connection && transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Rollback error:",
                    rollbackError
                );
            }
        }

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Username already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create Mandi user"
        });

    } finally {

        // Release connection back to pool
        if (connection) {
            connection.release();
        }
    }
};

const getMandiUserById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        // Only admin / DBA can view Mandi users
        if (
            req.user.role !== "admin" &&
            req.user.role !== "dba"
        ) {
            return res.status(403).json({
                success: false,
                message: "Only admin or DBA can view Mandi users"
            });
        }

        const { user_id } = req.params;

        if (!user_id || isNaN(user_id)) {
            return res.status(400).json({
                success: false,
                message: "Valid user_id is required"
            });
        }

        const db = getReadDatabase().promise();

        const [users] = await db.query(
            `
            SELECT
                user_id,
                username,
                role,
                mandi_id,
                status,
                created_at
            FROM mandi_users
            WHERE user_id = ?
            `,
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi user not found"
            });
        }

        const user = users[0];

        const [counters] = await db.query(
            `
            SELECT
                mc.counter_id,
                mc.counter_number,
                mc.counter_name,
                mc.crop_id,
                mc.capacity_per_day,
                mc.status
            FROM mandi_user_counters muc
            INNER JOIN mandi_counter mc
                ON muc.counter_id = mc.counter_id
            WHERE muc.user_id = ?
            ORDER BY mc.counter_number
            `,
            [user_id]
        );
        return res.status(200).json({
            success: true,
            data: {
                user_id: user.user_id,
                username: user.username,
                role: user.role,
                mandi_id: user.mandi_id,
                status: user.status,
                created_at: user.created_at,
                counters
            }
        });

    } catch (error) {
        console.error("Get Mandi user error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch Mandi user"
        });
    }
};

const getMandiUsers = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        if (
            req.user.role !== "admin" &&
            req.user.role !== "dba"
        ) {
            return res.status(403).json({
                success: false,
                message: "Only admin or DBA can view Mandi users"
            });
        }

        const page = Math.max(
            parseInt(req.body.page) || 1,
            1
        );

        const limit = Math.max(
            parseInt(req.body.limit) || 10,
            1
        );

        // Calculate offset
        const offset = (page - 1) * limit;
        const db = getReadDatabase().promise();

        const [users] = await db.query(
            `
            SELECT
                user_id,
                username,
                role,
                status,
                created_at,
                mandi_id
            FROM mandi_users
            ORDER BY user_id DESC
            LIMIT ? OFFSET ?
            `,
            [limit, offset]
        );
        return res.status(200).json({
            success: true,
            page,
            limit,
            count: users.length,
            data: users
        });

    } catch (error) {
        console.error("Get Mandi users error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch Mandi users"
        });
    }
};

const deleteMandiUser = async (req, res) => {
    try {
        const { user_id } = req.params;

        if (!user_id || isNaN(user_id)) {
            return res.status(400).json({
                success: false,
                message: "Valid user_id is required"
            });
        }

        const db = getWriteDatabase().promise();

        const [result] = await db.query(
            `
            DELETE FROM mandi_users
            WHERE user_id = ?
            `,
            [user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi user not found"
            });
        }

        // Recent log
        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity:
                `Mandi user ${user_id} deleted successfully`
        });

        return res.status(200).json({
            success: true,
            message: "Mandi user deleted successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Failed to delete Mandi user"
        });
    }
};

const updateMandiUserStatus = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { status } = req.body;

        if (!user_id || isNaN(user_id)) {
            return res.status(400).json({
                success: false,
                message: "Valid user_id is required"
            });
        }

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be active or inactive"
            });
        }

        const db = getWriteDatabase().promise();

        const [result] = await db.query(
            `
            UPDATE mandi_users
            SET status = ?
            WHERE user_id = ?
            `,
            [status, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi user not found"
            });
        }

        // Recent log
        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity:
                `Mandi user ${user_id} status changed to ${status}`
        });

        return res.status(200).json({
            success: true,
            message: "Mandi user status updated successfully"
        });

    } catch (error) {
        console.error("Update Mandi user status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update Mandi user status"
        });
    }
};

module.exports = {
    addMandiUser,getMandiUserById,getMandiUsers,deleteMandiUser,updateMandiUserStatus
};