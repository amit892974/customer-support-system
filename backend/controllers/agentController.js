
const pool = require("../config/db");

// ============================================
// 1. Get all support tickets (Agent/Admin)
// ============================================

const getAllTickets = async (req, res) => {
    try {
        const { status, priority, category } = req.query;

        const allowedStatuses = [
            "open",
            "in_progress",
            "resolved",
            "escalated"
        ];

        const allowedPriorities = ["low", "medium", "high"];

        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket status filter."
            });
        }

        if (priority && !allowedPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket priority filter."
            });
        }

        if (category && typeof category !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket category filter."
            });
        }

        let query = `
            SELECT
                t.id,
                t.subject,
                t.description,
                t.category,
                t.status,
                t.priority,
                t.created_at,
                u.name AS customer_name,
                u.email AS customer_email,
                o.item_name AS order_item,
                o.total_amount AS order_amount
            FROM tickets t
            JOIN users u ON t.customer_id = u.id
            LEFT JOIN orders o ON t.order_id = o.id
        `;

        const conditions = [];
        const values = [];

        if (status) {
            values.push(status);
            conditions.push(`t.status = $${values.length}`);
        }

        if (priority) {
            values.push(priority);
            conditions.push(`t.priority = $${values.length}`);
        }

        if (category) {
            values.push(category);
            conditions.push(`t.category = $${values.length}`);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY t.created_at DESC";

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            tickets: result.rows
        });

    } catch (error) {
        console.error("Get tickets error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve support tickets."
        });
    }
};


// ============================================
// 2. Get all escalations (Agent/Admin)
// ============================================

const getAllEscalations = async (req, res) => {
    try {
        const { decision } = req.query;

        const allowedDecisions = [
            "pending",
            "approved",
            "rejected",
            "more_info"
        ];

        if (decision && !allowedDecisions.includes(decision)) {
            return res.status(400).json({
                success: false,
                message: "Invalid escalation decision filter."
            });
        }

        let query = `
            SELECT
                e.id,
                e.ticket_id,
                e.summary,
                e.priority,
                e.decision,
                e.internal_note,
                e.assigned_to,
                e.created_at,
                e.updated_at,
                t.subject AS ticket_subject,
                t.status AS ticket_status,
                t.customer_id,
                u.name AS customer_name,
                u.email AS customer_email,
                o.item_name,
                o.total_amount
            FROM escalations e
            JOIN tickets t ON e.ticket_id = t.id
            JOIN users u ON t.customer_id = u.id
            LEFT JOIN orders o ON t.order_id = o.id
        `;

        const values = [];

        if (decision) {
            query += " WHERE e.decision = $1";
            values.push(decision);
        }

        query += " ORDER BY e.created_at DESC";

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            escalations: result.rows
        });

    } catch (error) {
        console.error("Get escalations error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve escalations."
        });
    }
};


// ============================================
// 3. Review an escalation (Agent/Admin)
// ============================================

const reviewEscalation = async (req, res) => {
    let client;
    let transactionStarted = false;

    try {
        const escalationId = Number(req.params.escalationId);
        const { decision, internalNote } = req.body || {};
        const agentId = req.user.id;

        if (!Number.isSafeInteger(escalationId) || escalationId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid escalation ID."
            });
        }

        const allowedDecisions = [
            "approve",
            "reject",
            "more_info"
        ];

        if (!allowedDecisions.includes(decision)) {
            return res.status(400).json({
                success: false,
                message: "Decision must be approve, reject, or more_info."
            });
        }

        if (
            internalNote !== undefined &&
            (
                typeof internalNote !== "string" ||
                internalNote.trim().length > 5000
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Internal note cannot exceed 5000 characters."
            });
        }

        client = await pool.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        const escalationResult = await client.query(
            `SELECT id, ticket_id, decision
             FROM escalations
             WHERE id = $1
             FOR UPDATE`,
            [escalationId]
        );

        if (escalationResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Escalation not found."
            });
        }

        const escalation = escalationResult.rows[0];

        if (escalation.decision !== "pending") {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "This escalation has already been reviewed."
            });
        }

        const newDecision = decision === "approve"
            ? "approved"
            : decision === "reject"
                ? "rejected"
                : "more_info";

        const updatedEscalation = await client.query(
            `UPDATE escalations
             SET decision = $1,
                 assigned_to = $2,
                 internal_note = COALESCE($3, internal_note),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [
                newDecision,
                agentId,
                internalNote !== undefined ? internalNote.trim() : null,
                escalationId
            ]
        );

        await client.query(
            `INSERT INTO audit_logs
             (user_id, action, entity_type, entity_id, details)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                agentId,
                `escalation_${decision}`,
                "escalation",
                escalationId,
                JSON.stringify({
                    ticketId: escalation.ticket_id,
                    previousDecision: escalation.decision,
                    newDecision
                })
            ]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: `Escalation ${newDecision} successfully.`,
            escalation: updatedEscalation.rows[0]
        });

    } catch (error) {
        if (transactionStarted && client) {
            await client.query("ROLLBACK");
            transactionStarted = false;
        }

        console.error("Review escalation error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to review escalation."
        });

    } finally {
        if (client) {
            client.release();
        }
    }
};


// ============================================
// 4. Get pending refunds (Agent/Admin)
// ============================================

const getPendingRefunds = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                r.id AS refund_id,
                r.order_id,
                r.ticket_id,
                r.amount,
                r.reason,
                r.status,
                r.created_at,
                u.name AS customer_name,
                u.email AS customer_email,
                o.item_name
             FROM refunds r
             JOIN users u ON r.requested_by = u.id
             JOIN orders o ON r.order_id = o.id
             WHERE r.status = 'pending_review'
             ORDER BY r.created_at DESC`
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            refunds: result.rows
        });

    } catch (error) {
        console.error("Get pending refunds error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve pending refunds."
        });
    }
};


// ============================================
// 5. Approve or reject a refund (Agent/Admin)
// ============================================

const reviewRefund = async (req, res) => {
    let client;
    let transactionStarted = false;

    try {
        const refundId = Number(req.params.refundId);
        const { decision } = req.body || {};
        const agentId = req.user.id;

        if (!Number.isSafeInteger(refundId) || refundId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid refund ID."
            });
        }

        if (!["approve", "reject"].includes(decision)) {
            return res.status(400).json({
                success: false,
                message: "Decision must be approve or reject."
            });
        }

        client = await pool.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        const refundResult = await client.query(
            `SELECT id, order_id, ticket_id, amount, status
             FROM refunds
             WHERE id = $1
             FOR UPDATE`,
            [refundId]
        );

        if (refundResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Refund not found."
            });
        }

        const refund = refundResult.rows[0];

        if (refund.status !== "pending_review") {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "This refund has already been reviewed."
            });
        }

        const newStatus = decision === "approve"
            ? "approved"
            : "rejected";

        // updated_at is intentionally omitted because
        // it is not present in the refunds table schema.
        const updatedRefund = await client.query(
            `UPDATE refunds
             SET status = $1,
                 reviewed_by = $2,
                 reviewed_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [newStatus, agentId, refundId]
        );

        await client.query(
            `UPDATE escalations
             SET decision = $1,
                 assigned_to = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE ticket_id = $3
               AND decision = 'pending'`,
            [
                newStatus === "approved" ? "approved" : "rejected",
                agentId,
                refund.ticket_id
            ]
        );

        await client.query(
            `INSERT INTO audit_logs
             (user_id, action, entity_type, entity_id, details)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                agentId,
                `refund_${decision}`,
                "refund",
                refundId,
                JSON.stringify({
                    orderId: refund.order_id,
                    ticketId: refund.ticket_id,
                    amount: refund.amount,
                    previousStatus: refund.status,
                    newStatus
                })
            ]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: `Refund ${newStatus} successfully.`,
            refund: updatedRefund.rows[0]
        });

    } catch (error) {
        if (transactionStarted && client) {
            await client.query("ROLLBACK");
            transactionStarted = false;
        }

        console.error("Review refund error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to review refund."
        });

    } finally {
        if (client) {
            client.release();
        }
    }
};


// ============================================
// 6. Update ticket status (Agent/Admin)
// ============================================

const updateTicketStatus = async (req, res) => {
    let client;
    let transactionStarted = false;

    try {
        const ticketId = Number(req.params.ticketId);
        const { status } = req.body || {};

        const allowedStatuses = [
            "open",
            "in_progress",
            "resolved",
            "escalated"
        ];

        if (!Number.isSafeInteger(ticketId) || ticketId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID."
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket status."
            });
        }

        client = await pool.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        const result = await client.query(
            `UPDATE tickets
             SET status = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [status, ticketId]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Ticket not found."
            });
        }

        await client.query(
            `INSERT INTO audit_logs
             (user_id, action, entity_type, entity_id, details)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                req.user.id,
                "ticket_status_updated",
                "ticket",
                ticketId,
                JSON.stringify({ newStatus: status })
            ]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: "Ticket status updated successfully.",
            ticket: result.rows[0]
        });

    } catch (error) {
        if (transactionStarted && client) {
            await client.query("ROLLBACK");
            transactionStarted = false;
        }

        console.error("Update ticket status error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to update ticket status."
        });

    } finally {
        if (client) {
            client.release();
        }
    }
};


// ============================================
// 7. Add private internal note (Agent/Admin)
// ============================================

const addInternalNote = async (req, res) => {
    let client;
    let transactionStarted = false;

    try {
        const ticketId = Number(req.params.ticketId);
        const { content } = req.body || {};

        if (!Number.isSafeInteger(ticketId) || ticketId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID."
            });
        }

        if (
            typeof content !== "string" ||
            !content.trim() ||
            content.trim().length > 5000
        ) {
            return res.status(400).json({
                success: false,
                message: "Note must contain 1 to 5000 characters."
            });
        }

        client = await pool.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        const ticketResult = await client.query(
            "SELECT id FROM tickets WHERE id = $1",
            [ticketId]
        );

        if (ticketResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Ticket not found."
            });
        }

        const result = await client.query(
            `INSERT INTO ticket_notes
             (ticket_id, created_by, content)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [ticketId, req.user.id, content.trim()]
        );

        await client.query(
            `INSERT INTO audit_logs
             (user_id, action, entity_type, entity_id, details)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                req.user.id,
                "internal_note_added",
                "ticket",
                ticketId,
                JSON.stringify({ noteId: result.rows[0].id })
            ]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "Internal note added successfully.",
            note: result.rows[0]
        });

    } catch (error) {
        if (transactionStarted && client) {
            await client.query("ROLLBACK");
            transactionStarted = false;
        }

        console.error("Add internal note error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to add internal note."
        });

    } finally {
        if (client) {
            client.release();
        }
    }
};


// ============================================
// 8. Get private internal notes (Agent/Admin)
// ============================================

const getInternalNotes = async (req, res) => {
    try {
        const ticketId = Number(req.params.ticketId);

        if (!Number.isSafeInteger(ticketId) || ticketId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid ticket ID."
            });
        }

        const ticketResult = await pool.query(
            "SELECT id FROM tickets WHERE id = $1",
            [ticketId]
        );

        if (ticketResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Ticket not found."
            });
        }

        const result = await pool.query(
            `SELECT
                n.id,
                n.ticket_id,
                n.content,
                n.created_at,
                u.name AS agent_name
             FROM ticket_notes n
             JOIN users u ON n.created_by = u.id
             WHERE n.ticket_id = $1
             ORDER BY n.created_at ASC`,
            [ticketId]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            notes: result.rows
        });

    } catch (error) {
        console.error("Get internal notes error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve internal notes."
        });
    }
};


// ============================================
// Export controller functions
// ============================================

module.exports = {
    getAllTickets,
    getAllEscalations,
    reviewEscalation,
    getPendingRefunds,
    reviewRefund,
    updateTicketStatus,
    addInternalNote,
    getInternalNotes
};
