# MultiHAT Academy — Full-Stack Build Instructions (A to Z)

> **Version:** 5.0 — Production-Ready  
> **Last Updated:** May 23, 2026  
> **Author:** Sagar Biswas (MultiHAT)

This document is the **master engineering guide** for building MultiHAT Academy (`academy.multihat.dev`) from scratch. Every section is aligned with [`CaseStudy.md`](./CaseStudy.md), [`FinalTechStack&Tools.md`](./FinalTechStack&Tools.md), and the [10 Mermaid architecture diagrams](./diagrams/). It is designed to be fed directly into **Google Antigravity** and **GitHub Copilot** as a step-by-step execution roadmap.

---

## Table of Contents

- [Step 0: Prerequisites & DNS Preparation](#step-0-prerequisites--dns-preparation)
- [Step 1: Project Initialization & Environment Setup](#step-1-project-initialization--environment-setup)
- [Step 2: Database Schema & Prisma ORM](#step-2-database-schema--prisma-orm)
- [Step 3: Backend Core Infrastructure](#step-3-backend-core-infrastructure)
- [Step 4: Authentication & Authorization](#step-4-authentication--authorization)
- [Step 5: Backend Feature Modules](#step-5-backend-feature-modules)
  - [5.1 Users · 5.2 Books · 5.3 Orders · 5.4 Payments · 5.5 Quizzes · 5.6 Certificates · 5.7 Email](#step-5-backend-feature-modules)
  - [5.8 Wallet Module](#58-wallet-module-balance-top-up-transactions)
  - [5.9 Referrals Module](#59-referrals-module-tracking--reward-crediting)
  - [5.10 Showcases Module](#510-showcases-module-certification-showcase--10-day-verification)
- [Step 6: Backend Utilities — PDF Engines](#step-6-backend-utilities--pdf-engines)
- [Step 7: Frontend Architecture](#step-7-frontend-architecture)
- [Step 8: Testing Strategy](#step-8-testing-strategy)
- [Step 9: Infrastructure & Deployment](#step-9-infrastructure--deployment)
- [Step 10: Production Deployment Checklist](#step-10-production-deployment-checklist)

---

## Workspace Directory Structure

```
academy/
├── backend/                  # NestJS 11 REST API & Prisma Engine
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── common/           # Shared: guards, interceptors, decorators, utils
│   │   ├── auth/             # JWT strategy, login, register
│   │   ├── users/            # User profile, PATCH /me
│   │   ├── books/            # Product CRUD (admin + public)
│   │   ├── coupons/          # Discount code management
│   │   ├── orders/           # Purchase flow (gateway + wallet)
│   │   ├── payments/         # aamarPay IPN webhook
│   │   ├── quizzes/          # Quiz engine & scoring
│   │   ├── certificates/     # Certificate generation & verification
│   │   ├── wallet/           # Wallet balance, top-up, transactions
│   │   ├── referrals/        # Referral tracking & reward crediting
│   │   ├── showcases/        # Certification showcase & 10-day verification
│   │   ├── email/            # Resend transactional email service
│   │   ├── prisma/           # PrismaService (shared DB access)
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── templates/            # PDF templates (certificate base, e-book source)
│   ├── generated/            # Runtime-generated PDFs (gitignored)
│   ├── ecosystem.config.js   # PM2 process config
│   ├── .env                  # Environment variables (gitignored)
│   └── package.json
├── frontend/                 # Next.js 14 Client Web App
│   ├── src/
│   │   ├── app/              # App Router pages & layouts
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # API client, auth context, utilities
│   │   └── styles/           # Global CSS
│   ├── public/               # Static assets
│   ├── .env.local            # Frontend env vars (gitignored)
│   └── package.json
├── .github/workflows/        # CI/CD pipeline
│   └── deploy.yml
├── diagrams/                 # 10 Mermaid architecture flow diagrams
├── docker-compose.yml        # Local PostgreSQL for development
├── CaseStudy.md
├── FinalTechStack&Tools.md
├── README.md
└── instructions.md           # ← This file
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Example Value | Purpose |
|:---------|:-------------|:--------|
| `DATABASE_URL` | `postgresql://postgres:localpassword123@localhost:5432/academy_db?schema=public` | Prisma database connection |
| `JWT_ACCESS_SECRET` | `change-me-access-secret-256bit` | Signs short-lived access tokens (15 min) |
| `JWT_REFRESH_SECRET` | `change-me-refresh-secret-256bit` | Signs long-lived refresh tokens (7 days) |
| `PORT` | `5000` | NestJS server listen port |
| `AAMARPAY_STORE_ID` | `aamarpaytest` | aamarPay merchant store ID |
| `AAMARPAY_SIGNATURE_KEY` | `dbb74894e82415a2f7ff0ec3a97e4183` | aamarPay signature key for hash verification |
| `AAMARPAY_BASE_URL` | `https://sandbox.aamarpay.com` | aamarPay base URL (sandbox or live) |
| `RESEND_API_KEY` | `re_123456789` | Resend API key for transactional email |
| `SENDER_EMAIL` | `academy@multihat.dev` | From address for outgoing emails |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend origin (CORS + redirect URLs) |
| `NODE_ENV` | `development` | Environment flag |
| `WALLET_MIN_TOPUP_BDT` | `50` | Minimum wallet top-up amount in BDT |

### Frontend (`frontend/.env.local`)

| Variable | Example Value | Purpose |
|:---------|:-------------|:--------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api/v1` | Backend API base URL |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Public site URL (for SEO/OG tags) |
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXXXXX` | Google Analytics 4 measurement ID |

> **Production:** On Vercel, set `NEXT_PUBLIC_API_URL=https://api.multihat.dev/api/v1` and `NEXT_PUBLIC_SITE_URL=https://academy.multihat.dev`.

---

## Step 0: Prerequisites & DNS Preparation

### 0.1 Required Tools

Ensure the following are installed on your development machine:

| Tool | Version | Purpose |
|:-----|:--------|:--------|
| Node.js | 20 LTS | Runtime for both NestJS and Next.js |
| npm | 10.x | Package manager |
| Docker Desktop | Latest | Local PostgreSQL via Docker Compose |
| Git | Latest | Version control |
| VS Code | Latest | Editor (with TypeScript, Prisma, Tailwind extensions) |

### 0.2 Cloudflare DNS Configuration

Before writing code, configure DNS records in Cloudflare for `multihat.dev`:

1. **Frontend (Vercel):** CNAME record — `academy` → `cname.vercel-dns.com` (Vercel provides the exact value during project linking). Proxy status: **DNS only** (grey cloud) — Vercel handles its own SSL.
2. **Backend API (DigitalOcean):** A record — `api` → `<DROPLET_IPv4>` (e.g., `164.90.xxx.xxx`). Proxy status: **Proxied** (orange cloud) — Cloudflare provides DDoS protection and CDN.
3. **SSL Mode:** Set Cloudflare SSL/TLS encryption mode to **Full (Strict)**.

### 0.3 Cloudflare Origin Certificate (for Backend)

Generate a Cloudflare Origin Certificate to install on the DigitalOcean Droplet for end-to-end encryption between Cloudflare and Nginx:

1. In Cloudflare dashboard → SSL/TLS → Origin Server → Create Certificate.
2. Hostnames: `*.multihat.dev`, `multihat.dev`.
3. Validity: 15 years.
4. Save the **Origin Certificate** to `/etc/ssl/certs/multihat_origin.pem` on the Droplet.
5. Save the **Private Key** to `/etc/ssl/private/multihat_origin.key` on the Droplet.

> **Important:** This is a Cloudflare Origin Certificate, NOT Let's Encrypt. It is only valid when traffic is proxied through Cloudflare. This matches the Nginx config in Step 9.

---

## Step 1: Project Initialization & Environment Setup

### 1.1 Local Database (Docker Compose)

Create `academy/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: academy-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: localpassword123
      POSTGRES_DB: academy_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always

volumes:
  pgdata:
```

Start the local database:

```bash
# Run from: academy/
docker compose up -d
```

### 1.2 Backend Scaffold (NestJS 11)

```bash
# Run from: academy/
npx -y @nestjs/cli new backend --directory backend --package-manager npm --skip-git
```

Install all backend dependencies:

```bash
# Run from: academy/backend/
npm install @prisma/client @nestjs/config @nestjs/jwt @nestjs/passport @nestjs/swagger @nestjs/throttler @nestjs/schedule passport passport-jwt bcrypt class-validator class-transformer helmet pdf-lib axios resend swagger-ui-express
npm install --save-dev prisma @types/bcrypt @types/passport-jwt @types/node
```

> **Note:** We use `pdf-lib` for both watermarking and certificate generation (consistent library). We use `axios` for aamarPay HTTP calls (direct API integration rather than the `aamarpay.v2` SDK for full control over the payment flow). `resend` is the official Node.js SDK for transactional email.

### 1.3 Frontend Scaffold (Next.js 14)

```bash
# Run from: academy/
npx -y create-next-app@14 frontend --typescript --tailwind --eslint --app --src-dir --use-npm --import-alias "@/*"
```

Install all frontend dependencies:

```bash
# Run from: academy/frontend/
npm install axios lucide-react react-hook-form @hookform/resolvers zod next-themes next-seo recharts clsx tailwind-merge
npx -y shadcn-ui@latest init
```

> **Note:** `next-seo` is used for Open Graph, Twitter Cards, and JSON-LD structured data as specified in the tech stack. `axios` is the HTTP client for all REST API calls to the NestJS backend.

---

## Step 2: Database Schema & Prisma ORM

### 2.1 Prisma Initialization

```bash
# Run from: academy/backend/
npx prisma init
```

### 2.2 Schema Definition

Create `backend/prisma/schema.prisma` — this schema matches the [Data Model Diagram](./diagrams/04-data-model.md) exactly:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
}

enum OrderStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum PaymentMethod {
  GATEWAY
  WALLET
}

enum DiscountType {
  PERCENTAGE
  FIXED
}

enum QuizResult {
  PASS
  FAIL
}

enum ReferralStatus {
  PENDING
  QUALIFIED
  CREDITED
}

enum ShowcasePlatform {
  LINKEDIN
  TWITTER
  FACEBOOK
  INSTAGRAM
}

enum ShowcaseStatus {
  PENDING
  VERIFIED
  REJECTED
}

enum WalletTransactionType {
  TOPUP
  PURCHASE
  REFERRAL_CREDIT
  SHOWCASE_CREDIT
}

model User {
  id              String            @id @default(uuid()) @db.Uuid
  email           String            @unique
  hashedPassword  String            @map("hashed_password")
  name            String
  role            Role              @default(USER)
  referralCode    String            @unique @default(uuid()) @map("referral_code")
  referredById    String?           @map("referred_by_id") @db.Uuid
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")
  orders          Order[]
  quizAttempts    QuizAttempt[]
  certificates    Certificate[]
  wallet          Wallet?
  referralsMade   Referral[]        @relation("referrer")
  referralReceived Referral?        @relation("referred")
  socialShowcases SocialShowcase[]

  @@map("users")
}

model Book {
  id              String         @id @default(uuid()) @db.Uuid
  title           String
  slug            String         @unique
  description     String         @db.Text
  price           Decimal        @db.Decimal(10, 2)
  chapterMetadata Json           @map("chapter_metadata")
  isPublished     Boolean        @default(false) @map("is_published")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")
  orders          Order[]
  quizQuestions   QuizQuestion[]
  quizAttempts    QuizAttempt[]

  @@map("books")
}

model Order {
  id               String        @id @default(uuid()) @db.Uuid
  userId           String        @map("user_id") @db.Uuid
  bookId           String        @map("book_id") @db.Uuid
  couponId         String?       @map("coupon_id") @db.Uuid
  amount           Decimal       @db.Decimal(10, 2)
  discountApplied  Decimal       @default(0) @map("discount_applied") @db.Decimal(10, 2)
  status           OrderStatus   @default(PENDING)
  paymentMethod    PaymentMethod @default(GATEWAY) @map("payment_method")
  aamarpayTranId   String?       @unique @map("aamarpay_tran_id")
  gatewayResponse  Json?         @map("gateway_response")
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")

  user             User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  book             Book          @relation(fields: [bookId], references: [id], onDelete: Cascade)
  coupon           Coupon?       @relation(fields: [couponId], references: [id], onDelete: SetNull)

  @@map("orders")
}

model QuizQuestion {
  id            String   @id @default(uuid()) @db.Uuid
  bookId        String   @map("book_id") @db.Uuid
  prompt        String   @db.Text
  options       Json     // string[] array
  correctAnswer String   @map("correct_answer")
  sortOrder     Int      @map("sort_order")

  book          Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@map("quiz_questions")
}

model QuizAttempt {
  id             String       @id @default(uuid()) @db.Uuid
  userId         String       @map("user_id") @db.Uuid
  bookId         String       @map("book_id") @db.Uuid
  selectedAnswers Json        @map("selected_answers")
  score          Int
  totalQuestions Int          @map("total_questions")
  result         QuizResult
  createdAt      DateTime     @default(now()) @map("created_at")

  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  book           Book         @relation(fields: [bookId], references: [id], onDelete: Cascade)
  certificate    Certificate?

  @@map("quiz_attempts")
}

model Certificate {
  id              String           @id @default(uuid()) @db.Uuid
  userId          String           @map("user_id") @db.Uuid
  quizAttemptId   String           @unique @map("quiz_attempt_id") @db.Uuid
  certificateId   String           @unique @default(uuid()) @map("certificate_id")
  holderName      String           @map("holder_name")
  courseTitle      String           @map("course_title")
  issueDate       DateTime         @default(now()) @map("issue_date") @db.Date
  isValid         Boolean          @default(true) @map("is_valid")
  createdAt       DateTime         @default(now()) @map("created_at")

  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  quizAttempt     QuizAttempt      @relation(fields: [quizAttemptId], references: [id], onDelete: Cascade)
  socialShowcases SocialShowcase[]

  @@map("certificates")
}

model Coupon {
  id            String       @id @default(uuid()) @db.Uuid
  code          String       @unique
  discountType  DiscountType @map("discount_type")
  discountValue Decimal      @map("discount_value") @db.Decimal(10, 2)
  validFrom     DateTime     @map("valid_from")
  validUntil    DateTime     @map("valid_until")
  usageLimit    Int          @map("usage_limit")
  usageCount    Int          @default(0) @map("usage_count")
  isActive      Boolean      @default(true) @map("is_active")
  createdAt     DateTime     @default(now()) @map("created_at")
  orders        Order[]

  @@map("coupons")
}

// ─── NEW MODELS (Wallet Ecosystem) ───────────────────────────────────

model Wallet {
  id              String               @id @default(uuid()) @db.Uuid
  userId          String               @unique @map("user_id") @db.Uuid
  balanceBdt      Decimal              @default(0) @map("balance_bdt") @db.Decimal(10, 2)
  lifetimeEarned  Decimal              @default(0) @map("lifetime_earned") @db.Decimal(10, 2)
  lifetimeSpent   Decimal              @default(0) @map("lifetime_spent") @db.Decimal(10, 2)
  createdAt       DateTime             @default(now()) @map("created_at")
  updatedAt       DateTime             @updatedAt @map("updated_at")

  user            User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions    WalletTransaction[]

  @@map("wallets")
}

model WalletTransaction {
  id            String                @id @default(uuid()) @db.Uuid
  walletId      String                @map("wallet_id") @db.Uuid
  type          WalletTransactionType
  amount        Decimal               @db.Decimal(10, 2)
  description   String
  referenceId   String?               @map("reference_id") @db.Uuid
  createdAt     DateTime              @default(now()) @map("created_at")

  wallet        Wallet                @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@map("wallet_transactions")
}

model Referral {
  id              String         @id @default(uuid()) @db.Uuid
  referrerId      String         @map("referrer_id") @db.Uuid
  referredUserId  String         @unique @map("referred_user_id") @db.Uuid
  status          ReferralStatus @default(PENDING)
  cumulativeSpend Decimal        @default(0) @map("cumulative_spend") @db.Decimal(10, 2)
  rewardPaid      Boolean        @default(false) @map("reward_paid")
  createdAt       DateTime       @default(now()) @map("created_at")
  qualifiedAt     DateTime?      @map("qualified_at")

  referrer        User           @relation("referrer", fields: [referrerId], references: [id], onDelete: Cascade)
  referredUser    User           @relation("referred", fields: [referredUserId], references: [id], onDelete: Cascade)

  @@map("referrals")
}

model SocialShowcase {
  id             String           @id @default(uuid()) @db.Uuid
  userId         String           @map("user_id") @db.Uuid
  certificateId  String           @map("certificate_id") @db.Uuid
  platform       ShowcasePlatform
  postUrl        String           @map("post_url")
  status         ShowcaseStatus   @default(PENDING)
  rewardAmount   Decimal          @map("reward_amount") @db.Decimal(10, 2)
  submittedAt    DateTime         @default(now()) @map("submitted_at")
  verifyAfter    DateTime         @map("verify_after")
  verifiedAt     DateTime?        @map("verified_at")
  createdAt      DateTime         @default(now()) @map("created_at")

  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  certificate    Certificate      @relation(fields: [certificateId], references: [id], onDelete: Cascade)

  @@unique([userId, certificateId, platform]) // One reward per platform per certification
  @@map("social_showcases")
}
```

### 2.3 Environment Configuration

Create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:localpassword123@localhost:5432/academy_db?schema=public"
JWT_ACCESS_SECRET="super-secret-access-key-change-in-production"
JWT_REFRESH_SECRET="super-secret-refresh-key-change-in-production"
PORT=5000
AAMARPAY_STORE_ID="aamarpaytest"
AAMARPAY_SIGNATURE_KEY="dbb74894e82415a2f7ff0ec3a97e4183"
AAMARPAY_BASE_URL="https://sandbox.aamarpay.com"
RESEND_API_KEY="re_123456789"
SENDER_EMAIL="academy@multihat.dev"
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
WALLET_MIN_TOPUP_BDT="50"
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GA_ID=
```

### 2.4 Run Migration & Generate Client

```bash
# Run from: academy/backend/
npx prisma migrate dev --name init
npx prisma generate
```

### 2.5 Database Seeding

Create `backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Seed admin user
  const hashedPassword = await bcrypt.hash('AdminSecure!2026', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@multihat.dev' },
    update: {},
    create: {
      email: 'admin@multihat.dev',
      name: 'Sagar Biswas',
      hashedPassword,
      role: 'ADMIN',
    },
  });

  // Create wallet for admin
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  // Seed initial book
  const book = await prisma.book.upsert({
    where: { slug: 'google-dorks-complete-handbook' },
    update: {},
    create: {
      title: 'Google Dorks: The Complete OSINT Handbook',
      slug: 'google-dorks-complete-handbook',
      description: 'Master Google Dorking for ethical OSINT research. Covers advanced operators, localized Bangladesh examples, and real-world case studies.',
      price: 10.00,
      isPublished: true,
      chapterMetadata: [
        { index: 1, title: 'Introduction to Google Dorks', isFree: true },
        { index: 2, title: 'Basic Search Operators', isFree: true },
        { index: 3, title: 'Advanced Operators & Filters', isFree: true },
        { index: 4, title: 'OSINT Reconnaissance Techniques', isFree: false },
        { index: 5, title: 'Bangladesh-Specific Dork Examples', isFree: false },
      ],
    },
  });

  // Seed quiz questions for the book
  const questions = [
    { prompt: 'Which Google operator restricts results to a specific website?', options: ['inurl:', 'site:', 'filetype:', 'intitle:'], correctAnswer: 'site:', sortOrder: 1 },
    { prompt: 'What does the filetype: operator do?', options: ['Searches file names', 'Filters by file extension', 'Searches inside files', 'Lists all files'], correctAnswer: 'Filters by file extension', sortOrder: 2 },
    { prompt: 'Which operator finds pages with a specific word in the title?', options: ['inurl:', 'intext:', 'intitle:', 'site:'], correctAnswer: 'intitle:', sortOrder: 3 },
  ];

  for (const q of questions) {
    await prisma.quizQuestion.create({
      data: { bookId: book.id, ...q },
    });
  }

  console.log(`Seeded: admin=${admin.email}, book="${book.title}", questions=${questions.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

Add to `backend/package.json`:

```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Run the seed:

```bash
# Run from: academy/backend/
npx prisma db seed
```

---

## Step 3: Backend Core Infrastructure

### 3.1 Module Scaffolding (CLI)

Generate all resource modules using the NestJS CLI:

```bash
# Run from: academy/backend/
npx nest g module prisma --no-spec
npx nest g service prisma --no-spec
npx nest g resource auth --no-spec
npx nest g resource users --no-spec
npx nest g resource books --no-spec
npx nest g resource coupons --no-spec
npx nest g resource orders --no-spec
npx nest g resource payments --no-spec
npx nest g resource quizzes --no-spec
npx nest g resource certificates --no-spec
npx nest g module email --no-spec
npx nest g service email --no-spec
npx nest g resource wallet --no-spec
npx nest g resource referrals --no-spec
npx nest g resource showcases --no-spec
```

Select **REST API** and type **Y** for CRUD entry points when prompted.

### 3.2 PrismaService (Shared Database Access)

Every module needs database access. Create a shared `PrismaService`:

Create `backend/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

Create `backend/src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

> The `@Global()` decorator makes `PrismaService` available to all modules without explicit imports.

### 3.3 AppModule Configuration

Create `backend/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { CouponsModule } from './coupons/coupons.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { CertificatesModule } from './certificates/certificates.module';
import { EmailModule } from './email/email.module';
import { WalletModule } from './wallet/wallet.module';
import { ReferralsModule } from './referrals/referrals.module';
import { ShowcasesModule } from './showcases/showcases.module';

@Module({
  imports: [
    // Load .env globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting: 100 requests per 60 seconds per IP (global default)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Task scheduling (cron jobs for showcase verification & referral checks)
    ScheduleModule.forRoot(),

    // Core
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    BooksModule,
    CouponsModule,
    OrdersModule,
    PaymentsModule,
    QuizzesModule,
    CertificatesModule,
    EmailModule,

    // Wallet ecosystem modules
    WalletModule,
    ReferralsModule,
    ShowcasesModule,
  ],
  providers: [
    // Apply throttler globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

### 3.4 main.ts — Security, Validation, Swagger & API Prefix

Create `backend/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ── Security Headers ──
  app.use(helmet());

  // ── Strict CORS ──
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  app.enableCors({
    origin: [frontendUrl, 'https://academy.multihat.dev'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ── Global DTO Validation ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ── Global API Prefix ──
  app.setGlobalPrefix('api/v1');

  // ── Swagger / OpenAPI 3.0 Documentation ──
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MultiHAT Academy API')
    .setDescription('RESTful API for the MultiHAT Academy micro-credential platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // ── Start Server ──
  const port = configService.get<number>('PORT', 5000);
  await app.listen(port);
  console.log(`🚀 Academy API running on http://localhost:${port}`);
  console.log(`📄 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
```

### 3.5 Response Envelope Interceptor

Wraps all successful API responses in the consistent `{ data, message, statusCode }` envelope described in the CaseStudy:

Create `backend/src/common/interceptors/response.interceptor.ts`:

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const statusCode = context.switchToHttp().getResponse().statusCode;
    return next.handle().pipe(
      map((data) => ({
        data,
        message: 'Success',
        statusCode,
      })),
    );
  }
}
```

Register it globally in `main.ts` by adding after the validation pipe:

```typescript
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
// ... inside bootstrap():
app.useGlobalInterceptors(new ResponseInterceptor());
```

### 3.6 Global Exception Filter

Create `backend/src/common/filters/http-exception.filter.ts`:

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    response.status(status).json({
      data: null,
      message: typeof message === 'string' ? message : (message as any).message || message,
      statusCode: status,
    });
  }
}
```

Register in `main.ts`:

```typescript
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
// ... inside bootstrap():
app.useGlobalFilters(new GlobalExceptionFilter());
```

---

## Step 4: Authentication & Authorization

### 4.1 Auth DTOs

Create `backend/src/auth/dto/register.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  referralCode?: string; // Referral code from the referrer's link
}
```

Create `backend/src/auth/dto/login.dto.ts`:

```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

### 4.2 JWT Strategy

Create `backend/src/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');
    return { id: user.id, email: user.email, role: user.role, name: user.name };
  }
}
```

### 4.3 Role-Based Access Control (RBAC)

Create `backend/src/common/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

Create `backend/src/common/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

Create `backend/src/common/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user?.[data] : request.user;
  },
);
```

### 4.4 Auth Service

Create `backend/src/auth/auth.service.ts`:

```typescript
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    // Resolve referrer if referral code is provided
    let referredById: string | undefined;
    if (dto.referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: dto.referralCode },
      });
      if (referrer) referredById = referrer.id;
      // Silently ignore invalid referral codes — don't block registration
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        hashedPassword,
        ...(referredById && { referredById }),
      },
    });

    // Create wallet for new user (balance starts at 0)
    await this.prisma.wallet.create({ data: { userId: user.id } });

    // Create referral tracking record if referred
    if (referredById) {
      await this.prisma.referral.create({
        data: {
          referrerId: referredById,
          referredUserId: user.id,
        },
      });
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await bcrypt.compare(dto.password, user.hashedPassword);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user.id, user.email, user.role);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('User not found');
      return this.generateTokens(user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken, user: { id: userId, email, role } };
  }
}
```

### 4.5 Auth Controller

Create `backend/src/auth/auth.controller.ts`:

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 login attempts per minute
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }
}
```

### 4.6 Auth Module

Create `backend/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}), // Secrets provided dynamically in AuthService
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

> **Usage in other controllers:** Protect any route with `@UseGuards(AuthGuard('jwt'))`. For admin-only routes, add `@UseGuards(AuthGuard('jwt'), RolesGuard)` and `@Roles(Role.ADMIN)`. Access the authenticated user with `@CurrentUser() user`.

---

## Step 5: Backend Feature Modules

> All modules below follow the same pattern: **DTO → Service → Controller → Module**. Each service injects `PrismaService` (globally available). Protected endpoints use `@UseGuards(AuthGuard('jwt'))` and admin endpoints add `@UseGuards(AuthGuard('jwt'), RolesGuard)` with `@Roles(Role.ADMIN)`.

### 5.1 Users Module

**Endpoints:** `GET /api/v1/users/me` · `PATCH /api/v1/users/me`

Create `backend/src/users/users.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: { name?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, role: true },
    });
  }
}
```

Create `backend/src/users/users.controller.ts`:

```typescript
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: { name?: string }) {
    return this.usersService.updateProfile(userId, dto);
  }
}
```

### 5.2 Books Module (Public + Admin CRUD)

**Endpoints:** `GET /api/v1/books` · `GET /api/v1/books/:slug` · `POST /api/v1/books` (admin) · `PATCH /api/v1/books/:id` (admin)

Create `backend/src/books/books.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where: { isPublished: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.book.count({ where: { isPublished: true } }),
    ]);
    return { books, total, page, limit };
  }

  async findBySlug(slug: string) {
    const book = await this.prisma.book.findUnique({ where: { slug } });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  // Admin: Create book
  async create(data: { title: string; slug: string; description: string; price: number; chapterMetadata: any }) {
    return this.prisma.book.create({ data });
  }

  // Admin: Update book
  async update(id: string, data: Partial<{ title: string; description: string; price: number; isPublished: boolean; chapterMetadata: any }>) {
    return this.prisma.book.update({ where: { id }, data });
  }
}
```

Create `backend/src/books/books.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.booksService.findAll(Number(page) || 1, Number(limit) || 20);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.booksService.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: any) {
    return this.booksService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: any) {
    return this.booksService.update(id, dto);
  }
}
```

### 5.3 Orders Module (Purchase Flow — Gateway + Wallet)

**Endpoints:** `POST /api/v1/orders` · `GET /api/v1/orders/my`

This module implements the dual-path purchase flow from [Payment Flow Diagram](./diagrams/02-payment-flow.md). The buyer selects a `paymentMethod` (`GATEWAY` or `WALLET`). Gateway-only products (Premium E-Book PDFs, Membership with PDF) reject wallet payments for anti-piracy traceability. Wallet payments debit the balance instantly and mark the order as PAID.

> **Wallet-eligible products:** Paid Web Chapters, Certification Kit, Future Membership (without E-Book)  
> **Gateway-only products:** Premium E-Book PDF, Future Membership (with E-Book)

Create `backend/src/orders/orders.service.ts`:

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralsService } from '../referrals/referrals.service';
import { EmailService } from '../email/email.service';
import { PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Products that MUST use gateway (PDF traceability requires aamarPay paper trail)
const GATEWAY_ONLY_SLUGS: string[] = [
  // Add slugs for Premium E-Book PDFs and Membership-with-PDF products here.
  // Example: 'google-dorks-complete-handbook-pdf', 'annual-membership-with-pdf'
];

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private walletService: WalletService,
    private referralsService: ReferralsService,
    private emailService: EmailService,
  ) {}

  async createOrder(userId: string, bookId: string, paymentMethod: PaymentMethod = 'GATEWAY', couponCode?: string) {
    // 1. Validate book exists
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book || !book.isPublished) throw new NotFoundException('Book not found');

    // 2. Enforce gateway-only restriction for PDF products
    if (paymentMethod === 'WALLET' && GATEWAY_ONLY_SLUGS.includes(book.slug)) {
      throw new BadRequestException('This product requires payment via aamarPay gateway (PDF anti-piracy policy)');
    }

    // 3. Check if already purchased
    const existingOrder = await this.prisma.order.findFirst({
      where: { userId, bookId, status: 'PAID' },
    });
    if (existingOrder) throw new BadRequestException('You already own this book');

    // 4. Calculate discount
    let discount = new Decimal(0);
    let couponId: string | null = null;

    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode } });
      if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid coupon');
      if (new Date() < coupon.validFrom || new Date() > coupon.validUntil) throw new BadRequestException('Coupon expired');
      if (coupon.usageCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');

      discount = coupon.discountType === 'PERCENTAGE'
        ? book.price.mul(coupon.discountValue).div(100)
        : coupon.discountValue;
      couponId = coupon.id;
    }

    const finalAmount = Decimal.max(book.price.minus(discount), new Decimal(0));

    // ─── PATH A: WALLET PAYMENT (instant fulfillment) ───
    if (paymentMethod === 'WALLET') {
      const order = await this.prisma.order.create({
        data: {
          userId,
          bookId,
          couponId,
          amount: finalAmount,
          discountApplied: discount,
          status: 'PAID',
          paymentMethod: 'WALLET',
        },
      });

      // Debit wallet (throws if insufficient balance)
      await this.walletService.debitForPurchase(userId, finalAmount, order.id);

      // Update coupon usage
      if (couponId) {
        await this.prisma.coupon.update({
          where: { id: couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Update referral cumulative spend
      await this.referralsService.updateCumulativeSpend(userId, finalAmount);

      // Send purchase receipt
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      await this.emailService.sendPurchaseReceipt(user!.email, user!.name, book.title);

      return { orderId: order.id, paymentMethod: 'WALLET', status: 'PAID' };
    }

    // ─── PATH B: GATEWAY PAYMENT (redirect to aamarPay) ───
    const order = await this.prisma.order.create({
      data: {
        userId,
        bookId,
        couponId,
        amount: finalAmount,
        discountApplied: discount,
        status: 'PENDING',
        paymentMethod: 'GATEWAY',
        aamarpayTranId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const payment = await this.paymentsService.initiatePayment(
      order.aamarpayTranId!,
      finalAmount.toString(),
      user!.name,
      user!.email,
    );

    return { orderId: order.id, paymentMethod: 'GATEWAY', paymentUrl: payment.paymentUrl };
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { book: { select: { title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

### 5.4 Payments Module (aamarPay IPN Webhook)

**Endpoints:** `POST /api/v1/payments/ipn` (no auth — server-to-server webhook)

This implements the IPN callback from [Payment Flow Diagram](./diagrams/02-payment-flow.md): verify signature → update order → trigger PDF generation → send email.

Create `backend/src/payments/payments.service.ts`:

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class PaymentsService {
  constructor(private configService: ConfigService) {}

  async initiatePayment(tranId: string, amount: string, customerName: string, customerEmail: string) {
    const storeId = this.configService.get<string>('AAMARPAY_STORE_ID');
    const signatureKey = this.configService.get<string>('AAMARPAY_SIGNATURE_KEY');
    const baseUrl = this.configService.get<string>('AAMARPAY_BASE_URL');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    const payload = {
      store_id: storeId,
      signature_key: signatureKey,
      tran_id: tranId,
      amount,
      currency: 'BDT',
      desc: 'MultiHAT Academy E-Book Purchase',
      cus_name: customerName,
      cus_email: customerEmail,
      cus_phone: '01700000000',
      success_url: `${frontendUrl}/payment/success?id=${tranId}`,
      fail_url: `${frontendUrl}/payment/fail?id=${tranId}`,
      cancel_url: `${frontendUrl}/payment/cancel?id=${tranId}`,
      type: 'json',
    };

    try {
      const response = await axios.post(`${baseUrl}/jsonpost.php`, payload);
      if (response.data?.payment_url) return { paymentUrl: response.data.payment_url };
      throw new BadRequestException('aamarPay initiation failed');
    } catch (error) {
      throw new BadRequestException(`Payment error: ${error.message}`);
    }
  }

  verifyIpnSignature(payload: any): boolean {
    const storeId = this.configService.get<string>('AAMARPAY_STORE_ID');
    const signatureKey = this.configService.get<string>('AAMARPAY_SIGNATURE_KEY');
    const raw = `${storeId}${signatureKey}${payload.mer_txnid}${payload.amount}BDT`;
    const computed = crypto.createHash('md5').update(raw).digest('hex');
    return computed === payload.signature;
  }
}
```

Create `backend/src/payments/payments.controller.ts`:

```typescript
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferralsService } from '../referrals/referrals.service';
import { Decimal } from '@prisma/client/runtime/library';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private prisma: PrismaService,
    private emailService: EmailService,
    private walletService: WalletService,
    private referralsService: ReferralsService,
  ) {}

  @SkipThrottle()
  @Post('ipn')
  @HttpCode(200)
  async handleIpn(@Body() payload: any) {
    // 1. Verify signature
    if (!this.paymentsService.verifyIpnSignature(payload)) {
      return { status: 'INVALID_SIGNATURE' };
    }

    const tranId = payload.mer_txnid;

    // ─── WALLET TOP-UP FLOW ───
    // Top-up transactions use the "TOPUP-" prefix (see WalletService.initiateTopUp)
    if (tranId.startsWith('TOPUP-')) {
      if (payload.pay_status === 'Successful') {
        const amount = new Decimal(payload.amount);
        // Find user by email from the IPN payload
        const user = await this.prisma.user.findUnique({
          where: { email: payload.cus_email },
        });
        if (user) {
          await this.walletService.creditTopUp(user.id, amount, tranId);
        }
        return { status: 'TOPUP_SUCCESS' };
      }
      return { status: 'TOPUP_FAILED' };
    }

    // ─── PURCHASE ORDER FLOW ───
    // 2. Idempotency: check if already processed
    const order = await this.prisma.order.findUnique({
      where: { aamarpayTranId: tranId },
      include: { user: true, book: true },
    });
    if (!order || order.status === 'PAID') {
      return { status: 'ALREADY_PROCESSED' };
    }

    // 3. Update order status
    if (payload.pay_status === 'Successful') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', gatewayResponse: payload },
      });

      // 4. Update coupon usage if applicable
      if (order.couponId) {
        await this.prisma.coupon.update({
          where: { id: order.couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // 5. Update referral cumulative spend
      await this.referralsService.updateCumulativeSpend(order.userId, order.amount);

      // 6. Send email with purchase receipt (PDF generation triggered separately)
      await this.emailService.sendPurchaseReceipt(order.user.email, order.user.name, order.book.title);

      return { status: 'SUCCESS' };
    }

    // Handle failed payment
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'FAILED', gatewayResponse: payload },
    });
    return { status: 'FAILED' };
  }
}
```

### 5.5 Quizzes Module (Scoring Engine)

**Endpoints:** `GET /api/v1/quizzes/:bookSlug/questions` · `POST /api/v1/quizzes/:bookSlug/submit`

Implements the [Certificate Issuance Flow](./diagrams/07-certificate-issuance-flow.md): fetch questions → validate answers → score → pass/fail → trigger certificate generation on ≥70%.

Create `backend/src/quizzes/quizzes.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';

@Injectable()
export class QuizzesService {
  constructor(
    private prisma: PrismaService,
    private certificatesService: CertificatesService,
  ) {}

  async getQuestions(bookSlug: string, userId: string) {
    const book = await this.prisma.book.findUnique({ where: { slug: bookSlug } });
    if (!book) throw new NotFoundException('Book not found');

    // Verify user has purchased the book
    const order = await this.prisma.order.findFirst({
      where: { userId, bookId: book.id, status: 'PAID' },
    });
    if (!order) throw new ForbiddenException('Purchase required to take the quiz');

    const questions = await this.prisma.quizQuestion.findMany({
      where: { bookId: book.id },
      select: { id: true, prompt: true, options: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    });
    return { bookTitle: book.title, questions };
  }

  async submitQuiz(bookSlug: string, userId: string, selectedAnswers: Record<string, string>) {
    const book = await this.prisma.book.findUnique({ where: { slug: bookSlug } });
    if (!book) throw new NotFoundException('Book not found');

    const questions = await this.prisma.quizQuestion.findMany({ where: { bookId: book.id } });
    const totalQuestions = questions.length;

    // Score the quiz
    let score = 0;
    for (const q of questions) {
      if (selectedAnswers[q.id] === q.correctAnswer) score++;
    }

    const result = score / totalQuestions >= 0.7 ? 'PASS' : 'FAIL';

    // Record attempt
    const attempt = await this.prisma.quizAttempt.create({
      data: { userId, bookId: book.id, selectedAnswers, score, totalQuestions, result },
    });

    // Generate certificate on pass
    let certId: string | undefined;
    if (result === 'PASS') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const cert = await this.certificatesService.issueCertificate(userId, attempt.id, user!.name, book.title);
      certId = cert.certificateId;
    }

    return { score, total: totalQuestions, outcome: result, certId };
  }
}
```

### 5.6 Certificates Module (Generation & Verification)

**Endpoints:** `GET /api/v1/certificates/my` · `GET /api/v1/certificates/verify/:certId` (public)

Create `backend/src/certificates/certificates.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  async issueCertificate(userId: string, quizAttemptId: string, holderName: string, courseTitle: string) {
    return this.prisma.certificate.create({
      data: { userId, quizAttemptId, holderName, courseTitle },
    });
  }

  async getMyCertificates(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyCertificate(certId: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { certificateId: certId },
    });
    if (!cert) throw new NotFoundException('Certificate not found');
    return {
      valid: cert.isValid,
      holderName: cert.holderName,
      courseTitle: cert.courseTitle,
      issueDate: cert.issueDate,
      certificateId: cert.certificateId,
    };
  }
}
```

Create `backend/src/certificates/certificates.controller.ts`:

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  getMyCertificates(@CurrentUser('id') userId: string) {
    return this.certificatesService.getMyCertificates(userId);
  }

  @Get('verify/:certId')  // Public — no auth required
  verifyCertificate(@Param('certId') certId: string) {
    return this.certificatesService.verifyCertificate(certId);
  }
}
```

### 5.7 Email Module (Resend Integration)

Create `backend/src/email/email.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private senderEmail: string;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.senderEmail = this.configService.get<string>('SENDER_EMAIL', 'academy@multihat.dev');
  }

  async sendPurchaseReceipt(to: string, name: string, bookTitle: string) {
    await this.resend.emails.send({
      from: this.senderEmail,
      to,
      subject: `Your purchase: ${bookTitle} — MultiHAT Academy`,
      html: `<h2>Thank you, ${name}!</h2>
        <p>Your purchase of <strong>${bookTitle}</strong> is confirmed.</p>
        <p>Your watermarked PDF will be delivered to this email shortly.</p>
        <p>— MultiHAT Academy</p>`,
    });
  }

  async sendCertificateEmail(to: string, name: string, courseTitle: string, certId: string, pdfBuffer?: Buffer) {
    const attachments = pdfBuffer
      ? [{ filename: `certificate-${certId}.pdf`, content: pdfBuffer }]
      : [];

    await this.resend.emails.send({
      from: this.senderEmail,
      to,
      subject: `🎓 Certificate Earned: ${courseTitle}`,
      html: `<h2>Congratulations, ${name}!</h2>
        <p>You've earned a certificate for <strong>${courseTitle}</strong>.</p>
        <p>Verification URL: <a href="https://academy.multihat.dev/verify/${certId}">Verify Certificate</a></p>`,
      attachments,
    });
  }
}
```

Create `backend/src/email/email.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

---

### 5.8 Wallet Module (Balance, Top-up, Transactions)

**Endpoints:** `GET /api/v1/wallet/balance` · `POST /api/v1/wallet/topup` · `GET /api/v1/wallet/transactions`

This module implements the [Wallet & Referral Flow Diagram](./diagrams/09-wallet-and-referral-flow.md). The Wallet is a cash-in-only internal balance. Users can top up via aamarPay and spend on wallet-eligible products. Wallet balance cannot be withdrawn.

Create `backend/src/wallet/wallet.service.ts`:

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private configService: ConfigService,
  ) {}

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return {
      balanceBdt: wallet.balanceBdt,
      lifetimeEarned: wallet.lifetimeEarned,
      lifetimeSpent: wallet.lifetimeSpent,
    };
  }

  async initiateTopUp(userId: string, amountBdt: number) {
    const minTopUp = Number(this.configService.get('WALLET_MIN_TOPUP_BDT', '50'));
    if (amountBdt < minTopUp) {
      throw new BadRequestException(`Minimum top-up is ৳${minTopUp}`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const tranId = `TOPUP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Initiate aamarPay payment for wallet top-up
    const payment = await this.paymentsService.initiatePayment(
      tranId,
      amountBdt.toString(),
      user.name,
      user.email,
    );

    return { tranId, paymentUrl: payment.paymentUrl };
  }

  /**
   * Called by IPN handler when a wallet top-up payment is confirmed.
   * Credits the wallet and records the transaction.
   */
  async creditTopUp(userId: string, amount: Decimal, tranId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: {
          balanceBdt: { increment: amount },
          lifetimeEarned: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'TOPUP',
          amount,
          description: `Wallet top-up via aamarPay (${tranId})`,
        },
      }),
    ]);
  }

  /**
   * Debit wallet for a purchase. Called by OrdersService for wallet-eligible products.
   */
  async debitForPurchase(userId: string, amount: Decimal, orderId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.balanceBdt.lessThan(amount)) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: {
          balanceBdt: { decrement: amount },
          lifetimeSpent: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PURCHASE',
          amount,
          description: `Purchase (Order: ${orderId})`,
          referenceId: orderId,
        },
      }),
    ]);
  }

  /**
   * Credit wallet for referral or showcase rewards.
   */
  async creditReward(userId: string, amount: Decimal, type: 'REFERRAL_CREDIT' | 'SHOWCASE_CREDIT', description: string, referenceId?: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: {
          balanceBdt: { increment: amount },
          lifetimeEarned: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount,
          description,
          ...(referenceId && { referenceId }),
        },
      }),
    ]);
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);
    return { transactions, total, page, limit };
  }
}
```

Create `backend/src/wallet/wallet.controller.ts`:

```typescript
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  getBalance(@CurrentUser('id') userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Post('topup')
  initiateTopUp(@CurrentUser('id') userId: string, @Body('amountBdt') amountBdt: number) {
    return this.walletService.initiateTopUp(userId, amountBdt);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(userId, Number(page) || 1, Number(limit) || 20);
  }
}
```

Create `backend/src/wallet/wallet.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService], // Exported for use by OrdersModule, ReferralsModule, ShowcasesModule
})
export class WalletModule {}
```

### 5.9 Referrals Module (Tracking & Reward Crediting)

**Endpoints:** `GET /api/v1/referrals/code` · `GET /api/v1/referrals/stats`

This module implements the referral lifecycle from [Wallet & Referral Flow Diagram](./diagrams/09-wallet-and-referral-flow.md). The referral reward (৳100 / $0.80) is credited when the referred user's cumulative spend reaches ≥ ৳500.

Create `backend/src/referrals/referrals.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';

const REFERRAL_REWARD_BDT = new Decimal(100);
const REFERRAL_THRESHOLD_BDT = new Decimal(500);

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  async getReferralCode(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    return {
      referralCode: user?.referralCode,
      referralLink: `https://academy.multihat.dev/ref/${user?.referralCode}`,
    };
  }

  async getReferralStats(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      select: { status: true, cumulativeSpend: true, rewardPaid: true, createdAt: true },
    });

    return {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'PENDING').length,
      qualified: referrals.filter((r) => r.status === 'QUALIFIED').length,
      credited: referrals.filter((r) => r.status === 'CREDITED').length,
      totalEarned: referrals.filter((r) => r.rewardPaid).length * 100, // ৳100 per credited referral
    };
  }

  /**
   * Called after every successful order to update cumulative spend for the referred user.
   * If the threshold is met, credits the referrer's wallet.
   */
  async updateCumulativeSpend(referredUserId: string, orderAmount: Decimal) {
    const referral = await this.prisma.referral.findUnique({
      where: { referredUserId },
    });
    if (!referral || referral.status === 'CREDITED') return; // No referral or already paid

    const newSpend = referral.cumulativeSpend.add(orderAmount);

    if (newSpend.greaterThanOrEqualTo(REFERRAL_THRESHOLD_BDT) && !referral.rewardPaid) {
      // Threshold met — credit referrer's wallet
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          cumulativeSpend: newSpend,
          status: 'CREDITED',
          rewardPaid: true,
          qualifiedAt: new Date(),
        },
      });

      await this.walletService.creditReward(
        referral.referrerId,
        REFERRAL_REWARD_BDT,
        'REFERRAL_CREDIT',
        `Referral reward: referred user met ৳500 spending threshold`,
        referral.id,
      );
    } else {
      // Update spend but don't credit yet
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: { cumulativeSpend: newSpend },
      });
    }
  }
}
```

Create `backend/src/referrals/referrals.controller.ts`:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('referrals')
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Get('code')
  getReferralCode(@CurrentUser('id') userId: string) {
    return this.referralsService.getReferralCode(userId);
  }

  @Get('stats')
  getReferralStats(@CurrentUser('id') userId: string) {
    return this.referralsService.getReferralStats(userId);
  }
}
```

Create `backend/src/referrals/referrals.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService], // Exported for use by OrdersModule (to update cumulative spend)
})
export class ReferralsModule {}
```

### 5.10 Showcases Module (Certification Showcase & 10-Day Verification)

**Endpoints:** `POST /api/v1/showcases/submit` · `GET /api/v1/showcases/my`

This module implements the [Showcase Verification Flow Diagram](./diagrams/10-showcase-verification-flow.md). Users submit social media post URLs after sharing their certificate. A cron job verifies the post is still live after 10 days and credits the wallet.

Create `backend/src/showcases/showcases.service.ts`:

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { EmailService } from '../email/email.service';
import { ShowcasePlatform } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import axios from 'axios';

// Reward amounts per platform (in BDT)
const PLATFORM_REWARDS: Record<ShowcasePlatform, number> = {
  LINKEDIN: 30,
  TWITTER: 30,
  FACEBOOK: 20,
  INSTAGRAM: 20,
};

@Injectable()
export class ShowcasesService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private emailService: EmailService,
  ) {}

  async submitShowcase(userId: string, certificateId: string, platform: ShowcasePlatform, postUrl: string) {
    // Verify certificate belongs to user
    const cert = await this.prisma.certificate.findUnique({
      where: { certificateId },
    });
    if (!cert || cert.userId !== userId) {
      throw new NotFoundException('Certificate not found');
    }

    // Check for duplicate submission (one reward per platform per cert)
    const existing = await this.prisma.socialShowcase.findUnique({
      where: { userId_certificateId_platform: { userId, certificateId: cert.id, platform } },
    });
    if (existing) throw new BadRequestException('You already submitted a post for this platform and certificate');

    const rewardAmount = PLATFORM_REWARDS[platform];
    const verifyAfter = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now

    return this.prisma.socialShowcase.create({
      data: {
        userId,
        certificateId: cert.id,
        platform,
        postUrl,
        rewardAmount,
        verifyAfter,
      },
    });
  }

  async getMyShowcases(userId: string) {
    return this.prisma.socialShowcase.findMany({
      where: { userId },
      include: { certificate: { select: { certificateId: true, courseTitle: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cron job: runs daily at midnight to verify pending showcases past their 10-day window.
   * For each qualifying showcase, attempts to check if the post URL is still accessible.
   * On success → credits wallet. On failure → marks as rejected.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async verifyPendingShowcases() {
    const pendingShowcases = await this.prisma.socialShowcase.findMany({
      where: {
        status: 'PENDING',
        verifyAfter: { lte: new Date() },
      },
      include: { user: true, certificate: true },
    });

    for (const showcase of pendingShowcases) {
      try {
        // Attempt to reach the post URL (HEAD request)
        const response = await axios.head(showcase.postUrl, { timeout: 10000 });
        const isLive = response.status >= 200 && response.status < 400;

        if (isLive) {
          // Post is still live — credit wallet
          await this.prisma.socialShowcase.update({
            where: { id: showcase.id },
            data: { status: 'VERIFIED', verifiedAt: new Date() },
          });

          await this.walletService.creditReward(
            showcase.userId,
            new Decimal(showcase.rewardAmount),
            'SHOWCASE_CREDIT',
            `Showcase reward: ${showcase.platform} post verified`,
            showcase.id,
          );

          // Notify user
          await this.emailService.sendShowcaseRewardEmail(
            showcase.user.email,
            showcase.user.name,
            showcase.platform,
            Number(showcase.rewardAmount),
          );
        } else {
          throw new Error('Post not accessible');
        }
      } catch {
        // Post is not accessible — reject
        await this.prisma.socialShowcase.update({
          where: { id: showcase.id },
          data: { status: 'REJECTED', verifiedAt: new Date() },
        });
      }
    }
  }
}
```

Create `backend/src/showcases/showcases.controller.ts`:

```typescript
import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ShowcasesService } from './showcases.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ShowcasePlatform } from '@prisma/client';

@ApiTags('Showcases')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('showcases')
export class ShowcasesController {
  constructor(private showcasesService: ShowcasesService) {}

  @Post('submit')
  submitShowcase(
    @CurrentUser('id') userId: string,
    @Body() dto: { certificateId: string; platform: ShowcasePlatform; postUrl: string },
  ) {
    return this.showcasesService.submitShowcase(userId, dto.certificateId, dto.platform, dto.postUrl);
  }

  @Get('my')
  getMyShowcases(@CurrentUser('id') userId: string) {
    return this.showcasesService.getMyShowcases(userId);
  }
}
```

Create `backend/src/showcases/showcases.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ShowcasesService } from './showcases.service';
import { ShowcasesController } from './showcases.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [ShowcasesController],
  providers: [ShowcasesService],
})
export class ShowcasesModule {}
```

Add the showcase reward email method to `EmailService` (in `backend/src/email/email.service.ts`):

```typescript
  // Add this method to the EmailService class:
  async sendShowcaseRewardEmail(to: string, name: string, platform: string, rewardBdt: number) {
    await this.resend.emails.send({
      from: this.senderEmail,
      to,
      subject: `💰 Showcase Reward Credited — MultiHAT Academy`,
      html: `<h2>Great news, ${name}!</h2>
        <p>Your <strong>${platform}</strong> showcase post has been verified and is still live after 10 days.</p>
        <p><strong>৳${rewardBdt}</strong> has been credited to your Wallet.</p>
        <p>Keep sharing your achievements! — MultiHAT Academy</p>`,
    });
  }
```

---

## Step 6: Backend Utilities — PDF Engines

Both utilities use **`pdf-lib`** for consistency (not PDFKit). This ensures a single library handles all PDF operations — loading existing templates and overlaying dynamic content.

### 6.1 PDF Watermarking Engine

Loads an existing source e-book PDF and overlays the buyer's email as a transparent watermark on every page. This implements the [Anti-Piracy strategy](./CaseStudy.md#37-anti-piracy--digital-rights-management) from the CaseStudy.

Create `backend/src/common/utils/pdf-watermarker.ts`:

```typescript
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

export async function watermarkPdf(
  sourcePath: string,
  destPath: string,
  userEmail: string,
): Promise<void> {
  const sourceBytes = fs.readFileSync(sourcePath);
  const pdfDoc = await PDFDocument.load(sourceBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const refId = randomUUID().slice(0, 8);

  for (const page of pages) {
    const { width, height } = page.getSize();

    // Diagonal watermark — ultra-faint (5% opacity)
    page.drawText(`LICENSED TO: ${userEmail}`, {
      x: width / 2 - 180,
      y: height / 2,
      size: 22,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.05,
      rotate: degrees(-45),
    });

    // Footer watermark — slightly more visible (15% opacity)
    page.drawText(`Licensed to ${userEmail} | Ref: ${refId}`, {
      x: 40,
      y: 20,
      size: 7,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.15,
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(destPath, pdfBytes);
}
```

### 6.2 Certificate PDF Generator

Overlays learner metadata onto a pre-designed Canva certificate template. Implements the [Certificate Issuance Flow](./diagrams/07-certificate-issuance-flow.md).

Create `backend/src/common/utils/certificate-generator.ts`:

```typescript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export async function generateCertificatePdf(
  holderName: string,
  courseTitle: string,
  certificateId: string,
  templateDir: string,
  outputDir: string,
): Promise<Buffer> {
  const templatePath = path.join(templateDir, 'certificate-template.pdf');

  let pdfDoc: PDFDocument;
  if (fs.existsSync(templatePath)) {
    const templateBytes = fs.readFileSync(templatePath);
    pdfDoc = await PDFDocument.load(templateBytes);
  } else {
    // Fallback: create blank landscape A4
    pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([842, 595]);
  }

  const page = pdfDoc.getPages()[0];
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Title
  page.drawText('CERTIFICATE OF ACCOMPLISHMENT', {
    x: 180, y: 450, size: 28, font: boldFont, color: rgb(0.1, 0.1, 0.2),
  });

  // Subtitle
  page.drawText('This credential is proudly presented to:', {
    x: 270, y: 370, size: 14, font: regularFont, color: rgb(0.3, 0.3, 0.3),
  });

  // Holder name
  page.drawText(holderName.toUpperCase(), {
    x: 250, y: 310, size: 24, font: boldFont, color: rgb(0.04, 0.52, 0.89),
  });

  // Course title
  page.drawText(`for successfully completing: ${courseTitle}`, {
    x: 200, y: 250, size: 14, font: regularFont, color: rgb(0.3, 0.3, 0.3),
  });

  // Date & verification
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  page.drawText(`Issue Date: ${dateStr}`, {
    x: 100, y: 120, size: 10, font: regularFont, color: rgb(0.5, 0.5, 0.5),
  });
  page.drawText(`Verify: https://academy.multihat.dev/verify/${certificateId}`, {
    x: 420, y: 120, size: 10, font: regularFont, color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(outputDir, `cert-${certificateId}.pdf`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, pdfBytes);

  return Buffer.from(pdfBytes);
}
```

> **Usage:** Place your Canva-designed template at `backend/templates/certificate-template.pdf`. Generated certificates are saved to `backend/generated/` (add `generated/` to `.gitignore`).

---

## Step 7: Frontend Architecture (Next.js 14)

### 7.1 Global Styles & Theme System

Create `frontend/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 224 71.4% 4.1%;
    --card: 0 0% 100%;
    --card-foreground: 224 71.4% 4.1%;
    --popover: 0 0% 100%;
    --popover-foreground: 224 71.4% 4.1%;
    --primary: 201 96% 40%;
    --primary-foreground: 0 0% 100%;
    --secondary: 220 14.3% 95.9%;
    --secondary-foreground: 220.9 39.3% 11%;
    --muted: 220 14.3% 95.9%;
    --muted-foreground: 220 8.9% 46.1%;
    --accent: 201 96% 96%;
    --accent-foreground: 201 96% 40%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 20% 98%;
    --border: 220 13% 91%;
    --input: 220 13% 83%;
    --ring: 201 96% 40%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 224 71.4% 4.1%;
    --foreground: 210 20% 98%;
    --card: 224 71.4% 6%;
    --card-foreground: 210 20% 98%;
    --popover: 224 71.4% 4.1%;
    --popover-foreground: 210 20% 98%;
    --primary: 201 96% 48%;
    --primary-foreground: 224 71.4% 4.1%;
    --secondary: 215 27.9% 16.9%;
    --secondary-foreground: 210 20% 98%;
    --muted: 215 27.9% 12%;
    --muted-foreground: 217.9 10.6% 64.9%;
    --accent: 201 96% 12%;
    --accent-foreground: 201 96% 80%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 20% 98%;
    --border: 215 27.9% 16.9%;
    --input: 215 27.9% 25%;
    --ring: 201 96% 48%;
  }
}

@layer base {
  body {
    @apply bg-background text-foreground transition-colors duration-300 antialiased;
  }
}

/* Cybersecurity grid effect for hero sections */
.cyber-grid {
  background-image: linear-gradient(rgba(18, 115, 233, 0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(18, 115, 233, 0.05) 1px, transparent 1px);
  background-size: 30px 30px;
}
```

### 7.2 API Client (Centralized Axios Instance)

Create `frontend/src/lib/api.ts`:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Inject auth token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → auto-refresh or redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  },
);

export default api;
```

### 7.3 Auth Context Provider

Create `frontend/src/lib/auth-context.tsx`:

```tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.get('/users/me')
        .then((res) => setUser(res.data.data))
        .catch(() => localStorage.removeItem('accessToken'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', res.data.data.accessToken);
    localStorage.setItem('refreshToken', res.data.data.refreshToken);
    setUser(res.data.data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('accessToken', res.data.data.accessToken);
    localStorage.setItem('refreshToken', res.data.data.refreshToken);
    setUser(res.data.data.user);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### 7.4 Root Layout with Providers

Create `frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'MultiHAT Academy', template: '%s | MultiHAT Academy' },
  description: 'Premium technical e-books with verifiable certificates. Master Google Dorks, OSINT, and cybersecurity.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://academy.multihat.dev'),
  openGraph: {
    siteName: 'MultiHAT Academy',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 7.5 Key Frontend Pages (Route Map)

The following App Router pages must be implemented. Each maps to the [User Journey Diagram](./diagrams/03-user-journey.md):

| Route | File | Auth | Purpose |
|:------|:-----|:-----|:--------|
| `/` | `app/page.tsx` | No | Landing page — hero, featured books, CTAs |
| `/books` | `app/books/page.tsx` | No | Book catalog (SSG) — `GET /api/v1/books` |
| `/books/[slug]` | `app/books/[slug]/page.tsx` | No | Book detail — free chapters (1–3) rendered, paid chapters blurred with CTA |
| `/auth/login` | `app/auth/login/page.tsx` | No | Login form (React Hook Form + Zod) |
| `/auth/register` | `app/auth/register/page.tsx` | No | Registration form (accepts optional `?ref=CODE` for referrals) |
| `/dashboard` | `app/dashboard/page.tsx` | Yes | Purchased items, quiz scores, certificates, wallet balance, referral stats |
| `/dashboard/wallet` | `app/dashboard/wallet/page.tsx` | Yes | Wallet balance, top-up form, transaction history |
| `/dashboard/referrals` | `app/dashboard/referrals/page.tsx` | Yes | Referral code/link, referral stats (pending, qualified, credited) |
| `/dashboard/showcase` | `app/dashboard/showcase/page.tsx` | Yes | Submit social media post URLs, view submission statuses |
| `/checkout/[bookId]` | `app/checkout/[bookId]/page.tsx` | Yes | Coupon input, price display, payment method selection (Gateway or Wallet) |
| `/payment/success` | `app/payment/success/page.tsx` | No | Post-payment confirmation page (purchase or wallet top-up) |
| `/payment/fail` | `app/payment/fail/page.tsx` | No | Payment failure with retry link |
| `/quiz/[bookSlug]` | `app/quiz/[bookSlug]/page.tsx` | Yes | Interactive quiz — uses QuizRenderer component |
| `/verify/[certID]` | `app/verify/[certID]/page.tsx` | No | Public certificate verification (SSR) |
| `/ref/[code]` | `app/ref/[code]/page.tsx` | No | Referral landing page — redirects to `/auth/register?ref=CODE` |

### 7.6 Interactive Quiz Component

Create `frontend/src/components/quiz/QuizRenderer.tsx`:

```tsx
"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

interface Question { id: string; prompt: string; options: string[]; }
interface QuizResult { score: number; total: number; outcome: 'PASS' | 'FAIL'; certId?: string; }

export default function QuizRenderer({ bookSlug, questions }: { bookSlug: string; questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const handleSelect = (qId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert('Please answer all questions before submitting.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(`/quizzes/${bookSlug}/submit`, { selectedAnswers: answers });
      setResult(res.data.data);
    } catch { alert('Submission error. Please try again.'); }
    finally { setLoading(false); }
  };

  if (result) {
    const isPass = result.outcome === 'PASS';
    return (
      <Card className={`border-2 ${isPass ? 'border-emerald-500' : 'border-rose-500'} max-w-xl mx-auto shadow-lg`}>
        <CardHeader className="text-center">
          {isPass
            ? <ShieldCheck className="h-16 w-16 text-emerald-500 animate-bounce mx-auto" />
            : <AlertTriangle className="h-16 w-16 text-rose-500 mx-auto" />}
          <CardTitle className="text-2xl font-bold">
            {isPass ? 'Certification Earned!' : 'Quiz Attempt Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-lg">Score: <strong className="text-2xl">{result.score}</strong> / {result.total} ({Math.round((result.score / result.total) * 100)}%)</p>
          <p className="text-muted-foreground">
            {isPass ? 'Your verifiable credential has been minted and emailed to you.' : 'You need ≥70% to pass. Review the material and try again.'}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          {isPass
            ? <Button asChild className="bg-emerald-600 hover:bg-emerald-700"><a href={`/verify/${result.certId}`}>View Certificate</a></Button>
            : <Button onClick={() => setResult(null)} className="bg-rose-600 hover:bg-rose-700"><RefreshCw className="h-4 w-4 mr-2" /> Try Again</Button>}
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {questions.map((q, idx) => (
        <Card key={q.id} className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader><CardTitle className="text-lg">Q{idx + 1}: {q.prompt}</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {q.options.map((opt) => (
              <button key={opt} onClick={() => handleSelect(q.id, opt)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${answers[q.id] === opt ? 'border-primary bg-primary/10 font-medium' : 'border-muted hover:border-gray-400'}`}>
                {opt}
              </button>
            ))}
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSubmit} disabled={loading} className="w-48 font-bold shadow">
          {loading ? 'Submitting...' : 'Submit Answers'}
        </Button>
      </div>
    </div>
  );
}
```

### 7.7 SEO Configuration

In each page, use Next.js 14 `metadata` export for per-page SEO:

```typescript
// Example: app/books/[slug]/page.tsx
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/books/${params.slug}`);
  const { data: book } = await res.json();
  return {
    title: book.title,
    description: book.description,
    openGraph: { title: book.title, description: book.description, type: 'article' },
  };
}
```

Add `frontend/src/app/robots.ts`:

```typescript
import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/api/'] },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

Add `frontend/src/app/sitemap.ts`:

```typescript
import type { MetadataRoute } from 'next';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/books`);
  const { data } = await res.json();
  const bookUrls = data.books.map((b: any) => ({
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/books/${b.slug}`,
    lastModified: b.updatedAt,
  }));
  return [
    { url: process.env.NEXT_PUBLIC_SITE_URL!, lastModified: new Date() },
    ...bookUrls,
  ];
}
```

---

## Step 8: Testing Strategy

### 8.1 Backend Testing (Jest)

NestJS includes Jest by default. Write unit tests for services and e2e tests for controllers.

**Example: Auth Service Unit Test**

Create `backend/src/auth/auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: { user: { findUnique: jest.fn(), create: jest.fn() } } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock-token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-secret') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should throw ConflictException if email exists', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: '1' } as any);
    await expect(service.register({ email: 'test@test.com', password: 'password', name: 'Test' }))
      .rejects.toThrow(ConflictException);
  });
});
```

**Run tests:**

```bash
# Run from: academy/backend/
npm run test           # Unit tests
npm run test:e2e       # End-to-end tests
npm run test:cov       # Coverage report
```

### 8.2 What to Test

| Layer | What to Test | Priority |
|:------|:------------|:---------|
| **Auth** | Registration (duplicate email, referral code linking, wallet creation), login, token refresh | High |
| **Orders** | Coupon validation, duplicate purchase prevention, price calculation, wallet vs gateway routing | High |
| **Payments** | IPN signature verification, idempotency (double-processing), order status transitions, wallet top-up crediting | Critical |
| **Quizzes** | Score calculation, pass/fail threshold (≥70%), certificate trigger on pass | High |
| **Certificates** | Unique ID generation, verification endpoint returns correct data | Medium |
| **Books** | Slug lookup, pagination, admin CRUD guards | Medium |
| **Wallet** | Balance retrieval, top-up minimum enforcement, debit insufficient balance rejection, transaction logging | High |
| **Referrals** | Referral code generation, cumulative spend tracking, threshold-based reward crediting, double-credit prevention | High |
| **Showcases** | Duplicate submission rejection (same cert + platform), reward amount correctness per platform, 10-day verification window | High |
| **Cron Jobs** | Showcase verification cron fires correctly, credits wallet on live post, rejects on dead post | Medium |

---

## Step 9: Infrastructure & Deployment

### 9.1 Nginx Configuration (DigitalOcean Droplet)

Create `/etc/nginx/sites-available/academy-backend`:

```nginx
server {
    listen 80;
    server_name api.multihat.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.multihat.dev;

    # Cloudflare Origin Certificate (NOT Let's Encrypt)
    ssl_certificate /etc/ssl/certs/multihat_origin.pem;
    ssl_certificate_key /etc/ssl/private/multihat_origin.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

    # Security headers (supplement Helmet.js)
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;

    # Request size limit (for PDF uploads)
    client_max_body_size 25M;

    # Reverse proxy to NestJS
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/academy-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9.2 PM2 Process Manager

Create `backend/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'academy-backend',
      script: 'dist/main.js',
      instances: 1,        // Single instance for 1 GB RAM Droplet
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
```

**Production deploy commands on the Droplet:**

```bash
cd /var/www/academy/backend
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # Auto-start on reboot
```

### 9.3 CI/CD — GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: MultiHAT Academy CI/CD

on:
  push:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # Backend
      - name: Install Backend Deps
        run: cd backend && npm ci
      - name: Generate Prisma Client
        run: cd backend && npx prisma generate
      - name: Backend Lint & Test
        run: cd backend && npm run lint && npm run test

      # Frontend
      - name: Install Frontend Deps
        run: cd frontend && npm ci
      - name: Frontend Build Check
        run: cd frontend && npm run build

  deploy-backend:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - name: SSH Deploy to DigitalOcean
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DROPLET_IP }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/academy/backend
            git pull origin main
            npm install --production
            npx prisma generate
            npx prisma migrate deploy
            npm run build
            pm2 restart ecosystem.config.js --env production
```

> **Frontend CI/CD:** Managed natively by Vercel's GitHub integration — every push to `main` triggers automatic build and deploy.

**Required GitHub Secrets:**

| Secret | Value |
|:-------|:------|
| `DROPLET_IP` | Your DigitalOcean Droplet IPv4 address |
| `SSH_PRIVATE_KEY` | Private SSH key with root access to the Droplet |

### 9.4 Database Backup Strategy

Set up automated daily PostgreSQL backups on the Droplet:

```bash
# Create backup script at /opt/scripts/pg-backup.sh
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U postgres academy_db | gzip > "$BACKUP_DIR/academy_db_$TIMESTAMP.sql.gz"
# Retain only last 14 days
find $BACKUP_DIR -type f -mtime +14 -delete
echo "Backup completed: academy_db_$TIMESTAMP.sql.gz"
```

```bash
chmod +x /opt/scripts/pg-backup.sh
# Add to crontab — daily at 3:00 AM
crontab -e
# Add line: 0 3 * * * /opt/scripts/pg-backup.sh >> /var/log/pg-backup.log 2>&1
```

### 9.5 Monitoring & Alerting

| Tool | Setup | Purpose |
|:-----|:------|:--------|
| **DigitalOcean Monitoring** | Enable in Droplet settings → Monitoring tab | CPU, memory, disk, bandwidth alerts |
| **PM2 Monitoring** | `pm2 monit` (built-in) | Real-time process metrics, restarts, logs |
| **Sentry** (optional) | `npm install @sentry/nestjs` in backend | Error tracking with stack traces, 10K events/month free |
| **Google Analytics 4** | Add `NEXT_PUBLIC_GA_ID` to frontend `.env.local` | Page views, conversion funnels, UTM campaign tracking |
| **Uptime Check** | DigitalOcean Uptime → add `https://api.multihat.dev/api/v1/books` | Alerts on API downtime via email/Slack |

---

## Step 10: Production Deployment Checklist

Execute these verification steps after deployment to confirm everything is production-ready:

### Security

- [ ] `GET https://api.multihat.dev/api/v1/books` responds with CORS header `Access-Control-Allow-Origin: https://academy.multihat.dev`
- [ ] Response headers include `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` (via Helmet)
- [ ] `POST /api/v1/auth/login` returns 429 after 10 rapid attempts (throttler working)
- [ ] API rejects requests from unauthorized origins (test with `curl -H "Origin: https://evil.com"`)
- [ ] All `.env` files are excluded from Git (check `.gitignore`)
- [ ] JWT secrets are unique, high-entropy, production-grade strings (not default values)
- [ ] Cloudflare SSL/TLS mode is set to **Full (Strict)**
- [ ] Nginx is only accepting connections from Cloudflare IPs (optional but recommended)

### API Functionality

- [ ] `POST /api/v1/auth/register` creates a new user, wallet, and returns JWT tokens
- [ ] `POST /api/v1/auth/register` with valid `referralCode` links the referral and creates tracking record
- [ ] `POST /api/v1/auth/login` authenticates and returns access + refresh tokens
- [ ] `POST /api/v1/auth/refresh` issues new token pair from valid refresh token
- [ ] `GET /api/v1/books` returns paginated published books
- [ ] `GET /api/v1/books/:slug` returns book details with chapter metadata
- [ ] `POST /api/v1/orders` creates PENDING order and returns aamarPay redirect URL (gateway) or debits Wallet (wallet-eligible)
- [ ] `POST /api/v1/orders` rejects Wallet payment for gateway-only products (Premium E-Book PDF, Membership with PDF)
- [ ] aamarPay IPN webhook (`POST /api/v1/payments/ipn`) correctly updates order to PAID
- [ ] IPN handler is idempotent (sending same webhook twice does not duplicate processing)
- [ ] `GET /api/v1/quizzes/:bookSlug/questions` returns questions for purchased book only
- [ ] `POST /api/v1/quizzes/:bookSlug/submit` scores correctly and triggers certificate on ≥70%
- [ ] `GET /api/v1/certificates/verify/:certId` returns valid certificate data (public, no auth)
- [ ] Swagger docs accessible at `https://api.multihat.dev/api/docs`

### Wallet & Referrals

- [ ] `GET /api/v1/wallet/balance` returns correct BDT balance, lifetime earned, lifetime spent
- [ ] `POST /api/v1/wallet/topup` enforces minimum ৳50 top-up and returns aamarPay URL
- [ ] Wallet top-up IPN correctly credits wallet balance and logs transaction
- [ ] `GET /api/v1/wallet/transactions` returns paginated transaction history
- [ ] `GET /api/v1/referrals/code` returns user's unique referral code and link
- [ ] `GET /api/v1/referrals/stats` returns correct pending/qualified/credited counts
- [ ] Referral reward (৳100) is credited only when referred user spends ≥ ৳500 cumulative
- [ ] Referral reward is not double-credited (idempotent)

### Certification Showcase

- [ ] `POST /api/v1/showcases/submit` accepts valid post URL and sets `verify_after` = now + 10 days
- [ ] Duplicate submission (same cert + same platform) is rejected with 400
- [ ] `GET /api/v1/showcases/my` returns all submissions with statuses
- [ ] Cron job (`@nestjs/schedule`) runs daily and processes pending showcases past their 10-day window
- [ ] Verified showcase credits correct amount (৳30 LinkedIn/X, ৳20 FB/IG) to user's wallet
- [ ] Rejected showcase sets status to REJECTED and does not credit wallet
- [ ] Showcase reward email is sent on successful verification

### PDF & Email

- [ ] Watermarked PDF generates with buyer's email visible at 5% opacity on every page
- [ ] Certificate PDF generates with correct name, course title, date, and verification URL
- [ ] Resend delivers purchase receipt email within 30 seconds of payment confirmation
- [ ] Certificate email includes PDF attachment and verification link
- [ ] Showcase reward email is delivered on successful verification

### Frontend

- [ ] `academy.multihat.dev` loads with HTTPS (Vercel auto-SSL)
- [ ] Dark/light theme toggle works correctly
- [ ] Free chapters (1–3) render fully; paid chapters show blurred preview with CTA
- [ ] Login/register forms validate input (React Hook Form + Zod)
- [ ] Registration via referral link (`/ref/CODE`) pre-fills referral code
- [ ] Dashboard shows purchased books, quiz scores, certificates, and wallet balance
- [ ] Wallet page shows balance, top-up form, and transaction history
- [ ] Referrals page shows referral link and stats
- [ ] Showcase page allows submitting social media post URLs
- [ ] Checkout page offers Wallet payment option for eligible products
- [ ] Certificate verification page (`/verify/:certID`) works without login
- [ ] Sitemap is accessible at `/sitemap.xml`
- [ ] `robots.txt` disallows `/dashboard` and `/api/`

### Infrastructure

- [ ] PM2 status shows `academy-backend` as `online` (`pm2 status`)
- [ ] Nginx config passes syntax check (`nginx -t`)
- [ ] PostgreSQL daily backup cron is active (`crontab -l`)
- [ ] DigitalOcean monitoring alerts are configured for CPU > 80%, Disk > 90%
- [ ] GitHub Actions pipeline passes on push to `main`
- [ ] Vercel deploys automatically from `main` branch

---

**Prepared by:** Sagar Biswas (MultiHAT)  
**Contact:** [github.com/SagarBiswas-MultiHAT](https://github.com/SagarBiswas-MultiHAT)

_Permission First, Always. Stay Ethical. Stay Curious._
