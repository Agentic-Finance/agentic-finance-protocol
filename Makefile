.PHONY: help install dev build test clean daemon circuit agent-auth \
       docker-up docker-down \
       deploy deploy-dashboard deploy-agents deploy-daemon \
       status logs logs-dashboard logs-agents logs-daemon \
       ssh restart stop ps seed db-push db-studio \
       exec-dashboard exec-agents

# ── Config ──────────────────────────────────────────────────
VPS_HOST ?= 37.27.190.158
VPS_USER ?= root
VPS_DIR  ?= /opt/paypol
COMPOSE  := docker compose -f docker-compose.prod.yml

# ── Default ────────────────────────────────────────────────
help:
	@echo ""
	@echo "  Agentic Finance — Developer Commands"
	@echo "  ══════════════════════════════════════════════════"
	@echo ""
	@echo "  LOCAL DEVELOPMENT"
	@echo "  ──────────────────────────────────────────────────"
	@echo "  make install        Install all dependencies"
	@echo "  make dev            Start local dashboard dev server"
	@echo "  make build          Build dashboard locally (test)"
	@echo "  make test           Run all tests"
	@echo "  make daemon         Start ZK proof daemon"
	@echo "  make circuit        Recompile Circom ZK circuit"
	@echo "  make clean          Remove build artifacts"
	@echo ""
	@echo "  PRODUCTION DEPLOY"
	@echo "  ──────────────────────────────────────────────────"
	@echo "  make deploy           Deploy ALL services to VPS"
	@echo "  make deploy-dashboard Deploy only dashboard"
	@echo "  make deploy-agents    Deploy only agents service"
	@echo "  make deploy-daemon    Deploy only daemon"
	@echo ""
	@echo "  VPS MANAGEMENT"
	@echo "  ──────────────────────────────────────────────────"
	@echo "  make status         Service status on VPS"
	@echo "  make ps             Docker ps on VPS"
	@echo "  make ssh            SSH into VPS"
	@echo "  make logs           Tail all logs"
	@echo "  make logs-dashboard Tail dashboard logs"
	@echo "  make logs-agents    Tail agents logs"
	@echo "  make logs-daemon    Tail daemon logs"
	@echo "  make restart        Restart all services"
	@echo "  make stop           Stop all services"
	@echo "  make seed           Re-seed agents"
	@echo "  make db-push        Push Prisma schema"
	@echo "  make db-studio      Open Adminer DB GUI"
	@echo "  make exec-dashboard Shell into dashboard"
	@echo "  make exec-agents    Shell into agents"
	@echo ""

# ═══════════════════════════════════════════════════════════
# LOCAL DEVELOPMENT
# ═══════════════════════════════════════════════════════════

install:
	npm install
	cd apps/dashboard    && npm install
	cd services/daemon   && npm install
	cd services/agents   && npm install
	cd packages/sdk      && npm install
	cd packages/nexus    && npm install
	@echo "✓ All dependencies installed"

dev:
	cd apps/dashboard && npm run dev

build:
	cd apps/dashboard && npx next build --webpack

daemon:
	cd services/daemon && npx tsx daemon.ts

agent-auth:
	cd services/agent-auth/src && uvicorn main:app --reload --port 8000

test:
	cd packages/contracts && forge test -vvv
	cd packages/nexus     && npm test
	@echo "✓ Tests complete"

circuit:
	cd packages/circuits && \
	circom paypol_shield.circom --r1cs --wasm --sym -o .
	@echo "✓ Circuit compiled"

docker-up:
	docker compose up -d db
	@echo "✓ Postgres running"

docker-down:
	docker compose down

clean:
	find . -name "dist"  -not -path "*/node_modules/*" -type d -exec rm -rf {} + 2>/dev/null; true
	find . -name ".next" -not -path "*/node_modules/*" -type d -exec rm -rf {} + 2>/dev/null; true
	cd packages/nexus && rm -rf artifacts cache typechain-types 2>/dev/null; true
	@echo "✓ Artifacts cleaned"

# ═══════════════════════════════════════════════════════════
# PRODUCTION DEPLOY (VPS: Hetzner)
# ═══════════════════════════════════════════════════════════

deploy:
	./deploy.sh

deploy-dashboard:
	./deploy.sh dashboard

deploy-agents:
	./deploy.sh agents

deploy-daemon:
	./deploy.sh daemon

# ═══════════════════════════════════════════════════════════
# VPS MANAGEMENT
# ═══════════════════════════════════════════════════════════

status:
	./deploy.sh --status

ps:
	ssh $(VPS_USER)@$(VPS_HOST) "cd $(VPS_DIR) && $(COMPOSE) ps"

ssh:
	ssh $(VPS_USER)@$(VPS_HOST)

restart:
	ssh $(VPS_USER)@$(VPS_HOST) "cd $(VPS_DIR) && $(COMPOSE) restart"

restart-dashboard:
	ssh $(VPS_USER)@$(VPS_HOST) "cd $(VPS_DIR) && $(COMPOSE) restart dashboard"

stop:
	ssh $(VPS_USER)@$(VPS_HOST) "cd $(VPS_DIR) && $(COMPOSE) stop"

logs:
	./deploy.sh --logs

logs-dashboard:
	ssh $(VPS_USER)@$(VPS_HOST) "cd $(VPS_DIR) && $(COMPOSE) logs -f --tail=50 dashboard"

logs-agents:
	ssh $(VPS_USER)@$(VPS_HOST) "cd $(VPS_DIR) && $(COMPOSE) logs -f --tail=50 agents"

logs-daemon:
	ssh $(VPS_USER)@$(VPS_HOST) "cd $(VPS_DIR) && $(COMPOSE) logs -f --tail=50 daemon"

seed:
	ssh $(VPS_USER)@$(VPS_HOST) "docker exec agtfi-dashboard sh -c 'node prisma/seed.js'"

db-push:
	ssh $(VPS_USER)@$(VPS_HOST) "docker exec agtfi-dashboard sh -c 'node node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss'"

db-studio:
	@echo "Opening http://$(VPS_HOST):8080"
	@open "http://$(VPS_HOST):8080" 2>/dev/null || echo "Visit http://$(VPS_HOST):8080"

exec-dashboard:
	ssh -t $(VPS_USER)@$(VPS_HOST) "docker exec -it agtfi-dashboard sh"

exec-agents:
	ssh -t $(VPS_USER)@$(VPS_HOST) "docker exec -it agtfi-agents sh"
