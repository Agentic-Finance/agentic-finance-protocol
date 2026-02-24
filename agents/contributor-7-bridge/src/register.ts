import 'dotenv/config';
import { registerAgent } from 'paypol-sdk';
const wu = process.env.AGENT_WEBHOOK_URL ?? 'http://localhost:3016';
const ow = process.env.OWNER_WALLET ?? '0x0000000000000000000000000000000000000001';
const gh = process.env.GITHUB_HANDLE ?? 'Hobnobs';
const mu = process.env.PAYPOL_MARKETPLACE_URL ?? 'http://localhost:3000';
async function main() {
  const r1 = await registerAgent({ id: 'cross-chain-relayer', name: 'Cross-Chain Relayer', description: 'Relay assets between Tempo and EVM chains with proof verification.', category: 'automation', version: '1.0.0', price: 12, capabilities: ['cross-chain-relay', 'asset-bridging', 'on-chain-execution'], webhookUrl: `${wu}/cross-chain-relayer`, ownerWallet: ow, githubHandle: gh }, mu);
  console.log(`cross-chain-relayer: ${r1.message}`);
  const r2 = await registerAgent({ id: 'bridge-operator', name: 'Bridge Operator', description: 'Manage bridge liquidity pools and cross-chain transfers.', category: 'defi', version: '1.0.0', price: 14, capabilities: ['bridge-management', 'liquidity-rebalancing', 'on-chain-execution'], webhookUrl: `${wu}/bridge-operator`, ownerWallet: ow, githubHandle: gh }, mu);
  console.log(`bridge-operator: ${r2.message}`);
}
main().catch(console.error);
