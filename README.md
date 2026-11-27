# AI-Powered Customer Support System

A full-stack customer support platform that enables customers to manage orders, raise support tickets, communicate with an AI-powered support assistant, and request refunds. Support agents and administrators can manage tickets, review escalations, and approve or reject refund requests.

## Live Application

**Frontend:** [AI Customer Support System](https://customer-support-system-two.vercel.app/login)

**Backend:** Deployed on Render.

The frontend is hosted on Vercel, while the backend REST API is deployed separately on Render.

## Features

### Customer
- Secure registration and login.
- View personal orders and order details.
- Create and track support tickets.
- Chat with an AI-powered support assistant.
- Request refunds and view refund history.
- View refund request status.

### Support Agent / Admin
- View and filter support tickets.
- Update ticket statuses.
- Review escalated requests.
- Approve or reject refund requests.
- Add and view private internal ticket notes.

### AI Support Assistant
- Retrieve customer order details.
- Search the return policy.
- Validate and process eligible refund requests.
- Escalate requests requiring human approval.
- Maintain conversation history.
- Ask customers for missing order IDs.
- Handle invalid requests and prompt injection attempts.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Database Driver | node-postgres (`pg`) |
| Authentication | JSON Web Tokens (JWT) |
| Password Hashing | bcryptjs |
| HTTP Client | Axios |
| Styling | CSS |
| Testing | Jest, Supertest |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

## Project Structure

```text
customer-support-system/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   │   └── schema.sql
│   ├── middleware/
│   ├── policies/
│   ├── routes/
│   ├── services/
│   ├── tests/
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   └── pages/
│   ├── package.json
│   └── vite.config.js
│
├── docs/
│   ├── architecture.md
│   ├── database-erd.md
│   └── api-documentation.md
│
└── README.md
```

## Prerequisites

Make sure the following software is installed:

- Node.js and npm
- PostgreSQL
- Git

## Local Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/amit892974/customer-support-system.git
cd customer-support-system
```

### 2. Configure the PostgreSQL Database

Open PostgreSQL using pgAdmin or the PostgreSQL command line.

Create a database named:

```sql
CREATE DATABASE customer_support;
```

### 3. Create Database Tables

Navigate to the backend directory:

```bash
cd backend
```

Execute the database schema file:

```bash
psql -U postgres -d customer_support -f database/schema.sql
```

Alternatively, open `backend/database/schema.sql` in pgAdmin's Query Tool, connect to the `customer_support` database, and execute the script.

The schema creates the following tables:

- users
- orders
- tickets
- messages
- refunds
- escalations
- audit_logs
- ticket_notes

It also creates indexes to improve database query performance.

### 4. Configure the Backend

Install backend dependencies:

```bash
npm install
```

Create a `.env` file in the backend directory using `.env.example`.

Example configuration:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=customer_support
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_long_random_secret
```

Replace the database username, password, and JWT secret with your own values.

Start the backend development server:

```bash
npm run dev
```

Backend local URL:

```text
http://localhost:5000
```

### 5. Configure the Frontend

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Create a `.env` file inside the frontend directory:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend development server:

```bash
npm run dev
```

Frontend local URL:

```text
http://localhost:5173
```

Keep both frontend and backend servers running while using the local application.

## Deployment

The application is deployed using separate frontend and backend hosting services.

### Frontend Deployment — Vercel

The React frontend is hosted on Vercel.

Live URL:

https://customer-support-system-two.vercel.app/login

Frontend environment variable:

```env
VITE_API_URL=https://your-render-backend-url
```

Replace the value with the actual deployed Render backend URL.

### Backend Deployment — Render

The Node.js and Express backend is deployed as a Render Web Service.

Recommended configuration:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |

Configure the required environment variables in the Render dashboard, including:

- `PORT` (if required by the hosting configuration)
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`

Ensure that the deployed PostgreSQL database is accessible from the Render backend.

### Production Configuration

The frontend uses the `VITE_API_URL` environment variable to communicate with the deployed backend.

The production frontend must use the Render backend URL rather than `localhost`.

## Running Tests

Navigate to the backend directory:

```bash
cd backend
npm test
```

The backend automated test suite contains **29 tests** covering:

- User registration and authentication.
- Ticket creation and management.
- Message handling and authorization.
- AI assistant responses.
- Refund-related and escalation workflows.

## Production Build

Navigate to the frontend directory:

```bash
cd frontend
npm run build
```

The production build is generated in:

```text
frontend/dist/
```

## Refund Business Rules

- Customers can request refunds only for their own orders.
- Refund eligibility is validated on the backend.
- Orders must satisfy the delivery and return-policy requirements.
- Refund amounts are determined using database order information.
- Refund requests above ₹5,000 require human approval.
- Duplicate refund requests are prevented.
- Refund processing is simulated; no real payment transaction is performed.

**Note:** The current return-window implementation uses a configurable 30-day demonstration assumption. This is a project implementation choice, not a specified assignment requirement.

## Security

- Passwords are hashed before being stored.
- JWT-based authentication protects private routes.
- Role-based authorization separates customer and agent access.
- Backend validation enforces refund business rules.
- Customers cannot access other customers' orders or private agent notes.
- SQL queries use parameterized inputs.
- Sensitive environment variables are excluded from source control.

## AI Implementation

The current assistant uses a rule-based implementation with backend tools for:

- Order lookup.
- Return-policy retrieval.
- Refund processing.
- Human escalation.

It maintains conversation history and handles missing order IDs and invalid requests.

The current implementation is a simulated AI support workflow and does not depend on a live external LLM.

## API Overview

| API Route | Purpose |
|---|---|
| `/api/auth` | Registration, login and authentication |
| `/api/orders` | Customer order information |
| `/api/tickets` | Support ticket management |
| `/api/messages` | Ticket conversation history |
| `/api/assistant` | AI support conversation |
| `/api/refunds` | Customer refund history |
| `/api/agent` | Agent dashboard and management |

For detailed endpoints, request formats and response examples, refer to `docs/api-documentation.md`.

## Project Documentation

Additional project documentation:

- [System Architecture](docs/architecture.md)
- [Database ER Diagram](docs/database-erd.md)
- [API Documentation](docs/api-documentation.md)

## Important Notes

- Never commit `.env` files or real credentials.
- Refunds are simulated for demonstration purposes.
- Configure PostgreSQL before starting the backend locally.
- Both frontend and backend must be running for local application use.
- The backend is the final authority for refund eligibility and processing decisions.
- The database schema is provided in `backend/database/schema.sql` for fresh installations.

## Future Improvements

- Integrate a live Large Language Model (LLM).
- Add real payment gateway integration.
- Expand frontend and end-to-end automated testing.
- Improve monitoring, logging and production deployment.
- Add real-time communication between customers and support agents.

## Author

Developed as a full-stack customer support system project.
