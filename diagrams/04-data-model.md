# Data Model

PostgreSQL schema managed by Prisma ORM. All primary keys are UUIDs (`@id @default(uuid()) @db.Uuid`). All timestamps are `DateTime` (`@default(now())` and `@updatedAt` where noted).

## Enums

| Enum | Values |
|:-----|:-------|
| `Role` | `USER` · `ADMIN` |
| `OrderStatus` | `PENDING` · `PAID` · `FAILED` · `REFUNDED` |
| `PaymentMethod` | `GATEWAY` · `WALLET` |
| `DiscountType` | `PERCENTAGE` · `FIXED` |
| `QuizResult` | `PASS` · `FAIL` |
| `ReferralStatus` | `PENDING` · `QUALIFIED` · `CREDITED` |
| `ShowcasePlatform` | `LINKEDIN` · `TWITTER` · `FACEBOOK` · `INSTAGRAM` |
| `ShowcaseStatus` | `PENDING` · `VERIFIED` · `REJECTED` |
| `WalletTransactionType` | `TOPUP` · `PURCHASE` · `REFERRAL_CREDIT` · `SHOWCASE_CREDIT` |

## Entity Relationship Diagram

```mermaid
erDiagram
    %% ── User-centric relationships ──────────────────────────────────
    users ||--o{ orders           : "places"
    users ||--o{ quiz_attempts    : "takes"
    users ||--o{ certificates     : "earns"
    users ||--||  wallets         : "has (1 : 1)"
    users ||--o{ referrals        : "refers (as referrer)"
    users ||--o|  referrals       : "referred_by (at most one)"
    users ||--o{ social_showcases : "submits"

    %% ── Book-centric relationships ──────────────────────────────────
    books ||--o{ orders           : "purchased_in"
    books ||--o{ quiz_questions   : "contains"
    books ||--o{ quiz_attempts    : "assessed_by"

    %% ── Cross-domain relationships ──────────────────────────────────
    quiz_attempts  ||--o|  certificates        : "results_in (0 or 1)"
    certificates   ||--o{  social_showcases    : "showcased_on"
    coupons        ||--o{  orders              : "applied_to (onDelete: SetNull)"
    wallets        ||--o{  wallet_transactions : "logs"

    users {
        uuid      id              PK
        string    email           UK
        string    hashed_password
        string    name
        Role      role            "default: USER"
        string    referral_code   UK  "auto-UUID @default(uuid())"
        uuid      referred_by_id  FK  "nullable"
        timestamp created_at      "default: now()"
        timestamp updated_at      "@updatedAt"
    }

    books {
        uuid      id               PK
        string    title
        string    slug             UK
        text      description      "@db.Text"
        decimal   price            "Decimal(10,2)"
        json      chapter_metadata "[ {index, title, isFree} ]"
        boolean   is_published     "default: false"
        timestamp created_at       "default: now()"
        timestamp updated_at       "@updatedAt"
    }

    orders {
        uuid          id                PK
        uuid          user_id           FK   "onDelete: Cascade"
        uuid          book_id           FK   "onDelete: Cascade"
        uuid          coupon_id         FK   "nullable — onDelete: SetNull"
        decimal       amount            "Decimal(10,2) — final charged amount"
        decimal       discount_applied  "Decimal(10,2) — default: 0"
        OrderStatus   status            "default: PENDING"
        PaymentMethod payment_method    "default: GATEWAY"
        string        aamarpay_tran_id  UK   "nullable — IPN idempotency key"
        json          gateway_response  "nullable — full IPN payload"
        boolean       includes_pdf      "default: false"
        timestamp     created_at        "default: now()"
        timestamp     updated_at        "@updatedAt"
    }

    quiz_questions {
        uuid   id             PK
        uuid   book_id        FK   "onDelete: Cascade"
        text   prompt         "@db.Text"
        json   options        "string[] array"
        string correct_answer
        int    sort_order
    }

    quiz_attempts {
        uuid       id               PK
        uuid       user_id          FK   "onDelete: Cascade"
        uuid       book_id          FK   "onDelete: Cascade"
        json       selected_answers "{questionId: answer}"
        int        score
        int        total_questions
        QuizResult result
        timestamp  created_at       "default: now()"
    }

    certificates {
        uuid      id              PK
        uuid      user_id         FK   "onDelete: Cascade"
        uuid      quiz_attempt_id FK   "unique — onDelete: Cascade"
        string    certificate_id  UK   "public verify token — @default(uuid())"
        string    holder_name
        string    course_title
        date      issue_date      "@db.Date (date only, no time) — default: now()"
        boolean   is_valid        "default: true — false = admin-revoked"
        timestamp created_at      "default: now()"
    }

    coupons {
        uuid         id             PK
        string       code           UK
        DiscountType discount_type
        decimal      discount_value "Decimal(10,2)"
        timestamp    valid_from
        timestamp    valid_until
        int          usage_limit
        int          usage_count    "default: 0"
        boolean      is_active      "default: true"
        boolean      includes_pdf   "default: false — grants PDF on redemption"
        timestamp    created_at     "default: now()"
    }

    wallets {
        uuid      id              PK
        uuid      user_id         UK   "unique 1:1 — onDelete: Cascade"
        decimal   balance_bdt     "Decimal(10,2) — default: 0"
        decimal   lifetime_earned "Decimal(10,2) — default: 0"
        decimal   lifetime_spent  "Decimal(10,2) — default: 0"
        timestamp created_at      "default: now()"
        timestamp updated_at      "@updatedAt"
    }

    wallet_transactions {
        uuid                  id               PK
        uuid                  wallet_id        FK   "onDelete: Cascade"
        string                gateway_tran_id  UK   "nullable — top-up idempotency key"
        WalletTransactionType type
        decimal               amount           "Decimal(10,2)"
        string                description
        uuid                  reference_id     "nullable — order / referral / showcase id"
        timestamp             created_at       "default: now()"
    }

    referrals {
        uuid           id               PK
        uuid           referrer_id      FK   "onDelete: Cascade"
        uuid           referred_user_id FK   "unique — onDelete: Cascade"
        ReferralStatus status           "default: PENDING"
        decimal        cumulative_spend "Decimal(10,2) — default: 0"
        boolean        reward_paid      "default: false"
        timestamp      created_at       "default: now()"
        timestamp      qualified_at     "nullable — set when spend >= 500 BDT"
    }

    social_showcases {
        uuid             id             PK
        uuid             user_id        FK   "onDelete: Cascade"
        uuid             certificate_id FK   "onDelete: Cascade"
        ShowcasePlatform platform
        string           post_url
        ShowcaseStatus   status         "default: PENDING"
        decimal          reward_amount  "Decimal(10,2) — baked in at submission"
        timestamp        submitted_at   "default: now()"
        timestamp        verify_after   "submitted_at + 10 days (set in service)"
        timestamp        verified_at    "nullable — set on VERIFIED or REJECTED"
        timestamp        created_at     "default: now()"
    }
```

## Constraints & Cascade Rules

| Table | Column / Index | Type | Behaviour |
|:------|:--------------|:-----|:----------|
| `orders` | `coupon_id` FK | `onDelete: SetNull` | Deleting a coupon nulls `coupon_id` — order history preserved |
| `orders` | `user_id` FK | `onDelete: Cascade` | Deleting a user cascades to their orders |
| `orders` | `book_id` FK | `onDelete: Cascade` | Deleting a book cascades to its orders |
| `orders` | `aamarpay_tran_id` | `@unique` | Prevents duplicate IPN processing |
| `quiz_questions` | `book_id` FK | `onDelete: Cascade` | Deleting a book cascades to its quiz questions |
| `quiz_attempts` | `user_id` FK | `onDelete: Cascade` | Deleting a user cascades to their attempts |
| `quiz_attempts` | `book_id` FK | `onDelete: Cascade` | Deleting a book cascades to its attempts |
| `certificates` | `quiz_attempt_id` | `@unique` | One certificate per quiz attempt maximum |
| `certificates` | `quiz_attempt_id` FK | `onDelete: Cascade` | Deleting the attempt cascades to the certificate |
| `certificates` | `user_id` FK | `onDelete: Cascade` | Deleting a user cascades to their certificates |
| `coupons` | *(no FK)* | — | No cascades — referenced via `orders.coupon_id` (SetNull) |
| `wallets` | `user_id` | `@unique` | Enforces 1:1 relationship with users |
| `wallets` | `user_id` FK | `onDelete: Cascade` | Deleting a user cascades to their wallet |
| `wallet_transactions` | `wallet_id` FK | `onDelete: Cascade` | Deleting a wallet cascades to its transactions |
| `wallet_transactions` | `gateway_tran_id` | `@unique nullable` | Idempotency guard for top-up IPN webhooks (P2002 silently ignored) |
| `referrals` | `referred_user_id` | `@unique` | A user can be referred at most once |
| `referrals` | `referrer_id` FK | `onDelete: Cascade` | Deleting referrer cascades to referral records |
| `referrals` | `referred_user_id` FK | `onDelete: Cascade` | Deleting referred user cascades to referral records |
| `social_showcases` | `(user_id, certificate_id, platform)` | `@@unique` | One reward per platform per certificate per user |
| `social_showcases` | `user_id` FK | `onDelete: Cascade` | Deleting a user cascades to their showcase submissions |
| `social_showcases` | `certificate_id` FK | `onDelete: Cascade` | Deleting a certificate cascades to its showcases |

## Key Design Notes

| Concern | Detail |
|:--------|:-------|
| **All PKs** | `@id @default(uuid()) @db.Uuid` — PostgreSQL native UUID |
| **Financial fields** | All monetary values use `Decimal(10,2)` — no floating point |
| **`certificate_id` vs `id`** | `certificates.id` = internal DB PK · `certificates.certificate_id` = public verify token (also a UUID, auto-generated separately) |
| **`referral_code`** | Every user gets a unique referral code at registration — `@default(uuid())` |
| **`issue_date`** | `@db.Date` — stored as a pure date with no time component |
| **`social_showcases.reward_amount`** | Baked in at INSERT time from `PLATFORM_REWARDS` constant — not recomputed by cron |
| **`social_showcases.verified_at`** | Set on BOTH `VERIFIED` and `REJECTED` terminal states |
| **`coupons` has no `updated_at`** | Intentional — no `@updatedAt` in schema |
| **`quiz_questions` has no timestamps** | Intentional — no `created_at` or `updated_at` in schema |
| **Wallet debit atomicity** | Uses raw SQL `UPDATE wallets SET balance_bdt = balance_bdt - :amt WHERE balance_bdt >= :amt` — eliminates TOCTOU race |
