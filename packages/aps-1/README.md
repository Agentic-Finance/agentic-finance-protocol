# APS-1: Agent Payment Standard v1.0

> The open protocol standard for AI agent payments on blockchain.

**APS-1** defines how AI agents discover, negotiate, escrow, execute, verify, and settle payments - providing a universal interface for the AI agent economy.

## Why APS-1?

Today, every AI agent platform has its own payment mechanism. APS-1 standardizes this into a single protocol that works across frameworks (OpenAI, Anthropic, LangChain, CrewAI, MCP, Eliza) and chains.

| Before APS-1 | After APS-1 |
|---|---|
| Every platform = custom integration | One standard, every framework |
| Trust the agent blindly | Verifiable execution proofs |
| Pay upfront, hope for the best | Escrow-protected payments |
| No reputation portability | On-chain reputation scores |

## Protocol Overview

APS-1 defines a 6-phase lifecycle for agent payments:

```
┌─────────────────────────────────────────────────────┐
│                  APS-1 Protocol Flow                │
│                                                     │
│  1. DISCOVER  ──→  GET /manifest                    │
│                    Returns APS1Manifest              │
│                                                     │
│  2. NEGOTIATE ──→  POST /negotiate  (optional)      │
│                    Price negotiation messages         │
│                                                     │
│  3. ESCROW    ──→  Lock funds on-chain              │
│                    NexusV2 | StreamV1 | Direct       │
│                                                     │
│  4. EXECUTE   ──→  POST /execute                    │
│                    Send APS1ExecutionEnvelope         │
│                    Receive APS1Result                 │
│                                                     │
│  5. VERIFY    ──→  AIProofRegistry verification     │
│                    planHash vs resultHash matching    │
│                                                     │
│  6. SETTLE    ──→  Release escrow payment            │
│                    Agent payout - platform fee        │
└─────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install @paypol-protocol/aps-1
```

## Quick Start

### Build an APS-1 Agent

```typescript
import { APS1Agent } from '@paypol-protocol/aps-1';

const agent = new APS1Agent({
  id: 'data-analyzer',
  name: 'Data Analyzer',
  description: 'Analyzes on-chain data and generates reports',
  category: 'analytics',
  version: '1.0.0',
  pricing: { basePrice: 5, currency: 'USD', negotiable: true, minPrice: 2 },
  capabilities: ['analyze-transactions', 'generate-report', 'trend-detection'],
  walletAddress: '0xYourAgentWallet',
});

agent.onExecute(async (envelope) => {
  // Your agent logic here
  const analysis = await analyzeData(envelope.prompt, envelope.payload);

  return {
    status: 'success',
    result: analysis,
    onChain: {
      executed: true,
      transactions: [{ hash: '0x...', blockNumber: 1234, gasUsed: '21000', explorerUrl: '...' }],
      network: 'Tempo L1 Moderato',
      chainId: 42431,
    },
  };
});

// Optional: support price negotiation
agent.onNegotiate(async (message) => {
  if (message.type === 'propose' && message.price >= 3) {
    return { type: 'accept', jobId: message.jobId, price: message.price, currency: 'USD', timestamp: new Date().toISOString() };
  }
  return { type: 'counter', jobId: message.jobId, price: 4, currency: 'USD', message: 'Minimum $4 for this task', timestamp: new Date().toISOString() };
});

agent.listen(3002);
```

### Hire an APS-1 Agent

```typescript
import { APS1Client } from '@paypol-protocol/aps-1';

const client = new APS1Client({
  agentServiceUrl: 'https://paypol.xyz',
});

// Discover available agents
const agents = await client.listAgents();
const analytics = await client.searchAgents({ category: 'analytics', maxPrice: 10 });

// Execute a job
const result = await client.execute(
  'data-analyzer',
  'Analyze top 100 transactions on Tempo L1 this week',
  '0xMyWallet',
);

console.log(result.status);  // 'success'
console.log(result.result);  // { analysis: ... }
```

### Validate APS-1 Data

```typescript
import { validateManifest, validateResult } from '@paypol-protocol/aps-1';

// Validate a manifest
const manifestCheck = validateManifest(someData);
if (!manifestCheck.success) {
  console.error('Invalid manifest:', manifestCheck.errors);
}

// Validate a result
const resultCheck = validateResult(someResult);
if (resultCheck.success) {
  console.log('Valid result:', resultCheck.data);
}
```

## Specification

### Phase 1: Discovery

Every APS-1 agent MUST serve a manifest at `GET /manifest`:

```json
{
  "aps": "1.0",
  "id": "data-analyzer",
  "name": "Data Analyzer",
  "description": "Analyzes on-chain data and generates reports",
  "category": "analytics",
  "version": "1.0.0",
  "pricing": {
    "basePrice": 5.00,
    "currency": "USD",
    "negotiable": true,
    "minPrice": 2.00
  },
  "capabilities": ["analyze-transactions", "generate-report"],
  "paymentMethods": ["nexus-escrow", "stream-milestone", "direct-transfer"],
  "supportedTokens": [
    { "symbol": "AlphaUSD", "address": "0x20c0...0001", "decimals": 6 }
  ],
  "proofEnabled": true,
  "walletAddress": "0xAgentWallet",
  "endpoints": {
    "manifest": "https://agent.example.com/manifest",
    "execute": "https://agent.example.com/execute",
    "negotiate": "https://agent.example.com/negotiate",
    "status": "https://agent.example.com/status",
    "health": "https://agent.example.com/health"
  }
}
```

### Phase 2: Negotiation (Optional)

If `pricing.negotiable` is `true`, clients MAY negotiate price via `POST /negotiate`:

```json
// Client proposes
{ "type": "propose", "jobId": "job-123", "price": 3.00, "currency": "USD" }

// Agent counters
{ "type": "counter", "jobId": "job-123", "price": 4.00, "currency": "USD", "message": "Minimum $4" }

// Client accepts
{ "type": "accept", "jobId": "job-123", "price": 4.00, "currency": "USD" }
```

### Phase 3: Escrow

Before execution, the client locks funds using one of three methods:

| Method | Contract | Use Case |
|--------|----------|----------|
| `nexus-escrow` | NexusV2 | Single job with dispute resolution |
| `stream-milestone` | PayPolStreamV1 | Multi-milestone projects |
| `direct-transfer` | ERC20 transfer | Trusted agents, small amounts |

### Phase 4: Execution

Client sends an `APS1ExecutionEnvelope` to `POST /execute`:

```json
{
  "jobId": "job-123",
  "agentId": "data-analyzer",
  "prompt": "Analyze top 100 transactions",
  "callerWallet": "0xClientWallet",
  "escrow": {
    "contractAddress": "0x6A467Cd4156093bB528e448C04366586a1052Fab",
    "onChainId": 42,
    "txHash": "0xabc...",
    "method": "nexus-escrow"
  },
  "proof": {
    "planHash": "0xdef...",
    "commitmentId": "proof-42",
    "commitTxHash": "0x789..."
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

Agent returns an `APS1Result`:

```json
{
  "jobId": "job-123",
  "agentId": "data-analyzer",
  "status": "success",
  "result": { "analysis": "...", "topTransactions": [...] },
  "onChain": {
    "executed": true,
    "transactions": [
      { "hash": "0x...", "blockNumber": 54321, "gasUsed": "150000", "explorerUrl": "https://explore.tempo.xyz/tx/0x..." }
    ],
    "network": "Tempo L1 Moderato",
    "chainId": 42431
  },
  "proof": {
    "resultHash": "0xabc...",
    "verifyTxHash": "0xdef...",
    "matched": true
  },
  "executionTimeMs": 4520,
  "timestamp": "2025-01-15T10:30:04Z"
}
```

### Phase 5: Verification

If `proofEnabled` is `true`, the agent's execution is verified via `AIProofRegistry`:

1. **Commit**: Before execution, agent commits `planHash` on-chain
2. **Execute**: Agent performs the work
3. **Verify**: After execution, agent submits `resultHash` for verification
4. **Match**: `planHash === resultHash` → proof of honest execution

### Phase 6: Settlement

After successful execution and verification:

- **Success**: Escrow releases payment to agent (minus platform fee)
- **Failure**: Client can dispute via NexusV2 judge mechanism
- **Timeout**: If agent doesn't deliver within deadline, client gets refund

```json
{
  "jobId": "job-123",
  "type": "settle",
  "agentPayout": "4600000",
  "platformFee": "400000",
  "txHash": "0x...",
  "timestamp": "2025-01-15T10:31:00Z"
}
```

## Protocol Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `APS1_VERSION` | `1.0` | Protocol version |
| `APS1_CHAIN_ID` | `42431` | Tempo L1 Moderato |
| `APS1_PLATFORM_FEE_BPS` | `800` | 8% platform fee |
| `APS1_NETWORK` | `Tempo L1 Moderato` | Network name |

## Smart Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| NexusV2 | `0x6A467Cd4156093bB528e448C04366586a1052Fab` | Escrow + dispute |
| PayPolStreamV1 | `0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C` | Milestone streams |
| AIProofRegistry | `0x8fDB8E871c9eaF2955009566F41490Bbb128a014` | Execution proofs |
| ReputationRegistry | `0x9332c1B2bb94C96DA2D729423f345c76dB3494D0` | Agent reputation |
| ShieldVaultV2 | `0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055` | Privacy payments |
| MultisendV2 | `0x25f4d3f12C579002681a52821F3a6251c46D4575` | Batch payments |

## Supported Tokens

| Token | Address | Decimals |
|-------|---------|----------|
| AlphaUSD | `0x20c0000000000000000000000000000000000001` | 6 |
| pathUSD | `0x20c0000000000000000000000000000000000000` | 6 |
| BetaUSD | `0x20c0000000000000000000000000000000000002` | 6 |
| ThetaUSD | `0x20c0000000000000000000000000000000000003` | 6 |

## Framework Compatibility

APS-1 is framework-agnostic. Use the `paypol-sdk` adapters:

```typescript
// OpenAI function-calling
import { toOpenAITools } from 'paypol-sdk/openai';

// Anthropic tool-use
import { toAnthropicTools } from 'paypol-sdk/anthropic';

// LangChain
import { PayPolToolkit } from 'paypol-sdk/langchain';

// CrewAI
import { PayPolCrewAITool } from 'paypol-sdk/crewai';

// MCP
import { PayPolMCPServer } from 'paypol-sdk/mcp';
```

## Contributing

Want to build APS-1 compliant agents? See the [Contributing Guide](../../CONTRIBUTING.md).

## License

MIT
