
const express = require("express");

const router = express.Router();

const {
    chatWithAssistant
} = require("../controllers/assistantController");

const {
    protect
} = require("../middleware/authMiddleware");

// Customer AI chat endpoint
router.post("/:ticketId", protect, chatWithAssistant);

module.exports = router;
