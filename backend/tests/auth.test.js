
const request = require("supertest");
const app = require("../server");
const pool = require("../config/db");

describe("Authentication API Tests", () => {
    let testEmail;
    let authToken;

    const testPassword = "TestPassword@123";

    beforeAll(() => {
        // Generate a unique email for every test run
        testEmail = `test_${Date.now()}@example.com`;
    });

    afterAll(async () => {
        // Remove the test user from the database
        if (testEmail) {
            await pool.query(
                "DELETE FROM users WHERE email = $1",
                [testEmail]
            );
        }

        await pool.end();
    });

    // TEST 1: Register a new customer
    test("POST /api/auth/register - should register a new customer", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test Customer",
                email: testEmail,
                password: testPassword
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user.role).toBe("customer");

        // Password hash must never be returned
        expect(response.body.user.password_hash).toBeUndefined();

        authToken = response.body.token;
    });

    // TEST 2: Reject registration with missing fields
    test("POST /api/auth/register - should reject missing fields", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test Customer"
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
    });

    // TEST 3: Login with valid credentials
    test("POST /api/auth/login - should login successfully", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: testEmail,
                password: testPassword
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe(testEmail);

        authToken = response.body.token;
    });

    // TEST 4: Reject incorrect password
    test("POST /api/auth/login - should reject incorrect password", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: testEmail,
                password: "WrongPassword123"
            });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
    });

    // TEST 5: Access protected route with valid token
    test("GET /api/auth/me - should authenticate the user", async () => {
        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${authToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(testEmail);
    });

    // TEST 6: Reject request without token
    test("GET /api/auth/me - should reject unauthenticated requests", async () => {
        const response = await request(app)
            .get("/api/auth/me");

        expect(response.statusCode).toBe(401);
    });
});
