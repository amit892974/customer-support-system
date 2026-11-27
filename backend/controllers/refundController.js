
const pool = require("../config/db");

// ============================================
// 1. Get all refunds belonging to the customer
// ============================================

const getMyRefunds = async (req, res) => {
    try {
        const customerId = req.user.id;

        const result = await pool.query(
            `SELECT
                r.id AS refund_id,
                r.order_id,
                r.ticket_id,
                r.amount,
                r.reason,
                r.status,
                r.created_at,
                r.reviewed_at,
                o.item_name,
                o.total_amount AS order_amount
             FROM refunds r
             JOIN orders o ON r.order_id = o.id
             WHERE r.requested_by = $1
             ORDER BY r.created_at DESC`,
            [customerId]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            refunds: result.rows
        });

    } catch (error) {
        console.error("Get customer refunds error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve your refund history."
        });
    }
};


// ============================================
// 2. Get details of one customer's refund
// ============================================

const getMyRefundById = async (req, res) => {
    try {
        const refundId = Number(req.params.refundId);
        const customerId = req.user.id;

        // Validate refund ID
        if (
            !Number.isSafeInteger(refundId) ||
            refundId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid refund ID."
            });
        }

        const result = await pool.query(
            `SELECT
                r.id AS refund_id,
                r.order_id,
                r.ticket_id,
                r.amount,
                r.reason,
                r.status,
                r.created_at,
                r.reviewed_at,
                o.item_name,
                o.total_amount AS order_amount
             FROM refunds r
             JOIN orders o ON r.order_id = o.id
             WHERE r.id = $1
               AND r.requested_by = $2`,
            [refundId, customerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Refund not found."
            });
        }

        return res.status(200).json({
            success: true,
            refund: result.rows[0]
        });

    } catch (error) {
        console.error("Get refund details error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve refund details."
        });
    }
};

module.exports = {
    getMyRefunds,
    getMyRefundById
};
