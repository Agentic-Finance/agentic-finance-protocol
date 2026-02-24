# PayPol Bounty Program

Welcome to the PayPol Bounty Program! We reward contributors who build high-quality agents, improve our infrastructure, and strengthen the protocol.

## How It Works

1. **Pick a bounty** from the tables below (or propose your own)
2. **Comment on the GitHub Issue** to claim it (first-come, first-served)
3. **Submit a PR** that meets the acceptance criteria
4. **Get reviewed** by a maintainer (usually within 48 hours)
5. **Receive payment** in AlphaUSD on Tempo L1 after merge

## Reward Tiers

| Tier | Reward | Typical Scope |
|------|--------|---------------|
| **Tier 1** | 50 - 100 AlphaUSD | Simple agents, documentation, bug fixes |
| **Tier 2** | 100 - 300 AlphaUSD | Complex agents, SDK features, frontend pages |
| **Tier 3** | 300 - 500 AlphaUSD | Smart contracts, ZK circuits, architecture changes |
| **Tier 4** | 500 - 1,000 AlphaUSD | Critical infrastructure, security audits, multi-component features |

> Payment is sent to your wallet within 7 days of PR merge. Provide your Tempo L1 wallet address in the PR description.

---

## Open Bounties: AI Agents

Build agents that run on the PayPol marketplace and earn AlphaUSD on every job.

| Agent | Category | Difficulty | Reward | Status |
|-------|----------|------------|--------|--------|
| Token Vesting Agent | defi | Easy | 75 AlphaUSD | Open |
| Airdrop Distribution Agent | defi | Easy | 75 AlphaUSD | Open |
| Gas Estimation Agent | analytics | Easy | 50 AlphaUSD | Open |
| DAO Treasury Reporter | defi | Medium | 150 AlphaUSD | Open |
| Lending Rate Optimizer | defi | Medium | 200 AlphaUSD | Open |
| Liquidation Monitor | security | Medium | 200 AlphaUSD | Open |
| Smart Contract Fuzzer | security | Hard | 400 AlphaUSD | Open |
| MEV Protection Agent | security | Hard | 500 AlphaUSD | Open |
| Cross-chain Arbitrage Scanner | defi | Hard | 400 AlphaUSD | Open |
| On-chain Reputation Scorer | analytics | Medium | 150 AlphaUSD | Open |

### Agent Requirements

Every agent bounty submission must include:

- **Source code** in `agents/your-agent-name/`
- **Working endpoints**: `/health`, `/manifest`, `/execute`
- **Self-registration**: `npm run register` via PayPol SDK
- **Error handling**: graceful failures with informative error messages
- **Documentation**: clear README with usage examples
- **Type safety**: TypeScript with proper types for job payloads

---

## Open Bounties: SDK & Tooling

| Task | Difficulty | Reward | Status |
|------|------------|--------|--------|
| Python SDK bindings for agent registration | Medium | 200 AlphaUSD | Open |
| Rust SDK for high-performance agents | Hard | 500 AlphaUSD | Open |
| CLI tool for scaffolding new agents | Easy | 100 AlphaUSD | Open |
| Agent testing framework (mock jobs, assertions) | Medium | 250 AlphaUSD | Open |
| SDK rate limiting and retry logic | Easy | 75 AlphaUSD | Open |

---

## Open Bounties: Smart Contracts

| Task | Difficulty | Reward | Status |
|------|------------|--------|--------|
| Time-locked withdrawals for ShieldVault | Hard | 400 AlphaUSD | Open |
| ERC-4337 Account Abstraction for agent wallets | Hard | 750 AlphaUSD | Open |
| Multi-token escrow support in NexusV2 | Medium | 300 AlphaUSD | Open |
| On-chain reputation system (SBT-based) | Medium | 250 AlphaUSD | Open |
| Gas sponsorship relay for new agents | Hard | 500 AlphaUSD | Open |

---

## Open Bounties: Frontend & Documentation

| Task | Difficulty | Reward | Status |
|------|------------|--------|--------|
| Agent performance analytics page | Medium | 200 AlphaUSD | Open |
| OpenAPI/Swagger spec for all API routes | Easy | 100 AlphaUSD | Open |
| Interactive agent playground (try before hiring) | Hard | 400 AlphaUSD | Open |
| Video tutorial: "Build Your First Agent" | Easy | 100 AlphaUSD | Open |
| Translate docs to Vietnamese, Chinese, Spanish | Easy | 75 AlphaUSD/lang | Open |

---

## Bounty Rules

### Eligibility

- Anyone can participate. No prior contributions required.
- One person per bounty (first to comment on the issue claims it).
- Claimed bounties must show progress within 7 days or they reopen.

### Quality Standards

- Code must pass CI checks (TypeScript compilation, linting).
- Agents must respond correctly to health checks and test payloads.
- Smart contracts must include Foundry tests with >80% coverage.
- Documentation must be clear, well-structured, and free of errors.

### Review Process

1. Submit PR referencing the bounty issue (`Closes #XX`)
2. Maintainer reviews within 48 hours
3. Address feedback if requested (usually 1-2 rounds)
4. PR merged and bounty paid within 7 days

### Bonus Multipliers

| Condition | Bonus |
|-----------|-------|
| First-time contributor | +10% |
| Includes comprehensive tests | +15% |
| Agent executes real on-chain transactions | +20% |
| PR includes video demo | +10% |

---

## Propose a New Bounty

Don't see what you want to build? Open a [New Agent Proposal](https://github.com/PayPol-Foundation/paypol-protocol/issues/new?template=agent_proposal.yml) issue and we'll evaluate it for a bounty.

---

## Completed Bounties

| Agent/Task | Contributor | Reward | Date |
|------------|-------------|--------|------|
| Treasury Manager | @cubicle-vdo | 150 AlphaUSD | Feb 2026 |
| Staking Optimizer | @swecast | 100 AlphaUSD | Feb 2026 |
| NFT Minter + Collection Deployer | @Malcer | 200 AlphaUSD | Feb 2026 |
| DEX Deployer + Liquidity Bootstrapper | @nhson0110-coder | 250 AlphaUSD | Feb 2026 |
| Governance Executor + Proposal Voter | @tariqachaudhry | 200 AlphaUSD | Feb 2026 |
| Oracle Deployer + Price Feed Manager | @doctormanhattan | 200 AlphaUSD | Feb 2026 |
| Cross-Chain Relayer + Bridge Operator | @Hobnobs | 250 AlphaUSD | Feb 2026 |

---

## Payment Details

- **Network**: Tempo Moderato (Chain ID: 42431)
- **Token**: AlphaUSD (`0x20c0000000000000000000000000000000000001`)
- **Method**: Direct ERC-20 transfer to your wallet
- **Timing**: Within 7 days of PR merge

> Provide your Tempo L1 wallet address in your PR description or DM a maintainer.

---

<p align="center">
  <sub>Build agents. Earn crypto. Shape the agentic economy.</sub>
</p>
