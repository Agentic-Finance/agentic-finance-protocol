# APS-1: Agent Payment Standard

**Version:** 2.1
**Status:** Proposed Standard
**Authors:** PayPol Foundation
**Created:** 2026-02-28
**Updated:** 2026-03-03
**License:** MIT
**Standard Track:** Global Agent Payment Infrastructure

---

## Abstract

APS-1 (Agent Payment Standard) is an **open, chain-agnostic protocol** that defines how AI agents discover, negotiate, escrow, execute, verify, and settle payments across any blockchain, any framework, and any jurisdiction. It is the **HTTP of agent payments** — a universal transport layer for the machine economy.

APS-1 works with any AI agent runtime: OpenAI Function Calling, Anthropic Claude MCP, Google A2A, LangChain, CrewAI, Eliza, AutoGPT, Olas, or any HTTP-capable agent. It is designed to be the **single global standard** that eliminates fragmentation in agent-to-agent commerce.

APS-1 solves a fundamental problem in the emerging AI agent economy: **how does one AI agent safely pay another AI agent for work, without trusting it — regardless of which chain, framework, or country they operate in?**

The protocol provides:
1. **Discovery** — Standardized agent manifests for capability advertisement (chain-agnostic)
2. **Negotiation** — Optional multi-round price negotiation with multi-currency support
3. **Escrow** — Pluggable on-chain fund locking before execution (any EVM chain)
4. **Execution** — Standardized job envelopes and result formats (framework-agnostic)
5. **Verification** — AI proof commitment/verification for execution integrity
6. **Settlement** — Automatic or manual escrow release/refund with cross-chain bridging
7. **Compliance** — Pluggable regulatory adapters for jurisdictional requirements

---

## Motivation

### The Global Agent Payment Problem

By 2027, autonomous AI agents are projected to manage over $1 trillion in economic transactions annually. Yet today:

- **No universal payment standard exists** for agent-to-agent commerce
- **Every platform builds custom integrations** — OpenAI, Anthropic, Google, and dozens of startups each have incompatible payment mechanisms
- **Cross-chain payments are fragmented** — an agent on Ethereum cannot easily pay an agent on Solana, Tempo, or Base
- **No verifiable execution** — when an agent claims it completed work, there is no cryptographic proof
- **No portable reputation** — an agent's track record on one platform is invisible to others
- **No dispute resolution** — when agent work fails, there is no trustless arbitration mechanism

APS-1 addresses all of these problems with a single, composable protocol.

### Design Goals

AI agents need to:
- **Hire** other agents for specialized tasks across any framework or chain
- **Pay** for services with verifiable on-chain transactions in any currency
- **Trust** execution results through cryptographic proofs
- **Resolve disputes** through escrow arbitration with game-theoretic incentives
- **Build reputation** through portable, on-chain performance history
- **Comply** with local regulations without compromising agent autonomy

### Why a Global Standard?

Just as HTTP standardized web communication and ERC-20 standardized tokens, APS-1 standardizes agent payments. Without a universal standard:
- Agent ecosystems remain siloed and incompatible
- Developers must build N integrations instead of 1
- Trust cannot be verified across platforms
- The agent economy cannot scale beyond individual platforms

APS-1 is designed to be adopted by **any chain, any framework, any country** — creating a single, interoperable agent economy.

---

## Terminology

| Term | Definition |
|------|-----------|
| **Agent** | An AI system that implements the APS-1 protocol |
| **Client** | The entity hiring an agent (can be a human or another agent) |
| **Manifest** | JSON document describing an agent's capabilities, pricing, and endpoints |
| **Envelope** | Standardized job request sent to an agent's /execute endpoint |
| **Result** | Standardized response from an agent after execution |
| **Escrow** | On-chain fund lock that releases only on successful completion |
| **A2A** | Agent-to-Agent — when one agent hires another as a sub-task |
| **Proof** | Cryptographic commitment/verification of AI execution plan vs result |

---

## 1. Agent Manifest

Every APS-1 compliant agent MUST serve a manifest at `GET /manifest`.

### 1.1 Manifest Schema

```typescript
interface APS1Manifest {
  aps: '2.0';                          // Protocol version
  id: string;                          // Unique kebab-case ID (e.g. "contract-auditor")
  name: string;                        // Human-readable name
  description: string;                 // What the agent does (1-3 sentences)
  category: APS1Category;              // Agent category
  version: string;                     // Semantic version (e.g. "1.0.0")
  pricing: {
    basePrice: number;                 // Base price in USD
    currency: 'USD';
    negotiable: boolean;               // Whether price negotiation is supported
    minPrice?: number;                 // Minimum acceptable price
    maxPrice?: number;                 // Maximum price
  };
  capabilities: string[];              // List of capabilities
  paymentMethods: APS1PaymentMethod[]; // Accepted payment methods
  supportedTokens: APS1TokenConfig[];  // Accepted ERC20 tokens
  proofEnabled: boolean;               // Whether AI proof verification is used
  reputationScore?: number;            // 0-10000 composite score
  reputationTier?: string;             // newcomer|rising|trusted|elite|legend
  walletAddress: string;               // Agent's wallet (0x...)
  a2aEnabled?: boolean;                // Whether A2A sub-delegation is supported
  securityDepositTier?: string;        // none|bronze|silver|gold
  endpoints: {
    manifest: string;                  // GET — this manifest
    execute: string;                   // POST — execute a job
    negotiate?: string;                // POST — price negotiation
    status?: string;                   // GET — job status
    health?: string;                   // GET — health check
    a2aExecute?: string;               // POST — A2A sub-task
    events?: string;                   // GET — SSE event stream
  };
  metadata?: Record<string, unknown>;
}
```

### 1.2 Categories

```
security | escrow | payments | streams | analytics | deployment
privacy | verification | orchestration | payroll | admin | defi
compliance | automation
```

### 1.3 Payment Methods

| Method | Description | Contract |
|--------|------------|----------|
| `nexus-escrow` | Full escrow lifecycle with dispute resolution | NexusV2 |
| `stream-milestone` | Progressive milestone-based payments | StreamV1 |
| `direct-transfer` | Simple ERC20 transfer (no escrow protection) | ERC20 |

---

## 2. Negotiation (Optional)

Agents MAY support price negotiation via `POST /negotiate`.

### 2.1 Negotiation Flow

```
Client                          Agent
  |                               |
  |--- propose($5) ------------->|
  |<-- counter($8) --------------|
  |--- counter($6.50) --------->|
  |<-- accept($6.50) -----------|
  |                               |
  [Proceed to escrow at $6.50]
```

### 2.2 Negotiation Message

```typescript
interface APS1NegotiationMessage {
  type: 'propose' | 'counter' | 'accept' | 'reject';
  jobId: string;
  price: number;          // USD
  currency: 'USD';
  message?: string;       // Human-readable reasoning
  round?: number;         // Current round (1-indexed)
  maxRounds?: number;     // Maximum rounds before auto-reject
  timestamp: string;      // ISO 8601
}
```

### 2.3 Rules

- Agents MUST respond with `accept`, `counter`, or `reject`
- Maximum 10 rounds (configurable)
- If `maxRounds` is reached without `accept`, the negotiation FAILS

---

## 3. Escrow

Before execution, clients SHOULD lock funds in escrow using an **EscrowProvider**.

### 3.1 EscrowProvider Interface

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

### 3.2 Escrow Parameters

```typescript
interface APS1EscrowParams {
  method: APS1PaymentMethod;
  token: string;            // ERC20 address
  amount: string;           // Token smallest unit
  amountUSD: number;        // USD equivalent
  deadlineSeconds: number;  // 60 to 2,592,000 (30 days)
  workerWallet: string;     // Agent's wallet
  judgeWallet?: string;     // Arbiter for disputes
  milestones?: Array<{
    amount: string;
    deliverable: string;
  }>;
}
```

### 3.3 Escrow Lifecycle (NexusV2)

```
Created → Executing → Completed → Settled
                  ↘ Disputed → Arbitration → Settled/Refunded
                  ↘ Timeout → Refunded
```

### 3.4 Platform Fee

- Default: 5% (500 basis points) deducted from settlement
- Security deposit holders receive fee discounts:
  - Bronze ($50 deposit): -0.5% → 4.5%
  - Silver ($200 deposit): -1.5% → 3.5%
  - Gold ($1,000 deposit): -3.0% → 2.0%

---

## 4. Execution

### 4.1 Execution Envelope

Clients POST an envelope to the agent's `/execute` endpoint:

```typescript
interface APS1ExecutionEnvelope {
  jobId: string;                       // Unique job ID
  agentId: string;                     // Target agent
  prompt: string;                      // Natural language task
  payload?: Record<string, unknown>;   // Structured data
  callerWallet: string;                // Client's wallet (0x...)
  escrow?: {
    contractAddress: string;           // Escrow contract
    onChainId: number;                 // On-chain job/stream ID
    txHash: string;                    // Escrow creation TX
    method: APS1PaymentMethod;
  };
  proof?: {
    planHash: string;                  // keccak256 of planned approach
    commitmentId: string;              // AIProofRegistry commitment ID
    commitTxHash: string;              // Commit TX hash
  };
  a2a?: {
    parentJobId: string;               // Parent job (if sub-task)
    parentAgentId: string;             // Parent agent
    depth: number;                     // Recursion depth (max 5)
    budgetAllocation: number;          // Budget for this sub-task
    a2aChainId: string;                // Chain grouping related jobs
  };
  timestamp: string;                   // ISO 8601
}
```

### 4.2 Execution Result

```typescript
interface APS1Result {
  jobId: string;
  agentId: string;
  status: 'success' | 'error' | 'pending';
  result?: unknown;                    // Agent-specific result data
  error?: string;
  errorCode?: string;                  // Structured error (APS1_XXXX)
  onChain?: {
    executed: boolean;                 // Were on-chain TXs made?
    transactions: Array<{
      hash: string;
      blockNumber: number;
      gasUsed: string;
      explorerUrl: string;
      description?: string;
    }>;
    network: string;
    chainId: number;
  };
  proof?: {
    resultHash: string;                // keccak256 of actual result
    verifyTxHash: string;              // Verify TX hash
    matched: boolean;                  // Plan hash == result hash?
  };
  a2a?: {
    childJobs: Array<{
      jobId: string;
      agentId: string;
      status: string;
      executionTimeMs: number;
    }>;
    a2aChainId: string;
  };
  executionTimeMs: number;
  timestamp: string;
}
```

---

## 5. AI Proof Verification

Agents with `proofEnabled: true` use a two-phase commit/verify pattern:

### 5.1 ProofProvider Interface

```typescript
interface APS1ProofProvider {
  readonly name: string;
  commit(planHash: string, onChainJobId?: number): Promise<APS1ProofCommitment>;
  verify(commitmentId: string, resultHash: string): Promise<APS1ProofVerification>;
  getStats?(): Promise<APS1ProofStats>;
}
```

### 5.2 Flow

```
1. BEFORE execution:
   planHash = keccak256(agent's planned approach)
   commitmentId = AIProofRegistry.commit(planHash, nexusJobId)

2. Agent EXECUTES the task

3. AFTER execution:
   resultHash = keccak256(actual execution result)
   matched = AIProofRegistry.verify(commitmentId, resultHash)

4. If matched: Agent followed its stated plan → TRUST ↑
   If mismatched: Agent deviated → TRUST ↓, potential slashing
```

### 5.3 Slashing

- Mismatched proofs can be slashed by the protocol owner
- Slashing deducts from the agent's SecurityDepositVault
- Slashed funds go to an insurance pool for affected users
- Reputation score penalized by -200 per slash

---

## 6. Agent-to-Agent (A2A) Delegation

Agents can hire other agents for sub-tasks:

### 6.1 Depth Limit

Maximum recursion depth: **5 levels** to prevent runaway delegation.

### 6.2 A2A Flow

```
Client → Agent A (depth=0)
           → Agent B (depth=1)
              → Agent C (depth=2)
```

### 6.3 Budget Tracking

Each level allocates a sub-budget. The total spent across all levels
MUST NOT exceed the original escrow amount.

### 6.4 Coordinator Pattern

For complex multi-agent tasks, use the Coordinator pattern:

```typescript
interface APS1CoordinatorPlan {
  a2aChainId: string;
  steps: Array<{
    stepIndex: number;
    agentId: string;
    prompt: string;
    budgetAllocation: number;
    dependsOn: number[];         // Steps that must complete first
  }>;
  totalBudget: number;
  reasoning: string;
}
```

---

## 7. Reputation

### 7.1 Composite Score (0-10000)

| Component | Weight | Source |
|-----------|--------|--------|
| On-chain ratings | 30% | NexusV2 worker ratings (1-5 stars) |
| Off-chain reviews | 25% | Marketplace review system |
| Completion rate | 25% | completed / (completed + failed) |
| AI proof reliability | 20% | matched / verified - slashes |

### 7.2 Tiers

| Tier | Score Range | Meaning |
|------|------------|---------|
| Newcomer | 0 - 3,000 | New agent, limited history |
| Rising | 3,001 - 6,000 | Building track record |
| Trusted | 6,001 - 8,000 | Reliable agent |
| Elite | 8,001 - 9,500 | Top-tier agent |
| Legend | 9,501 - 10,000 | Exceptional performance |

---

## 8. Error Codes

All APS-1 errors use structured codes:

| Code | Category | Description |
|------|----------|-------------|
| APS1_1001 | Discovery | Agent not found |
| APS1_1002 | Discovery | Agent unavailable |
| APS1_1003 | Discovery | Manifest invalid |
| APS1_2001 | Negotiation | Negotiation rejected |
| APS1_2002 | Negotiation | Price below minimum |
| APS1_2003 | Negotiation | Price above maximum |
| APS1_2004 | Negotiation | Max rounds exceeded |
| APS1_3001 | Escrow | Create failed |
| APS1_3002 | Escrow | Insufficient balance |
| APS1_3003 | Escrow | Approval failed |
| APS1_3004 | Escrow | Settle failed |
| APS1_3005 | Escrow | Refund failed |
| APS1_3006 | Escrow | Timeout |
| APS1_3007 | Escrow | Already settled |
| APS1_4001 | Execution | Failed |
| APS1_4002 | Execution | Timeout |
| APS1_4003 | Execution | Invalid envelope |
| APS1_4004 | Execution | Handler missing |
| APS1_5001 | Proof | Commit failed |
| APS1_5002 | Proof | Verify failed |
| APS1_5003 | Proof | Mismatch |
| APS1_6001 | A2A | Max depth exceeded |
| APS1_6002 | A2A | Budget exceeded |
| APS1_6003 | A2A | Child failed |
| APS1_9001 | General | Internal error |
| APS1_9002 | General | Network error |
| APS1_9003 | General | Validation error |

---

## 9. Lifecycle Events

APS-1 defines lifecycle events for observability:

```typescript
interface APS1Event {
  type: APS1EventType;
  jobId: string;
  agentId: string;
  data: Record<string, unknown>;
  timestamp: string;
}
```

### Event Types

| Phase | Events |
|-------|--------|
| Discovery | `agent.discovered` |
| Negotiation | `negotiation.proposed`, `negotiation.countered`, `negotiation.accepted`, `negotiation.rejected` |
| Escrow | `escrow.creating`, `escrow.created`, `escrow.failed` |
| Proof | `proof.committing`, `proof.committed`, `proof.verifying`, `proof.verified`, `proof.mismatched` |
| Execution | `execution.started`, `execution.completed`, `execution.failed` |
| Settlement | `escrow.settling`, `escrow.settled`, `escrow.refunded`, `escrow.disputed` |
| A2A | `a2a.child_started`, `a2a.child_completed`, `a2a.child_failed` |

Events can be streamed via SSE at `GET /events`.

---

## 10. HTTP Headers

APS-1 clients and agents SHOULD include:

| Header | Value | Description |
|--------|-------|-------------|
| `X-APS-Version` | `2.0` | Protocol version |
| `Content-Type` | `application/json` | All payloads are JSON |

---

## 11. Reference Implementation

The reference implementation is published as `@paypol-protocol/aps-1` on npm:

```bash
npm install @paypol-protocol/aps-1
```

It includes:
- **APS1Agent** — Express-based agent server
- **APS1Client** — Client with full lifecycle support
- **Validators** — Zod schemas for all protocol messages
- **Types** — Full TypeScript type definitions

---

## 12. Smart Contracts (Tempo L1)

The reference deployment uses these contracts on Tempo L1 Moderato (Chain 42431):

| Contract | Address | Purpose |
|----------|---------|---------|
| NexusV2 | `0x6A467Cd4156093bB528e448C04366586a1052Fab` | A2A Escrow |
| StreamV1 | `0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C` | Milestone Escrow |
| AIProofRegistry | `0x8fDB8E871c9eaF2955009566F41490Bbb128a014` | Proof Verification |
| ReputationRegistry | `0x9332c1B2bb94C96DA2D729423f345c76dB3494D0` | Reputation Scoring |
| SecurityDepositVault | `0x8C1d4da4034FFEB5E3809aa017785cB70B081A80` | Agent Staking |
| ShieldVaultV2 | `0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055` | ZK Payments |
| MultisendV2 | `0x25f4d3f12C579002681a52821F3a6251c46D4575` | Batch Payments |

---

## 13. Security Considerations

1. **Escrow first, execute second** — Never execute without escrow for paid services
2. **Deadline enforcement** — All escrows have timeouts; funds auto-refund if agent fails to deliver
3. **AI proof verification** — Commit plan hash before execution; verify result hash after
4. **Depth limits** — A2A delegation capped at 5 levels to prevent infinite recursion
5. **Budget tracking** — Sub-tasks must stay within allocated budget
6. **Slashing** — Misbehaving agents lose security deposits
7. **Nullifier tracking** — ZK shielded payments use nullifiers to prevent double-spending

---

## 14. Compatibility

APS-1 is framework-agnostic. Integration guides available for:

| Framework | Integration | Status |
|-----------|------------|--------|
| OpenAI Function Calling | `@paypol-protocol/sdk` OpenAI adapter | Live |
| Anthropic Claude MCP | `@paypol-protocol/mcp` MCP server | Live |
| Google A2A Protocol | APS-1 payment layer for A2A communication | Planned |
| LangChain | `@paypol-protocol/sdk` LangChain adapter | Live |
| CrewAI | `@paypol-protocol/sdk` CrewAI adapter | Live |
| Eliza | `@paypol-protocol/eliza` Eliza plugin | Live |
| AutoGPT | APS-1 plugin for AutoGPT agents | Planned |
| Olas/Autonolas | APS-1 service for Olas autonomous agents | Planned |
| HTTP | Direct REST API (this spec) | Live |

---

## 15. Cross-Chain Interoperability

### 15.1 Chain-Agnostic Design

APS-1 is designed to work on **any EVM-compatible chain**. The protocol separates the payment layer from the transport layer:

```
┌─────────────────────────────────────────────────┐
│           APS-1 Protocol Layer                  │
│  (Discovery, Negotiation, Execution, Verify)    │
├─────────────────────────────────────────────────┤
│           Chain Adapter Layer                   │
│  ┌─────────┬──────────┬─────────┬────────────┐  │
│  │ Tempo   │ Ethereum │ Base    │ Arbitrum   │  │
│  │ L1      │ Mainnet  │ L2     │ L2         │  │
│  └─────────┴──────────┴─────────┴────────────┘  │
├─────────────────────────────────────────────────┤
│           Token Bridge Layer                    │
│  (Cross-chain escrow settlement via bridges)    │
└─────────────────────────────────────────────────┘
```

### 15.2 ChainConfig Interface

```typescript
interface APS1ChainConfig {
  chainId: number;
  name: string;
  rpc: string;
  explorer: string;
  contracts: {
    escrow: string;          // NexusV2-compatible escrow
    proofRegistry: string;   // AIProofRegistry-compatible
    reputation: string;      // ReputationRegistry-compatible
    token: string;           // Primary stablecoin
  };
  nativeGas: boolean;        // Whether chain requires gas token
  bridgeTo?: string[];       // Supported bridge destinations
}
```

### 15.3 Supported Chains

| Chain | Chain ID | Status | Escrow Contract |
|-------|----------|--------|-----------------|
| **Tempo L1 Moderato** | 42431 | Live (Reference) | `0x6A467Cd...` |
| Ethereum Mainnet | 1 | Planned Q2 2026 | — |
| Base | 8453 | Planned Q3 2026 | — |
| Arbitrum One | 42161 | Planned Q3 2026 | — |
| Polygon PoS | 137 | Planned Q4 2026 | — |
| Solana (via Neon EVM) | — | Research | — |

### 15.4 Cross-Chain Settlement

When client and agent operate on different chains:

```
1. Client locks escrow on Chain A
2. Agent executes task
3. On settlement, bridge transfers payment to agent's Chain B
4. Proof verification can happen on either chain
```

Cross-chain escrow uses a **lock-and-mint** pattern with verified bridge messages.

---

## 16. Global Governance Framework

### 16.1 Standards Body: APS Working Group

APS-1 is governed by the **APS Working Group**, an open consortium of:
- AI agent framework developers (OpenAI, Anthropic, Google, Meta)
- Blockchain infrastructure providers (Tempo, Ethereum Foundation, L2 operators)
- Enterprise adopters (companies building agent-powered products)
- Academic researchers (cryptography, game theory, AI safety)

### 16.2 Proposal Process (APS Improvement Proposals)

```
AIP-0001: Initial APS-1 Specification (this document)
AIP-XXXX: [Title]

Lifecycle:
  Draft → Review → Last Call → Final → Active

Submission:
  1. Fork the APS-1 repository
  2. Create AIP-XXXX.md following the template
  3. Submit Pull Request with [AIP] prefix
  4. Community review period: 30 days
  5. Working Group vote: 2/3 majority required
```

### 16.3 Versioning Strategy

APS-1 follows **semantic versioning** with backward compatibility guarantees:

| Version | Scope | Compatibility |
|---------|-------|--------------|
| 2.x.x (current) | Feature additions | Fully backward compatible with 2.0 |
| 3.0.0 (future) | Breaking changes | Migration guide provided |
| Extensions | Optional modules | Opt-in, never required |

### 16.4 Extension Registry

Optional protocol extensions that chains or frameworks can adopt:

| Extension | ID | Description | Status |
|-----------|----|-------------|--------|
| ZK-Identity | `aps1-ext-zk-id` | Zero-knowledge reputation proofs | Active |
| Cross-Chain | `aps1-ext-xchain` | Multi-chain escrow settlement | Draft |
| Streaming | `aps1-ext-stream` | Milestone-based payment streaming | Active |
| Compliance | `aps1-ext-compliance` | Jurisdictional regulatory adapters | Draft |
| Micro-Payments | `aps1-ext-micro` | State channel micro-transactions | Research |
| Insurance | `aps1-ext-insurance` | Escrow insurance pool for failures | Research |

---

## 17. Compliance & Regulatory Framework

### 17.1 Jurisdictional Adapters

APS-1 supports pluggable compliance adapters for different regulatory environments:

```typescript
interface APS1ComplianceAdapter {
  readonly jurisdiction: string;    // ISO 3166-1 alpha-2 (e.g., "US", "EU", "SG")
  readonly requirements: string[];  // ["KYB", "AML", "GDPR", "MiCA"]

  validateAgent(manifest: APS1Manifest): Promise<ComplianceResult>;
  validateTransaction(escrow: APS1EscrowParams): Promise<ComplianceResult>;
  generateReport(period: DateRange): Promise<ComplianceReport>;
}
```

### 17.2 Supported Regulatory Frameworks

| Regulation | Jurisdiction | APS-1 Support |
|-----------|-------------|---------------|
| MiCA (Markets in Crypto-Assets) | EU | Planned — compliance adapter |
| Travel Rule | Global (FATF) | Planned — transaction metadata |
| GDPR | EU | Active — ZK-Identity proofs |
| SOC 2 Type II | Global | Planned — audit trail via AIProofRegistry |
| MAS Guidelines | Singapore | Research |
| SEC Digital Assets | US | Research |

### 17.3 Privacy-Preserving Compliance

APS-1's ZK-Identity system enables **compliance without data exposure**:

```
Agent proves: "I am KYB-verified in the EU"
Without revealing: Company name, registration number, or wallet address

Agent proves: "My reputation is Gold tier"
Without revealing: Exact score, transaction history, or wallet balance
```

This approach satisfies regulatory requirements while preserving the privacy that autonomous agents need.

---

## 18. Global Adoption Roadmap

### Phase 1: Foundation (Q1-Q2 2026) — CURRENT

- [x] APS-1 v2.0 specification published
- [x] Reference implementation on npm (`@paypol-protocol/aps-1`)
- [x] OpenAPI 3.1 specification
- [x] 6 framework adapters (OpenAI, Claude, LangChain, CrewAI, Eliza, OpenClaw)
- [x] Live deployment on Tempo L1 with 32+ agents
- [x] ZK-Identity proof system (MockProver)
- [x] Formal RFC document
- [ ] APS Working Group formation
- [ ] Community feedback period (30 days)

### Phase 2: Multi-Chain Expansion (Q3-Q4 2026)

- [ ] Deploy APS-1 contracts on Ethereum mainnet
- [ ] Deploy on Base L2 and Arbitrum One
- [ ] Cross-chain escrow bridge implementation
- [ ] Google A2A protocol integration (APS-1 as payment layer)
- [ ] AutoGPT and Olas adapter implementations
- [ ] Production ZK-Identity circuits (Circom 2.x → PlonkVerifierV2)
- [ ] First 100 third-party agents registered globally
- [ ] APS-1 v2.1 release with cross-chain support

### Phase 3: Enterprise Adoption (Q1-Q2 2027)

- [ ] MiCA compliance adapter for EU market
- [ ] SOC 2 audit certification for PayPol infrastructure
- [ ] Enterprise SDK with SLA guarantees
- [ ] Fiat settlement integration (USD, EUR, SGD)
- [ ] Agent Insurance Pool launch
- [ ] 1,000+ registered agents across 10+ chains
- [ ] Partnership with major AI framework providers

### Phase 4: Global Standard (Q3 2027+)

- [ ] Submit APS-1 to relevant standards bodies (W3C, IEEE, or IETF)
- [ ] Multi-language SDK support (Python, Rust, Go, Java)
- [ ] State channel micro-payments for high-frequency agent interactions
- [ ] Recursive ZK proofs for batch verification
- [ ] Formal verification of core protocol contracts (Certora/Halmos)
- [ ] Cross-chain reputation aggregation
- [ ] 10,000+ agents, 100+ chains, $1B+ annual settlement volume

### Success Metrics

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|
| Registered Agents | 50+ | 500+ | 5,000+ | 50,000+ |
| Supported Chains | 1 | 4 | 10 | 100+ |
| Framework Adapters | 6 | 10 | 15 | 25+ |
| Monthly Settlement Volume | $100K | $10M | $100M | $1B+ |
| Countries with Compliance | — | 2 | 10 | 50+ |

---

## 19. Ecosystem & Partnerships

### 19.1 Framework Integration Strategy

APS-1 aims to be the default payment layer for every major AI agent framework:

| Framework | Users | Integration Approach | Priority |
|-----------|-------|---------------------|----------|
| OpenAI (GPT Actions) | 100M+ | Function calling adapter | P0 |
| Anthropic (Claude MCP) | 10M+ | MCP tool server | P0 (Live) |
| Google A2A | Growing | Payment extension for A2A protocol | P0 |
| LangChain/LangGraph | 1M+ | StructuredTool adapter | P1 (Live) |
| CrewAI | 500K+ | BaseTool adapter | P1 (Live) |
| AutoGPT | 400K+ | Plugin architecture | P1 |
| Eliza (ai16z) | 200K+ | Plugin with 18 actions | P1 (Live) |
| Olas/Autonolas | 100K+ | Service integration | P2 |

### 19.2 Chain Partnership Strategy

| Chain | TVL | Agent Activity | Integration Priority |
|-------|-----|---------------|---------------------|
| Tempo L1 | Reference | High | Live (Reference Chain) |
| Ethereum | $50B+ | Growing | P0 — credibility anchor |
| Base | $10B+ | High (Coinbase agents) | P0 — consumer agents |
| Arbitrum | $15B+ | Moderate | P1 — DeFi agents |
| Polygon | $1B+ | Moderate | P2 — enterprise agents |

### 19.3 How to Adopt APS-1

For **agent developers**:
```bash
npm install @paypol-protocol/aps-1
# Implement APS1Agent → instant compatibility with the global agent economy
```

For **chain operators**:
```bash
# Deploy APS-1 reference contracts on your chain
forge script DeployAPS1Suite.s.sol --rpc-url YOUR_RPC --broadcast
# Register chain in the APS-1 Chain Registry
```

For **framework maintainers**:
```bash
# Build an adapter using the APS-1 SDK types
# Submit to the APS-1 adapter registry for community discovery
```

---

## 20. Changelog

### v2.1 (2026-03-03)
- Added Cross-Chain Interoperability specification (Section 15)
- Added Global Governance Framework with APS Improvement Proposals (Section 16)
- Added Compliance & Regulatory Framework with jurisdictional adapters (Section 17)
- Added Global Adoption Roadmap with 4 phases through 2027+ (Section 18)
- Added Ecosystem & Partnership strategy (Section 19)
- Added Google A2A Protocol integration plan
- Added `APS1ChainConfig` interface for multi-chain deployment
- Added `APS1ComplianceAdapter` interface for regulatory compliance
- Added Extension Registry for optional protocol modules
- Added multi-currency support in Negotiation phase
- Updated status from "Draft" to "Proposed Standard"
- Updated protocol version to 2.1

### v2.0 (2026-02-28)
- Added `APS1EscrowProvider` interface for pluggable escrow backends
- Added `APS1ProofProvider` interface for pluggable proof verification
- Added A2A (Agent-to-Agent) types and endpoints
- Added `APS1ErrorCode` enum with structured error codes
- Added `APS1Event` lifecycle events with SSE streaming
- Added SecurityDeposit types and tier system
- Added `APS1ProtocolConfig` for customizable deployments
- Added auto-negotiation with multi-round support
- Added reputation tier system
- Updated manifest to include `a2aEnabled`, `securityDepositTier`, `reputationTier`
- Updated envelope to include `a2a` context
- Updated result to include `a2a` child jobs and `errorCode`

### v1.0 (2025-12-01)
- Initial specification
- Core types: Manifest, Envelope, Result, Settlement
- Negotiation protocol
- Escrow parameters
- Zod validation schemas
- Reference Agent and Client implementations

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

## Contributing

APS-1 is an **open global standard**. Contributions welcome at:
https://github.com/PayPol-Foundation/aps-1

### How to Contribute

- **Protocol improvements**: Submit APS Improvement Proposals (AIPs) via Pull Request
- **Framework adapters**: Build adapters for new AI frameworks
- **Chain deployments**: Deploy APS-1 contracts on new chains
- **Compliance adapters**: Build regulatory adapters for new jurisdictions
- **Translations**: Translate the specification into new languages
- **Security audits**: Review and audit the protocol specification

Submit proposals as GitHub issues with the `[AIP]` prefix.
