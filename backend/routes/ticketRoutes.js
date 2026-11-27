
const express = require("express");
const router = express.Router();

const {
    createTicket,
    getMyTickets,
    getTicketById
} = require("../controllers/ticketController");

const { protect } = require("../middleware/authMiddleware");

// All ticket routes require authentication

// Create a new ticket
router.post("/", protect, createTicket);

// Get all tickets of logged-in customer
router.get("/", protect, getMyTickets);

// Get details of a specific ticket
router.get("/:id", protect, getTicketById);

module.exports = router;
