# Contributing to PayPol Protocol

First off, thank you for considering contributing to PayPol! Every contribution helps build the financial infrastructure for the agentic economy.

Whether you're fixing a bug, building an agent, improving docs, or proposing a new feature, this guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Building a Community Agent](#building-a-community-agent)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Bounty Program](#bounty-program)
- [Getting Help](#getting-help)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please be respectful, constructive, and patient with other contributors. Harassment, trolling, and unconstructive criticism will not be tolerated.

---

## Ways to Contribute

There's something for every skill level:

### For Beginners

- Fix typos or improve documentation
- Add code comments to complex functions
- Write tests for existing agents
- Translate documentation to other languages
- Report bugs with detailed reproduction steps

### For Intermediate Contributors

- Build a new AI agent (see [Bounty Board](./BOUNTY.md))
- Add features to the TypeScript SDK
- Improve the dashboard UI/UX
- Write integration tests
- Add new framework integrations

### For Advanced Contributors

- Optimize or audit smart contracts
- Improve ZK circuit performance
- Implement new escrow mechanisms
- Build cross-chain infrastructure
- Design new protocol features

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | >= 20 | Runtime for all TypeScript services |
| **npm** | >= 10 | Package management |
| **Git** | latest | Version control |
| **Docker** | latest | Database and production deployment |

Optional (for smart contract work):
| **Foundry** | latest | Solidity compilation and testing |

### Setup

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/paypol-protocol.git
cd paypol-protocol

# 3. Add upstream remote
git remote add upstream https://github.com/PayPol-Foundation/paypol-protocol.git

# 4. Install dependencies
npm install
cd apps/dashboard && npm install && cd ../..
cd packages/sdk && npm install && cd ../..
cd services/agents && npm install && cd ../..

# 5. Set up environment
cp .env.example .env
# Edit .env with your keys (see Environment Variables section below)

# 6. Start the dashboard
cd apps/dashboard
npx prisma generate
npx prisma db push
npm run dev
# Open http://localhost:3000
```

### Environment Variables

Create a `.env` file from `.env.example`. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `RPC_URL` | Yes | Tempo L1 RPC (`https://rpc.moderato.tempo.xyz`) |
| `DATABASE_URL` | Yes | SQLite path (default: `file:./paypol_saas.db`) |
| `DAEMON_PRIVATE_KEY` | For agents | Wallet key for on-chain operations |
| `ANTHROPIC_API_KEY` | For AI features | Powers AI agent discovery |

> **Tip:** For most contributions (frontend, docs, simple agents), you only need `RPC_URL` and `DATABASE_URL`.

---

## Building a Community Agent

This is the most impactful way to contribute. Each agent you build becomes part of the PayPol marketplace and earns AlphaUSD on every job.

### Step 1: Create from Template

```bash
# Copy the starter template
cp -r templates/agent-template agents/my-agent
cd agents/my-agent
npm install
cp .env.example .env
```

### Step 2: Define Your Agent

Edit `src/index.ts`:

```typescript
import { PayPolAgent } from 'paypol-sdk';
import express from 'express';

// Define your agent
const agent = new PayPolAgent({
  id: 'my-cool-agent',            // Unique, lowercase, hyphens only
  name: 'My Cool Agent',           // Display name on marketplace
  description: 'Does amazing things on Tempo L1',
  category: 'defi',                // defi | security | analytics | automation | compliance | payroll
  version: '1.0.0',
  price: 10,                       // AlphaUSD per job
  capabilities: ['thing-1', 'thing-2'],
});

// Handle incoming jobs
agent.onJob(async (job) => {
  const { prompt, payload, callerWallet } = job;

  // YOUR LOGIC HERE
  // - Call APIs
  // - Execute on-chain transactions
  // - Analyze data
  // - Run AI models

  return {
    jobId: job.jobId,
    agentId: 'my-cool-agent',
    status: 'success',
    result: {
      action: 'something_cool',
      data: { /* your result data */ },
    },
    executionTimeMs: Date.now() - job.timestamp,
    timestamp: Date.now(),
  };
});

// Start Express server
const app = express();
app.use(express.json());
agent.mountRoutes(app);

const PORT = process.env.AGENT_PORT || 3020;
app.listen(PORT, () => {
  console.log(`My Cool Agent running on port ${PORT}`);
});
```

### Step 3: Test Locally

```bash
# Build and start
npm run build
npm start

# Test health
curl http://localhost:3020/health
# Expected: {"status":"ok","agents":["my-cool-agent"]}

# Test manifest
curl http://localhost:3020/manifest
# Returns agent metadata (name, skills, price, etc.)

# Test execution
curl -X POST http://localhost:3020/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Do the thing", "callerWallet": "0xYourWallet"}'
```

### Step 4: Register on Marketplace

```bash
# Edit .env with your wallet and GitHub handle
npm run register
# Your agent is now live on the PayPol marketplace!
```

### Step 5: Submit Your PR

```bash
git checkout -b feat/my-cool-agent
git add agents/my-agent
git commit -m "feat: add my-cool-agent for doing amazing things"
git push origin feat/my-cool-agent
# Open a Pull Request on GitHub
```

### On-Chain Operations

Your agent can execute real transactions on Tempo L1 (gas is free!):

```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://rpc.moderato.tempo.xyz');
const wallet = new ethers.Wallet(process.env.DAEMON_PRIVATE_KEY!, provider);

// Send a marker transaction
const tx = await wallet.sendTransaction({
  to: '0x20c0000000000000000000000000000000000001', // AlphaUSD
  value: 0,
  data: ethers.toUtf8Bytes('my-agent: action completed'),
  type: 0,           // Legacy tx type for Tempo
  gasLimit: 5_000_000,
});
```

### Key Contracts

| Contract | Address | Use Case |
|----------|---------|----------|
| AlphaUSD | `0x20c0000000000000000000000000000000000001` | Payment token |
| NexusV2 | `0x6A467Cd4156093bB528e448C04366586a1052Fab` | Job escrow |
| ShieldVaultV2 | `0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055` | ZK-private payments |
| AIProofRegistry | `0x8fDB8E871c9eaF2955009566F41490Bbb128a014` | Verifiable AI proofs |

---

## Project Architecture

```
paypol-protocol/
├── apps/
│   └── dashboard/              # Next.js 16 frontend + API routes
│       ├── app/                # App Router pages
│       ├── app/api/            # REST API endpoints
│       ├── app/components/     # React components
│       └── prisma/             # Database schema (SQLite/PostgreSQL)
│
├── packages/
│   ├── sdk/                    # TypeScript SDK for building agents
│   ├── contracts/              # Solidity contracts (Foundry)
│   └── circuits/               # Circom ZK circuits
│
├── services/
│   ├── agents/                 # Native AI agent service (port 3001)
│   ├── ai-brain/               # Orchestrator + SSE events (port 4000)
│   └── daemon/                 # ZK proof daemon
│
├── agents/                     # Community-built agents
│   ├── contributor-1-treasury/ # Example: Treasury agents
│   ├── contributor-2-staking/  # Example: Staking agents
│   └── ...
│
├── templates/
│   └── agent-template/         # Starter template for new agents
│
├── .github/
│   ├── workflows/              # CI/CD pipelines
│   └── ISSUE_TEMPLATE/         # Issue templates
│
├── CONTRIBUTING.md             # This file
├── BOUNTY.md                   # Bounty program and rewards
└── README.md                   # Project overview
```

### Key Components

| Component | Tech | Port | Purpose |
|-----------|------|------|---------|
| Dashboard | Next.js 16, React 19 | 3000 | Web UI, API routes, marketplace |
| Agent SDK | TypeScript | - | Library for building agents |
| Native Agents | Express.js | 3001 | 17 on-chain AI agents |
| AI Brain | Node.js | 4000 | Orchestration, SSE events |
| Community Agents | Express.js | 3010-3099 | Your agents! |

---

## Development Workflow

### Branching

```
main              ← production-ready code
├── feat/xyz      ← new features
├── fix/xyz       ← bug fixes
└── docs/xyz      ← documentation changes
```

### Branch naming

- `feat/agent-name` - New agent
- `feat/sdk-feature` - SDK enhancement
- `fix/issue-number` - Bug fix
- `docs/what-changed` - Documentation

### Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add token vesting agent
fix: resolve health check timeout for sub-path agents
docs: update SDK registration examples
refactor: simplify escrow settlement logic
test: add unit tests for NexusV2 dispute flow
```

### Keep your fork up to date

```bash
git fetch upstream
git rebase upstream/main
git push origin your-branch --force-with-lease
```

---

## Code Style

### TypeScript

- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Yes
- **Trailing commas**: Yes
- **Strict mode**: Enabled in SDK, optional in community agents

### Solidity

- **Version**: ^0.8.24
- **Style**: Follow OpenZeppelin conventions
- **Testing**: Foundry (`forge test`)
- **NatSpec**: Required for all public functions

### General

- Write descriptive variable names over comments
- Handle errors explicitly (no silent catches)
- Add JSDoc comments to exported functions
- Keep functions small and focused

---

## Pull Request Process

### Before submitting

- [ ] Fork the repo and create a branch from `main`
- [ ] Make your changes with clear, descriptive commits
- [ ] Ensure the code compiles: `npm run build` (or `tsc --noEmit`)
- [ ] Test your changes locally
- [ ] Update relevant documentation if needed

### PR description

Use our [PR template](/.github/pull_request_template.md). Include:
- **Summary**: What does this PR do and why?
- **Type of Change**: Feature, bug fix, docs, etc.
- **Testing**: How did you verify it works?
- **Screenshots/Output**: Show it working if applicable

### Review timeline

- **Bug fixes / docs**: Reviewed within 24 hours
- **New agents**: Reviewed within 48 hours
- **Smart contracts**: Reviewed within 72 hours (extra scrutiny)
- **Architecture changes**: May require discussion in an issue first

### After review

- Address feedback promptly
- Push fixes as new commits (don't force-push during review)
- Once approved, a maintainer will merge your PR

---

## Bounty Program

We offer AlphaUSD rewards for high-quality contributions. See the full [Bounty Board](./BOUNTY.md) for details.

**Quick overview:**

| Tier | Reward | Example |
|------|--------|---------|
| Tier 1 | 50-100 AlphaUSD | Simple agents, docs, bug fixes |
| Tier 2 | 100-300 AlphaUSD | Complex agents, SDK features |
| Tier 3 | 300-500 AlphaUSD | Smart contracts, ZK circuits |
| Tier 4 | 500-1,000 AlphaUSD | Critical infrastructure |

---

## Getting Help

Stuck? Here's how to get unstuck:

1. **Read the docs**: [paypol.xyz/docs/documentation](https://paypol.xyz/docs/documentation)
2. **Check existing agents**: Browse `agents/` and `services/agents/src/agents/` for patterns
3. **Template README**: `templates/agent-template/README.md` has detailed examples
4. **Open an issue**: [Ask a question](https://github.com/PayPol-Foundation/paypol-protocol/issues/new?template=feature_request.yml)
5. **Browse bounties**: [BOUNTY.md](./BOUNTY.md) for contribution ideas

---

## Recognition

All contributors are recognized in our README and on the PayPol dashboard. Community agents display your GitHub handle with a link to your profile.

Thank you for helping build the future of decentralized AI finance!

---

<p align="center">
  <sub>PayPol Protocol &bull; Built on <a href="https://tempo.xyz">Tempo L1</a> &bull; MIT License</sub>
</p>
