# Security Standard for Open Agentic Commerce

**Draft:** draft-agtfi-security-standard-00
**Status:** Proposed
**Authors:** Agentic Finance Team
**Date:** 2026-03-23
**License:** MIT

## Abstract

This document defines security requirements for open agent-to-agent
commerce systems. It addresses attack vectors that emerge when AI agents
transact autonomously at machine speed without human oversight.

Current protocols (x402, MPP, ACP) focus on payment mechanics but lack
security primitives for fraud prevention, identity verification, and
dispute resolution in agent-to-agent transactions.

## 1. Threat Model

### 1.1 Agent-Specific Threats

| Threat | Description | Impact |
|--------|-------------|--------|
| **Sybil Agents** | Attacker creates many fake agents to manipulate markets | Price manipulation, reputation gaming |
| **Stolen Session Keys** | MPP session key leaked → unauthorized spending | Financial loss for key owner |
| **Replay Attacks** | Resubmit old payment proof to get service twice | Double-spend, service theft |
| **Identity Fraud** | Agent impersonates another agent's reputation | Trust system compromise |
| **Sandwich Attacks** | Front-run agent payment to extract MEV | Financial loss for agent |
| **Compliance Evasion** | Structuring transactions to avoid AML thresholds | Regulatory violation |
| **Oracle Manipulation** | Feed false data to agents making financial decisions | Incorrect trades/payments |
| **Accumulator Forgery** | Submit fake reputation accumulator hash | False reputation claims |

### 1.2 Traditional Threats (Still Applicable)

| Threat | Mitigation in this standard |
|--------|----------------------------|
| Money laundering | ZK Compliance Proofs (OFAC + AML) |
| Double spending | Nullifier pattern (already in ShieldVaultV2) |
| Key compromise | Session key budgets + expiry |
| Smart contract bugs | Formal verification recommendations |

## 2. Security Requirements

### 2.1 MUST Requirements

Every compliant implementation MUST:

1. **SR-1: Identity Binding** — Agent identity MUST be bound to a
   cryptographic commitment that cannot be transferred or forged.
   Implementation: `commitment = Poseidon(address, secret)`

2. **SR-2: Replay Prevention** — Every payment proof MUST include a
   unique nullifier that is checked against an on-chain registry.
   Implementation: `nullifierHash = Poseidon(nullifier, secret)`

3. **SR-3: Budget Enforcement** — Session keys MUST enforce maximum
   spend limits that cannot be exceeded even if the key is compromised.
   Implementation: `session.spent + amount <= session.maxBudget`

4. **SR-4: Temporal Bounds** — All credentials MUST have an expiration
   timestamp. No perpetual authorization.
   Implementation: `block.timestamp < session.expiresAt`

5. **SR-5: Compliance Verification** — For transactions above the AML
   reporting threshold, the sender MUST prove OFAC non-membership via
   ZK proof before the transaction is processed.

### 2.2 SHOULD Requirements

Implementations SHOULD:

6. **SR-6: Reputation Gating** — Merchants SHOULD require minimum
   reputation scores for high-value transactions.

7. **SR-7: Rate Limiting** — Agents SHOULD be rate-limited to prevent
   spam and resource exhaustion attacks.

8. **SR-8: Dispute Resolution** — Agent-to-agent transactions SHOULD
   have an on-chain dispute mechanism with timeout-based resolution.

9. **SR-9: Audit Trail** — All payment events SHOULD emit indexed
   events for off-chain monitoring and forensics.

10. **SR-10: Graceful Degradation** — If the compliance registry is
    unavailable, the system SHOULD queue transactions rather than
    silently proceeding without verification.

## 3. Implementation Reference

### 3.1 Anti-Sybil via ZK Reputation

The ZK Agent Reputation system prevents Sybil attacks because:
- Creating fake reputation requires real on-chain transactions
- Each claim in the hash chain is bound to `agentAddress`
- The accumulator must be registered by a trusted daemon
- Forging the Poseidon hash chain is computationally infeasible

### 3.2 Session Key Security

MPPComplianceGateway enforces:
```
createCompliantSession():
  ├── Verify compliance certificate (ZK proof)
  ├── Optional: verify reputation score
  ├── Set maxBudget (hard cap)
  ├── Set expiresAt (temporal bound)
  └── Bind to complianceCommitment (identity)

recordPayment():
  ├── Check session.active
  ├── Check block.timestamp < expiresAt
  ├── Check spent + amount <= maxBudget
  └── Auto-close if budget exhausted
```

### 3.3 Compliance-as-a-Service

HTTP middleware flow:
```
Request → Check X-Compliance-Commitment header
  ├── Missing → 402 + X-Compliance-Required headers
  ├── Present → Verify on-chain via ComplianceRegistry
  │     ├── Valid → Pass to handler
  │     └── Invalid → 403 Forbidden
  └── Cache result (5 min TTL)
```

### 3.4 Anti-Double-Spend (Nullifier Pattern)

Already implemented in ShieldVaultV2:
```
1. commitment = Poseidon(secret, nullifier, amount, recipient)
2. nullifierHash = Poseidon(nullifier, secret)
3. On deposit: store commitment on-chain
4. On withdraw: check nullifierHash not used → mark as used
5. Same nullifierHash can never be used twice
```

## 4. Attack Resistance Matrix

| Attack | SR# | Mitigation | Status |
|--------|-----|-----------|--------|
| Sybil agents | SR-6 | ZK Reputation (real tx required) | Deployed |
| Stolen session keys | SR-3, SR-4 | Budget + expiry enforcement | Deployed |
| Replay attacks | SR-2 | Nullifier registry | Deployed |
| Identity fraud | SR-1 | Poseidon commitment binding | Deployed |
| Compliance evasion | SR-5 | ZK OFAC + AML proofs | Deployed |
| Accumulator forgery | SR-1 | Daemon-registered accumulators | Deployed |
| Front-running | SR-1 | Commitment hides address | Deployed |
| Structuring | SR-5 | Cumulative volume range proof | Deployed |

## 5. Deployed Infrastructure (Tempo Moderato 42431)

| Component | Address | SR Coverage |
|-----------|---------|-------------|
| ComplianceVerifier | `0x4896f5...9131fF` | SR-5 |
| ComplianceRegistry | `0x85F64F...bB8a14` | SR-5, SR-9 |
| ReputationVerifier | `0x2e2C36...F7Da4` | SR-6 |
| ReputationRegistry | `0xF32969...58875` | SR-1, SR-6, SR-9 |
| MPPComplianceGateway | `0x5F68F2...6B6d` | SR-3, SR-4 |
| ShieldVaultV2 | `0x3B4b47...e0055` | SR-2 |
| AgentDiscoveryRegistry | `0x74D79e0AEd3CF9aE9A325558940bB1c8fB8CeA47` | SR-6, SR-7 |

## 6. Compliance with Existing Regulations

| Regulation | How this standard addresses it |
|-----------|-------------------------------|
| **EU AI Act 2026** | Agent identity binding (SR-1), audit trail (SR-9) |
| **OFAC Sanctions** | ZK non-membership proof (SR-5) |
| **AML/BSA** | Amount + volume range proofs (SR-5) |
| **Travel Rule** | Compliance commitment links sender to proof |
| **GDPR** | ZK proofs — no personal data on-chain |

## 7. References

- [MPP Specification](https://paymentauth.org)
- [x402 Protocol](https://github.com/coinbase/x402)
- [a16z: Open Agentic Commerce](https://a16zcrypto.com/posts/article/open-agentic-commerce-end-ads/)
- [Simon Taylor: The Intention Layer](https://x.com/sytaylor/status/2034254522952957981)
- [EU AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689)
- [OFAC SDN List](https://sanctionssearch.ofac.treas.gov/)
