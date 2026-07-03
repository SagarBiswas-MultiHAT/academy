# MultiHAT Academy

> A full-stack micro-credential & e-commerce platform that transforms technical notebooks into premium, verifiable digital learning products.

**Live URL:** `academy.multihat.dev`

---

## Overview

MultiHAT Academy sells premium e-books with buyer-specific dynamic watermarks, offers paid web chapters and interactive quizzes, issues verifiable certificates of completion, and features a User Wallet ecosystem with Referral and Certification Showcase Rewards for organic growth. Built by [Sagar Biswas (MultiHAT)](https://github.com/SagarBiswas-MultiHAT) as both a revenue-generating platform and a university course project.

---

## Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Frontend** | Next.js 15 · React 19 · TypeScript · Tailwind CSS | SSG/SSR web application |
| **Backend** | NestJS 11 · TypeScript | RESTful API server |
| **Database** | PostgreSQL · Prisma ORM | Relational data storage |
| **API** | REST (JSON/HTTPS) | Frontend ↔ Backend communication |
| **Payments** | aamarPay | bKash · Nagad · Cards |
| **Auth** | JWT + Passport.js | Stateless authentication |
| **Email** | Resend | Transactional email delivery |
| **PDFs** | pdf-lib | Watermarked e-books + certificates |
| **Scheduling** | @nestjs/schedule | Cron jobs (showcase verification, referral checks) |
| **Hosting** | Vercel + DigitalOcean Droplet | Frontend CDN + backend VPS |
| **DNS/CDN** | Cloudflare (free plan) | DNS · DDoS protection · CDN |
| **CI/CD** | GitHub Actions | Automated testing & deployment |

---

## Infrastructure

```
  User → Cloudflare → Vercel (Next.js 15)
                    ↘
              DigitalOcean Droplet (1 vCPU · 1 GB · 25 GB)
              ├── Nginx (Reverse Proxy + Cloudflare Origin SSL)
              ├── PM2 → NestJS 11 (REST API)
              └── Prisma ORM → PostgreSQL
                       ↓                  ↓
                   aamarPay            Resend
```

---

## Key Features

- **📚 Premium E-books** — Watermarked PDFs with buyer's email embedded on every page
- **📖 Free Previews** — First 3 chapters of each book available without login
- **📖 Paid Web Chapters** — Premium gated web content purchasable individually or via Wallet
- **📝 Interactive Quizzes** — Multiple-choice assessments per book
- **🎓 Verifiable Certificates** — PDF certificates with public verification at `/verify/:certID`
- **💰 User Wallet** — Cash-in only wallet for platform purchases; funded via aamarPay top-ups, referral credits, and showcase rewards
- **🤝 Referral Program** — Earn ৳100/$0.80 per qualified referral (referred user must spend ≥ ৳500/$4)
- **📣 Certification Showcase** — Earn Wallet credits by sharing certifications on LinkedIn, Twitter/X, Facebook, and Instagram (10-day verification)
- **💳 Local Payments** — aamarPay integration (bKash, Nagad, Rocket, cards)
- **🔒 Anti-Piracy** — Dynamic watermarks, UTM-tracked links, Google Alerts
- **🌙 Dark Mode** — Full dark/light theme support
- **📊 User Dashboard** — Purchase history, quiz scores, certificates, wallet balance
- **🏷️ Coupon System** — Percentage and fixed-amount discount codes
- **📧 Email Delivery** — Automatic PDF and receipt delivery via Resend

---

## How to Run Locally

### Prerequisites
- [Node.js](https://nodejs.org/) 20 LTS
- [Docker](https://www.docker.com/) & Docker Compose

### 1. Database Setup
Start the PostgreSQL database using the provided `docker-compose.yml`:
```bash
docker-compose up -d
```

### 2. Backend Setup
Open a new terminal in the `backend` directory and set up the NestJS API:
```bash
# From the repo root:
cd backend
npm install
```
Copy the example env and update credentials to match the Docker container:
```bash
cp .env.example .env
```
Edit `.env` and set the following for local development:
```
DATABASE_URL="postgresql://postgres:localpassword123@localhost:5432/academy_db?schema=public"
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
JWT_ACCESS_SECRET="any-local-secret"
JWT_REFRESH_SECRET="any-other-local-secret"
```
Then run migrations and start the server:
```bash
npx prisma migrate dev
npx prisma db seed  # Optional: seed initial data
npm run start:dev
```
The backend will be accessible at `http://localhost:5000`.
Swagger will be accessible at `http://localhost:5000/api/docs`.

### 3. Frontend Setup
Open another terminal, navigate to the `frontend` directory, and start the Next.js app:
```bash
cd frontend
npm install
cp .env.example .env.local
```
Edit `.env.local` to point to the local backend:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
Then start the development server:
```bash
npm run dev
```
The frontend will typically be accessible at `http://localhost:3000`.

---

## Project Structure

```
academy/
├── CaseStudy.md              # Business case study & technical architecture
├── FinalTechStack&Tools.md   # Complete tech stack inventory
├── README.md                 # This file
└── diagrams/                 # Mermaid architecture & flow diagrams
    ├── 01-architecture-overview.md
    ├── 02-payment-flow.md
    ├── 03-user-journey.md
    ├── 04-data-model.md
    ├── 05-deployment-topology.md
    ├── 06-admin-workflow.md
    ├── 07-certificate-issuance-flow.md
    ├── 08-course-lesson-management.md
    ├── 09-wallet-and-referral-flow.md
    └── 10-showcase-verification-flow.md
```

---

## Documentation

| Document | Description |
|:---------|:------------|
| [CaseStudy.md](./CaseStudy.md) | Full business case study: motivation, revenue model (6-tier products, Wallet, Referral, Showcase), technical architecture, security, marketing strategy, and risk mitigation |
| [FinalTechStack&Tools.md](./FinalTechStack&Tools.md) | Complete inventory of every tool, library, and service with versions, roles, and costs |
| [diagrams/](./diagrams/) | 10 Mermaid diagrams covering architecture, payment flow, user journey, data model, deployment, admin workflow, certificate issuance, content management, wallet & referral flow, and showcase verification |

---

## REST API Endpoints

| Group | Method | Endpoint | Auth |
|:------|:-------|:---------|:-----|
| Auth | `POST` | `/api/v1/auth/register` | No |
| | `POST` | `/api/v1/auth/login` | No |
| | `POST` | `/api/v1/auth/refresh` | Refresh token |
| Books | `GET` | `/api/v1/books` | No |
| | `GET` | `/api/v1/books/:slug` | No |
| Orders | `POST` | `/api/v1/orders` | Yes |
| | `GET` | `/api/v1/orders/my` | Yes |
| | `GET` | `/api/v1/orders/:orderId/pdf` | Yes |
| | `GET` | `/api/v1/orders` | Admin |
| Payments | `POST` | `/api/v1/payments/ipn` | Webhook |
| Quizzes | `GET` | `/api/v1/quizzes/:bookSlug/questions` | Yes |
| | `POST` | `/api/v1/quizzes/:bookSlug/submit` | Yes |
| Certificates | `GET` | `/api/v1/certificates/my` | Yes |
| | `GET` | `/api/v1/certificates/verify/:certId` | No |
| Users | `GET` | `/api/v1/users/me` | Yes |
| | `PATCH` | `/api/v1/users/me` | Yes |
| | `GET` | `/api/v1/users` | Admin |
| | `PATCH` | `/api/v1/users/:id/role` | Admin |
| Wallet | `GET` | `/api/v1/wallet/balance` | Yes |
| | `POST` | `/api/v1/wallet/topup` | Yes |
| | `POST` | `/api/v1/wallet/topup/confirm` | Yes |
| | `GET` | `/api/v1/wallet/transactions` | Yes |
| Coupons | `GET` | `/api/v1/coupons/verify/:code` | No |
| | `POST` | `/api/v1/coupons` | Admin |
| | `GET` | `/api/v1/coupons` | Admin |
| | `PATCH` | `/api/v1/coupons/:id` | Admin |
| | `DELETE` | `/api/v1/coupons/:id` | Admin |
| Referrals | `GET` | `/api/v1/referrals/code` | Yes |
| | `GET` | `/api/v1/referrals/stats` | Yes |
| Showcases | `POST` | `/api/v1/showcases/submit` | Yes |
| | `GET` | `/api/v1/showcases/my` | Yes |

---

## Verification Status

- Local backend tests: `npm test -- --runInBand`
- Backend build: `npm run build`
- Frontend build: `npm run build`
- DNS audit on July 3, 2026: `academy.multihat.dev` and `api.multihat.dev` returned NXDOMAIN via `nslookup`; configure Cloudflare records before production deployment.
- Production-only checks still require live access to Cloudflare, Vercel, the DigitalOcean droplet, aamarPay, and Resend.

---

## Budget

| Item | Cost |
|:-----|:-----|
| Domain (`academy.multihat.dev`) | $0 — free subdomain |
| Cloudflare DNS & CDN | $0 — free plan |
| DigitalOcean Droplet | $0 additional — existing |
| Vercel Hosting | Free (Hobby) |
| Resend Email | Free (100/day) |
| aamarPay Fees | ~2% per transaction |

**Total additional fixed cost: $0/year**

---

## Author

**Sagar Biswas** — [@SagarBiswas-MultiHAT](https://github.com/SagarBiswas-MultiHAT)

_Permission First, Always. Stay Ethical. Stay Curious._
