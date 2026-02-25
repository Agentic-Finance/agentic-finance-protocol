/**
 * PayPol LangChain Integration
 * ============================
 *
 * Exposes all 17 PayPol marketplace agents as LangChain StructuredTool
 * instances, enabling use in LangChain agents, chains, and pipelines.
 *
 * Usage:
 *   import { PayPolTool, getAllPayPolTools } from '@paypol/langchain';
 *
 *   // Single tool
 *   const auditTool = new PayPolTool({ agentId: 'contract-auditor' });
 *
 *   // All 17 tools
 *   const allTools = getAllPayPolTools();
 *
 *   // Use in LangChain AgentExecutor
 *   const agent = new AgentExecutor({ tools: [auditTool], llm });
 */

import axios from 'axios';
import { z } from 'zod';

// ── LangChain-compatible interface stubs ──────────────────
// Install @langchain/core for full types:
//   npm install @langchain/core

interface ToolParams {
  name: string;
  description: string;
  schema: z.ZodType<any>;
}

// Minimal StructuredTool interface for standalone usage
abstract class StructuredToolBase {
  name: string;
  description: string;

  constructor(params: { name: string; description: string }) {
    this.name = params.name;
    this.description = params.description;
  }

  abstract _call(input: any): Promise<string>;

  async invoke(input: any): Promise<string> {
    return this._call(input);
  }
}

// ── PayPol API ────────────────────────────────────────────

const AGENT_API = process.env.PAYPOL_AGENT_API ?? 'http://localhost:3001';

// ── PayPolTool ────────────────────────────────────────────

export const PayPolToolSchema = z.object({
  prompt: z.string().describe('Task description or data for the PayPol agent'),
  callerWallet: z.string().optional().default('langchain-agent').describe('Caller wallet address'),
});

export type PayPolToolInput = z.infer<typeof PayPolToolSchema>;

export class PayPolTool extends StructuredToolBase {
  agentId: string;
  schema = PayPolToolSchema;

  constructor({ agentId, name, description }: { agentId: string; name?: string; description?: string }) {
    const catalog = AGENT_CATALOG.find(a => a[0] === agentId);
    super({
      name: name || catalog?.[1] || `paypol_${agentId}`,
      description: description || catalog?.[2] || `Execute task using PayPol agent: ${agentId}`,
    });
    this.agentId = agentId;
  }

  async _call(input: PayPolToolInput | string): Promise<string> {
    const prompt = typeof input === 'string' ? input : input.prompt;
    const callerWallet = typeof input === 'string' ? 'langchain-agent' : (input.callerWallet || 'langchain-agent');

    try {
      const { data } = await axios.post(`${AGENT_API}/agents/${this.agentId}/execute`, {
        prompt,
        callerWallet,
      }, { timeout: 120000 });

      if (data.status === 'error') {
        return `Agent error: ${data.error || 'Unknown error'}`;
      }
      return JSON.stringify(data.result ?? data, null, 2);
    } catch (err: any) {
      return `PayPol API error: ${err.message}`;
    }
  }
}

// ── Agent catalog ─────────────────────────────────────────

const AGENT_CATALOG: [string, string, string][] = [
  ['contract-auditor',     'audit_smart_contract',     'Audit Solidity smart contracts for security vulnerabilities'],
  ['yield-optimizer',      'optimize_defi_yield',      'Find best DeFi yield strategies and APY opportunities'],
  ['payroll-planner',      'plan_payroll',             'Optimize batch payroll distribution and gas costs'],
  ['gas-predictor',        'predict_gas',              'Predict optimal gas prices and transaction timing'],
  ['arbitrage-scanner',    'scan_arbitrage',           'Detect cross-DEX arbitrage opportunities'],
  ['compliance-advisor',   'check_compliance',         'Crypto regulatory compliance analysis'],
  ['nft-forensics',        'analyze_nft_forensics',    'NFT wash trading and provenance forensics'],
  ['bridge-analyzer',      'analyze_bridge',           'Cross-chain bridge security assessment'],
  ['dao-advisor',          'advise_dao',               'DAO governance strategy and proposal analysis'],
  ['risk-analyzer',        'analyze_risk',             'DeFi portfolio risk scoring and assessment'],
  ['crypto-tax-navigator', 'navigate_crypto_tax',      'Classify crypto transactions and generate tax reports'],
  ['portfolio-rebalancer', 'rebalance_portfolio',      'Analyze and rebalance crypto portfolio allocation'],
  ['token-deployer',       'deploy_token',             'Generate ERC-20/721 contracts with deployment scripts'],
  ['airdrop-tracker',      'track_airdrops',           'Scan wallet for airdrop eligibility and farming guides'],
  ['mev-sentinel',         'shield_from_mev',          'Protect transactions from sandwich attacks and frontrunning'],
  ['liquidity-manager',    'manage_liquidity',         'Manage Uniswap V3 positions and impermanent loss'],
  ['whale-tracker',        'track_whales',             'Track large wallet movements and smart money flows'],
  ['social-radar',         'analyze_sentiment',        'Analyze crypto sentiment across social platforms'],
  ['omnibridge-router',    'route_bridge',             'Find cheapest cross-chain bridge routes'],
  ['nft-appraiser',        'appraise_nft',             'Valuate NFTs using rarity and market analysis'],
  ['proposal-writer',      'write_proposal',           'Draft governance proposals for DAOs'],
  ['vesting-planner',      'plan_vesting',             'Design token vesting schedules and tokenomics'],
  ['defi-insurance',       'find_insurance',           'Compare DeFi insurance coverage options'],
  ['contract-deploy-pro',  'deploy_contract',          'Deploy production smart contracts (multisig, vault, proxy)'],
];

// ── Factory functions ─────────────────────────────────────

export function getAllPayPolTools(): PayPolTool[] {
  return AGENT_CATALOG.map(([agentId, name, description]) =>
    new PayPolTool({ agentId, name, description })
  );
}

export function getToolsByCategory(category: string): PayPolTool[] {
  const categoryMap: Record<string, string[]> = {
    security:    ['contract-auditor', 'mev-sentinel'],
    defi:        ['yield-optimizer', 'arbitrage-scanner', 'airdrop-tracker', 'liquidity-manager', 'omnibridge-router', 'defi-insurance'],
    payroll:     ['payroll-planner'],
    analytics:   ['gas-predictor', 'risk-analyzer', 'portfolio-rebalancer', 'whale-tracker', 'social-radar'],
    compliance:  ['compliance-advisor', 'vesting-planner'],
    governance:  ['dao-advisor', 'proposal-writer'],
    nft:         ['nft-forensics', 'nft-appraiser'],
    tax:         ['crypto-tax-navigator'],
    deployment:  ['token-deployer', 'contract-deploy-pro'],
  };
  const agentIds = categoryMap[category] || [];
  return AGENT_CATALOG
    .filter(([id]) => agentIds.includes(id))
    .map(([agentId, name, description]) => new PayPolTool({ agentId, name, description }));
}

export default PayPolTool;
