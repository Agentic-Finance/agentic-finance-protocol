---
afp: 001
title: "ZK Trust Layer for Machine Payments"
description: "Privacy-preserving compliance, reputation, and inference attestation for autonomous agent commerce"
author: Agentic Finance Team
status: Draft
type: Standards Track
category: Core
created: 2026-03-22
updated: 2026-03-29
requires: MPP (Machine Payments Protocol)
---

# AFP-001: ZK Trust Layer for Machine Payments

## Abstract

This specification defines a privacy-preserving trust layer for machine-to-machine payment protocols. It introduces three zero-knowledge proof systems — **ZK Compliance**, **ZK Agent Reputation**, and **ZK Inference Attestation** — that extend existing payment protocols (MPP, x402, AP2) with verifiable trust signals while preserving agent privacy.

Agents prove regulatory compliance (OFAC non-membership, AML thresholds), transaction reputation (history, volume, dispute rate), and inference integrity (model execution verification) without revealing private data. Merchants verify these proofs on-chain before accepting payments.

The specification defines both the current production system (PLONK-based proofs) and the next-generation architecture (Nova IVC folding with recursive composition).

## Motivation

Machine payment protocols (MPP, x402, AP2) enable AI agents to pay for resources programmatically. However, none address the fundamental trust question: *should this agent be trusted?*

Without trust infrastructure, the ecosystem faces a trilemma:

1. **Accept blindly** — Merchants process all agent payments, exposing themselves to sanctioned entities, fraud, and regulatory liability.
2. **Require identity** — Merchants demand KYC, eliminating the privacy and autonomy that make agent commerce valuable.
3. **Block agents** — Merchants refuse agent payments entirely, preventing ecosystem growth.

This specification resolves the trilemma by enabling trust verification without identity disclosure.

### Design Goals

1. **Privacy-first** — Agent addresses, transaction amounts, and individual histories MUST never appear on-chain
2. **Composable** — Trust proofs MUST work with any payment protocol (MPP, x402, AP2, ERC-7683 intents)
3. **Incremental** — Trust MUST accumulate over time without re-proving the entire history
4. **Verifiable** — All trust claims MUST be cryptographically verifiable on-chain
5. **Future-proof** — Architecture MUST support migration to post-quantum proof systems

### Comparison with Existing Approaches

| Protocol | Compliance | Reputation | Inference | Privacy | Trust Model |
|----------|-----------|------------|-----------|---------|-------------|
| MPP | None | None | None | Public on-chain | None |
| x402 | None | None | None | Public on-chain | None |
| ACP (Stripe) | Centralized | None | None | Custodial | Stripe-controlled |
| AP2 (Google) | Centralized | None | None | Google-controlled | Custodial |
| ERC-8004 | None | On-chain scores | None | Fully public | Reputation only |
| **AFP-001** | **ZK proofs** | **ZK proofs** | **ZK proofs** | **Zero-knowledge** | **Decentralized** |

## Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

- **Commitment** — A Poseidon hash binding an agent's identity to a random secret: `Poseidon(address, secret)`. The commitment serves as a pseudonymous on-chain identifier.
- **Accumulator** — A Poseidon hash chain summarizing an agent's transaction history. Each new transaction extends the chain.
- **Certificate** — An on-chain record asserting that a commitment has passed compliance verification. Certificates expire.
- **Nullifier** — A unique value derived from a secret, used to prevent double-spending in shielded payments.
- **SMT** — Sparse Merkle Tree: a data structure for efficient set membership/non-membership proofs.
- **IVC** — Incremental Verifiable Computation: a proof system where each step folds into a running accumulator, enabling streaming proofs.

## Specification

### Overview

The trust layer sits between the payment protocol and the settlement layer:

```
Agent ─── Payment Protocol (MPP/x402/AP2) ─── Trust Layer ─── Settlement (Tempo L1)
                                                     │
                                          ┌──────────┼──────────┐
                                          │          │          │
                                    ZK Compliance  ZK Rep   ZK Inference
                                    (OFAC + AML)  (History)  (Model Attestation)
                                          │          │          │
                                          ▼          ▼          ▼
                                    Compliance   Reputation   Inference
                                    Registry     Registry     Registry
                                     (on-chain)  (on-chain)   (on-chain)
```

### 1. ZK Compliance Proof

#### 1.1 Circuit

- **Source:** `agtfi_compliance.circom`
- **Proof system:** PLONK (universal, no per-circuit trusted setup)
- **Curve:** BN254
- **Constraints:** 13,591
- **Hash function:** Poseidon (arithmetic-friendly, ~8x cheaper than SHA-256 in-circuit)

#### 1.2 Inputs

**Public inputs** (verified on-chain):

| # | Signal | Type | Description |
|---|--------|------|-------------|
| 0 | `sanctionsRoot` | `uint256` | Sparse Merkle Tree root of OFAC sanctioned addresses |
| 1 | `complianceCommitment` | `uint256` | `Poseidon(senderAddress, secret)` — pseudonymous identity |
| 2 | `amountThreshold` | `uint256` | Per-transaction AML limit (configurable by registry owner) |
| 3 | `volumeThreshold` | `uint256` | 30-day cumulative AML limit |

**Private inputs** (never leave the prover):

| Signal | Description |
|--------|-------------|
| `senderAddress` | Agent's Ethereum address |
| `secret` | Random blinding factor (256-bit) |
| `amount` | Transaction amount in token's smallest unit |
| `cumulativeVolume` | Agent's 30-day cumulative transaction volume |
| `smtSiblings[20]` | Sparse Merkle Tree proof path (20 levels = 2^20 addresses) |
| `smtOldKey` | SMT non-inclusion witness key |
| `smtOldValue` | SMT non-inclusion witness value |
| `smtIsOld0` | SMT empty slot indicator |

#### 1.3 Constraints

The circuit enforces four properties simultaneously:

```
1. IDENTITY BINDING
   complianceCommitment === Poseidon(senderAddress, secret)

2. SANCTIONS EXCLUSION
   SMTVerifier(sanctionsRoot, senderAddress, fnc=1)
   // fnc=1 = non-inclusion proof: senderAddress is NOT in the sanctions tree

3. AMOUNT COMPLIANCE
   amount < amountThreshold

4. VOLUME COMPLIANCE
   cumulativeVolume < volumeThreshold
```

If any constraint fails, the proof cannot be generated. A valid proof guarantees all four properties hold.

#### 1.4 On-Chain Registry

```solidity
interface IComplianceRegistry {
    /// @notice Submit a PLONK proof and receive a compliance certificate
    /// @param _proof 24 field elements (PLONK proof)
    /// @param _pubSignals 4 public inputs [sanctionsRoot, commitment, amountThreshold, volumeThreshold]
    /// @return success True if proof verified and certificate issued
    function verifyCertify(
        uint256[24] calldata _proof,
        uint256[4] calldata _pubSignals
    ) external returns (bool success);

    /// @notice Check if a commitment has a valid (non-expired) certificate
    function isCompliant(uint256 commitment) external view returns (bool);

    /// @notice Update the OFAC sanctions Merkle root (owner only)
    function updateSanctionsRoot(uint256 newRoot) external;
}
```

**Certificate lifecycle:**
- **Issuance:** On successful `verifyCertify()` call
- **Validity:** Configurable (default: 7 days)
- **Expiry:** Automatic when `block.timestamp > certificate.issuedAt + validityPeriod`
- **Revocation:** Owner can revoke any certificate
- **Root binding:** Certificate is bound to the `sanctionsRoot` at time of issuance; becomes invalid when root updates

### 2. ZK Agent Reputation

#### 2.1 Accumulator Model

Agent reputation is computed from a Poseidon hash chain of transaction claims:

```
claim[i] = Poseidon(agentAddress, amount_i, timestamp_i, status_i)

accumulator[0] = Poseidon(claim[0], 0)
accumulator[i] = Poseidon(claim[i], accumulator[i-1])
```

Where `status` is: `1` = successful completion, `0` = dispute/failure.

This construction is:
- **Append-only** — New claims extend the chain, old claims cannot be removed
- **Binding** — Each claim is bound to `agentAddress`, preventing cross-agent forgery
- **Collision-resistant** — Poseidon over BN254 provides ~128-bit collision resistance
- **Incrementally verifiable** — New claims can be folded into the existing accumulator without re-proving the entire history (see §5: Next-Generation Architecture)

#### 2.2 Circuit

- **Source:** `agtfi_reputation.circom`
- **Proof system:** PLONK
- **Constraints:** 41,265
- **Max claims per proof:** 32

#### 2.3 Inputs

**Public inputs:**

| # | Signal | Type | Description |
|---|--------|------|-------------|
| 0 | `agentCommitment` | `uint256` | `Poseidon(agentAddress, agentSecret)` |
| 1 | `accumulatorHash` | `uint256` | Final state of the hash chain |
| 2 | `minTxCount` | `uint256` | Minimum transaction count being proven |
| 3 | `minVolume` | `uint256` | Minimum total volume being proven |

**Private inputs:**

| Signal | Count | Description |
|--------|-------|-------------|
| `agentAddress` | 1 | Agent's address |
| `agentSecret` | 1 | Blinding factor |
| `actualClaimCount` | 1 | Number of real claims (remainder padded) |
| `claimAmounts[32]` | 32 | Transaction amounts |
| `claimTimestamps[32]` | 32 | Transaction timestamps |
| `claimStatuses[32]` | 32 | Completion statuses (1=success, 0=dispute) |

#### 2.4 Constraints

```
1. IDENTITY BINDING
   agentCommitment === Poseidon(agentAddress, agentSecret)

2. HASH CHAIN INTEGRITY
   For i in 0..31:
     if i < actualClaimCount:
       claim[i] = Poseidon(agentAddress, claimAmounts[i], claimTimestamps[i], claimStatuses[i])
       accumulator[i] = Poseidon(claim[i], accumulator[i-1])
     else:
       accumulator[i] = accumulator[i-1]  // padding
   accumulatorHash === accumulator[31]

3. MINIMUM TRANSACTION COUNT
   actualClaimCount >= minTxCount

4. MINIMUM VOLUME
   sum(claimAmounts[0..actualClaimCount-1]) >= minVolume

5. ZERO DISPUTES
   sum(1 - claimStatuses[0..actualClaimCount-1]) === 0
```

#### 2.5 On-Chain Registry

```solidity
interface IReputationRegistry {
    /// @notice Register an accumulator hash for an agent (daemon only)
    function registerAccumulator(uint256 agentCommitment, uint256 accumulatorHash) external;

    /// @notice Submit a reputation proof
    function verifyReputation(
        uint256[24] calldata _proof,
        uint256[4] calldata _pubSignals
    ) external returns (bool);

    /// @notice Check if agent meets requirements (merchant query)
    function meetsRequirements(
        uint256 commitment,
        uint256 requiredTxCount,
        uint256 requiredVolume
    ) external view returns (bool);

    /// @notice Get full reputation data for an agent
    function getReputation(uint256 agentCommitment) external view returns (
        uint256 accumulatorHash,
        uint256 verifiedTxCount,
        uint256 verifiedVolume,
        uint256 lastVerifiedAt,
        uint256 proofCount,
        bool active
    );
}
```

### 3. ZK Inference Attestation

#### 3.1 Motivation

When an AI agent claims it executed a specific model to produce a result, there is currently no way to verify this claim. A malicious agent could claim to run GPT-4 while actually running a cheaper model, or fabricate outputs entirely.

ZK Inference Attestation allows agents to cryptographically prove that a specific model (identified by hash) was executed on specific inputs, without revealing model weights or full input data.

#### 3.2 Architecture

```
Agent executes model inference
    │
    ├── Committed inputs: Poseidon(input_tensor)
    ├── Model hash: keccak256(model_weights)
    ├── Output commitment: Poseidon(output_tensor)
    │
    ▼
Generate zkML proof (EZKL / Giza / custom)
    │
    ▼
Submit attestation on-chain
    │
    ▼
InferenceRegistry stores attestation
```

#### 3.3 On-Chain Interface

```solidity
interface IInferenceRegistry {
    struct ModelAttestation {
        bytes32 modelHash;           // keccak256(model_weights)
        uint256 inputCommitment;     // Poseidon(input_data)
        uint256 outputCommitment;    // Poseidon(output_data)
        uint256 timestamp;
        uint256 agentCommitment;     // Links to reputation system
    }

    /// @notice Register a verified model for inference attestation
    function registerModel(
        bytes32 modelHash,
        string calldata modelURI,    // IPFS/Arweave URI for model metadata
        bytes32 verificationKeyHash
    ) external;

    /// @notice Submit and verify an inference attestation
    function attestInference(
        ModelAttestation calldata attestation,
        bytes calldata proof         // zkML proof (EZKL/Giza format)
    ) external returns (bool);

    /// @notice Check if an agent has a valid inference attestation for a model
    function hasAttestation(
        uint256 agentCommitment,
        bytes32 modelHash
    ) external view returns (bool valid, uint256 timestamp);
}
```

#### 3.4 Integration with Reputation

Verified inference attestations feed into the reputation system:
- Agents with verified inference proofs receive higher trust scores
- Merchants can require inference attestation for high-value API calls
- Attestations are linked to `agentCommitment`, preserving privacy

### 4. Protocol Integration

#### 4.1 MPP Extension Headers

**Server → Client (402 response):**

```http
HTTP/1.1 402 Payment Required
WWW-Authenticate: Payment realm="api.example.com",
    scheme="tempo",
    amount="100",
    recipient="0x..."
X-Trust-Required: compliance,reputation
X-Compliance-Registry: 0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14
X-Reputation-Registry: 0xF3296984cb8785Ab236322658c13051801E58875
X-Reputation-Min-Tx: 10
X-Reputation-Min-Volume: 50000000000
X-Trust-Chain: 42431
```

**Client → Server (authenticated request):**

```http
GET /resource HTTP/1.1
Authorization: Payment credential="<payment_signature>",
    compliance_commitment="18823523989384434644...",
    reputation_commitment="21847362918..."
```

**Server verification flow:**

```
1. Parse compliance_commitment from Authorization header
2. Call ComplianceRegistry.isCompliant(commitment) on chain 42431
3. Parse reputation_commitment from Authorization header
4. Call ReputationRegistry.meetsRequirements(commitment, minTx, minVolume)
5. If both pass → process payment and return 200
6. If compliance fails → return 403 with X-Trust-Error: compliance_invalid
7. If reputation fails → return 403 with X-Trust-Error: reputation_insufficient
```

#### 4.2 x402 Extension

For x402 (HTTP 402 with EIP-3009), the trust headers are identical. The only difference is the payment credential format (EIP-3009 `TransferWithAuthorization` signature instead of MPP session key).

#### 4.3 ERC-7683 Intent Extension

For intent-based payments, trust requirements are encoded in the intent order:

```solidity
struct TrustRequirements {
    uint256 minComplianceCertAge;   // Max age of compliance cert (seconds)
    uint256 minReputationTxCount;
    uint256 minReputationVolume;
    bytes32 requiredModelHash;       // Optional: require specific model attestation
    bool requireTEEAttestation;      // Optional: require TEE hardware proof
}
```

#### 4.4 MPP Compliance Gateway

Bridges MPP session management with ZK trust verification:

```solidity
interface IMPPComplianceGateway {
    /// @notice Create a session that requires ZK compliance
    function createCompliantSession(
        uint256 complianceCommitment,
        uint256 reputationCommitment,
        address token,
        uint256 maxBudget,
        uint256 duration
    ) external returns (bytes32 sessionId);

    /// @notice Check if a session is valid and has remaining budget
    function isSessionValid(bytes32 sessionId) external view returns (
        bool valid,
        uint256 remaining,
        uint256 expiresAt
    );

    /// @notice Record a payment against a session
    function recordPayment(bytes32 sessionId, uint256 amount) external;
}
```

### 5. Next-Generation Architecture

This section describes the target architecture for AFP-001 v2, incorporating folding-based IVC and recursive proof composition.

#### 5.1 Nova IVC for Streaming Proofs

The current architecture requires generating a full PLONK proof for each compliance/reputation verification. Nova IVC enables **streaming proofs** where each payment step folds into a running accumulator, and only the final compressed proof is verified on-chain.

**Benefits:**
- 1000 sequential payments verified at roughly the same cost as 1
- Incremental accumulation — no need to re-prove entire history
- Sub-second per-step folding (vs. 15-29s per PLONK proof)

**Target interface:**

```solidity
interface IFoldingVerifier {
    /// @notice Verify a folded IVC proof covering N steps
    function verifyFoldedProof(
        bytes calldata compressedProof,
        uint256[2] calldata publicAccumulator,
        uint256 stepCount,
        uint256 finalOutputHash
    ) external view returns (bool);

    /// @notice Verify an incremental update to an existing folded proof
    function verifyIncrementalFold(
        uint256[2] calldata previousAccumulator,
        uint256[2] calldata newAccumulator,
        bytes calldata transitionProof
    ) external view returns (bool);
}
```

#### 5.2 Client-Side Proving

The compliance circuit (13,591 constraints) is small enough for client-side proving via WASM:

| Platform | Framework | Est. Proof Time |
|----------|-----------|-----------------|
| Browser (WASM) | snarkjs | ~30s |
| Browser (WASM + Workers) | mopro | ~8s |
| Mobile (native) | mopro/rapidsnark | ~3s |
| Server (Node.js) | snarkjs | ~15s |
| Server (native + GPU) | rapidsnark | ~2s |

#### 5.3 Cross-Chain Verification

For multi-chain deployment, trust proofs generated on Tempo L1 can be verified on other chains using succinct state proofs:

```solidity
interface ICrossChainTrustVerifier {
    /// @notice Verify a trust proof from another chain
    function verifyCrossChainTrust(
        uint256 sourceChainId,
        bytes calldata stateProof,       // SP1/Succinct proof of source chain state
        uint256 commitment,
        uint256 blockHeight
    ) external view returns (bool compliant, bool reputationValid);
}
```

#### 5.4 Post-Quantum Migration Path

Current BN254 proofs provide 128-bit classical security but are vulnerable to quantum attacks. The migration path:

1. **Phase 1 (current):** BN254 + PLONK — production-proven, widely supported
2. **Phase 2 (2027):** Dual proofs — BN254 + lattice-based (LatticeFold) in parallel
3. **Phase 3 (2029):** Full migration to lattice-based proofs when quantum threat materializes

No contract changes required for Phase 2 — the verifier interface accepts `bytes calldata proof` which is format-agnostic.

## Security Considerations

### Privacy Properties

| Property | Guarantee |
|----------|-----------|
| **Sender address** | Never appears on-chain; hidden behind Poseidon commitment |
| **Transaction amounts** | Never on-chain; only range proofs (below threshold) |
| **Individual transactions** | Never revealed; only aggregates (count, volume) |
| **Compliance status** | Binary (pass/fail); no details about why |
| **Reputation details** | Only "meets threshold" disclosed; exact scores hidden |
| **Model weights** | Never revealed; only model hash is public |
| **Inference inputs** | Never revealed; only input commitment is public |

### Soundness

- **PLONK proofs** are computationally sound under the BN254 discrete logarithm assumption (128-bit security)
- **SMT non-inclusion** proofs are complete — it is infeasible to prove exclusion of an included element
- **Poseidon hash chain** is collision-resistant — forging a valid accumulator requires breaking Poseidon
- **Nova IVC** (when deployed) inherits soundness from the underlying commitment scheme

### Known Attack Vectors

| Attack | Description | Mitigation |
|--------|-------------|------------|
| Fake exclusion proof | Claim non-sanctioned status while sanctioned | SMT verification enforced in circuit; root published by trusted oracle |
| Replay compliance | Reuse old compliance certificate | Certificate bound to `sanctionsRoot`; expires on root update |
| Reputation forgery | Submit fabricated transaction history | Accumulator must match value registered by trusted daemon |
| Front-running | Observe proof submission and act on it | Commitment hides all private inputs; proof reveals nothing beyond public signals |
| Temporal attack | Use expired certificate | On-chain expiry check: `block.timestamp < issuedAt + validity` |
| Sybil reputation | Create multiple agents with fake history | Each claim bound to `agentAddress`; daemon validates against real on-chain transactions |
| zkML forgery | Claim false model execution | Inference proof verified against registered model verification key |

### Trust Assumptions

1. **Sanctions oracle** — The entity updating `sanctionsRoot` is trusted to maintain an accurate OFAC list
2. **Reputation daemon** — The entity registering accumulator hashes is trusted to validate claims against real transactions
3. **BN254 security** — The discrete logarithm problem on BN254 is hard (standard assumption, used by Ethereum precompiles)
4. **Model registry** — Model hashes are registered by trusted parties (model developers or auditors)

## Reference Implementation

### Deployed Contracts (Tempo Moderato — Chain 42431)

| Contract | Address | Role |
|----------|---------|------|
| PlonkVerifierV2 | `0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B` | Proof verification engine |
| ComplianceVerifier | `0x4896f5797b59CC8EE5e942eBd0Ed6772af9131fF` | Compliance-specific verifier |
| ComplianceRegistry | `0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14` | Certificate storage + queries |
| ReputationVerifier | `0x2e2C368afB20810AadA9e6BB2Fb51002614F7Da4` | Reputation-specific verifier |
| ReputationRegistry | `0xF3296984cb8785Ab236322658c13051801E58875` | Score storage + queries |
| MPPComplianceGateway | `0x5F68F2A17a28b06A02A649cade5a666C49cb6B6d` | Session management |
| AIProofRegistry | `0x8fDB8E871c9eaF2955009566F41490Bbb128a014` | Inference attestation storage |

### Test Results

```
Compliance Circuit (4/4 passed)
  ✓ Valid proof — clean address, amounts within thresholds (~15s)
  ✓ Sanctioned address — proof generation fails (correct rejection)
  ✓ Over-limit amount — proof generation fails (correct rejection)
  ✓ Over-limit volume — proof generation fails (correct rejection)

Reputation Circuit (4/4 passed)
  ✓ Valid reputation — 10 txs, $50K volume, 0 disputes (~29s)
  ✓ Insufficient tx count — proof generation fails (correct rejection)
  ✓ Insufficient volume — proof generation fails (correct rejection)
  ✓ Non-zero disputes — proof generation fails (correct rejection)
```

### Performance

| Metric | Compliance | Reputation |
|--------|-----------|------------|
| Constraints | 13,591 | 41,265 |
| Proof generation (server) | ~15s | ~29s |
| Proof verification (off-chain) | ~17ms | ~25ms |
| Proof verification (on-chain) | ~280K gas | ~280K gas |
| Proof size | 24 field elements | 24 field elements |

## Test Vectors

### Compliance Proof — Valid Case

```json
{
  "description": "Clean address, amounts within thresholds",
  "inputs": {
    "senderAddress": "0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793",
    "secret": "987654321098765432109876543210",
    "amount": "5000000000",
    "cumulativeVolume": "8000000000",
    "amountThreshold": "10000000000",
    "volumeThreshold": "10000000000"
  },
  "expected": {
    "proofGenerated": true,
    "proofVerified": true,
    "publicSignals": ["sanctionsRoot", "commitment", "10000000000", "10000000000"]
  }
}
```

### Compliance Proof — Rejection Case

```json
{
  "description": "Amount exceeds threshold — circuit MUST reject",
  "inputs": {
    "senderAddress": "0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793",
    "secret": "987654321098765432109876543210",
    "amount": "15000000000",
    "cumulativeVolume": "8000000000",
    "amountThreshold": "10000000000",
    "volumeThreshold": "10000000000"
  },
  "expected": {
    "proofGenerated": false,
    "error": "constraint violation: amount >= amountThreshold"
  }
}
```

## References

- [Machine Payments Protocol (MPP)](https://paymentauth.org) — Base payment protocol
- [x402 Protocol](https://github.com/coinbase/x402) — HTTP 402 payment standard by Coinbase
- [Google AP2](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol) — Agent Payments Protocol
- [ERC-7683](https://www.erc7683.org) — Cross-chain intent standard
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) — Trustless Agent identity standard
- [Nova IVC](https://github.com/microsoft/Nova) — Folding scheme by Microsoft Research
- [HyperNova](https://eprint.iacr.org/2023/573) — Generalized folding for CCS
- [LatticeFold](https://link.springer.com/chapter/10.1007/978-981-95-5099-9_11) — Post-quantum folding (ASIACRYPT 2025)
- [EZKL](https://github.com/zkonduit/ezkl) — zkML proving framework
- [circomlib SMTVerifier](https://github.com/iden3/circomlib) — Sparse Merkle Tree library
- [Poseidon Hash](https://eprint.iacr.org/2019/458) — Arithmetic-friendly hash for ZK circuits
- [PLONK](https://eprint.iacr.org/2019/953) — Universal SNARK with no per-circuit setup
- [OFAC SDN List](https://sanctionssearch.ofac.treas.gov/) — U.S. sanctions database

## Copyright

This document is licensed under [MIT](../LICENSE).
