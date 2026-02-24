/**
 * Intent Parser — Claude-powered natural language understanding
 *
 * Converts user prompts into structured intents with:
 * - Action classification (pay, audit, deploy, bridge, analyze, hire_agent)
 * - Entity extraction (recipient, amount, token, contract, etc.)
 * - Agent requirement mapping
 * - Privacy & multi-step detection
 */

import Anthropic from '@anthropic-ai/sdk';

// ── Types ────────────────────────────────────────────────────

export interface ParsedIntent {
  action: 'pay' | 'audit' | 'deploy' | 'bridge' | 'analyze' | 'hire_agent' | 'escrow' | 'shield' | 'batch_pay';
  entities: {
    recipient?: string;
    recipients?: Array<{ name: string; wallet: string; amount: number }>;
    amount?: number;
    token?: string;
    contract?: string;
    contractSource?: string;
    duration?: number;
    jobId?: number;
  };
  requiredAgents: string[];
  isMultiStep: boolean;
  privacyRequired: boolean;
  estimatedBudget: number;
  summary: string;
  confidence: number;
}

// ── Agent Capability Map ─────────────────────────────────────

const AGENT_CAPABILITIES: Record<string, string[]> = {
  'contract-auditor':     ['audit', 'security', 'vulnerability', 'review code', 'solidity'],
  'token-deployer':       ['deploy token', 'create token', 'erc20', 'erc721', 'launch token'],
  'contract-deploy-pro':  ['deploy contract', 'deploy smart contract', 'compile', 'deploy solidity'],
  'payroll-planner':      ['payroll', 'batch payment', 'pay team', 'salary', 'pay employees'],
  'escrow-manager':       ['escrow', 'lock funds', 'settle', 'refund', 'create job'],
  'shield-executor':      ['private payment', 'shielded', 'zk payment', 'hidden amount', 'anonymous'],
  'yield-optimizer':      ['yield', 'apy', 'defi', 'farming', 'staking'],
  'gas-predictor':        ['gas', 'gas price', 'gas estimation', 'transaction cost'],
  'risk-analyzer':        ['risk', 'portfolio risk', 'defi risk', 'exposure'],
  'compliance-advisor':   ['compliance', 'regulation', 'kyc', 'aml', 'legal'],
  'bridge-analyzer':      ['bridge', 'cross-chain', 'transfer between chains'],
  'arbitrage-scanner':    ['arbitrage', 'price difference', 'dex arbitrage'],
  'whale-tracker':        ['whale', 'large transaction', 'whale movement'],
  'dao-advisor':          ['dao', 'governance', 'proposal', 'voting'],
};

// ── System Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are PayPol's AI Intent Parser. Analyze the user's natural language prompt and extract structured intent.

Available agents and their capabilities:
${Object.entries(AGENT_CAPABILITIES).map(([id, caps]) => `- ${id}: ${caps.join(', ')}`).join('\n')}

Return a JSON object:
{
  "action": "pay|audit|deploy|bridge|analyze|hire_agent|escrow|shield|batch_pay",
  "entities": {
    "recipient": "0x... or null",
    "recipients": [{"name": "...", "wallet": "0x...", "amount": 100}] or null,
    "amount": 100 or null,
    "token": "AlphaUSD",
    "contract": "0x... or null",
    "contractSource": "solidity code or null",
    "duration": 48 (hours) or null,
    "jobId": null
  },
  "requiredAgents": ["agent-id-1", "agent-id-2"],
  "isMultiStep": false,
  "privacyRequired": false,
  "estimatedBudget": 100,
  "summary": "Brief summary of the intent",
  "confidence": 0.95
}

RULES:
- "batch_pay" for payroll/batch payments (uses payroll-planner)
- "shield" for private/anonymous payments (uses shield-executor)
- "escrow" for escrow operations (uses escrow-manager)
- "deploy" for any contract/token deployment
- "audit" for security reviews
- isMultiStep=true when 2+ agents need to work sequentially (e.g., "audit then deploy")
- privacyRequired=true when user wants hidden/private/shielded payments
- estimatedBudget = sum of agent prices + on-chain costs
- Always include at least one agent in requiredAgents
Return ONLY valid JSON.`;

// ── Intent Parser Class ──────────────────────────────────────

export class IntentParser {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async parse(prompt: string): Promise<ParsedIntent> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
      const parsed = JSON.parse(jsonMatch[1]!.trim());

      // Validate required fields
      if (!parsed.action || !parsed.requiredAgents?.length) {
        throw new Error('Missing required fields in parsed intent');
      }

      return parsed as ParsedIntent;
    } catch (err) {
      // Fallback: try to infer intent from keywords
      return this.fallbackParse(prompt);
    }
  }

  private fallbackParse(prompt: string): ParsedIntent {
    const lower = prompt.toLowerCase();
    let action: ParsedIntent['action'] = 'analyze';
    let agents: string[] = [];

    // Simple keyword matching fallback
    if (lower.includes('audit') && lower.includes('deploy')) {
      action = 'deploy';
      agents = ['contract-auditor', 'contract-deploy-pro'];
    } else if (lower.includes('deploy') && lower.includes('token')) {
      action = 'deploy';
      agents = ['token-deployer'];
    } else if (lower.includes('deploy')) {
      action = 'deploy';
      agents = ['contract-deploy-pro'];
    } else if (lower.includes('audit')) {
      action = 'audit';
      agents = ['contract-auditor'];
    } else if (lower.includes('payroll') || lower.includes('pay team') || lower.includes('batch')) {
      action = 'batch_pay';
      agents = ['payroll-planner'];
    } else if (lower.includes('escrow') || lower.includes('lock fund')) {
      action = 'escrow';
      agents = ['escrow-manager'];
    } else if (lower.includes('shield') || lower.includes('private') || lower.includes('anonymous')) {
      action = 'shield';
      agents = ['shield-executor'];
    } else {
      agents = ['risk-analyzer'];
    }

    return {
      action,
      entities: {},
      requiredAgents: agents,
      isMultiStep: agents.length > 1,
      privacyRequired: action === 'shield',
      estimatedBudget: agents.length * 100,
      summary: `Inferred: ${action} using ${agents.join(', ')}`,
      confidence: 0.5,
    };
  }
}
