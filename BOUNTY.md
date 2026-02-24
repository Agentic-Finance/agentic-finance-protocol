# PayPol Contributor Program

Welcome to the PayPol Contributor Program! We recognize and reward contributors who build high-quality agents, improve our infrastructure, and strengthen the protocol.

## How It Works

1. **Pick a task** from the tables below (or propose your own)
2. **Comment on the GitHub Issue** to claim it (first-come, first-served)
3. **Submit a PR** that meets the acceptance criteria
4. **Get reviewed** by a maintainer (usually within 48 hours)
5. **Get recognized** as a contributor + potential future token allocation

## Contributor Tiers

| Tier | Recognition | Typical Scope |
|------|------------|---------------|
| **Bronze** | README mention + contributor badge | Simple agents, documentation, bug fixes |
| **Silver** | Bronze + priority review + co-author credit | Complex agents, SDK features, frontend pages |
| **Gold** | Silver + architecture input + early access | Smart contracts, ZK circuits, architecture changes |
| **Platinum** | Gold + core team consideration + future token allocation | Critical infrastructure, security audits, multi-component features |

> **Note:** PayPol is currently pre-funding. When the project secures VC investment, early contributors will be prioritized for retroactive rewards and token allocation based on their contribution tier.

---

## Open Bounties: AI Agents

Build agents that run on the PayPol marketplace. Each agent you build becomes a permanent part of the protocol.

| Agent | Category | Difficulty | Tier | Status |
|-------|----------|------------|------|--------|
| Token Vesting Agent | defi | Easy | Bronze | Open |
| Airdrop Distribution Agent | defi | Easy | Bronze | Open |
| Gas Estimation Agent | analytics | Easy | Bronze | Open |
| DAO Treasury Reporter | defi | Medium | Silver | Open |
| Lending Rate Optimizer | defi | Medium | Silver | Open |
| Liquidation Monitor | security | Medium | Silver | Open |
| Smart Contract Fuzzer | security | Hard | Gold | Open |
| MEV Protection Agent | security | Hard | Gold | Open |
| Cross-chain Arbitrage Scanner | defi | Hard | Gold | Open |
| On-chain Reputation Scorer | analytics | Medium | Silver | Open |

### Agent Requirements

Every agent submission must include:

- **Source code** in `agents/your-agent-name/`
- **Working endpoints**: `/health`, `/manifest`, `/execute`
- **Self-registration**: `npm run register` via PayPol SDK
- **Error handling**: graceful failures with informative error messages
- **Documentation**: clear README with usage examples
- **Type safety**: TypeScript with proper types for job payloads

---

## Open Bounties: SDK & Tooling

| Task | Difficulty | Tier | Status |
|------|------------|------|--------|
| Python SDK bindings for agent registration | Medium | Silver | Open |
| Rust SDK for high-performance agents | Hard | Gold | Open |
| CLI tool for scaffolding new agents | Easy | Bronze | Open |
| Agent testing framework (mock jobs, assertions) | Medium | Silver | Open |
| SDK rate limiting and retry logic | Easy | Bronze | Open |

---

## Open Bounties: Smart Contracts

| Task | Difficulty | Tier | Status |
|------|------------|------|--------|
| Time-locked withdrawals for ShieldVault | Hard | Gold | Open |
| ERC-4337 Account Abstraction for agent wallets | Hard | Platinum | Open |
| Multi-token escrow support in NexusV2 | Medium | Silver | Open |
| On-chain reputation system (SBT-based) | Medium | Silver | Open |
| Gas sponsorship relay for new agents | Hard | Gold | Open |

---

## Open Bounties: Frontend & Documentation

| Task | Difficulty | Tier | Status |
|------|------------|------|--------|
| Agent performance analytics page | Medium | Silver | Open |
| OpenAPI/Swagger spec for all API routes | Easy | Bronze | Open |
| Interactive agent playground (try before hiring) | Hard | Gold | Open |
| Video tutorial: "Build Your First Agent" | Easy | Bronze | Open |
| Translate docs to Vietnamese, Chinese, Spanish | Easy | Bronze | Open |

---

## Rules

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
4. PR merged and contributor tier assigned

---

## Propose a New Bounty

Don't see what you want to build? Open a [New Agent Proposal](https://github.com/PayPol-Foundation/paypol-protocol/issues/new?template=agent_proposal.yml) issue and we'll evaluate it.

---

## Past Contributors

We thank the following teams for their early contributions to the PayPol ecosystem:

| Contribution | Agents Built | Tier |
|-------------|-------------|------|
| Treasury & Multi-Sig agents | Treasury Manager, Multi-Sig Creator | Silver |
| Staking agents | Staking Optimizer, Validator Monitor | Silver |
| NFT agents | NFT Minter, Collection Deployer | Silver |
| DEX agents | DEX Deployer, Liquidity Bootstrapper | Gold |
| Governance agents | Governance Executor, Proposal Voter | Silver |
| Oracle agents | Oracle Deployer, Price Feed Manager | Silver |
| Bridge agents | Cross-Chain Relayer, Bridge Operator | Gold |

---

<p align="center">
  <sub>Build agents. Get recognized. Shape the agentic economy.</sub>
</p>
