
const request = require("supertest");
const app = require("../server");
const pool = require("../config/db");

describe("Message API Tests", () => {
    let customerToken;
    let customerId;
    let ticketId;

    let anotherCustomerToken;
    let anotherCustomerId;
    let anotherTicketId;

    const password = "TestPassword@123";

    beforeAll(async () => {
        // Create first test customer
        const firstCustomer = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Message Test Customer",
                email: `message_test_${Date.now()}@example.com`,
                password
            });

        expect(firstCustomer.statusCode).toBe(201);

        customerToken = firstCustomer.body.token;
        customerId = firstCustomer.body.user.id;

        // Create first customer's ticket
        const firstTicket = await request(app)
            .post("/api/tickets")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                subject: "Message Test Ticket",
                description: "Testing message functionality",
                category: "general"
            });

        expect(firstTicket.statusCode).toBe(201);
        ticketId = firstTicket.body.ticket.id;

        // Create another customer
        const secondCustomer = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Another Test Customer",
                email: `another_message_test_${Date.now()}@example.com`,
                password
            });

        expect(secondCustomer.statusCode).toBe(201);

        anotherCustomerToken = secondCustomer.body.token;
        anotherCustomerId = secondCustomer.body.user.id;

        // Create another customer's ticket
        const secondTicket = await request(app)
            .post("/api/tickets")
            .set("Authorization", `Bearer ${anotherCustomerToken}`)
            .send({
                subject: "Another Customer Ticket",
                description: "Testing ticket ownership",
                category: "general"
            });

        expect(secondTicket.statusCode).toBe(201);
        anotherTicketId = secondTicket.body.ticket.id;
    });

    afterAll(async () => {
        // Delete messages first because they reference tickets
        if (ticketId) {
            await pool.query(
                "DELETE FROM messages WHERE ticket_id = $1",
                [ticketId]
            );
        }

        if (anotherTicketId) {
            await pool.query(
                "DELETE FROM messages WHERE ticket_id = $1",
                [anotherTicketId]
            );
        }

        // Delete test tickets
        if (customerId) {
            await pool.query(
                "DELETE FROM tickets WHERE customer_id = $1",
                [customerId]
            );

            await pool.query(
                "DELETE FROM users WHERE id = $1",
                [customerId]
            );
        }

        if (anotherCustomerId) {
            await pool.query(
                "DELETE FROM tickets WHERE customer_id = $1",
                [anotherCustomerId]
            );

            await pool.query(
                "DELETE FROM users WHERE id = $1",
                [anotherCustomerId]
            );
        }

        await pool.end();
    });

    // TEST 1: Send a message
    test("POST /api/messages/:ticketId - should send a message", async () => {
        const response = await request(app)
            .post(`/api/messages/${ticketId}`)
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                content: "Hello, I need help with my order."
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.content).toBe(
            "Hello, I need help with my order."
        );
        expect(response.body.data.sender_type).toBe("customer");
        expect(response.body.data.ticket_id).toBe(ticketId);
    });

    // TEST 2: Reject empty message
    test("POST /api/messages/:ticketId - should reject empty messages", async () => {
        const response = await request(app)
            .post(`/api/messages/${ticketId}`)
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                content: "   "
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
    });

    // TEST 3: Retrieve conversation history
    test("GET /api/messages/:ticketId - should retrieve messages", async () => {
        const response = await request(app)
            .get(`/api/messages/${ticketId}`)
            .set("Authorization", `Bearer ${customerToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.messages).toBeInstanceOf(Array);
        expect(response.body.messages.length).toBeGreaterThan(0);
        expect(response.body.messages[0].content).toBe(
            "Hello, I need help with my order."
        );
    });

    // TEST 4: Reject unauthenticated requests
    test("GET /api/messages/:ticketId - should reject requests without authentication", async () => {
        const response = await request(app)
            .get(`/api/messages/${ticketId}`);

        expect(response.statusCode).toBe(401);
    });

    // TEST 5: Reject messages for another customer's ticket
    test("POST /api/messages/:ticketId - should reject another customer's ticket", async () => {
        const response = await request(app)
            .post(`/api/messages/${anotherTicketId}`)
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                content: "Trying to access another customer's ticket."
            });

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
    });

    // TEST 6: Reject conversation history for another customer's ticket
    test("GET /api/messages/:ticketId - should reject another customer's ticket", async () => {
        const response = await request(app)
            .get(`/api/messages/${anotherTicketId}`)
            .set("Authorization", `Bearer ${customerToken}`);

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
    });
});
