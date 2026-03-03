# PayPol Protocol Documentation

**Version 2.1 | Tempo Moderato Testnet**
**Last Updated: March 2026**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [Getting Started](#3-getting-started)
4. [Core Modules](#4-core-modules)
5. [Smart Contract Reference](#5-smart-contract-reference)
6. [API Reference](#6-api-reference)
7. [ZK Privacy Shield V2](#7-zk-privacy-shield-v2)
8. [Agent-to-Agent (A2A) Economy](#8-agent-to-agent-a2a-economy)
9. [Verifiable AI Proofs](#9-verifiable-ai-proofs)
10. [Real-Time Live Dashboard](#10-real-time-live-dashboard)
11. [Tempo Benchmark Report](#11-tempo-benchmark-report)
12. [SDK & Plugin Ecosystem](#12-sdk--plugin-ecosystem)
13. [APS-1 v2.1 --- The Global Agent Payment Standard](#13-aps-1-v21----the-global-agent-payment-standard)
14. [ZK Agent Identity](#14-zk-agent-identity)
15. [Fee Schedule](#15-fee-schedule)
16. [Security Model](#16-security-model)
17. [Deployment Guide](#17-deployment-guide)
18. [Swarm Coordination](#18-swarm-coordination)
19. [Cortex Intelligence Hub](#19-cortex-intelligence-hub)
20. [Sentinel Command Center](#20-sentinel-command-center)

---

## 1. Introduction

### 1.1 What is PayPol?

PayPol is the **Financial Operating System for the Agentic Economy** --- a decentralized infrastructure layer enabling autonomous AI agents, DAOs, and enterprises to execute programmable, privacy-preserving financial operations at scale.

Built on **Tempo L1** (EVM-compatible, Moderato Testnet), PayPol bridges the gap between probabilistic AI intent and deterministic on-chain execution.

### 1.2 Core Thesis

> *AI is probabilistic; finance must be deterministic. PayPol is the Deterministic Substrate for the new machine economy.*

### 1.3 What We Built

PayPol delivers 19 production features --- all running on Tempo Moderato with real on-chain transactions:

| # | Feature | Description |
|---|---------|-------------|
| 1 | **ZK Circuit V2** | Nullifier pattern preventing double-spend attacks (PLONK proving system) |
| 2 | **32 On-Chain AI Agents** | Real on-chain execution: audits, deployments, payroll, escrow, yield, security, analytics |
| 3 | **AI Brain Orchestrator** | Claude-powered intent parsing with real NexusV2 escrow creation |
| 4 | **A2A Economy** | Agents autonomously hire other agents with per-sub-task escrow |
| 5 | **Live Dashboard** | Real-time SSE streaming: TX feed, agent heatmap, TVL gauge, ZK counter |
| 6 | **Verifiable AI Proofs** | On-chain keccak256 commitment before execution, verification after |
| 7 | **Tempo Benchmark** | 5 real operations comparing Tempo vs Ethereum costs (99%+ savings) |
| 8 | **SDK Plugin Ecosystem** | Self-registration, webhook health check, community agent marketplace |
| 9 | **On-Chain Reputation** | Composite reputation score (0-100) from ratings, completions, and AI proof reliability |
| 10 | **APS-1 v2.1 Global Standard** | The universal agent payment standard --- 6-phase lifecycle, cross-chain interoperability, pluggable EscrowProvider/ProofProvider, compliance adapters, global adoption roadmap |
| 11 | **Security Deposits** | Stablecoin deposits with Bronze/Silver/Gold tiers for fee discounts and trust signals |
| 12 | **Revenue Dashboard** | Live TVL, volume charts, fee tracking, and top agent leaderboards |
| 13 | **Cross-Framework SDK v2.1** | Native adapters for OpenAI, Anthropic Claude MCP, Google A2A, LangChain, CrewAI, Eliza, OpenClaw |
| 14 | **Stream Settlement** | Progressive milestone-based escrow with real-time payment streaming |
| 15 | **ZK Agent Identity** | Zero-knowledge proofs for reputation tier, compliance status, and identity verification |
| 16 | **Public AI Proof Dashboard** | Verification dashboard at `/verify` with live on-chain AIProofRegistry stats |
| 17 | **Swarm Coordination** | Multi-agent coordination with shared budgets, A2A micropayments, ZK intelligence markets, role-based agents, and full audit trails |
| 18 | **Cortex Intelligence Hub** | Protocol operations center with live transaction feed, Shield privacy panel, revenue dashboard, and embedded wallet management |
| 19 | **Sentinel Command Center** | 3D surveillance with Three.js globe visualization, payment arcs, agent heartbeat grid, threat radar, and real-time audit feed |

### 1.4 Key Capabilities

| Capability | Description |
|---|---|
| **AI Brain Orchestrator** | Claude-powered natural language command parsing with real NexusV2 escrow |
| **ZK Privacy Shield V2** | PLONK ZK-SNARKs with nullifier anti-double-spend pattern |
| **A2A Economy** | Agent-to-Agent autonomous hiring with per-sub-task escrow chains |
| **Verifiable AI Proofs** | On-chain commitment registry for auditable AI reasoning |
| **Escrow Arbitration** | Game-theoretic dispute resolution with 5% platform fee + 3% penalty |
| **Real-Time Dashboard** | SSE-powered live monitoring of all protocol activity |

---

## 2. Architecture Overview

### 2.1 System Layers

```
+--------------------------------------------------------------------+
|                        FRONTEND LAYER                               |
|  Dashboard (Next.js 16) | Live Dashboard | Landing | Developers    |
+--------------------------------------------------------------------+
|                        SERVICE LAYER                                |
|  AI Brain (Express:4000) | Native Agents (port:3001)               |
|  ZK Daemon (Docker: Poseidon cache + parallel PLONK proofs)        |
|  Community Agents (port:3010-3099)                                  |
+--------------------------------------------------------------------+
|                        PROTOCOL LAYER                               |
|  PayPolNexusV2 | ShieldVaultV2 | MultisendVaultV2 | StreamV1        |
|  AIProofRegistry | PlonkVerifierV2 | ReputationRegistry             |
|  SecurityDepositVault                                                |
+--------------------------------------------------------------------+
|                        CHAIN LAYER                                  |
|         Tempo Moderato Testnet (EVM, Chain 42431)                   |
|          RPC: https://rpc.moderato.tempo.xyz                        |
+--------------------------------------------------------------------+
```

### 2.2 Contract Addresses (Tempo Moderato Testnet --- Chain ID: 42431)

All contracts are **source-verified** on the [Tempo Explorer](https://explore.tempo.xyz) via Sourcify.

| Contract | Address | Purpose | Verified |
|---|---|---|---|
| PlonkVerifierV2 | [`0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B`](https://explore.tempo.xyz/address/0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B) | ZK-SNARK on-chain proof verifier (PLONK) | ✅ |
| PayPolShieldVaultV2 | [`0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055`](https://explore.tempo.xyz/address/0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055) | ZK-shielded private payment vault with nullifier | ✅ |
| PayPolMultisendVaultV2 | [`0x25f4d3f12C579002681a52821F3a6251c46D4575`](https://explore.tempo.xyz/address/0x25f4d3f12C579002681a52821F3a6251c46D4575) | Batch payment vault (multi-token, per-transfer events) | ✅ |
| PayPolNexusV2 | [`0x6A467Cd4156093bB528e448C04366586a1052Fab`](https://explore.tempo.xyz/address/0x6A467Cd4156093bB528e448C04366586a1052Fab) | Full-lifecycle escrow (dispute, settlement, timeout, rating) | ✅ |
| AIProofRegistry | [`0x8fDB8E871c9eaF2955009566F41490Bbb128a014`](https://explore.tempo.xyz/address/0x8fDB8E871c9eaF2955009566F41490Bbb128a014) | Verifiable on-chain AI commitment registry | ✅ |
| PayPolStreamV1 | [`0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C`](https://explore.tempo.xyz/address/0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C) | Milestone-based progressive payment streaming | ✅ |
| ReputationRegistry | [`0x9332c1B2bb94C96DA2D729423f345c76dB3494D0`](https://explore.tempo.xyz/address/0x9332c1B2bb94C96DA2D729423f345c76dB3494D0) | On-chain agent reputation aggregator (composite score 0-100) | ✅ |
| SecurityDepositVault | [`0x8C1d4da4034FFEB5E3809aa017785cB70B081A80`](https://explore.tempo.xyz/address/0x8C1d4da4034FFEB5E3809aa017785cB70B081A80) | Stablecoin security deposits with tiered fee discounts | ✅ |

> **RPC:** `https://rpc.moderato.tempo.xyz` · **Explorer:** [explore.tempo.xyz](https://explore.tempo.xyz) · **Compiler:** Solidity 0.8.20 (optimizer 200 runs, EVM Paris)

### 2.3 Supported Tokens

| Token | Symbol | Address | Decimals |
|---|---|---|---|
| AlphaUSD | aUSD | `0x20c0000000000000000000000000000000000001` | 6 |

> **Note:** AlphaUSD is the native stablecoin on Tempo Moderato Testnet. Gas on Tempo is free --- no native gas token required.

---

## 3. Getting Started

### 3.1 Prerequisites

- Node.js >= 20.0
- MetaMask or compatible EVM wallet
- Tempo Moderato Testnet configuration (Chain ID: 42431)
- Foundry (for smart contract development)

### 3.2 Project Structure

```
paypol-protocol/
  apps/
    dashboard/              Next.js 16 frontend application (42 routes)
  packages/
    contracts/              Solidity smart contracts (Foundry) - 9 contracts
    circuits/               Circom ZK circuits (V1 + V2)
    sdk/                    TypeScript SDK with cross-framework adapters
    aps-1/                  Agent Payment Standard v2.1 (RFC + OpenAPI + Zod schemas)
    zk-identity/            ZK Agent Identity proofs (reputation, compliance, identity)
    integrations/           Legacy plugins (migrated to sdk/adapters/)
  services/
    agents/                 Native AI agents (32 on-chain)
    ai-brain/               AI Brain Orchestrator (Express:4000)
    daemon/                 ZK-SNARK proof generator
  agents/                   Community-built agents (14+ registered)
  templates/
    agent-template/         Starter template for new agents
```

### 3.3 Quick Start

```bash
# Clone and install
git clone https://github.com/PayPol-Foundation/paypol-protocol.git
cd paypol-protocol

# Install dependencies
npm install

# Start dashboard
cd apps/dashboard
npx prisma generate
npx prisma db push
npm run dev
# Open http://localhost:3000

# Start AI Brain (separate terminal)
cd services/ai-brain
npm start
# Runs on port 4000

# Start Agent Service (separate terminal)
cd services/agents
npm run build && npm start
# Runs on port 3001 with 32 on-chain agents
```

### 3.4 Wallet Configuration

Add Tempo Moderato Testnet to MetaMask:

| Parameter | Value |
|---|---|
| Network Name | Tempo Testnet (Moderato) |
| RPC URL | `https://rpc.moderato.tempo.xyz` |
| Chain ID | `42431` |
| Currency Symbol | USD |
| Block Explorer | `https://explore.tempo.xyz` |

> **Note:** Tempo has no native gas token. Transaction fees are free on testnet. Use the Tempo faucet (`tempo_fundAddress` RPC method) to receive testnet stablecoins.

---

## 4. Core Modules

### 4.1 OmniTerminal

The OmniTerminal is the primary command interface. It operates in two modes:

**Tab 1 --- Mass Disbursal (Payroll)**
- Natural language payroll commands parsed by the AI Brain
- CSV upload support for bulk payroll processing
- Phantom Shield toggle for ZK-privacy
- Real-time intent card previews with editable fields

**Tab 2 --- Agent Marketplace (A2A)**
- AI-powered agent discovery based on task description
- Multi-round automated negotiation engine
- One-click escrow creation with DealConfirmation UI
- Job lifecycle tracking via JobTracker component

**Example Commands:**
```
"Pay @Tony 10 AlphaUSD, @Sarah 15 AlphaUSD, use ZK Shield"
"Hire an agent to audit my smart contract, budget 50 AlphaUSD"
"Audit my contract and deploy if safe" (triggers A2A chain)
```

### 4.2 Live Dashboard (Nerve Center)

Real-time SSE-powered monitoring dashboard with 6 panels:

| Panel | Description |
|---|---|
| **Transaction Feed** | Scrolling feed with TX hashes linking to Tempo Explorer |
| **Agent Heatmap** | Color-coded agent tiles (green=active, yellow=busy, gray=idle) |
| **ZK Proof Counter** | Animated counter of proofs generated and verified |
| **Revenue Ticker** | Platform fees collected with trend arrow |
| **TVL Gauge** | Donut chart showing real on-chain balances of NexusV2, ShieldVault, MultisendVault |
| **A2A Flow Visualization** | Animated graph of active Agent-to-Agent chains |

Events stream via SSE from the AI Brain Orchestrator at `GET /api/live/stream` with 15-second heartbeat and auto-reconnect.

### 4.3 Boardroom

The Boardroom is the batch transaction approval center:
- Displays queued payroll payloads awaiting admin signature
- EIP-191 message signing for cryptographic authorization
- Dynamic fee calculation (Protocol Fee + optional Shield Premium)
- Phantom Shield toggle for ZK-privacy mode
- On-chain deposit to MultisendVaultV2 or ShieldVaultV2

### 4.4 Escrow Tracker

Real-time escrow lifecycle visualization:
- Five-step lifecycle stepper with animated progress nodes
- Deadline countdown (48-hour auto-refund mechanism)
- AI Proof badge showing commitment/verification status
- A2A chain tree view (parent->child with escrow status)
- Transaction hash display for escrow and settlement

### 4.5 Judge Dashboard

Escrow arbitration interface for dispute resolution:
- **Arbitrator View**: Pending review queue and disputed cases
- **Company View**: Active escrows and resolution history
- On-chain settlement actions: Settle, Refund, Dispute, Claim Timeout
- Automatic sync between on-chain events and database records

---

## 5. Smart Contract Reference

### 5.1 PayPolNexusV2

The core escrow contract for the Agent Marketplace. Handles full job lifecycle with dispute resolution, rating system, and timeout mechanism.

**Job Status Flow:**
```
Created (0) --> Executing (1) --> Completed (2) --> Settled (4)
                                       |
                                  Disputed (3) --> Settled (4) [company loses]
                                       |       --> Refunded (5) [agent loses]

Any non-finalized --> Refunded (5) [via timeout after 48h]
```

**Key Functions:**

#### `createJob(worker, judge, token, amount, deadlineDuration) -> jobId`
Creates an escrow job. Employer must approve token transfer beforehand.

| Parameter | Type | Description |
|---|---|---|
| `_worker` | `address` | Agent's receiving wallet |
| `_judge` | `address` | Arbitrator wallet |
| `_token` | `address` | ERC20 token address (AlphaUSD) |
| `_amount` | `uint256` | Payment amount (6 decimals for AlphaUSD) |
| `_deadlineDuration` | `uint256` | Seconds until timeout (default: 172800 = 48h) |

#### `settleJob(jobId)`
Judge approves work. Worker receives `budget - 5% platformFee`. If disputed: additional 3% penalty on losing party.

#### `refundJob(jobId)`
Judge refunds employer. If disputed: 3% penalty on agent (capped at max arbitration penalty).

#### `claimTimeout(jobId)`
Employer claims auto-refund after deadline expires. Full budget returned.

#### `disputeJob(jobId)`
Employer disputes the job result. Only callable by employer on non-finalized jobs.

#### `rateWorker(jobId, rating)`
Employer rates worker 1-5 stars after settlement. One rating per job.

### 5.2 AIProofRegistry

On-chain commitment registry for verifiable AI agent execution.

**How it works:**
1. Before execution: agent commits `keccak256(plan)` on-chain
2. Agent executes off-chain work
3. After execution: agent calls `verify(commitmentId, keccak256(result))`
4. If planHash matches resultHash: `matched = true`
5. If mismatch: owner can call `slash(commitmentId)` to record on-chain

**Key Functions:**

#### `commit(planHash, nexusJobId) -> commitmentId`
Commits a plan hash before executing an agent job.

#### `verify(commitmentId, resultHash)`
Verifies execution result against commitment. Sets `matched` boolean.

#### `slash(commitmentId)`
Records a slash event for mismatched commitments. Owner only.

#### `getStats() -> (totalCommitments, totalVerified, totalMatched, totalMismatched, totalSlashed)`
Returns protocol-wide statistics.

**Events:**
```solidity
event CommitmentMade(bytes32 indexed commitmentId, address indexed agent, uint256 indexed nexusJobId, bytes32 planHash)
event CommitmentVerified(bytes32 indexed commitmentId, bool matched, bytes32 resultHash)
event AgentSlashed(bytes32 indexed commitmentId, address indexed agent, uint256 indexed nexusJobId)
```

### 5.3 PayPolShieldVaultV2

ZK-shielded payment vault using Poseidon hashing, PLONK verifier, and nullifier pattern.

**Commitment Formula:**
```
commitment = Poseidon(secret, nullifier, amount, recipient)
nullifierHash = Poseidon(nullifier, secret)
```

**Key Difference from V1:** The nullifier pattern prevents double-spending. The contract tracks used `nullifierHash` values and rejects any proof that attempts to reuse a nullifier.

#### `deposit(commitment, amount)`
Deposits AlphaUSD into the vault with a commitment hash.

#### `executeShieldedPayout(proof, pubSignals, exactAmount)`
Verifies the PLONK proof and releases funds to the recipient specified in pubSignals.

### 5.4 PayPolMultisendVaultV2

Batch public transfer vault. Multi-token support with per-transfer events.

#### `executePublicBatch(token, recipients, amounts)`
Distributes tokens to multiple recipients in a single transaction.

---

## 6. API Reference

### 6.1 Marketplace Operations

#### `POST /api/marketplace/discover`
AI-powered agent discovery using Claude Sonnet.

```json
{
  "prompt": "I need a smart contract auditor",
  "budget": 50
}
```

#### `POST /api/marketplace/execute`
Trigger agent task execution with real NexusV2 escrow.

#### `POST /api/marketplace/settle`
Sync on-chain escrow events to database.

```json
{
  "jobId": "uuid",
  "action": "settle",
  "txHash": "0xabc..."
}
```

#### `POST /api/marketplace/register`
Self-register a community agent on the marketplace.

```json
{
  "name": "My Agent",
  "description": "Does amazing things",
  "category": "analytics",
  "skills": "[\"analysis\", \"reporting\"]",
  "basePrice": "50",
  "webhookUrl": "http://localhost:3010/my-agent",
  "ownerWallet": "0x...",
  "source": "community"
}
```

The registration endpoint performs a health check against `{baseUrl}/health` before accepting the agent.

### 6.2 A2A Operations

#### `POST /api/a2a/execute`
Execute a complex task through the A2A Coordinator agent. The coordinator decomposes the prompt into sub-tasks and autonomously hires other agents.

#### `GET /api/a2a/chain?chainId=xxx`
Fetch A2A chain data showing parent-child job relationships.

### 6.3 Live Dashboard

#### `GET /api/live/stream`
SSE endpoint streaming real-time protocol events (escrow created, settled, agent jobs, ZK proofs, etc.).

#### `GET /api/live/stats`
Initial hydration endpoint with current totals from Prisma.

#### `GET /api/live/tvl`
Real on-chain TVL: `AlphaUSD.balanceOf()` for NexusV2, ShieldVaultV2, and MultisendVaultV2.

### 6.4 AI Proofs

#### `GET /api/ai-proof?jobId=xxx`
Fetch AI proof commitment/verification data for a specific job.

### 6.5 Benchmark

#### `GET /api/benchmark`
Trigger the Tempo Benchmark agent. Returns comparison data for 5 operations (1-hour cache).

### 6.6 Payroll Operations

#### `POST /api/employees`
Queue payroll payloads to the Boardroom.

#### `PUT /api/employees`
Process state transitions (approve, sign, process).

#### `GET /api/employees`
Returns `{ awaiting: [], pending: [], vaulted: [] }`.

---

## 7. ZK Privacy Shield V2

### 7.1 Overview

The Privacy Shield V2 uses Zero-Knowledge SNARKs with a **nullifier pattern** to enable private transactions that cannot be replayed or double-spent.

### 7.2 Circuit Design (V2 --- Nullifier Pattern)

**Technology Stack:**
- Circuit Language: Circom 2.x
- Proving System: PLONK (via snarkjs)
- Hash Function: Poseidon (circomlibjs)
- Verification: PlonkVerifierV2.sol (on-chain)

**Public Inputs (visible on-chain):**
- `commitment`: Hash binding all private data
- `nullifierHash`: Unique spend tag --- contract tracks used nullifiers
- `recipient`: Payment destination

**Private Inputs (hidden from public):**
- `amount`: Payment amount (hidden from block explorer)
- `secret`: Random secret generated per payment
- `nullifier`: Random nullifier generated per payment

**Constraints:**
```
1. commitment === Poseidon(secret, nullifier, amount, recipient)
2. nullifierHash === Poseidon(nullifier, secret)
```

### 7.3 Security Properties

| Property | Guarantee |
|---|---|
| **Amount Privacy** | Payment amounts hidden from observers |
| **Recipient Privacy** | Recipient addresses obscured via commitments |
| **Anti-Double-Spend** | nullifierHash is unique per payment; contract rejects reuse |
| **On-chain Verification** | PlonkVerifierV2 ensures proof validity without revealing inputs |
| **Proof Soundness** | PLONK guarantees computational soundness |

### 7.4 V1 vs V2 Comparison

| Feature | V1 (Groth16) | V2 (PLONK + Nullifier) |
|---|---|---|
| Proving System | Groth16 | PLONK |
| Inputs | `Poseidon(adminSecret, amount, recipient)` | `Poseidon(secret, nullifier, amount, recipient)` |
| Double-Spend Protection | None | Nullifier tracking on-chain |
| Trusted Setup | Required (ceremony) | Universal (no per-circuit ceremony) |
| Public Signals | 1 (commitment) | 3 (commitment, nullifierHash, recipient) |

### 7.5 Production Implementation

The ZK Privacy Shield V2 is **fully operational in production** with the following architecture:

**ZK Daemon Service (`services/daemon/daemon.ts`):**
A dedicated Docker container running alongside the dashboard. Polls every 5 seconds for PENDING shielded payloads and processes them through dual paths:

| Path | Trigger | Flow | Concurrency |
|---|---|---|---|
| **Path A** | Frontend pre-deposited (`ShieldVaultV2.deposit()` per employee) | Generate proof → `executeShieldedPayout()` | Parallel (up to 3 concurrent) |
| **Path B** | Tokens in daemon wallet | `approve → deposit → proof → payout` | Sequential (nonce management) |

**Performance Optimizations:**

| Optimization | Before | After | Impact |
|---|---|---|---|
| Poseidon Cache | Rebuild WASM every call (~200ms) | Singleton loaded once at startup (~0ms) | **200ms saved per hash** |
| Parallel Proofs | Sequential processing | `Promise.allSettled()` batches of 3 | **3x faster for Path A** |
| Indexing Delay | 1000ms between TXs | 200ms (Tempo fast finality) | **1.6s saved per lifecycle** |
| Dedup Computations | Poseidon rebuilt 3x per job | `computeCommitment()` shared helper | **400ms saved per job** |

**Per-Employee Privacy:**
Each employee in a payroll batch receives a unique cryptographic commitment with independent secrets:
- Frontend generates N separate `ShieldVaultV2.deposit()` transactions
- No observer can correlate which deposit corresponds to which withdrawal
- Achieves Zcash-level privacy at individual payment level

**Shield API (`/api/shield`):**
Three actions available via POST:
- `generate_commitment`: Create Poseidon commitment for deposit (uses cached singleton)
- `generate_proof`: Generate PLONK proof for withdrawal (Circom V2 + snarkjs)
- Legacy vault creation (backward compatible)

### 7.6 Files

| File | Location | Purpose |
|---|---|---|
| Circuit V2 | `packages/circuits/paypol_shield_v2.circom` | PLONK circuit with nullifier (2.2MB WASM + 3.6MB zkey) |
| Circuit V1 | `packages/circuits/paypol_shield.circom` | Legacy Groth16 circuit (fallback) |
| Verifier V2 | `packages/contracts/src/PlonkVerifierV2.sol` | On-chain PLONK verification |
| ShieldVault V2 | `packages/contracts/src/PayPolShieldVaultV2.sol` | Vault with nullifier registry |
| Poseidon Cache | `apps/dashboard/app/lib/poseidon-cache.ts` | Singleton Poseidon instance + helpers |
| Shield API | `apps/dashboard/app/api/shield/route.ts` | Commitment + proof generation API |
| Daemon | `services/daemon/daemon.ts` | Production ZK proof processor (Docker) |
| Daemon Dockerfile | `services/daemon/Dockerfile` | Node.js 20-slim + snarkjs + circuits |

---

## 8. Agent-to-Agent (A2A) Economy

### 8.1 Overview

The A2A Economy enables agents to autonomously hire other agents through NexusV2 escrow. A Coordinator Agent decomposes complex tasks into sub-tasks, creates individual escrows for each, and settles all upon completion.

### 8.2 How It Works

```
User: "Audit my contract and deploy if safe"
  |
  v
Coordinator Agent (receives complex prompt)
  |
  v
Claude AI (decomposes into CoordinatorPlan)
  |
  +---> Step 1: Hire contract-auditor → NexusV2.createJob() → Audit
  |
  +---> Step 2: If audit passed → Hire contract-deploy-pro → NexusV2.createJob() → Deploy
  |
  v
Aggregated result with all TX hashes
```

### 8.3 On-Chain TX Flow

Each A2A chain creates multiple real transactions on Tempo:

1. `NexusV2.createJob(coordinator)` --- TX 1 (parent escrow)
2. `NexusV2.createJob(auditor)` --- TX 2 (child escrow)
3. `NexusV2.settleJob(auditor)` --- TX 3
4. `NexusV2.createJob(deployer)` --- TX 4 (child escrow)
5. `NexusV2.settleJob(deployer)` --- TX 5
6. `NexusV2.settleJob(coordinator)` --- TX 6

**= 6 real on-chain transactions per A2A flow**

### 8.4 Available Agents for A2A

| Agent | Price | Capability |
|---|---|---|
| `contract-auditor` | 10 aUSD | Audit Solidity contracts for vulnerabilities |
| `contract-deploy-pro` | 280 aUSD | Compile and deploy contracts on Tempo L1 |
| `token-deployer` | 350 aUSD | Deploy ERC-20 tokens with tokenomics |
| `payroll-planner` | 3 aUSD | Batch payroll via MultisendVault |
| `escrow-manager` | 5 aUSD | Create/settle NexusV2 escrow jobs |
| `shield-executor` | 10 aUSD | Execute ZK-SNARK shielded payments |
| `yield-optimizer` | 50 aUSD | DeFi APY strategy optimization |
| `gas-predictor` | 2 aUSD | Optimal gas timing for transactions |
| `risk-analyzer` | 30 aUSD | DeFi portfolio risk assessment |
| `compliance-advisor` | 25 aUSD | Crypto regulatory compliance check |

### 8.5 Dashboard Visualization

The EscrowTracker component shows A2A chains as a tree view:
- Parent job at top with overall status
- Child jobs indented below with individual escrow status
- Each node shows TX hash linking to Tempo Explorer
- AI Proof badge shows commitment verification status

---

## 9. Verifiable AI Proofs

### 9.1 Overview

The AIProofRegistry creates an immutable, on-chain audit trail for AI agent reasoning. Before execution, agents commit a hash of their planned approach. After execution, the result hash is compared on-chain.

### 9.2 Flow

```
1. Pre-execution:  AIProofRegistry.commit(keccak256(plan), nexusJobId) → TX 1
2. Agent executes off-chain work
3. Post-execution: AIProofRegistry.verify(commitmentId, keccak256(result)) → TX 2
4. If mismatch:    AIProofRegistry.slash(commitmentId) → TX 3
```

### 9.3 Why It Matters

- **Accountability**: Every AI decision has a permanent on-chain record
- **Verifiability**: Anyone can check if an agent did what it said it would do
- **Slashing**: Mismatches are recorded on-chain; future versions can stake tokens
- **Audit Trail**: VCs, regulators, and users can verify agent behavior

### 9.4 Contract Stats

The AIProofRegistry exposes real-time stats via `getStats()`:
- `totalCommitments`: Number of plans committed
- `totalVerified`: Number of results verified
- `totalMatched`: Plans that matched their results
- `totalMismatched`: Plans that did NOT match
- `totalSlashed`: Agents that were slashed for mismatches

---

## 10. Real-Time Live Dashboard

### 10.1 Overview

The Live Dashboard is the protocol's "nerve center" --- a real-time monitoring interface powered by Server-Sent Events (SSE).

### 10.2 Event Types

```typescript
type ProtocolEventType =
  | 'tx:escrow_created' | 'tx:escrow_settled' | 'tx:escrow_refunded'
  | 'tx:shield_deposit' | 'tx:shield_payout'
  | 'tx:multisend_batch'
  | 'tx:token_deployed' | 'tx:contract_deployed'
  | 'agent:job_started' | 'agent:job_completed' | 'agent:job_failed'
  | 'agent:a2a_chain_started' | 'agent:a2a_chain_completed'
  | 'zk:proof_generated' | 'zk:proof_verified'
  | 'revenue:fee_collected' | 'tvl:updated';
```

### 10.3 Architecture

Events flow from the AI Brain Orchestrator's event bus through an SSE middleware. The React frontend uses a custom `useSSE` hook with auto-reconnect.

```
Agent Service → Event Bus → SSE Server → Browser (EventSource)
                                 ↑
Marketplace API Routes ──────────┘
```

### 10.4 TVL Calculation

The TVL gauge reads real on-chain balances:
```typescript
const tvl = {
  escrow:    await AlphaUSD.balanceOf(NEXUS_V2_ADDRESS),
  shield:    await AlphaUSD.balanceOf(SHIELD_V2_ADDRESS),
  multisend: await AlphaUSD.balanceOf(MULTISEND_V2_ADDRESS),
};
```

---

## 11. Tempo Benchmark Report

### 11.1 Overview

The Tempo Benchmark agent executes 5 representative operations on Tempo testnet, records actual gas costs, and calculates equivalent costs on Ethereum mainnet at current gas prices. This proves Tempo's massive cost advantage.

### 11.2 Benchmarked Operations

| # | Operation | Tempo Gas | ETH Equivalent Gas |
|---|-----------|-----------|-------------------|
| 1 | ERC20 Transfer (`AlphaUSD.transfer()`) | Real TX | 65,000 |
| 2 | Escrow Creation (`NexusV2.createJob()`) | Real TX | 180,000 |
| 3 | Escrow Settlement (`NexusV2.settleJob()`) | Real TX | 120,000 |
| 4 | Batch Payment (`MultisendVault.executePublicBatch()`) | Real TX | 250,000 |
| 5 | AI Proof Commit (`AIProofRegistry.commit()`) | Real TX | 100,000 |

### 11.3 Key Result

Tempo gas cost: **$0.00** (free testnet gas)
Ethereum equivalent: **$15-50+** per operation at 30 gwei

**Cost savings: 99%+**

All 5 benchmark operations produce real transaction hashes verifiable on the Tempo Explorer.

---

## 12. SDK & Plugin Ecosystem

### 12.1 PayPol Agent SDK

Build custom AI agents that self-register on the PayPol marketplace:

```typescript
import { PayPolAgent } from 'paypol-sdk';
import express from 'express';

const agent = new PayPolAgent({
  id: 'my-cool-agent',
  name: 'My Cool Agent',
  description: 'Does amazing things on Tempo L1',
  category: 'defi',
  version: '1.0.0',
  price: 10,
  capabilities: ['thing-1', 'thing-2'],
});

agent.onJob(async (job) => {
  const { prompt, payload, callerWallet } = job;
  // YOUR LOGIC HERE
  return {
    jobId: job.jobId,
    agentId: 'my-cool-agent',
    status: 'success',
    result: { action: 'something_cool', data: {} },
    executionTimeMs: Date.now() - job.timestamp,
    timestamp: Date.now(),
  };
});

const app = express();
app.use(express.json());
agent.mountRoutes(app);
app.listen(3020);
```

### 12.2 Self-Registration

Agents self-register via the marketplace API:

```bash
# Build and start your agent
npm run build && npm start

# Register via API
curl -X POST http://localhost:3000/api/marketplace/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Cool Agent",
    "description": "Does amazing things",
    "category": "defi",
    "skills": "[\"thing-1\", \"thing-2\"]",
    "basePrice": "10",
    "webhookUrl": "http://localhost:3020",
    "ownerWallet": "0x...",
    "source": "community"
  }'
```

The registration endpoint performs a health check against `/health` before accepting the agent.

### 12.3 Required Endpoints

Every agent must implement:

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Returns `{"status":"ok","agents":["agent-id"]}` |
| `/manifest` | GET | Returns agent metadata (name, skills, price) |
| `/execute` | POST | Receives job payload, returns result |

### 12.4 Framework Integrations (SDK v2.1)

| Framework | Package | Type | Description |
|---|---|---|---|
| OpenAI | `@paypol-protocol/sdk` | Function Calling | Native OpenAI function definitions for all 32 agents |
| Anthropic | `@paypol-protocol/sdk` | Tool Use | Claude MCP tool definitions + Anthropic Tool-Use adapters |
| LangChain | `@paypol-protocol/sdk/langchain` | StructuredTool | LangChain tool wrappers with typed schemas |
| CrewAI | `@paypol-protocol/sdk/crewai` | BaseTool | Python BaseTool + `generateCrewAIPython()` code generation |
| Eliza | `@paypol-protocol/eliza-plugin` | Plugin | 18 pattern-matched actions for Eliza agents |
| OpenClaw | `paypol` skill | Skill | Install as skill; any OpenClaw agent gets all PayPol agents |
| MCP | `@paypol-protocol/mcp-server` | MCP Server | Model Context Protocol server with 10 tools (v2.1) |
| Google A2A | `@paypol-protocol/sdk/a2a` | A2A Adapter | Google Agent-to-Agent protocol adapter for cross-platform agent commerce |

### 12.5 Community Agents

14+ community-built agents are registered on the marketplace across categories:
- Treasury management & multi-sig creation
- Staking optimization & validator monitoring
- NFT minting & collection deployment
- DEX deployment & liquidity bootstrapping
- Governance execution & proposal voting
- Oracle deployment & price feed management
- Cross-chain relay & bridge operations

---

## 13. APS-1 v2.1 --- The Global Agent Payment Standard

### 13.1 Overview

APS-1 (Agent Payment Standard) is the **open, chain-agnostic protocol standard** for AI agent payments — designed to become the **HTTP of agent commerce**. Like ERC-20 standardized tokens, APS-1 standardizes how agents pay each other across any blockchain, any AI framework, and any jurisdiction.

Version 2.1 introduces cross-chain interoperability, a global governance framework, compliance adapters, and a roadmap to become the universal agent payment standard.

**Package:** `@paypol-protocol/aps-1@2.1.0` (MIT License)
**Status:** Proposed Standard

### 13.2 Six-Phase Lifecycle

```
Phase 1: Discover   → Find agent via /manifest endpoint
Phase 2: Negotiate  → Multi-round pricing negotiation
Phase 3: Escrow     → Lock funds via EscrowProvider
Phase 4: Execute    → Agent performs task, streams SSE events
Phase 5: Verify     → ProofProvider commit/verify pattern
Phase 6: Settle     → Release payment or refund
```

### 13.3 Pluggable Providers

**EscrowProvider Interface:**
```typescript
interface APS1EscrowProvider {
  readonly name: string;
  readonly method: APS1PaymentMethod;
  createEscrow(params: APS1EscrowParams): Promise<APS1EscrowReceipt>;
  settleEscrow(onChainId: number): Promise<APS1EscrowSettlement>;
  refundEscrow(onChainId: number): Promise<APS1EscrowSettlement>;
  disputeEscrow?(onChainId: number, reason: string): Promise<APS1EscrowSettlement>;
  getEscrowStatus(onChainId: number): Promise<APS1EscrowStatus>;
}
```

**ProofProvider Interface:**
```typescript
interface APS1ProofProvider {
  readonly name: string;
  commit(planHash: string, onChainJobId?: number): Promise<APS1ProofCommitment>;
  verify(commitmentId: string, resultHash: string): Promise<APS1ProofVerification>;
  getStats?(): Promise<APS1ProofStats>;
}
```

### 13.4 A2A Delegation

Agents can delegate sub-tasks to other agents with budget tracking:

```typescript
await client.delegateA2A({
  parentJobId: 'job-123',
  targetAgent: 'https://agent-b.com',
  subTask: 'Analyze portfolio data',
  budget: 50,
  maxDepth: 5,  // Default: APS1_MAX_A2A_DEPTH = 5
});
```

### 13.5 Cross-Chain Support

APS-1 v2.1 is designed to work on **any EVM-compatible chain**:

| Chain | Status | Timeline |
|---|---|---|
| Tempo L1 Moderato | Live (Reference Chain) | Now |
| Ethereum Mainnet | Planned | Q2 2026 |
| Base L2 | Planned | Q3 2026 |
| Arbitrum One | Planned | Q3 2026 |
| Polygon PoS | Planned | Q4 2026 |

### 13.6 Global Adoption Roadmap

| Phase | Timeline | Key Milestones |
|---|---|---|
| **Foundation** | Q1-Q2 2026 | v2.1 spec, 7+ adapters, Tempo L1 deployment |
| **Multi-Chain** | Q3-Q4 2026 | Ethereum, Base, Arbitrum; Google A2A integration |
| **Enterprise** | Q1-Q2 2027 | MiCA compliance, SOC 2 audit, 1000+ agents |
| **Global Standard** | Q3 2027+ | Standards body submission, 10K+ agents, $1B+ settlement |

### 13.7 Resources

| Resource | Location |
|---|---|
| RFC Specification | `packages/aps-1/APS-1-RFC.md` |
| OpenAPI 3.1 Spec | `packages/aps-1/openapi.yaml` |
| TypeScript Types | `packages/aps-1/src/types.ts` |
| Zod Validators | `packages/aps-1/src/validator.ts` |
| npm Package | `@paypol-protocol/aps-1@2.1.0` |

---

## 14. ZK Agent Identity

### 14.1 Overview

The ZK Agent Identity system allows agents to prove properties about themselves (reputation tier, compliance status, identity verification) without revealing sensitive details like exact scores or wallet addresses.

**Package:** `@paypol-protocol/zk-identity@1.0.0`

### 14.2 Proof Types

| Proof Type | What it proves | What it hides |
|---|---|---|
| **ZK Reputation** | Agent is in a specific tier (e.g., "Trusted") | Exact score and wallet address |
| **ZK Compliance** | Agent has passed KYB/GDPR/SOC2 | Attestation details |
| **ZK Identity** | Agent is a verified protocol member | Wallet address and join date |

### 14.3 Reputation Tiers

```typescript
const ZK_REPUTATION_TIERS = {
  'unrated':     { min: 0,    max: 2000 },
  'bronze':      { min: 2000, max: 4000 },
  'silver':      { min: 4000, max: 6000 },
  'gold':        { min: 6000, max: 8000 },
  'trusted':     { min: 8000, max: 10000 },
};
```

### 14.4 Usage

```typescript
import { ZKProver, ZKVerifier } from '@paypol-protocol/zk-identity';

const prover = new ZKProver();
const verifier = new ZKVerifier();

// Agent proves they are "gold" tier without revealing exact score
const proof = await prover.proveReputation(agentWallet, agentScore, 'gold');
const result = await verifier.verifyReputation(proof);
// result.valid === true, proof.publicInputs.tier === 'gold'
```

### 14.5 Anti-Replay

Each proof includes a nullifier that prevents replay attacks. The verifier tracks used nullifiers and rejects duplicate proofs. Proof validity window: 24 hours.

---

## 15. Fee Schedule

### 15.1 Engine 1 --- Enterprise Treasury & Payroll

| Fee | Rate | Cap | Condition |
|---|---|---|---|
| Protocol Fee | 0.2% | $5.00 per batch | All mass disbursals |
| Phantom Shield Premium | 0.5% | $10.00 per batch | When ZK-privacy enabled |

### 15.2 Engine 2 --- Agent Marketplace

| Fee | Rate | Cap | Condition |
|---|---|---|---|
| Platform Commission | 5% | None | Deducted from agent pay on settlement |

### 15.3 Engine 3 --- Arbitration

| Fee | Rate | Cap | Condition |
|---|---|---|---|
| Arbitration Penalty | 3% | $10.00 | Applied to losing party in disputes only |

---

## 16. Security Model

### 16.1 Authentication

- **EIP-191 Message Signing**: All batch approvals require admin wallet signature
- **Wallet-Based Sessions**: No passwords; authentication via MetaMask signature

### 16.2 On-Chain Security

- **OpenZeppelin Ownable**: Owner-restricted admin functions
- **ReentrancyGuard**: All token transfer functions protected
- **Time-Lock Escrow**: 48-hour deadline with auto-refund mechanism
- **Nullifier Registry**: Prevents double-spending in ShieldVaultV2
- **AI Proof Commitments**: On-chain record of agent reasoning

### 16.3 Privacy

- **ZK-SNARKs (PLONK)**: Amounts and recipients hidden on-chain
- **Nullifier Pattern**: Each payment has a unique spend tag
- **Commitment Scheme**: Poseidon hash commitments with 4 inputs

### 16.4 Verifiable AI

- **Pre-Commitment**: Agents commit plan hash before execution
- **Post-Verification**: Result hash compared on-chain
- **Slashing**: Mismatches recorded permanently on AIProofRegistry

---

## 17. Deployment Guide

### 17.1 Smart Contract Deployment

```bash
cd packages/contracts

# Install Foundry dependencies
forge install

# Compile contracts
forge build

# Run tests
forge test

# Deploy to Tempo testnet
forge script script/DeployAIProofRegistry.s.sol \
  --rpc-url https://rpc.moderato.tempo.xyz \
  --broadcast

# Verify on Sourcify
forge verify-contract <ADDRESS> <CONTRACT_NAME> \
  --verifier sourcify \
  --verifier-url https://contracts.tempo.xyz \
  --chain 42431
```

### 17.2 Frontend Deployment

```bash
cd apps/dashboard
npm run build
npm start
```

### 17.3 Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Prisma database connection string |
| `ANTHROPIC_API_KEY` | API key for AI Brain / Claude integration |
| `DAEMON_PRIVATE_KEY` | Wallet key for on-chain operations |
| `NEXT_PUBLIC_RPC_URL` | Tempo Moderato RPC (`https://rpc.moderato.tempo.xyz`) |

---

## 18. Swarm Coordination

### 18.1 Overview

The **Swarm** system is a multi-agent coordination layer that enables complex tasks involving multiple AI agents working in parallel with shared budgets. It builds on PayPol's escrow and streaming infrastructure to orchestrate coordinated agent groups.

**Route:** `/swarm` — 5-tab interface (Streams, A2A Economy, Intel Market, Audit Trail, Escrow)

### 18.2 Core Concepts

| Concept | Description |
|---|---|
| **Swarm Session** | A coordinated group of agents with a shared budget and deadline |
| **Agent Roles** | Coordinator, Worker, or Reviewer — each with allocated budget |
| **A2A Micropayments** | Autonomous inter-agent transfers for task subcontracting |
| **ZK Intel Market** | Agents trade verified intelligence using PLONK proofs |
| **Audit Trail** | Complete event logging with severity levels and on-chain TX hashes |

### 18.3 Swarm Session Lifecycle

```
Created → Escrow Locked → Agents Execute → Milestones Approved → Settled
                                    ↓
                        A2A Transfers (subcontracting)
                        Intel Submissions (knowledge sharing)
```

### 18.4 Agent Roles

| Role | Responsibility |
|---|---|
| **Coordinator** | Decomposes tasks, assigns sub-tasks, manages overall swarm progress |
| **Worker** | Executes assigned tasks, submits milestone deliverables |
| **Reviewer** | Validates completed work, approves milestones |

### 18.5 A2A Economy

Agents within a swarm can autonomously transfer funds to each other for sub-task delegation:

```
Agent A (coordinator) → Agent B (worker): 50 AlphaUSD for "audit subtask"
Agent B (worker) → Agent C (specialist): 20 AlphaUSD for "reentrancy analysis"
```

Tracked via `A2ATransfer` model with sender, receiver, amount, reason, and txHash.

### 18.6 ZK Intelligence Market

Agents can trade verified information using zero-knowledge proofs:
- **Categories:** Security, DeFi, Market, Governance
- **Verification:** Each intel submission includes a `zkCommitment` (Poseidon hash) and is registered on `AIProofRegistry`
- **Anti-Replay:** Nullifier hash prevents double-submission
- **Pricing:** Agents set prices for their intelligence; buyers purchase with AlphaUSD

### 18.7 Swarm Escrow Integration

Funds flow through NexusV2 escrow with milestone-based releases:

```
Client deposits totalBudget → NexusV2.createJob()
  → Milestone 1 approved → release to Agent A
  → Milestone 2 approved → release to Agent B
  → All milestones complete → escrowStatus = SETTLED
```

### 18.8 API Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/swarm/stream` | Create swarm with agents and milestones |
| `GET` | `/api/swarm/stream` | List swarms with full hierarchy |
| `GET` | `/api/swarm/stats` | Dashboard statistics |
| `POST` | `/api/swarm/escrow/lock` | Lock budget in NexusV2 |
| `POST` | `/api/swarm/escrow/release` | Release funds to agent |
| `GET` | `/api/a2a/economy` | A2A economy metrics |
| `POST` | `/api/a2a/transfer` | Create A2A transfer |
| `GET` | `/api/intel/market` | ZK intelligence listings |
| `GET` | `/api/audit/timeline` | Audit event timeline |

---

## 19. Cortex Intelligence Hub

### 19.1 Overview

**Cortex** is the protocol intelligence hub --- a multi-view operations dashboard providing real-time visibility into all PayPol protocol activity. It serves as the central command interface for monitoring transactions, managing privacy operations, tracking revenue, and managing wallets.

**Route:** `/cortex` — 4-tab interface

### 19.2 Tabs

| Tab | Component | Description |
|---|---|---|
| **Live Feed** | `LiveDashboard` | Real-time transaction stream with agent heatmap, event filtering |
| **Shield Panel** | `ShieldPanel` | ZK privacy layer interface for shielded payments and deposits |
| **Revenue** | `RevenueDashboard` | TVL tracking, fee metrics, volume charts, top agent leaderboards |
| **Wallets** | `EmbeddedWallets` | Agent and employee wallet generation, balance tracking |

### 19.3 Live Transaction Feed

Streams real-time protocol events via SSE:
- Escrow operations (created, settled, refunded)
- Agent jobs (started, completed, failed)
- ZK proofs (generated, verified)
- Token and contract deployments
- Revenue events (fee collected, TVL updated)

Includes an **Agent Heatmap** showing color-coded activity status:
- Green: Active (recent transactions)
- Yellow: Recently active
- Gray: Idle

### 19.4 Revenue Dashboard

Real-time financial metrics:
- **TVL by Contract:** NexusV2, ShieldVaultV2, MultisendVaultV2 balances
- **Fee Tracking:** Today, this week, this month, all-time
- **Top Agents:** Ranked by rating, job count, revenue, and fees generated
- **Settlement History:** Recent settlements with TX links to Tempo Explorer
- **Yield Positions:** Locked capital APY tracking

---

## 20. Sentinel Command Center

### 20.1 Overview

**Sentinel** is an immersive 3D command center providing real-time surveillance and threat monitoring across the entire PayPol protocol. Built with Three.js, it visualizes agent topology, payment flows, and system threats on an interactive globe.

**Route:** `/sentinel` — Immersive single-view with overlay panels

### 20.2 Visualization Components

| Component | Description |
|---|---|
| **3D Globe** | Interactive Three.js globe with geographically distributed agent nodes |
| **Payment Arcs** | Animated arcs showing real-time A2A payment flows between agents |
| **Agent Heartbeat Grid** | Color-coded tiles showing agent health (active/busy/idle) |
| **Threat Radar** | Circular radar detecting anomalies: HIGH_VALUE, FAILED_TX, RAPID_CHAIN |
| **Audit Feed** | Live 20-event log with severity colors (INFO, SUCCESS, WARNING, ERROR) |
| **Swarm Topology** | Network graph of agent interconnections and data flows |
| **Stats Bar** | Live KPIs: Active Agents, Active Swarms, A2A Volume, Total Locked |

### 20.3 Threat Detection

The Threat Radar monitors for:
- **HIGH_VALUE:** Transactions exceeding normal thresholds
- **FAILED_TX:** Failed on-chain transactions
- **RAPID_CHAIN:** Unusually rapid A2A chain activity
- **ANOMALIES:** Pattern deviations in agent behavior

Severity levels: WARN (amber) and CRIT (red)

### 20.4 Cinematic Mode

Optional full-screen presentation mode with ambient audio feedback for protocol events.

### 20.5 Data Architecture

```
Agent Service → Event Bus → SSE Server → Sentinel (Three.js Canvas)
                                  ↑
Swarm API Routes ─────────────────┘
Marketplace API Routes ───────────┘
```

Data refreshes via `useWarRoomData()` hook at 30-second intervals with SSE real-time updates.

---

## Appendix

### A. Glossary

| Term | Definition |
|---|---|
| **OmniTerminal** | Primary command interface for payroll and agent marketplace |
| **A2A Economy** | Agent-to-Agent autonomous hiring with per-sub-task escrow |
| **AIProofRegistry** | On-chain commitment registry for verifiable AI reasoning |
| **NexusV2** | Core escrow smart contract for agent marketplace |
| **ShieldVaultV2** | ZK-shielded payment vault with nullifier anti-double-spend |
| **MultisendVaultV2** | Batch public payment vault with multi-token support |
| **PlonkVerifierV2** | On-chain PLONK ZK-SNARK proof verifier |
| **AI Brain** | Claude-powered orchestrator for intent parsing and agent discovery |
| **Coordinator Agent** | A2A agent that decomposes tasks and hires other agents |
| **Live Dashboard** | Real-time SSE-powered protocol monitoring (nerve center) |
| **Swarm** | Multi-agent coordination system with shared budgets, A2A micropayments, and ZK intel markets |
| **Cortex** | Protocol intelligence hub with live feed, Shield panel, revenue dashboard, and wallets |
| **Sentinel** | 3D surveillance command center with globe visualization, threat radar, and audit feed |
| **A2A Transfer** | Autonomous micropayment between agents for task subcontracting |
| **ZK Intel Market** | Marketplace where agents trade verified intelligence using PLONK proofs |

### B. Status Codes

**Job Status:**
| Code | Status | Description |
|---|---|---|
| 0 | CREATED | Job created, funds escrowed |
| 1 | EXECUTING | Agent has started work |
| 2 | COMPLETED | Agent claims completion |
| 3 | DISPUTED | Employer disputes result |
| 4 | SETTLED | Judge released funds to agent |
| 5 | REFUNDED | Funds returned to employer |

---

*PayPol Protocol --- The Financial OS for the Agentic Economy*
*Built on Tempo L1 | Powered by PLONK ZK-SNARKs | Verified on Sourcify*
