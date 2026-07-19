# Wallet & Referral Flow

Wallet lifecycle: funding sources, spend eligibility, top-up two-step flow, atomic debit guard, and referral qualification state machine.

---

## Part 1 — Wallet: Funding Sources & Spend Eligibility

```mermaid
flowchart TD
    subgraph sources["💰 Wallet Funding Sources"]
        topup_src["💳 aamarPay Top-up\n(bKash · Nagad · Rocket · Card)\nMin: ৳50 · Max: ৳100,000"]
        referral_src["🤝 Referral Reward\n৳100 per qualified referral\n(referred user spends ≥ ৳500)"]
        showcase_src["📣 Showcase Reward\nLinkedIn / Twitter → ৳30\nFacebook / Instagram → ৳20\n(after 10-day cron verification)"]
    end

    topup_src --> wallet
    referral_src --> wallet
    showcase_src --> wallet

    wallet[("💰 User Wallet\nbalance_bdt · lifetime_earned · lifetime_spent\n(cash-in only — no cash-out)")]

    wallet --> spend{"Spend\nWallet Balance"}

    spend -->|"✅ Allowed"| eligible_products
    spend -.->|"❌ Blocked\n(requiresGatewayPayment: true)"| gateway_products

    subgraph eligible_products["Wallet-Eligible Products"]
        paid_ch["📖 Paid Web Chapters\n৳50–৳200"]
        cert_kit["🎓 Certification Kit\n৳1,200"]
    end

    subgraph gateway_products["Gateway-Only Products\n(no wallet — includes PDF download)"]
        ebook_pdf["📕 Premium E-Book PDF\n৳600–৳1,800\nisPremiumPdfProduct() = true"]
    end
```

---

## Part 2 — Wallet Top-Up: Two-Step Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant F as ▲ Next.js Frontend
    participant A as 🔧 NestJS API
    participant P as 💳 aamarPay
    participant DB as 🗄️ PostgreSQL

    U->>F: Enter top-up amount (৳50–৳100,000)
    F->>A: POST /api/v1/wallet/topup {amountBdt}

    Note over A: Validate amount range\nGenerate tranId = "TOPUP-{timestamp}-{random6}"
    A->>P: Initiate Payment API {tranId, amount}
    P-->>A: {paymentUrl}
    A-->>F: {tranId, paymentUrl}
    F-->>U: Redirect to aamarPay checkout

    U->>P: Complete payment (bKash / Nagad / Card)

    alt Path A — IPN Webhook (server-to-server)
        P->>A: IPN POST /api/v1/payments/ipn {tranId, pay_status}
        Note over A: Detect top-up by tranId prefix "TOPUP-"
        A->>DB: creditTopUp(userId, amount, tranId)
        Note over DB: Prisma $transaction:\n① UPDATE wallets SET balance_bdt += amount,\n   lifetime_earned += amount\n② INSERT wallet_transactions\n   {type: TOPUP, gatewayTranId: tranId}\nP2002 unique violation → duplicate IPN silently ignored
    end

    alt Path B — User polls confirm endpoint (fallback)
        U->>F: Return to success page
        F->>A: POST /api/v1/wallet/topup/confirm {tranId}
        Note over A: Validate tranId format (regex)\nCheck existing TOPUP transaction (idempotency)
        A->>P: Search transaction API {tranId}
        P-->>A: {pay_status, status_code, cus_email, amount, mer_txnid}
        Note over A: Validate:\n① mer_txnid === tranId\n② cus_email === user.email\n③ pay_status = 'successful' OR status_code = '2'\n④ amount > 0
        A->>DB: creditTopUp(userId, amount, tranId)
        A-->>F: {status: 'CONFIRMED'} or {status: 'ALREADY_CONFIRMED'}
    end

    F->>A: GET /api/v1/wallet/balance
    A->>DB: SELECT wallet WHERE userId
    DB-->>A: {balanceBdt, lifetimeEarned, lifetimeSpent}
    A-->>F: Wallet balance updated
```

---

## Part 3 — Wallet Debit: Atomic Double-Spend Prevention

```mermaid
sequenceDiagram
    participant A as 🔧 NestJS API
    participant DB as 🗄️ PostgreSQL

    Note over A,DB: Called by OrdersService for wallet-eligible products
    A->>DB: BEGIN $transaction

    Note over DB: Atomic conditional SQL UPDATE\n(eliminates TOCTOU race condition)\nUPDATE wallets\n  SET balance_bdt    = balance_bdt - :amount,\n      lifetime_spent = lifetime_spent + :amount,\n      updated_at     = NOW()\n  WHERE user_id     = :userId\n    AND balance_bdt >= :amount

    alt Rows affected = 0 (insufficient balance)
        DB-->>A: 0 rows updated
        A-->>A: throw BadRequestException\n'Insufficient wallet balance'
    else Rows affected = 1 (success)
        DB-->>A: 1 row updated
        A->>DB: INSERT wallet_transactions\n{type: PURCHASE, amount, referenceId: orderId}
        A->>DB: COMMIT
    end
```

---

## Part 4 — Referral Qualification State Machine

```mermaid
sequenceDiagram
    participant R as 🤝 Referrer
    participant F as ▲ Next.js Frontend
    participant A as 🔧 NestJS API
    participant DB as 🗄️ PostgreSQL
    participant N as 👤 New User
    participant E as ✉️ Resend

    R->>A: GET /api/v1/referrals/code
    A->>DB: SELECT referralCode WHERE userId = R.id
    A-->>R: {referralCode, referralLink:\n"https://academy.multihat.dev/ref/{CODE}"}

    R->>N: Share referral link

    N->>A: POST /api/v1/auth/register\n{...userData, referralCode: CODE}
    A->>DB: INSERT users {referred_by_id: R.id}
    A->>DB: INSERT referrals\n{referrerId: R.id, referredUserId: N.id,\nstatus: PENDING, cumulativeSpend: 0}

    Note over N,A: New user makes purchases over time

    loop Each successful order by N
        N->>A: POST /api/v1/orders (purchase paid)
        A->>A: updateCumulativeSpend(N.id, orderAmount)
        A->>DB: SELECT referral WHERE referredUserId = N.id

        alt referral.status = CREDITED (already rewarded)
            Note over A: Early exit — idempotent, no action
        else newSpend < ৳500
            A->>DB: UPDATE referral\nSET cumulative_spend = newSpend
        else newSpend ≥ ৳500 AND rewardPaid = false
            Note over A,DB: ── 3-step state machine ──
            A->>DB: Step 1: UPDATE referral\nSET status = QUALIFIED,\n    qualified_at = now(),\n    cumulative_spend = newSpend
            A->>DB: Step 2: creditReward(R.id, ৳100,\n  type: REFERRAL_CREDIT,\n  referenceId: referral.id)\n→ UPDATE wallets SET balance_bdt += 100,\n           lifetime_earned += 100\n→ INSERT wallet_transactions\n  {type: REFERRAL_CREDIT, amount: 100}
            A->>DB: Step 3: UPDATE referral\nSET status = CREDITED,\n    reward_paid = true
            A->>E: sendReferralRewardEmail(R.email,\n  R.name, N.name, ৳100)\n(fire-and-forget — failure logged, reward already issued)
            E-->>R: 📧 "Referral reward credited — ৳100!"
        end
    end

    R->>A: GET /api/v1/referrals/stats
    A->>DB: SELECT referrals WHERE referrerId = R.id
    A-->>R: {total, pending, qualified, credited,\ntotalEarned: credited_count × ৳100}

    R->>A: GET /api/v1/wallet/transactions?page=1&limit=20
    A-->>R: Paginated transaction history\n(TOPUP · PURCHASE · REFERRAL_CREDIT · SHOWCASE_CREDIT)
```
