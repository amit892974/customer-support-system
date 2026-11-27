
const pool = require("../config/db");

// AI Tool: Get order details
const get_order_details = async (orderId, customerId) => {
    try {
        // Validate order ID
        const parsedOrderId = Number(orderId);

        if (
            !Number.isSafeInteger(parsedOrderId) ||
            parsedOrderId <= 0
        ) {
            return {
                success: false,
                message: "A valid order ID is required."
            };
        }

        // Validate customer ID
        if (
            !Number.isSafeInteger(Number(customerId)) ||
            Number(customerId) <= 0
        ) {
            return {
                success: false,
                message: "A valid customer ID is required."
            };
        }

        // Retrieve order only if it belongs to the logged-in customer
        const result = await pool.query(
            `SELECT
                id,
                status,
                delivery_date,
                item_name,
                category,
                total_amount
             FROM orders
             WHERE id = $1 AND customer_id = $2`,
            [parsedOrderId, Number(customerId)]
        );

        // Order not found or does not belong to this customer
        if (result.rows.length === 0) {
            return {
                success: false,
                message: "Order not found."
            };
        }

        return {
            success: true,
            order: result.rows[0]
        };

    } catch (error) {
        console.error("Order tool error:", error.message);

        return {
            success: false,
            message: "Unable to retrieve order details."
        };
    }
};

module.exports = {
    get_order_details
};
