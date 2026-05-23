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
| **Frontend** | Next.js 14 · TypeScript · Tailwind CSS | SSG/SSR web application |
| **Backend** | NestJS 11 · TypeScript | RESTful API server |
| **Database** | PostgreSQL · Prisma ORM | Relational data storage |
| **API** | REST (JSON/HTTPS) | Frontend ↔ Backend communication |
| **Payments** | aamarPay | bKash · Nagad · Cards |
| **Auth** | JWT + Passport.js | Stateless authentication |
| **Email** | Resend | Transactional email delivery |
| **PDFs** | PDFKit + pdf-lib | Watermarked e-books + certificates |
| **Scheduling** | @nestjs/schedule | Cron jobs (showcase verification, referral checks) |
| **Hosting** | Vercel + DigitalOcean Droplet | Frontend CDN + backend VPS |
| **DNS/CDN** | Cloudflare (free plan) | DNS · DDoS protection · CDN |
| **CI/CD** | GitHub Actions | Automated testing & deployment |

---

## Infrastructure

```
  User → Cloudflare → Vercel (Next.js 14)
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
| Payments | `POST` | `/api/v1/payments/ipn` | Webhook |
| Quizzes | `GET` | `/api/v1/quizzes/:bookSlug/questions` | Yes |
| | `POST` | `/api/v1/quizzes/:bookSlug/submit` | Yes |
| Certificates | `GET` | `/api/v1/certificates/my` | Yes |
| | `GET` | `/api/v1/certificates/verify/:certId` | No |
| Users | `GET` | `/api/v1/users/me` | Yes |
| | `PATCH` | `/api/v1/users/me` | Yes |
| Wallet | `GET` | `/api/v1/wallet/balance` | Yes |
| | `POST` | `/api/v1/wallet/topup` | Yes |
| | `GET` | `/api/v1/wallet/transactions` | Yes |
| Referrals | `GET` | `/api/v1/referrals/code` | Yes |
| | `GET` | `/api/v1/referrals/stats` | Yes |
| Showcases | `POST` | `/api/v1/showcases/submit` | Yes |
| | `GET` | `/api/v1/showcases/my` | Yes |

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