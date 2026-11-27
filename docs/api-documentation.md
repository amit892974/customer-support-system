# REST API Documentation

## 1. Introduction

The Customer Support System backend provides REST APIs for authentication, order management, support tickets, AI conversations, refund processing, and agent operations.

**Base URL:** `http://localhost:5000/api`

### Authentication

Protected endpoints require a JWT token in the request header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

The API uses JSON for request and response bodies.

---

## 2. Authentication APIs

**Base route:** `/api/auth`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/register` | Register a new customer | Public |
| POST | `/login` | Authenticate a user and obtain JWT | Public |
| GET | `/me` | Retrieve the currently authenticated user | Authenticated |

### Register

**Request:**

```json
{
  "name": "Test Customer",
  "email": "customer@example.com",
  "password": "Password@123"
}
```

### Login

**Request:**

```json
{
  "email": "customer@example.com",
  "password": "Password@123"
}
```

---

## 3. Order APIs

**Base route:** `/api/orders`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/` | Retrieve the authenticated customer's orders | Customer |
| GET | `/:id` | Retrieve details of a specific customer order | Customer |

Customers can only access their own orders.

---

## 4. Support Ticket APIs

**Base route:** `/api/tickets`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/` | Create a support ticket | Customer |
| GET | `/` | Retrieve the customer's tickets | Customer |
| GET | `/:id` | Retrieve a specific ticket | Customer |

### Create Ticket

**Request:**

```json
{
  "subject": "Damaged Product",
  "description": "My product arrived damaged.",
  "category": "Electronics",
  "orderId": 11
}
```

---

## 5. Message APIs

**Base route:** `/api/messages`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/:ticketId` | Send a customer message | Customer |
| GET | `/:ticketId` | Retrieve conversation messages | Customer |

Messages are associated with support tickets. Customers can only access conversations belonging to their own tickets.

---

## 6. AI Assistant API

**Base route:** `/api/assistant`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/:ticketId` | Send a message to the AI support assistant | Customer |

### Send Assistant Message

**Request:**

```json
{
  "content": "I received a damaged laptop. I want a refund for order 11."
}
```

The assistant can:

- Retrieve order details.
- Search return policies.
- Process eligible refund requests.
- Escalate requests for human approval.
- Ask customers for missing information.
- Maintain conversation context using previous messages.

Refund eligibility and ownership are validated by the backend before processing.

**Implementation note:** The current assistant uses a rule-based implementation with backend tools rather than a live external LLM.

---

## 7. Refund APIs

**Base route:** `/api/refunds`

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/` | Retrieve the authenticated customer's refund history | Customer |
| GET | `/:refundId` | Retrieve details of a specific refund | Customer |

Customers can retrieve their own refund history and check individual refund request details.

### Refund Statuses

| Status | Description |
|---|---|
| pending | Refund request is awaiting processing |
| pending_review | Refund requires human approval |
| approved | Refund has been approved |
| rejected | Refund request has been rejected |
| processed | Refund has been processed by the simulated refund system |

**Note:** Refund approval and rejection are handled through the Agent APIs in Section 8.

---

## 8. Agent APIs

**Base route:** `/api/agent`

All agent endpoints require authentication and an `agent` or `admin` role.

### 8.1 Ticket Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/tickets` | Retrieve and filter support tickets | Agent/Admin |
| PATCH | `/tickets/:ticketId/status` | Update ticket status | Agent/Admin |
| POST | `/tickets/:ticketId/notes` | Add an internal note | Agent/Admin |
| GET | `/tickets/:ticketId/notes` | Retrieve internal ticket notes | Agent/Admin |

### Filter Tickets

The ticket endpoint supports the following optional query parameters:

- `status`
- `priority`
- `category`

**Example:**

```http
GET /api/agent/tickets?status=open&priority=high&category=Electronics
```

### Update Ticket Status

**Endpoint:**

```http
PATCH /api/agent/tickets/:ticketId/status
```

**Request:**

```json
{
  "status": "resolved"
}
```

Supported ticket statuses:

- `open`
- `in_progress`
- `resolved`
- `escalated`

### Add Internal Note

**Endpoint:**

```http
POST /api/agent/tickets/:ticketId/notes
```

**Request:**

```json
{
  "content": "Customer issue reviewed by the support team."
}
```

### 8.2 Escalation Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/escalations` | Retrieve escalated requests | Agent/Admin |
| PATCH | `/escalations/:escalationId/review` | Review an escalation | Agent/Admin |

### Filter Escalations

The escalation endpoint supports an optional `decision` query parameter.

Supported filter values:

- `pending`
- `approved`
- `rejected`
- `more_info`

**Example:**

```http
GET /api/agent/escalations?decision=pending
```

### Review Escalation

**Endpoint:**

```http
PATCH /api/agent/escalations/:escalationId/review
```

**Request:**

```json
{
  "decision": "approve",
  "internalNote": "Reviewed by the support team."
}
```

The `internalNote` field is optional.

Supported decisions:

- `approve`
- `reject`
- `more_info`

An escalation that has already been reviewed cannot be reviewed again.

### 8.3 Refund Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/refunds/pending` | Retrieve refunds awaiting human approval | Agent/Admin |
| PATCH | `/refunds/:refundId/review` | Approve or reject a refund | Agent/Admin |

### Review Refund

**Endpoint:**

```http
PATCH /api/agent/refunds/:refundId/review
```

**Request:**

```json
{
  "decision": "approve"
}
```

Supported decisions:

- `approve`
- `reject`

Only refunds with `pending_review` status can be reviewed. An already reviewed refund cannot be reviewed again.

---

## 9. Authorization and Security

The application implements the following security measures:

- Authentication using JSON Web Tokens (JWT).
- Password hashing using bcrypt.
- Customer ownership checks for protected resources.
- Role-based access control for agent and admin endpoints.
- Server-side validation of refund eligibility.
- Refund amounts calculated using database order information.
- Duplicate refund protection using idempotency keys.
- Database transactions for critical refund and escalation operations.
- Audit logging for important operations.
- Protection against unauthorized access to customer data.

---

## 10. Error Handling

The API returns appropriate HTTP status codes and JSON error messages.

Common status codes include:

| Status Code | Meaning |
|---|---|
| 200 | Request successful |
| 201 | Resource created successfully |
| 400 | Invalid request |
| 401 | Authentication required or invalid token |
| 403 | Access denied |
| 404 | Resource not found |
| 409 | Conflict or resource already reviewed, where applicable |
| 500 | Internal server error |

### Example Error Response

```json
{
  "success": false,
  "message": "Unable to process the request."
}
```

---

## 11. Notes

- All API endpoints use the base URL `http://localhost:5000/api` during local development.
- Protected endpoints require a valid JWT token.
- Customers can access only their own orders, tickets, messages, and refund history.
- Agents and administrators can manage tickets, review escalations, and approve or reject refunds.
- Refund processing is simulated for this assignment; no real payment transaction is performed.
- The AI assistant uses backend tools to retrieve information and perform permitted support operations.