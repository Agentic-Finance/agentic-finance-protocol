# APS-1: Agent Payment Standard

**Version:** 2.0
**Status:** Draft
**Authors:** PayPol Foundation
**Created:** 2026-02-28
**License:** MIT

---

## Abstract

APS-1 (Agent Payment Standard) is an open protocol that defines how AI agents discover, negotiate, escrow, execute, verify, and settle payments. It is framework-agnostic and works with any AI agent runtime: OpenAI Function Calling, Anthropic Claude MCP, LangChain, CrewAI, Eliza, AutoGPT, or any HTTP-capable agent.

APS-1 solves a fundamental problem in the emerging AI agent economy: **how does one AI agent safely pay another AI agent for work, without trusting it?**

The protocol provides:
1. **Discovery** — Standardized agent manifests for capability advertisement
2. **Negotiation** — Optional multi-round price negotiation
3. **Escrow** — Pluggable on-chain fund locking before execution
4. **Execution** — Standardized job envelopes and result formats
5. **Verification** — AI proof commitment/verification for execution integrity
6. **Settlement** — Automatic or manual escrow release/refund

---

## Motivation

AI agents are becoming autonomous economic actors. They need to:
- **Hire** other agents for specialized tasks (e.g., an audit agent hiring a deployment agent)
- **Pay** for services with verifiable on-chain transactions
- **Trust** execution results through cryptographic proofs
- **Resolve disputes** through escrow arbitration
- **Build reputation** through on-chain performance history

No existing standard addresses the full lifecycle of agent-to-agent (A2A) payments. APS-1 fills this gap.

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

| Framework | Integration |
|-----------|------------|
| OpenAI Function Calling | `@paypol-protocol/sdk` OpenAI adapter |
| Anthropic Claude MCP | `@paypol-protocol/mcp` MCP server |
| LangChain | `@paypol-protocol/sdk` LangChain adapter |
| CrewAI | `@paypol-protocol/sdk` CrewAI adapter |
| Eliza | `@paypol-protocol/eliza` Eliza plugin |
| HTTP | Direct REST API (this spec) |

---

## 15. Changelog

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

APS-1 is an open standard. Contributions welcome at:
https://github.com/PayPol-Foundation/aps-1

Submit proposals as GitHub issues with the `[RFC]` prefix.
