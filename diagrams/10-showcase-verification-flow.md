# Certification Showcase Verification Flow

Submission guards → DB insertion → automated nightly cron verification → platform-specific wallet credits.

---

## Part 1 — Submission Flow (User-Triggered)

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant F as ▲ Next.js Frontend
    participant A as 🔧 NestJS API
    participant DB as 🗄️ PostgreSQL

    Note over U: User holds a valid certificate

    U->>F: Navigate to Showcase tab in /dashboard
    F->>A: GET /api/v1/showcases/my
    A->>DB: SELECT social_showcases WHERE userId\nJOIN certificate {certificateId, courseTitle}
    A-->>F: All past submissions with status\n(PENDING · VERIFIED · REJECTED per platform)

    F->>A: GET /api/v1/certificates/my
    A-->>F: List of earned certificates

    U->>U: Share cert on social media\n(LinkedIn / Twitter / Facebook / Instagram)\nInclude experience, feedback, and\npublic verification link

    U->>F: Paste post URL + select platform
    F->>A: POST /api/v1/showcases/submit\n{certificateId: "UUID-string", platform, postUrl}

    Note over A: Guard 1 — SSRF allowlist check (FIRST, before DB)\nAllowed hosts: linkedin.com · twitter.com · x.com\n               facebook.com · fb.com · instagram.com\n→ 400 if host not in list

    A->>DB: SELECT certificates WHERE certificateId = "UUID-string"
    Note over A: Guard 2 — Certificate ownership check\ncert.userId !== userId → 404 "Certificate not found"\n(deliberately 404, not 403 — obfuscated)

    A->>DB: SELECT social_showcases WHERE\n@@unique [userId, certificateId, platform]
    Note over A: Guard 3 — Duplicate check\n(one reward per platform per certificate)\n→ 400 "Already submitted for this platform"

    Note over A: Compute rewardAmount from PLATFORM_REWARDS:\nLINKEDIN  → ৳30\nTWITTER   → ৳30\nFACEBOOK  → ৳20\nINSTAGRAM → ৳20\n\nverifyAfter = now + 10 days

    A->>DB: INSERT social_showcases\n{userId, certificateId (DB pk), platform, postUrl,\nstatus: PENDING,\nrewardAmount: ৳30 or ৳20  ← baked in at submission\nsubmittedAt: now,\nverifyAfter: now + 10 days}
    A-->>F: Submission accepted\n{id, status: PENDING, verifyAfter}
```

---

## Part 2 — Automated Cron Verification (Nightly)

```mermaid
sequenceDiagram
    participant C as ⏰ @Cron EVERY_DAY_AT_MIDNIGHT
    participant DB as 🗄️ PostgreSQL
    participant AX as 🌐 Social Media (axios HEAD)
    participant W as 💰 WalletService
    participant E as ✉️ Resend

    C->>DB: SELECT social_showcases\nWHERE status = PENDING\n  AND verify_after <= now()\nINCLUDE user { email, name }\nINCLUDE certificate { certificateId, courseTitle }

    loop For each qualifying showcase

        Note over C: Re-check SSRF allowlist\n(URL may predate the guard)\n→ Throw "Post URL not on an allowed host"\nif hostname not in allowlist

        C->>AX: axios.HEAD(showcase.postUrl,\n  { timeout: 10_000ms, maxRedirects: 3 })

        alt HTTP 200–399 (post is live and accessible)
            AX-->>C: HTTP 2xx/3xx
            C->>DB: UPDATE social_showcases\nSET status = VERIFIED,\n    verified_at = now()\nWHERE id = showcase.id

            C->>W: creditReward(userId, rewardAmount,\n  type: REFERRAL_CREDIT → SHOWCASE_CREDIT,\n  description: "Showcase reward: {platform} post verified",\n  referenceId: showcase.id)
            W->>DB: Prisma $transaction:\n① UPDATE wallets\n  SET balance_bdt    += rewardAmount,\n      lifetime_earned += rewardAmount\n② INSERT wallet_transactions\n  {type: SHOWCASE_CREDIT,\n   amount: rewardAmount,\n   referenceId: showcase.id}

            C->>E: sendShowcaseRewardEmail\n(user.email, user.name, platform, rewardAmount)
            E-->>C: ✅ 📧 "৳{amount} credited — {platform} showcase verified!"

        else HTTP 4xx/5xx, timeout, SSRF-blocked, or network error
            AX-->>C: Error / non-2xx/3xx status
            Note over C: Logger.warn("Showcase {id} rejected: {reason}")
            C->>DB: UPDATE social_showcases\nSET status = REJECTED,\n    verified_at = now()\nWHERE id = showcase.id
            Note over C: ⚠️ No rejection email is sent\n(sendRejectionEmail does not exist)
        end

    end
```

---

## Part 3 — Platform Rewards & Multi-Platform Eligibility

```mermaid
flowchart LR
    cert(["🎓 One Certificate"])

    cert --> li["LinkedIn\n৳30\n@@unique[userId, certId, LINKEDIN]"]
    cert --> tw["Twitter / X\n৳30\n@@unique[userId, certId, TWITTER]"]
    cert --> fb["Facebook\n৳20\n@@unique[userId, certId, FACEBOOK]"]
    cert --> ig["Instagram\n৳20\n@@unique[userId, certId, INSTAGRAM]"]

    li --> independent["Each platform:\n• Independent 10-day window\n• Independent cron verification\n• Independent wallet credit\n• Max 1 reward per platform per cert"]

    tw --> independent
    fb --> independent
    ig --> independent

    independent --> max_earn["Max earnings per certificate:\nAll 4 platforms = ৳30 + ৳30 + ৳20 + ৳20 = ৳100"]
```
