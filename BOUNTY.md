# PayPol Open Contributor Program

> PayPol is an early-stage, community-driven protocol. We value transparency: bounties are currently **non-monetary** - instead, we offer production experience, public credit, and a tracked commitment to retroactively reward early builders when the project reaches funding milestones.
>
> The best open-source projects were built by people who showed up before the money did.

---

## Why Contribute (Without Getting Paid Yet)

### 1. Your code ships to production
PayPol has **9 verified smart contracts** on Tempo L1, a live dashboard at [paypol.xyz](https://paypol.xyz), and 32 agents in the marketplace. Your contribution goes live - not into a side project graveyard.

### 2. Portfolio proof
Every merged PR is a public, verifiable record. Smart contract work is verified on-chain via Sourcify. Agent work is deployed and callable. Recruiters can see it. Investors can see it.

### 3. Early Builder Equity
We maintain a **Contributor Ledger** (below). When PayPol secures funding or launches a token, early contributors receive retroactive compensation proportional to their contribution weight. This is not a vague promise - it's tracked, timestamped, and public.

### 4. Architecture influence
Active contributors get invited to architecture discussions, roadmap input, and co-authorship on protocol decisions. Your opinion shapes the protocol.

### 5. Skills you actually learn
- Solidity + Foundry (real contracts, not tutorials)
- ZK-SNARKs (PlonkVerifier, snarkJS)
- AI agent orchestration (OpenAI/Anthropic integration)
- On-chain payment infrastructure (escrow, streaming, multisend)

---

## How It Works

1. **Pick a task** from the tables below (or propose your own)
2. **Comment on the GitHub Issue** - say what you plan to build and your estimated timeline
3. **Submit a PR** that meets the acceptance criteria
4. **Get reviewed** within 48 hours
5. **Get merged** → added to Contributor Ledger with weight points

---

## Contribution Weight System

Instead of dollar bounties, we use **weight points** that track the relative value of each contribution. When funding arrives, rewards are distributed proportionally.

| Weight | Scope | Examples |
|--------|-------|---------|
| **1** | Quick fix | Typo, small bug fix, docs improvement |
| **3** | Standard task | New agent, frontend page, SDK feature |
| **5** | Complex feature | Multi-file feature, contract upgrade, testing framework |
| **8** | Critical infra | Smart contract, ZK circuit, security audit, architecture |

> Weights are assigned by maintainers upon merge. Contributors can see their accumulated weight in the Contributor Ledger below.

---

## Open Tasks: AI Agents

Build agents that run on the PayPol marketplace. Each agent becomes a permanent part of the protocol.

| # | Agent | Category | Weight | Status |
|---|-------|----------|--------|--------|
| [#2](https://github.com/PayPol-Foundation/paypol-protocol/issues/2) | Token Vesting Agent | DeFi | 3 | 🔄 In Review |
| [#4](https://github.com/PayPol-Foundation/paypol-protocol/issues/4) | Airdrop Distribution Agent | DeFi | 3 | 🔄 In Review |
| [#7](https://github.com/PayPol-Foundation/paypol-protocol/issues/7) | Gas Estimation Agent (Multi-chain) | Analytics | 3 | 🟢 Open |
| [#10](https://github.com/PayPol-Foundation/paypol-protocol/issues/10) | Portfolio Rebalancer | DeFi | 5 | 🟢 Open |
| - | DAO Treasury Reporter | DeFi | 5 | 🟢 Open |
| - | Liquidation Monitor | Security | 5 | 🟢 Open |
| - | Smart Contract Fuzzer | Security | 8 | 🟢 Open |
| - | Cross-chain Arbitrage Scanner | DeFi | 8 | 🟢 Open |

### Agent Requirements

Every agent submission must include:

- Source code in `agents/your-agent-name/`
- Working endpoints: `/health`, `/manifest`, `/execute`
- Self-registration via PayPol SDK (`npm run register`)
- Error handling with informative messages
- README with setup instructions and usage examples
- TypeScript with proper types

---

## Open Tasks: SDK & Tooling

| Task | Weight | Status |
|------|--------|--------|
| CLI tool for scaffolding new agents | 3 | 🟢 Open |
| Python SDK for agent registration | 5 | 🟢 Open |
| Agent testing framework (mock jobs, assertions) | 5 | 🟢 Open |
| SDK rate limiting and retry logic | 3 | 🟢 Open |
| Rust SDK for high-performance agents | 8 | 🟢 Open |

---

## Open Tasks: Smart Contracts

| Task | Weight | Status |
|------|--------|--------|
| Multi-token escrow support in NexusV2 | 5 | 🟢 Open |
| ERC-4337 Account Abstraction for agent wallets | 8 | 🟢 Open |
| Gas sponsorship relay for new agents | 8 | 🟢 Open |
| Time-locked withdrawals for ShieldVault | 5 | 🟢 Open |

---

## Open Tasks: Frontend & Docs

| Task | Weight | Status |
|------|--------|--------|
| Interactive agent playground (live demo) | 8 | 🟢 Open |
| OpenAPI/Swagger spec for all API routes | 3 | 🟢 Open |
| Video tutorial: "Build Your First PayPol Agent" | 3 | 🟢 Open |
| Translate docs (Chinese, Spanish) | 1 each | 🟢 Open |

---

## Rules

### Claiming Tasks
- Comment on the issue to claim. First meaningful response wins.
- Show progress within **7 days** or the task reopens.
- One active claim per person (finish one before starting another).

### Quality Standards
- Code must pass CI (TypeScript compilation, forge build).
- Agents must respond to health checks and test payloads.
- Smart contracts must include Foundry tests.
- PR description must be filled out completely.

### What Gets Rejected
- Auto-generated / bot submissions with minimal effort
- Empty PR templates
- Scaffold-only code without real logic
- Copied code without attribution

---

## Contributor Ledger

This ledger is the official record. It will be used to calculate retroactive rewards.

| Contributor | GitHub | Contributions | Total Weight | Date |
|-------------|--------|---------------|-------------|------|
| _Your name here_ | | | | |

> Ledger is updated after each merged PR.

---

## Propose a New Task

Don't see what you want to build? Open a [New Agent Proposal](https://github.com/PayPol-Foundation/paypol-protocol/issues/new?template=agent_proposal.yml) and we'll assign a weight.

---

<p align="center">
  <sub>No funding. No hype. Just builders shipping real infrastructure.<br/>The people who build before the money arrives are the ones who matter most.</sub>
</p>
