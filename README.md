<p align="center">
  <img src="apps/dashboard/public/logo-v2.png" alt="Agentic Finance" width="80" />
</p>

<h1 align="center">Agentic Finance</h1>

<p align="center">
  <strong>The Economy Runs on Trust. We Built It for Machines.</strong>
</p>

<p align="center">
  Privacy-preserving compliance · Verifiable reputation · Autonomous payments
</p>

<p align="center">
  <a href="https://agt.finance">Website</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#contracts">Contracts</a> ·
  <a href="#zk-circuits">ZK Circuits</a> ·
  <a href="specs/">Specifications</a>
</p>

---

## What is Agentic Finance?

Trust infrastructure for autonomous commerce. When AI agents transact at machine speed, they need:

1. **Privacy-preserving compliance** — Prove OFAC non-membership without revealing identity
2. **Verifiable reputation** — Prove transaction history without exposing individual trades
3. **Multi-protocol payments** — Pay across x402, MPP, and direct transfers with one SDK

Built with production ZK-SNARK circuits (Circom V2 + PLONK), 21+ deployed smart contracts, and developer-ready SDKs.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Application Layer                      │
│  Dashboard  ·  MCP Server  ·  REST API  ·  Agent SDK     │
├──────────────────────────────────────────────────────────┤
│                     Trust Layer                           │
│  ZK Compliance  ·  ZK Reputation  ·  Agent Discovery     │
├──────────────────────────────────────────────────────────┤
│                    Protocol Layer                         │
│  MPP Gateway  ·  Proof Chaining  ·  Escrow  ·  Streams   │
├──────────────────────────────────────────────────────────┤
│                    Settlement Layer                       │
│  Tempo L1 (Chain 42431)  ·  ShieldVault  ·  Multisend    │
└──────────────────────────────────────────────────────────┘
```

## Contracts

Deployed on **Tempo Moderato** (Chain 42431).

### Core Infrastructure

| Contract | Address | Purpose |
|----------|---------|---------|
| ShieldVaultV2 | `0x3B4b...0055` | ZK-shielded payments (PLONK) |
| NexusV2 | `0x6A46...2Fab` | Trustless escrow with disputes |
| MultisendV2 | `0x25f4...4575` | Batch token transfers |
| StreamV1 | `0x4fE3...36C` | Milestone-based payment streams |

### Trust Layer

| Contract | Address | Purpose |
|----------|---------|---------|
| ComplianceRegistry | `0x85F6...8a14` | ZK compliance certificates |
| ReputationRegistry | `0xF329...8875` | Anonymous agent credit scores |
| MPPComplianceGateway | `0x5F68...6B6d` | MPP sessions + compliance |
| AgentDiscoveryRegistry | `0x74D7...eA47` | Privacy-preserving marketplace |
| ProofChainSettlement | `0x0ED1...060D` | Incremental proof chaining |

## ZK Circuits

Circom V2 + PLONK (no trusted setup).

### Compliance (`agtfi_compliance.circom`)

Proves OFAC non-membership + AML thresholds without revealing private data.

- **Constraints**: 13,591
- **Proof time**: ~15s
- **Verification**: ~17ms

### Reputation (`agtfi_reputation.circom`)

First ZK reputation system for AI agents. Poseidon hash chain accumulator.

- **Constraints**: 41,265
- **Proof time**: ~29s
- **Max claims**: 32 per proof

### Proof Chain (`agtfi_proof_chain.circom`)

Incremental proof chaining — 16 payments per batch, 90%+ gas savings.

## SDK

```typescript
import { ZKPrivacy, AgentWallet } from '@agtfi/sdk';

const zk = new ZKPrivacy({ rpcUrl, complianceRegistry, reputationRegistry });
await zk.isCompliant(commitment);
await zk.meetsRequirements(agentCommitment, 10, 50000_000000);
```

### MCP Server

```bash
npx @agtfi/mcp-server
```

10 tools: `pay`, `get-balance`, `deploy-token`, `create-escrow`, `shield-payment`, `check-compliance`, `get-reputation`, `create-stream`, `create-payment-link`, `discover-agents`

### Compliance Middleware

```typescript
import { complianceMiddleware } from '@agtfi/sdk';

app.use('/api', complianceMiddleware({
  registryAddress: '0x85F6...',
  rpcUrl: 'https://rpc.moderato.tempo.xyz',
}));
```

## Tests

```
Compliance (4/4):  ✅ Valid  ✅ Sanctioned rejected  ✅ Over-limit  ✅ Volume
Reputation (4/4):  ✅ Valid  ✅ Low tx rejected      ✅ Low volume  ✅ Disputes
Proof Chain (3/3): ✅ Genesis  ✅ Chained  ✅ Wrong hash rejected
```

Audited with [Slither](https://github.com/crytic/slither). All high-severity findings resolved.

## Specifications

- [ZK Trust Layer](specs/draft-agtfi-zk-trust-00.md) — Proposed MPP extension
- [Security Standard](specs/draft-agtfi-security-standard-00.md) — For open agentic commerce

## Development

```bash
# Build contracts
cd packages/contracts && forge build

# Run ZK tests
cd packages/circuits && node test_compliance.mjs

# Audit
cd packages/contracts && slither .
```

## License

MIT
