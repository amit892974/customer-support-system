
const express = require("express");

const router = express.Router();

const {
    getAllTickets,
    getAllEscalations,
    reviewEscalation,
    getPendingRefunds,
    reviewRefund,
    updateTicketStatus,
    addInternalNote,
    getInternalNotes
} = require("../controllers/agentController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

// Protect all agent routes
router.use(protect, authorize("agent", "admin"));


// ============================================
// Ticket management
// ============================================

router.get("/tickets", getAllTickets);

router.patch(
    "/tickets/:ticketId/status",
    updateTicketStatus
);

router.post(
    "/tickets/:ticketId/notes",
    addInternalNote
);

router.get(
    "/tickets/:ticketId/notes",
    getInternalNotes
);


// ============================================
// Escalation management
// ============================================

router.get("/escalations", getAllEscalations);

router.patch(
    "/escalations/:escalationId/review",
    reviewEscalation
);


// ============================================
// Refund management
// ============================================

router.get("/refunds/pending", getPendingRefunds);

router.patch(
    "/refunds/:refundId/review",
    reviewRefund
);


module.exports = router;
