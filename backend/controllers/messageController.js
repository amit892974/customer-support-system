
const pool = require("../config/db");

// Send a message in a support ticket
const sendMessage = async (req, res) => {
    try {
        const customerId = req.user.id;
        const ticketId = req.params.ticketId;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message content is required"
            });
        }

        // Verify ticket ownership
        const ticket = await pool.query(
            "SELECT id FROM tickets WHERE id = $1 AND customer_id = $2",
            [ticketId, customerId]
        );

        if (ticket.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found"
            });
        }

        const result = await pool.query(
            `INSERT INTO messages (ticket_id, sender_type, content)
             VALUES ($1, 'customer', $2)
             RETURNING *`,
            [ticketId, content.trim()]
        );

        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Send message error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to send message"
        });
    }
};

// Get conversation history for a ticket
const getMessages = async (req, res) => {
    try {
        const customerId = req.user.id;
        const ticketId = req.params.ticketId;

        // Verify ticket ownership
        const ticket = await pool.query(
            "SELECT id FROM tickets WHERE id = $1 AND customer_id = $2",
            [ticketId, customerId]
        );

        if (ticket.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found"
            });
        }

        const result = await pool.query(
            `SELECT id, ticket_id, sender_type, content, created_at
             FROM messages
             WHERE ticket_id = $1
             ORDER BY created_at ASC, id ASC`,
            [ticketId]
        );

        res.status(200).json({
            success: true,
            count: result.rows.length,
            messages: result.rows
        });

    } catch (error) {
        console.error("Get messages error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve messages"
        });
    }
};

module.exports = {
    sendMessage,
    getMessages
};
