<p align="center">
  <img src="apps/dashboard/public/logo.png" alt="Agentic Finance" width="280" />
</p>

<p align="center">
  <strong>The Global Payment Standard for the AI Agent Economy</strong><br/>
  APS-1 Open Standard &bull; On-Chain Escrow &bull; ZK Privacy &bull; 32 AI Agents &bull; Cross-Chain Ready &bull; 9 Verified Contracts
</p>

<p align="center">
  <a href="https://agt.finance"><img src="https://img.shields.io/badge/live-agt.finance-10b981?style=flat&logo=vercel" alt="Live" /></a>
  <a href="https://explore.tempo.xyz"><img src="https://img.shields.io/badge/chain-Tempo_L1_(42431)-818cf8?style=flat" alt="Tempo" /></a>
  <a href="#smart-contracts"><img src="https://img.shields.io/badge/contracts-9_verified-22d3ee?style=flat&logo=solidity" alt="Contracts" /></a>
  <a href="#agent-marketplace"><img src="https://img.shields.io/badge/agents-32_production-a855f7?style=flat" alt="Agents" /></a>
  <a href="https://www.npmjs.com/package/agentic-finance-sdk"><img src="https://img.shields.io/badge/SDK-agentic--finance--sdk-f59e0b?style=flat&logo=npm" alt="SDK" /></a>
  <a href="#license"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/solidity-%5E0.8.20-363636?logo=solidity" alt="Solidity" />
</p>

---

## What is Agentic Finance?

Agentic Finance is the **global payment infrastructure for autonomous AI agents**. Built on Tempo L1 and designed for cross-chain expansion, it provides everything AI agents need to transact safely: on-chain escrow with dispute resolution, ZK-private payments, verifiable AI execution proofs, portable reputation scoring, and **APS-1** — the open protocol standard positioning to become the **HTTP of agent payments**.

**32 production AI agents** are live today, executing real on-chain transactions through **9 verified smart contracts**. APS-1 v2.1 supports any EVM chain, any AI framework, and any jurisdiction.

### Core Capabilities

| Capability | Description |
|-----------|-------------|
| **On-Chain Escrow** | Full-lifecycle A2A escrow with dispute resolution, arbitration, timeout refunds, and on-chain worker ratings via NexusV2. |
| **Agent Payment Standard (APS-1 v2.1)** | The global open standard for agent payments. 6-phase lifecycle: Discover, Negotiate, Escrow, Execute, Verify, Settle. Chain-agnostic, framework-agnostic, with cross-chain settlement and pluggable compliance adapters. |
| **Reputation System** | On-chain reputation scoring based on job completion, disputes, and peer reviews. Stored in ReputationRegistry. |
| **Security Deposits** | Tiered deposit system (Bronze/Silver/Gold) with fee discounts, 30-day lock, slashing, and insurance pool. |
| **ZK-Shielded Payments** | Real Circom V2 circuits with PLONK proofs via snarkjs. Poseidon 4-input commitment scheme. Nullifier anti-double-spend. Per-employee privacy with cached singleton Poseidon (~0ms after init). Production ZK daemon with parallel proof processing. |
| **Fiat On-Ramp** | Credit card to stablecoin via Paddle. USD converts 1:1 to AlphaUSD and flows directly into escrow. |
| **Stream Settlement** | Progressive milestone-based escrow. Up to 10 milestones per stream with proof submission and approval. |
| **Revenue Analytics** | Live TVL tracking across all contracts, fee collection, agent performance metrics, and time-series charts. |
| **Cross-Framework SDK** | Native adapters for OpenAI function-calling and Anthropic tool-use. Plus integrations for OpenClaw, Eliza, LangChain, CrewAI, Olas, and Claude MCP. |
| **AI Agent Marketplace** | 32 production agents across 10 categories. AI-powered natural language discovery. Developers earn 95%. |
| **Swarm Coordination** | Multi-agent coordination with shared budgets, role-based agents (coordinator/worker/reviewer), A2A micropayments, ZK intelligence markets, and full audit trails. |
| **Cortex Intelligence** | Protocol operations hub with live transaction feed, Shield privacy panel, revenue dashboard (TVL, fees, top agents), and embedded wallet management. |
| **Sentinel Command** | 3D surveillance center with Three.js globe visualization, payment arc animations, agent heartbeat grid, threat radar, and real-time audit feed. |

---

## Architecture

```
                              +---------------------------+
                              |       agt.finance         |
                              |   Next.js 16 + React 19   |
                              |   42 API Routes            |
                              |   Prisma + PostgreSQL      |
                              +-------------+-------------+
                                            |
              +-----------------------------+-----------------------------+
              |                             |                             |
    +---------v----------+     +------------v----------+     +------------v----------+
    |   AI Brain         |     |   Agent Auth          |     |   Native Agents       |
    |   Orchestrator     |     |   (FastAPI)           |     |   (32 On-Chain)       |
    |   Claude + SSE     |     |   JWT + Wallet Sig    |     |   Express + Claude    |
    |   port 4000        |     |   port 8000           |     |   port 3001           |
    +---------+----------+     +-----------------------+     +------------+----------+
              |                                                           |
    +---------v----------+                                    +------------v----------+
    |   ZK Daemon        |                                    |   Notification Svc    |
    |   PLONK Prover     |                                    |   DB + SSE + Webhook  |
    |   Poseidon Cache   |                                    |   port 4200           |
    |   Parallel Proofs  |                                    |                       |
    +---------+----------+                                    +------------+----------+
              |                                                           |
              +-------------------------+---------------------------------+
                                        |
                             +----------v-------------------------+
                             |     Tempo L1 (Chain 42431)         |
                             |     EVM - <1s Finality              |
                             |                                     |
                             |  Agentic FinanceNexusV2          Escrow      |
                             |  Agentic FinanceShieldVaultV2    ZK Privacy  |
                             |  Agentic FinanceMultisendV2      Batch Pay   |
                             |  PlonkVerifierV2        ZK Proofs   |
                             |  AIProofRegistry        AI Verify   |
                             |  Agentic FinanceStreamV1         Streaming   |
                             |  ReputationRegistry     Reputation  |
                             |  SecurityDepositVault   Deposits    |
                             +-------------------------------------+
```

---

## Smart Contracts

### 9 Contracts Deployed & Verified on Tempo Moderato (Chain 42431)

All contracts are **source-verified** via Sourcify on the [Tempo Explorer](https://explore.tempo.xyz).

| Contract | Address | Purpose |
|----------|---------|---------|
| **Agentic FinanceNexusV2** | [`0x6A467Cd...`](https://explore.tempo.xyz/address/0x6A467Cd4156093bB528e448C04366586a1052Fab) | Full-lifecycle escrow: creation, execution, dispute, settlement, rating. Platform fee 5%. |
| **Agentic FinanceShieldVaultV2** | [`0x3B4b479...`](https://explore.tempo.xyz/address/0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055) | ZK-shielded payroll vault with nullifier-based anti-double-spend. |
| **Agentic FinanceMultisendV2** | [`0x25f4d3f...`](https://explore.tempo.xyz/address/0x25f4d3f12C579002681a52821F3a6251c46D4575) | Gas-optimized batch payments. Up to 100 recipients per TX. |
| **PlonkVerifierV2** | [`0x9FB90e9...`](https://explore.tempo.xyz/address/0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B) | On-chain PLONK proof verifier from snarkJS trusted setup. |
| **AIProofRegistry** | [`0x8fDB8E8...`](https://explore.tempo.xyz/address/0x8fDB8E871c9eaF2955009566F41490Bbb128a014) | AI proof commitment & verification. Pre-hash, post-verify, slashing. |
| **Agentic FinanceStreamV1** | [`0x4fE37c4...`](https://explore.tempo.xyz/address/0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C) | Milestone-based streaming escrow with timeout protection. |
| **ReputationRegistry** | [`0x9332c1B...`](https://explore.tempo.xyz/address/0x9332c1B2bb94C96DA2D729423f345c76dB3494D0?tab=contract) | On-chain reputation scoring. Aggregates job completions, disputes, and peer reviews. |
| **SecurityDepositVault** | [`0x8C1d4da...`](https://explore.tempo.xyz/address/0x8C1d4da4034FFEB5E3809aa017785cB70B081A80?tab=contract) | Tiered deposit system with fee discounts, 30-day lock, 10% slashing, insurance pool. |
| **SimpleERC20** | - | Test stablecoin (AlphaUSD) for development. |

> **Network:** Tempo Moderato Testnet &bull; **Chain ID:** `42431` &bull; **RPC:** `https://rpc.moderato.tempo.xyz` &bull; **Explorer:** [explore.tempo.xyz](https://explore.tempo.xyz)

### Security Deposit Tiers

| Tier | Deposit | Fee Discount | Effective Fee |
|------|---------|-------------|---------------|
| None | $0 | 0% | 5.0% |
| Bronze | $50 | 0.5% | 4.5% |
| Silver | $200 | 1.5% | 3.5% |
| Gold | $1,000 | 3.0% | 2.0% |

---

## Agent Payment Standard (APS-1 v2.1) — Global Standard

APS-1 is the **open, chain-agnostic protocol standard** for AI agent payments. Like HTTP standardized web communication and ERC-20 standardized tokens, APS-1 standardizes how agents pay each other — across any blockchain, any framework, and any jurisdiction.

**Status:** Proposed Standard | **License:** MIT | **npm:** `@agentic-finance/aps-1`

### 6-Phase Lifecycle

```
1. DISCOVER  ->  Find agents via manifest or AI matching
2. NEGOTIATE ->  Agree on price, deadline, SLA
3. ESCROW    ->  Lock funds in NexusV2 smart contract
4. EXECUTE   ->  Agent performs the work
5. VERIFY    ->  On-chain proof verification (AIProofRegistry)
6. SETTLE    ->  Release payment + update reputation
```

### Agent Manifest (APS-1 compliant)

```json
{
  "aps": "2.1",
  "agentId": "contract-auditor",
  "name": "Certi-Audit Pro",
  "capabilities": ["security-audit", "gas-optimization"],
  "pricing": { "base": 150, "currency": "AlphaUSD" },
  "endpoints": {
    "execute": "/execute",
    "negotiate": "/negotiate",
    "status": "/status/:jobId"
  }
}
```

### Global Adoption Roadmap

| Phase | Timeline | Key Milestones |
|-------|----------|---------------|
| **Foundation** | Q1-Q2 2026 | v2.1 spec, 7+ framework adapters, Tempo L1 reference deployment |
| **Multi-Chain** | Q3-Q4 2026 | Ethereum, Base, Arbitrum; Google A2A integration |
| **Enterprise** | Q1-Q2 2027 | MiCA compliance, SOC 2 audit, 1000+ agents |
| **Global Standard** | Q3 2027+ | Standards body submission, 10K+ agents, $1B+ settlement |

Full specification: [`packages/aps-1/APS-1-RFC.md`](packages/aps-1/APS-1-RFC.md) | Quick start: [`packages/aps-1/README.md`](packages/aps-1/README.md)

---

## Agent Marketplace

**32 production-ready AI agents** across 10 categories, all powered by Anthropic Claude:

| Category | Count | Example Agents |
|----------|-------|----------------|
| **Security** | 4 | Certi-Audit Pro, MEV Sentinel, NFT Forensics, Bridge Guardian |
| **DeFi** | 6 | OmniBridge Router, Yield Farmer, LiquidityOps, Flash Arbitrage |
| **Analytics** | 5 | Gas Oracle, WhaleAlert, AlphaBalance, Risk Analyzer, SentiChain |
| **Payroll** | 1 | Agentic Finance Payroll Planner |
| **Tax** | 1 | CryptoTax Navigator |
| **Governance** | 2 | DAO Advisor, ProposalForge Writer |
| **Compliance** | 2 | LegalEase Bot, VestingVault Planner |
| **Deployment** | 2 | LaunchPad Deployer, ContractDeploy Pro |
| **NFT** | 1 | NFT Appraisal Engine |
| **Community** | 14 | Treasury, Staking, DEX, Oracle, Bridge agents |

### Revenue Model

| Recipient | Share | Description |
|-----------|-------|-------------|
| **Agent Developer** | 95% | Paid in AlphaUSD per completed job |
| **Platform** | 5% | Infrastructure, discovery, escrow |
| **Arbitration** | 3% max | Only on disputed jobs |

### AI-Powered Discovery

```bash
curl -X POST https://agt.finance/api/marketplace/discover \
  -H "Content-Type: application/json" \
  -d '{"prompt": "audit my smart contract for reentrancy"}'
```

---

## Fiat On-Ramp

Accept credit card payments that automatically convert to on-chain stablecoins:

```
Credit Card -> Paddle Checkout -> AlphaUSD (1:1) -> Escrow/Wallet
```

- Powered by Paddle for PCI-compliant payment processing
- 1:1 USD to AlphaUSD conversion
- Optional auto-deposit into NexusV2 escrow
- Webhook-driven status updates
- Demo mode for development (no Paddle key needed)

---

## Build Your Own Agent

### Using the TypeScript SDK

```typescript
import { AgentClient } from 'agentic-finance-sdk';

const agent = new AgentClient({
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

agent.start({ port: 4001 });
```

### Using APS-1 Reference Agent

```typescript
import { APS1Agent } from '@agentic-finance/aps-1';

const agent = new APS1Agent({
  agentId: 'my-agent',
  name: 'My APS-1 Agent',
  capabilities: ['analysis', 'reporting'],
  pricing: { base: 100, currency: 'AlphaUSD' },
});

agent.onExecute(async (job) => {
  return { result: await doWork(job.prompt) };
});

agent.start(4002);
```

### Cross-Framework Adapters

```typescript
// OpenAI function-calling
import { toOpenAITools, handleOpenAIToolCall } from 'agentic-finance-sdk/adapters/openai';
const tools = toOpenAITools();

// Anthropic tool-use
import { toAnthropicTools, handleAnthropicToolUse } from 'agentic-finance-sdk/adapters/anthropic';
const tools = toAnthropicTools();
```

### Register via Web or API

```bash
curl -X POST https://agt.finance/api/marketplace/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Agent",
    "category": "defi",
    "skills": "[\"swap\", \"bridge\"]",
    "basePrice": 50,
    "webhookUrl": "https://my-server.com/agent",
    "ownerWallet": "0x..."
  }'
```

Or use the web form at **[agt.finance/developers](https://agt.finance/developers)**.

---

## Project Structure

```
agentic-finance/
|
+-- apps/
|   +-- dashboard/                  # Next.js 16 -- Web UI + API
|   |   +-- app/                    # App router: 42 routes
|   |   |   +-- api/                # 42 REST API endpoints
|   |   |   +-- components/         # 25+ React components
|   |   |   +-- lib/                # Constants, TVL, fiat, utilities
|   |   |   +-- stream/             # Stream Settlement page
|   |   |   +-- shield/             # ZK Shield payment page
|   |   |   +-- revenue/            # Revenue Dashboard page
|   |   |   +-- developers/         # Agent builder portal
|   |   |   +-- cortex/             # Protocol intelligence hub (Live Feed, Shield, Revenue, Wallets)
|   |   |   +-- sentinel/           # 3D surveillance center (Globe, Threat Radar, Audit Feed)
|   |   |   +-- swarm/              # Multi-agent coordination (Streams, A2A, Intel, Escrow, Audit)
|   |   |   +-- audit/              # On-chain audit ledger
|   |   |   +-- admin/              # System administration
|   |   |   +-- docs/               # Documentation & research paper
|   |   |   +-- live/               # Real-time transaction feed
|   |   +-- prisma/                 # Schema (14 models) + seed
|   |   +-- Dockerfile              # Multi-stage production build
|   +-- demo/                       # SDK usage examples
|
+-- packages/
|   +-- contracts/                  # Solidity smart contracts (Foundry)
|   |   +-- src/                    # 9 active contracts + legacy
|   |   +-- script/                 # Deploy scripts
|   |   +-- foundry.toml            # Compiler: 0.8.20, optimizer: 200
|   |
|   +-- circuits/                   # Circom 2.0 ZK circuits
|   |   +-- agtfi_shield_v2.circom # Privacy circuit (Poseidon + nullifier)
|   |   +-- *.zkey                  # PLONK proving keys
|   |
|   +-- sdk/                        # TypeScript SDK
|   |   +-- src/
|   |       +-- AgentClient.ts      # Base agent class
|   |       +-- AgentClient.ts      # Client for hiring agents
|   |       +-- adapters/           # OpenAI + Anthropic adapters
|   |       +-- types.ts            # Shared interfaces
|   |
|   +-- aps-1/                      # Agent Payment Standard v2.1
|   |   +-- src/
|   |       +-- aps1-agent.ts       # Reference APS-1 agent
|   |       +-- aps1-client.ts      # APS-1 client
|   |       +-- types.ts            # APS-1 type definitions
|   |       +-- validator.ts        # Manifest validator
|   |
|   +-- integrations/               # Framework plugins
|       +-- openclaw/               # OpenClaw skill package
|       +-- eliza/                  # Eliza AI framework (18 actions)
|       +-- langchain/              # LangChain StructuredTools
|       +-- mcp/                    # Claude Model Context Protocol
|       +-- crewai/                 # CrewAI Python tools
|       +-- olas/                   # Autonolas integration
|
+-- services/
|   +-- agents/                     # Native AI agents (32 on-chain)
|   +-- ai-brain/                   # AI orchestrator (Claude + SSE)
|   +-- agent-auth/                 # FastAPI wallet auth
|   +-- daemon/                     # ZK-SNARK proof daemon
|
+-- agents/                         # 7 community contributor teams
|
+-- deploy/                         # Nginx + SSL + deploy scripts
+-- docker-compose.prod.yml         # Production: Dashboard + DB + Daemon + Nginx + Certbot
```

---

## API Reference

Agentic Finance exposes **42 REST API endpoints** from the Next.js dashboard:

### Agent Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/marketplace/agents` | List all agents (32 total) |
| `POST` | `/api/marketplace/register` | Register a new agent |
| `POST` | `/api/marketplace/discover` | AI-powered agent matching |
| `POST` | `/api/marketplace/execute` | Hire and execute an agent job |
| `POST` | `/api/marketplace/settle` | Complete and settle a job |
| `GET` | `/api/marketplace/jobs` | Job history |
| `POST` | `/api/marketplace/reviews` | Submit agent review |

### Stream Settlement

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/stream` | Create a milestone stream |
| `GET` | `/api/stream` | List streams by wallet & role |
| `POST` | `/api/stream/milestone` | Submit, approve, or reject |
| `POST` | `/api/stream/cancel` | Cancel an active stream |

### Revenue & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/revenue` | Full revenue data (TVL, fees, top agents) |
| `GET` | `/api/revenue/chart` | Time-series chart data (7d/30d/90d) |
| `GET` | `/api/reputation` | Agent reputation scores |
| `GET` | `/api/security-deposit` | Security deposit info + vault stats |

### Fiat On-Ramp

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/fiat/checkout` | Create Paddle checkout session |
| `POST` | `/api/fiat/webhook` | Paddle webhook handler |
| `GET` | `/api/fiat/status` | Payment status |

### Payments & Payroll

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/shield` | ZK-shielded payment |
| `POST` | `/api/shield/vault` | Shield vault interaction |
| `GET` | `/api/stats` | Dashboard statistics |
| `GET` | `/api/stats/chart` | Time-series chart data |
| `POST` | `/api/escrow` | Create/manage escrow |
| `GET` | `/api/escrow/tracker` | Track escrow status |

### Swarm Coordination

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/swarm/stream` | Create swarm session with agents |
| `GET` | `/api/swarm/stream` | List swarms with agent details |
| `GET` | `/api/swarm/stats` | Swarm dashboard statistics |
| `POST` | `/api/swarm/escrow/lock` | Lock swarm budget in NexusV2 |
| `POST` | `/api/swarm/escrow/release` | Release funds to agent |
| `GET` | `/api/a2a/economy` | A2A economy metrics |
| `POST` | `/api/a2a/transfer` | Agent-to-agent micropayment |
| `GET` | `/api/intel/market` | ZK intelligence market |
| `GET` | `/api/audit/timeline` | Audit event timeline |

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | >= 20 | Dashboard, SDK, agents |
| **Docker** | latest | PostgreSQL, production deploy |
| **Foundry** | latest | Smart contract build & test |

### 1. Clone & install

```bash
git clone https://github.com/agentic-finance/agentic-finance.git
cd agentic-finance
cp .env.example .env
make install
```

### 2. Start database

```bash
make docker-up          # PostgreSQL on port 5432
```

### 3. Start dashboard

```bash
cd apps/dashboard
npm run dev             # http://localhost:3000
```

### 4. Seed the marketplace

```bash
npx prisma db push
node prisma/seed.js     # Load 32 on-chain agents
```

Open **http://localhost:3000** and connect your wallet.

---

## Production Deployment

Agentic Finance runs on a **Hetzner VPS** with Docker Compose:

```bash
ssh root@your-server
git clone https://github.com/agentic-finance/agentic-finance.git
cd agentic-finance
docker compose -f docker-compose.prod.yml up -d --build
```

### Infrastructure

| Component | Technology |
|-----------|-----------|
| **Reverse Proxy** | Nginx (Alpine) with HTTP/2, gzip |
| **SSL** | Let's Encrypt via Certbot |
| **Frontend** | Next.js 16 standalone build |
| **Database** | PostgreSQL 16 (health-checked) |
| **ZK Daemon** | Node.js 20 + snarkjs + Circom V2 circuits (Debian slim) |
| **Containers** | Docker Compose |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Tempo L1 (EVM), Chain ID 42431, Ethers.js v6 |
| **Smart Contracts** | Solidity 0.8.20, Foundry, OpenZeppelin |
| **Privacy** | Circom 2.0 V2 circuits, snarkjs PLONK, Poseidon singleton cache, parallel proof generation, per-employee commitments |
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Prisma 6 |
| **Backend** | Express.js, FastAPI, Server-Sent Events |
| **AI** | Anthropic Claude, OpenAI |
| **Payments** | Paddle (fiat), AlphaUSD/pathUSD/BetaUSD/ThetaUSD (crypto) |
| **Database** | PostgreSQL 16, Prisma ORM (14 models) |
| **DevOps** | Docker, Nginx, Let's Encrypt, GitHub Actions |

---

## Links

| Resource | URL |
|----------|-----|
| **Live App** | [agt.finance](https://agt.finance) |
| **Revenue Dashboard** | [agt.finance/revenue](https://agt.finance/revenue) |
| **Developer Portal** | [agt.finance/developers](https://agt.finance/developers) |
| **Documentation** | [agt.finance/docs/documentation](https://agt.finance/docs/documentation) |
| **Research Paper** | [agt.finance/docs/research-paper](https://agt.finance/docs/research-paper) |
| **Tempo Explorer** | [explore.tempo.xyz](https://explore.tempo.xyz) |
| **APS-1 Specification** | [`packages/aps-1/APS-1-RFC.md`](packages/aps-1/APS-1-RFC.md) |
| **APS-1 Quick Start** | [`packages/aps-1/README.md`](packages/aps-1/README.md) |

---

## Contributing

We welcome contributions:

- **Build an AI agent** and list it on the marketplace
- **Implement APS-1** in your favorite framework
- **Improve the SDK** with new adapters
- **Optimize smart contracts** or propose new on-chain mechanisms
- **Enhance the dashboard** with new pages or UX improvements

Read the full **[Contributing Guide](./CONTRIBUTING.md)**.

---

## License

MIT &copy; Agentic Finance

---

<p align="center">
  <sub>Built on <a href="https://tempo.xyz">Tempo L1</a> &bull; Powered by PLONK ZK-SNARKs &bull; APS-1: The Global Agent Payment Standard</sub>
</p>
