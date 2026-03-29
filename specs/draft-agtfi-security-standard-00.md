---
afp: 002
title: "Security Standard for Open Agentic Commerce"
description: "Threat model, security requirements, agent identity, and regulatory compliance for autonomous machine-to-machine transactions"
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

This document defines security requirements for systems where AI agents transact autonomously at machine speed. It specifies a threat model, mandatory security requirements (MUST), recommended practices (SHOULD), agent identity framework, TEE attestation, and regulatory compliance mapping.

Current agent payment protocols focus on payment mechanics but lack security primitives for fraud prevention, identity verification, inference attestation, and dispute resolution. This standard fills that gap.

## Motivation

When AI agents control wallets and execute transactions without human oversight, new attack surfaces emerge that traditional payment security does not address:

- **Speed** — Agents transact in milliseconds; human-designed fraud detection cannot keep up
- **Autonomy** — No human reviews each transaction; security must be enforced programmatically
- **Scale** — A single agent may execute thousands of transactions per hour across multiple protocols
- **Identity** — Agents are pseudonymous; traditional KYC does not apply
- **Inference** — Agents claim to run specific AI models; these claims are unverifiable without cryptographic proof
- **Liability** — When an autonomous agent causes financial harm, the liability chain is unclear

This standard provides a security framework specifically designed for these constraints.

### Design Principles

1. **Defense in depth** — Multiple independent security layers, each sufficient to prevent a class of attacks
2. **Minimal trust** — Reduce trust assumptions to cryptographic primitives where possible
3. **Graceful degradation** — System MUST remain safe (not necessarily live) when components fail
4. **Auditability** — Every state transition MUST emit events for off-chain monitoring
5. **Future-proof** — Framework MUST accommodate post-quantum cryptography and new regulatory requirements

## Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

- **Agent** — An autonomous AI system that controls a wallet and executes transactions without per-transaction human approval
- **Controller** — The human or DAO that deployed and is responsible for an agent
- **Commitment** — `Poseidon(address, secret)` — a pseudonymous on-chain identifier
- **Session** — A time-bounded, budget-capped authorization for an agent to transact
- **TEE** — Trusted Execution Environment (Intel SGX, AMD SEV-SNP, ARM CCA)
- **DID** — Decentralized Identifier (W3C standard)
- **VC** — Verifiable Credential (W3C standard)
- **KYA** — Know Your Agent: provenance, permissions, and behavioral profile

## Specification

### 1. Threat Model

#### 1.1 Agent-Specific Threats

| ID | Threat | Description | Impact | Likelihood |
|----|--------|-------------|--------|------------|
| T-1 | **Sybil agents** | Attacker creates many fake agents to manipulate reputation, pricing, or marketplace rankings | Reputation gaming, price manipulation | High |
| T-2 | **Session key theft** | MPP session key compromised via memory dump, log leak, or supply chain attack | Unauthorized spending up to session budget | Medium |
| T-3 | **Replay attack** | Resubmit a previously valid payment proof to claim service twice | Double-spend, service theft | Medium |
| T-4 | **Identity impersonation** | Agent claims another agent's reputation commitment | Trust system compromise | Low |
| T-5 | **Sandwich attack** | Front-run agent payment transaction to extract MEV | Financial loss for agent | High |
| T-6 | **Compliance evasion** | Structure transactions below AML thresholds to avoid detection | Regulatory violation | Medium |
| T-7 | **Oracle manipulation** | Feed false data to agents making financial decisions | Incorrect trades, losses | Medium |
| T-8 | **Accumulator forgery** | Submit fabricated reputation hash chain | False reputation claims | Low |
| T-9 | **Proof grinding** | Generate many proofs with different random inputs | Bypass compliance checks | Negligible |
| T-10 | **Denial of service** | Flood contract with invalid proofs to exhaust gas | Service disruption | Medium |

#### 1.2 Emerging Threats (2026-2030)

| ID | Threat | Description | Impact | Mitigation |
|----|--------|-------------|--------|------------|
| T-11 | **Inference spoofing** | Agent claims to run GPT-4 but runs a cheaper model | Service quality fraud | ZK inference attestation (AFP-001 §3) |
| T-12 | **Prompt injection on payments** | Malicious content in payment memos triggers unintended agent behavior | Unauthorized transactions | Input sanitization + spend policy enforcement |
| T-13 | **Cross-chain replay** | Valid proof on chain A replayed on chain B | Double-spend across chains | Chain ID binding in all proofs |
| T-14 | **Model poisoning** | Agent's underlying model manipulated to authorize malicious payments | Financial loss at scale | TEE attestation + model hash verification |
| T-15 | **Quantum attack** | Future quantum computer breaks BN254 proofs | Forge compliance/reputation | Post-quantum migration path (AFP-001 §5.4) |

#### 1.3 Inherited Threats

| Threat | Mitigation in this standard |
|--------|----------------------------|
| Money laundering | ZK Compliance Proofs (AFP-001 §1) |
| Double spending | Nullifier pattern (§2.2, SR-2) |
| Key compromise | Session budgets + expiry (§2.3, SR-3/SR-4) |
| Smart contract bugs | Audit requirements + CEI pattern (§4.5) |
| Reentrancy | ReentrancyGuard on all state-changing functions (§4.5) |

### 2. Security Requirements

#### 2.1 MUST Requirements

These are mandatory. A non-compliant implementation MUST NOT claim conformance with this standard.

**SR-1: Identity Binding**

Agent identity MUST be bound to a cryptographic commitment that is:
- **Non-transferable** — Derived from `agentAddress`, which only the key holder controls
- **Non-forgeable** — Includes a random `secret` known only to the agent
- **Deterministic** — Same inputs always produce the same commitment

```
commitment = Poseidon(agentAddress, secret)
```

**SR-2: Replay Prevention**

Every shielded payment MUST include a unique nullifier:

```
nullifierHash = Poseidon(nullifier, secret)

On withdraw:
  REQUIRE(!nullifierUsed[nullifierHash])
  nullifierUsed[nullifierHash] = true
```

**SR-3: Budget Enforcement**

Session keys MUST enforce a maximum spend limit that is checked on every payment:

```
REQUIRE(session.spent + amount <= session.maxBudget)
session.spent += amount
```

The `maxBudget` MUST be set at session creation and MUST NOT be modifiable after creation.

**SR-4: Temporal Bounds**

All credentials MUST have an expiration timestamp:

```
REQUIRE(block.timestamp < credential.expiresAt)
```

Maximum validity periods:
| Credential | Maximum | Recommended |
|-----------|---------|-------------|
| Session keys | 24 hours | 1 hour |
| Compliance certificates | 30 days | 7 days |
| Reputation proofs | 90 days | 30 days |
| TEE attestations | 7 days | 24 hours |
| Inference attestations | 24 hours | 1 hour |

**SR-5: Compliance Verification**

For transactions above the configurable AML threshold, the sender MUST provide a valid ZK compliance proof. The check MUST occur before settlement.

**SR-6: Chain ID Binding**

All proofs and credentials MUST include the chain ID to prevent cross-chain replay:

```
proofInput.chainId === block.chainid
```

#### 2.2 SHOULD Requirements

**SR-7: Reputation Gating**

Merchants SHOULD require minimum reputation scores for:
- Transactions above a configurable value threshold
- Access to premium or rate-limited APIs
- Participation in escrow-based job marketplaces

**SR-8: Rate Limiting**

Implementations SHOULD enforce rate limits:
| Operation | Recommended Limit |
|-----------|------------------|
| Proof submissions | 10 per commitment per hour |
| Session creations | 5 per address per hour |
| Agent registrations | 1 per address per day |

**SR-9: Dispute Resolution**

Agent-to-agent transactions involving escrow SHOULD provide:
- A designated judge address with authority to resolve disputes
- A timeout period after which the payer can reclaim funds
- Event emission for all dispute state transitions

**SR-10: Audit Trail**

All payment events SHOULD emit indexed Solidity events:

```solidity
event ComplianceCertified(uint256 indexed commitment, uint256 sanctionsRoot, uint256 timestamp);
event ReputationVerified(uint256 indexed agentCommitment, uint256 txCount, uint256 volume);
event SessionCreated(bytes32 indexed sessionId, uint256 maxBudget, uint256 expiresAt);
event PaymentRecorded(bytes32 indexed sessionId, uint256 amount, uint256 remaining);
event TEEAttestationVerified(address indexed agent, bytes32 enclaveHash, uint256 timestamp);
event InferenceAttested(uint256 indexed agentCommitment, bytes32 modelHash, uint256 timestamp);
```

**SR-11: Graceful Degradation**

If the compliance registry is unavailable:
- The system SHOULD queue transactions for later verification
- The system MUST NOT silently process unverified transactions
- The system SHOULD return HTTP 503 with `Retry-After` header

**SR-12: Inference Verification**

For high-value API calls (above a configurable threshold), merchants SHOULD require ZK inference attestation proving the agent executed a registered model.

### 3. Agent Identity Framework

#### 3.1 Know Your Agent (KYA)

Every agent operating in the Agentic Finance ecosystem SHOULD maintain a KYA profile with five checkpoints:

| Checkpoint | Description | Verification |
|-----------|-------------|--------------|
| **Provenance** | Who deployed this agent? | Controller address on-chain |
| **Identity** | Cryptographic commitment | `Poseidon(address, secret)` |
| **Permissions** | What can this agent do? | Spend policy on-chain |
| **Behavior** | Historical transaction patterns | ZK reputation proof |
| **Attestation** | Hardware/model verification | TEE report + inference proof |

#### 3.2 Agent DID (Decentralized Identifier)

Agents MAY register a W3C DID anchored on Tempo L1 for cross-protocol identity:

```solidity
interface IAgentDID {
    struct AgentIdentity {
        bytes32 didHash;             // keccak256(DID Document)
        address controller;          // Human or DAO controller
        uint256 complianceCommitment; // Links to ZK trust layer
        uint256 reputationCommitment;
        uint256 registeredAt;
        bool active;
    }

    /// @notice Register an agent DID
    function registerDID(
        bytes32 didHash,
        uint256 complianceCommitment,
        uint256 reputationCommitment
    ) external returns (bytes32);

    /// @notice Resolve an agent DID
    function resolveDID(bytes32 didHash) external view returns (AgentIdentity memory);

    /// @notice Deactivate an agent (controller only)
    function deactivateAgent(bytes32 didHash) external;
}
```

#### 3.3 Spend Policy

Every agent wallet SHOULD enforce a programmable spend policy:

```solidity
struct SpendPolicy {
    uint256 maxPerTransaction;       // Max single payment
    uint256 maxPerDay;               // Daily spending cap
    uint256 maxPerMonth;             // Monthly spending cap
    address[] allowedRecipients;     // Whitelist (empty = any)
    address[] allowedTokens;         // Allowed payment tokens
    bool requireComplianceProof;     // Require ZK compliance per tx
    bool requireTEEAttestation;      // Require TEE hardware proof
    address killSwitch;              // Emergency stop authority
}
```

### 4. TEE Attestation

#### 4.1 Architecture

Agents running in Trusted Execution Environments (TEE) can provide hardware-signed attestation alongside ZK proofs, creating a dual-layer trust model:

```
Agent Code ──► TEE Enclave ──► Remote Attestation ──► On-Chain Verification
                    │
                    ├── Sealed secrets (keys never leave enclave)
                    ├── Code integrity (hash verified by hardware)
                    └── Memory isolation (data protected from host OS)
```

#### 4.2 On-Chain Interface

```solidity
interface ITEERegistry {
    struct TEEReport {
        bytes32 enclaveCodeHash;     // Hash of agent code in enclave
        bytes32 enclaveDataHash;     // Hash of sealed data
        bytes attestationSignature;  // Hardware-signed attestation
        uint256 timestamp;
        uint8 teeType;               // 0=SGX, 1=TDX, 2=SEV-SNP, 3=ARM CCA
    }

    /// @notice Verify and register a TEE attestation
    function verifyTEEAttestation(
        address agent,
        TEEReport calldata report,
        bytes calldata platformCert
    ) external returns (bool);

    /// @notice Check if an agent has a valid TEE attestation
    function hasTEEAttestation(address agent) external view returns (
        bool valid,
        bytes32 enclaveHash,
        uint256 attestedAt,
        uint8 teeType
    );
}
```

#### 4.3 Trust Tiers

Implementations SHOULD support graduated trust based on available attestations:

| Tier | Requirements | Trust Level | Use Case |
|------|-------------|-------------|----------|
| **Tier 0** | Wallet signature only | Minimal | Micro-payments (<$1) |
| **Tier 1** | ZK Compliance proof | Standard | Normal payments |
| **Tier 2** | ZK Compliance + ZK Reputation | Enhanced | High-value transactions |
| **Tier 3** | Tier 2 + TEE attestation | Maximum | Institutional / regulated |
| **Tier 4** | Tier 3 + ZK Inference attestation | Full | Mission-critical AI services |

### 5. Implementation Reference

#### 5.1 Anti-Sybil via ZK Reputation

The ZK reputation system mitigates Sybil attacks (T-1):

1. **Real cost** — Creating fake reputation requires real on-chain transactions with real tokens
2. **Identity binding** — Each claim bound to `agentAddress` (SR-1)
3. **Trusted registration** — Accumulator hashes validated by daemon against actual blockchain transactions
4. **Hash chain integrity** — Poseidon hash chain is computationally infeasible to forge (128-bit)

#### 5.2 Session Key Security

```
createCompliantSession(commitment, reputation, token, budget, duration):
  1. Verify ComplianceRegistry.isCompliant(commitment)     // SR-5
  2. If reputation != 0: verify ReputationRegistry(...)    // SR-7
  3. Store session with maxBudget (immutable)               // SR-3
  4. Store expiresAt = block.timestamp + duration            // SR-4
  5. Bind session to complianceCommitment                   // SR-1
  6. Emit SessionCreated event                              // SR-10
```

#### 5.3 Compliance Middleware (HTTP)

```
Incoming request
  │
  ├─ X-Compliance-Commitment present?
  │    ├─ No  → Return 402 with X-Trust-Required headers
  │    └─ Yes → ComplianceRegistry.isCompliant(commitment)
  │              ├─ True  → Check reputation requirements
  │              │           ├─ Pass → Process payment → 200
  │              │           └─ Fail → 403 X-Trust-Error: reputation_insufficient
  │              ├─ False → 403 X-Trust-Error: compliance_invalid
  │              └─ Error → 503 Service Unavailable (SR-11)
  │
  └─ Cache compliance status (TTL: 5 minutes)
```

#### 5.4 Nullifier Pattern (Anti-Double-Spend)

```
Deposit:
  commitment = Poseidon(secret, nullifier, amount, recipient)
  commitments[commitment] = true

Withdraw:
  1. Verify ZK proof (proves knowledge of preimage)
  2. nullifierHash = Poseidon(nullifier, secret)
  3. REQUIRE(!nullifierUsed[nullifierHash])  // SR-2
  4. nullifierUsed[nullifierHash] = true
  5. Transfer tokens to recipient
```

#### 5.5 Smart Contract Security Patterns

All contracts MUST follow:

- **CEI Pattern** — Checks-Effects-Interactions ordering
- **ReentrancyGuard** — On all state-changing functions
- **SafeERC20** — Safe wrappers for token transfers
- **Ownable** — Access control on administrative functions
- **Input validation** — All external inputs validated before processing

### 6. Attack Resistance Matrix

| Threat | SR | Mitigation | Contract | Status |
|--------|-----|-----------|----------|--------|
| T-1: Sybil agents | SR-7 | ZK Reputation (real tx cost) | ReputationRegistry | Deployed |
| T-2: Session key theft | SR-3, SR-4 | Budget cap + expiry | MPPComplianceGateway | Deployed |
| T-3: Replay attack | SR-2 | Nullifier registry | ShieldVaultV2 | Deployed |
| T-4: Identity fraud | SR-1 | Poseidon commitment binding | All registries | Deployed |
| T-5: Sandwich attack | SR-1 | Commitment hides inputs | Commitment scheme | Deployed |
| T-6: Compliance evasion | SR-5 | Cumulative volume proofs | ComplianceRegistry | Deployed |
| T-7: Oracle manipulation | SR-11 | Graceful degradation | Middleware | Implemented |
| T-8: Accumulator forgery | SR-1 | Daemon-registered values | ReputationRegistry | Deployed |
| T-9: Proof grinding | — | PLONK soundness (128-bit) | PlonkVerifierV2 | Deployed |
| T-10: Denial of service | SR-8 | Rate limiting | Application layer | Recommended |
| T-11: Inference spoofing | SR-12 | ZK inference attestation | InferenceRegistry | Planned |
| T-12: Prompt injection | SR-3 | Spend policy enforcement | AgentWallet | Planned |
| T-13: Cross-chain replay | SR-6 | Chain ID binding | All proofs | Deployed |
| T-14: Model poisoning | SR-12 | TEE + model hash | TEERegistry | Planned |
| T-15: Quantum attack | — | Post-quantum migration | LatticeFold verifier | Roadmap |

### 7. Regulatory Compliance

| Regulation | SRs | How this standard addresses it |
|-----------|-----|-------------------------------|
| **OFAC Sanctions** | SR-5 | ZK non-membership proof against sanctions Merkle tree |
| **AML/BSA** | SR-5 | Per-transaction and cumulative volume range proofs |
| **Travel Rule** | SR-1, SR-10 | Compliance commitment links sender to verifiable proof; events provide audit trail |
| **EU AI Act (2024/1689)** | SR-1, SR-10, SR-12 | Agent identity binding; event logging; inference attestation for AI model traceability |
| **GDPR** | SR-5 | ZK proofs disclose no personal data; compliance is verifiable without identity |
| **MiCA** | SR-3, SR-4 | Transaction limits and temporal bounds align with custody requirements |
| **FATF Travel Rule** | SR-1, SR-5, SR-6 | ZK compliance proof satisfies sender verification; chain ID prevents cross-jurisdiction replay |
| **SEC/CFTC** | SR-10 | On-chain audit trail for every agent action creating financial liability |

### 8. Roadmap

#### Phase 1: ZK Trust Foundation

- [x] ZK Compliance proofs (OFAC + AML) — 13,591 constraints, PLONK
- [x] ZK Reputation proofs (history + volume) — 41,265 constraints, Poseidon accumulator
- [x] Nullifier-based anti-double-spend (ShieldVaultV2)
- [x] Session budget enforcement (MPPComplianceGateway)
- [x] On-chain event audit trail
- [x] 9 core contracts deployed on Tempo L1

#### Phase 2: Identity & Attestation

- [x] Agent DID Registry — W3C-compatible, Verifiable Credentials
- [x] Agent Spend Policy — Per-tx/daily/monthly caps, kill switch, recipient whitelist
- [x] TEE Registry — Intel SGX, AMD SEV-SNP, ARM CCA attestation
- [x] Inference Registry — zkML attestation for AI model verification
- [x] Know Your Agent (KYA) — 5-checkpoint composite trust assessment
- [x] 4-tier graduated trust model

#### Phase 3: Protocol Interoperability

- [ ] x402 facilitator integration (Coinbase payment protocol)
- [ ] ERC-8004 compatibility layer
- [ ] Google AP2 payment rail adapter
- [ ] Cross-protocol credential portability (VC exchange)
- [ ] Multi-chain DID resolution

#### Phase 4: Streaming Proofs & Verified Compute

- [ ] Nova IVC folding for streaming payment proofs
- [ ] Client-side WASM proving (browser + mobile)
- [ ] EigenLayer AVS registration for daemon security
- [ ] Optimistic zkML (challenge-based inference verification)
- [ ] Recursive proof composition (proof-of-proofs)

#### Phase 5: Cross-Chain Trust

- [ ] Cross-chain trust verification via SP1 state proofs
- [ ] Intent-based payments (ERC-7683 solver network)
- [ ] zkEmail / TLSNotary bridges for fiat payment verification
- [ ] Multi-chain reputation aggregation
- [ ] Bridge-less trust transfer between chains

#### Phase 6: Post-Quantum & Autonomous Governance

- [ ] LatticeFold migration for post-quantum proof security
- [ ] Privacy-preserving regulatory reporting (recursive ZK proofs)
- [ ] Autonomous agent liability framework (on-chain dispute resolution)
- [ ] Decentralized oracle network for sanctions list updates
- [ ] Full intent-based architecture with permissionless solver network

## Deployed Infrastructure

| Component | Address (Tempo 42431) | SR Coverage |
|-----------|----------------------|-------------|
| ComplianceVerifier | `0x4896f5797b59CC8EE5e942eBd0Ed6772af9131fF` | SR-5 |
| ComplianceRegistry | `0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14` | SR-5, SR-10 |
| ReputationVerifier | `0x2e2C368afB20810AadA9e6BB2Fb51002614F7Da4` | SR-7 |
| ReputationRegistry | `0xF3296984cb8785Ab236322658c13051801E58875` | SR-1, SR-7, SR-10 |
| MPPComplianceGateway | `0x5F68F2A17a28b06A02A649cade5a666C49cb6B6d` | SR-3, SR-4 |
| ShieldVaultV2 | `0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055` | SR-2 |
| NexusV2 | `0x6A467Cd4156093bB528e448C04366586a1052Fab` | SR-9 |
| AgentDiscoveryRegistry | `0x74D79e0AEd3CF9aE9A325558940bB1c8fB8CeA47` | SR-7, SR-8 |
| AIProofRegistry | `0x8fDB8E871c9eaF2955009566F41490Bbb128a014` | SR-12 |

## References

- [AFP-001: ZK Trust Layer](draft-agtfi-zk-trust-00.md) — ZK compliance and reputation proofs
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) — Key words for use in RFCs
- [Machine Payments Protocol (MPP)](https://paymentauth.org) — Base payment protocol
- [x402 Protocol](https://github.com/coinbase/x402) — HTTP 402 payment standard
- [Google AP2](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol) — Agent Payments Protocol
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) — Trustless Agent identity standard
- [ERC-7683](https://www.erc7683.org) — Cross-chain intent standard
- [W3C DID](https://www.w3.org/TR/did-core/) — Decentralized Identifiers
- [W3C Verifiable Credentials 2.0](https://www.w3.org/press-releases/2025/verifiable-credentials-2-0/) — Machine-readable credentials
- [EigenLayer AVS](https://docs.eigenlayer.xyz/) — Actively Validated Services
- [Phala TEE Agents](https://phala.com/solutions/ai-agents) — TEE-secured agent infrastructure
- [TLSNotary](https://tlsnotary.org/) — HTTPS data verification
- [zkEmail](https://docs.zk.email/zk-email-verifier/) — DKIM-based email proofs
- [a16z: Open Agentic Commerce](https://a16zcrypto.com/posts/article/open-agentic-commerce-end-ads/) — Ecosystem context
- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) — Security primitives
- [EU AI Act (2024/1689)](https://eur-lex.europa.eu/eli/reg/2024/1689) — AI regulatory framework
- [MiCA Regulation](https://sumsub.com/blog/crypto-regulations-in-the-european-union-markets-in-crypto-assets-mica/) — EU crypto regulation
- [OFAC SDN List](https://sanctionssearch.ofac.treas.gov/) — U.S. sanctions database
- [Slither](https://github.com/crytic/slither) — Static analysis tool

## Copyright

This document is licensed under [MIT](../LICENSE).
