
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT token
const generateToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured.");
    }

    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d"
        }
    );
};

// REGISTER USER
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body || {};

        // 1. Validate input fields
        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        // 2. Validate name and email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            normalizedName.length > 100 ||
            !emailRegex.test(normalizedEmail)
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid name and email."
            });
        }

        // 3. Validate password
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters."
            });
        }

        // 4. Check whether email already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already registered."
            });
        }

        // 5. Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 6. Create customer account
        const result = await pool.query(
            `INSERT INTO users
                (name, email, password_hash, role)
             VALUES ($1, $2, $3, 'customer')
             RETURNING id, name, email, role, created_at`,
            [normalizedName, normalizedEmail, hashedPassword]
        );

        const user = result.rows[0];

        // 7. Generate JWT
        const token = generateToken(user);

        return res.status(201).json({
            success: true,
            message: "Registration successful.",
            token,
            user
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        // Handle duplicate email (including concurrent registrations)
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Email already registered."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};

// LOGIN USER
const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        // 1. Validate input
        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 2. Find user by email
        const result = await pool.query(
            `SELECT
                id,
                name,
                email,
                password_hash,
                role
             FROM users
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = result.rows[0];

        // 3. Verify password
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // 4. Generate JWT
        const token = generateToken(user);

        // 5. Return authenticated user
        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};

module.exports = {
    register,
    login
};
