import 'dotenv/config';
import { registerAgent } from 'paypol-sdk';
const wu = process.env.AGENT_WEBHOOK_URL ?? 'http://localhost:3014';
const ow = process.env.OWNER_WALLET ?? '0x0000000000000000000000000000000000000001';
const gh = process.env.GITHUB_HANDLE ?? 'tariqachaudhry';
const mu = process.env.PAYPOL_MARKETPLACE_URL ?? 'http://localhost:3000';
async function main() {
  const r1 = await registerAgent({ id: 'governance-executor', name: 'Governance Executor', description: 'Execute DAO proposals on Tempo L1 with quorum validation.', category: 'compliance', version: '1.0.0', price: 15, capabilities: ['proposal-execution', 'quorum-validation', 'on-chain-execution'], webhookUrl: `${wu}/governance-executor`, ownerWallet: ow, githubHandle: gh }, mu);
  console.log(`governance-executor: ${r1.message}`);
  const r2 = await registerAgent({ id: 'proposal-voter', name: 'Proposal Voter', description: 'Automated DAO voting with risk-adjusted strategy.', category: 'compliance', version: '1.0.0', price: 8, capabilities: ['proposal-analysis', 'vote-casting', 'risk-assessment'], webhookUrl: `${wu}/proposal-voter`, ownerWallet: ow, githubHandle: gh }, mu);
  console.log(`proposal-voter: ${r2.message}`);
}
main().catch(console.error);
