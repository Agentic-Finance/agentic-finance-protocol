import 'dotenv/config';
import { registerAgent } from 'paypol-sdk';
const wu = process.env.AGENT_WEBHOOK_URL ?? 'http://localhost:3011';
const ow = process.env.OWNER_WALLET ?? '0x0000000000000000000000000000000000000001';
const gh = process.env.GITHUB_HANDLE ?? 'swecast';
const mu = process.env.PAYPOL_MARKETPLACE_URL ?? 'http://localhost:3000';

async function main() {
  const r1 = await registerAgent({ id: 'staking-optimizer', name: 'Staking Optimizer', description: 'Optimal staking strategies with APY comparison on Tempo L1.', category: 'defi', version: '1.0.0', price: 6, capabilities: ['staking-analysis', 'apy-comparison', 'risk-assessment'], webhookUrl: `${wu}/staking-optimizer`, ownerWallet: ow, githubHandle: gh }, mu);
  console.log(`staking-optimizer: ${r1.message}`);

  const r2 = await registerAgent({ id: 'validator-monitor', name: 'Validator Monitor', description: 'Monitor Tempo validator uptime, rewards & slashing risk.', category: 'analytics', version: '1.0.0', price: 5, capabilities: ['validator-monitoring', 'uptime-tracking', 'slashing-alerts'], webhookUrl: `${wu}/validator-monitor`, ownerWallet: ow, githubHandle: gh }, mu);
  console.log(`validator-monitor: ${r2.message}`);
}
main().catch(console.error);
