# Building the Trust Layer for Machine Payments

**By Agentic Finance | March 2026**

## The Problem No One Is Solving

Every machine payment protocol — x402, MPP, ACP, AP2 — solves the same problem: how agents pay. None of them solve a harder problem: **how agents trust each other while paying.**

When Agent A pays Agent B for an API call, three questions remain unanswered:

1. **Is Agent A sanctioned?** No protocol checks OFAC compliance for autonomous payments
2. **Is Agent B reliable?** No protocol provides verifiable reputation for agents
3. **Can we verify both without destroying privacy?** No protocol offers compliance + privacy simultaneously

Tornado Cash showed what happens when you build privacy without compliance: shutdown. Traditional KYC shows what happens when you build compliance without privacy: surveillance.

We built both.

## What We Built

### ZK Compliance Proofs

A Circom V2 circuit (13,591 constraints, PLONK) that proves:

- Sender address is NOT on the OFAC sanctions list (Sparse Merkle Tree, 20 levels, ~1M capacity)
- Transaction amount is below the AML reporting threshold
- 30-day cumulative volume is below the structuring threshold

All without revealing the sender's address, the transaction amount, or the cumulative volume.

**How it works:** The OFAC sanctions list is encoded as a Sparse Merkle Tree. The prover generates a non-inclusion proof showing their address is not a leaf in the tree. Simultaneously, range proofs verify amounts are below thresholds. A single PLONK proof covers all three checks. Verification takes 17ms on-chain.

### ZK Agent Reputation

A circuit (41,265 constraints) that proves aggregate transaction history:

- "I have completed at least N transactions"
- "My total volume exceeds $X"
- "I have zero disputes"

Without revealing any individual transaction. Uses a Poseidon hash chain accumulator — each transaction claim is hashed and chained, creating an append-only log. The final hash is registered on-chain. The proof verifies the chain is valid and the aggregate stats meet minimums.

This is the first verifiable reputation system for AI agents that preserves privacy.

### Proof Chaining for Micropayments

When agents make thousands of API calls per hour, individual on-chain settlement is economically impossible. Our proof chaining circuit batches 16 payments into a single proof, and each new proof validates all previous proofs in the chain.

Result: 10,000 micropayments settled with ~40 on-chain verifications instead of 10,000. Over 90% gas reduction.

### MPP Compliance Gateway

We bridged everything to the Machine Payments Protocol. When an MPP session is created, the gateway enforces that the agent holds a valid ZK compliance certificate. The session key is bound to the compliance commitment. Every payment in the session inherits the compliance guarantee.

## The Technical Stack

- **Circuits**: Circom V2 with Poseidon hashing on BN254
- **Proof System**: PLONK (no trusted setup via universal SRS)
- **Contracts**: Solidity 0.8.20, audited with Slither, CEI pattern enforced
- **Settlement**: Tempo L1 (Chain 42431)
- **SDK**: TypeScript, MCP Server, Express middleware

## Why This Matters

Simon Taylor's "Intention Layer" thesis argues that agents need payment infrastructure as native as HTTP. We agree — but add that agents also need **trust infrastructure** as native as TLS.

TLS proves "this server is who it claims to be." Our ZK Trust Layer proves "this agent is compliant, reputable, and legitimate" — without revealing who the agent is.

The economy runs on trust. We built it for machines.

## Numbers

| Metric | Value |
|--------|-------|
| Smart contracts deployed | 21+ |
| ZK circuit constraints | 96,121 total |
| Test coverage | 11/11 circuit tests passing |
| Proof generation | 15-29 seconds |
| On-chain verification | 17ms |
| Security audit | Slither (Trail of Bits) |
| Agents in marketplace | 50 |
| Supported protocols | x402, MPP, direct transfer |

## Links

- **Website**: [agt.finance](https://agt.finance)
- **GitHub**: [github.com/Agentic-Finance](https://github.com/Agentic-Finance/agentic-finance-protocol)
- **Specifications**: [ZK Trust Layer](https://github.com/Agentic-Finance/agentic-finance-protocol/blob/main/specs/draft-agtfi-zk-trust-00.md) | [Security Standard](https://github.com/Agentic-Finance/agentic-finance-protocol/blob/main/specs/draft-agtfi-security-standard-00.md)
- **Chain**: Tempo Moderato (42431)
