const { getReadDatabase } = require("../services/databaserouter");
const { applyPaymentLocationScope, validateDistrictInState, validateTehsilInDistrict } = require("../utils/locationScope");
const { resolveFarmerAadhaar } = require("../services/aadhaarService");
const { transitionPaymentStatus } = require("../services/paymentTransitionService");
const { recordAuditLog, getLogsForPayment } = require("../services/auditLogService");

async function getPayments(req, res) {
    try {
        const userScope = { state_id: req.user.state_id };
        const {
            status,
            page = 1,
            limit = process.env.DEFAULT_PAGE_SIZE || 10,
            search,
            district_id,
            tehsil_id
        } = req.query;

        const maxLimit = parseInt(process.env.MAX_PAGE_SIZE, 10) || 50;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), maxLimit);
        const offset = (pageNum - 1) * limitNum;

        const readDb = getReadDatabase().promise();

        // 1. Validate district and tehsil ownership if provided
        if (district_id) {
            const isDistrictValid = await validateDistrictInState(district_id, userScope.state_id, readDb);
            if (!isDistrictValid) {
                return res.status(403).json({
                    success: false,
                    message: "Selected district does not belong to your assigned state"
                });
            }
        }

        if (tehsil_id) {
            const isTehsilValid = await validateTehsilInDistrict(tehsil_id, district_id, userScope.state_id, readDb);
            if (!isTehsilValid) {
                return res.status(403).json({
                    success: false,
                    message: "Selected tehsil does not belong to your assigned state/district"
                });
            }
        }

        // 2. Build base query with joins
        let whereConditions = [];
        let queryParams = [];

        // Status Filter
        if (status) {
            const cleanStatus = String(status).toUpperCase().trim();
            whereConditions.push("p.payment_status = ?");
            queryParams.push(cleanStatus);
        }

        // Search Filter (Exact payment_id)
        if (search && String(search).trim() !== "") {
            const cleanSearch = String(search).trim();
            if (!/^\d+$/.test(cleanSearch)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid search parameter: Payment ID must be a numeric integer"
                });
            }
            whereConditions.push("p.payment_id = ?");
            queryParams.push(Number(cleanSearch));
        }

        const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

        const locationColumnConfig = {
            stateCol: "p.farmer_state_id",
            districtCol: "p.farmer_district_id",
            tehsilCol: "p.farmer_tehsil_id"
        };

        // Count Query using vw_payment_details view
        const countBaseQuery = `
            SELECT COUNT(*) AS total
            FROM vw_payment_details p
            ${whereSql}
        `;

        const scopedCount = applyPaymentLocationScope(
            countBaseQuery,
            queryParams,
            userScope,
            { district_id, tehsil_id },
            locationColumnConfig
        );

        const [countResult] = await readDb.query(scopedCount.query, scopedCount.values);
        const totalRecords = countResult[0]?.total || 0;

        // Data Query using vw_payment_details view
        const dataBaseQuery = `
            SELECT 
                p.payment_id,
                p.booking_id,
                p.farmer_id,
                p.mandi_id,
                p.crop_id,
                p.quantity_sold,
                p.rate_per_unit,
                p.total_payable_amount,
                p.payment_status,
                p.payment_date,
                p.created_at,
                p.updated_at,
                p.farmer_name,
                p.farmer_mobile,
                p.farmer_state_id,
                p.farmer_district_id,
                p.farmer_tehsil_id,
                p.farmer_district_name,
                p.farmer_tehsil_name,
                p.crop_name,
                p.mandi_name
            FROM vw_payment_details p
            ${whereSql}
            ORDER BY p.payment_id DESC
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...queryParams, limitNum, offset];

        const scopedData = applyPaymentLocationScope(
            dataBaseQuery,
            dataParams,
            userScope,
            { district_id, tehsil_id },
            locationColumnConfig
        );

        const [records] = await readDb.query(scopedData.query, scopedData.values);

        return res.status(200).json({
            success: true,
            data: records,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalRecords: totalRecords,
                totalPages: Math.ceil(totalRecords / limitNum) || 1
            }
        });
    } catch (err) {
        console.error("[getPayments Error]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve payments"
        });
    }
}
async function getPaymentById(req, res) {
    try {
        const paymentId = Number(req.params.payment_id);
        const userStateId = Number(req.user.state_id);

        if (!paymentId || isNaN(paymentId)) {
            return res.status(400).json({
                success: false,
                message: "Valid numeric payment_id is required"
            });
        }

        const readDb = getReadDatabase().promise();

        // 1. Fetch Primary Payment & Related Join Information using vw_payment_details view
        const [paymentRows] = await readDb.query(
            `SELECT * FROM vw_payment_details WHERE payment_id = ?`,
            [paymentId]
        );

        if (paymentRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment record not found"
            });
        }

        const raw = paymentRows[0];

        // 2. Strict State Isolation Check
        if (Number(raw.farmer_state_id) !== userStateId) {
            // Unauthorized access attempt: record in MongoDB
            await recordAuditLog({
                payment_id: paymentId,
                state_id: userStateId,
                operator_id: req.user.payment_user_id,
                operator_username: req.user.username,
                action: "UNAUTHORIZED_ACCESS_ATTEMPT",
                outcome: "DENIED",
                reason: `Unauthorized attempt to view payment belonging to state ${raw.farmer_state_id}`,
                ip_address: req.ip || null
            });

            return res.status(403).json({
                success: false,
                message: "Access denied: Payment record belongs to another state"
            });
        }

        // 3. Resolve Authorized Aadhaar Details using blind index + pepper
        const aadhaarInfo = resolveFarmerAadhaar(raw.farmer_id, raw.aadhaar_lookup);

        // 4. Fetch Bank Account Details
        const [bankRows] = await readDb.query(
            `SELECT account_id, bank_name, account_number, ifsc_code, verification_status, created_at
             FROM bank_account
             WHERE farmer_id = ?
             ORDER BY account_id DESC
             LIMIT 1`,
            [raw.farmer_id]
        );

        // 5. Fetch Farmer Land Details using existing vw_farmer_land_details view
        const [landRows] = await readDb.query(
            `SELECT land_id, area, ownership_type, land_type, land_verification, land_verified_at, created_at
             FROM vw_farmer_land_details
             WHERE farmer_id = ?
             ORDER BY land_id ASC`,
            [raw.farmer_id]
        );

        // 6. Fetch Queue Token Details using existing vw_farmer_token_details view
        const [tokenRows] = await readDb.query(
            `SELECT token_id, token_number, service_date, queue_position, token_status AS status, issued_at, called_at, completion_time
             FROM vw_farmer_token_details
             WHERE booking_id = ?
             LIMIT 1`,
            [raw.booking_id]
        );

        // 7. Fetch Audit Trail from MongoDB
        const auditLogs = await getLogsForPayment(paymentId);

        // 7b. Fetch Payment Completion Proof (Screenshot & Reference)
        const [proofRows] = await readDb.query(
            `SELECT proof_id, operator_id, screenshot, completion_date, transaction_reference, notes, created_at
             FROM payment_completion_proof
             WHERE payment_id = ?
             ORDER BY proof_id DESC
             LIMIT 1`,
            [paymentId]
        );

        // 7c. Fetch Mandi counter user details (already joined in vw_payment_details, with fallback to vw_mandi_counter_users)
        let generatingCounterUser = null;
        if (raw.counter_user_id) {
            generatingCounterUser = {
                user_id: raw.counter_user_id,
                name: raw.counter_user_name || "Mandi Counter Operator",
                phone_number: raw.counter_user_phone || "N/A",
                email: raw.counter_user_email || "N/A",
                address: raw.counter_user_address || "Mandi Operational Yard Complex",
                counter_id: raw.counter_id,
                counter_number: raw.counter_number,
                counter_name: raw.counter_name,
                mandi_id: raw.mandi_id,
                mandi_name: raw.mandi_name,
                mandi_location: [raw.mandi_district_name, raw.mandi_state_name].filter(Boolean).join(", ") || `${raw.mandi_district_name || ""}, ${raw.mandi_state_name || ""}`.trim()
            };
        } else if (raw.counter_id) {
            // Safe fallback: match user assigned to counter using vw_mandi_counter_users view
            const [fallbackUser] = await readDb.query(
                `SELECT user_id, full_name, phone_number, email, address, counter_id, counter_number, counter_name, mandi_id, mandi_name, mandi_district_name, mandi_state_name
                 FROM vw_mandi_counter_users
                 WHERE counter_id = ?
                 LIMIT 1`,
                [raw.counter_id]
            );
            if (fallbackUser.length > 0) {
                const fu = fallbackUser[0];
                generatingCounterUser = {
                    user_id: fu.user_id,
                    name: fu.full_name || "Mandi Counter Operator",
                    phone_number: fu.phone_number || "N/A",
                    email: fu.email || "N/A",
                    address: fu.address || "Mandi Operational Yard Complex",
                    counter_id: raw.counter_id,
                    counter_number: raw.counter_number,
                    counter_name: raw.counter_name,
                    mandi_id: raw.mandi_id,
                    mandi_name: raw.mandi_name,
                    mandi_location: [fu.mandi_district_name, fu.mandi_state_name].filter(Boolean).join(", ") || `${raw.mandi_district_name || ""}, ${raw.mandi_state_name || ""}`.trim()
                };
            }
        }

        // Non-blocking log of view action
        recordAuditLog({
            payment_id: paymentId,
            state_id: userStateId,
            operator_id: req.user.payment_user_id,
            operator_username: req.user.username,
            action: "VIEW_PAYMENT",
            outcome: "SUCCESS",
            amount: raw.total_payable_amount,
            ip_address: req.ip || null
        }).catch(() => {});

        // Build clean response structure
        const paymentDetail = {
            payment: {
                payment_id: raw.payment_id,
                booking_id: raw.booking_id,
                farmer_id: raw.farmer_id,
                mandi_id: raw.mandi_id,
                crop_id: raw.crop_id,
                quantity_sold: raw.quantity_sold,
                rate_per_unit: raw.rate_per_unit,
                total_payable_amount: raw.total_payable_amount,
                payment_status: raw.payment_status,
                payment_date: raw.payment_date,
                created_at: raw.created_at,
                updated_at: raw.updated_at
            },
            farmer: {
                farmer_id: raw.farmer_id,
                name: raw.farmer_name,
                mobile_number: raw.farmer_mobile,
                email: raw.farmer_email,
                address: raw.farmer_address,
                state_name: raw.farmer_state_name,
                district_name: raw.farmer_district_name,
                tehsil_name: raw.farmer_tehsil_name,
                aadhaar_number: aadhaarInfo.displayAadhaar, // Full 12-digit authorized format
                aadhaar_verified: Boolean(raw.aadhaar_verified),
                registration_date: raw.farmer_registration_date,
                status: raw.farmer_status,
                verification_status: Boolean(raw.farmer_verification_status)
            },
            bank: bankRows[0] || null,
            lands: landRows || [],
            crop: {
                crop_id: raw.crop_id,
                crop_name: raw.crop_name,
                crop_type: raw.crop_type
            },
            booking: {
                booking_id: raw.booking_id,
                session_id: raw.session_id,
                counter_id: raw.counter_id,
                quantity_req: raw.quantity_req,
                quantity_approved: raw.quantity_approved,
                booking_time: raw.booking_time,
                status: raw.booking_status,
                created_at: raw.booking_created_at
            },
            token: tokenRows[0] || null,
            mandi: {
                mandi_id: raw.mandi_id,
                mandi_name: raw.mandi_name,
                capacity: raw.mandi_capacity,
                state_name: raw.mandi_state_name || "N/A",
                district_name: raw.mandi_district_name || "N/A",
                tehsil_name: raw.mandi_tehsil_name || "N/A",
                created_at: raw.mandi_created_at
            },
            counter: raw.counter_id ? {
                counter_id: raw.counter_id,
                counter_number: raw.counter_number,
                counter_name: raw.counter_name,
                capacity_per_day: raw.counter_capacity_per_day,
                status: raw.counter_status,
                supported_crop: raw.counter_supported_crop || raw.crop_name,
                created_at: raw.counter_created_at
            } : null,
            generating_counter_user: generatingCounterUser,
            proof: proofRows[0] || null,
            auditLogs: auditLogs
        };

        return res.status(200).json({
            success: true,
            data: paymentDetail
        });
    } catch (err) {
        console.error("[getPaymentById Error]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve payment details"
        });
    }
}

/**
 * POST /api/payments/:payment_id/transition
 * Executes a status change through the centralized paymentTransitionService.
 */
async function transitionPayment(req, res) {
    try {
        const paymentId = Number(req.params.payment_id);
        const { target_status, reason, screenshot, transaction_reference, transactionReference, notes } = req.body;
        const ipAddress = req.ip || req.connection?.remoteAddress || null;

        if (!target_status) {
            return res.status(400).json({
                success: false,
                message: "target_status is required"
            });
        }

        const cleanRef = transaction_reference || transactionReference || null;

        const result = await transitionPaymentStatus({
            paymentId,
            targetStatus: target_status,
            reason,
            screenshot,
            transactionReference: cleanRef,
            notes,
            user: req.user,
            ipAddress
        });

        return res.status(200).json({
            success: true,
            message: `Payment #${paymentId} successfully transitioned to ${result.new_status}`,
            data: result
        });
    } catch (err) {
        console.error("[transitionPayment Error]:", err.message);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || "Failed to update payment status"
        });
    }
}

module.exports = {
    getPayments,
    getPaymentById,
    transitionPayment
};
