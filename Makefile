.PHONY: install dev build test clean daemon circuit agent-auth docker-up docker-down help

# ── Default ────────────────────────────────────────────────
help:
	@echo ""
	@echo "  PayPol Protocol — Developer Commands"
	@echo "  ──────────────────────────────────────────────────"
	@echo "  make install      Install all dependencies"
	@echo "  make dev          Start full dev environment"
	@echo "  make daemon       Start ZK proof daemon"
	@echo "  make agent-auth   Start Python auth service (port 8000)"
	@echo "  make build        Build dashboard + SDK + agents"
	@echo "  make test         Run all tests"
	@echo "  make circuit      Recompile Circom ZK circuit"
	@echo "  make docker-up    Start Postgres + Temporal"
	@echo "  make docker-down  Stop Docker services"
	@echo "  make clean        Remove build artifacts"
	@echo ""

# ── Install all workspace dependencies ────────────────────
install:
	npm install
	pip install -r services/agent-auth/requirements.txt
	cd apps/dashboard    && npm install
	cd services/daemon   && npm install
	cd services/agents   && npm install
	cd services/ai-brain && npm install
	cd packages/sdk      && npm install
	cd packages/nexus    && npm install
	@echo "✓ All dependencies installed"

# ── Start full dev environment ─────────────────────────────
dev: docker-up
	@echo "Starting all services..."
	cd services/ai-brain && node orchestrator.js &
	cd services/agents   && npm run dev &
	cd apps/dashboard    && npm run dev

# ── ZK proof daemon ────────────────────────────────────────
daemon:
	cd services/daemon && npx ts-node daemon.ts

# ── Python agent-auth service ──────────────────────────────
agent-auth:
	cd services/agent-auth/src && uvicorn main:app --reload --port 8000

# ── Build all ──────────────────────────────────────────────
build:
	cd apps/dashboard  && npm run build
	cd packages/sdk    && npm run build
	cd services/agents && npm run build
	@echo "✓ Build complete"

# ── Tests ──────────────────────────────────────────────────
test:
	cd packages/contracts && forge test -vvv
	cd packages/nexus     && npm test
	cd packages/sdk       && npm test
	@echo "✓ Tests complete"

# ── Compile Circom ZK circuit ──────────────────────────────
circuit:
	cd packages/circuits && \
	circom paypol_shield.circom --r1cs --wasm --sym -o .
	@echo "✓ Circuit compiled"

# ── Docker ─────────────────────────────────────────────────
docker-up:
	docker-compose up -d db tempo
	@echo "✓ Postgres + Temporal running"

docker-down:
	docker-compose down

# ── Clean build artifacts ──────────────────────────────────
clean:
	find . -name "dist"  -not -path "*/node_modules/*" -type d -exec rm -rf {} + 2>/dev/null; true
	find . -name ".next" -not -path "*/node_modules/*" -type d -exec rm -rf {} + 2>/dev/null; true
	cd packages/nexus && rm -rf artifacts cache typechain-types 2>/dev/null; true
	@echo "✓ Artifacts cleaned"
