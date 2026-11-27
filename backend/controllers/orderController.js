
const pool = require("../config/db");

// Get all orders belonging to the logged-in customer
const getMyOrders = async (req, res) => {
    try {
        const customerId = req.user.id;

        const result = await pool.query(
            `SELECT
                id,
                status,
                delivery_date,
                total_amount,
                item_name,
                category,
                created_at
             FROM orders
             WHERE customer_id = $1
             ORDER BY created_at DESC`,
            [customerId]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            orders: result.rows
        });

    } catch (error) {
        console.error("Get orders error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve orders."
        });
    }
};

// Get details of one order belonging to the logged-in customer
const getOrderById = async (req, res) => {
    try {
        const customerId = req.user.id;
        const orderId = Number(req.params.id);

        // Validate order ID
        if (
            !Number.isSafeInteger(orderId) ||
            orderId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID."
            });
        }

        const result = await pool.query(
            `SELECT
                id,
                customer_id,
                status,
                delivery_date,
                total_amount,
                item_name,
                category,
                created_at
             FROM orders
             WHERE id = $1 AND customer_id = $2`,
            [orderId, customerId]
        );

        // Order not found or does not belong to customer
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        return res.status(200).json({
            success: true,
            order: result.rows[0]
        });

    } catch (error) {
        console.error("Get order details error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve order details."
        });
    }
};

module.exports = {
    getMyOrders,
    getOrderById
};
