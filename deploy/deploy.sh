#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# PayPol Protocol — Production Deployment Script
# VPS: Hetzner (Ubuntu 22.04/24.04)
# Domain: paypol.xyz → 37.27.190.158
# ═══════════════════════════════════════════════════════════════
#
# Usage:
#   ssh root@37.27.190.158
#   curl -fsSL https://raw.githubusercontent.com/PayPol-Foundation/paypol-protocol/main/deploy/deploy.sh | bash
#
#   Or clone and run:
#   git clone https://github.com/PayPol-Foundation/paypol-protocol.git
#   cd paypol-protocol
#   chmod +x deploy/deploy.sh
#   ./deploy/deploy.sh
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[PayPol]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step()  { echo -e "\n${CYAN}═══ $1 ═══${NC}\n"; }

DOMAIN="paypol.xyz"
EMAIL="admin@paypol.xyz"
APP_DIR="/opt/paypol"
REPO="https://github.com/PayPol-Foundation/paypol-protocol.git"

# ── Preflight Check ──────────────────────────────────────────
step "Step 0: Preflight Check"

if [ "$(id -u)" -ne 0 ]; then
    err "Please run as root: sudo ./deploy.sh"
fi

log "OS: $(lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)"
log "IP: $(curl -s4 ifconfig.me)"
log "Domain: $DOMAIN"

# ── Step 1: System Update + Essentials ────────────────────────
step "Step 1: System Update"

apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget git unzip \
    ca-certificates gnupg lsb-release \
    ufw fail2ban

log "System packages updated"

# ── Step 2: Firewall ─────────────────────────────────────────
step "Step 2: Firewall (UFW)"

ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

log "Firewall enabled: SSH(22), HTTP(80), HTTPS(443)"

# ── Step 3: Install Docker ────────────────────────────────────
step "Step 3: Docker Engine"

if command -v docker &> /dev/null; then
    log "Docker already installed: $(docker --version)"
else
    # Add Docker GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    systemctl enable docker
    systemctl start docker

    log "Docker installed: $(docker --version)"
fi

# Verify Docker Compose
if docker compose version &> /dev/null; then
    log "Docker Compose: $(docker compose version --short)"
else
    err "Docker Compose not found. Please install docker-compose-plugin."
fi

# ── Step 4: Clone / Pull Repository ──────────────────────────
step "Step 4: Repository"

if [ -d "$APP_DIR/.git" ]; then
    log "Repo exists, pulling latest..."
    cd "$APP_DIR"
    git pull origin main
else
    log "Cloning repository..."
    git clone "$REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

log "Code at: $APP_DIR"

# ── Step 5: Environment File ─────────────────────────────────
step "Step 5: Environment Configuration"

ENV_FILE="$APP_DIR/apps/dashboard/.env.production"

if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" << 'ENVEOF'
# ═══════════════════════════════════════════════
# PayPol Protocol — Production Environment
# ═══════════════════════════════════════════════

NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# OpenAI (for AI-powered agent discovery)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Blockchain (demo keys — replace with real ones)
BOT_PRIVATE_KEY=0xYOUR_BOT_PRIVATE_KEY
ADMIN_PRIVATE_KEY=0xYOUR_ADMIN_PRIVATE_KEY

# OpenClaw Registry
OPENCLAW_REGISTRY_URL=https://api.jsonbin.io/v3/b/67b7d7aaad19ca34f80c65d8
ENVEOF

    warn "Created $ENV_FILE — EDIT THIS FILE with real keys!"
    warn "Run: nano $ENV_FILE"
    echo ""
    read -p "Press Enter after editing .env.production (or Ctrl+C to abort)... "
else
    log ".env.production already exists"
fi

# ── Step 6: SSL Certificate (Let's Encrypt) ──────────────────
step "Step 6: SSL Certificate"

CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

if [ -d "$CERT_PATH" ]; then
    log "SSL certificate already exists for $DOMAIN"
else
    log "Obtaining SSL certificate..."

    # First, start nginx with HTTP-only config for ACME challenge
    mkdir -p /tmp/paypol-certbot

    # Create temporary nginx config for cert acquisition
    cat > /tmp/nginx-certonly.conf << 'NGINXEOF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name paypol.xyz www.paypol.xyz;
        location /.well-known/acme-challenge/ { root /var/www/certbot; }
        location / { return 200 'PayPol deploying...'; add_header Content-Type text/plain; }
    }
}
NGINXEOF

    # Start temporary nginx
    docker run -d --name nginx-temp \
        -p 80:80 \
        -v /tmp/nginx-certonly.conf:/etc/nginx/nginx.conf:ro \
        -v /tmp/paypol-certbot:/var/www/certbot \
        nginx:alpine

    sleep 3

    # Get certificate
    docker run --rm \
        -v /etc/letsencrypt:/etc/letsencrypt \
        -v /tmp/paypol-certbot:/var/www/certbot \
        certbot/certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d "$DOMAIN" \
            -d "www.$DOMAIN"

    # Stop temporary nginx
    docker stop nginx-temp && docker rm nginx-temp

    if [ -d "$CERT_PATH" ]; then
        log "SSL certificate obtained successfully!"
    else
        err "Failed to obtain SSL certificate. Check DNS: $DOMAIN must point to this server."
    fi
fi

# ── Step 7: Build & Deploy ────────────────────────────────────
step "Step 7: Build & Start Services"

cd "$APP_DIR"

log "Building Docker images (this may take 3-5 minutes)..."
docker compose -f docker-compose.prod.yml build --no-cache

log "Starting services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for health check
log "Waiting for dashboard to be healthy..."
for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
        break
    fi
    sleep 5
    echo -n "."
done
echo ""

# ── Step 8: Seed Database ─────────────────────────────────────
step "Step 8: Seed Marketplace Agents"

log "Running agent seed..."
docker compose -f docker-compose.prod.yml exec -T dashboard sh -c \
    "npx prisma db push --skip-generate 2>/dev/null; node -e \"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.marketplaceAgent.count().then(c => {
    console.log('Agents in DB:', c);
    if (c === 0) console.log('Run seed script manually if needed');
    process.exit(0);
}).catch(() => process.exit(0));
\"" 2>/dev/null || log "Seed check completed"

# ── Step 9: SSL Auto-Renewal Cron ────────────────────────────
step "Step 9: SSL Auto-Renewal"

CRON_CMD="0 3 * * * cd $APP_DIR && docker compose -f docker-compose.prod.yml run --rm certbot renew && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload"

(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_CMD") | crontab -

log "Cron job set: SSL renewal check daily at 3 AM"

# ── Step 10: Verify ──────────────────────────────────────────
step "Step 10: Verification"

echo ""
log "Checking services..."
docker compose -f docker-compose.prod.yml ps

echo ""
log "Testing HTTP → HTTPS redirect..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "http://$DOMAIN" 2>/dev/null || echo "000")
log "HTTP status: $HTTP_STATUS"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  PayPol Protocol Deployed Successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Website:${NC}  https://$DOMAIN"
echo -e "  ${CYAN}IP:${NC}       37.27.190.158"
echo -e "  ${CYAN}Logs:${NC}     docker compose -f docker-compose.prod.yml logs -f"
echo -e "  ${CYAN}Restart:${NC}  docker compose -f docker-compose.prod.yml restart"
echo -e "  ${CYAN}Stop:${NC}     docker compose -f docker-compose.prod.yml down"
echo -e "  ${CYAN}Rebuild:${NC}  docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo -e "  ${YELLOW}Useful commands:${NC}"
echo -e "  docker compose -f docker-compose.prod.yml logs dashboard   # App logs"
echo -e "  docker compose -f docker-compose.prod.yml logs nginx       # Nginx logs"
echo -e "  docker compose -f docker-compose.prod.yml exec dashboard sh  # Shell"
echo ""
