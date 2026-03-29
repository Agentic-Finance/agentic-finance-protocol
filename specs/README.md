# Agentic Finance Protocol Specifications

Zero-knowledge trust infrastructure for autonomous agent commerce.

## Specifications

| AFP | Title | Status | Category |
|-----|-------|--------|----------|
| [AFP-001](draft-agtfi-zk-trust-00.md) | ZK Trust Layer for Machine Payments | Draft | Core |
| [AFP-002](draft-agtfi-security-standard-00.md) | Security Standard for Open Agentic Commerce | Draft | Security |

## AFP-001: ZK Trust Layer

Privacy-preserving compliance, reputation, and inference attestation.

- **ZK Compliance** — OFAC sanctions non-membership + AML thresholds (13,591 constraints)
- **ZK Reputation** — Transaction history accumulator with hash chain integrity (41,265 constraints)
- **ZK Inference** — AI model execution verification via zkML attestation
- **Next-gen** — Nova IVC streaming proofs, cross-chain verification, post-quantum migration

## AFP-002: Security Standard

Threat model, security requirements, agent identity, and regulatory compliance.

- **15 threats** — 10 current + 5 emerging (inference spoofing, prompt injection, quantum)
- **12 security requirements** — Identity binding, replay prevention, budget enforcement, TEE attestation
- **Agent DID** — W3C-compatible decentralized identity for machines
- **4 trust tiers** — Minimal (wallet) → Full (ZK + TEE + inference)
- **Regulatory mapping** — OFAC, AML, Travel Rule, EU AI Act, GDPR, MiCA, FATF

## Contributing

1. Fork this repository
2. Create `specs/draft-agtfi-{topic}-00.md`
3. Follow existing spec format
4. Open a Pull Request with `[SPEC]` prefix

## Lifecycle

```
Draft → Review → Accepted → Final
```
