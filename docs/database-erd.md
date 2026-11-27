
# Database Entity Relationship Diagram (ERD)

## ER Diagram

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    USERS ||--o{ TICKETS : creates
    USERS ||--o{ REFUNDS : requests
    USERS ||--o{ TICKET_NOTES : writes
    USERS ||--o{ AUDIT_LOGS : generates

    ORDERS ||--o{ TICKETS : relates_to
    ORDERS ||--o{ REFUNDS : has

    TICKETS ||--o{ MESSAGES : contains
    TICKETS ||--o{ REFUNDS : relates_to
    TICKETS ||--o{ ESCALATIONS : generates
    TICKETS ||--o{ TICKET_NOTES : has

    USERS {
        int id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role
    }

    ORDERS {
        int id PK
        int customer_id FK
        varchar status
        date delivery_date
        decimal total_amount
        varchar item_name
        varchar category
        timestamp created_at
    }

    TICKETS {
        int id PK
        int customer_id FK
        int order_id FK
        varchar subject
        text description
        varchar category
        varchar status
        varchar priority
        timestamp created_at
        timestamp updated_at
    }

    MESSAGES {
        int id PK
        int ticket_id FK
        varchar sender_type
        text content
        timestamp created_at
    }

    REFUNDS {
        int id PK
        int order_id FK
        int ticket_id FK
        decimal amount
        text reason
        varchar status
        int requested_by FK
        int reviewed_by FK
        varchar idempotency_key UK
        timestamp created_at
        timestamp reviewed_at
    }

    ESCALATIONS {
        int id PK
        int ticket_id FK
        text summary
        varchar priority
        int assigned_to FK
        varchar decision
        text internal_note
        timestamp created_at
        timestamp updated_at
    }

    TICKET_NOTES {
        int id PK
        int ticket_id FK
        int created_by FK
        text content
        timestamp created_at
    }

    AUDIT_LOGS {
        int id PK
        int user_id FK
        varchar action
        varchar entity_type
        int entity_id
        jsonb details
        timestamp created_at
    }
```

## Table Descriptions

| Table | Purpose |
|---|---|
| USERS | Stores customer, agent and admin accounts |
| ORDERS | Stores customer order information |
| TICKETS | Stores customer support requests |
| MESSAGES | Stores customer, assistant and agent messages |
| REFUNDS | Stores refund requests and their statuses |
| ESCALATIONS | Stores requests requiring human review |
| TICKET_NOTES | Stores private internal agent notes |
| AUDIT_LOGS | Records important system activities |

## Important Relationships

1. One customer can place multiple orders.
2. One customer can create multiple support tickets.
3. One ticket can contain multiple messages.
4. One order can have multiple associated refund records.
5. One ticket can have multiple escalations and internal notes.
6. Audit logs record important actions performed by users.
