# MultiHAT Academy Continued Implementation Plan

## Summary
Continue from the current repo state, not from a blank scaffold. Preserve the documented architecture: Next.js frontend, NestJS REST API, PostgreSQL/Prisma, aamarPay, Resend, wallet/referral/showcase rewards, PDF watermarking, Vercel frontend, DigitalOcean backend, Cloudflare DNS/SSL, PM2, Nginx, GitHub Actions.

Current verification: backend build passes, frontend build passes, backend tests fail in `orders.service.spec.ts` because premium-PDF order mocks are stale.

## Implementation Sequence
1. **Docs and Stack Alignment**
   - Update `instructions.md`, `FinalTechStack&Tools.md`, and README only where needed to match the working repo: installed frontend is Next.js 15/React 19/Zod 4, while the docs say Next.js 14/Zod 3.
   - Keep `instructions.md` as the implementation authority when docs conflict, especially `pdf-lib` as the PDF engine.
   - Fix misleading docs around Swagger URL, frontend/backend ports, premium PDF add-on behavior, and current routes.

2. **Step 0-1: Environment and Project Setup Audit**
   - Confirm required tools: Node 20, npm 10, Docker, Git, VS Code extensions.
   - Confirm Cloudflare DNS records for `academy.multihat.dev` and `api.multihat.dev`, Full Strict SSL, and Cloudflare Origin cert paths.
   - Verify `docker-compose.yml`, root `.gitignore`, copied brand assets, frontend public assets, and env variable templates.

3. **Step 2: Database and Prisma**
   - Reconcile Prisma schema with diagrams: users, books, orders, quizzes, certificates, coupons, wallets, wallet transactions, referrals, showcases.
   - Preserve existing additions: `Order.includesPdf`, `WalletTransaction.gatewayTranId`, coupon `includesPdf`.
   - Add or update migrations only if schema/docs drift requires it.
   - Verify seed data creates admin, wallet, Google Dorks book, chapter metadata, and quiz questions.

4. **Step 3-4: Backend Core, Auth, RBAC**
   - Verify global config, throttling, schedule module, Prisma service, response envelope, exception filter, CORS, Helmet, Swagger, and `/api/v1`.
   - Harden auth tests for registration, referral linking, wallet creation, login, refresh, duplicate email, and role protection.
   - Confirm admin-only guards on users/books/orders/coupons.

5. **Step 5: Backend Feature Completion**
   - Fix current failing `OrdersService` tests by updating mocks for `order.findMany`.
   - Audit order flow: duplicate purchase rules, coupon validation, wallet payment, gateway payment, premium PDF add-on, free/discounted orders, referral spend updates.
   - Audit aamarPay IPN: signature check, idempotency, order status transition, coupon usage, top-up confirmation, PDF delivery, failed payment status.
   - Audit quizzes: require purchase on both question fetch and submit, handle zero-question books, prevent duplicate certificate surprises.
   - Audit certificates: issue records, public verify endpoint, PDF generation/email integration.
   - Audit wallet/referrals/showcases: minimum top-up, ledger idempotency, no cash-out, referral threshold, duplicate showcase rejection, 10-day cron rewards.

6. **Step 6: PDF Utilities**
   - Keep `pdf-lib`.
   - Verify watermarked PDF generation from source PDF, generated output path, buyer email watermark, short order ref, and attachment delivery.
   - Verify certificate PDF generation from `backend/templates/certificate-template.pdf` with fallback behavior and generated output under `backend/generated/`.

7. **Step 7: Frontend**
   - Verify all documented routes exist and work: `/`, `/books`, `/books/[slug]`, reader, auth, dashboard, wallet, referrals, showcase, checkout, payment success/fail, quiz, verify, referral redirect.
   - Keep UI wired to response envelope `res.data.data`.
   - Ensure paid chapters are gated, free chapters render, referral registration captures `ref`, checkout handles wallet/gateway/PDF/coupon choices, and dashboard exposes PDF downloads.
   - Verify SEO: metadata, Open Graph image, `robots.ts`, `sitemap.ts`, canonical behavior.

8. **Step 8: Testing**
   - Backend: expand Jest tests for auth, orders, payments, wallet, referrals, showcases, quizzes, certificates, books, coupons, and PDF utils.
   - E2E: replace default “Hello World” e2e with real `/api/v1` smoke tests.
   - Frontend: at minimum keep `next build` as acceptance; add focused tests only if existing tooling supports it without adding new tech.
   - Change backend lint behavior so CI does not rely on a mutating `eslint --fix` script.

9. **Step 9: Infrastructure and Deployment**
   - Verify Nginx config for `api.multihat.dev`, Cloudflare Origin cert, HTTPS redirect, proxy headers, request size limit.
   - Verify `backend/ecosystem.config.js`, PM2 start/restart/save/startup flow.
   - Verify GitHub Actions installs, generates Prisma, builds, tests, migrates, deploys backend via SSH, and leaves Vercel to deploy frontend.
   - Verify PostgreSQL backup script and 14-day retention cron.

10. **Step 10: Production Acceptance**
   - Execute the full checklist from `instructions.md`: security headers, CORS, throttling, auth, books, orders, IPN, wallet, referrals, showcases, PDF/email, frontend flows, sitemap/robots, PM2, Nginx, backups, monitoring, CI/CD.
   - Record any production-only manual checks that cannot be automated, especially live aamarPay, Resend deliverability, Cloudflare DNS/SSL, and social post verification.

## Public Interfaces
- Preserve REST prefix `/api/v1`.
- Preserve documented endpoints for auth, users, books, orders, payments, quizzes, certificates, wallet, referrals, showcases, and coupons.
- Preserve response envelope `{ data, message, statusCode }`.
- Preserve frontend env vars `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`.
- Preserve backend env vars from `instructions.md`, including aamarPay, Resend, JWT, CORS, and wallet minimum top-up settings.

## Test Plan
- First acceptance target: `cd backend && npm test -- --runInBand` passes.
- Build targets: `cd backend && npm run build`, `cd frontend && npm run build` pass.
- Manual smoke: register, login, browse book, read free chapter, blocked paid chapter, purchase via wallet/gateway sandbox, IPN confirm, PDF download/email, quiz pass, cert verify, showcase submit, referral stats, admin CRUD.
- Deployment smoke: production `/api/v1/books`, Swagger, Vercel frontend, PM2 online, Nginx OK, backup cron active.

## Assumptions
- Default version policy: update docs to match the working installed stack rather than downgrade the app.
- No new tools or services will be introduced beyond the documented stack and already-installed packages.
- Current untracked/build outputs remain ignored; no user changes will be reverted.
