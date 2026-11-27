
const pool = require("../config/db");

// AI Tool: Escalate a ticket to a human agent
const escalate_to_human = async (
    ticketId,
    summary,
    priority,
    customerId
) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Validate input
        if (!ticketId || !summary?.trim()) {
            await client.query("ROLLBACK");

            return {
                success: false,
                message: "Ticket ID and summary are required."
            };
        }

        const allowedPriorities = ["low", "medium", "high"];

        const selectedPriority = allowedPriorities.includes(
            priority?.toLowerCase()
        ) ? priority.toLowerCase() : "medium";

        // 2. Verify ticket ownership
        const ticketResult = await client.query(
            `SELECT id, status
             FROM tickets
             WHERE id = $1 AND customer_id = $2
             FOR UPDATE`,
            [ticketId, customerId]
        );

        if (ticketResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return {
                success: false,
                message: "Ticket not found."
            };
        }

        // 3. Create escalation record
        const escalationResult = await client.query(
            `INSERT INTO escalations
             (ticket_id, summary, priority, decision)
             VALUES ($1, $2, $3, 'pending')
             RETURNING *`,
            [
                ticketId,
                summary.trim(),
                selectedPriority
            ]
        );

        // 4. Update ticket status
        await client.query(
            `UPDATE tickets
             SET status = 'escalated',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [ticketId]
        );

        // 5. Record audit event
        await client.query(
            `INSERT INTO audit_logs
             (user_id, action, entity_type, entity_id, details)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                customerId,
                "ticket_escalated",
                "ticket",
                ticketId,
                JSON.stringify({
                    summary: summary.trim(),
                    priority: selectedPriority
                })
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            message: "Ticket successfully escalated to human support.",
            escalation: escalationResult.rows[0]
        };

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Escalation tool error:", error.message);

        return {
            success: false,
            message: "Unable to escalate ticket."
        };

    } finally {
        client.release();
    }
};

module.exports = {
    escalate_to_human
};
