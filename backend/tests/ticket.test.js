
const request = require("supertest");
const app = require("../server");
const pool = require("../config/db");

describe("Support Ticket API Tests", () => {
    let customerToken;
    let customerId;
    let ticketId;
    let testEmail;

    const password = "TestPassword@123";

    beforeAll(async () => {
        testEmail = `ticket_test_${Date.now()}@example.com`;

        // Register a test customer
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Ticket Test Customer",
                email: testEmail,
                password
            });

        expect(registerResponse.statusCode).toBe(201);

        customerToken = registerResponse.body.token;
        customerId = registerResponse.body.user.id;
    });

    afterAll(async () => {
        // Delete test tickets belonging to this customer
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

        await pool.end();
    });

    // TEST 1: Create a support ticket
    test("POST /api/tickets - should create a ticket successfully", async () => {
        const response = await request(app)
            .post("/api/tickets")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                subject: "Damaged Product",
                description: "My laptop arrived damaged.",
                category: "Electronics"
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.ticket).toBeDefined();

        expect(response.body.ticket.subject).toBe("Damaged Product");
        expect(response.body.ticket.customer_id).toBe(customerId);
        expect(response.body.ticket.status).toBe("open");

        ticketId = response.body.ticket.id;
    });

    // TEST 2: Reject ticket creation without required fields
    test("POST /api/tickets - should reject missing subject and description", async () => {
        const response = await request(app)
            .post("/api/tickets")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                category: "Electronics"
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
    });

    // TEST 3: Retrieve customer's tickets
    test("GET /api/tickets - should retrieve customer's tickets", async () => {
        const response = await request(app)
            .get("/api/tickets")
            .set("Authorization", `Bearer ${customerToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.tickets).toBeInstanceOf(Array);

        const createdTicket = response.body.tickets.find(
            ticket => ticket.id === ticketId
        );

        expect(createdTicket).toBeDefined();
    });

    // TEST 4: Retrieve a specific ticket
    test("GET /api/tickets/:id - should retrieve the customer's ticket", async () => {
        const response = await request(app)
            .get(`/api/tickets/${ticketId}`)
            .set("Authorization", `Bearer ${customerToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.ticket.id).toBe(ticketId);
    });

    // TEST 5: Reject access without authentication
    test("GET /api/tickets - should reject unauthenticated requests", async () => {
        const response = await request(app)
            .get("/api/tickets");

        expect(response.statusCode).toBe(401);
    });

    // TEST 6: Reject access to a ticket that does not belong to the customer
    test("GET /api/tickets/:id - should reject access to another customer's ticket", async () => {
        const response = await request(app)
            .get("/api/tickets/999999999")
            .set("Authorization", `Bearer ${customerToken}`);

        expect(response.statusCode).toBe(404);
        expect(response.body.success).toBe(false);
    });
});
