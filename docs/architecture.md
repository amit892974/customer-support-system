
# System Architecture

## Architecture Diagram

```mermaid
flowchart TD
    C[Customer] --> F[React Frontend]
    A[Support Agent / Admin] --> F

    F -->|REST API / Axios| B[Node.js + Express Backend]

    B --> AUTH[Authentication Middleware]
    AUTH --> CTRL[Controllers]

    CTRL --> AR[Auth Routes]
    CTRL --> OR[Order Routes]
    CTRL --> TR[Ticket Routes]
    CTRL --> MR[Message Routes]
    CTRL --> AS[Assistant Routes]
    CTRL --> RR[Refund Routes]
    CTRL --> AGR[Agent Routes]

    AS --> AIS[Assistant Service]
    AIS --> OT[Order Tools]
    AIS --> PT[Policy Tools]
    AIS --> RT[Refund Tools]
    AIS --> ET[Escalation Tools]

    OT --> DB[(PostgreSQL)]
    PT --> POLICY[Return Policy File]
    RT --> DB
    ET --> DB

    AR --> DB
    OR --> DB
    TR --> DB
    MR --> DB
    RR --> DB
    AGR --> DB
```

## Architecture Explanation

### 1. Frontend
The frontend is developed using React and Vite.

It provides separate interfaces for customers and support agents. Axios communicates with the backend through REST APIs.

### 2. Backend
The backend uses Node.js and Express.js.

It handles:
- API requests and responses.
- Authentication and authorization.
- Customer and agent operations.
- Order, ticket, message and refund management.

### 3. AI Assistant
The assistant uses a rule-based service and backend tools.

Its tools include:
- `get_order_details`
- `search_return_policy`
- `process_refund`
- `escalate_to_human`

### 4. Database
PostgreSQL stores:
- Users
- Orders
- Tickets
- Messages
- Refunds
- Escalations
- Ticket notes
- Audit logs

### 5. Security
JWT authentication and role-based authorization protect private APIs. Refund eligibility and ownership are validated by the backend.

## Request Flow

1. A customer or agent performs an action in the React application.
2. The frontend sends an API request to Express.
3. Authentication middleware verifies the user's JWT.
4. The appropriate controller processes the request.
5. Services perform business logic and interact with PostgreSQL.
6. The backend returns a response to the frontend.
