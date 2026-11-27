
const express = require("express");
const router = express.Router();

const {
    sendMessage,
    getMessages
} = require("../controllers/messageController");

const { protect } = require("../middleware/authMiddleware");

// Send a message to a support ticket
router.post("/:ticketId", protect, sendMessage);

// Get conversation history for a support ticket
router.get("/:ticketId", protect, getMessages);

module.exports = router;
