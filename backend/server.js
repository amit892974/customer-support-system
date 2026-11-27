
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables first
dotenv.config();

// Import database and routes
const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const messageRoutes = require("./routes/messageRoutes");
const assistantRoutes = require("./routes/assistantRoutes");
const agentRoutes = require("./routes/agentRoutes");
const refundRoutes = require("./routes/refundRoutes");

const app = express();

// CORS configuration
const allowedOrigins = [
    "http://localhost:5173",
    "https://customer-support-system-two.vercel.app",
    ...(process.env.FRONTEND_URL || "")
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean)
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests without an Origin header (e.g. Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.warn("CORS blocked origin:", origin);
        return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204
}));

app.use(express.json({ limit: "10kb" }));

// Home route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Customer Support System API is running!"
    });
});

// Database connection test
app.get("/api/db-test", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT NOW() AS current_time"
        );

        res.status(200).json({
            success: true,
            message: "PostgreSQL connected successfully",
            databaseTime: result.rows[0].current_time
        });

    } catch (error) {
        console.error("Database error:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Order routes
app.use("/api/orders", orderRoutes);

// Support ticket routes
app.use("/api/tickets", ticketRoutes);

// Message routes
app.use("/api/messages", messageRoutes);

// AI Assistant routes
app.use("/api/assistant", assistantRoutes);

// Agent routes
app.use("/api/agent", agentRoutes);

// Refund routes
app.use("/api/refunds", refundRoutes);

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

async function initializeDatabase() {
    try {
        console.log("Initializing database...");

        const schemaPath = path.join(
            __dirname,
            "database",
            "schema.sql"
        );

        const schema = fs.readFileSync(schemaPath, "utf8");

        await pool.query(schema);

        console.log("Database initialized successfully!");
    } catch (error) {
        console.error("Database initialization failed:", error);
        process.exit(1);
    }
}

// Start server only when this file is executed directly
if (require.main === module) {
    const PORT = process.env.PORT || 5000;

    async function startServer() {
        try {
            await initializeDatabase();

            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        } catch (error) {
            console.error("Server startup failed:", error);
            process.exit(1);
        }
    }

    startServer();
}

// Export Express app for automated testing
module.exports = app;
