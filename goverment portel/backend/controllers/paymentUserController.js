const { getWriteDatabase, getReadDatabase } = require("../services/databaserouter");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { generateAadhaarLookup, generateAadhaarHash } = require("../services/aadhaarSecurity");
const RecentLogs = require("../model/mongomodel/RecentLogs");

const getPaymentUsers = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "dba" && req.user.role !== "admin")) {
            return res.status(403).json({
                success: false,
                message: "Access denied: Only Admin or DBA can view Payment Users"
            });
        }

        const q = req.query || {};
        const b = req.body || {};
        const page = Math.max(parseInt(q.page || b.page) || 1, 1);
        const limit = Math.max(parseInt(q.limit || b.limit) || 10, 1);
        const offset = (page - 1) * limit;
        const state_id = q.state_id !== undefined && q.state_id !== '' ? q.state_id : b.state_id;

        let baseQuery = `FROM payment_users pu JOIN state s ON pu.state_id = s.state_id LEFT JOIN paymentuserdetails pud ON pu.payment_user_id = pud.payment_user_id WHERE 1 = 1`;
        const values = [];

        if (state_id !== undefined && state_id !== null && state_id !== '') {
            baseQuery += ` AND pu.state_id = ?`;
            values.push(Number(state_id));
        }

        const db = getReadDatabase().promise();

        // Count total matching records
        const countQuery = `SELECT COUNT(*) AS total ${baseQuery}`;
        const [countResult] = await db.query(countQuery, values);
        const total = countResult[0].total;

        // Query paginated rows
        const dataQuery = `
            SELECT
                pu.payment_user_id,
                pu.payment_user_id AS user_id,
                pu.username,
                pu.role,
                pu.permissions,
                pu.state_id,
                s.state_name AS state,
                s.state_code,
                pu.status,
                pu.created_at,
                pu.updated_at,
                pud.full_name,
                pud.phone_number,
                pud.email,
                pud.address
            ${baseQuery}
            ORDER BY pu.payment_user_id DESC
            LIMIT ? OFFSET ?
        `;
        const dataValues = [...values, limit, offset];
        const [users] = await db.query(dataQuery, dataValues);

        return res.status(200).json({
            success: true,
            page,
            limit,
            total,
            count: users.length,
            data: users
        });

    } catch (error) {
        console.error("getPaymentUsers error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch payment users"
        });
    }
};

const addPaymentUser = async (req, res) => {
    try {
        const currentUser = req.user;
        if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "dba")) {
            return res.status(403).json({
                success: false,
                message: "Access denied: Only Admin or DBA can add Payment Users"
            });
        }

        const {
            username,
            state_id,
            permissions,
            full_name,
            phone_number,
            email,
            address,
            aadhaar
        } = req.body;

        if (!username || !username.trim()) {
            return res.status(400).json({
                success: false,
                message: "Username is required"
            });
        }

        if (!state_id) {
            return res.status(400).json({
                success: false,
                message: "A Payment User must be associated with exactly one state"
            });
        }

        const cleanUsername = username.trim();
        const userPermissions = Array.isArray(permissions) && permissions.length > 0
            ? permissions
            : ["payment.read", "payment.process", "payment.update"];

        const dbRead = getReadDatabase().promise();
        const dbWrite = getWriteDatabase().promise();

        // Enforce that the assigned state exists
        const [stateRows] = await dbRead.query(
            `SELECT state_id, state_name FROM state WHERE state_id = ?`,
            [Number(state_id)]
        );

        if (stateRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "State not found"
            });
        }
        const stateName = stateRows[0].state_name;

        // Insert into dedicated payment_users table
        const query = `
            INSERT INTO payment_users (
                username,
                role,
                permissions,
                state_id,
                status
            )
            VALUES (?, 'payment_officer', ?, ?, 'active')
        `;

        const values = [
            cleanUsername,
            JSON.stringify(userPermissions),
            Number(state_id)
        ];

        const [result] = await dbWrite.query(query, values);
        const newPaymentUserId = result.insertId;

        // Insert into paymentuserdetails
        const assignedPhone = phone_number 
            ? String(phone_number).trim().replace(/\D/g, "")
            : `9803${String(newPaymentUserId).padStart(6, '0')}`;
        const userFullName = full_name ? String(full_name).trim() : `${cleanUsername} Payment Officer`;
        const userEmail = email ? String(email).trim() : `${cleanUsername.toLowerCase()}@payment.gov.in`;
        const userAddress = address ? String(address).trim() : `State Financial Treasury & MSP Settlement Division, State #${state_id}`;
        const aadhaarNum = aadhaar ? String(aadhaar).trim() : `7000${String(newPaymentUserId).padStart(8, '0')}`;
        const aadhaarLookup = generateAadhaarLookup(aadhaarNum);
        const aadhaarHash = await generateAadhaarHash(aadhaarNum);

        await dbWrite.query(
            `INSERT INTO paymentuserdetails (payment_user_id, full_name, phone_number, email, address, aadhaar_lookup, aadhaar_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), phone_number = VALUES(phone_number), email = VALUES(email), address = VALUES(address)`,
            [newPaymentUserId, userFullName, assignedPhone, userEmail, userAddress, aadhaarLookup, aadhaarHash]
        );

        try {
            await RecentLogs.create({
                user_id: currentUser.user_id,
                username: currentUser.username,
                recent_activity: `State Payment User ${cleanUsername} for ${stateName} created with 2FA authorization`
            });
        } catch (logErr) {
            console.warn("RecentLogs write skipped:", logErr.message);
        }

        return res.status(201).json({
            success: true,
            message: `State Payment User ${cleanUsername} created successfully for ${stateName}`,
            data: {
                payment_user_id: newPaymentUserId,
                user_id: newPaymentUserId,
                username: cleanUsername,
                full_name: userFullName,
                phone_number: assignedPhone,
                role: "payment_officer",
                state_id: Number(state_id),
                state_name: stateName,
                permissions: userPermissions,
                status: "active"
            }
        });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Username or phone number already exists"
            });
        }

        console.error("addPaymentUser error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updatePaymentUserStatus = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "dba" && req.user.role !== "admin")) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const paymentUserId = req.params.id;
        const { status } = req.body;

        if (!paymentUserId || isNaN(paymentUserId)) {
            return res.status(400).json({
                success: false,
                message: "Valid payment_user_id is required"
            });
        }

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be either active or inactive"
            });
        }

        const dbWrite = getWriteDatabase().promise();

        const [result] = await dbWrite.query(
            `UPDATE payment_users SET status = ? WHERE payment_user_id = ?`,
            [status, paymentUserId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment user not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: `Payment user status updated to ${status}`
        });

    } catch (error) {
        console.error("updatePaymentUserStatus error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update payment user status"
        });
    }
};

const deletePaymentUser = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "dba" && req.user.role !== "admin")) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const paymentUserId = req.params.id;

        if (!paymentUserId || isNaN(paymentUserId)) {
            return res.status(400).json({
                success: false,
                message: "Valid payment_user_id is required"
            });
        }

        const dbWrite = getWriteDatabase().promise();

        const [result] = await dbWrite.query(
            `DELETE FROM payment_users WHERE payment_user_id = ?`,
            [paymentUserId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment user not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment user deleted successfully"
        });

    } catch (error) {
        console.error("deletePaymentUser error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete payment user"
        });
    }
};

const verifyTwoFactorPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const expected = process.env.GOV_SECURITY_VERIFICATION_PASSWORD;

        if (!password || !expected || password !== expected) {
            return res.status(403).json({
                success: false,
                message: "Invalid verification password"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Verification successful"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Verification error"
        });
    }
};

module.exports = {
    getPaymentUsers,
    addPaymentUser,
    updatePaymentUserStatus,
    deletePaymentUser,
    verifyTwoFactorPassword
};
