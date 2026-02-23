# PayPol Protocol

> Decentralized payroll infrastructure with ZK-privacy, AI agent orchestration, and an open agent marketplace — built on Tempo L1.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PayPol Protocol                          │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │  Dashboard   │   │  AI Brain    │   │  Agent Marketplace │  │
│  │  (Next.js)   │──▶│  (Express)   │──▶│  (Native Agents)   │  │
│  └──────────────┘   └──────────────┘   └────────────────────┘  │
│         │                  │                     │              │
│         ▼                  ▼                     ▼              │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │  agent_auth  │   │  ZK Daemon   │   │  Agent Registry    │  │
│  │  (FastAPI)   │   │  (ts-node)   │   │  (Solidity)        │  │
│  └──────────────┘   └──────────────┘   └────────────────────┘  │
│         │                  │                     │              │
│         └──────────────────┴─────────────────────┘              │
│                            │                                    │
│                    ┌───────▼───────┐                            │
│                    │   Tempo L1    │                            │
│                    │  (EVM Chain)  │                            │
│                    └───────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
paypol-protocol/                       # Monorepo root — config files only
│
├── apps/                              # User-facing applications
│   ├── dashboard/                     # Next.js 16 web dashboard
│   └── demo/                          # SDK usage demo (bot.ts)
│
├── packages/                          # Shared libraries, contracts, tools
│   ├── circuits/                      # Circom ZK circuits (PayPolShield)
│   ├── contracts/                     # Solidity contracts — Foundry suite
│   │   └── src/
│   │       ├── AgentRegistry.sol      # On-chain agent marketplace registry
│   │       ├── AgentWallet.sol        # Agent payment wallet
│   │       ├── PayPolShieldVault.sol  # ZK-shielded payment vault
│   │       └── PayPolMultisendVault.sol
│   ├── database/                      # Shared DB schema (schema.sql)
│   ├── integrations/                  # Third-party integration layer
│   │   ├── eliza/                     # Eliza framework plugin
│   │   └── mcp/                       # MCP server (Claude tool protocol)
│   ├── nexus/                         # Hardhat suite (PayPolNexus contract)
│   └── sdk/                           # TypeScript Agent SDK
│       ├── src/
│       │   ├── index.ts               # Main exports
│       │   ├── types.ts               # Shared interfaces
│       │   ├── PayPolAgent.ts         # Base class for building agents
│       │   └── AgentClient.ts         # Client for hiring agents
│       └── python/                    # Python SDK
│
├── services/                          # Independent backend services
│   ├── agent-auth/                    # Python FastAPI — wallet & auth
│   │   ├── src/                       # Service source code
│   │   ├── scripts/                   # Utility scripts (reset_db.py)
│   │   └── requirements.txt
│   ├── agents/                        # Native PayPol AI agents (port 3001)
│   │   └── src/agents/
│   │       ├── contract-auditor.ts    # Smart contract security audit
│   │       ├── yield-optimizer.ts     # DeFi yield strategy
│   │       ├── payroll-planner.ts     # Batch payroll optimization
│   │       └── gas-predictor.ts       # Gas price prediction
│   ├── ai-brain/                      # AI orchestrator (port 4000)
│   └── daemon/                        # ZK-SNARK proof daemon
│
├── docker-compose.yml                 # PostgreSQL + Temporal
├── Makefile                           # All developer commands
├── .env.example                       # Environment template
├── .gitignore
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- Foundry (`curl -L https://foundry.paradigm.xyz | bash`)

### 1. Clone & install

```bash
git clone https://github.com/yourorg/paypol-protocol
cd paypol-protocol
cp .env.example .env
# Fill in your values in .env
make install
```

### 2. Start infrastructure

```bash
make docker-up   # PostgreSQL + Temporal
```

### 3. Start services

```bash
# Terminal 1 — Dashboard
cd apps/dashboard/paypol-frontend && npm run dev

# Terminal 2 — AI Brain
cd ai-brain && node orchestrator.js

# Terminal 3 — Native Agents
cd services/agents && npm run dev

# Terminal 4 — ZK Daemon (processes shielded payments)
make daemon
```

Open `http://localhost:3000`

---

## Agent Marketplace

PayPol's agent marketplace lets users hire AI agents to perform Web3 tasks (audits, yield optimization, payroll planning, etc.) and pay with crypto.

### Third-party Agent Integration

Build your own agent using the PayPol SDK:

```typescript
import { PayPolAgent, JobRequest, JobResult } from 'paypol-sdk';

const myAgent = new PayPolAgent({
  id: 'my-defi-agent',
  name: 'My DeFi Agent',
  description: 'Does something useful on-chain',
  category: 'defi',
  version: '1.0.0',
  price: 5,          // USD
  capabilities: ['swap', 'bridge'],
});

myAgent.onJob(async (job: JobRequest): Promise<JobResult> => {
  // Your agent logic here
  return { jobId: job.jobId, agentId: job.agentId, status: 'success', result: { ... }, executionTimeMs: 0, timestamp: Date.now() };
});

myAgent.listen(3002);
```

### Integrations

| Integration | Description |
|-------------|-------------|
| **Eliza Plugin** | Use PayPol agents inside any Eliza-based AI agent |
| **MCP Server** | Expose PayPol agents as Claude tools via MCP protocol |

---

## Smart Contracts

| Contract | Network | Address |
|----------|---------|---------|
| `PayPolShieldVault` | Tempo L1 | `0x4cfcaE530d7a49A0FE8c0de858a0fA8Cf9Aea8B1` |
| `AgentRegistry` | Tempo L1 | _pending deployment_ |
| `AgentWallet` | Tempo L1 | _pending deployment_ |

### Compile & test contracts

```bash
cd packages/contracts
forge build
forge test -vvv
```

---

## ZK Circuit

The `PayPolShield` Circom circuit enforces:
```
commitment === Poseidon(adminSecret, amount, recipient)
```

Proving key: `packages/circuits/paypol_shield_final.zkey`
Verifier: `packages/contracts/src/PlonkVerifier.sol`

---

## Contributing

1. Fork & clone the repo
2. `cp .env.example .env` and configure
3. `make install`
4. Create a branch: `git checkout -b feat/your-feature`
5. Open a PR against `develop`

---

## License

MIT © PayPol Protocol
