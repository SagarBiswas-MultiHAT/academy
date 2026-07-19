# Architecture Overview

High-level system architecture for MultiHAT Academy (`academy.multihat.dev`).

```mermaid
flowchart TB
    user["👤 User Browser"] --> cf

    subgraph cf["🛡️ Cloudflare (Free Plan)"]
        cf_dns["DNS · multihat.dev"]
        cf_cdn["CDN · DDoS Protection"]
        cf_ssl["Public SSL/TLS"]
    end

    cf -->|"Frontend requests\nacademy.multihat.dev"| vercel
    cf -->|"API requests\napi.multihat.dev\n(Cloudflare Origin SSL)"| nginx

    subgraph vercel["▲ Vercel (Hobby Plan)"]
        nextjs["Next.js 15\nApp Router — SSG/SSR\nTailwind CSS · TypeScript"]
        edge_cdn["Global Edge CDN\nAuto-HTTPS"]
    end

    nextjs -->|"REST API calls\n/api/v1/*\n(JSON / HTTPS)"| nginx

    subgraph droplet["DigitalOcean Droplet — 1 vCPU · 1 GB RAM · 25 GB Disk"]
        nginx["Nginx\nReverse Proxy\nCloudflare Origin SSL"]
        pm2["PM2 Process Manager\nAuto-restart · Clustering"]

        subgraph nestjs["NestJS 11 — REST API  ·  Swagger at /api/docs"]
            auth["AuthModule\nJWT + Passport.js"]
            books["BooksModule\nCatalog + Chapter CRUD"]
            orders["OrdersModule\nPurchase Flow"]
            payments["PaymentsModule\naamarPay IPN Handler"]
            coupons["CouponsModule\nPercentage + Fixed Discounts"]
            quizzes["QuizzesModule\nScoring Engine"]
            certs["CertificatesModule\nGeneration + Public Verify"]
            wallet["WalletModule\nBalance · Top-up · Transactions"]
            referrals["ReferralsModule\nTracking · Qualification · Credits"]
            showcases["ShowcasesModule\nSocial Post Verification"]
            scheduler["@nestjs/schedule\nCron Jobs"]
        end

        pdflib["📄 pdf-lib\nWatermarked E-Book PDFs\nCertificate PDFs (UUID v4)"]
        prisma["Prisma ORM\nType-safe Queries · Migrations"]
        pg[("PostgreSQL\nusers · books · orders · coupons\nwallets · wallet_transactions\nreferrals · quiz_questions\nquiz_attempts · certificates\nsocial_showcases")]
    end

    nginx --> pm2 --> nestjs
    nestjs --> pdflib
    nestjs --> prisma --> pg

    payments -->|"Initiate Payment\nPOST /api/v1/orders"| aamarpay["💳 aamarPay\nbKash · Nagad · Rocket · Cards"]
    aamarpay -->|"IPN Webhook\nPOST /api/v1/payments/ipn"| payments
    wallet -->|"Wallet Top-up\ninitiates gateway session"| aamarpay

    nestjs -->|"Send transactional email\n(receipts · PDFs · cert · rewards)"| resend["✉️ Resend\nTransactional Email\n(100 emails/day free)"]
    pdflib -->|"Attach watermarked PDF\nor certificate PDF"| resend
    resend -->|"📧 Delivery to inbox"| user

    scheduler -->|"Verify post still live\n(10-day window)"| showcases
    scheduler -->|"Check ≥ ৳500 spend\nthreshold"| referrals

    nextjs -->|"Page-view events"| ga4["📊 Google Analytics 4"]

    subgraph cicd["CI/CD — GitHub Actions"]
        github["GitHub Repository\n(source of truth)"]
        actions["GitHub Actions\nTest · Lint · Build"]
    end

    github --> actions
    actions -->|"Deploy frontend"| vercel
    actions -->|"Deploy backend\n(SSH + PM2 reload)"| droplet
```
