# MultiHAT Academy — Final Tech Stack & Tools Inventory

**Platform Type:** Full‑stack micro‑credential & e‑commerce platform  
**Core Frameworks:** Next.js 14 (frontend) + NestJS 11 (backend)  
**Database:** PostgreSQL with Prisma ORM  
**API Style:** RESTful API (JSON over HTTPS)  
**Payment Gateway:** aamarPay  
**Primary Developer:** Sagar Biswas  
**Cost Model:** Low fixed cost & pay‑as‑you‑grow  
**Last Updated:** May 20, 2026

---

## 1. Frontend (Client)

| Tool / Library                  | Version         | Role                                                                                                                                 | Cost         |
| :------------------------------ | :-------------- | :----------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| **Next.js**                     | 14 (App Router) | Entire frontend: book chapters, blog, user dashboard, checkout flow, certificate verification. Uses Server Components, SSG, and SSR. | Free         |
| **Tailwind CSS**                | 3.x             | Utility‑first CSS framework for fast, consistent, responsive styling.                                                                | Free         |
| **TypeScript**                  | 5.x             | Type safety across the entire frontend codebase.                                                                                     | Free         |
| **next‑themes**                 | latest          | Dark/light mode support with system preference detection.                                                                            | Free         |
| **next‑seo**                    | latest          | Open Graph, Twitter Cards, JSON‑LD structured data, and sitemap generation for SEO.                                                  | Free         |
| **React Hook Form**             | 7.x             | Performant form handling (login, registration, quiz submission, checkout).                                                            | Free         |
| **Zod**                         | 3.x             | Schema validation for forms and API request/response types.                                                                          | Free         |
| **Recharts / Shadcn/ui Charts** | latest          | Dashboard visualizations: quiz score history, purchase timeline, progress charts.                                                    | Free         |
| **Axios**                       | 1.x             | HTTP client for REST API calls from the frontend to the NestJS backend.                                                              | Free         |
| **Vercel**                      | –               | Frontend hosting for `academy.multihat.dev`: automatic HTTPS, global CDN, CI/CD from GitHub.                                         | Free (Hobby) |

---

## 2. Backend (Server)

| Tool / Library       | Version | Role                                                                                                    | Cost |
| :------------------- | :------ | :------------------------------------------------------------------------------------------------------ | :--- |
| **NestJS**           | 11.x    | Modular backend framework. Handles all REST API endpoints: books, users, payments, quizzes, certificates. | Free |
| **TypeScript**       | 5.x     | Core language for the entire backend.                                                                   | Free |
| **Prisma**           | 6.x     | PostgreSQL ORM: type‑safe queries, auto‑generated client, declarative schema, migration management.    | Free |
| **Passport.js**      | 0.7.x   | JWT authentication strategy for user login and protected route guards.                                  | Free |
| **@nestjs/swagger**  | latest  | Auto‑generates OpenAPI 3.0 documentation served at `/api/docs`.                                         | Free |
| **aamarpay.v2**      | latest  | Node.js SDK for aamarPay payment gateway — initiate payment, handle IPN webhooks.                       | Free |
| **PDFKit**           | 0.15.x  | Generate watermarked e‑book PDFs on the fly for each buyer.                                             | Free |
| **pdf‑lib**          | 1.17.x  | Overlay dynamic text (name, date, cert ID) on a pre‑designed certificate PDF template.                  | Free |
| **Resend**           | latest  | Transactional email delivery: PDF attachments, purchase receipts, certificate emails.                   | Free (100/day) |
| **class‑validator**  | 0.14.x  | DTO validation in NestJS — ensures all incoming request data meets expected schemas.                    | Free |
| **class‑transformer**| 0.5.x   | DTO serialization and transformation — controls which fields are exposed in API responses.              | Free |
| **@nestjs/config**   | latest  | Environment variables and secrets management via `.env` files.                                          | Free |
| **@nestjs/throttler** | latest | Rate limiting per route — prevents brute‑force attacks and API abuse.                                   | Free |
| **Helmet**           | latest  | HTTP security headers middleware (CSP, HSTS, X‑Frame‑Options, etc.).                                   | Free |
| **bcrypt**           | 5.x     | Secure password hashing with configurable salt rounds.                                                  | Free |

---

## 3. Database

| Component      | Details                                                                                                                                           | Cost               |
| :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------ |
| **PostgreSQL** | Relational database engine. ACID‑compliant, ideal for transactional e‑commerce data (orders, payments, user accounts). Hosted on existing DigitalOcean Droplet (1 vCPU · 1 GB RAM · 25 GB Disk). | Existing (no extra cost) |
| **Prisma ORM** | Type‑safe database access layer. Auto‑generated TypeScript client, declarative `schema.prisma`, versioned SQL migrations via `prisma migrate`.    | Free                |
| **Prisma Studio** | Built‑in visual database browser for development and debugging — browse and edit data without writing queries.                                  | Free                |

**Core Schema (Tables):**

| Table            | Purpose                                                              |
| :--------------- | :------------------------------------------------------------------- |
| `users`          | User accounts: email, hashed password, name, role, timestamps       |
| `books`          | Product catalog: title, slug, description, price, chapter metadata   |
| `orders`         | Purchase records: user, book, amount, status, aamarPay transaction ID |
| `quiz_questions` | Multiple‑choice questions per book: prompt, options, correct answer  |
| `quiz_attempts`  | User quiz submissions: answers, score, pass/fail, timestamps        |
| `certificates`   | Issued credentials: unique cert ID, holder, course, issue date       |
| `coupons`        | Discount codes: code, type (% / fixed), expiry, usage count / limit  |

---

## 4. REST API Architecture

| Tool / Practice         | Details                                                                                                 | Cost |
| :---------------------- | :------------------------------------------------------------------------------------------------------ | :--- |
| **API Versioning**      | URI‑based: all endpoints prefixed with `/api/v1/`. Enables non‑breaking evolution.                      | Free |
| **@nestjs/swagger**     | Auto‑generates OpenAPI 3.0 spec from decorators. Interactive docs served at `/api/docs`.                 | Free |
| **Response Envelope**   | Consistent JSON shape: `{ data, message, statusCode }` on all responses.                                | Free |
| **Exception Filters**   | Global NestJS exception filter returns standardized error responses with codes and messages.             | Free |
| **Pagination**          | Offset‑based pagination on list endpoints: `?page=1&limit=20` with total count in response metadata.   | Free |
| **Guards & Interceptors** | `AuthGuard` for protected routes; `TransformInterceptor` for response serialization.                  | Free |

**Endpoint Map:**

| Group          | Method   | Endpoint                                | Auth Required |
| :------------- | :------- | :-------------------------------------- | :------------ |
| **Auth**       | `POST`   | `/api/v1/auth/register`                 | No            |
|                | `POST`   | `/api/v1/auth/login`                    | No            |
|                | `POST`   | `/api/v1/auth/refresh`                  | Yes (refresh) |
| **Books**      | `GET`    | `/api/v1/books`                         | No            |
|                | `GET`    | `/api/v1/books/:slug`                   | No            |
| **Orders**     | `POST`   | `/api/v1/orders`                        | Yes           |
|                | `GET`    | `/api/v1/orders/my`                     | Yes           |
| **Payments**   | `POST`   | `/api/v1/payments/ipn`                  | No (webhook)  |
| **Quizzes**    | `GET`    | `/api/v1/quizzes/:bookSlug/questions`   | Yes           |
|                | `POST`   | `/api/v1/quizzes/:bookSlug/submit`      | Yes           |
| **Certificates** | `GET`  | `/api/v1/certificates/my`              | Yes           |
|                | `GET`    | `/api/v1/certificates/verify/:certId`  | No (public)   |
| **Users**      | `GET`    | `/api/v1/users/me`                      | Yes           |
|                | `PATCH`  | `/api/v1/users/me`                      | Yes           |

---

## 5. Payment Gateway (Bangladesh‑Focused)

| Component           | Details                                                                                                     | Cost                       |
| :------------------ | :---------------------------------------------------------------------------------------------------------- | :------------------------- |
| **aamarPay**        | Primary payment gateway. Merchant account (sandbox → live). Supports bKash, Nagad, Rocket, cards, and 15+ local methods. | 1.85–2.75% per transaction |
| **Coupon/Discount** | Custom server‑side logic in NestJS `CouponsService` — validates code, calculates discount, applies to order total before calling aamarPay. | Free                       |
| **IPN Webhook**     | Server‑to‑server callback from aamarPay on payment completion. NestJS verifies signature, updates order, triggers fulfillment. | Free                       |
| **Fallback**        | If aamarPay is temporarily unavailable, manual invoicing via bKash/Nagad direct transfer with email confirmation. | Free                       |

---

## 6. Content Protection & Anti‑Piracy

| Technique             | Implementation                                                                                     | Cost |
| :-------------------- | :------------------------------------------------------------------------------------------------- | :--- |
| **Dynamic Watermark** | PDFKit inserts buyer's email as tiled text (opacity 0.05) on every page + footer "Licensed to: …". | Free |
| **UTM‑Tracked Link**  | A bonus link inside the PDF with UTM parameters tracked by Google Analytics 4.                     | Free |
| **Google Alerts**     | Automated monitoring for `"Google Dorks Complete Handbook" filetype:pdf` to detect leaks.          | Free |
| **CSS Content Traps** | Author credit boxes inside chapter pages that copy‑paste along with main text.                     | Free |
| **Canonical Tags**    | Built into Next.js metadata API to prevent SEO theft.                                              | Free |

---

## 7. Quiz, Certification & Verification

| Component                  | Tooling                                                                                                             | Cost |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------ | :--- |
| **Quiz Engine**            | Custom NestJS module (`QuizzesModule`): fetches questions from PostgreSQL via Prisma, scores answers, records attempt. | Free |
| **Certificate Design**     | Canva (base template) → exported as PDF.                                                                            | Free |
| **Certificate Generation** | NestJS `CertificatesService` using pdf‑lib to overlay user name, course, date, and unique cert ID (UUID v4) onto the Canva template. | Free |
| **Verification Page**      | Next.js public route `/verify/[certID]` → calls NestJS REST API → displays validity, holder name, course, and issue date. | Free |

---

## 8. Security

| Tool / Practice            | Role                                                                                                   | Cost |
| :------------------------- | :----------------------------------------------------------------------------------------------------- | :--- |
| **Helmet**                 | Sets secure HTTP headers: CSP, HSTS, X‑Frame‑Options, X‑Content‑Type‑Options.                         | Free |
| **@nestjs/throttler**      | Rate limiting: configurable per‑route (e.g., 10 login attempts/min, 100 API requests/min).             | Free |
| **CORS (strict)**          | Only `academy.multihat.dev` (Vercel frontend) is allowlisted for cross‑origin requests.                | Free |
| **Prisma (parameterized)** | All database queries use parameterized statements — eliminates SQL injection vectors.                  | Free |
| **bcrypt**                 | Passwords hashed with bcrypt (salt rounds ≥ 10); plaintext never stored or logged.                     | Free |
| **JWT (short‑lived)**      | Access tokens (15 min) + refresh tokens (7 days); stored in HTTP‑only cookies or `Authorization` header. | Free |
| **Nginx + Cloudflare Origin SSL** | Reverse proxy on DigitalOcean Droplet; Cloudflare handles public SSL, Nginx terminates Cloudflare Origin Certificate for end‑to‑end encryption. | Free |
| **IPN Signature Check**    | aamarPay webhook payloads verified by signature before processing; idempotency prevents duplicates.    | Free |
| **.env + .gitignore**      | All secrets in environment variables via `@nestjs/config`; `.env` excluded from version control.       | Free |

---

## 9. Analytics, Monitoring & SEO

| Tool                            | Role                                                                             | Cost         |
| :------------------------------ | :------------------------------------------------------------------------------- | :----------- |
| **Google Analytics 4**          | Track page views, conversion funnels, UTM campaigns (including PDF bonus links). | Free         |
| **Google Search Console**       | Index monitoring, sitemap submission, removal of accidental indexed pages.       | Free         |
| **Vercel Analytics** (optional) | Lightweight, privacy‑friendly analytics built into Vercel.                       | Free (Hobby) |
| **Sentry** (optional)           | Error monitoring and performance tracking for both frontend and backend.         | Free (10K events/month) |
| **DigitalOcean Monitoring**     | Droplet CPU, memory, disk, and bandwidth monitoring with alerting.               | Free         |

---

## 10. Development & Workflow

| Tool                   | Role                                                                      | Cost |
| :--------------------- | :------------------------------------------------------------------------ | :--- |
| **VS Code**            | Primary code editor with TypeScript, Prisma, and Tailwind IntelliSense.   | Free |
| **GitHub**             | Source control, CI/CD trigger for Vercel (frontend) and deployment pipeline. | Free |
| **GitHub Actions**     | Automated CI/CD: run tests, lint, build, and deploy on push to `main`.    | Free (2,000 min/month) |
| **Prisma Studio**      | Visual database browser — inspect and edit PostgreSQL data during development. | Free |
| **pgAdmin / DBeaver**  | Full‑featured PostgreSQL database management and query tool.              | Free |
| **Pandoc**             | One‑time conversion of original `.docx` notebooks to Markdown.            | Free |
| **Postman / Insomnia** | REST API testing and exploration during development.                      | Free |
| **Docker** (optional)  | Containerized local development for NestJS + PostgreSQL.                  | Free |
| **PM2**                | Node.js process manager for production: auto‑restart, clustering, logs.   | Free |
| **Jest**               | Unit and integration testing for NestJS services, controllers, and guards. | Free |
| **Nginx**              | Reverse proxy on DigitalOcean: SSL termination, request buffering, static file serving. | Free |

---

## 11. Architecture Diagram

```
                              ┌──────────────────────────────────┐
                              │          USERS (Browser)         │
                              └───────────────┬──────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────────────┐
                              │       Vercel (Frontend CDN)      │
                              │         Next.js 14 (SSG/SSR)     │
                              │      Tailwind CSS · TypeScript   │
                              └───────────────┬──────────────────┘
                                              │  REST API calls
                                              │  (JSON / HTTPS)
                                              ▼
                              ┌──────────────────────────────────┐
                              │  DigitalOcean Droplet (Existing) │
                              │  1 vCPU · 1 GB RAM · 25 GB Disk │
                              │  ┌────────────────────────────┐  │
                              │  │   Nginx (Reverse Proxy)    │  │
                              │  │   Let's Encrypt SSL        │  │
                              │  └─────────────┬──────────────┘  │
                              │                │                 │
                              │  ┌─────────────▼──────────────┐  │
                              │  │    NestJS 11 (REST API)    │  │
                              │  │    Managed by PM2          │  │
                              │  │                            │  │
                              │  │  ┌─────────┐ ┌──────────┐ │  │
                              │  │  │ Auth    │ │ Books    │ │  │
                              │  │  │ Module  │ │ Module   │ │  │
                              │  │  ├─────────┤ ├──────────┤ │  │
                              │  │  │ Orders  │ │ Payments │ │  │
                              │  │  │ Module  │ │ Module   │ │  │
                              │  │  ├─────────┤ ├──────────┤ │  │
                              │  │  │ Quizzes │ │ Certs    │ │  │
                              │  │  │ Module  │ │ Module   │ │  │
                              │  │  └─────────┘ └──────────┘ │  │
                              │  └─────────────┬──────────────┘  │
                              │                │  Prisma ORM     │
                              │  ┌─────────────▼──────────────┐  │
                              │  │       PostgreSQL           │  │
                              │  │  (users, books, orders,    │  │
                              │  │   quizzes, certificates,   │  │
                              │  │   coupons)                 │  │
                              │  └────────────────────────────┘  │
                              └──────────┬───────────┬───────────┘
                                         │           │
                              ┌──────────▼──┐  ┌─────▼──────────┐
                              │  aamarPay   │  │  Resend Email  │
                              │  (bKash,    │  │  (PDF delivery │
                              │   Nagad,    │  │   receipts,    │
                              │   Cards)    │  │   certificates)│
                              └─────────────┘  └────────────────┘
```

---

## 12. Budget Summary (First Year)

| Item                          | Cost                                                    |
| :---------------------------- | :------------------------------------------------------ |
| Domain (`academy.multihat.dev`) | $0 — free subdomain of existing `multihat.dev` (name.com) |
| Cloudflare DNS & CDN          | $0 — free plan, already configured for `multihat.dev`   |
| DigitalOcean Droplet          | $0 additional — existing droplet (1 vCPU · 1 GB RAM · 25 GB Disk) already provisioned |
| Vercel Hosting (Frontend)     | Free (Hobby plan)                                       |
| Resend Email                  | Free (100 emails/day)                                   |
| aamarPay Fees                 | ~2% per transaction (only when you sell)                |
| Sentry (optional)             | Free (10K events/month)                                 |
| GitHub Actions CI/CD          | Free (2,000 minutes/month)                              |
| All Other Tools & Libraries   | Open source, free                                       |

**Total additional fixed cost: $0/year** — all infrastructure is either already owned or on free tiers.  
**Variable cost:** only aamarPay transaction fees (1.85–2.75%) when a sale occurs.

---

## 13. Tech Stack Summary Table

| Layer          | Technology                     | Purpose                                    |
| :------------- | :----------------------------- | :----------------------------------------- |
| **Frontend**   | Next.js 14, TypeScript, Tailwind CSS | SSG/SSR web application                  |
| **Backend**    | NestJS 11, TypeScript          | RESTful API server                         |
| **Database**   | PostgreSQL, Prisma ORM         | Relational data storage with type‑safe ORM |
| **API**        | REST (JSON/HTTPS)              | Frontend ↔ Backend communication           |
| **Payments**   | aamarPay                       | Bangladesh local payments (bKash, Nagad, cards) |
| **Auth**       | JWT + Passport.js              | Stateless authentication                   |
| **Email**      | Resend                         | Transactional email delivery               |
| **PDFs**       | PDFKit + pdf‑lib               | Watermarked e‑books + certificates         |
| **Domain**     | `academy.multihat.dev`         | Subdomain of existing `multihat.dev` via Cloudflare |
| **Hosting**    | Vercel + DigitalOcean Droplet (existing) | Frontend CDN + backend VPS (1 vCPU · 1 GB · 25 GB) |
| **CI/CD**      | GitHub Actions                 | Automated testing and deployment           |
| **Security**   | Helmet, Throttler, bcrypt, Prisma | Defense‑in‑depth                         |

---

This stack gives you complete ownership of every piece of your platform, aligns perfectly with your university course, and sets you up for long‑term growth with a production‑proven, type‑safe architecture. The combination of Next.js 14 + NestJS 11 + PostgreSQL + Prisma + REST API provides a robust foundation that scales from a student project to a profitable business. Build boldly!
