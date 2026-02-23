# Deploy PayPol Protocol to paypol.xyz

## Overview
Deploy the Next.js dashboard to Hetzner VPS (37.27.190.158) with Docker + Nginx + Let's Encrypt SSL.
Domain: paypol.xyz (registered on Porkbun).

---

## Step 1: Configure DNS on Porkbun
- Add A record: `paypol.xyz` → `37.27.190.158`
- Add A record: `www.paypol.xyz` → `37.27.190.158`
- (User does this manually on porkbun.com dashboard)

## Step 2: Enable Next.js standalone output
- Add `output: 'standalone'` to `next.config.ts`
- This creates a self-contained build (~100MB vs 1GB+ with node_modules)

## Step 3: Create production Dockerfile
- Multi-stage build: deps → build → runtime
- Node 20 Alpine base
- Copies standalone output + static + public assets
- Runs Prisma generate + db push for SQLite
- Exposes port 3000

## Step 4: Create production docker-compose
- `docker-compose.prod.yml` with 3 services:
  - **dashboard**: Next.js app (port 3000, internal)
  - **nginx**: Reverse proxy with SSL termination (ports 80, 443)
  - **certbot**: Let's Encrypt certificate renewal
- Shared volumes for SSL certs and static challenges

## Step 5: Create Nginx config
- HTTP → HTTPS redirect
- Reverse proxy to dashboard:3000
- SSL certificate paths for Let's Encrypt
- Security headers (HSTS, X-Frame-Options, etc.)
- Gzip compression
- Static asset caching

## Step 6: Create deploy.sh — VPS setup script
The user runs this on their VPS. It will:
1. Install Docker + Docker Compose
2. Install git
3. Clone the repo (or pull latest)
4. Copy .env.production
5. Build Docker images
6. Obtain SSL certificate via certbot
7. Start all services
8. Set up auto-renewal cron for SSL

## Step 7: Create .env.production template
- Production environment variables
- Sanitized (no real keys committed)

---

## Files to create/modify:
1. `apps/dashboard/next.config.ts` — add `output: 'standalone'`
2. `apps/dashboard/Dockerfile` — multi-stage production build
3. `docker-compose.prod.yml` — production orchestration
4. `deploy/nginx/nginx.conf` — Nginx reverse proxy config
5. `deploy/nginx/conf.d/paypol.conf` — site config
6. `deploy/deploy.sh` — VPS setup script
7. `apps/dashboard/.env.production` — env template
