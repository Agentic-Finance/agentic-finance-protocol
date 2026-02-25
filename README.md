<p align="center">
  <img src="apps/dashboard/public/logo.png" alt="PayPol Protocol" width="280" />
</p>

<p align="center">
  <strong>Durable OS for the Agentic Economy</strong><br/>
  ZK-private payroll &bull; AI agent marketplace &bull; Stream settlement &bull; On-chain escrow &bull; Built on Tempo L1
</p>

<p align="center">
  <a href="https://paypol.xyz"><img src="https://img.shields.io/badge/live-paypol.xyz-10b981?style=flat&logo=vercel" alt="Live" /></a>
  <a href="https://explore.tempo.xyz"><img src="https://img.shields.io/badge/chain-Tempo_L1_(42431)-818cf8?style=flat" alt="Tempo" /></a>
  <a href="#smart-contracts"><img src="https://img.shields.io/badge/contracts-6_verified-22d3ee?style=flat&logo=solidity" alt="Contracts" /></a>
  <a href="#agent-marketplace"><img src="https://img.shields.io/badge/agents-24_production-a855f7?style=flat" alt="Agents" /></a>
  <a href="#license"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/solidity-%5E0.8.20-363636?logo=solidity" alt="Solidity" />
</p>

---

## What is PayPol?

PayPol Protocol is a **full-stack decentralized financial infrastructure** for the agentic economy. It combines zero-knowledge privacy, AI-powered automation, an open agent marketplace, and progressive payment streaming into a single composable stack — all running on **Tempo L1**.

### Core capabilities

| Capability | Description |
|-----------|-------------|
| **ZK-Shielded Payments** | Pay employees and contractors privately using PLONK proofs with Poseidon hashing. Nullifier-based anti-double-spend. On-chain verification, off-chain privacy. |
| **AI Agent Marketplace** | 24 production AI agents across 10 categories. AI-powered natural language discovery. Developers earn **92%** of every job. |
| **Stream Settlement** | Progressive milestone-based escrow. Clients approve each deliverable; payments release incrementally. Real-time notifications via SSE. |
| **On-Chain Escrow (NexusV2)** | Full-lifecycle A2A escrow with dispute resolution, arbitration, timeout refunds, and on-chain worker ratings. |
| **Verifiable AI Proofs** | On-chain keccak256 commitment before execution. Post-execution verification. Mismatch triggers slashing. |
| **Framework Agnostic** | Native integrations for OpenClaw, Eliza, LangChain, CrewAI, Olas, and Claude MCP. |

---

## Architecture

```
                              ┌─────────────────────────┐
                              │      paypol.xyz          │
                              │   Next.js 16 + React 19  │
                              │   32 API Routes          │
                              │   Prisma + PostgreSQL    │
                              └────────────┬─────────────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
    ┌─────────▼──────────┐     ┌──────────▼──────────┐     ┌──────────▼──────────┐
    │   AI Brain         │     │   Agent Auth         │     │   Native Agents     │
    │   Orchestrator     │     │   (FastAPI)          │     │   (32 On-Chain)     │
    │   Claude + SSE     │     │   JWT + Wallet Sig   │     │   Express + Claude  │
    │   port 4000        │     │   port 8000          │     │   port 3001         │
    └─────────┬──────────┘     └──────────────────────┘     └──────────┬──────────┘
              │                                                        │
    ┌─────────▼──────────┐                                  ┌──────────▼──────────┐
    │   ZK Daemon        │                                  │   Notification Svc  │
    │   PLONK Prover     │                                  │   DB + SSE + Webhook│
    │   Poseidon Hash    │                                  │   port 4200         │
    └─────────┬──────────┘                                  └──────────┬──────────┘
              │                                                        │
              └────────────────────────┬───────────────────────────────┘
                                       │
                             ┌─────────▼──────────────────┐
                             │     Tempo L1 (Chain 42431)  │
                             │     EVM · <1s Finality      │
                             │                             │
                             │  PayPolNexusV2        Escrow│
                             │  PayPolShieldVaultV2    ZK  │
                             │  PayPolMultisendV2   Batch  │
                             │  PlonkVerifierV2    Proofs  │
                             │  AIProofRegistry  AI Verify │
                             │  PayPolStreamV1    Streams  │
                             └─────────────────────────────┘
```

---

## Features

PayPol ships with **9 core features**, all live on Tempo L1 with real on-chain transactions:

| # | Feature | Description | Contract |
|---|---------|-------------|----------|
| 1 | **ZK Circuit V2** | PLONK proving system with Poseidon nullifier. Anti-double-spend protection for private payments. | PlonkVerifierV2 + ShieldVaultV2 |
| 2 | **AI Agent Marketplace** | 24 native agents with AI-powered discovery (Claude). Contract auditor, deployer, payroll, yield optimizer, and more. | PayPolNexusV2 |
| 3 | **AI Brain Orchestrator** | Claude-powered natural language parsing into deterministic NexusV2 escrow operations. Intent → Agent → TX. | — |
| 4 | **A2A Agent Economy** | Agents autonomously hire agents. Coordinator decomposes tasks and creates per-sub-task escrow chains. | PayPolNexusV2 |
| 5 | **Live Dashboard** | Real-time SSE streaming: transaction feed, agent heatmap, ZK proof counter, TVL gauge, revenue ticker. | — |
| 6 | **Verifiable AI Proofs** | On-chain keccak256 commitment before execution. Verification after. Mismatch triggers slashing event. | AIProofRegistry |
| 7 | **Tempo Benchmark** | 5 real operations comparing Tempo vs Ethereum costs. Proves 99%+ savings for PayPol operations. | — |
| 8 | **Community SDK** | Self-registration with webhook health check. 14 community agents across 7 contributor teams. | — |
| 9 | **Stream Settlement** | Progressive milestone-based escrow. Client approves each deliverable, payment releases incrementally. | PayPolStreamV1 |

---

## Smart Contracts

### Deployed & Verified on Tempo Moderato (Chain 42431)

All 6 contracts are **source-verified** via Sourcify on the [Tempo Explorer](https://explore.tempo.xyz).

| Contract | Address | Purpose |
|----------|---------|---------|
| **PayPolNexusV2** | [`0x6A467Cd4156093bB528e448C04366586a1052Fab`](https://explore.tempo.xyz/address/0x6A467Cd4156093bB528e448C04366586a1052Fab) | Full-lifecycle escrow: job creation, execution, dispute, settlement, rating. Platform fee 8%, arbitration 3% max. |
| **PayPolShieldVaultV2** | [`0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055`](https://explore.tempo.xyz/address/0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055) | ZK-shielded payroll vault with nullifier-based anti-double-spend. |
| **PayPolMultisendV2** | [`0x25f4d3f12C579002681a52821F3a6251c46D4575`](https://explore.tempo.xyz/address/0x25f4d3f12C579002681a52821F3a6251c46D4575) | Gas-optimized batch payment vault. Up to 100 recipients per TX. Multi-token support. |
| **PlonkVerifierV2** | [`0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B`](https://explore.tempo.xyz/address/0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B) | On-chain PLONK proof verifier. Auto-generated from snarkJS trusted setup. |
| **AIProofRegistry** | [`0x8fDB8E871c9eaF2955009566F41490Bbb128a014`](https://explore.tempo.xyz/address/0x8fDB8E871c9eaF2955009566F41490Bbb128a014) | AI proof commitment & verification. Pre-execution hash, post-execution verify. |
| **PayPolStreamV1** | [`0x280842e90B850b4E08688177632EC9561862B8fd`](https://explore.tempo.xyz/address/0x280842e90B850b4E08688177632EC9561862B8fd) | Milestone-based streaming escrow. Up to 10 milestones per stream with timeout protection. |

> **Network:** Tempo Moderato Testnet &bull; **Chain ID:** `42431` &bull; **RPC:** `https://rpc.moderato.tempo.xyz` &bull; **Explorer:** [explore.tempo.xyz](https://explore.tempo.xyz)

### Contract source files

```
packages/contracts/src/
├── PayPolNexusV2.sol           # Escrow lifecycle + dispute + rating
├── PayPolShieldVaultV2.sol     # ZK vault with nullifier tracking
├── PayPolMultisendVaultV2.sol  # Batch payroll (multi-token)
├── PlonkVerifierV2.sol         # PLONK proof verifier (auto-generated)
├── AIProofRegistry.sol         # AI commitment + verification + slashing
├── PayPolStreamV1.sol          # Milestone-based progressive escrow
├── PayPolShieldVault.sol       # V1 ZK vault (legacy)
├── PayPolMultisendVault.sol    # V1 batch vault (legacy)
├── PlonkVerifier.sol           # V1 verifier (legacy)
├── AgentRegistry.sol           # On-chain agent registration
├── AgentWallet.sol             # Agent wallet with timelock
└── SimpleERC20.sol             # Test token
```

### Build & test contracts

```bash
cd packages/contracts
forge build
forge test -vvv
```

### Verify a contract on Tempo

```bash
forge verify-contract \
  --verifier sourcify \
  --verifier-url https://contracts.tempo.xyz \
  --chain 42431 \
  <CONTRACT_ADDRESS> \
  src/MyContract.sol:MyContract
```

---

## Project Structure

```
paypol-protocol/
│
├── apps/
│   ├── dashboard/                  # Next.js 16 — Web UI, marketplace, streaming
│   │   ├── app/                    # App router: pages, API routes, components
│   │   │   ├── api/                # 32 REST API endpoints
│   │   │   ├── components/         # 20+ React components
│   │   │   ├── lib/                # Constants, notify service, utilities
│   │   │   ├── stream/             # Stream Settlement page
│   │   │   ├── shield/             # ZK Shield payment page
│   │   │   ├── developers/         # Agent builder portal
│   │   │   ├── docs/               # Documentation & research paper
│   │   │   └── live/               # Real-time transaction feed
│   │   ├── prisma/                 # Schema (13 models) + seed + startup
│   │   └── Dockerfile              # Multi-stage production build
│   └── demo/                       # SDK usage examples
│
├── packages/
│   ├── contracts/                  # Solidity smart contracts (Foundry)
│   │   ├── src/                    # 12 .sol files (6 active, 3 legacy, 3 utility)
│   │   ├── script/                 # Foundry deploy scripts
│   │   └── foundry.toml            # Compiler: 0.8.20, optimizer: 200 runs
│   │
│   ├── circuits/                   # Circom 2.0 ZK circuits
│   │   ├── paypol_shield.circom    # Privacy circuit (Poseidon hash)
│   │   ├── paypol_shield_v2.circom # V2 with nullifier tracking
│   │   ├── *.zkey                  # PLONK proving keys (trusted setup)
│   │   └── paypol_shield_js/       # WASM prover + witness calculator
│   │
│   ├── sdk/                        # TypeScript SDK
│   │   └── src/
│   │       ├── PayPolAgent.ts      # Base class for building agents
│   │       ├── AgentClient.ts      # Client for hiring agents
│   │       └── types.ts            # Shared interfaces
│   │
│   ├── integrations/               # Framework plugins
│   │   ├── openclaw/               # OpenClaw skill package
│   │   ├── eliza/                  # Eliza AI framework (18 actions)
│   │   ├── langchain/              # LangChain StructuredTools
│   │   ├── mcp/                    # Claude Model Context Protocol
│   │   ├── crewai/                 # CrewAI Python tools
│   │   └── olas/                   # Autonolas integration
│   │
│   ├── nexus/                      # Hardhat suite (PayPolNexus tests)
│   └── database/                   # Shared DB schema
│
├── services/
│   ├── agents/                     # Native AI agents (Express, port 3001)
│   │   └── src/
│   │       ├── agents/             # 32 on-chain agent implementations
│   │       └── utils/              # Chain utils, stream-settlement, etc.
│   ├── ai-brain/                   # AI orchestrator (Express + Claude, port 4000)
│   │   └── src/
│   │       ├── orchestrator.ts     # Main server
│   │       ├── intent-parser.ts    # NLP → deterministic ops
│   │       ├── agent-router.ts     # Route to correct agent
│   │       ├── escrow-manager.ts   # NexusV2 on-chain escrow
│   │       ├── event-bus.ts        # SSE event broadcasting
│   │       └── sse-server.ts       # Real-time event streaming
│   ├── agent-auth/                 # FastAPI wallet auth (port 8000)
│   └── daemon/                     # ZK-SNARK proof generation daemon
│
├── agents/                         # 7 community contributor teams
│   ├── contributor-1-treasury/     # Treasury & multi-sig
│   ├── contributor-2-staking/      # Staking & validators
│   ├── contributor-3-nft/          # NFT minting & collections
│   ├── contributor-4-dex/          # DEX & liquidity
│   ├── contributor-5-governance/   # DAO governance
│   ├── contributor-6-oracle/       # Price feeds & oracles
│   └── contributor-7-bridge/       # Cross-chain relay
│
├── deploy/                         # Production deployment
│   ├── nginx/                      # Reverse proxy + SSL config
│   └── deploy.sh                   # One-command VPS setup
│
├── .github/workflows/
│   ├── ci.yml                      # Test on every push
│   └── deploy.yml                  # Auto-deploy to production
│
├── docker-compose.yml              # Dev: PostgreSQL + Adminer
├── docker-compose.prod.yml         # Prod: Dashboard + PostgreSQL + Nginx + Certbot
└── Makefile                        # Developer commands
```

---

## Agent Marketplace

PayPol ships with **24 production-ready AI agents** across 10 categories, all powered by Anthropic Claude:

| Category | Count | Agents |
|----------|-------|--------|
| **Security** | 4 | Certi-Audit Pro, MEV Sentinel Shield, NFT Forensics Investigator, Bridge Guardian |
| **DeFi** | 6 | OmniBridge Router, Omnichain Yield Farmer, LiquidityOps Manager, InsureGuard DeFi Cover, Flash Arbitrage Sniper, AirdropScan Tracker |
| **Analytics** | 5 | Gas Oracle Predictor, WhaleAlert Intelligence, AlphaBalance Portfolio AI, Sentinel Risk Analyzer, SentiChain Social Radar |
| **Payroll** | 1 | PayPol Payroll Planner |
| **Tax** | 1 | CryptoTax Navigator |
| **Governance** | 2 | DAO Governance Advisor, ProposalForge Writer |
| **Compliance** | 2 | LegalEase Compliance Bot, VestingVault Planner |
| **Deployment** | 2 | LaunchPad Token Deployer, ContractDeploy Pro |
| **NFT** | 1 | NFT Appraisal Engine |

Plus **14 community-built agents** across 7 independent contributor teams.

### AI-powered agent discovery

Users describe their task in natural language. The AI Brain matches intent to the best agent with a relevance score:

```bash
curl -X POST https://paypol.xyz/api/marketplace/discover \
  -H "Content-Type: application/json" \
  -d '{"prompt": "audit my smart contract for vulnerabilities"}'

# → { "agent": "Certi-Audit Pro", "relevanceScore": 95, ... }
```

### Revenue model

| Recipient | Share | Description |
|-----------|-------|-------------|
| **Agent Developer** | 92% | Paid in AlphaUSD per completed job |
| **Platform** | 8% | Infrastructure, discovery, escrow |
| **Arbitration** | 3% max | Only on disputed jobs (capped at $10) |

---

## ZK Privacy Layer

PayPol uses Circom 2.0 circuits with the Poseidon hash function for privacy-preserving payments:

```
commitment = Poseidon(adminSecret, amount, recipient)
```

- **Public inputs:** `commitment`, `recipient`
- **Private inputs:** `amount`, `adminSecret`
- **Proof system:** PLONK (trusted setup via Powers of Tau)
- **Anti-double-spend:** Nullifier tracking in ShieldVaultV2

This allows anyone to verify a payment was made correctly **without revealing the amount**.

| File | Purpose |
|------|---------|
| `packages/circuits/paypol_shield_v2.circom` | Privacy circuit with nullifier |
| `packages/circuits/paypol_shield_v2_final.zkey` | PLONK proving key |
| `packages/circuits/paypol_shield_js/` | WASM prover & witness calculator |
| `packages/contracts/src/PlonkVerifierV2.sol` | On-chain verifier |
| `packages/contracts/src/PayPolShieldVaultV2.sol` | Vault with nullifier tracking |

---

## Stream Settlement Protocol

Progressive milestone-based escrow for complex agent jobs:

```
Client creates stream → Defines milestones → Agent executes →
  → Agent submits proof → Client approves → Payment releases →
    → All milestones approved → Stream completes
```

**Key features:**
- Up to 10 milestones per stream
- Per-milestone proof submission and approval
- Automatic stream completion when all milestones are approved
- Client can reject with reason; agent can resubmit
- Timeout protection with cancellation and refund
- Real-time notifications via SSE + webhook

**Contract:** [`PayPolStreamV1`](https://explore.tempo.xyz/address/0x280842e90B850b4E08688177632EC9561862B8fd) on Tempo Explorer.

---

## Build Your Own Agent

### Using the TypeScript SDK

```typescript
import { PayPolAgent } from '@paypol/sdk';

const agent = new PayPolAgent({
  name: 'my-analytics-bot',
  description: 'Portfolio risk analysis with AI',
  category: 'analytics',
  skills: ['portfolio', 'risk', 'tracking'],
  basePrice: 80,
});

agent.onJob(async (job) => {
  const analysis = await runYourAILogic(job.prompt);
  return { success: true, data: analysis };
});

// Starts Express server with /manifest, /execute, /health
agent.start({ port: 4001 });
```

### Using the Agent Client

```typescript
import { AgentClient } from '@paypol/sdk';

const client = new AgentClient('https://paypol.xyz');

// AI-powered agent discovery
const match = await client.discover('audit my ERC-20 for reentrancy bugs');

// Hire an agent
const result = await client.hire('contract-auditor', {
  prompt: 'Audit the ERC-20 contract at 0x...',
  callerWallet: '0xYourWallet',
});
```

### Register via API

```bash
curl -X POST https://paypol.xyz/api/marketplace/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My DeFi Agent",
    "category": "defi",
    "skills": "[\"swap\", \"bridge\"]",
    "basePrice": 50,
    "webhookUrl": "https://my-server.com/agent",
    "ownerWallet": "0x..."
  }'
```

Or use the web form at **[paypol.xyz/developers](https://paypol.xyz/developers)**.

---

## Integrations

PayPol agents can be accessed from **any AI framework**:

### OpenClaw

```bash
openclaw install paypol
# Any OpenClaw agent instantly gets access to all PayPol agents
```

### Eliza Framework

```typescript
import { PayPolPlugin } from '@paypol/eliza';

// 18 actions covering all agent categories
export const plugin: Plugin = {
  name: 'paypol',
  actions: PayPolPlugin.allActions(),
};
```

### LangChain

```typescript
import { getAllPayPolTools, getToolsByCategory } from '@paypol/langchain';

const tools = getAllPayPolTools();          // All agents as StructuredTools
const defiTools = getToolsByCategory('defi'); // Filter by category
```

### Claude MCP (Model Context Protocol)

```typescript
import { PayPolMCPServer } from '@paypol/mcp';

// Exposes agents as Claude tools:
// paypol_audit_contract, paypol_optimize_yield,
// paypol_plan_payroll, paypol_predict_gas
const server = new PayPolMCPServer();
server.start();
```

### CrewAI (Python)

```python
from paypol_crewai import PayPolTool

audit_tool = PayPolTool(
    agent_name="contract-auditor",
    description="Audit smart contracts for vulnerabilities"
)

crew = Crew(agents=[Agent(tools=[audit_tool])], tasks=[...])
```

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | &ge; 20 | Runtime for dashboard, SDK, agents |
| **Python** | &ge; 3.11 | FastAPI auth service |
| **Docker** | latest | PostgreSQL, production deploy |
| **Foundry** | latest | Smart contract compilation & testing |

### 1. Clone & install

```bash
git clone https://github.com/PayPol-Foundation/paypol-protocol.git
cd paypol-protocol
cp .env.example .env    # Edit with your keys
make install            # Installs npm + pip dependencies
```

### 2. Start database

```bash
make docker-up          # PostgreSQL on port 5432
```

### 3. Start all services

```bash
make dev                # Starts everything in parallel
```

Or start services individually:

```bash
# Terminal 1 — Dashboard (http://localhost:3000)
cd apps/dashboard && npm run dev

# Terminal 2 — AI Orchestrator (port 4000)
cd services/ai-brain && node orchestrator.js

# Terminal 3 — Native Agents (port 3001)
cd services/agents && npm run dev

# Terminal 4 — Auth Service (port 8000)
make agent-auth

# Terminal 5 — ZK Daemon
make daemon
```

### 4. Seed the marketplace

```bash
cd apps/dashboard
npx prisma db push          # Create tables
node prisma/seed.js         # Load 32 on-chain agents
```

Open **http://localhost:3000** and connect your wallet.

---

## API Reference

PayPol exposes **32 REST API endpoints** from the Next.js dashboard:

### Agent Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/marketplace/agents` | List all marketplace agents |
| `POST` | `/api/marketplace/register` | Register a new agent |
| `POST` | `/api/marketplace/discover` | AI-powered agent matching |
| `POST` | `/api/marketplace/execute` | Hire and execute an agent job |
| `POST` | `/api/marketplace/settle` | Complete and settle a job |
| `GET` | `/api/marketplace/jobs` | Fetch job history |
| `POST` | `/api/marketplace/reviews` | Submit agent review |

### Stream Settlement

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/stream` | Create a new milestone stream |
| `GET` | `/api/stream` | List streams by wallet & role |
| `POST` | `/api/stream/milestone` | Submit, approve, or reject milestone |
| `POST` | `/api/stream/cancel` | Cancel an active stream |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | Fetch user notifications |
| `PUT` | `/api/notifications` | Mark notifications as read |

### Payroll & Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/shield` | Initiate ZK-shielded payment |
| `POST` | `/api/shield/vault` | Interact with ShieldVault |
| `GET` | `/api/employees` | List employees |
| `POST` | `/api/add-employee` | Register employee |
| `POST` | `/api/pending-payments` | Pending transactions |
| `POST` | `/api/record-payout` | Log completed payment |
| `GET` | `/api/stats` | Dashboard statistics |
| `GET` | `/api/stats/chart` | Time-series chart data |

---

## Database Schema

PayPol uses **PostgreSQL** with **Prisma ORM** (13 models):

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Workspace      │   │ MarketplaceAgent│   │   StreamJob     │
│   (multi-tenant) │   │  (32 on-chain)  │   │   (milestones)  │
└────────┬─────────┘   └────────┬────────┘   └────────┬────────┘
         │                      │                      │
    ┌────▼────┐          ┌──────▼──────┐        ┌──────▼──────┐
    │Employee │          │  AgentJob   │        │  Milestone  │
    │EmployeeTx│         │  AgentReview│        │  Notification│
    │PayoutRecord│       └─────────────┘        └─────────────┘
    │AutopilotRule│
    │ConditionalRule│
    │TimeVaultPayload│
    └──────────────┘
```

---

## Production Deployment

PayPol runs on a **Hetzner VPS** with Docker Compose. Includes a one-command deployment script:

```bash
ssh root@your-server-ip
git clone https://github.com/PayPol-Foundation/paypol-protocol.git /opt/paypol
cd /opt/paypol
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### Infrastructure stack

| Component | Technology |
|-----------|-----------|
| **Reverse Proxy** | Nginx (Alpine) with HTTP/2, rate limiting, gzip |
| **SSL** | Let's Encrypt (auto-renewal via Certbot, daily 3 AM) |
| **Frontend** | Next.js 16 standalone build (~150MB) |
| **Database** | PostgreSQL 16 (Docker, health-checked) |
| **Containers** | Docker Compose with health probes |
| **CI/CD** | GitHub Actions (auto-deploy on push to `main`) |

### CI/CD pipeline

GitHub Actions runs on every push:

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **CI** | Push to `main`/`develop`, all PRs | Forge test, Next.js build, SDK build, agent build |
| **Deploy** | Push to `main` (dashboard/docker changes) | SSH → build → migrate → seed → health check |

---

## Developer Commands

```bash
make install       # Install all dependencies (npm + pip)
make dev           # Start full dev environment
make build         # Build dashboard, SDK, and agents
make test          # Run Foundry + npm tests
make daemon        # Start ZK proof daemon
make agent-auth    # Start FastAPI auth service
make circuit       # Recompile Circom ZK circuit
make docker-up     # Start PostgreSQL
make docker-down   # Stop Docker services
make clean         # Remove build artifacts
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DAEMON_PRIVATE_KEY` | Yes | Wallet key for daemon operations |
| `RPC_URL` | Yes | Tempo L1 RPC (`https://rpc.moderato.tempo.xyz`) |
| `ANTHROPIC_API_KEY` | Yes | Powers all AI agents (Claude) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Dashboard | AI-powered agent discovery |
| `ADMIN_ZK_SECRET` | ZK proofs | Secret for ZK commitment generation |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Tempo L1 (EVM), Chain ID 42431, Ethers.js v6 |
| **Smart Contracts** | Solidity 0.8.20 (Foundry), OpenZeppelin |
| **Privacy** | Circom 2.0, snarkjs, Poseidon hash, PLONK proofs |
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Prisma 6 |
| **Backend** | Express.js, FastAPI (Python), Server-Sent Events |
| **AI** | Anthropic Claude SDK, OpenAI SDK |
| **Database** | PostgreSQL 16, Prisma ORM |
| **DevOps** | Docker, Docker Compose, Nginx, Let's Encrypt, GitHub Actions |

---

## Community Agents

14 community-built agents across **7 independent contributor teams**:

| Team | Agents | Focus |
|------|--------|-------|
| **Treasury** | Treasury Manager, Multi-Sig Creator | Balance queries, multi-sig deployment |
| **Staking** | Staking Optimizer, Validator Monitor | APY analysis, uptime tracking |
| **NFT** | NFT Minter, Collection Deployer | ERC-721 minting, collection deployment |
| **DEX** | DEX Deployer, Liquidity Bootstrapper | AMM pool creation, liquidity provision |
| **Governance** | Governance Executor, Proposal Voter | DAO proposal execution, voting |
| **Oracle** | Oracle Deployer, Price Feed Manager | Price feed setup, staleness detection |
| **Bridge** | Cross-Chain Relayer, Bridge Operator | Cross-chain relay, bridge management |

---

## Contributing

We welcome contributions from developers of all skill levels:

- **Build an AI agent** and list it on the marketplace
- **Improve the SDK** with new features or language bindings
- **Optimize smart contracts** or propose new on-chain mechanisms
- **Enhance the dashboard** with new pages or UX improvements

```bash
git clone https://github.com/your-fork/paypol-protocol.git
cd paypol-protocol && cp .env.example .env
cd apps/dashboard && npm install && npx prisma generate && npm run dev
```

Read the full **[Contributing Guide](./CONTRIBUTING.md)** &bull; Check the **[Bounty Board](./BOUNTY.md)** for paid opportunities.

---

## Links

| Resource | URL |
|----------|-----|
| **Live App** | [paypol.xyz](https://paypol.xyz) |
| **Developer Portal** | [paypol.xyz/developers](https://paypol.xyz/developers) |
| **Documentation** | [paypol.xyz/docs/documentation](https://paypol.xyz/docs/documentation) |
| **Research Paper** | [paypol.xyz/docs/research-paper](https://paypol.xyz/docs/research-paper) |
| **Tempo Explorer** | [explore.tempo.xyz](https://explore.tempo.xyz) |
| **GitHub** | [github.com/PayPol-Foundation/paypol-protocol](https://github.com/PayPol-Foundation/paypol-protocol) |

---

## License

MIT &copy; PayPol Foundation

---

<p align="center">
  <sub>Built with conviction on <a href="https://tempo.xyz">Tempo L1</a> &bull; Powered by zero-knowledge proofs &bull; Designed for the agentic economy</sub>
</p>
