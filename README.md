# MultiHAT Academy

> A full-stack micro-credential & e-commerce platform that transforms technical notebooks into premium, verifiable digital learning products.

**Live URL:** `academy.multihat.dev`

---

## Overview

MultiHAT Academy sells premium e-books with buyer-specific dynamic watermarks, offers interactive quizzes, and issues verifiable certificates of completion. Built by [Sagar Biswas (MultiHAT)](https://github.com/SagarBiswas-MultiHAT) as both a revenue-generating platform and a university course project.

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
- **📝 Interactive Quizzes** — Multiple-choice assessments per book
- **🎓 Verifiable Certificates** — PDF certificates with public verification at `/verify/:certID`
- **💳 Local Payments** — aamarPay integration (bKash, Nagad, Rocket, cards)
- **🔒 Anti-Piracy** — Dynamic watermarks, UTM-tracked links, Google Alerts
- **🌙 Dark Mode** — Full dark/light theme support
- **📊 User Dashboard** — Purchase history, quiz scores, certificates
- **📖 Free Previews** — First 3 chapters of each book available without login
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
    └── 08-course-lesson-management.md
```

---

## Documentation

| Document | Description |
|:---------|:------------|
| [CaseStudy.md](./CaseStudy.md) | Full business case study: motivation, revenue model, technical architecture, security, marketing strategy, and risk mitigation |
| [FinalTechStack&Tools.md](./FinalTechStack&Tools.md) | Complete inventory of every tool, library, and service with versions, roles, and costs |
| [diagrams/](./diagrams/) | 8 Mermaid diagrams covering architecture, payment flow, user journey, data model, deployment, admin workflow, certificate issuance, and content management |

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