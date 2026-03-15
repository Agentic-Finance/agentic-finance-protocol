# Agentic Finance: A Deterministic Financial Substrate for Autonomous Agent Economies

**Technical Research Paper v4.0**
**Agentic Finance Research Team · Tempo Network**
**March 2026**

---

## Abstract

We present Agentic Finance, a deterministic financial substrate purpose-built for autonomous AI agent economies. Deployed on Tempo Moderato L1 (Chain 42431), Agentic Finance introduces seven foundational primitives that collectively address the structural gaps in existing payment infrastructure when applied to machine-to-machine commerce: (1) trustless escrow via NexusV2 smart contracts with automated dispute resolution and game-theoretic incentive alignment, (2) ZK-SNARK privacy through PLONK proofs with Circom V2 circuits and Poseidon hashing on BN254, (3) ERC-5564 stealth addresses for unlinkable payments with ECDH key derivation and view tag scanning, (4) verifiable AI execution via on-chain commit/verify proofs with model fingerprinting and integrity scoring, (5) Model Context Protocol (MCP) server exposing 10 JSON-RPC 2.0 payment tools for universal AI model interoperability, (6) x402 HTTP-native micropayments with EIP-191 signature verification and nonce-based replay protection, and (7) PayFi credit — an AI-native lending system with credit scoring (0–850), 5-tier risk stratification, and auto-repayment from job settlements. The system is formalized as APS-1 v2.1, a 6-phase lifecycle standard for agent payments. With 9 verified smart contracts, 32+ production agents, and 7 protocol standards, Agentic Finance demonstrates that autonomous agent economies require purpose-built financial infrastructure fundamentally different from human payment rails.

---

## 1. Introduction

### 1.1 The Agentic Economy Thesis

The emergence of capable foundation models — GPT-4, Claude, Gemini, and their successors — has catalyzed a structural shift from tool-augmented AI to fully autonomous agent systems. These agents increasingly require the ability to transact: hiring other agents for sub-tasks, paying for compute resources, settling service agreements, and borrowing against their track record — all without human intermediation.

We observe that the current payment infrastructure was designed around human cognition and regulatory constraints: form fields, card numbers, bank approvals, manual dispute resolution. AI agents operate on fundamentally different timescales (milliseconds), trust models (cryptographic verification), and economic patterns (micropayments, pay-per-inference). This mismatch creates five structural gaps.

### 1.2 Structural Gaps

We identify five structural gaps in existing payment infrastructure that prevent the emergence of autonomous agent economies:

**Gap 1: No Trustless Settlement.** Agents cannot pay each other without trusting a centralized intermediary. Traditional payment processors (Stripe, PayPal) require human accounts, KYC verification, and custodial control over funds. Cryptocurrency addresses alone do not solve this — there is no mechanism to conditionally release payment upon verified task completion.

**Gap 2: No Execution Verification.** No existing system provides a mechanism to cryptographically prove that an AI agent performed the work it claimed. An agent can submit fabricated results and collect payment. Without verifiable execution proofs, the client-agent relationship degrades to trust-based reputation, which is insufficient for high-value autonomous transactions.

**Gap 3: No Privacy.** Every on-chain transaction reveals wallet balances, counterparty relationships, and transaction volumes. For agent economies where competitive intelligence is commercially valuable, this transparency is a liability. Agents working for competing principals leak strategic information through their payment patterns.

**Gap 4: No Credit.** Agents cannot borrow against their on-chain performance history. A well-established agent with hundreds of successful jobs and a perfect track record has no way to access working capital. This constrains agent growth and prevents capital-efficient economic participation.

**Gap 5: No Universal Protocol.** Each AI platform builds proprietary payment flows. OpenAI, Anthropic, Google, and Meta each require custom integration. There is no HTTP-like universal standard for agent payments that works across all frameworks and models.

### 1.3 Contributions

Agentic Finance addresses all five gaps through an integrated protocol stack deployed on Tempo Moderato L1:

| Gap | Solution | Implementation |
|-----|----------|----------------|
| Trustless settlement | Smart contract escrow | NexusV2, StreamV1, MultisendV2 |
| Execution verification | On-chain proofs | AIProofRegistry + model fingerprinting |
| Privacy | Zero-knowledge proofs | PLONK + Poseidon + ERC-5564 stealth addresses |
| Credit | AI-native lending | PayFi credit scoring (0–850) + 5 risk tiers |
| Universal protocol | Open standards | MCP Server, x402, APS-1, Google A2A, DID |

---

## 2. System Architecture

### 2.1 Layer Model

Agentic Finance employs a five-layer architecture that separates concerns and enables independent evolution of each layer:

```
┌──────────────────────────────────────────────────────────────┐
│  L5: Client Layer     Dashboard · Terminal · Marketplace UI   │
├──────────────────────────────────────────────────────────────┤
│  L4: Protocol Layer   MCP · x402 · Stealth · VAI · PayFi     │
├──────────────────────────────────────────────────────────────┤
│  L3: API Layer        REST · JSON-RPC 2.0 · A2A · DID · CORS │
├──────────────────────────────────────────────────────────────┤
│  L2: Engine Layer     Daemon · ZK Prover · Poseidon · Cron    │
├──────────────────────────────────────────────────────────────┤
│  L1: Blockchain       NexusV2 · ShieldVaultV2 · AIProofReg.  │
│                       PlonkVerifierV2 · StreamV1 · MultisendV2│
└──────────────────────────────────────────────────────────────┘
                  Tempo Moderato L1 (Chain 42431)
```

**L1 (Blockchain):** Nine verified smart contracts on Tempo Moderato handle all financial state transitions. No off-chain state is authoritative for payment outcomes.

**L2 (Engine):** The daemon process manages Poseidon hash singleton caching (avoiding re-initialization costs), parallel ZK proof generation, wallet management with private key fallback chains, and periodic reputation sync to the on-chain ReputationRegistry.

**L3 (API):** REST and JSON-RPC 2.0 endpoints expose all protocol functionality. CORS-enabled for cross-origin access. Google A2A compatibility at `/.well-known/agent-card.json`.

**L4 (Protocol):** Higher-order protocols built on top of the API layer — MCP for model-native tool use, x402 for HTTP micropayments, stealth addresses for privacy, verifiable AI for accountability, PayFi for credit.

**L5 (Client):** Dashboard UI, OmniTerminal for direct protocol interaction, agent marketplace for discovery and hiring.

### 2.2 Smart Contract Inventory

| Contract | Address | LOC | Purpose |
|----------|---------|-----|---------|
| Agentic FinanceNexusV2 | `0x6A46...Fab` | ~400 | A2A escrow with dispute resolution |
| Agentic FinanceStreamV1 | `0x4fE3...36C` | ~200 | Milestone-based streaming payments |
| AIProofRegistry | `0x8fDB...014` | ~250 | On-chain AI decision proof commitments |
| PlonkVerifierV2 | `0x9FB9...50B` | ~150 | ZK-SNARK PLONK proof verification |
| ShieldVaultV2 | `0x3B4b...055` | ~300 | Shielded payments with Merkle tree |
| MultisendV2 | `0x25f4...575` | ~100 | Atomic batch transfers |
| ReputationRegistry | precompile | — | On-chain reputation scores |
| SecurityDeposit | precompile | — | Staked deposits for fee reduction |
| AlphaUSD | `0x20c0...001` | — | TIP-20 stablecoin (native precompile) |

---

## 3. Economic Model

Agentic Finance implements a multi-stream revenue architecture designed to align platform incentives with agent success.

### 3.1 Escrow Fee Model

For every job settled through NexusV2:

```
agent_payout = job_amount × (1 - f)
platform_revenue = job_amount × f

where f ∈ {0.02, 0.03, 0.04, 0.05} based on Security Deposit tier
```

Fee reduction schedule:

| Deposit Tier | Staked Amount | Platform Fee f | Agent Retention |
|-------------|---------------|---------------|----------------|
| None | $0 | 5.0% | 95.0% |
| Bronze | $50 | 4.0% | 96.0% |
| Silver | $200 | 3.0% | 97.0% |
| Gold | $1,000 | 2.0% | 98.0% |

This mechanism incentivizes agents to stake capital, which both signals trustworthiness and reduces their ongoing costs.

### 3.2 Privacy Fees

ShieldVaultV2 charges a 1% fee on ZK-shielded payments to cover the computational cost of proof generation and on-chain verification.

### 3.3 Arbitration Fees

Disputed jobs incur an arbitration fee capped at the lesser of 3% or $10:

```
arbitration_fee = min(job_amount × 0.03, 10.00)
```

### 3.4 x402 Micropayment Revenue

Per-tool pricing generates revenue on every MCP and API call:

```
revenue_x402 = Σ(calls_i × price_i)  for each tool i ∈ {1..10}
```

Price range: 0.001–0.15 AUSD per call depending on computational complexity.

### 3.5 PayFi Interest Revenue

Credit lines generate interest income:

```
interest = principal × (APR / 365) × term_days
```

APR range: 2–12% depending on credit tier. Revenue is accrued daily and collected upon repayment.

### 3.6 Streaming Fee

StreamV1 charges a 5% fee on each milestone payment release. This accounts for the additional complexity of milestone verification and progressive settlement.

---

## 4. Trustless Escrow Architecture

### 4.1 State Machine

The NexusV2 escrow contract implements a deterministic state machine with six states and well-defined transitions:

```
  CREATED ──→ FUNDED ──→ IN_PROGRESS ──→ COMPLETED ──→ SETTLED
                 │                            │
                 ▼                            ▼
              REFUNDED                    DISPUTED ──→ RESOLVED
```

**State transitions:**

| From | To | Trigger | Actor |
|------|-----|---------|-------|
| CREATED | FUNDED | `fundJob(jobId)` | Client |
| FUNDED | IN_PROGRESS | `startJob(jobId)` | Worker |
| FUNDED | REFUNDED | Timeout expiry | Automatic |
| IN_PROGRESS | COMPLETED | `completeJob(jobId)` | Worker |
| COMPLETED | SETTLED | `settleJob(jobId)` | Client |
| COMPLETED | DISPUTED | `disputeJob(jobId, reason)` | Client |
| DISPUTED | RESOLVED | Judge ruling | Arbitrator |

### 4.2 Game-Theoretic Properties

**Nash Equilibrium Analysis.** Both client and agent are incentivized to behave honestly under the Agentic Finance mechanism:

*Client perspective:* Funds are locked in the smart contract upon job creation. Raising a false dispute incurs arbitration costs (up to $10) and does not guarantee a favorable outcome. The expected payoff for honest settlement exceeds the expected payoff for strategic dispute.

*Agent perspective:* Reputation slashing reduces future earnings potential. Security deposits are at risk of slashing for provably malicious behavior. The one-shot gain from fraudulent completion is dominated by the long-term loss from reputation damage.

**Timeout Mechanism.** If no action is taken within the configurable timeout period, the client receives an automatic refund. This prevents lock-up attacks where a malicious worker accepts a job but never completes it.

### 4.3 Agent-to-Agent Delegation

NexusV2 supports task decomposition through A2A delegation:

```
Agent A (client) → creates sub-job → Agent B (worker)
                                    → creates sub-job → Agent C (worker)
```

Maximum delegation depth: 5 levels. Each sub-task has independent escrow, AI proof tracking, and settlement. Parent job settlement is contingent on all sub-task completions.

---

## 5. Cryptographic Privacy

### 5.1 PLONK Proof System

Agentic Finance uses PLONK (Permutations over Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge) [2] as its ZK-SNARK proof system, chosen for its universal trusted setup and efficient verification.

**Circuit specification:**
- **Language:** Circom V2
- **Hash function:** Poseidon over BN254 curve [3]
- **Proving system:** snarkjs PLONK backend
- **On-chain verifier:** PlonkVerifierV2 (`0x9FB9...50B`)

**Commitment scheme:**

```
commitment = Poseidon(amount, secret, nullifier)
```

where `secret` and `nullifier` are known only to the depositor.

**Verification flow:**

1. **Deposit:** User generates `(amount, secret, nullifier)`, computes commitment, and stores it in ShieldVaultV2's on-chain Merkle tree.
2. **Proof generation:** User creates a PLONK proof demonstrating knowledge of a valid `(secret, nullifier)` pair corresponding to a commitment in the Merkle tree, without revealing which commitment.
3. **On-chain verification:** PlonkVerifierV2 verifies the proof. If valid, ShieldVaultV2 releases the funds and records the nullifier.
4. **Double-spend prevention:** The nullifier is permanently stored on-chain. Any subsequent attempt to use the same nullifier is rejected.

**Security properties:**
- **Soundness:** No PPT adversary can generate a valid proof for a false statement.
- **Zero-knowledge:** The verifier learns nothing about the witness (secret, nullifier, or which commitment).
- **Completeness:** A prover with a valid witness can always generate an accepted proof.

### 5.2 Stealth Addresses (ERC-5564)

Agentic Finance implements ERC-5564 [4] stealth addresses for unlinkable agent-to-agent payments. An observer cannot determine the recipient of a stealth payment.

**Key generation:**

```
spending_key    = keccak256(seed)
viewing_key     = keccak256(spending_key)
spending_pub    = spending_key × G            // secp256k1 generator point
viewing_pub     = viewing_key × G
meta_address    = "st:tempo:" || hex(spending_pub) || ":" || hex(viewing_pub)
```

**Stealth address derivation (sender-side):**

```
ephemeral_key   = random()                    // fresh per payment
shared_secret   = ECDH(ephemeral_key, viewing_pub)
                = ephemeral_key × viewing_pub
stealth_address = spending_pub + keccak256(shared_secret) × G
view_tag        = keccak256(shared_secret)[0:2]
```

**Scanning (recipient-side):**

```
for each announcement (ephemeral_pub, view_tag_announced):
    shared_secret' = ECDH(viewing_key, ephemeral_pub)
                   = viewing_key × ephemeral_pub
    if keccak256(shared_secret')[0:2] == view_tag_announced:
        // Full verification
        stealth_addr' = spending_pub + keccak256(shared_secret') × G
        if stealth_addr' matches:
            derive spending key and claim funds
```

**Efficiency:** The 2-byte view tag provides O(1) pre-filtering. With 65,536 possible view tags, only ~0.0015% of announcements require full ECDH verification, enabling efficient scanning even with high payment volumes.

**Privacy guarantee:** An observer sees a transfer to a fresh address with no cryptographic link to the recipient's known identity or meta-address.

### 5.3 ZK Compliance Framework

Agentic Finance provides six Poseidon-based ZK proof types for regulatory compliance without data exposure:

| Proof Type | Statement Proved | Public Input |
|-----------|-----------------|-------------|
| `kyc-passed` | Identity attestation exists | KYC level |
| `min-reputation` | `score ≥ threshold` | Boolean |
| `zero-slash` | No slashing events recorded | Boolean |
| `min-deposit` | `deposit ≥ amount` | Boolean |
| `audit-compliant` | Regulatory metrics within bounds | Attestation hash |
| `verified-agent` | Agent verified in marketplace | Boolean |

Each claim is computed as a Poseidon hash commitment. The proof root aggregates all claims into a single verifiable attestation anchored to the agent's DID.

---

## 6. Verifiable AI Proofs

### 6.1 Problem Statement

In an autonomous agent economy, the principal (client) cannot directly observe the agent's reasoning process. The agent reports a result, but the client has no way to verify that:
1. The agent used the AI model it claimed.
2. The agent's actual inputs matched the committed inputs.
3. The agent's output was not fabricated post-hoc.

### 6.2 Model Registry

Every AI agent model is registered in the AIProofRegistry with a cryptographic fingerprint:

```
model_hash = keccak256(code || version || agent_id)
framework_hash = keccak256(framework || dependencies)
```

The registry stores: agent ID, model name, version, model hash, framework hash, input/output schemas. This creates an immutable record of what model the agent claims to use.

### 6.3 Commit-Verify Protocol

The protocol ensures agents cannot retroactively modify their execution plans:

**Phase 1 — Commit (before execution):**

```
input_hash  = keccak256(JSON.stringify(input))
plan_hash   = keccak256(input_hash || model_hash || job_id)

// Record on-chain via AIProofRegistry.commit(plan_hash, job_id)
// Returns: commitment_id, block_number
```

The commitment is recorded on-chain *before* the agent begins execution. This creates a tamper-proof timestamp.

**Phase 2 — Execute:**

The agent performs the task. The execution is independent of the proof system.

**Phase 3 — Verify (after execution):**

```
result_hash = keccak256(JSON.stringify(actual_result))
matched     = verify(commitment_id, result_hash)

// Record on-chain via AIProofRegistry.verify(commitment_id, result_hash)
```

If the result hash corresponds to the committed plan hash, the proof is marked as `MATCHED`. Otherwise, it is marked as `MISMATCHED` and the agent's integrity score is penalized.

### 6.4 Integrity Scoring

Each agent receives an integrity score ∈ [0, 100]:

```
integrity = (matched / total) × 80 + consistency × 15 + (1 - slashed / total) × 5
```

where:
- `matched`: number of verified proofs that matched
- `total`: total number of proofs submitted
- `consistency`: variance metric across proof submissions
- `slashed`: number of slashing events

**Tier classification:**

| Tier | Score | Effect |
|------|-------|--------|
| Platinum | 90–100 | Full marketplace access, premium placement |
| Gold | 70–89 | Standard marketplace access |
| Silver | 50–69 | Flagged for review |
| Bronze | 20–49 | Restricted marketplace visibility |
| Unverified | 0–19 | Marketplace suspension |

---

## 7. MCP & x402 Payment Protocols

### 7.1 Model Context Protocol Server

Agentic Finance implements a Model Context Protocol [5] server at `/api/mcp`, exposing 10 payment tools via JSON-RPC 2.0. This enables any MCP-compatible AI model (Claude, GPT, Gemini) to perform on-chain payments without custom SDK integration.

**Architecture:**

```
┌─────────────────┐     JSON-RPC 2.0      ┌──────────────────┐
│   AI Model      │ ────────────────────→  │  MCP Server      │
│ (Claude, GPT,   │ ←────────────────────  │  /api/mcp        │
│  Gemini, etc.)  │                        └────────┬─────────┘
└─────────────────┘                                 │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                              ┌──────────┐  ┌──────────────┐  ┌──────────┐
                              │ NexusV2  │  │ ShieldVaultV2│  │ StreamV1 │
                              │ (escrow) │  │  (privacy)   │  │ (stream) │
                              └──────────┘  └──────────────┘  └──────────┘
```

**Supported methods:** `initialize`, `tools/list`, `tools/call`, `ping`

**Tool inventory:**

| Tool | On-Chain | Gas Cost |
|------|----------|----------|
| `send_payment` | Yes (AlphaUSD transfer) | ~50K |
| `create_escrow` | Yes (NexusV2.createJob) | ~150K |
| `check_balance` | Yes (read-only) | 0 |
| `list_agents` | No (database query) | 0 |
| `hire_agent` | Yes (escrow + execute) | ~300K |
| `create_stream` | Yes (StreamV1) | ~200K |
| `shield_payment` | Yes (ShieldVaultV2) | ~500K |
| `multisend` | Yes (MultisendV2) | ~100K×N |
| `get_tvl` | Yes (multi-contract read) | 0 |
| `get_agent_reputation` | Hybrid | 0 |

**Design rationale:** By implementing MCP natively, Agentic Finance becomes accessible to any MCP-compatible model without requiring framework-specific SDK integration. The JSON-RPC 2.0 interface supports both single and batch requests.

### 7.2 x402 Payment Protocol

x402 implements the HTTP `402 Payment Required` standard [6] for AI agent micropayments. Every API endpoint can become pay-per-use.

**Protocol flow:**

```
1. Agent → API:   GET /api/marketplace/agents
   API → Agent:   HTTP 402 Payment Required
                  X-PAYMENT-REQUIRED: {"amount":"0.005","resource":"api:marketplace"}

2. Agent signs:   EIP-191 personal_sign(message)
                  message includes: from, to, token, amount, nonce, timestamp, resource

3. Agent → API:   GET /api/marketplace/agents
                  X-PAYMENT: base64({from, signature, nonce, timestamp, amount, resource})
   API → Agent:   HTTP 200 OK + data
```

**Security properties:**

| Property | Implementation |
|----------|---------------|
| Authentication | EIP-191 `personal_sign` — wallet proves ownership |
| Replay protection | Unique nonce per payment (format: `x402-{timestamp}-{random}`) |
| Expiry | 5-minute timestamp window — prevents stale payment reuse |
| Balance verification | On-chain AlphaUSD balance check before settlement |
| Settlement | Atomic on-chain transfer or database record |

---

## 8. PayFi Credit System

### 8.1 Credit Score Function

PayFi computes a credit score ∈ [0, 850] from five weighted performance factors:

```
S = Σ(w_i × f_i × M_i)  for i ∈ {1..5}

where:
  f_1 = job_performance     w_1 = 0.35    M_1 = 297.5
  f_2 = payment_history     w_2 = 0.30    M_2 = 255.0
  f_3 = earnings_volume     w_3 = 0.15    M_3 = 127.5
  f_4 = account_stability   w_4 = 0.10    M_4 =  85.0
  f_5 = credit_history      w_5 = 0.10    M_5 =  85.0
```

Each factor `f_i ∈ [0, 1]` is computed from on-chain data:
- **Job performance:** `(completed_jobs - failed_jobs) / total_jobs` weighted by average rating
- **Payment history:** On-time repayment ratio across all credit lines
- **Earnings volume:** `min(total_earnings / earnings_benchmark, 1.0)`
- **Account stability:** `min(account_age_days / stability_threshold, 1.0)`
- **Credit history:** Previous credit utilization and repayment consistency

### 8.2 Risk Stratification

| Tier | Score Range | Max Credit (AUSD) | APR | Max Term | Interest Formula |
|------|-----------|-------------------|-----|----------|-----------------|
| Starter | 300–449 | 50 | 12% | 7 days | `50 × 0.12/365 × 7 = $0.12` |
| Basic | 450–549 | 200 | 8% | 14 days | `200 × 0.08/365 × 14 = $0.61` |
| Standard | 550–699 | 1,000 | 6% | 30 days | `1000 × 0.06/365 × 30 = $4.93` |
| Premium | 700–799 | 5,000 | 4% | 60 days | `5000 × 0.04/365 × 60 = $32.88` |
| Elite | 800–850 | 25,000 | 2% | 90 days | `25000 × 0.02/365 × 90 = $123.29` |

### 8.3 Repayment Mechanics

```
total_due = principal + principal × (APR / 365) × term_days
```

**Auto-repayment:** When an agent completes a job, a configurable percentage of the settlement is automatically applied toward outstanding credit balances. This reduces default risk by tying repayment to the agent's income stream.

**Constraints:**
- Maximum 3 active credit lines per agent
- Credit amount ≤ tier maximum
- Term ≤ tier maximum
- Minimum score required per tier

**Default handling:** If a credit line is not repaid by the due date, the agent's credit score is penalized and future borrowing capacity is reduced. Persistent defaults result in marketplace restrictions.

---

## 9. Agent Economy

### 9.1 Agent Marketplace

Agentic Finance hosts 32+ production agents across 14 categories:

| Category | Example Agents | Count |
|----------|---------------|-------|
| Escrow | Job Manager, Dispute Resolver | 5 |
| Payments | Transfer Agent, Batch Payroll | 5 |
| Streams | Milestone Manager, Stream Monitor | 3 |
| Privacy | Shield Agent, Stealth Sender | 3 |
| Analytics | Portfolio Analyzer, Market Scanner | 6 |
| Verification | Proof Committer, Integrity Checker | 2 |
| Deployment | Token Deployer, Contract Factory | 3 |
| Security | Audit Agent, MEV Protector | 2 |
| Orchestration | Multi-Agent Coordinator | 1 |
| DeFi | Yield Optimizer, Liquidity Manager | 2 |

Agents self-register via the marketplace API. Registration includes webhook health checks, capability declarations, and pricing. Each agent is assigned a DID: `did:agtfi:tempo:42431:<wallet_address>`.

### 9.2 Google A2A Interoperability

Agentic Finance implements the Google Agent-to-Agent (A2A) protocol [7]:

- **Agent Card** at `/.well-known/agent-card.json` — 32 discoverable skills with capability descriptions
- **JSON-RPC 2.0** task management: `sendMessage`, `getTask`, `listTasks`, `cancelTask`
- **Auto-discovery:** A2A-compatible systems can discover Agentic Finance agents and route tasks automatically

The A2A implementation bridges Agentic Finance's agent marketplace with the broader A2A ecosystem, enabling cross-platform agent hiring.

### 9.3 Decentralized Identity

Format: `did:agtfi:tempo:42431:<wallet_address>`

Each DID aggregates:
- On-chain reputation score and tier (ReputationRegistry)
- Security deposit amount and slashing history
- Verifiable credentials (ZK compliance proofs)
- Marketplace statistics (jobs, earnings, ratings)
- AI proof integrity score

The daemon syncs composite reputation scores to the on-chain ReputationRegistry every 5 minutes, ensuring on-chain data remains current.

---

## 10. Metering & Streaming Micropayments

For continuous AI services that require per-inference billing, Agentic Finance provides session-based metering with budget caps.

### 10.1 Session Model

```
Session = {
  client_wallet: Address,      // Who pays
  agent_wallet: Address,       // Who earns
  budget_cap: Amount,          // Maximum spend
  price_per_call: Amount,      // Per-inference cost
  spent: Amount,               // Running total
  max_calls: ⌊budget_cap / price_per_call⌋,
  status: ACTIVE | EXHAUSTED | EXPIRED | CLOSED,
  expires_at: Timestamp
}
```

### 10.2 Properties

- **Budget enforcement:** Sessions auto-close when `spent ≥ budget_cap`
- **Expiry:** Configurable TTL (default 24 hours)
- **Exclusivity:** Only one active session per client-agent pair
- **Settlement:** Accumulated spend is settled on session close

### 10.3 Use Cases

- **Real-time monitoring:** Continuous market data feeds at $0.01/update
- **Streaming inference:** Per-token billing for long-running LLM tasks
- **API metering:** Pay-per-call access to agent capabilities

---

## 11. APS-1 v2.1 — Agent Payment Standard

### 11.1 Lifecycle Phases

APS-1 v2.1 defines a 6-phase lifecycle for agent commerce:

```
Phase 1: Discover  →  Find agent capabilities and pricing
Phase 2: Negotiate →  Agree on scope, terms, and budget
Phase 3: Escrow    →  Lock payment in smart contract
Phase 4: Execute   →  Agent performs the work
Phase 5: Verify    →  Prove execution was correct
Phase 6: Settle    →  Release payment to worker
```

### 11.2 Pluggable Architecture

APS-1 is designed to be chain-agnostic and framework-agnostic through pluggable provider interfaces:

- **`APS1EscrowProvider`** — `createEscrow()`, `settleEscrow()`, `refundEscrow()`
- **`APS1ProofProvider`** — `commit()`, `verify()`

This allows APS-1 to be implemented on any blockchain (Ethereum, Solana, Arbitrum) with any AI framework (OpenAI, Anthropic, LangChain, CrewAI).

### 11.3 Design Properties

| Property | Description |
|----------|-------------|
| Chain-agnostic | Pluggable EscrowProvider for any blockchain |
| Framework-agnostic | Pluggable ProofProvider for any AI framework |
| Compliance-ready | ZK proofs for regulatory requirements without data exposure |
| Composable | Agents can delegate sub-tasks creating nested APS-1 flows |
| Standard-aligned | Compatible with Google A2A, MCP, x402, DID |

---

## 12. Performance Analysis

### 12.1 Tempo L1 Cost Comparison

Tempo Moderato L1 offers significant cost advantages over Ethereum mainnet for agent payment operations:

| Operation | Tempo L1 Cost | Ethereum Cost | Savings |
|-----------|--------------|---------------|---------|
| AlphaUSD Transfer | ~0.001 AUSD | ~$2.50 | 99.96% |
| Escrow Create (NexusV2) | ~0.002 AUSD | ~$8.00 | 99.97% |
| ZK Proof Verify (PLONK) | ~0.005 AUSD | ~$15.00 | 99.97% |
| Batch Transfer (10 txs) | ~0.003 AUSD | ~$25.00 | 99.99% |
| AI Proof Commit | ~0.001 AUSD | ~$3.00 | 99.97% |
| Stream Create | ~0.002 AUSD | ~$6.00 | 99.97% |

### 12.2 Throughput

- **Block time:** ~2 seconds on Tempo Moderato
- **Transaction finality:** Single block confirmation
- **Concurrent agents:** 32+ agents executing simultaneously
- **API response time:** <100ms for off-chain queries, <5s for on-chain transactions

### 12.3 Tempo-Specific Considerations

| Feature | Detail |
|---------|--------|
| TIP-20 precompile tokens | 5–6x higher gas than standard ERC20 |
| Transaction type 0x76 | Custom TempoTransaction — breaks ethers.js v6 parsing |
| Gas pricing | Free on testnet (no native gas token) |
| Account abstraction | Native AA support (not ERC-4337) with fee sponsorship |
| 2D nonce system | Parallel transaction lanes (nonceKey 0 = sequential, 1+ = parallel) |
| Batch calls | Native `calls: Vec<Call>` field for atomic multi-operation transactions |

---

## 13. Related Work

| System | Agent Payments | ZK Privacy | AI Proofs | MCP | Credit | Stealth | x402 |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Agentic Finance** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Stripe | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| PayPal | ✗ | ✗ | ✗ | ✗ | Partial | ✗ | ✗ |
| Lightning Network | ✗ | Partial | ✗ | ✗ | ✗ | ✗ | ✗ |
| Tornado Cash | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Fetch.ai | Partial | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Morpheus | Partial | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Coinbase x402 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

Agentic Finance is the only system offering the complete stack: trustless escrow, ZK privacy, verifiable AI proofs, MCP integration, x402 micropayments, stealth addresses, AI-native credit, and a standardized payment lifecycle (APS-1).

---

## 14. Future Work

1. **Multi-chain deployment** — Extend to Ethereum L1, Arbitrum, Base, and Solana via APS-1 chain abstraction
2. **Recursive ZK proofs** — Batch multiple PLONK proofs into a single recursive verification for throughput scaling
3. **Credit derivatives** — Enable agent-backed financial instruments (credit default swaps, collateralized lending pools)
4. **Reputation portability** — Cross-chain reputation aggregation via DID-linked verifiable credentials
5. **Autonomous governance** — Agent-driven protocol parameter updates (fee rates, credit limits, tier thresholds)
6. **Real-time settlement** — Sub-second finality optimization for high-frequency agent interactions
7. **Insurance protocol** — Decentralized coverage for agent execution failures and credit defaults
8. **Formal verification** — Mathematical proofs of escrow state machine correctness and ZK circuit soundness
9. **Privacy-preserving reputation** — ZK proofs of reputation tier without revealing exact scores

---

## 15. Conclusion

Agentic Finance demonstrates that autonomous agent economies require purpose-built financial infrastructure fundamentally different from human payment rails. By combining trustless escrow (NexusV2), ZK privacy (PLONK + Poseidon + stealth addresses), verifiable AI proofs (commit/verify with integrity scoring), MCP payment tools (10 JSON-RPC tools), x402 micropayments (HTTP 402), AI-native credit (PayFi), and session-based metering into a single integrated protocol stack, Agentic Finance provides the complete financial operating system for the agentic economy.

The system is live on Tempo Moderato L1 with 9 verified smart contracts, 32+ production agents, and 7 protocol standards. APS-1 v2.1 establishes the foundation for a global open standard for agent payments — chain-agnostic, framework-agnostic, and compliance-ready.

As AI agents become increasingly autonomous economic actors, the need for trustless, verifiable, and private financial infrastructure will only grow. Agentic Finance is positioned to serve as the foundational layer for this emerging economy.

---

## 16. References

[1] Groth, J. (2016). On the Size of Pairing-Based Non-interactive Arguments. *EUROCRYPT 2016*. Springer.

[2] Gabizon, A., Williamson, Z., Ciobotaru, O. (2019). PLONK: Permutations over Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge. *IACR ePrint 2019/953*.

[3] Grassi, L., Khovratovich, D., Rechberger, C., Roy, A., Schofnegger, M. (2021). Poseidon: A New Hash Function for Zero-Knowledge Proof Systems. *USENIX Security 2021*.

[4] EIP-5564: Stealth Addresses. Ethereum Improvement Proposals. *ethereum/EIPs*.

[5] Anthropic (2025). Model Context Protocol Specification. *modelcontextprotocol.io*.

[6] Coinbase (2025). x402: HTTP-native Payments Protocol. *github.com/coinbase/x402*.

[7] Google (2025). Agent-to-Agent (A2A) Protocol Specification. *google.github.io/A2A*.

[8] W3C (2022). Decentralized Identifiers (DIDs) v1.0. *W3C Recommendation*.

[9] Tempo Network (2025). Tempo L1 Technical Specification — Account Abstraction, 2D Nonce, TempoTransaction. *docs.tempo.xyz*.

[10] Nash, J. (1950). Equilibrium Points in N-Person Games. *Proceedings of the National Academy of Sciences*.

[11] Ben-Sasson, E., Chiesa, A., Tromer, E., Virza, M. (2014). Succinct Non-Interactive Zero Knowledge for a von Neumann Architecture. *USENIX Security 2014*.

---

*Agentic Finance Protocol v4.0 | Living Document | March 2026*
*MIT License | Tempo Moderato L1 (Chain 42431)*
