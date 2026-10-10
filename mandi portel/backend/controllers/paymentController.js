const { getReadDatabase } = require("../services/databaserouter");

const getPaymentById = async (req, res) => {
    try {
        const paymentId = Number(req.params.payment_id);
        if (!paymentId || isNaN(paymentId)) {
            return res.status(400).json({
                success: false,
                message: "Valid payment_id is required"
            });
        }

        const readDb = getReadDatabase().promise();
        const [rows] = await readDb.query(
            `SELECT 
                payment_id,
                booking_id,
                farmer_id,
                mandi_id,
                crop_id,
                quantity_sold,
                rate_per_unit,
                total_payable_amount,
                payment_status,
                payment_date,
                created_at,
                counter_id,
                quantity_approved,
                farmer_name,
                farmer_mobile,
                crop_name,
                mandi_name
             FROM vw_payment_details
             WHERE payment_id = ?`,
            [paymentId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment record not found"
            });
        }

        const payment = rows[0];

        // Access control: verify Mandi
        if (Number(payment.mandi_id) !== Number(req.user.mandi_id)) {
            return res.status(403).json({
                success: false,
                message: "Access denied: Payment record belongs to another Mandi"
            });
        }

        // Access control: verify Counter
        const assignedCounters = Array.isArray(req.user.counter_ids) ? req.user.counter_ids : [];
        if (!assignedCounters.includes(Number(payment.counter_id))) {
            return res.status(403).json({
                success: false,
                message: "Access denied: Payment record belongs to a counter not assigned to you"
            });
        }

        return res.status(200).json({
            success: true,
            data: payment
        });
    } catch (error) {
        console.error("getPaymentById error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    getPaymentById
};
