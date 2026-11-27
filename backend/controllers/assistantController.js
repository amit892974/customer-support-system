
const pool = require("../config/db");

const {
    generateAssistantResponse
} = require("../services/assistantService");

// Handle customer messages and AI responses
const chatWithAssistant = async (req, res) => {
    try {
        const customerId = req.user.id;
        const ticketId = Number(req.params.ticketId);
        const { content } = req.body;

        // 1. Validate message
        if (
            !content ||
            typeof content !== "string" ||
            !content.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Message content is required."
            });
        }

        // 2. Validate ticket ID
        if (
            !Number.isSafeInteger(ticketId) ||
            ticketId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID."
            });
        }

        // 3. Verify ticket ownership
        const ticketResult = await pool.query(
            `SELECT id
             FROM tickets
             WHERE id = $1 AND customer_id = $2`,
            [ticketId, customerId]
        );

        if (ticketResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found."
            });
        }

        // 4. Save customer message
        const customerMessage = await pool.query(
            `INSERT INTO messages
             (ticket_id, sender_type, content)
             VALUES ($1, 'customer', $2)
             RETURNING *`,
            [ticketId, content.trim()]
        );

        // 5. Generate assistant response
        let assistantResult;

        try {
            assistantResult = await generateAssistantResponse(
                ticketId,
                customerId,
                content.trim()
            );
        } catch (error) {
            console.error(
                "Assistant service error:",
                error.message
            );

            assistantResult = {
                reply: "I'm sorry, but I'm temporarily unable to process your request. Please try again shortly.",
                data: null
            };
        }

        // 6. Validate assistant response
        const assistantReply =
            typeof assistantResult?.reply === "string" &&
            assistantResult.reply.trim()
                ? assistantResult.reply.trim()
                : "I'm sorry, but I couldn't generate a response. Please try again.";

        // 7. Save assistant response
        const assistantMessage = await pool.query(
            `INSERT INTO messages
             (ticket_id, sender_type, content)
             VALUES ($1, 'assistant', $2)
             RETURNING *`,
            [ticketId, assistantReply]
        );

        // 8. Return conversation response
        return res.status(200).json({
            success: true,
            customerMessage: customerMessage.rows[0],
            assistantMessage: assistantMessage.rows[0],
            assistantData: assistantResult?.data || null
        });

    } catch (error) {
        console.error(
            "Assistant controller error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to process your message."
        });
    }
};

module.exports = {
    chatWithAssistant
};
