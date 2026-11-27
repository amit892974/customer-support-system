
const pool = require("../config/db");

// Create a new support ticket
const createTicket = async (req, res) => {
    try {
        const customerId = req.user.id;
        const { orderId, subject, description, category } = req.body || {};

        // 1. Validate subject and description
        if (
            typeof subject !== "string" ||
            typeof description !== "string" ||
            !subject.trim() ||
            !description.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Subject and description are required."
            });
        }

        // 2. Validate optional order ID
        let parsedOrderId = null;

        if (
            orderId !== undefined &&
            orderId !== null &&
            orderId !== ""
        ) {
            parsedOrderId = Number(orderId);

            if (
                !Number.isSafeInteger(parsedOrderId) ||
                parsedOrderId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid order ID."
                });
            }

            // Verify that the order belongs to the logged-in customer
            const order = await pool.query(
                `SELECT id
                 FROM orders
                 WHERE id = $1 AND customer_id = $2`,
                [parsedOrderId, customerId]
            );

            if (order.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found."
                });
            }
        }

        // 3. Validate category
        if (
            category !== undefined &&
            category !== null &&
            typeof category !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket category."
            });
        }

        const normalizedCategory =
            typeof category === "string" && category.trim()
                ? category.trim().toLowerCase()
                : "general";

        // 4. Create ticket
        const result = await pool.query(
            `INSERT INTO tickets
                (customer_id, order_id, subject, description,
                 category, status, priority)
             VALUES ($1, $2, $3, $4, $5, 'open', 'medium')
             RETURNING *`,
            [
                customerId,
                parsedOrderId,
                subject.trim(),
                description.trim(),
                normalizedCategory
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Support ticket created successfully.",
            ticket: result.rows[0]
        });

    } catch (error) {
        console.error("Create ticket error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to create support ticket."
        });
    }
};

// Get all tickets belonging to the logged-in customer
const getMyTickets = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM tickets
             WHERE customer_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            tickets: result.rows
        });

    } catch (error) {
        console.error("Get tickets error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve tickets."
        });
    }
};

// Get details of one ticket belonging to the logged-in customer
const getTicketById = async (req, res) => {
    try {
        const ticketId = Number(req.params.id);

        // Validate ticket ID
        if (
            !Number.isSafeInteger(ticketId) ||
            ticketId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID."
            });
        }

        const result = await pool.query(
            `SELECT *
             FROM tickets
             WHERE id = $1 AND customer_id = $2`,
            [ticketId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found."
            });
        }

        return res.status(200).json({
            success: true,
            ticket: result.rows[0]
        });

    } catch (error) {
        console.error("Get ticket error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve ticket."
        });
    }
};

module.exports = {
    createTicket,
    getMyTickets,
    getTicketById
};
