# Architecture Overview

High-level system architecture for MultiHAT Academy (`academy.multihat.dev`).

```mermaid
flowchart TB
    user["👤 User Browser"] --> cf["🛡️ Cloudflare\nDNS · CDN · DDoS Protection"]

    cf --> vercel["▲ Vercel\nacademy.multihat.dev\nNext.js 14 — SSG/SSR"]
    cf --> nginx

    vercel -->|"REST API calls\n/api/v1/*\n(JSON / HTTPS)"| nginx

    subgraph droplet["DigitalOcean Droplet — 1 vCPU · 1 GB RAM · 25 GB Disk"]
        nginx["Nginx\nReverse Proxy\nCloudflare Origin SSL"]
        pm2["PM2 Process Manager"]

        subgraph nestjs["NestJS 11 — REST API Server"]
            auth["AuthModule\nJWT + Passport"]
            books["BooksModule\nCatalog CRUD"]
            orders["OrdersModule\nPurchase Flow"]
            payments["PaymentsModule\naamarPay IPN"]
            quizzes["QuizzesModule\nScoring Engine"]
            certs["CertificatesModule\nGeneration + Verify"]
            wallet["WalletModule\nBalance · Top-up"]
            referrals["ReferralsModule\nTracking · Credits"]
            showcases["ShowcasesModule\nSocial Verification"]
            scheduler["@nestjs/schedule\nCron Jobs"]
        end

        prisma["Prisma ORM\nType-safe Queries"]
        pg[("PostgreSQL\nusers · books · orders\nwallets · referrals\nshowcases · certificates")]
    end

    nginx --> pm2 --> nestjs
    nestjs --> prisma --> pg

    payments -->|"Initiate Payment\nIPN Webhook"| pay["💳 aamarPay\nbKash · Nagad · Cards"]
    pay -->|"Payment Confirmation"| payments
    wallet -->|"Wallet Top-up"| pay

    nestjs --> pdfgen["📄 pdf-lib\nWatermarked E-books\n+ Certificate PDFs"]

    nestjs -->|"Send Email"| email["✉️ Resend\nTransactional Email"]
    pdfgen --> email

    email -->|"Receipts · PDFs\nCertificates"| user

    scheduler -->|"10-day verify"| showcases
    scheduler -->|"Referral threshold check"| referrals
```
