const { getWriteDatabase } = require("./databaserouter");
const { recordAuditLog } = require("./auditLogService");

/**
 * Valid transitions mapping:
 * current_status -> { target_status: { requiredPermission, actionName, requiresReason } }
 */
const VALID_TRANSITIONS = {
    PENDING: {
        PROCESSING: {
            requiredPermission: "payment.process",
            actionName: "MARK_PROCESSING",
            requiresReason: false
        },
        CANCELLED: {
            requiredPermission: "payment.update",
            actionName: "CANCEL_PAYMENT",
            requiresReason: true
        }
    },
    PROCESSING: {
        PAID: {
            requiredPermission: "payment.process",
            actionName: "MARK_PAID",
            requiresReason: false
        },
        FAILED: {
            requiredPermission: "payment.process",
            actionName: "MARK_FAILED",
            requiresReason: true
        }
    },
    CANCELLED: {
        PENDING: {
            requiredPermission: "payment.update",
            actionName: "RESTORE_PAYMENT",
            requiresReason: true
        },
        PROCESSING: {
            requiredPermission: "payment.process",
            actionName: "RESTORE_PAYMENT",
            requiresReason: true
        }
    },
    FAILED: {
        PENDING: {
            requiredPermission: "payment.update",
            actionName: "RETRY_PAYMENT",
            requiresReason: true
        },
        PROCESSING: {
            requiredPermission: "payment.process",
            actionName: "RETRY_PAYMENT",
            requiresReason: true
        }
    },
    PAID: {} // Terminal state: read-only
};

/**
 * Execute a payment status transition safely on PRIMARY inside a transaction with row locking.
 * 
 * @param {Object} options
 * @param {number} options.paymentId
 * @param {string} options.targetStatus
 * @param {string} [options.reason]
 * @param {Object} options.user - Authenticated payment user { payment_user_id, username, permissions, state_id }
 * @param {string} [options.ipAddress]
 */
async function transitionPaymentStatus({ paymentId, targetStatus, reason, screenshot, transactionReference, notes, user, ipAddress }) {
    if (!paymentId || isNaN(Number(paymentId))) {
        const error = new Error("Valid payment_id is required");
        error.statusCode = 400;
        throw error;
    }

    const cleanTargetStatus = String(targetStatus).toUpperCase().trim();
    const cleanPaymentId = Number(paymentId);

    // Primary database connection for transaction
    const pool = getWriteDatabase();
    const conn = await pool.promise().getConnection();

    try {
        await conn.beginTransaction();

        // 1. Row-level locking to prevent concurrent double-processing:
        // Join with farmer to verify state ownership directly inside the locked transaction
        const [rows] = await conn.query(
            `SELECT p.payment_id, p.payment_status, p.total_payable_amount, p.farmer_id, f.state_id as farmer_state_id
             FROM payment p
             JOIN farmer f ON p.farmer_id = f.farmer_id
             WHERE p.payment_id = ?
             FOR UPDATE`,
            [cleanPaymentId]
        );

        if (rows.length === 0) {
            await conn.rollback();
            const error = new Error("Payment record not found");
            error.statusCode = 404;
            throw error;
        }

        const payment = rows[0];

        // 2. Strict State Isolation Check on Primary
        if (Number(payment.farmer_state_id) !== Number(user.state_id)) {
            await conn.rollback();

            // Record unauthorized cross-state access attempt
            await recordAuditLog({
                payment_id: cleanPaymentId,
                state_id: user.state_id,
                operator_id: user.payment_user_id,
                operator_username: user.username,
                action: "UNAUTHORIZED_ACCESS_ATTEMPT",
                previous_status: payment.payment_status,
                new_status: cleanTargetStatus,
                amount: payment.total_payable_amount,
                outcome: "DENIED",
                reason: `Unauthorized attempt to transition payment belonging to state ${payment.farmer_state_id}`,
                ip_address: ipAddress
            });

            const error = new Error("Access denied: Payment record does not belong to your assigned state");
            error.statusCode = 403;
            throw error;
        }

        const currentStatus = payment.payment_status;

        // 3. Validate transition eligibility
        const allowedTargets = VALID_TRANSITIONS[currentStatus];
        if (!allowedTargets || !allowedTargets[cleanTargetStatus]) {
            await conn.rollback();
            const allowedList = allowedTargets ? Object.keys(allowedTargets).join(", ") : "None";
            const error = new Error(
                `Invalid status transition: Cannot change payment from '${currentStatus}' to '${cleanTargetStatus}'. Allowed transitions from '${currentStatus}': [${allowedList || 'Terminal'}]`
            );
            error.statusCode = 400;
            throw error;
        }

        const transitionConfig = allowedTargets[cleanTargetStatus];

        // 4. Verify user has the required permission
        const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
        if (!userPermissions.includes(transitionConfig.requiredPermission)) {
            await conn.rollback();
            const error = new Error(
                `Permission denied: Operation requires '${transitionConfig.requiredPermission}' permission`
            );
            error.statusCode = 403;
            throw error;
        }

        // 5. Verify reason requirement
        if (transitionConfig.requiresReason && (!reason || String(reason).trim() === "")) {
            await conn.rollback();
            const error = new Error(
                `Reason is mandatory for changing payment status to '${cleanTargetStatus}'`
            );
            error.statusCode = 400;
            throw error;
        }

        // 5b. Verify screenshot, UTR/transaction reference, and notes requirements when marking as PAID (all cannot be NULL)
        if (cleanTargetStatus === "PAID") {
            if (!screenshot || String(screenshot).trim() === "") {
                await conn.rollback();
                const error = new Error("Payment completion screenshot / image is mandatory and cannot be empty");
                error.statusCode = 400;
                throw error;
            }

            const cleanUtr = transactionReference ? String(transactionReference).trim() : "";
            if (!cleanUtr) {
                await conn.rollback();
                const error = new Error("Bank UTR / Transaction reference number is mandatory and cannot be empty");
                error.statusCode = 400;
                throw error;
            }

            const cleanNotes = notes || reason ? String(notes || reason).trim() : "";
            if (!cleanNotes) {
                await conn.rollback();
                const error = new Error("Payment completion notes / disbursal remarks are mandatory and cannot be empty");
                error.statusCode = 400;
                throw error;
            }
        }

        // 6. Execute update on payment table
        let updateSql = `
            UPDATE payment 
            SET payment_status = ?, 
                updated_at = CURRENT_TIMESTAMP
        `;
        const updateParams = [cleanTargetStatus];

        if (cleanTargetStatus === "PAID") {
            updateSql += `, payment_date = CURRENT_TIMESTAMP`;
        }

        updateSql += ` WHERE payment_id = ?`;
        updateParams.push(cleanPaymentId);

        await conn.query(updateSql, updateParams);

        // 6b. Persist payment completion proof in SQL table (screenshot, UTR, and notes are NOT NULL)
        if (cleanTargetStatus === "PAID") {
            const cleanUtr = String(transactionReference).trim();
            const cleanNotes = String(notes || reason).trim();
            const insertProofSql = `
                INSERT INTO payment_completion_proof 
                    (payment_id, farmer_id, operator_id, screenshot, completion_date, transaction_reference, notes)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
            `;
            await conn.query(insertProofSql, [
                cleanPaymentId,
                payment.farmer_id,
                user.payment_user_id,
                String(screenshot).trim(),
                cleanUtr,
                cleanNotes
            ]);
        }

        // Commit transaction
        await conn.commit();

        // 7. Record successful audit log in MongoDB
        const logNotes = transactionReference 
            ? `Ref: ${transactionReference}. ${reason || notes || ""}`.trim()
            : (reason || notes || null);

        await recordAuditLog({
            payment_id: cleanPaymentId,
            state_id: user.state_id,
            operator_id: user.payment_user_id,
            operator_username: user.username,
            action: transitionConfig.actionName,
            previous_status: currentStatus,
            new_status: cleanTargetStatus,
            amount: payment.total_payable_amount,
            outcome: "SUCCESS",
            reason: logNotes,
            ip_address: ipAddress
        });

        return {
            success: true,
            payment_id: cleanPaymentId,
            previous_status: currentStatus,
            new_status: cleanTargetStatus,
            total_payable_amount: payment.total_payable_amount,
            action: transitionConfig.actionName
        };
    } catch (err) {
        try {
            await conn.rollback();
        } catch (rbErr) {
            // ignore rollback error
        }
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = {
    transitionPaymentStatus,
    VALID_TRANSITIONS
};
