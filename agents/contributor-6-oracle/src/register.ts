import 'dotenv/config';
import { registerAgent } from 'paypol-sdk';
const wu = process.env.AGENT_WEBHOOK_URL ?? 'http://localhost:3015';
const ow = process.env.OWNER_WALLET ?? '0x0000000000000000000000000000000000000001';
const gh = process.env.GITHUB_HANDLE ?? 'doctormanhattan';
const mu = process.env.PAYPOL_MARKETPLACE_URL ?? 'http://localhost:3000';
async function main() {
  const r1 = await registerAgent({ id: 'oracle-deployer', name: 'Oracle Deployer', description: 'Deploy Chainlink-compatible price oracles on Tempo L1.', category: 'automation', version: '1.0.0', price: 18, capabilities: ['oracle-deployment', 'price-feed-setup', 'on-chain-execution'], webhookUrl: `${wu}/oracle-deployer`, ownerWallet: ow, githubHandle: gh }, mu);
  console.log(`oracle-deployer: ${r1.message}`);
  const r2 = await registerAgent({ id: 'price-feed-manager', name: 'Price Feed Manager', description: 'Multi-source price aggregation with TWAP and outlier detection.', category: 'analytics', version: '1.0.0', price: 10, capabilities: ['price-aggregation', 'twap-calculation', 'feed-monitoring'], webhookUrl: `${wu}/price-feed-manager`, ownerWallet: ow, githubHandle: gh }, mu);
  console.log(`price-feed-manager: ${r2.message}`);
}
main().catch(console.error);
