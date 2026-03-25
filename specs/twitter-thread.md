# Twitter/X Thread — Launch Announcement

## Thread 1: Main Launch

**1/8**
The Economy Runs on Trust. We Built It for Machines.

Introducing @AgenticFinance — the trust infrastructure for autonomous commerce.

ZK compliance. Verifiable reputation. Privacy-preserving payments.

All deployed. All tested. All open source.

🧵👇

**2/8**
The problem: Every agent payment protocol (x402, MPP, ACP) solves HOW agents pay.

None of them solve HOW agents TRUST each other while paying.

- Is this agent sanctioned? No check.
- Is this agent reliable? No proof.
- Can we verify without surveillance? No way.

Until now.

**3/8**
ZK Compliance Proofs:

Agents prove they're NOT on the OFAC sanctions list — without revealing their identity.

One PLONK proof covers:
✅ OFAC non-membership
✅ Amount < $10K AML threshold
✅ 30-day volume < reporting limit

Verification: 17ms.

**4/8**
ZK Agent Reputation — the world's first anonymous credit score for AI agents.

Prove: "I've completed 500 transactions, $50K volume, 0 disputes"

Without revealing a single transaction.

Poseidon hash chain + PLONK proofs. 41,265 constraints. 29 seconds to prove.

**5/8**
Proof Chaining for micropayments:

10,000 API calls → 16 payments per batch → chain proofs → settle with ~40 on-chain verifications.

90%+ gas savings. No recursive proofs needed. Works with existing Circom/snarkjs stack.

**6/8**
21+ smart contracts deployed on @tempo_xyz Moderato.
50 production agents in marketplace.
3 ZK circuits, all tests passing.
Audited with Slither.

Open source: github.com/Agentic-Finance/agentic-finance-protocol

**7/8**
We're proposing a ZK Trust Layer as an extension to MPP.

HTTP headers for compliance:
```
X-Compliance-Required: true
X-Reputation-Min-Tx: 10
```

Spec: draft-agtfi-zk-trust-00

Designed for IETF standardization alongside MPP.

**8/8**
Tornado Cash failed because it had NO compliance.
Traditional KYC fails because it has NO privacy.

We built both. Zero-knowledge compliance + privacy.

The economy runs on trust. We built it for machines.

🔗 agt.finance
📂 github.com/Agentic-Finance

---

## Thread 2: Technical Deep Dive

**1/5**
Technical deep dive: How we built ZK compliance proofs for agent payments 🧵

Our compliance circuit uses a Sparse Merkle Tree (20 levels, ~1M entry capacity) for OFAC non-membership proofs.

The prover generates a non-inclusion witness — proving their address is NOT a leaf in the sanctions tree.

**2/5**
The circuit simultaneously verifies:

1. Commitment = Poseidon(address, secret)
2. SMTVerifier(root, address, fnc=1) — non-inclusion
3. amount < amountThreshold — LessThan(64)
4. cumulativeVolume < volumeThreshold — LessThan(64)

13,591 constraints. PLONK proof. No trusted setup.

**3/5**
For agent reputation, we use a Poseidon hash chain accumulator:

claim[i] = Poseidon(agent, amount, timestamp, status)
acc[i] = Poseidon(claim[i], acc[i-1])

The final accumulator is registered on-chain.

Proof shows: acc is valid AND stats meet minimums AND disputes == 0.

**4/5**
We also built Compliance-as-a-Service middleware:

```typescript
app.use('/api', complianceMiddleware({
    registryAddress: '0x85F6...',
    rpcUrl: 'https://rpc.moderato.tempo.xyz',
}));
```

One line of code. Any x402/MPP server gets ZK compliance checking.

**5/5**
All circuits, contracts, and SDKs are open source under MIT license.

Contracts: Tempo Moderato (Chain 42431)
Tests: 11/11 passing
Audit: Slither + manual CEI review

github.com/Agentic-Finance/agentic-finance-protocol
