# MultiHAT Academy — Production Deployment Guide

> **Target Stack:** DigitalOcean Droplet (backend + PostgreSQL) + Vercel (frontend)
> **Domain:** `academy.multihat.dev` (frontend) / `api.multihat.dev` (backend)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Provisioning](#2-server-provisioning)
3. [PostgreSQL Setup](#3-postgresql-setup)
4. [Backend Deployment](#4-backend-deployment)
5. [Nginx Reverse Proxy](#5-nginx-reverse-proxy)
6. [SSL / TLS Configuration](#6-ssl--tls-configuration)
7. [PM2 Process Manager](#7-pm2-process-manager)
8. [Frontend Deployment (Vercel)](#8-frontend-deployment-vercel)
9. [Database Backups](#9-database-backups)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Monitoring & Alerting](#11-monitoring--alerting)
12. [Production Checklist](#12-production-checklist)

---

## 1. Prerequisites

| Requirement | Minimum |
|:------------|:--------|
| DigitalOcean Droplet | 1 GB RAM / 1 vCPU (Ubuntu 22.04 LTS) |
| Node.js | v20 LTS |
| PostgreSQL | v16 |
| PM2 | Latest (`npm install -g pm2`) |
| Nginx | Latest from apt |
| Domain | Configured with Cloudflare DNS |
| Git | Installed on server |

### Local Requirements

- Docker Desktop (for local PostgreSQL)
- Node.js 20+
- Prisma v6 from the backend's locked project dependencies (`npm ci`)

---

## 2. Server Provisioning

### 2.1 Initial Droplet Setup

```bash
# SSH into your Droplet
ssh root@YOUR_DROPLET_IP

# Update system packages
apt update && apt upgrade -y

# Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify versions
node -v   # v20.x.x
npm -v    # 10.x.x

# Install PM2 globally
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git

# Create application directory
mkdir -p /var/www/academy
cd /var/www/academy

# Clone the repository
git clone https://github.com/SagarBiswas-MultiHAT/academy.git .
```

### 2.2 Firewall Configuration

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

## 3. PostgreSQL Setup

### 3.1 Install PostgreSQL 16

```bash
# Add PostgreSQL 16 repo
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-16

# Start and enable
systemctl start postgresql
systemctl enable postgresql
```

### 3.2 Create Production Database

```bash
sudo -u postgres psql
```

```sql
-- Create production database and user
CREATE USER academy_user WITH PASSWORD 'YOUR_STRONG_DB_PASSWORD_HERE';
CREATE DATABASE academy_db OWNER academy_user;
GRANT ALL PRIVILEGES ON DATABASE academy_db TO academy_user;

-- Enable UUID extension
\c academy_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

### 3.3 Configure PostgreSQL Security

Edit `/etc/postgresql/16/main/pg_hba.conf`:

```
# Allow local connections with password
local   academy_db   academy_user   md5
```

```bash
systemctl restart postgresql
```

---

## 4. Backend Deployment

### 4.1 Install Dependencies

```bash
cd /var/www/academy/backend

# Install locked dependencies, including build-time dev dependencies
npm ci

```

### 4.2 Configure Environment

Create `/var/www/academy/backend/.env`:

```bash
cp .env.example .env
nano .env
```

Fill in all production values (see [Section 4.3](#43-production-environment-variables) below).

### 4.3 Production Environment Variables

> ⚠️ **CRITICAL:** Never commit `.env` to Git. All values below must be production-grade.

```env
# ─── Database ─────────────────────────────────────────────────
DATABASE_URL="postgresql://academy_user:YOUR_STRONG_DB_PASSWORD@localhost:5432/academy_db?schema=public"

# ─── JWT Secrets (generate with: openssl rand -base64 64) ────
JWT_ACCESS_SECRET="GENERATE_A_64_CHAR_RANDOM_STRING"
JWT_REFRESH_SECRET="GENERATE_A_DIFFERENT_64_CHAR_RANDOM_STRING"

# ─── Server ──────────────────────────────────────────────────
PORT=5000
NODE_ENV="production"

# ─── aamarPay (Live Credentials) ─────────────────────────────
AAMARPAY_STORE_ID="your_live_store_id"
AAMARPAY_SIGNATURE_KEY="your_live_signature_key"
AAMARPAY_BASE_URL="https://secure.aamarpay.com"

# ─── Email (Resend) ─────────────────────────────────────────
RESEND_API_KEY="re_YOUR_PRODUCTION_API_KEY"
SENDER_EMAIL="academy@multihat.dev"

# ─── URLs ────────────────────────────────────────────────────
FRONTEND_URL="https://academy.multihat.dev"
API_URL="https://api.multihat.dev/api/v1"

# ─── Wallet ──────────────────────────────────────────────────
WALLET_MIN_TOPUP_BDT="50"

# PDF generation
CERTIFICATE_TEMPLATE_DIR="templates"
CERTIFICATE_OUTPUT_DIR="generated/certificates"
```

### 4.4 Run Migrations & Seed

```bash
cd /var/www/academy/backend

# Generate Prisma client
npx prisma generate

# Run migrations against production DB
npx prisma migrate deploy

# Seed admin user (first time only)
npx prisma db seed
```

### 4.5 Build for Production

```bash
npm run build
```

> **Important:** After seeding, immediately change the admin password via the API or Prisma Studio. The default seed credentials (`admin@multihat.dev` / `AdminSecure!2026`) are for initial setup only.

---

## 5. Nginx Reverse Proxy

### 5.1 Backend API Configuration

Create `/etc/nginx/sites-available/academy-backend`:

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name api.multihat.dev;
    return 301 https://$host$request_uri;
}

# HTTPS — Reverse proxy to NestJS on port 5000
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

### 5.2 Enable and Test

```bash
# Symlink to sites-enabled
sudo ln -s /etc/nginx/sites-available/academy-backend /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 6. SSL / TLS Configuration

### Option A: Cloudflare Origin Certificate (Recommended)

If using Cloudflare as DNS proxy:

1. Go to **Cloudflare Dashboard → SSL/TLS → Origin Server**
2. Click **Create Certificate**
3. Choose RSA (2048) and hostnames: `*.multihat.dev`, `multihat.dev`
4. Set validity to 15 years
5. Save the certificate and key:

```bash
# Save certificate
sudo nano /etc/ssl/certs/multihat_origin.pem
# Paste the Origin Certificate

# Save private key
sudo nano /etc/ssl/private/multihat_origin.key
# Paste the Private Key

# Set permissions
sudo chmod 600 /etc/ssl/private/multihat_origin.key
```

6. In Cloudflare: set **SSL/TLS mode → Full (Strict)**

### Option B: Let's Encrypt (Certbot)

If **not** using Cloudflare proxy (DNS-only mode):

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain certificate (Nginx plugin auto-configures)
sudo certbot --nginx -d api.multihat.dev

# Verify auto-renewal
sudo certbot renew --dry-run
```

Certbot will automatically:
- Obtain the SSL certificate
- Modify the Nginx config to use it
- Set up a cron job for auto-renewal (every 60 days)

---

## 7. PM2 Process Manager

### 7.1 Ecosystem Configuration

The PM2 config file is already at `backend/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'academy-backend',
      script: 'dist/src/main.js',
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

### 7.2 Start & Manage

```bash
cd /var/www/academy/backend

# Start the application
pm2 start ecosystem.config.js --env production

# Save the process list (survives reboot)
pm2 save

# Configure auto-start on system boot
pm2 startup
# Copy and run the command it outputs

# Verify status
pm2 status
pm2 logs academy-backend --lines 50
```

### 7.3 Common PM2 Commands

```bash
pm2 restart academy-backend      # Restart
pm2 reload academy-backend       # Zero-downtime reload
pm2 stop academy-backend         # Stop
pm2 delete academy-backend       # Remove from PM2
pm2 monit                        # Real-time monitoring dashboard
pm2 logs academy-backend         # Tail logs
pm2 flush                        # Clear all logs
```

### 7.4 Frontend PM2 (Optional — If Not Using Vercel)

If you want to self-host the frontend on the same Droplet instead of Vercel, add this to `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'academy-backend',
      script: 'dist/src/main.js',
      cwd: '/var/www/academy/backend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
    {
      name: 'academy-frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/academy/frontend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

Then add an Nginx config for the frontend:

```nginx
server {
    listen 80;
    server_name academy.multihat.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name academy.multihat.dev;

    ssl_certificate /etc/ssl/certs/multihat_origin.pem;
    ssl_certificate_key /etc/ssl/private/multihat_origin.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
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

---

## 8. Frontend Deployment (Vercel)

### 8.1 Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import the `academy` repository
4. Set the **Root Directory** to `frontend`
5. Set **Framework Preset** to `Next.js`

### 8.2 Environment Variables on Vercel

Add these in **Vercel → Project Settings → Environment Variables**:

| Variable | Production Value |
|:---------|:-----------------|
| `NEXT_PUBLIC_API_URL` | `https://api.multihat.dev/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `https://academy.multihat.dev` |
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXXXXX` (your Google Analytics ID) |

### 8.3 Custom Domain

1. In Vercel, go to **Project Settings → Domains**
2. Add `academy.multihat.dev`
3. In Cloudflare, add a CNAME record:
   - Name: `academy`
   - Target: `cname.vercel-dns.com`
   - Proxy: **DNS Only** (gray cloud) — Vercel handles SSL

### 8.4 Automatic Deploys

Every push to the `main` branch will automatically trigger a Vercel build and deploy. No additional CI/CD configuration is needed for the frontend.

---

## 9. Database Backups

### 9.1 Automated Daily Backup Script

Create `/opt/scripts/pg-backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U postgres academy_db | gzip > "$BACKUP_DIR/academy_db_$TIMESTAMP.sql.gz"
# Retain only last 14 days
find $BACKUP_DIR -type f -mtime +14 -delete
echo "Backup completed: academy_db_$TIMESTAMP.sql.gz"
```

### 9.2 Schedule with Cron

```bash
chmod +x /opt/scripts/pg-backup.sh

# Open crontab
crontab -e

# Add this line — runs daily at 3:00 AM server time
0 3 * * * /opt/scripts/pg-backup.sh >> /var/log/pg-backup.log 2>&1
```

### 9.3 Manual Backup & Restore

```bash
# Manual backup
pg_dump -U postgres academy_db | gzip > academy_db_manual.sql.gz

# Restore from backup
gunzip < academy_db_manual.sql.gz | psql -U postgres academy_db
```

---

## 10. CI/CD Pipeline

The GitHub Actions workflow is at `.github/workflows/deploy.yml`. It runs on every push to `main`:

### 10.1 Pipeline Stages

1. **Build & Test** — Installs deps, generates Prisma client, runs lint + tests (backend), builds frontend
2. **Deploy Backend** — SSHes into the Droplet, pulls latest code, runs migrations, rebuilds, and restarts PM2

### 10.2 Required GitHub Secrets

Go to **GitHub → Repository → Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|:-------|:------|
| `DROPLET_IP` | Your DigitalOcean Droplet's IPv4 address |
| `SSH_PRIVATE_KEY` | The full private SSH key with root access to the Droplet |

### 10.3 SSH Key Setup

```bash
# On your LOCAL machine, generate a deploy key
ssh-keygen -t ed25519 -C "deploy@academy" -f ~/.ssh/academy_deploy

# Copy the public key to the Droplet
ssh-copy-id -i ~/.ssh/academy_deploy.pub root@YOUR_DROPLET_IP

# Add the PRIVATE key content as the SSH_PRIVATE_KEY secret in GitHub
cat ~/.ssh/academy_deploy
```

---

## 11. Monitoring & Alerting

| Tool | Setup | Purpose |
|:-----|:------|:--------|
| **DigitalOcean Monitoring** | Enable in Droplet settings → Monitoring tab | CPU, memory, disk, bandwidth alerts |
| **PM2 Monitoring** | `pm2 monit` (built-in) | Real-time process metrics, restarts, logs |
| **Application logs** | `pm2 logs academy-backend` and `/var/log/nginx/*.log` | Runtime diagnostics using the deployed stack |
| **Google Analytics 4** | Add `NEXT_PUBLIC_GA_ID` to frontend env | Page views, conversion funnels, UTM campaign tracking |
| **Uptime Check** | DigitalOcean Uptime → add `https://api.multihat.dev/api/v1/books` | Alerts on API downtime via email/Slack |

### Recommended Alert Thresholds

```
CPU > 80% for 5 minutes → Email alert
Disk > 90% → Email alert
Memory > 90% for 5 minutes → Email alert
PM2 process crashes → PM2 auto-restarts (built-in)
```

---

## 12. Production Checklist

Execute these verification steps after deployment:

### Security
- [ ] `GET https://api.multihat.dev/api/v1/books` responds with correct CORS header
- [ ] Response headers include `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`
- [ ] `POST /api/v1/auth/login` returns 429 after 10 rapid attempts (throttler working)
- [ ] All `.env` files are excluded from Git
- [ ] JWT secrets are unique, high-entropy, production-grade strings
- [ ] Cloudflare SSL/TLS mode is set to **Full (Strict)**
- [ ] Default admin password has been changed

### API Functionality
- [ ] Registration creates user + wallet + returns JWT tokens
- [ ] Registration with referral code links the referral correctly
- [ ] Login returns access + refresh tokens
- [ ] Books API returns paginated published books
- [ ] Order creation returns aamarPay redirect URL (gateway) or debits wallet
- [ ] aamarPay IPN webhook updates order to PAID correctly
- [ ] Quiz submission scores correctly and triggers certificate on ≥70%
- [ ] Certificate verification works without authentication
- [ ] Swagger docs accessible at `https://api.multihat.dev/api/docs`

### Wallet & Referrals
- [ ] Wallet balance endpoint returns correct BDT amounts
- [ ] Top-up enforces minimum ৳50 and returns aamarPay URL
- [ ] Referral reward (৳100) credits only when referred user spends ≥ ৳500
- [ ] Referral reward is idempotent (not double-credited)

### Infrastructure
- [ ] PM2 status shows `academy-backend` as `online`
- [ ] Nginx config passes syntax check (`nginx -t`)
- [ ] PostgreSQL daily backup cron is active (`crontab -l`)
- [ ] GitHub Actions pipeline passes on push to `main`
- [ ] Frontend auto-deploys on Vercel from `main` branch

---

## Quick Reference Commands

```bash
# ─── Server Management ───────────────────────────────
pm2 status                          # Check all processes
pm2 restart academy-backend         # Restart backend
pm2 logs academy-backend --lines 50 # View recent logs
sudo systemctl reload nginx         # Reload Nginx config
sudo nginx -t                       # Test Nginx syntax

# ─── Database ────────────────────────────────────────
cd /var/www/academy/backend
npx prisma migrate deploy           # Apply pending migrations
npx prisma studio                   # Visual database browser (port 5555)
pg_dump -U postgres academy_db > backup.sql  # Manual backup

# ─── Deployment ──────────────────────────────────────
cd /var/www/academy/backend
git pull origin main
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart ecosystem.config.js --env production

# ─── Troubleshooting ─────────────────────────────────
pm2 logs academy-backend --err      # Error logs only
sudo tail -f /var/log/nginx/error.log  # Nginx errors
sudo journalctl -u postgresql       # PostgreSQL logs
```

---

**Prepared by:** Sagar Biswas (MultiHAT)
**Contact:** [github.com/SagarBiswas-MultiHAT](https://github.com/SagarBiswas-MultiHAT)
