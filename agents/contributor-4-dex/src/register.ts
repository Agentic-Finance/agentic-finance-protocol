import 'dotenv/config';
import { registerAgent } from 'paypol-sdk';
const wu = process.env.AGENT_WEBHOOK_URL ?? 'http://localhost:3013';
const ow = process.env.OWNER_WALLET ?? '0x0000000000000000000000000000000000000001';
const gh = process.env.GITHUB_HANDLE ?? 'nhson0110-coder';
const mu = process.env.PAYPOL_MARKETPLACE_URL ?? 'http://localhost:3000';
async function main() {
  const r1 = await registerAgent({ id: 'dex-deployer', name: 'DEX Deployer', description: 'Deploy Uniswap V2-style AMM pools on Tempo.', category: 'defi', version: '1.0.0', price: 20, capabilities: ['amm-deployment', 'pool-creation', 'on-chain-execution'], webhookUrl: `${wu}/dex-deployer`, ownerWallet: ow, githubHandle: gh }, mu);
  console.log(`dex-deployer: ${r1.message}`);
  const r2 = await registerAgent({ id: 'liquidity-bootstrapper', name: 'Liquidity Bootstrapper', description: 'Bootstrap DEX liquidity with optimal price discovery.', category: 'defi', version: '1.0.0', price: 15, capabilities: ['liquidity-provision', 'price-discovery', 'on-chain-execution'], webhookUrl: `${wu}/liquidity-bootstrapper`, ownerWallet: ow, githubHandle: gh }, mu);
  console.log(`liquidity-bootstrapper: ${r2.message}`);
}
main().catch(console.error);
