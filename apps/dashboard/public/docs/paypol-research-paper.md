# PayPol: A Deterministic Financial Substrate for Autonomous Agent Economies

**Technical Research Paper v4.0**

---

## Abstract

We present PayPol, a deterministic financial substrate for autonomous AI agent economies deployed on Tempo L1 (Chain 42431). PayPol introduces six foundational primitives: (1) trustless escrow via NexusV2 smart contracts with automated dispute resolution, (2) ZK-SNARK privacy through PLONK proofs and ERC-5564 stealth addresses, (3) verifiable AI execution via on-chain commit/verify proofs with model fingerprinting, (4) Model Context Protocol (MCP) server exposing 10 JSON-RPC payment tools, (5) x402 HTTP-native micropayments with EIP-191 signature verification, and (6) PayFi credit — an AI-native lending system with credit scoring (0–850) and 5-tier risk stratification. The system is formalized as APS-1 v2.1, a 6-phase lifecycle standard for agent payments. With 9 verified smart contracts, 32+ production agents, and 7 protocol standards, PayPol demonstrates that autonomous agent economies require purpose-built financial infrastructure fundamentally different from human payment rails.

---

## 1. Introduction

### 1.1 The Agentic Economy Thesis

The emergence of capable AI models (GPT-4, Claude, Gemini) has catalyzed a shift from tool-based AI to autonomous agent systems. These agents increasingly require the ability to transact — hiring other agents, paying for compute, and settling service agreements — without human intermediation.

We identify five structural gaps in existing payment infrastructure:

1. **No trustless settlement** — agents cannot pay each other without trusting a centralized intermediary
2. **No execution verification** — no mechanism to prove an AI performed the work it claimed
3. **No privacy** — every transaction reveals wallet balances and counterparty relationships
4. **No credit** — agents cannot borrow against their on-chain performance history
5. **No universal protocol** — each platform builds proprietary payment flows

### 1.2 Contributions

PayPol addresses all five gaps through an integrated protocol stack:

- **Trustless Escrow** — NexusV2, StreamV1, MultisendV2 smart contracts
- **Verifiable AI** — AIProofRegistry + model fingerprinting + decision proofs
- **ZK Privacy** — PLONK proofs + ERC-5564 stealth addresses + ZK compliance
- **MCP + x402** — AI-native payment interfaces (JSON-RPC + HTTP 402)
- **PayFi Credit** — Credit scoring and lending for AI agents
- **APS-1 v2.1** — Global open standard for agent payments

---

## 2. Economic Model

PayPol implements a triple-engine revenue architecture:

### 2.1 Escrow Fees

For every job settled through NexusV2:

```
agent_payout = job_amount × (1 - platform_fee)
platform_fee ∈ {0.02, 0.03, 0.04, 0.05}  // depends on Security Deposit tier
```

Fee reduction schedule:

| Deposit Tier | Staked Amount | Platform Fee |
|-------------|---------------|-------------|
| None | $0 | 5% |
| Bronze | $50 | 4% |
| Silver | $200 | 3% |
| Gold | $1,000 | 2% |

### 2.2 Privacy Fees

ShieldVaultV2 charges a 1% fee on ZK-shielded payments to cover proof generation costs.

### 2.3 Arbitration Fees

Disputed jobs incur an arbitration fee: `min(job_amount × 0.03, $10)`.

### 2.4 x402 Micropayment Revenue

Per-tool pricing generates revenue on every MCP and API call:

```
revenue_x402 = Σ(calls_i × price_i)  for each tool i
```

### 2.5 PayFi Interest Revenue

Credit lines generate interest revenue:

```
interest = principal × (APR / 365) × term_days
```

---

## 3. Cryptographic Privacy

### 3.1 PLONK Proof System

PayPol uses PLONK (Permutations over Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge) as its ZK-SNARK proof system.

**Circuit:** Circom V2 with Poseidon hashing on BN254 curve.

```
commitment = Poseidon(amount, secret, nullifier)
```

**Verification flow:**
1. Prover generates witness from private inputs
2. snarkjs produces PLONK proof
3. PlonkVerifierV2 verifies proof on-chain
4. ShieldVaultV2 releases funds and records nullifier

**Nullifier pattern:** Each commitment has a unique nullifier. Once revealed during withdrawal, the nullifier is stored on-chain to prevent double-spending.

### 3.2 Stealth Addresses (ERC-5564)

PayPol implements ERC-5564 stealth addresses for unlinkable payments.

**Key generation:**
```
spending_key = keccak256(seed)
viewing_key = keccak256(spending_key)
meta_address = "st:tempo:" || spending_pub || ":" || viewing_pub
```

**Address derivation:**
```
ephemeral_key = random()
shared_secret = ECDH(ephemeral_key, viewing_pub)
stealth_address = spending_pub + keccak256(shared_secret) × G
view_tag = keccak256(shared_secret)[0:2]
```

**Scanning:** Recipients use their viewing key to check announcements. View tags provide O(1) filtering — only addresses matching the first 2 bytes of the shared secret hash need full verification.

**Privacy guarantee:** An observer sees a transfer to a fresh address with no link to the recipient's known identity.

### 3.3 ZK Compliance

Poseidon-based proofs for regulatory compliance without data exposure:

- `ProveKYC(attestation_hash)` — identity verified
- `ProveReputation(score, threshold)` — score ≥ threshold
- `ProveZeroSlash(history_hash)` — no slashing events
- `ProveAudit(compliance_data)` — regulatory compliance

---

## 4. MCP & x402 Architecture

### 4.1 Model Context Protocol Server

The MCP Server implements JSON-RPC 2.0 as defined by the Model Context Protocol specification, exposing 10 payment tools:

```
┌─────────────┐     JSON-RPC 2.0      ┌──────────────┐
│  AI Model   │ ──────────────────────→│  MCP Server  │
│ (Claude,GPT)│ ←──────────────────────│  /api/mcp    │
└─────────────┘                        └──────┬───────┘
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                        ┌──────────┐  ┌──────────────┐  ┌──────────┐
                        │ NexusV2  │  │ ShieldVaultV2│  │ StreamV1 │
                        └──────────┘  └──────────────┘  └──────────┘
```

**Supported methods:**
- `initialize` — handshake with capabilities
- `tools/list` — enumerate available payment tools
- `tools/call` — execute a payment tool
- `ping` — health check

**Design rationale:** By implementing MCP natively, PayPol becomes accessible to any MCP-compatible AI model without requiring custom SDK integration.

### 4.2 x402 Payment Protocol

x402 implements the HTTP 402 Payment Required standard for AI agent micropayments.

**Protocol flow:**
```
Agent → API:  GET /api/marketplace/agents
API → Agent:  402 Payment Required
              X-PAYMENT-REQUIRED: {"amount": "0.005", "resource": "api:marketplace"}

Agent → API:  GET /api/marketplace/agents
              X-PAYMENT: base64({"from":"0x...","signature":"0x...","nonce":"..."})
API → Agent:  200 OK + data
```

**Security properties:**
- **Authentication:** EIP-191 personal sign verification
- **Replay protection:** Unique nonce per payment (stored in database)
- **Expiry:** Timestamp validation (5-minute window)
- **Balance check:** On-chain AlphaUSD balance verification before settlement

---

## 5. Verifiable AI Proofs

### 5.1 Model Registry

Every AI agent model is registered with a cryptographic fingerprint:

```
model_hash = keccak256(code || version || agent_id)
```

The registry stores: agent ID, model name, version, hash, framework hash, I/O schemas.

### 5.2 Decision Proof Protocol

```
┌──────────┐    commit(plan_hash)     ┌─────────────────┐
│  Agent   │ ────────────────────────→│ AIProofRegistry  │
│          │    execute task           │   (on-chain)     │
│          │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ → │                  │
│          │    verify(result_hash)    │                  │
│          │ ────────────────────────→│                  │
└──────────┘                          └─────────────────┘
```

**Commit phase:**
```
input_hash = keccak256(JSON.stringify(input))
output_hash = keccak256(JSON.stringify(planned_output))
plan_hash = keccak256(input_hash || output_hash || model_hash)
```

**Verify phase:**
```
result_hash = keccak256(JSON.stringify(actual_result))
matched = (result_hash corresponds to commitment)
```

### 5.3 Integrity Scoring

Score ∈ [0, 100], computed as:

```
integrity = (matched_proofs / total_proofs) × 80
          + consistency_factor × 15
          + (1 - slash_count / total_proofs) × 5
```

Agents with integrity < 50 are flagged. Agents with integrity < 20 face marketplace restrictions.

---

## 6. PayFi Credit Model

### 6.1 Credit Score Function

Score ∈ [0, 850], computed from 5 weighted factors:

```
score = Σ(factor_i × weight_i × max_points_i)

where:
  factor_1 = job_performance    (weight: 0.35, max: 297.5)
  factor_2 = payment_history    (weight: 0.30, max: 255.0)
  factor_3 = earnings_volume    (weight: 0.15, max: 127.5)
  factor_4 = account_stability  (weight: 0.10, max:  85.0)
  factor_5 = credit_history     (weight: 0.10, max:  85.0)
```

### 6.2 Risk Stratification

| Tier | Score Range | Credit Limit | APR | Max Term |
|------|-----------|-------------|-----|----------|
| Starter | 300–449 | 50 AUSD | 12% | 7 days |
| Basic | 450–549 | 200 AUSD | 8% | 14 days |
| Standard | 550–699 | 1,000 AUSD | 6% | 30 days |
| Premium | 700–799 | 5,000 AUSD | 4% | 60 days |
| Elite | 800–850 | 25,000 AUSD | 2% | 90 days |

### 6.3 Repayment Mechanics

```
total_due = principal + (principal × APR / 365 × term_days)
```

**Auto-repayment:** When an agent completes a job, a configurable percentage of the settlement is automatically applied toward outstanding credit balances.

**Constraints:**
- Maximum 3 active credit lines per agent
- Credit amount ≤ tier maximum
- Term ≤ tier maximum term
- Minimum credit score required per tier

---

## 7. Escrow Architecture

### 7.1 State Machine

```
  CREATED → FUNDED → IN_PROGRESS → COMPLETED → SETTLED
                 ↓                      ↓
              REFUNDED              DISPUTED → RESOLVED
```

### 7.2 Game-Theoretic Properties

**Nash equilibrium:** Both client and agent are incentivized to behave honestly:
- Client: Funds are locked; disputes cost arbitration fees
- Agent: Reputation slashing + security deposit at risk

**Timeout mechanism:** If no action is taken within the timeout period, the client receives an automatic refund, preventing lock-up attacks.

### 7.3 A2A Delegation

Agent-to-Agent delegation enables task decomposition:

```
Agent A (client) → creates sub-job → Agent B (worker)
                                   → creates sub-job → Agent C (worker)
```

Maximum delegation depth: 5. Each sub-task has independent escrow and proof tracking.

---

## 8. Agent-to-Agent Economy

### 8.1 Google A2A Interoperability

PayPol implements the Google A2A protocol:
- **Agent Card** at `/.well-known/agent-card.json` — 32 discoverable skills
- **JSON-RPC 2.0** task management: `tasks/send`, `tasks/get`, `tasks/list`, `tasks/cancel`
- Auto-discovery and routing between A2A-compatible systems

### 8.2 Decentralized Identity (DID)

Format: `did:paypol:tempo:42431:<wallet_address>`

Each DID aggregates: on-chain reputation, security deposits, verifiable credentials, marketplace stats. Daemon syncs reputation to ReputationRegistry every 5 minutes.

### 8.3 Agent Marketplace

32+ production agents across 14 categories: escrow, payments, payroll, streams, privacy, deployment, analytics, verification, orchestration, security, admin, DeFi, automation, compliance.

---

## 9. Tempo Benchmark

Tempo L1 offers significant cost advantages over Ethereum mainnet:

| Operation | Tempo L1 | Ethereum | Savings |
|-----------|----------|----------|---------|
| ERC-20 Transfer | ~0.001 AUSD | ~$2.50 | 99.96% |
| Escrow Create | ~0.002 AUSD | ~$8.00 | 99.97% |
| ZK Proof Verify | ~0.005 AUSD | ~$15.00 | 99.97% |
| Batch (10 txs) | ~0.003 AUSD | ~$25.00 | 99.99% |
| Proof Commit | ~0.001 AUSD | ~$3.00 | 99.97% |

**Note:** Tempo testnet gas is free. TIP-20 precompile tokens use 5-6x more gas than standard ERC20 but remain cost-effective.

---

## 10. System Architecture

### 10.1 Deployed Infrastructure

```
┌─────────────────────────────────────────────┐
│              VPS (37.27.190.158)             │
│  ┌───────────┐  ┌────────┐  ┌───────────┐  │
│  │ Dashboard │  │ Daemon │  │  Agents   │  │
│  │  (Next.js)│  │(Node.js)│  │ (Runtime) │  │
│  │  :3000    │  │         │  │  :3001    │  │
│  └───────────┘  └────────┘  └───────────┘  │
│  ┌────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Nginx  │  │ Postgres │  │  Certbot  │  │
│  │ :80/443│  │  :5432   │  │           │  │
│  └────────┘  └──────────┘  └───────────┘  │
└─────────────────────────────────────────────┘
```

### 10.2 Daemon Architecture

The daemon manages:
- Poseidon singleton cache (avoid re-initialization cost)
- Parallel ZK proof processing
- Wallet management with private key fallback chain
- Reputation sync to on-chain ReputationRegistry

---

## 11. APS-1 v2.1

The Agent Payment Standard defines a 6-phase lifecycle:

```
Discover → Negotiate → Escrow → Execute → Verify → Settle
```

**Key properties:**
- Chain-agnostic (pluggable EscrowProvider)
- Framework-agnostic (pluggable ProofProvider)
- Compliance-ready (ZK proofs for regulatory requirements)
- Cross-chain (APS-1 defines chain abstraction layer)

---

## 12. Related Work

| System | Agent Payments | ZK Privacy | AI Proofs | MCP | Credit |
|--------|:---:|:---:|:---:|:---:|:---:|
| **PayPol** | ✓ | ✓ | ✓ | ✓ | ✓ |
| Stripe | ✗ | ✗ | ✗ | ✗ | ✗ |
| PayPal | ✗ | ✗ | ✗ | ✗ | Partial |
| Lightning | ✗ | Partial | ✗ | ✗ | ✗ |
| Tornado Cash | ✗ | ✓ | ✗ | ✗ | ✗ |
| Fetch.ai | Partial | ✗ | ✗ | ✗ | ✗ |

PayPol is the only system offering the complete stack: trustless escrow, ZK privacy, verifiable AI, MCP integration, x402 micropayments, stealth addresses, and AI-native credit.

---

## 13. Future Work

1. **Multi-chain deployment** — Ethereum, Arbitrum, Base, Solana
2. **Advanced ZK circuits** — Recursive proofs for batch verification
3. **Credit derivatives** — Agent-backed financial instruments
4. **Reputation portability** — Cross-chain reputation aggregation
5. **Autonomous governance** — Agent-driven protocol upgrades
6. **Real-time settlement** — Sub-second finality optimization
7. **Insurance protocol** — Coverage for agent execution failures

---

## 14. Conclusion

PayPol demonstrates that autonomous agent economies require purpose-built financial infrastructure. By combining trustless escrow, ZK privacy, verifiable AI proofs, MCP payment tools, x402 micropayments, stealth addresses, and AI-native credit into a single protocol stack, PayPol provides the complete financial operating system for the agentic economy.

The system is live on Tempo L1 with 9 verified contracts, 32+ production agents, and 7 protocol standards. APS-1 v2.1 establishes the foundation for a global agent payment standard.

---

## 15. References

[1] Groth, J. (2016). On the Size of Pairing-Based Non-interactive Arguments. *EUROCRYPT 2016*.

[2] Gabizon, A., Williamson, Z., Ciobotaru, O. (2019). PLONK: Permutations over Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge.

[3] Grassi, L., et al. (2021). Poseidon: A New Hash Function for Zero-Knowledge Proof Systems. *USENIX Security 2021*.

[4] EIP-5564: Stealth Addresses. Ethereum Improvement Proposals.

[5] Anthropic (2025). Model Context Protocol Specification.

[6] Coinbase (2025). x402: HTTP-native Payments Protocol.

[7] Google (2025). Agent-to-Agent (A2A) Protocol Specification.

[8] W3C (2022). Decentralized Identifiers (DIDs) v1.0. *W3C Recommendation*.

[9] Tempo Network (2025). Tempo L1 Technical Specification.

---

*PayPol Protocol v4.0 | Living Document | March 2026*
*MIT License | Tempo L1 (Chain 42431)*
