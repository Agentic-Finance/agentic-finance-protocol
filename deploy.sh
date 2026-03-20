#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Agentic Finance — One-Command Production Deploy
# Usage:
#   ./deploy.sh              # Deploy all services
#   ./deploy.sh dashboard    # Deploy only dashboard
#   ./deploy.sh agents       # Deploy only agents
#   ./deploy.sh daemon       # Deploy only daemon
#   ./deploy.sh db           # Deploy only database
#   ./deploy.sh --status     # Check service status
#   ./deploy.sh --logs       # Tail all logs
#   ./deploy.sh --rollback   # Rollback to previous version
# ═══════════════════════════════════════════════════════════

set -euo pipefail

# ── Config ──────────────────────────────────────────────────
VPS_HOST="${VPS_HOST:-37.27.190.158}"
VPS_USER="${VPS_USER:-root}"
VPS_DIR="${VPS_DIR:-/opt/paypol}"
COMPOSE_FILE="docker-compose.prod.yml"
BRANCH="${DEPLOY_BRANCH:-claude/hopeful-joliot}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }
info() { echo -e "${CYAN}[info]${NC} $*"; }

# ── SSH Helper ──────────────────────────────────────────────
remote() {
  ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
    "${VPS_USER}@${VPS_HOST}" "$@"
}

# ── Status ──────────────────────────────────────────────────
cmd_status() {
  log "Service status on ${VPS_HOST}:"
  remote "cd ${VPS_DIR} && docker compose -f ${COMPOSE_FILE} ps"
  echo ""
  info "Disk usage:"
  remote "df -h / | tail -1"
  echo ""
  info "Docker disk:"
  remote "docker system df 2>/dev/null || true"
}

# ── Logs ────────────────────────────────────────────────────
cmd_logs() {
  local service="${1:-}"
  if [ -n "$service" ]; then
    remote "cd ${VPS_DIR} && docker compose -f ${COMPOSE_FILE} logs -f --tail=50 ${service}"
  else
    remote "cd ${VPS_DIR} && docker compose -f ${COMPOSE_FILE} logs -f --tail=30"
  fi
}

# ── Rollback ────────────────────────────────────────────────
cmd_rollback() {
  warn "Rolling back to previous version..."
  remote "cd ${VPS_DIR} && git checkout HEAD~1 -- . && docker compose -f ${COMPOSE_FILE} up -d --build"
  log "Rollback complete!"
}

# ── Deploy via rsync + docker compose ───────────────────────
cmd_deploy() {
  local services=("$@")
  local start_time=$(date +%s)

  log "═══════════════════════════════════════════"
  log "  Agentic Finance — Production Deploy"
  log "  Target: ${VPS_USER}@${VPS_HOST}:${VPS_DIR}"
  log "  Branch: ${BRANCH}"
  log "═══════════════════════════════════════════"
  echo ""

  # Step 1: Sync code to VPS
  log "📦 Step 1/5: Syncing code to VPS..."
  rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='.claude' \
    --exclude='dist' \
    --exclude='*.log' \
    --exclude='.turbo' \
    --exclude='coverage' \
    --filter='protect .env*' \
    --filter='protect *.env.production' \
    -e "ssh -o ConnectTimeout=10" \
    ./ "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"
  log "✅ Code synced"

  # Step 2: Ensure DB is healthy
  log "🐘 Step 2/5: Checking PostgreSQL..."
  remote "cd ${VPS_DIR} && docker compose -f ${COMPOSE_FILE} up -d db" 2>/dev/null
  local db_ready=false
  for i in $(seq 1 15); do
    if remote "cd ${VPS_DIR} && docker compose -f ${COMPOSE_FILE} exec -T db pg_isready -U paypol -d paypol_core" >/dev/null 2>&1; then
      db_ready=true
      break
    fi
    sleep 2
  done
  if [ "$db_ready" = true ]; then
    log "✅ PostgreSQL is ready"
  else
    err "PostgreSQL failed to start"
    exit 1
  fi

  # Step 3: Build images
  if [ ${#services[@]} -eq 0 ]; then
    log "🔨 Step 3/5: Building ALL services..."
    remote "cd ${VPS_DIR} && DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker compose -f ${COMPOSE_FILE} build --parallel"
  else
    log "🔨 Step 3/5: Building ${services[*]}..."
    remote "cd ${VPS_DIR} && DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker compose -f ${COMPOSE_FILE} build ${services[*]}"
  fi
  log "✅ Images built"

  # Step 4: Rolling restart
  if [ ${#services[@]} -eq 0 ]; then
    log "🚀 Step 4/5: Restarting ALL services..."
    remote "cd ${VPS_DIR} && docker compose -f ${COMPOSE_FILE} up -d"
  else
    log "🚀 Step 4/5: Restarting ${services[*]}..."
    remote "cd ${VPS_DIR} && docker compose -f ${COMPOSE_FILE} up -d ${services[*]}"
  fi
  log "✅ Services restarted"

  # Step 5: Health check
  log "🏥 Step 5/5: Running health checks..."
  sleep 10

  local all_healthy=true
  # Check dashboard
  if [ ${#services[@]} -eq 0 ] || [[ " ${services[*]} " =~ " dashboard " ]]; then
    local dash_ok=false
    for i in $(seq 1 12); do
      if remote "docker exec agtfi-dashboard curl -sf http://localhost:3000" >/dev/null 2>&1; then
        dash_ok=true
        break
      fi
      sleep 5
    done
    if [ "$dash_ok" = true ]; then
      log "  ✅ Dashboard: healthy"
    else
      warn "  ⚠️  Dashboard: not responding (may still be starting)"
      all_healthy=false
    fi
  fi

  # Check agents
  if [ ${#services[@]} -eq 0 ] || [[ " ${services[*]} " =~ " agents " ]]; then
    local agents_ok=false
    for i in $(seq 1 8); do
      if remote "docker exec agtfi-agents node -e \"fetch('http://localhost:3001/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))\"" >/dev/null 2>&1; then
        agents_ok=true
        break
      fi
      sleep 5
    done
    if [ "$agents_ok" = true ]; then
      log "  ✅ Agents: healthy"
    else
      warn "  ⚠️  Agents: not responding (may still be starting)"
      all_healthy=false
    fi
  fi

  # Cleanup old images
  remote "docker image prune -f" >/dev/null 2>&1 || true

  local end_time=$(date +%s)
  local duration=$((end_time - start_time))

  echo ""
  log "═══════════════════════════════════════════"
  if [ "$all_healthy" = true ]; then
    log "  ✅ Deploy SUCCESS in ${duration}s"
  else
    warn "  ⚠️  Deploy done in ${duration}s (some services still starting)"
  fi
  log "  🌐 https://agt.finance"
  log "═══════════════════════════════════════════"
}

# ── Main ────────────────────────────────────────────────────
case "${1:-all}" in
  --status|-s)   cmd_status ;;
  --logs|-l)     cmd_logs "${2:-}" ;;
  --rollback|-r) cmd_rollback ;;
  --help|-h)
    echo "Usage: ./deploy.sh [command|service...]"
    echo ""
    echo "Services: dashboard, agents, daemon, db"
    echo "Commands: --status, --logs [service], --rollback, --help"
    echo ""
    echo "Environment:"
    echo "  VPS_HOST=37.27.190.158  DEPLOY_BRANCH=main"
    ;;
  all)           cmd_deploy ;;
  *)             cmd_deploy "$@" ;;
esac
