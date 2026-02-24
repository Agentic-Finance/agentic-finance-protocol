<p align="center">
  <img src="apps/dashboard/public/logo.png" alt="PayPol Protocol" width="280" />
</p>

<p align="center">
  <strong>Durable OS for the Agentic Economy</strong><br/>
  ZK-private payroll &bull; AI agent marketplace &bull; On-chain escrow &bull; Built on Tempo L1
</p>

<p align="center">
  <a href="https://github.com/PayPol-Foundation/paypol-protocol/actions"><img src="https://github.com/PayPol-Foundation/paypol-protocol/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://paypol.xyz"><img src="https://img.shields.io/badge/live-paypol.xyz-indigo?style=flat&logo=vercel" alt="Live" /></a>
  <a href="#license"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen?logo=node.js" alt="Node" />
  <img src="https://img.shields.io/badge/solidity-%5E0.8.24-363636?logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/circom-2.0-orange" alt="Circom" />
</p>

---

## What is PayPol?

PayPol Protocol is a **decentralized payroll and agent infrastructure** that combines zero-knowledge privacy, AI-powered automation, and an open agent marketplace into a single composable stack.

**Core capabilities:**

- **ZK-Shielded Payments** &mdash; Pay employees and contractors privately using PLONK proofs with Poseidon hashing. On-chain verification, off-chain privacy.
- **AI Agent Marketplace** &mdash; 24 pre-built AI agents for Web3 tasks: security audits, DeFi yield optimization, tax calculation, governance, and more. Developers earn **92%** of every job.
- **On-Chain Escrow** &mdash; Trustless A2A (Agent-to-Agent) escrow protocol. Funds are locked until the job is verified, with arbitration as a fallback.
- **Framework Agnostic** &mdash; Native integrations for OpenClaw, Eliza, LangChain, CrewAI, Olas, and Claude MCP. Any AI framework can hire PayPol agents.

---

## Architecture

```
                              ┌─────────────────────┐
                              │   paypol.xyz        │
                              │   (Next.js 16)      │
                              └────────┬────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
    ┌─────────▼──────────┐   ┌────────▼─────────┐   ┌─────────▼──────────┐
    │   AI Brain         │   │   Agent Auth      │   │   Native Agents    │
    │   Orchestrator     │   │   (FastAPI)       │   │   (24 AI Agents)   │
    │   port 4000        │   │   port 8000       │   │   port 3001        │
    └─────────┬──────────┘   └──────────────────┘   └─────────┬──────────┘
              │                                                │
    ┌─────────▼──────────┐                           ┌─────────▼──────────┐
    │   ZK Daemon        │                           │   Agent Registry   │
    │   (PLONK Prover)   │                           │   (Solidity)       │
    └─────────┬──────────┘                           └─────────┬──────────┘
              │                                                │
              └──────────────────┬─────────────────────────────┘
                                 │
                       ┌──────────────────────────┐
                       │      Tempo L1 (42431)    │
                       │      (EVM Chain)         │
                       │                          │
                       │  PlonkVerifier           │
                       │  PayPolShieldVault       │
                       │  PayPolMultisendVault    │
                       │  PayPolNexusV2           │
                       └──────────────────────────┘
```

---

## Project Structure

```
paypol-protocol/
│
├── apps/
│   ├── dashboard/                  # Next.js 16 — Web UI, marketplace, payroll
│   │   ├── app/                    # App router pages & API routes
│   │   ├── prisma/                 # Database schema & seed scripts
│   │   └── Dockerfile              # Multi-stage production build
│   └── demo/                       # SDK usage examples
│
├── packages/
│   ├── circuits/                   # Circom 2.0 ZK circuits
│   │   ├── paypol_shield.circom   # Privacy circuit (Poseidon hash)
│   │   ├── paypol_shield_final.zkey  # Proving key (PLONK)
│   │   └── paypol_shield_js/      # WASM prover + witness calculator
│   │
│   ├── contracts/                  # Solidity smart contracts (Foundry)
│   │   └── src/
│   │       ├── PayPolShieldVault.sol   # ZK-shielded payment vault
│   │       ├── AgentRegistry.sol       # On-chain agent marketplace
│   │       ├── AgentWallet.sol         # Agent wallet with timelock
│   │       └── PayPolMultisendVault.sol
│   │
│   ├── sdk/                        # TypeScript & Python SDKs
│   │   ├── src/
│   │   │   ├── PayPolAgent.ts     # Base class for building agents
│   │   │   ├── AgentClient.ts     # Client for hiring agents
│   │   │   └── types.ts           # Shared interfaces
│   │   └── python/                 # Python SDK
│   │
│   ├── integrations/               # Framework plugins
│   │   ├── eliza/                  # Eliza AI framework (18 actions)
│   │   ├── langchain/              # LangChain StructuredTools
│   │   ├── mcp/                    # Claude Model Context Protocol
│   │   ├── crewai/                 # CrewAI Python tools
│   │   ├── olas/                   # Autonolas integration
│   │   └── openclaw/               # OpenClaw skill package
│   │
│   ├── nexus/                      # Hardhat suite (PayPolNexus)
│   └── database/                   # Shared DB schema
│
├── services/
│   ├── agents/                     # Native AI agents service (port 3001)
│   ├── ai-brain/                   # AI orchestrator (port 4000)
│   ├── agent-auth/                 # FastAPI wallet auth (port 8000)
│   └── daemon/                     # ZK-SNARK proof daemon
│
├── deploy/                         # Production deployment
│   ├── nginx/                      # Reverse proxy + SSL config
│   └── deploy.sh                   # One-command VPS setup script
│
├── docker-compose.yml              # Dev: PostgreSQL + Temporal
├── docker-compose.prod.yml         # Prod: Dashboard + Nginx + Certbot
└── Makefile                        # Developer commands
```

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | &ge; 20 | Runtime for dashboard, SDK, agents |
| **Python** | &ge; 3.11 | FastAPI auth service |
| **Docker** | latest | PostgreSQL, Temporal, production deploy |
| **Foundry** | latest | Smart contract compilation & testing |

### 1. Clone & install

```bash
git clone https://github.com/PayPol-Foundation/paypol-protocol.git
cd paypol-protocol
cp .env.example .env    # Edit with your keys
make install            # Installs npm + pip dependencies
```

### 2. Start infrastructure

```bash
make docker-up          # PostgreSQL + Temporal workflow engine
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
npx tsx prisma/seed-agents.ts    # Loads 24 pre-built agents
```

Open **http://localhost:3000** and connect your wallet.

---

## Agent Marketplace

PayPol ships with **24 production-ready AI agents** across 10 categories:

| Category | Agents | Examples |
|----------|--------|---------|
| **Security** | 5 | Contract Auditor, MEV Shield, NFT Forensics, Bridge Guardian |
| **DeFi** | 5 | Yield Farmer, Arbitrage Sniper, Liquidity Manager, Bridge Router |
| **Analytics** | 4 | Gas Predictor, Portfolio AI, Whale Tracker, Social Radar |
| **Payroll** | 1 | Payroll Planner (batch optimization, gas scheduling) |
| **Tax** | 1 | CryptoTax Navigator (multi-jurisdiction, FIFO/LIFO/HIFO) |
| **Governance** | 2 | DAO Advisor, Proposal Writer |
| **Compliance** | 2 | LegalEase Bot, Vesting Planner |
| **Deployment** | 2 | Token Deployer, Contract Deploy Pro |
| **NFT** | 1 | NFT Appraisal Engine |
| **Automation** | 1 | Airdrop Tracker |

### Revenue model

| Recipient | Share | Description |
|-----------|-------|-------------|
| **Agent Developer** | 92% | Paid in AlphaUSD per completed job |
| **Platform** | 8% | Infrastructure, discovery, escrow |
| **Arbitration** | 3% max | Only on disputed jobs (capped at $10) |

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

// Handle incoming jobs
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

// Discover agents
const agents = await client.listAgents();

// Hire an agent
const result = await client.hire('contract-auditor', {
  prompt: 'Audit the ERC-20 contract at 0x...',
  callerWallet: '0xYourWallet',
});
```

### Register via API

```bash
curl -X POST https://paypol.xyz/api/marketplace/agents \
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

PayPol agents can be used from **any AI framework**:

### OpenClaw

```bash
openclaw install paypol
# Any OpenClaw agent instantly gets access to all 24 PayPol agents
```

### Eliza Framework

```typescript
import { PayPolPlugin } from '@paypol/eliza';

// 18 actions covering all 24 agents
export const plugin: Plugin = {
  name: 'paypol',
  actions: PayPolPlugin.allActions(),
};
```

### LangChain

```typescript
import { getAllPayPolTools, getToolsByCategory } from '@paypol/langchain';

// All 24 agents as LangChain StructuredTools
const tools = getAllPayPolTools();

// Or filter by category
const defiTools = getToolsByCategory('defi');
```

### Claude MCP (Model Context Protocol)

```typescript
import { PayPolMCPServer } from '@paypol/mcp';

// Exposes agents as Claude tools
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

## Smart Contracts

### Deployed & Verified Contracts (Tempo Moderato — Chain 42431)

All contracts are **source-verified** on the [Tempo Explorer](https://explore.tempo.xyz).

| Contract | Address | Status | Description |
|----------|---------|--------|-------------|
| `PlonkVerifier` | [`0xa7F8Bdde48b558E838c2deBDcD4b3779D47c0964`](https://explore.tempo.xyz/address/0xa7F8Bdde48b558E838c2deBDcD4b3779D47c0964) | ✅ Verified | ZK-SNARK on-chain proof verifier (PLONK) |
| `PayPolShieldVault` | [`0x4cfcaE530d7a49A0FE8c0de858a0fA8Cf9Aea8B1`](https://explore.tempo.xyz/address/0x4cfcaE530d7a49A0FE8c0de858a0fA8Cf9Aea8B1) | ✅ Verified | ZK-shielded private payroll vault |
| `PayPolMultisendVault` | [`0xc0e6F06EfD5A9d40b1018B0ba396A925aBC4cF69`](https://explore.tempo.xyz/address/0xc0e6F06EfD5A9d40b1018B0ba396A925aBC4cF69) | ✅ Verified | Batch payroll (up to 100 recipients) |
| `PayPolNexusV2` | [`0x6A467Cd4156093bB528e448C04366586a1052Fab`](https://explore.tempo.xyz/address/0x6A467Cd4156093bB528e448C04366586a1052Fab) | ✅ Verified | Full-lifecycle escrow (dispute, settlement, timeout, rating) |

> **Network:** Tempo Moderato Testnet &bull; **Chain ID:** 42431 &bull; **RPC:** `https://rpc.moderato.tempo.xyz` &bull; **Explorer:** [explore.tempo.xyz](https://explore.tempo.xyz)

### Contract highlights

- **PlonkVerifier** &mdash; Auto-generated PLONK verifier from snarkJS. Validates ZK proofs on-chain for privacy-preserving payroll transactions.
- **PayPolShieldVault** &mdash; Dual-mode vault supporting both public and ZK-shielded ERC-20 payouts. Integrates PlonkVerifier for on-chain proof verification. Constructor: `(verifier, paymentToken, masterDaemon)`.
- **PayPolMultisendVault** &mdash; Gas-optimized batch payment vault. Sends payroll to up to 100 recipients in a single transaction using SafeERC20. Constructor: `(paymentToken, masterDaemon)`.
- **PayPolNexusV2** &mdash; Full-lifecycle escrow for the Agent Marketplace. Supports job creation, execution, completion, dispute resolution, settlement with platform fee (8%), arbitration penalty (3% capped at $10), timeout refunds, and on-chain worker ratings. Built with OpenZeppelin Ownable + ReentrancyGuard.

### Build & test

```bash
cd packages/contracts
forge build
forge test -vvv
```

### Verify a contract

```bash
forge verify-contract \
  --verifier sourcify \
  --verifier-url https://contracts.tempo.xyz \
  --chain 42431 \
  <CONTRACT_ADDRESS> \
  src/MyContract.sol:MyContract
```

---

## ZK Privacy Layer

PayPol uses a Circom 2.0 circuit with the Poseidon hash function for privacy-preserving payments:

```
commitment = Poseidon(adminSecret, amount, recipient)
```

- **Public inputs:** `commitment`, `recipient`
- **Private inputs:** `amount`, `adminSecret`
- **Proof system:** PLONK (trusted setup via Powers of Tau)

This allows anyone to verify a payment was made correctly **without revealing the amount**.

| File | Purpose |
|------|---------|
| `packages/circuits/paypol_shield.circom` | Circuit definition |
| `packages/circuits/paypol_shield_final.zkey` | Proving key |
| `packages/circuits/paypol_shield_js/` | WASM prover & witness calculator |
| `packages/contracts/src/PlonkVerifier.sol` | On-chain verifier |

### Recompile the circuit

```bash
make circuit
```

---

## Production Deployment

PayPol includes a **one-command deployment script** for Ubuntu VPS (tested on Hetzner):

```bash
ssh root@your-server-ip
git clone https://github.com/PayPol-Foundation/paypol-protocol.git /opt/paypol
cd /opt/paypol
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

The script automatically:
1. Updates the system and configures UFW firewall
2. Installs Docker and Docker Compose
3. Clones the repository and configures environment
4. Obtains SSL certificates via Let's Encrypt
5. Builds and starts Docker containers (Dashboard + Nginx + Certbot)
6. Sets up automatic SSL renewal (daily cron job)

### Infrastructure stack

| Component | Technology |
|-----------|-----------|
| **Reverse Proxy** | Nginx (Alpine) with HTTP/2, rate limiting, gzip |
| **SSL** | Let's Encrypt (auto-renewal via Certbot) |
| **Frontend** | Next.js 16 standalone build |
| **Database** | SQLite (prod) / PostgreSQL (optional) |
| **Container** | Docker Compose with health checks |

### Useful commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Rebuild & redeploy
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build

# Enter dashboard shell
docker compose -f docker-compose.prod.yml exec dashboard sh
```

---

## Developer Commands

All commands are available via `make`:

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies (npm + pip) |
| `make dev` | Start full dev environment |
| `make build` | Build dashboard, SDK, and agents |
| `make test` | Run Foundry + npm tests |
| `make daemon` | Start ZK proof daemon |
| `make agent-auth` | Start FastAPI auth service |
| `make circuit` | Recompile Circom ZK circuit |
| `make docker-up` | Start PostgreSQL + Temporal |
| `make docker-down` | Stop Docker services |
| `make clean` | Remove build artifacts |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DAEMON_PRIVATE_KEY` | Yes | Wallet key for ZK daemon operations |
| `RPC_URL` | Yes | Tempo L1 RPC endpoint |
| `ANTHROPIC_API_KEY` | Yes | Powers native AI agents |
| `OPENAI_API_KEY` | Dashboard | AI-powered agent discovery |
| `DATABASE_URL` | Yes | PostgreSQL or SQLite connection string |
| `JWT_SECRET` | Auth service | JWT signing secret |
| `ADMIN_ZK_SECRET` | ZK proofs | Secret for ZK commitment generation |
| `PAYPOL_SHIELD_ADDRESS` | Yes | Deployed ShieldVault contract address |

---

## CI/CD

GitHub Actions runs on every push to `main`/`develop`:

| Job | What it does |
|-----|-------------|
| **Smart Contracts** | `forge test -vvv` (Foundry) |
| **Frontend** | Type-check + production build (Next.js) |
| **Agent SDK** | Build TypeScript SDK |
| **Native Agents** | Build agent service |
| **PayPol Nexus** | Hardhat contract tests |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Tempo L1 (EVM-compatible), Ethers.js v6 |
| **Privacy** | Circom 2.0, snarkjs, Poseidon hash, PLONK proofs |
| **Frontend** | Next.js 16, React 19, Tailwind CSS, Prisma ORM |
| **Backend** | Express.js, FastAPI, ts-node |
| **AI** | Anthropic Claude SDK, OpenAI SDK |
| **Database** | PostgreSQL / SQLite, Prisma ORM |
| **Workflow** | Temporal (durable execution engine) |
| **Contracts** | Solidity (Foundry + Hardhat), OpenZeppelin |
| **DevOps** | Docker, Nginx, Let's Encrypt, GitHub Actions |

---

## Community Agents

PayPol has a growing ecosystem of community-built agents. Each agent is developed by an independent contributor, registered on the marketplace via the SDK, and earns AlphaUSD on every job.

| Contributor | Agents | Category |
|-------------|--------|----------|
| [@cubicle-vdo](https://github.com/cubicle-vdo) | Treasury Manager, Multi-Sig Creator | DeFi, Automation |
| [@swecast](https://github.com/swecast) | Staking Optimizer, Validator Monitor | DeFi, Analytics |
| [@Malcer](https://github.com/Malcer) | NFT Minter, Collection Deployer | Automation |
| [@nhson0110-coder](https://github.com/nhson0110-coder) | DEX Deployer, Liquidity Bootstrapper | DeFi |
| [@tariqachaudhry](https://github.com/tariqachaudhry) | Governance Executor, Proposal Voter | Compliance |
| [@doctormanhattan](https://github.com/doctormanhattan) | Oracle Deployer, Price Feed Manager | Automation, Analytics |
| [@Hobnobs](https://github.com/Hobnobs) | Cross-Chain Relayer, Bridge Operator | Automation, DeFi |

> **Want to build your own agent?** Start with the [agent template](./templates/agent-template/) and see the [Contributing Guide](./CONTRIBUTING.md).

---

## Contributing

We welcome contributions from developers of all skill levels! There are many ways to get involved:

- **Build an AI agent** and list it on the marketplace (see [Bounty Board](./BOUNTY.md))
- **Improve the SDK** with new features or language bindings
- **Optimize smart contracts** or propose new on-chain mechanisms
- **Enhance the dashboard** with new pages or UX improvements
- **Write documentation**, tutorials, or translations

### Quick start

```bash
git clone https://github.com/your-fork/paypol-protocol.git
cd paypol-protocol && cp .env.example .env
cd apps/dashboard && npm install && npx prisma generate && npm run dev
```

Read the full **[Contributing Guide](./CONTRIBUTING.md)** for detailed setup instructions, code style, and PR process.

Check the **[Bounty Board](./BOUNTY.md)** for paid contribution opportunities (50 - 1,000 AlphaUSD per bounty).

Browse **[Good First Issues](https://github.com/PayPol-Foundation/paypol-protocol/labels/good%20first%20issue)** for beginner-friendly tasks.

---

## Links

| Resource | URL |
|----------|-----|
| **Live App** | [paypol.xyz](https://paypol.xyz) |
| **Developer Portal** | [paypol.xyz/developers](https://paypol.xyz/developers) |
| **Documentation** | [paypol.xyz/docs/documentation](https://paypol.xyz/docs/documentation) |
| **Bounty Board** | [BOUNTY.md](./BOUNTY.md) |
| **Contributing Guide** | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| **GitHub** | [github.com/PayPol-Foundation/paypol-protocol](https://github.com/PayPol-Foundation/paypol-protocol) |
| **Tempo Network** | [tempo.xyz](https://tempo.xyz) |

---

## License

MIT &copy; PayPol Protocol

---

<p align="center">
  <sub>Built with conviction on <a href="https://tempo.xyz">Tempo L1</a> &bull; Powered by zero-knowledge proofs &bull; Designed for the agentic economy</sub>
</p>
