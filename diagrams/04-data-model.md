# Data Model

PostgreSQL schema managed by Prisma ORM. All tables use UUID primary keys and automatic timestamps.

```mermaid
erDiagram
    users ||--o{ orders : places
    users ||--o{ quiz_attempts : takes
    users ||--o{ certificates : earns
    books ||--o{ orders : purchased_in
    books ||--o{ quiz_questions : contains
    books ||--o{ quiz_attempts : assessed_by
    quiz_attempts ||--o| certificates : results_in
    coupons ||--o{ orders : applied_to

    users {
        uuid id PK
        string email UK
        string hashed_password
        string name
        enum role "USER | ADMIN"
        timestamp created_at
        timestamp updated_at
    }

    books {
        uuid id PK
        string title
        string slug UK
        text description
        decimal price
        json chapter_metadata
        boolean is_published
        timestamp created_at
        timestamp updated_at
    }

    orders {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        uuid coupon_id FK "nullable"
        decimal amount
        decimal discount_applied
        enum status "PENDING | PAID | FAILED | REFUNDED"
        string aamarpay_tran_id
        json gateway_response
        timestamp created_at
        timestamp updated_at
    }

    quiz_questions {
        uuid id PK
        uuid book_id FK
        text prompt
        json options "array of strings"
        string correct_answer
        int sort_order
    }

    quiz_attempts {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        json selected_answers
        int score
        int total_questions
        enum result "PASS | FAIL"
        timestamp created_at
    }

    certificates {
        uuid id PK
        uuid user_id FK
        uuid quiz_attempt_id FK
        string certificate_id UK "UUID v4"
        string holder_name
        string course_title
        date issue_date
        boolean is_valid
        timestamp created_at
    }

    coupons {
        uuid id PK
        string code UK
        enum discount_type "PERCENTAGE | FIXED"
        decimal discount_value
        date valid_from
        date valid_until
        int usage_limit
        int usage_count
        boolean is_active
        timestamp created_at
    }
```
