
-- =====================================================
-- AI-POWERED CUSTOMER SUPPORT SYSTEM
-- PostgreSQL Database Schema
-- Database: customer_support
-- =====================================================

-- 1. USERS TABLE
-- Stores customers, agents and administrators

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'customer'
        CHECK (role IN ('customer', 'agent', 'admin')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 2. ORDERS TABLE
-- Stores customer order information

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,

    customer_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    status VARCHAR(50) NOT NULL,
    delivery_date DATE,
    total_amount NUMERIC(12, 2) NOT NULL
        CHECK (total_amount >= 0),

    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 3. TICKETS TABLE
-- Stores customer support tickets

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,

    customer_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    order_id INTEGER
        REFERENCES orders(id) ON DELETE SET NULL,

    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',

    status VARCHAR(30) NOT NULL DEFAULT 'open'
        CHECK (
            status IN (
                'open',
                'in_progress',
                'resolved',
                'escalated'
            )
        ),

    priority VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 4. MESSAGES TABLE
-- Stores customer, assistant and agent messages

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,

    ticket_id INTEGER NOT NULL
        REFERENCES tickets(id) ON DELETE CASCADE,

    sender_type VARCHAR(20) NOT NULL
        CHECK (
            sender_type IN ('customer', 'assistant', 'agent')
        ),

    content TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 5. REFUNDS TABLE
-- Stores refund requests and their review status

CREATE TABLE IF NOT EXISTS refunds (
    id SERIAL PRIMARY KEY,

    order_id INTEGER NOT NULL
        REFERENCES orders(id),

    ticket_id INTEGER NOT NULL
        REFERENCES tickets(id),

    amount NUMERIC(12, 2) NOT NULL
        CHECK (amount >= 0),

    reason TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'pending_review',
                'approved',
                'rejected',
                'processed'
            )
        ),

    requested_by INTEGER NOT NULL
        REFERENCES users(id),

    reviewed_by INTEGER
        REFERENCES users(id),

    idempotency_key VARCHAR(255) UNIQUE NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);


-- 6. ESCALATIONS TABLE
-- Stores requests that require human intervention

CREATE TABLE IF NOT EXISTS escalations (
    id SERIAL PRIMARY KEY,

    ticket_id INTEGER NOT NULL
        REFERENCES tickets(id) ON DELETE CASCADE,

    summary TEXT NOT NULL,

    priority VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),

    assigned_to INTEGER
        REFERENCES users(id),

    decision VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (
            decision IN (
                'pending',
                'approved',
                'rejected',
                'more_info'
            )
        ),

    internal_note TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 7. AUDIT LOGS TABLE
-- Tracks important system and agent activities

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,

    user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER,

    details JSONB DEFAULT '{}'::JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 8. TICKET NOTES TABLE
-- Stores private notes written by support agents

CREATE TABLE IF NOT EXISTS ticket_notes (
    id SERIAL PRIMARY KEY,

    ticket_id INTEGER NOT NULL
        REFERENCES tickets(id) ON DELETE CASCADE,

    created_by INTEGER NOT NULL
        REFERENCES users(id),

    content TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- INDEXES
-- Improve frequently used database queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_orders_customer_id
ON orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_tickets_customer_id
ON tickets(customer_id);

CREATE INDEX IF NOT EXISTS idx_tickets_order_id
ON tickets(order_id);

CREATE INDEX IF NOT EXISTS idx_tickets_status
ON tickets(status);

CREATE INDEX IF NOT EXISTS idx_messages_ticket_id
ON messages(ticket_id);

CREATE INDEX IF NOT EXISTS idx_refunds_requested_by
ON refunds(requested_by);

CREATE INDEX IF NOT EXISTS idx_refunds_order_id
ON refunds(order_id);

CREATE INDEX IF NOT EXISTS idx_refunds_status
ON refunds(status);

CREATE INDEX IF NOT EXISTS idx_escalations_ticket_id
ON escalations(ticket_id);

CREATE INDEX IF NOT EXISTS idx_escalations_decision
ON escalations(decision);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket_id
ON ticket_notes(ticket_id);


-- =====================================================
-- SCHEMA CREATION COMPLETED
-- =====================================================

