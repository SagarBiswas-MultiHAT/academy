# MultiHAT Academy — Corrected Production Deployment Guide

This guide reflects the final working setup that was validated during deployment.

## Final architecture

- **Frontend:** `https://academy.multihat.dev` on **Vercel**
- **Backend API:** `https://academy-api.multihat.dev` on the **DigitalOcean Droplet**
- **Database:** PostgreSQL on the Droplet
- **SSL for API:** **Let’s Encrypt** on the Droplet
- **Cloudflare:** DNS + proxy for the API hostname, DNS-only CNAME for the Vercel frontend hostname

### Important changes from the old draft

- Do **not** use `api.academy.multihat.dev`. Use **`academy-api.multihat.dev`**.
- Do **not** reverse-proxy the frontend through Nginx.
- Do **not** use a Cloudflare Origin Certificate for the public API hostname.
- Use **Let’s Encrypt** for `academy-api.multihat.dev`, so Vercel’s server-side fetches can verify the certificate chain correctly.
- If another application already uses port **5000**, run Academy backend on **5001**.

---

## 1) Cloudflare DNS

Log in to Cloudflare and open the `multihat.dev` zone.

Create these records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| `CNAME` | `academy` | the Vercel target shown in Vercel (for example `academy-xxxx.vercel-dns-017.com`) | **DNS only** |
| `A` | `academy-api` | `YOUR_DROPLET_IP` | **Proxied** (orange cloud) |

### Notes

- `academy.multihat.dev` should resolve to Vercel directly.
- `academy-api.multihat.dev` should point to the Droplet.
- If Cloudflare shows any challenge page for the API, first check Bot Fight Mode and any custom WAF rules. In the final working setup, the API worked with Cloudflare proxy after switching the Droplet SSL to Let’s Encrypt.

### SSL mode

Set Cloudflare SSL/TLS mode to **Full (strict)**.

---

## 2) Deploy the frontend on Vercel

In Vercel:

1. Import the GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Keep the framework as **Next.js**.
4. Add these environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://academy-api.multihat.dev/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `https://academy.multihat.dev` |

5. Deploy.

Add the custom domain `academy.multihat.dev` to the Vercel project. Use the CNAME target Vercel gives you in the Cloudflare DNS record above.

### Frontend env reminder

Do not point the frontend to `academy.multihat.dev/api/v1`. It must call the backend API host:

```env
NEXT_PUBLIC_API_URL=https://academy-api.multihat.dev/api/v1
```

---

## 3) Prepare the Droplet

SSH into the Droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

Update the OS:

```bash
apt update && apt upgrade -y
```

Install the required packages:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git gnupg ca-certificates
npm install -g pm2
```

Verify:

```bash
node -v
npm -v
pm2 -v
nginx -v
```

### Firewall

Allow SSH and Nginx:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

If UFW warns about disrupting SSH, that is normal as long as OpenSSH is already allowed.

---

## 4) Install PostgreSQL 16

Use the PostgreSQL APT repo with a signed keyring:

```bash
install -d /usr/share/keyrings
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql.gpg
echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
apt update
apt install -y postgresql-16
systemctl enable postgresql
systemctl start postgresql
```

Check the service:

```bash
systemctl status postgresql --no-pager
```

---

## 5) Create the production database

Open psql:

```bash
sudo -u postgres psql
```

Inside psql:

```sql
CREATE USER academy_user WITH PASSWORD 'REPLACE_WITH_URL_SAFE_PASSWORD';
CREATE DATABASE academy_db OWNER academy_user;
GRANT ALL PRIVILEGES ON DATABASE academy_db TO academy_user;
\c academy_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

### Password note

Avoid special characters like `@`, `#`, `?`, `/`, `:` in the database password unless you URL-encode them in `DATABASE_URL`.

A simple safe option is to generate a hex password:

```bash
openssl rand -hex 24
```

---

## 6) Clone the repository on the Droplet

```bash
mkdir -p /var/www/academy
cd /var/www/academy
git clone https://github.com/SagarBiswas-MultiHAT/academy.git .
```

Install backend dependencies:

```bash
cd /var/www/academy/backend
npm ci
```

---

## 7) Create the backend `.env`

Create `/var/www/academy/backend/.env`:

```env
# Database
DATABASE_URL="postgresql://academy_user:REPLACE_WITH_URL_SAFE_PASSWORD@localhost:5432/academy_db?schema=public"

# JWT Secrets
JWT_ACCESS_SECRET="GENERATE_WITH_openssl_rand_-base64_64"
JWT_REFRESH_SECRET="GENERATE_A_DIFFERENT_SECRET"

# Server
NODE_ENV="production"
PORT=5001

# aamarPay (live credentials)
AAMARPAY_STORE_ID="your_live_store_id"
AAMARPAY_SIGNATURE_KEY="your_live_signature_key"
AAMARPAY_BASE_URL="https://secure.aamarpay.com"

# Email (Resend)
RESEND_API_KEY="re_YOUR_PRODUCTION_API_KEY"
SENDER_EMAIL="academy@multihat.dev"

# URLs
FRONTEND_URL="https://academy.multihat.dev"
API_URL="https://academy-api.multihat.dev/api/v1"

# Wallet
WALLET_MIN_TOPUP_BDT="50"

# PDF generation
CERTIFICATE_TEMPLATE_DIR="templates"
CERTIFICATE_OUTPUT_DIR="generated/certificates"
```

### JWT secret generation

Run these twice on the Droplet:

```bash
openssl rand -base64 64
openssl rand -base64 64
```

Use two different outputs.

### Resend note

`SENDER_EMAIL` must be a verified sender at your verified `multihat.dev` domain.

---

## 8) Backend PM2 configuration

If another app already uses port 5000, keep Academy on 5001.

Example `ecosystem.config.js`:

```js
module.exports = {
  apps: [
    {
      name: 'academy-backend',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '800M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
    },
  ],
};
```

Then run:

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

When `pm2 startup` prints a command, copy and run that exact command.

### Important PM2 note

If you edit `.env` or `ecosystem.config.js`, restart with:

```bash
pm2 restart ecosystem.config.js --update-env
```

Do not assume PM2 picks up environment changes automatically.

---

## 9) Nginx for the backend API

Create `/etc/nginx/sites-available/academy-api`:

```nginx
server {
    listen 80;
    server_name academy-api.multihat.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name academy-api.multihat.dev;

    ssl_certificate     /etc/letsencrypt/live/academy-api.multihat.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/academy-api.multihat.dev/privkey.pem;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/academy-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Why Let’s Encrypt here?

The API is called by Vercel server-side rendering. A public, fully trusted certificate chain is required. Cloudflare Origin Certificates are fine for some Cloudflare-only origin setups, but they are not the right choice for this public API hostname.

---

## 10) Issue the Let’s Encrypt certificate

If you have not already done so, run:

```bash
certbot --nginx -d academy-api.multihat.dev
```

Certbot should place the cert at:

- `/etc/letsencrypt/live/academy-api.multihat.dev/fullchain.pem`
- `/etc/letsencrypt/live/academy-api.multihat.dev/privkey.pem`

After that:

```bash
nginx -t
systemctl reload nginx
```

---

## 11) Verify everything

### API checks

```bash
curl -i https://academy-api.multihat.dev/api/v1/users/me
```

Without a token, this should return **401 Unauthorized**.

Test login:

```bash
curl -i -X POST https://academy-api.multihat.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{}'
```

You should get a validation error, not a 404 or HTML page.

### Frontend checks

```bash
curl -I https://academy.multihat.dev
```

You should get **200 OK** from Vercel.

### SSL checks

```bash
openssl s_client -connect academy-api.multihat.dev:443 -servername academy-api.multihat.dev
```

You want:

- certificate subject: `academy-api.multihat.dev`
- verify return code: `0 (ok)`

### PM2 checks

```bash
pm2 status
pm2 logs academy-backend --lines 50
```

---

## 12) Admin seed account

The seed creates:

- **Email:** `admin@multihat.dev`
- **Password:** `AdminSecure!2026`

Change the password immediately after first login.

---

## 13) Continuous deployment

### Frontend

Push to GitHub → Vercel builds automatically.

### Backend

On the Droplet:

```bash
cd /var/www/academy/backend
git pull origin main
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart ecosystem.config.js --update-env
```

If your seed or schema changed and you need the seed again, run it manually once, but avoid reseeding if it would overwrite production data.

---

## 14) Troubleshooting

### If `/admin` shows a server-side error

Check these first:

- `NEXT_PUBLIC_API_URL` in Vercel
- API certificate on `academy-api.multihat.dev`
- Vercel function logs
- Backend logs (`pm2 logs academy-backend`)

### If Vercel receives HTML instead of JSON

That usually means the API hostname is returning an error page or a challenge page. Recheck:

- backend SSL certificate
- Cloudflare proxy / WAF / Bot settings
- Nginx proxy pass target
- API route path

### If Cloudflare shows a challenge page

Temporarily check:

- Bot Fight Mode
- WAF rules
- custom security rules for `academy-api.multihat.dev`

### If PM2 uses the wrong port

Confirm both:

- `.env` contains `PORT=5001`
- `ecosystem.config.js` contains `PORT: 5001` in `env_production`

---

## Quick reference

```bash
# Backend
cd /var/www/academy/backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart ecosystem.config.js --update-env

# Nginx
nginx -t && systemctl reload nginx

# Logs
pm2 logs academy-backend --lines 50

# API test
curl -i https://academy-api.multihat.dev/api/v1/users/me
```

---

**Prepared for:** Sagar Biswas (MultiHAT)  
**Frontend:** `academy.multihat.dev`  
**Backend API:** `academy-api.multihat.dev`  
**Stack:** Vercel + NestJS/PostgreSQL + Nginx + Let’s Encrypt + Cloudflare DNS
