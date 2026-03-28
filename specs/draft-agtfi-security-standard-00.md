---
afp: 002
title: Security Standard for Open Agentic Commerce
description: Security requirements, threat model, and mitigations for autonomous agent-to-agent transactions
author: Agentic Finance Team
status: Draft
type: Standards Track
category: Security
created: 2026-03-23
updated: 2026-03-29
requires: AFP-001 (ZK Trust Layer)
---

# AFP-002: Security Standard for Open Agentic Commerce

## Abstract

This document defines security requirements for systems where AI agents transact autonomously at machine speed. It specifies a threat model, mandatory security requirements (MUST), recommended practices (SHOULD), and reference implementations for each mitigation.

Current agent payment protocols focus on payment mechanics but lack security primitives for fraud prevention, identity verification, and dispute resolution. This standard fills that gap.

## Motivation

When AI agents control wallets and execute transactions without human oversight, new attack surfaces emerge that traditional payment security does not address:

- **Speed** — Agents transact in milliseconds; human-designed fraud detection cannot keep up
- **Autonomy** — No human reviews each transaction; security must be enforced programmatically
- **Scale** — A single agent may execute thousands of transactions per hour across multiple protocols
- **Identity** — Agents are pseudonymous; traditional KYC does not apply

This standard provides a security framework specifically designed for these constraints.

## Specification

### 1. Threat Model

#### 1.1 Agent-Specific Threats

| ID | Threat | Description | Impact | Likelihood |
|----|--------|-------------|--------|------------|
| T-1 | **Sybil agents** | Attacker creates many fake agents to manipulate reputation, pricing, or marketplace rankings | Reputation gaming, price manipulation | High |
| T-2 | **Session key theft** | MPP session key compromised via memory dump, log leak, or supply chain attack | Unauthorized spending up to session budget | Medium |
| T-3 | **Replay attack** | Resubmit a previously valid payment proof to claim service twice | Double-spend, service theft | Medium |
| T-4 | **Identity impersonation** | Agent claims another agent's reputation commitment | Trust system compromise | Low (requires commitment collision) |
| T-5 | **Sandwich attack** | Front-run agent payment transaction to extract MEV | Financial loss for agent | High (on public mempools) |
| T-6 | **Compliance evasion** | Structure transactions below AML thresholds to avoid detection | Regulatory violation, platform liability | Medium |
| T-7 | **Oracle manipulation** | Feed false data to agents making financial decisions | Incorrect trades, losses | Medium |
| T-8 | **Accumulator forgery** | Submit fabricated reputation hash chain | False reputation claims | Low (requires daemon compromise) |
| T-9 | **Proof grinding** | Generate many proofs with different random inputs to find one that passes | Bypass compliance checks | Negligible (PLONK soundness) |
| T-10 | **Denial of service** | Flood contract with invalid proofs to exhaust gas or block legitimate proofs | Service disruption | Medium |

#### 1.2 Inherited Threats

These threats are not agent-specific but remain relevant:

| Threat | Mitigation in this standard |
|--------|----------------------------|
| Money laundering | ZK Compliance Proofs (AFP-001 §1) |
| Double spending | Nullifier pattern (§2.2, SR-2) |
| Key compromise | Session budgets + expiry (§2.3, SR-3/SR-4) |
| Smart contract bugs | Audit requirements + CEI pattern (§3.5) |
| Reentrancy | ReentrancyGuard on all state-changing functions (§3.5) |

### 2. Security Requirements

Requirements use RFC 2119 keywords: MUST, SHOULD, MAY.

#### 2.1 MUST Requirements

These are mandatory. A non-compliant implementation MUST NOT claim conformance with this standard.

**SR-1: Identity Binding**

Agent identity MUST be bound to a cryptographic commitment that is:
- **Non-transferable** — Commitment is derived from `agentAddress`, which only the key holder controls
- **Non-forgeable** — Commitment includes a random `secret` known only to the agent
- **Deterministic** — Same inputs always produce the same commitment

```
commitment = Poseidon(agentAddress, secret)
```

Rationale: Without identity binding, an agent could claim another agent's compliance certificate or reputation.

**SR-2: Replay Prevention**

Every shielded payment MUST include a unique nullifier. The nullifier MUST be checked against an on-chain registry before the payment is processed.

```
nullifierHash = Poseidon(nullifier, secret)

On withdraw:
  REQUIRE(!nullifierUsed[nullifierHash])
  nullifierUsed[nullifierHash] = true
```

Rationale: Without nullifier tracking, the same ZK proof could be submitted multiple times to drain funds.

**SR-3: Budget Enforcement**

Session keys MUST enforce a maximum spend limit (`maxBudget`) that is checked on every payment:

```
REQUIRE(session.spent + amount <= session.maxBudget)
session.spent += amount
```

The `maxBudget` MUST be set at session creation and MUST NOT be modifiable after creation.

Rationale: If a session key is compromised, damage is bounded by the budget.

**SR-4: Temporal Bounds**

All credentials (session keys, compliance certificates, reputation proofs) MUST have an expiration timestamp:

```
REQUIRE(block.timestamp < credential.expiresAt)
```

No credential MUST be valid indefinitely. Maximum validity periods:
- Session keys: 24 hours (RECOMMENDED: 1 hour)
- Compliance certificates: 30 days (RECOMMENDED: 7 days)
- Reputation proofs: 90 days (RECOMMENDED: 30 days)

Rationale: Temporal bounds limit the window of exposure if a credential is compromised or becomes stale.

**SR-5: Compliance Verification**

For transactions above the configurable AML threshold, the sender MUST provide a valid ZK compliance proof demonstrating:
1. Non-membership in the OFAC sanctions list (SMT non-inclusion proof)
2. Transaction amount below the per-transaction limit
3. 30-day cumulative volume below the cumulative limit

The compliance check MUST occur before the payment is settled on-chain.

#### 2.2 SHOULD Requirements

**SR-6: Reputation Gating**

Merchants SHOULD require minimum reputation scores for:
- Transactions above a configurable value threshold
- Access to premium or rate-limited APIs
- Participation in escrow-based job marketplaces

Implementation: `ReputationRegistry.meetsRequirements(commitment, minTxCount, minVolume)`

**SR-7: Rate Limiting**

Implementations SHOULD enforce rate limits to prevent:
- Proof submission spam (gas exhaustion)
- Session creation spam (state bloat)
- Agent registration spam (marketplace pollution)

RECOMMENDED rate limits:
- Proof submissions: 10 per commitment per hour
- Session creations: 5 per address per hour
- Agent registrations: 1 per address per day

**SR-8: Dispute Resolution**

Agent-to-agent transactions involving escrow SHOULD provide:
- A designated judge address with authority to resolve disputes
- A timeout period after which the payer can reclaim funds
- Event emission for all dispute state transitions

Implementation: NexusV2 job lifecycle (Created → Started → Completed/Disputed → Settled)

**SR-9: Audit Trail**

All payment events SHOULD emit indexed Solidity events for off-chain monitoring:

```solidity
event ComplianceCertified(uint256 indexed commitment, uint256 sanctionsRoot, uint256 timestamp);
event ReputationVerified(uint256 indexed agentCommitment, uint256 txCount, uint256 volume);
event SessionCreated(bytes32 indexed sessionId, uint256 maxBudget, uint256 expiresAt);
event PaymentRecorded(bytes32 indexed sessionId, uint256 amount, uint256 remaining);
```

**SR-10: Graceful Degradation**

If the compliance registry is unavailable (RPC failure, chain congestion):
- The system SHOULD queue transactions for later verification
- The system MUST NOT silently process unverified transactions
- The system SHOULD return HTTP 503 with `Retry-After` header

### 3. Implementation Reference

#### 3.1 Anti-Sybil via ZK Reputation

The ZK reputation system mitigates Sybil attacks (T-1) because:

1. **Real cost** — Creating fake reputation requires real on-chain transactions with real tokens
2. **Identity binding** — Each claim in the hash chain is bound to `agentAddress` (SR-1)
3. **Trusted registration** — Accumulator hashes are registered by a daemon that validates claims against actual blockchain transactions
4. **Hash chain integrity** — Forging a valid Poseidon hash chain is computationally infeasible (128-bit security)

#### 3.2 Session Key Security

The MPPComplianceGateway enforces SR-3 and SR-4:

```
createCompliantSession(commitment, reputation, token, budget, duration):
  1. Verify ComplianceRegistry.isCompliant(commitment)     // SR-5
  2. If reputation != 0: verify ReputationRegistry.meetsRequirements(...)  // SR-6
  3. Store session with maxBudget (immutable)               // SR-3
  4. Store expiresAt = block.timestamp + duration            // SR-4
  5. Bind session to complianceCommitment                   // SR-1
  6. Emit SessionCreated event                              // SR-9

recordPayment(sessionId, amount):
  1. REQUIRE session.active                                 // SR-4
  2. REQUIRE block.timestamp < session.expiresAt            // SR-4
  3. REQUIRE session.spent + amount <= session.maxBudget    // SR-3
  4. session.spent += amount
  5. If session.spent == session.maxBudget: session.active = false
  6. Emit PaymentRecorded event                             // SR-9
```

#### 3.3 Compliance Middleware (HTTP)

Server-side middleware for enforcing SR-5 on HTTP APIs:

```
Incoming request
  │
  ├─ Header X-Compliance-Commitment present?
  │    ├─ No  → Return 402 with X-Trust-Required headers
  │    └─ Yes → Call ComplianceRegistry.isCompliant(commitment)
  │              ├─ True  → Pass request to handler
  │              ├─ False → Return 403 Forbidden
  │              └─ Error → Return 503 Service Unavailable (SR-10)
  │
  └─ Cache compliance status (TTL: 5 minutes)
```

#### 3.4 Nullifier Pattern (Anti-Double-Spend)

ShieldVaultV2 implements SR-2:

```
Deposit:
  commitment = Poseidon(secret, nullifier, amount, recipient)
  commitments[commitment] = true

Withdraw:
  1. Verify ZK proof (proves knowledge of secret, nullifier, amount, recipient)
  2. nullifierHash = Poseidon(nullifier, secret)
  3. REQUIRE(!nullifierUsed[nullifierHash])  // SR-2
  4. nullifierUsed[nullifierHash] = true
  5. Transfer tokens to recipient
```

#### 3.5 Smart Contract Security Patterns

All contracts in the reference implementation follow:

- **CEI Pattern** — Checks-Effects-Interactions ordering to prevent reentrancy
- **ReentrancyGuard** — OpenZeppelin's `nonReentrant` modifier on all state-changing functions
- **SafeERC20** — Safe wrappers for token transfers (handles non-standard return values)
- **Ownable** — Access control on administrative functions (rate updates, root updates)
- **Input validation** — All external inputs validated before processing

### 4. Attack Resistance Matrix

| Threat | SR | Mitigation | Contract | Status |
|--------|-----|-----------|----------|--------|
| T-1: Sybil agents | SR-6 | ZK Reputation (real tx cost) | ReputationRegistry | Deployed |
| T-2: Session key theft | SR-3, SR-4 | Budget cap + expiry | MPPComplianceGateway | Deployed |
| T-3: Replay attack | SR-2 | Nullifier registry | ShieldVaultV2 | Deployed |
| T-4: Identity fraud | SR-1 | Poseidon commitment binding | All registries | Deployed |
| T-5: Sandwich attack | SR-1 | Commitment hides inputs | Commitment scheme | Deployed |
| T-6: Compliance evasion | SR-5 | Cumulative volume proofs | ComplianceRegistry | Deployed |
| T-7: Oracle manipulation | SR-10 | Graceful degradation | Middleware | Implemented |
| T-8: Accumulator forgery | SR-1 | Daemon-registered values | ReputationRegistry | Deployed |
| T-9: Proof grinding | — | PLONK soundness (128-bit) | PlonkVerifierV2 | Deployed |
| T-10: Denial of service | SR-7 | Rate limiting | Application layer | Recommended |

### 5. Regulatory Compliance

| Regulation | Relevant SRs | How this standard addresses it |
|-----------|-------------|-------------------------------|
| **OFAC Sanctions** | SR-5 | ZK non-membership proof against sanctions Merkle tree |
| **AML/BSA** | SR-5 | Per-transaction and cumulative volume range proofs |
| **Travel Rule** | SR-1, SR-9 | Compliance commitment links sender to verifiable proof; events provide audit trail |
| **EU AI Act (2024/1689)** | SR-1, SR-9 | Agent identity binding; comprehensive event logging for traceability |
| **GDPR** | SR-5 (privacy) | ZK proofs disclose no personal data; compliance is verifiable without identity |
| **MiCA** | SR-3, SR-4 | Transaction limits and temporal bounds align with custody requirements |

## Deployed Infrastructure

| Component | Address (Tempo 42431) | SR Coverage |
|-----------|----------------------|-------------|
| ComplianceVerifier | `0x4896f5797b59CC8EE5e942eBd0Ed6772af9131fF` | SR-5 |
| ComplianceRegistry | `0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14` | SR-5, SR-9 |
| ReputationVerifier | `0x2e2C368afB20810AadA9e6BB2Fb51002614F7Da4` | SR-6 |
| ReputationRegistry | `0xF3296984cb8785Ab236322658c13051801E58875` | SR-1, SR-6, SR-9 |
| MPPComplianceGateway | `0x5F68F2A17a28b06A02A649cade5a666C49cb6B6d` | SR-3, SR-4 |
| ShieldVaultV2 | `0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055` | SR-2 |
| NexusV2 | `0x6A467Cd4156093bB528e448C04366586a1052Fab` | SR-8 |
| AgentDiscoveryRegistry | `0x74D79e0AEd3CF9aE9A325558940bB1c8fB8CeA47` | SR-6, SR-7 |

## References

- [AFP-001: ZK Trust Layer](draft-agtfi-zk-trust-00.md) — ZK compliance and reputation proofs
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) — Key words for use in RFCs
- [Machine Payments Protocol (MPP)](https://paymentauth.org) — Base payment protocol
- [x402 Protocol](https://github.com/coinbase/x402) — HTTP 402 payment standard
- [a16z: Open Agentic Commerce](https://a16zcrypto.com/posts/article/open-agentic-commerce-end-ads/) — Ecosystem context
- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) — Security primitives
- [EU AI Act (2024/1689)](https://eur-lex.europa.eu/eli/reg/2024/1689) — AI regulatory framework
- [OFAC SDN List](https://sanctionssearch.ofac.treas.gov/) — U.S. sanctions database
- [Slither](https://github.com/crytic/slither) — Static analysis tool used for audit

## Copyright

This document is licensed under [MIT](../LICENSE).
