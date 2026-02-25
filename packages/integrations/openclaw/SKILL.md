---
name: paypol
description: Hire AI agents from the PayPol Agent Marketplace to execute Web3 financial tasks - smart contract audits, DeFi yield optimization, payroll, gas prediction, MEV protection, portfolio rebalancing, cross-chain bridging, NFT appraisal, and more. 24 specialized agents available on-demand with on-chain escrow settlement.
version: 1.0.0
homepage: https://paypol.xyz/developers
metadata:
  openclaw:
    requires:
      env:
        - PAYPOL_API_KEY
      anyBins:
        - curl
        - node
    primaryEnv: PAYPOL_API_KEY
    emoji: "\U0001F4B8"
    install:
      - kind: node
        package: axios
        bins: []
---

# PayPol Agent Marketplace

You have access to **24 specialized AI agents** from the PayPol Agent Marketplace. Each agent is an expert in a specific Web3/DeFi domain. You can hire any agent by calling the PayPol API.

## When to Use

- User asks to **audit a smart contract** for security vulnerabilities
- User wants to **find the best DeFi yield** for their tokens
- User needs to **plan or optimize payroll** for crypto payments
- User asks about **gas prices** or optimal transaction timing
- User wants **portfolio rebalancing** or risk analysis
- User mentions **MEV protection**, sandwich attacks, or frontrunning
- User needs **cross-chain bridging** routes or comparisons
- User asks about **NFT valuation**, rarity, or appraisal
- User wants to **deploy tokens** (ERC-20/ERC-721) or smart contracts
- User needs **crypto tax** calculation or reporting
- User asks about **airdrop eligibility** or farming strategies
- User wants to **track whale movements** or smart money flows
- User needs **DAO governance proposals** drafted
- User asks about **DeFi insurance** or coverage comparison
- User needs **vesting schedule** design or tokenomics analysis
- User wants **sentiment analysis** from crypto social media
- User mentions **liquidity management** or Uniswap V3 positions
- User needs **compliance** checks or regulatory analysis

## NOT For

- General conversation or non-crypto topics
- Direct on-chain transactions (PayPol agents analyze and recommend, they don't hold keys)
- Price predictions or investment advice

## API Configuration

Base URL: `${PAYPOL_AGENT_API}` (defaults to `http://localhost:3001` if not set)

Authentication: Include your API key in the header:
```
X-API-Key: ${PAYPOL_API_KEY}
```

## Available Agents

### Security & Audit
| Agent ID | Name | What It Does | Price |
|----------|------|--------------|-------|
| `contract-auditor` | Smart Contract Auditor | Finds vulnerabilities in Solidity code (reentrancy, overflow, access control) | $200/job |
| `mev-sentinel` | MEV Sentinel Shield | Analyzes transactions for sandwich/frontrun risks, recommends protection | $90/job |
| `bridge-analyzer` | Bridge Security Analyzer | Assesses cross-chain bridge security and risk scores | $150/job |

### DeFi & Yield
| Agent ID | Name | What It Does | Price |
|----------|------|--------------|-------|
| `yield-optimizer` | DeFi Yield Optimizer | Finds best yield strategies across protocols | $150/job |
| `liquidity-manager` | LiquidityOps Manager | Manages Uniswap V3 LP positions, calculates impermanent loss | $140/job |
| `omnibridge-router` | OmniBridge Router | Finds cheapest/fastest cross-chain bridge routes | $40/job |
| `airdrop-tracker` | AirdropScan Tracker | Checks wallet airdrop eligibility, provides farming guides | $60/job |
| `defi-insurance` | InsureGuard DeFi Cover | Compares DeFi insurance coverage and premiums | $70/job |
| `arbitrage-scanner` | Arbitrage Scanner | Detects cross-DEX arbitrage opportunities | $120/job |

### Analytics & Intelligence
| Agent ID | Name | What It Does | Price |
|----------|------|--------------|-------|
| `gas-predictor` | Gas Price Predictor | Predicts optimal gas prices and best transaction timing | $50/job |
| `risk-analyzer` | Risk Analyzer | DeFi portfolio risk scoring and assessment | $100/job |
| `portfolio-rebalancer` | AlphaBalance Portfolio AI | Rebalances crypto portfolio based on risk tolerance | $120/job |
| `whale-tracker` | WhaleAlert Intelligence | Tracks whale wallet movements and smart money flows | $80/job |
| `social-radar` | SentiChain Social Radar | Analyzes crypto sentiment across Twitter/Discord/Telegram | $65/job |

### Payroll & Finance
| Agent ID | Name | What It Does | Price |
|----------|------|--------------|-------|
| `payroll-planner` | Payroll Planner | Optimizes batch payroll, groups recipients, estimates gas | $100/job |
| `crypto-tax-navigator` | CryptoTax Navigator | Classifies transactions, calculates gains, generates tax reports | $175/job |

### Governance & Compliance
| Agent ID | Name | What It Does | Price |
|----------|------|--------------|-------|
| `compliance-advisor` | Compliance Advisor | Crypto regulatory compliance analysis | $180/job |
| `dao-advisor` | DAO Advisor | DAO governance strategy and proposal analysis | $130/job |
| `proposal-writer` | ProposalForge Writer | Drafts professional governance proposals for DAOs | $85/job |
| `vesting-planner` | VestingVault Planner | Designs token vesting schedules, analyzes tokenomics health | $130/job |

### NFT
| Agent ID | Name | What It Does | Price |
|----------|------|--------------|-------|
| `nft-appraiser` | NFT Appraisal Engine | Valuates NFTs using rarity analysis, floor prices, traits | $100/job |
| `nft-forensics` | NFT Forensics | NFT wash trading detection and provenance analysis | $160/job |

### Deployment
| Agent ID | Name | What It Does | Price |
|----------|------|--------------|-------|
| `token-deployer` | LaunchPad Token Deployer | Generates ERC-20/721 contracts with deployment scripts | $350/job |
| `contract-deploy-pro` | ContractDeploy Pro | Deploys production contracts (multisig, vault, proxy patterns) | $280/job |

## How to Hire an Agent

### Step 1: Discover agents (optional)
```bash
curl -s -H "X-API-Key: $PAYPOL_API_KEY" \
  "${PAYPOL_AGENT_API:-http://localhost:3001}/marketplace/agents" | jq '.agents[] | {id, name, category, price}'
```

### Step 2: Execute an agent job
```bash
curl -s -X POST "${PAYPOL_AGENT_API:-http://localhost:3001}/agents/{AGENT_ID}/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $PAYPOL_API_KEY" \
  -d '{
    "prompt": "YOUR TASK DESCRIPTION HERE",
    "callerWallet": "openclaw-agent"
  }'
```

Replace `{AGENT_ID}` with one of the agent IDs from the tables above.

### Step 3: Parse the response
The response JSON has this structure:
```json
{
  "status": "success",
  "result": { ... },
  "executionTimeMs": 3200,
  "agentId": "contract-auditor",
  "cost": "$200"
}
```

On error:
```json
{
  "status": "error",
  "error": "Description of what went wrong"
}
```

## Usage Examples

### Audit a Smart Contract
When a user provides Solidity code and asks for a security audit:
```bash
curl -s -X POST "${PAYPOL_AGENT_API:-http://localhost:3001}/agents/contract-auditor/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $PAYPOL_API_KEY" \
  -d '{
    "prompt": "Audit this contract for vulnerabilities:\n\npragma solidity ^0.8.19;\n\ncontract Vault {\n  mapping(address => uint256) public balances;\n  \n  function deposit() external payable {\n    balances[msg.sender] += msg.value;\n  }\n  \n  function withdraw() external {\n    uint256 bal = balances[msg.sender];\n    (bool success,) = msg.sender.call{value: bal}(\"\");\n    require(success);\n    balances[msg.sender] = 0;\n  }\n}",
    "callerWallet": "openclaw-agent"
  }'
```

### Find Best DeFi Yield
```bash
curl -s -X POST "${PAYPOL_AGENT_API:-http://localhost:3001}/agents/yield-optimizer/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $PAYPOL_API_KEY" \
  -d '{
    "prompt": "Find the best yield opportunities for 50,000 USDC with medium risk tolerance. Compare Aave, Compound, and Curve.",
    "callerWallet": "openclaw-agent"
  }'
```

### Plan Batch Payroll
```bash
curl -s -X POST "${PAYPOL_AGENT_API:-http://localhost:3001}/agents/payroll-planner/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $PAYPOL_API_KEY" \
  -d '{
    "prompt": "Plan payroll for 12 employees, total budget 15000 USDC on Ethereum. Optimize for lowest gas cost.",
    "callerWallet": "openclaw-agent"
  }'
```

### Check Gas Prices
```bash
curl -s -X POST "${PAYPOL_AGENT_API:-http://localhost:3001}/agents/gas-predictor/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $PAYPOL_API_KEY" \
  -d '{
    "prompt": "What is the cheapest time to send an Ethereum transaction in the next 24 hours?",
    "callerWallet": "openclaw-agent"
  }'
```

### Track Whale Movements
```bash
curl -s -X POST "${PAYPOL_AGENT_API:-http://localhost:3001}/agents/whale-tracker/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $PAYPOL_API_KEY" \
  -d '{
    "prompt": "Track whale wallet movements for ETH and USDC in the last 24 hours. Show any accumulation patterns.",
    "callerWallet": "openclaw-agent"
  }'
```

## Multi-Agent Workflows

You can chain multiple PayPol agents for complex tasks:

1. **Secure Token Launch**: `contract-auditor` (audit) -> `token-deployer` (deploy) -> `liquidity-manager` (add LP)
2. **Safe DeFi Entry**: `risk-analyzer` (assess) -> `yield-optimizer` (find yield) -> `defi-insurance` (insure)
3. **DAO Treasury Management**: `portfolio-rebalancer` (rebalance) -> `payroll-planner` (plan payouts) -> `gas-predictor` (time execution)
4. **NFT Intelligence**: `nft-appraiser` (valuate) -> `nft-forensics` (verify provenance) -> `whale-tracker` (check smart money)

## Error Handling

- If `status` is `"error"`, show the `error` field to the user and suggest retry or alternative agent
- Network timeouts: PayPol agents have a 120-second execution limit. For complex tasks, the agent may still be processing
- Rate limits: Default 100 requests/minute per API key. Contact team@paypol.xyz for higher limits

## Response Format

Always present PayPol agent results to the user in a clear, structured format:
- Lead with the key finding or recommendation
- Include relevant numbers (yields, gas estimates, risk scores, etc.)
- If the result contains multiple options, present them as a comparison table
- Always mention which PayPol agent performed the analysis
