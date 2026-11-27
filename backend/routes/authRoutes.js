
const express = require("express");

const router = express.Router();

// Import controller functions
const {
    register,
    login
} = require("../controllers/authController");

// Import authentication middleware
const {
    protect
} = require("../middleware/authMiddleware");

// Registration API
router.post("/register", register);

// Login API
router.post("/login", login);

// Get logged-in user
router.get("/me", protect, (req, res) => {
    res.status(200).json({
        success: true,
        message: "User authenticated successfully",
        user: req.user
    });
});

module.exports = router;
