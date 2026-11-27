
const express = require("express");

const router = express.Router();

const {
    getMyRefunds,
    getMyRefundById
} = require("../controllers/refundController");

const { protect } = require("../middleware/authMiddleware");

// All refund routes require authentication
router.use(protect);

// Get all refunds belonging to the logged-in customer
router.get("/", getMyRefunds);

// Get details of a specific refund
router.get("/:refundId", getMyRefundById);

module.exports = router;
