# MultiHAT Academy — Deployment Setup Guide

**Target:** `academy.multihat.dev` (frontend on Vercel + backend on DigitalOcean Droplet)  
**Routing:** `academy.multihat.dev` → Vercel (Next.js) | `academy.multihat.dev/api` → Droplet (NestJS on port 5000)  
**SSL:** Cloudflare Full (Strict) + Origin Certificate

---

## Part 1 — Cloudflare DNS

> Do this first. Both Vercel and the Droplet need DNS entries before SSL works.

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com) and select `multihat.dev`.

2. Go to **DNS → Records** and add these two records:

   | Type | Name | Content | Proxy |
   |------|------|---------|-------|
   | `A` | `academy` | `YOUR_DROPLET_IP` | **Proxied** (orange cloud) |
   | `CNAME` | `www.academy` | `academy.multihat.dev` | **DNS Only** (gray cloud) |

   > The `A` record routes all `academy.multihat.dev` traffic through Cloudflare to your Droplet.  
   > You will add a second record for Vercel **after** Part 3.

3. Go to **SSL/TLS → Overview** and set the mode to **Full (Strict)**.

---

## Part 2 — Cloudflare Origin Certificate (SSL on the Droplet)

4. Go to **SSL/TLS → Origin Server** and click **Create Certificate**.

5. Leave all defaults:
   - Key type: **RSA (2048)**
   - Hostnames: `*.multihat.dev`, `multihat.dev` (auto-filled)
   - Validity: **15 years**

6. Click **Create**. You will see two text boxes:
   - **Origin Certificate** (starts with `-----BEGIN CERTIFICATE-----`)
   - **Private Key** (starts with `-----BEGIN PRIVATE KEY-----`)

   **Keep this browser tab open** — you will paste both values into the Droplet in Part 4.

---

## Part 3 — Vercel Frontend Deployment

7. Go to [vercel.com](https://vercel.com) and sign in with GitHub.

8. Click **Add New → Project**, then import the `academy` repository.

9. In the import settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Next.js` (auto-detected)

10. Before clicking Deploy, click **Environment Variables** and add:

    | Variable | Value |
    |----------|-------|
    | `NEXT_PUBLIC_API_URL` | `https://academy.multihat.dev/api/v1` |
    | `NEXT_PUBLIC_SITE_URL` | `https://academy.multihat.dev` |

11. Click **Deploy**. Wait for the build to complete.

12. Go to **Project Settings → Domains** and add `academy.multihat.dev`.  
    Vercel will show you a CNAME to add. **Ignore it** — you are using a proxied Cloudflare setup, which requires a different approach.

    > **Why different?** Vercel expects its own CNAME for SSL verification. But since your `A` record already routes traffic to the Droplet (and Nginx will forward `/api` to NestJS), the frontend at the root path will be served via a reverse proxy to Vercel from Nginx. See Part 5, Step 28 for the Nginx frontend config.

---

## Part 4 — Droplet: Initial Setup

13. SSH into your Droplet:
    ```bash
    ssh root@YOUR_DROPLET_IP
    ```

14. Update the system:
    ```bash
    apt update && apt upgrade -y
    ```

15. Install Node.js 20, PM2, Nginx, and Git:
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs nginx git
    npm install -g pm2
    ```

16. Verify:
    ```bash
    node -v   # should print v20.x.x
    npm -v    # should print 10.x.x
    ```

17. Configure the firewall:
    ```bash
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw enable
    ```

---

## Part 5 — Droplet: SSL Certificate Files

18. Save the Cloudflare Origin Certificate (from Step 6):
    ```bash
    nano /etc/ssl/certs/multihat_origin.pem
    ```
    Paste the **Origin Certificate** text, then press `Ctrl+X`, `Y`, `Enter`.

19. Save the Private Key:
    ```bash
    nano /etc/ssl/private/multihat_origin.key
    ```
    Paste the **Private Key** text, then press `Ctrl+X`, `Y`, `Enter`.

20. Lock down the key file:
    ```bash
    chmod 600 /etc/ssl/private/multihat_origin.key
    ```

---

## Part 6 — Droplet: PostgreSQL Setup

21. Install PostgreSQL 16:
    ```bash
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt update
    apt install -y postgresql-16
    systemctl enable postgresql
    systemctl start postgresql
    ```

22. Create the production database and user:
    ```bash
    sudo -u postgres psql
    ```
    Inside the psql prompt, run:
    ```sql
    CREATE USER academy_user WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
    CREATE DATABASE academy_db OWNER academy_user;
    GRANT ALL PRIVILEGES ON DATABASE academy_db TO academy_user;
    \c academy_db
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    \q
    ```
    > Replace `REPLACE_WITH_STRONG_PASSWORD` with something secure (e.g., generate with `openssl rand -base64 24`).

---

## Part 7 — Droplet: Deploy the Backend

23. Clone the repository:
    ```bash
    mkdir -p /var/www/academy
    cd /var/www/academy
    git clone https://github.com/SagarBiswas-MultiHAT/academy.git .
    ```

24. Install backend dependencies:
    ```bash
    cd /var/www/academy/backend
    npm ci
    ```

25. Create the production `.env` file:
    ```bash
    nano /var/www/academy/backend/.env
    ```
    Paste and fill in all values:
    ```env
    # Database
    DATABASE_URL="postgresql://academy_user:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/academy_db?schema=public"

    # JWT Secrets — generate each with: openssl rand -base64 64
    JWT_ACCESS_SECRET="GENERATE_64_CHAR_STRING_HERE"
    JWT_REFRESH_SECRET="GENERATE_DIFFERENT_64_CHAR_STRING_HERE"

    # Server
    PORT=5000
    NODE_ENV="production"

    # aamarPay (live credentials)
    AAMARPAY_STORE_ID="your_live_store_id"
    AAMARPAY_SIGNATURE_KEY="your_live_signature_key"
    AAMARPAY_BASE_URL="https://secure.aamarpay.com"

    # Email (Resend)
    RESEND_API_KEY="re_YOUR_PRODUCTION_API_KEY"
    SENDER_EMAIL="academy@multihat.dev"

    # URLs
    FRONTEND_URL="https://academy.multihat.dev"
    API_URL="https://academy.multihat.dev/api/v1"

    # Wallet
    WALLET_MIN_TOPUP_BDT="50"

    # PDF generation
    CERTIFICATE_TEMPLATE_DIR="templates"
    CERTIFICATE_OUTPUT_DIR="generated/certificates"
    ```
    Save with `Ctrl+X`, `Y`, `Enter`.

    > **Tip:** Generate JWT secrets right now with:
    > ```bash
    > openssl rand -base64 64
    > ```
    > Run it twice — once for each secret.

26. Run database migrations and build:
    ```bash
    cd /var/www/academy/backend
    npx prisma generate
    npx prisma migrate deploy
    npx prisma db seed
    npm run build
    ```
    > `db seed` only needs to run once. It creates the initial admin account.

27. Start the backend with PM2:
    ```bash
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup
    ```
    > The `pm2 startup` command will print a command like `sudo env PATH=... pm2 startup ...`. **Copy and run that exact command** — it makes PM2 survive a reboot.

    Verify it is running:
    ```bash
    pm2 status
    ```
    You should see `academy-backend` with status `online`.

---

## Part 8 — Droplet: Nginx Configuration

> Nginx will handle two things:
> - Forward `/api/*` requests to your NestJS backend (port 5000)
> - Forward all other requests to Vercel (your frontend)

28. Create the Nginx config file:
    ```bash
    nano /etc/nginx/sites-available/academy
    ```
    Paste the following:
    ```nginx
    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name academy.multihat.dev;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name academy.multihat.dev;

        # Cloudflare Origin Certificate
        ssl_certificate /etc/ssl/certs/multihat_origin.pem;
        ssl_certificate_key /etc/ssl/private/multihat_origin.key;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

        # Security headers
        add_header X-Content-Type-Options nosniff always;
        add_header X-Frame-Options DENY always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Max upload size (for certificate PDFs etc.)
        client_max_body_size 25M;

        # /api/* → NestJS backend on port 5000
        location /api {
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

        # All other requests → Vercel frontend
        location / {
            proxy_pass https://YOUR_VERCEL_PROJECT.vercel.app;
            proxy_http_version 1.1;
            proxy_set_header Host academy.multihat.dev;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_ssl_server_name on;
        }
    }
    ```
    > Replace `YOUR_VERCEL_PROJECT.vercel.app` with the Vercel deployment URL from Step 11 (e.g., `academy-abc123.vercel.app`). Find it in your Vercel dashboard under **Deployments**.

    Save with `Ctrl+X`, `Y`, `Enter`.

29. Enable the site and reload Nginx:
    ```bash
    ln -s /etc/nginx/sites-available/academy /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl reload nginx
    ```
    > `nginx -t` must say `syntax is ok` before you reload. If it shows an error, re-check Step 28.

---

## Part 9 — Verify Everything Works

30. Test the backend API:
    ```
    https://academy.multihat.dev/api/v1/books
    ```
    You should get a JSON response (not a 502 or SSL error).

31. Test the frontend:
    ```
    https://academy.multihat.dev
    ```
    Your Next.js app should load.

32. Check the SSL padlock in your browser — it should show **Cloudflare** as the issuer and the connection as secure.

33. Check PM2 logs if anything fails:
    ```bash
    pm2 logs academy-backend --lines 50
    ```

34. Change the default admin password immediately:
    - The seed creates `admin@multihat.dev` / `AdminSecure!2026`
    - Log in and change the password via the app, or use Prisma Studio:
      ```bash
      cd /var/www/academy/backend
      npx prisma studio
      # Opens on port 5555 — access via SSH tunnel if needed
      ```

---

## Quick Reference

```bash
# On the Droplet:
pm2 status                            # Check processes
pm2 logs academy-backend --lines 50  # View backend logs
pm2 restart academy-backend          # Restart backend
nginx -t && systemctl reload nginx   # Test + reload Nginx

# Deploy an update:
cd /var/www/academy
git pull origin main
cd backend && npm ci
npx prisma migrate deploy
npm run build
pm2 restart academy-backend
```

---

**Prepared for:** Sagar Biswas (MultiHAT)  
**Domain:** `academy.multihat.dev`  
**Stack:** Next.js (Vercel) + NestJS/PostgreSQL (DigitalOcean) + Cloudflare DNS/SSL


NOTE: 

## One thing you'll need to fill in manually

In **Step 28** (Nginx config), replace `YOUR_VERCEL_PROJECT.vercel.app` with your actual Vercel deployment URL. You'll find it in your Vercel dashboard under **Deployments** — it looks like `academy-abc123.vercel.app`.

> Also in **Step 25**: generate both JWT secrets on the Droplet with `openssl rand -base64 64` (run twice) before filling in the `.env`.