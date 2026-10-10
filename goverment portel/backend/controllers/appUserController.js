const { getWriteDatabase,getReadDatabase } = require("../services/databaserouter");
const { register } = require("./authController");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { generateAadhaarLookup, generateAadhaarHash } = require("../services/aadhaarSecurity");
const RecentLogs = require("../model/mongomodel/RecentLogs");
const addAppUser = register;

const addUser = async (req, res) => {
    try {

        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        if (
            currentUser.role !== "admin" &&
            currentUser.role !== "dba"
        ) {
            return res.status(403).json({
                success: false,
                message: "Only admin or DBA can add users"
            });
        }

        const {
            username,
            role,
            permissions,
            state_id,
            district_id,
            tehsil_id,
            full_name,
            phone_number,
            email,
            address,
            aadhaar
        } = req.body;

        if (!username || !role || !permissions) {
            return res.status(400).json({
                success: false,
                message: "Username, role and permissions are required"
            });
        }

        if (!Array.isArray(permissions)) {
            return res.status(400).json({
                success: false,
                message: "Permissions must be an array"
            });
        }

        const query = `
            INSERT INTO app_users (
                username,
                role,
                permissions,
                state_id,
                district_id,
                tehsil_id,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        `;

        const values = [
            username.trim(),
            role,
            JSON.stringify(permissions),
            state_id || null,
            district_id || null,
            tehsil_id || null
        ];

        const db = getWriteDatabase().promise();

        const [result] = await db.query(query, values);
        const newUserId = result.insertId;

        // Insert into userdetails
        const assignedPhone = phone_number
            ? String(phone_number).trim().replace(/\D/g, "")
            : `9801${String(newUserId).padStart(6, '0')}`;
        const userFullName = full_name ? String(full_name).trim() : username.trim();
        const userEmail = email ? String(email).trim() : `${username.trim().toLowerCase()}@gov.nic.in`;
        const userAddress = address ? String(address).trim() : "Government Administrative Complex";
        const aadhaarNum = aadhaar ? String(aadhaar).trim() : `5000${String(newUserId).padStart(8, '0')}`;
        const aadhaarLookup = generateAadhaarLookup(aadhaarNum);
        const aadhaarHash = await generateAadhaarHash(aadhaarNum);

        await db.query(
            `INSERT INTO userdetails (user_id, full_name, phone_number, email, address, aadhaar_lookup, aadhaar_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), phone_number = VALUES(phone_number), email = VALUES(email), address = VALUES(address)`,
            [newUserId, userFullName, assignedPhone, userEmail, userAddress, aadhaarLookup, aadhaarHash]
        );

        await RecentLogs.create({
            user_id: currentUser.user_id,
            username: currentUser.username,
            recent_activity:
                `User ${username.trim()} added successfully`
        });
        
        return res.status(201).json({
            success: true,
            message: "User added successfully",
            data: {
                user_id: newUserId,
                username: username.trim(),
                full_name: userFullName,
                phone_number: assignedPhone,
                role,
                permissions,
                state_id: state_id || null,
                district_id: district_id || null,
                tehsil_id: tehsil_id || null
            }
        });

    } catch (error) {

        // Duplicate username
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Username already exists"
            });
        }

        console.error("Add user error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getUsers = async (req, res) => {
    try {
        // Only DBA and Admin can view users
        if (req.user.role !== "dba" && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const page = Math.max(parseInt(req.body.page) || 1, 1);
        const limit = Math.max(parseInt(req.body.limit) || 10, 1);
        const offset = (page - 1) * limit;

        const {
            state_id,
            district_id,
            tehsil_id
        } = req.body;

        let query = `
            SELECT
                user_id,
                username,
                role,
                state_id,
                district_id,
                tehsil_id,
                state,
                district,
                tehsil,
                status
            FROM vw_app_users
            WHERE 1 = 1
        `;

        const values = [];

        // Apply filters only if provided
        if (state_id !== undefined && state_id !== null) {
            query += ` AND state_id = ?`;
            values.push(state_id);
        }

        if (district_id !== undefined && district_id !== null) {
            query += ` AND district_id = ?`;
            values.push(district_id);
        }

        if (tehsil_id !== undefined && tehsil_id !== null) {
            query += ` AND tehsil_id = ?`;
            values.push(tehsil_id);
        }

        query += `
            ORDER BY user_id DESC
            LIMIT ? OFFSET ?
        `;

        values.push(limit, offset);

        const db = getReadDatabase().promise();

        const [users] = await db.query(query, values);

        return res.status(200).json({
            success: true,
            page,
            limit,
            count: users.length,
            data: users
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        // Only DBA and Admin can delete users
        if (req.user.role !== "dba" && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const { user_id } = req.params;

        if (!user_id || isNaN(user_id)) {
            return res.status(400).json({
                success: false,
                message: "Valid user_id is required"
            });
        }

        const db = getWriteDatabase().promise();

        // Check whether user exists
        const [users] = await db.query(
            `SELECT user_id, username, role
             FROM app_users
             WHERE user_id = ?`,
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Prevent user from deleting himself
        if (Number(user_id) === Number(req.user.user_id)) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account"
            });
        }

        // Delete user
        const [result] = await db.query(
            `DELETE FROM app_users
             WHERE user_id = ?`,
            [user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity:
                `User ${users[0].username}(${users[0].username}) deleted`
        });

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete user"
        });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        // Only DBA and Admin can modify user status
        if (req.user.role !== "dba" && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const { user_id } = req.params;
        const { status } = req.body;

        // Validate user_id
        if (!user_id || isNaN(user_id)) {
            return res.status(400).json({
                success: false,
                message: "Valid user_id is required"
            });
        }

        // Validate status
        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be either active or inactive"
            });
        }

        // Prevent changing own status
        if (Number(user_id) === Number(req.user.user_id)) {
            return res.status(400).json({
                success: false,
                message: "You cannot change your own status"
            });
        }

        const db = getWriteDatabase().promise();

        // Check user exists
        const [users] = await db.query(
            `SELECT user_id, username, role, status
             FROM app_users
             WHERE user_id = ?`,
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Update status
        const [result] = await db.query(
            `UPDATE app_users
             SET status = ?
             WHERE user_id = ?`,
            [status, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                message: "Status was not updated"
            });
        }
        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity:
                `User ${users[0].username}(${users[0].user_id}) status updated`
        });
        return res.status(200).json({
            success: true,
            message: "User status updated successfully",
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update user status"
        });
    }
};

const getUserById = async (req, res) => {
    try {
        // Only DBA and Admin can view user details
        if (req.user.role !== "dba" && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const { user_id } = req.params;

        if (!user_id || isNaN(user_id)) {
            return res.status(400).json({
                success: false,
                message: "Valid user_id is required"
            });
        }

        const query = `
            SELECT
                user_id,
                username,
                role,
                state_id,
                state,
                district_id,
                district,
                tehsil_id,
                tehsil,
                status
            FROM vw_app_users
            WHERE user_id = ?
        `;

        const db = getReadDatabase().promise();

        const [users] = await db.query(query, [user_id]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = users[0];
        return res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user"
        });
    }
};

module.exports = {
    addAppUser, addUser, getUsers, deleteUser,updateUserStatus, getUserById
};