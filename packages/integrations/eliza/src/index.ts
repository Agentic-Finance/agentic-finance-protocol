/**
 * PayPol Eliza Plugin
 *
 * Exposes all native PayPol agents as Eliza actions so any Eliza-based
 * AI agent can hire them directly via natural language.
 *
 * Usage (in your Eliza agent config):
 *   import { paypolPlugin } from '@paypol/eliza-plugin';
 *   const agent = new AgentRuntime({ plugins: [paypolPlugin], ... });
 */

import axios from 'axios';

// ── Eliza-compatible interface stubs ──────────────────────
// These match the Eliza framework's Action/Plugin interfaces.
// Install the actual eliza package for full type safety:
//   npm install @ai16z/eliza

interface Memory {
  content: { text: string };
  userId:  string;
}

interface Action {
  name:        string;
  description: string;
  similes:     string[];
  validate:    (runtime: unknown, message: Memory) => Promise<boolean>;
  handler:     (runtime: unknown, message: Memory, state?: unknown, options?: unknown, callback?: (response: { text: string }) => void) => Promise<void>;
  examples:    Array<Array<{ user: string; content: { text: string } }>>;
}

interface Plugin {
  name:        string;
  description: string;
  actions:     Action[];
}

// ── PayPol API base URL (configure via env) ───────────────
const AGENT_API = process.env.PAYPOL_AGENT_API ?? 'http://localhost:3001';

// ── Helper ────────────────────────────────────────────────

async function callPayPolAgent(agentId: string, prompt: string, callerWallet = 'eliza-agent'): Promise<string> {
  try {
    const { data } = await axios.post(`${AGENT_API}/agents/${agentId}/execute`, {
      prompt,
      callerWallet,
    });
    return JSON.stringify(data.result ?? data.error, null, 2);
  } catch (err: any) {
    return `Error calling PayPol agent: ${err.message}`;
  }
}

// ── Actions ───────────────────────────────────────────────

const auditContractAction: Action = {
  name:        'AUDIT_SMART_CONTRACT',
  description: 'Audit a Solidity smart contract for security vulnerabilities using the PayPol contract auditor agent.',
  similes:     ['audit contract', 'check smart contract', 'security audit', 'find vulnerabilities'],

  validate: async (_runtime, message) =>
    /audit|security|vulnerabilit|solidity|contract/i.test(message.content.text),

  handler: async (_runtime, message, _state, _options, callback) => {
    const result = await callPayPolAgent('contract-auditor', message.content.text);
    callback?.({ text: `**Smart Contract Audit Result:**\n\`\`\`json\n${result}\n\`\`\`` });
  },

  examples: [[
    { user: 'user',  content: { text: 'Audit this contract: pragma solidity ^0.8.0; contract Foo { ... }' } },
    { user: 'agent', content: { text: 'Running security audit via PayPol...' } },
  ]],
};

const optimizeYieldAction: Action = {
  name:        'OPTIMIZE_DEFI_YIELD',
  description: 'Find the best DeFi yield opportunities for a given token using PayPol yield optimizer.',
  similes:     ['best yield', 'highest apy', 'optimize yield', 'defi strategy'],

  validate: async (_runtime, message) =>
    /yield|apy|defi|liquidity|farm|earn/i.test(message.content.text),

  handler: async (_runtime, message, _state, _options, callback) => {
    const result = await callPayPolAgent('yield-optimizer', message.content.text);
    callback?.({ text: `**Yield Optimization Result:**\n\`\`\`json\n${result}\n\`\`\`` });
  },

  examples: [[
    { user: 'user',  content: { text: 'Find the best yield for 10000 USDC with low risk' } },
    { user: 'agent', content: { text: 'Fetching yield opportunities via PayPol...' } },
  ]],
};

const planPayrollAction: Action = {
  name:        'PLAN_PAYROLL',
  description: 'Optimize a batch payroll - group recipients, estimate gas, generate payment schedule.',
  similes:     ['plan payroll', 'batch payment', 'optimize payroll', 'pay employees'],

  validate: async (_runtime, message) =>
    /payroll|salary|pay employee|batch pay|disburse/i.test(message.content.text),

  handler: async (_runtime, message, _state, _options, callback) => {
    const result = await callPayPolAgent('payroll-planner', message.content.text);
    callback?.({ text: `**Payroll Plan:**\n\`\`\`json\n${result}\n\`\`\`` });
  },

  examples: [[
    { user: 'user',  content: { text: 'Plan payroll for 5 employees, total budget $5000 USDC' } },
    { user: 'agent', content: { text: 'Optimizing payroll batches via PayPol...' } },
  ]],
};

const predictGasAction: Action = {
  name:        'PREDICT_GAS',
  description: 'Predict optimal gas price and timing for a transaction using the PayPol gas predictor.',
  similes:     ['gas price', 'gas estimate', 'when to transact', 'cheap gas'],

  validate: async (_runtime, message) =>
    /gas|gwei|transaction cost|when.*transact|cheap.*tx/i.test(message.content.text),

  handler: async (_runtime, message, _state, _options, callback) => {
    const result = await callPayPolAgent('gas-predictor', message.content.text);
    callback?.({ text: `**Gas Prediction:**\n\`\`\`json\n${result}\n\`\`\`` });
  },

  examples: [[
    { user: 'user',  content: { text: 'When is the cheapest time to send a transaction today?' } },
    { user: 'agent', content: { text: 'Analyzing gas prices via PayPol...' } },
  ]],
};

// ── Wave 2: Extended actions for 14 new agents ───────────

function makeAction(
  name: string, description: string, similes: string[],
  pattern: RegExp, agentId: string, label: string,
): Action {
  return {
    name, description, similes,
    validate: async (_runtime, message) => pattern.test(message.content.text),
    handler: async (_runtime, message, _state, _options, callback) => {
      const result = await callPayPolAgent(agentId, message.content.text);
      callback?.({ text: `**${label}:**\n\`\`\`json\n${result}\n\`\`\`` });
    },
    examples: [[
      { user: 'user',  content: { text: `${description}` } },
      { user: 'agent', content: { text: `Processing via PayPol ${label}...` } },
    ]],
  };
}

const cryptoTaxAction = makeAction(
  'NAVIGATE_CRYPTO_TAX', 'Calculate crypto taxes and classify transactions for tax reporting.',
  ['crypto tax', 'tax report', 'capital gains', 'tax classification'],
  /tax|capital gain|tax report|irs|1099/i, 'crypto-tax-navigator', 'Crypto Tax Report',
);

const portfolioRebalanceAction = makeAction(
  'REBALANCE_PORTFOLIO', 'Analyze and rebalance crypto portfolio allocation based on risk tolerance.',
  ['rebalance portfolio', 'portfolio allocation', 'risk tolerance', 'asset distribution'],
  /rebalanc|portfolio|allocation|risk.*toleran/i, 'portfolio-rebalancer', 'Portfolio Rebalancing',
);

const tokenDeployAction = makeAction(
  'DEPLOY_TOKEN', 'Generate and deploy ERC-20/721 token contracts with custom tokenomics.',
  ['deploy token', 'create token', 'erc20', 'launch token'],
  /deploy.*token|create.*token|erc.?20|erc.?721|launch.*token|tokenomic/i, 'token-deployer', 'Token Deployment',
);

const airdropTrackAction = makeAction(
  'TRACK_AIRDROPS', 'Scan wallet for airdrop eligibility and provide farming strategy guides.',
  ['airdrop', 'airdrop eligibility', 'farming guide', 'check airdrops'],
  /airdrop|farming|eligib|free token/i, 'airdrop-tracker', 'Airdrop Analysis',
);

const mevProtectAction = makeAction(
  'PROTECT_FROM_MEV', 'Analyze transactions for MEV risks and recommend protection strategies.',
  ['mev protection', 'sandwich attack', 'frontrun', 'private transaction'],
  /mev|sandwich|frontrun|backrun|private.*tx|mempool/i, 'mev-sentinel', 'MEV Protection',
);

const liquidityManageAction = makeAction(
  'MANAGE_LIQUIDITY', 'Manage Uniswap V3 positions, calculate impermanent loss, optimize ranges.',
  ['liquidity', 'uniswap', 'impermanent loss', 'LP position'],
  /liquidity|uniswap|impermanent|LP.*position|concentrated/i, 'liquidity-manager', 'Liquidity Management',
);

const whaleTrackAction = makeAction(
  'TRACK_WHALES', 'Track whale wallet movements, smart money flows, and accumulation patterns.',
  ['whale tracking', 'smart money', 'large transfers', 'whale alert'],
  /whale|smart.*money|large.*transfer|accumulation/i, 'whale-tracker', 'Whale Intelligence',
);

const sentimentAnalyzeAction = makeAction(
  'ANALYZE_SENTIMENT', 'Analyze crypto sentiment across Twitter, Discord, and Telegram.',
  ['sentiment analysis', 'social media', 'crypto twitter', 'market sentiment'],
  /sentiment|social.*media|twitter.*crypto|hype|fud/i, 'social-radar', 'Sentiment Analysis',
);

const bridgeRouteAction = makeAction(
  'ROUTE_BRIDGE', 'Find the cheapest and fastest cross-chain bridge routes.',
  ['bridge route', 'cross chain', 'cheapest bridge', 'bridge comparison'],
  /bridge.*route|cross.*chain|cheapest.*bridge|bridge.*compar/i, 'omnibridge-router', 'Bridge Routing',
);

const nftAppraiseAction = makeAction(
  'APPRAISE_NFT', 'Valuate NFTs using rarity analysis, floor prices, and collection trends.',
  ['nft value', 'nft rarity', 'nft appraisal', 'floor price'],
  /nft.*value|nft.*rarity|nft.*apprai|floor.*price|trait.*analy/i, 'nft-appraiser', 'NFT Appraisal',
);

const proposalWriteAction = makeAction(
  'WRITE_PROPOSAL', 'Draft professional governance proposals for DAOs.',
  ['governance proposal', 'dao proposal', 'write proposal', 'voting'],
  /governance.*proposal|dao.*proposal|write.*proposal|draft.*proposal/i, 'proposal-writer', 'Governance Proposal',
);

const vestingPlanAction = makeAction(
  'PLAN_VESTING', 'Design optimal token vesting schedules and analyze tokenomics health.',
  ['vesting schedule', 'token vesting', 'cliff', 'tokenomics'],
  /vesting|cliff|token.*unlock|tokenomics.*health/i, 'vesting-planner', 'Vesting Schedule',
);

const defiInsuranceAction = makeAction(
  'FIND_DEFI_INSURANCE', 'Find and compare DeFi insurance coverage options.',
  ['defi insurance', 'protocol cover', 'smart contract insurance', 'coverage'],
  /defi.*insurance|protocol.*cover|smart.*contract.*insur|coverage/i, 'defi-insurance', 'DeFi Insurance',
);

const contractDeployProAction = makeAction(
  'DEPLOY_CONTRACT_PRO', 'Deploy production-grade smart contracts (multisig, vault, proxy patterns).',
  ['deploy contract', 'multisig', 'vault contract', 'proxy deploy'],
  /deploy.*contract|multisig|vault.*contract|proxy.*deploy|production.*contract/i, 'contract-deploy-pro', 'Contract Deployment',
);

// ── Plugin export ─────────────────────────────────────────

export const paypolPlugin: Plugin = {
  name:        'paypol',
  description: 'PayPol Agent Marketplace - 32 on-chain agents covering escrow, streams, security, payroll, analytics, deployment, treasury, and more.',
  actions: [
    // Wave 1 (original)
    auditContractAction, optimizeYieldAction, planPayrollAction, predictGasAction,
    // Wave 2 (extended)
    cryptoTaxAction, portfolioRebalanceAction, tokenDeployAction, airdropTrackAction,
    mevProtectAction, liquidityManageAction, whaleTrackAction, sentimentAnalyzeAction,
    bridgeRouteAction, nftAppraiseAction, proposalWriteAction, vestingPlanAction,
    defiInsuranceAction, contractDeployProAction,
  ],
};

export default paypolPlugin;
