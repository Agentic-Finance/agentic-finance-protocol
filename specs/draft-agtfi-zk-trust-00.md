# ZK Trust Layer for Machine Payments

**Draft:** draft-agtfi-zk-trust-00
**Status:** Proposed Extension to MPP
**Authors:** Agentic Finance Team
**Date:** 2026-03-22
**License:** MIT

## Abstract

This document specifies a privacy-preserving trust layer for machine-to-machine payments. It defines two ZK-SNARK proof systems that operate as extensions to the Machine Payments Protocol (MPP):

1. **ZK Compliance Proofs**: Agents prove regulatory compliance (OFAC non-membership, AML amount/volume thresholds) without revealing private transaction data.

2. **ZK Agent Reputation**: Agents prove aggregate transaction history (tx count, volume, dispute rate) without revealing individual transactions.

Together, these form a "trust layer" that enables merchants and API providers to verify agent trustworthiness before accepting payment — all while preserving agent privacy.

## 1. Problem Statement

### 1.1 The Trust Gap in Machine Payments

MPP enables agents to pay for resources using HTTP 402 semantics. However, the protocol has no mechanism for:

- **Compliance verification**: Is this agent transacting legally? Is the address sanctioned?
- **Reputation assessment**: Has this agent successfully completed transactions before? Are there disputes?
- **Privacy preservation**: How can compliance and reputation be verified without exposing transaction details?

Without a trust layer, merchants must either:
- Accept all payments blindly (fraud risk), or
- Require KYC/identity disclosure (privacy violation), or
- Block agent payments entirely (adoption barrier)

### 1.2 Existing Gaps

| Protocol | Compliance | Reputation | Privacy |
|----------|-----------|------------|---------|
| MPP | None | None | Public on-chain |
| x402 | None | None | Public on-chain |
| ACP | Stripe Radar (centralized) | None | Stripe-controlled |
| AP2 | Google Mandates (centralized) | None | Google-controlled |
| **This spec** | **ZK Proofs (decentralized)** | **ZK Proofs (decentralized)** | **Zero-knowledge** |

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MPP Payment Flow                          │
│  Client ──── 402 Challenge ──── Credential ──── 200 OK     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  ZK Trust Layer (this spec)                  │
│                                                              │
│  ┌──────────────────┐     ┌──────────────────────┐          │
│  │ ZK Compliance    │     │ ZK Agent Reputation   │          │
│  │                  │     │                       │          │
│  │ • OFAC exclusion │     │ • Tx count ≥ min      │          │
│  │ • Amount < limit │     │ • Volume ≥ min        │          │
│  │ • Volume < limit │     │ • Disputes == 0       │          │
│  │                  │     │ • Hash chain verify    │          │
│  └────────┬─────────┘     └───────────┬───────────┘          │
│           │                           │                      │
│           ▼                           ▼                      │
│  ┌──────────────────────────────────────────────┐           │
│  │        On-Chain Registries (Tempo L1)         │           │
│  │  ComplianceRegistry ← isCompliant(commitment) │           │
│  │  ReputationRegistry ← meetsRequirements(...)  │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## 3. ZK Compliance Proof Specification

### 3.1 Circuit Design

**Circuit:** `agtfi_compliance.circom`
**Proof System:** PLONK (no trusted setup)
**Constraints:** 13,591
**Curve:** BN254

#### Public Inputs (4 signals)

| Signal | Type | Description |
|--------|------|-------------|
| `sanctionsRoot` | uint256 | Sparse Merkle Tree root of sanctioned addresses |
| `complianceCommitment` | uint256 | Poseidon(senderAddress, secret) |
| `amountThreshold` | uint256 | AML per-transaction limit |
| `volumeThreshold` | uint256 | AML 30-day cumulative limit |

#### Private Inputs (27 signals)

| Signal | Description |
|--------|-------------|
| `senderAddress` | Agent's address (hidden) |
| `secret` | Random blinding factor |
| `amount` | Transaction amount (hidden) |
| `cumulativeVolume` | 30-day total (hidden) |
| `smtSiblings[20]` | Merkle proof path |
| `smtOldKey` | SMT non-inclusion witness |
| `smtOldValue` | SMT non-inclusion witness |
| `smtIsOld0` | SMT empty slot flag |

#### Constraints

1. `complianceCommitment === Poseidon(senderAddress, secret)`
2. `SMTVerifier(sanctionsRoot, senderAddress, fnc=1)` — non-inclusion
3. `amount < amountThreshold`
4. `cumulativeVolume < volumeThreshold`

### 3.2 HTTP Integration with MPP

When an MPP server requires compliance, it includes a `X-Compliance-Required` header in the 402 response:

```http
HTTP/1.1 402 Payment Required
WWW-Authenticate: Payment realm="api.example.com",
    scheme="tempo",
    amount="100",
    recipient="0x..."
X-Compliance-Required: true
X-Compliance-Registry: 0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14
X-Compliance-Chain: 42431
```

The client includes its compliance commitment in the payment credential:

```http
GET /resource HTTP/1.1
Authorization: Payment credential="...",
    compliance_commitment="18823523989384434644..."
```

The server verifies `isCompliant(commitment)` on-chain before granting access.

### 3.3 On-Chain Registry

**Contract:** `ComplianceRegistry.sol`

```solidity
// Submit proof → get certificate
function verifyCertify(uint256[24] proof, uint256[4] pubSignals) returns (bool);

// Query compliance status
function isCompliant(uint256 commitment) view returns (bool);

// Admin: update sanctions root (daily)
function updateSanctionsRoot(uint256 newRoot) onlyOwner;
```

**Certificate Properties:**
- Validity: configurable (default 7 days)
- Bound to specific sanctions root (expires when root updates)
- Revocable by owner

## 4. ZK Agent Reputation Specification

### 4.1 Circuit Design

**Circuit:** `agtfi_reputation.circom`
**Proof System:** PLONK
**Constraints:** 41,265
**Curve:** BN254

#### Accumulator Model

Transaction claims are chained using Poseidon hash:

```
claim[i] = Poseidon(agentAddress, amount, timestamp, status)
accumulator[0] = Poseidon(claim[0], 0)
accumulator[i] = Poseidon(claim[i], accumulator[i-1])
```

#### Public Inputs (4 signals)

| Signal | Type | Description |
|--------|------|-------------|
| `agentCommitment` | uint256 | Poseidon(agentAddress, agentSecret) |
| `accumulatorHash` | uint256 | Final hash chain state |
| `minTxCount` | uint256 | Minimum proven tx count |
| `minVolume` | uint256 | Minimum proven volume |

#### Private Inputs (99 signals)

- `agentAddress`, `agentSecret` — identity
- `actualClaimCount` — number of real claims
- `claimAmounts[32]`, `claimTimestamps[32]`, `claimStatuses[32]` — tx data

#### Constraints

1. `agentCommitment === Poseidon(agentAddress, agentSecret)`
2. Accumulator hash chain verified
3. `txCount >= minTxCount`
4. `totalVolume >= minVolume`
5. `disputeCount == 0`

### 4.2 HTTP Integration with MPP

Servers can require reputation via header:

```http
HTTP/1.1 402 Payment Required
WWW-Authenticate: Payment realm="premium-api.com", ...
X-Reputation-Required: true
X-Reputation-Min-Tx: 10
X-Reputation-Min-Volume: 50000000000
X-Reputation-Registry: 0xF3296984cb8785Ab236322658c13051801E58875
```

Client includes reputation commitment:

```http
GET /premium-resource HTTP/1.1
Authorization: Payment credential="...",
    reputation_commitment="21847362918..."
```

### 4.3 On-Chain Registry

**Contract:** `AgentReputationRegistry.sol`

```solidity
// Daemon registers claim accumulators
function registerAccumulator(uint256 agentCommitment, uint256 accumulatorHash);

// Agent submits proof → score stored
function verifyReputation(uint256[24] proof, uint256[4] pubSignals) returns (bool);

// Merchant queries
function meetsRequirements(uint256 commitment, uint256 txCount, uint256 volume) view returns (bool);
```

## 5. MPP Compliance Gateway

**Contract:** `MPPComplianceGateway.sol`

Bridges MPP session keys with compliance:

```solidity
// Create session requiring ZK compliance
function createCompliantSession(
    uint256 complianceCommitment,  // Must be verified
    uint256 reputationCommitment,  // Optional
    address token,
    uint256 maxBudget,
    uint256 duration
) returns (bytes32 sessionId);

// Check session validity
function isSessionValid(bytes32 sessionId) view returns (bool valid, uint256 remaining);
```

## 6. Security Considerations

### 6.1 Privacy Properties

- Sender address never appears on-chain
- Transaction amounts never appear on-chain
- Individual transactions never revealed (only aggregates)
- Compliance status is binary (pass/fail) — no details leaked

### 6.2 Soundness

- PLONK proofs are computationally sound under BN254 discrete log assumption
- SMT non-inclusion proofs are complete (cannot fake exclusion)
- Accumulator hash chain is collision-resistant (Poseidon)

### 6.3 Liveness

- Compliance certificates expire (configurable, default 7 days)
- Sanctions root must be updated regularly
- Stale certificates rejected automatically

### 6.4 Attack Vectors

| Attack | Mitigation |
|--------|-----------|
| Fake address in SMT proof | SMT verification in circuit |
| Replay old compliance proof | Certificate bound to current sanctions root |
| Forge reputation | Accumulator must match registered on-chain value |
| Front-running | Commitment hides address until proof submitted |

## 7. Deployed Contracts (Tempo Moderato — Chain 42431)

| Contract | Address |
|----------|---------|
| ComplianceVerifier | `0x4896f5797b59CC8EE5e942eBd0Ed6772af9131fF` |
| ComplianceRegistry | `0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14` |
| ReputationVerifier | `0x2e2C368afB20810AadA9e6BB2Fb51002614F7Da4` |
| AgentReputationRegistry | `0xF3296984cb8785Ab236322658c13051801E58875` |
| MPPComplianceGateway | *(pending deployment)* |

## 8. Test Results

### Compliance Circuit (4/4 passed)

- ✅ Valid proof (clean address, under limits)
- ✅ Sanctioned address rejected
- ✅ Over-limit amount rejected
- ✅ Over-limit volume rejected

### Reputation Circuit (4/4 passed)

- ✅ Valid reputation (10 txs, $50K, 0 disputes)
- ✅ Insufficient tx count rejected
- ✅ Insufficient volume rejected
- ✅ Disputes rejected

## 9. References

- [MPP Specification](https://paymentauth.org)
- [MPP GitHub](https://github.com/tempoxyz/mpp-specs)
- [circomlib SMTVerifier](https://github.com/iden3/circomlib)
- [Poseidon Hash](https://eprint.iacr.org/2019/458)
- [PLONK Proof System](https://eprint.iacr.org/2019/953)

## 10. License

MIT License. Open source. Contributions welcome.
