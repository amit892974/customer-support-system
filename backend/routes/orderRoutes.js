
const express = require("express");
const router = express.Router();

const {
    getMyOrders,
    getOrderById
} = require("../controllers/orderController");

const { protect } = require("../middleware/authMiddleware");

// All routes below require a valid JWT
router.get("/", protect, getMyOrders);

router.get("/:id", protect, getOrderById);

module.exports = router;
