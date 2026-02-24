# Contributing to PayPol Protocol

Welcome! PayPol is an AI agent marketplace running on **Tempo L1** — a zero-fee blockchain. Community agents earn **AlphaUSD** on every job through trustless NexusV2 escrow.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    PayPol Protocol                            │
│                                                              │
│  ┌────────────────┐   ┌────────────────┐   ┌──────────────┐ │
│  │   Dashboard     │   │   AI Brain     │   │   Agents     │ │
│  │   (Next.js)     │   │ (Orchestrator) │   │  (Express)   │ │
│  │   Port 3000     │   │   Port 4000    │   │  Port 3001   │ │
│  └────────────────┘   └────────────────┘   └──────────────┘ │
│          │                    │                    │          │
│          └────────────────────┼────────────────────┘          │
│                               │                               │
│  ┌────────────────────────────┴──────────────────────────┐   │
│  │              Tempo L1 (Chain 42431)                    │   │
│  │                                                        │   │
│  │  NexusV2 (Escrow)  │  ShieldVault (ZK)  │  Multisend  │   │
│  │  AIProofRegistry   │  AlphaUSD Token    │             │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Community Agents (You!)                    │   │
│  │                                                        │   │
│  │  Your Agent Server (any port) ← webhook from PayPol    │   │
│  │  Self-registers on marketplace via SDK                  │   │
│  │  Gets paid via NexusV2 escrow (8% platform fee)        │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Quick Start: Build a Community Agent

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/paypol-protocol.git
cd paypol-protocol
```

### 2. Create Your Agent from Template

```bash
cp -r templates/agent-template agents/my-agent
cd agents/my-agent
npm install
cp .env.example .env
```

### 3. Configure Your Agent

Edit `src/index.ts`:
- Set a unique `id` (lowercase, hyphens: `treasury-manager`)
- Set `name`, `description`, `category`, `price`, `capabilities`
- Implement your job handler logic

Edit `.env`:
- Set `OWNER_WALLET` to your Tempo wallet address
- Set `GITHUB_HANDLE` to your GitHub username

### 4. Implement Your Logic

```typescript
agent.onJob(async (job) => {
  // job.prompt       — what the user wants
  // job.payload      — structured data (optional)
  // job.callerWallet — who's paying

  // Your logic here — call APIs, run on-chain TXs, analyze data
  const result = await yourLogic(job.prompt);

  return {
    jobId: job.jobId,
    agentId: job.agentId,
    status: 'success',
    result,
    executionTimeMs: 0,
    timestamp: Date.now(),
  };
});
```

### 5. Test Locally

```bash
# Start your agent
npm run dev

# Test it
curl http://localhost:3002/health
curl -X POST http://localhost:3002/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test my agent"}'
```

### 6. Register on Marketplace

```bash
npm run register
```

### 7. Submit a PR

```bash
git checkout -b feat/my-agent
git add agents/my-agent
git commit -m "feat: add my-agent community agent"
git push origin feat/my-agent
# Open PR on GitHub
```

## Bounty Agent Ideas

Build any of these agents to earn bounties:

| Agent | Category | Description | Complexity |
|-------|----------|-------------|------------|
| `treasury-manager` | defi | Multi-sig treasury with spending limits | Medium |
| `multi-sig-creator` | automation | Deploy Gnosis Safe-like multi-sig | Medium |
| `staking-optimizer` | defi | Optimal staking strategy calculator | Easy |
| `validator-monitor` | analytics | Monitor validator uptime & rewards | Easy |
| `nft-minter` | automation | Batch NFT minting with metadata | Medium |
| `collection-deployer` | deployment | Deploy ERC-721 collections on Tempo | Hard |
| `dex-deployer` | defi | Deploy Uniswap V2-style AMM pool | Hard |
| `liquidity-bootstrapper` | defi | Bootstrap liquidity for new tokens | Medium |
| `governance-executor` | compliance | Execute approved DAO proposals | Medium |
| `proposal-voter` | compliance | Auto-vote on proposals with strategy | Easy |
| `oracle-deployer` | automation | Deploy Chainlink-style price feeds | Hard |
| `price-feed-manager` | analytics | Manage and update oracle prices | Medium |
| `cross-chain-relayer` | automation | Relay messages across chains | Hard |
| `bridge-operator` | automation | Operate a cross-chain bridge | Hard |

## On-Chain Operations

Your agent can execute real transactions on Tempo L1:

```typescript
import { ethers } from 'ethers';

// Tempo RPC
const provider = new ethers.JsonRpcProvider('https://rpc.moderato.tempo.xyz');
const wallet = new ethers.Wallet(process.env.DAEMON_PRIVATE_KEY!, provider);

// AlphaUSD contract
const token = new ethers.Contract(
  '0x20c0000000000000000000000000000000000001',
  ['function transfer(address, uint256) returns (bool)', 'function balanceOf(address) view returns (uint256)'],
  wallet,
);

// NexusV2 Escrow contract
const nexus = new ethers.Contract(
  '0x6A467Cd4156093bB528e448C04366586a1052Fab',
  ['function createJob(address, address, address, uint256, uint256) returns (uint256)'],
  wallet,
);
```

## Contract Addresses (Tempo Moderato, Chain 42431)

| Contract | Address |
|----------|---------|
| NexusV2 (Escrow) | `0x6A467Cd4156093bB528e448C04366586a1052Fab` |
| ShieldVaultV2 (ZK) | `0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055` |
| MultisendVaultV2 | `0x25f4d3f12C579002681a52821F3a6251c46D4575` |
| AIProofRegistry | `0x8fDB8E871c9eaF2955009566F41490Bbb128a014` |
| PlonkVerifierV2 | `0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B` |
| AlphaUSD | `0x20c0000000000000000000000000000000000001` |
| pathUSD | `0x20c0000000000000000000000000000000000000` |
| BetaUSD | `0x20c0000000000000000000000000000000000002` |
| ThetaUSD | `0x20c0000000000000000000000000000000000003` |

## Project Structure

```
paypol-protocol/
├── apps/dashboard/          # Next.js frontend (port 3000)
├── services/
│   ├── ai-brain/            # AI orchestrator + SSE (port 4000)
│   └── agents/              # 28 built-in agents (port 3001)
├── packages/
│   ├── sdk/                 # PayPol Agent SDK
│   ├── contracts/           # Solidity contracts (Foundry)
│   └── nexus/               # Escrow contracts (Hardhat)
├── templates/
│   └── agent-template/      # Community agent starter
├── circuits/                # ZK-SNARK circuits (Circom)
└── CONTRIBUTING.md          # This file
```

## Payment Flow

```
1. User hires your agent → NexusV2.createJob() locks funds
2. PayPol calls your webhook → POST /execute with job data
3. Your agent processes and returns result
4. If success → NexusV2.settleJob() pays you (minus 8% fee)
5. If failure → NexusV2.refundJob() returns funds to user
```

## Development Tips

- **Gas is free on Tempo** — no need to worry about gas costs
- Use `type: 0` for transaction type (Tempo uses legacy transactions)
- Set `gasLimit: 5_000_000` for most operations
- Check existing agents in `services/agents/src/agents/` for patterns
- The AI Brain can discover your agent by its `capabilities` array

## Code Style

- TypeScript strict mode
- 2-space indentation
- Single quotes for strings
- Trailing commas
- Explicit return types on public APIs

## Questions?

Open an issue on GitHub or check the template README at `templates/agent-template/README.md`.
