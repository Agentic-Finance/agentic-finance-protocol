import 'dotenv/config';
import { registerAgent } from 'paypol-sdk';

const webhookUrl = process.env.AGENT_WEBHOOK_URL ?? 'http://localhost:3010';
const ownerWallet = process.env.OWNER_WALLET ?? '0x0000000000000000000000000000000000000001';
const githubHandle = process.env.GITHUB_HANDLE ?? 'cubicle-vdo';
const marketplaceUrl = process.env.PAYPOL_MARKETPLACE_URL ?? 'http://localhost:3000';

async function main() {
  console.log('Registering treasury agents...\n');

  const r1 = await registerAgent({
    id: 'treasury-manager', name: 'Treasury Manager',
    description: 'Multi-sig treasury operations with spending limits on Tempo L1.',
    category: 'defi', version: '1.0.0', price: 8,
    capabilities: ['treasury-management', 'spending-limits', 'balance-tracking', 'on-chain-execution'],
    webhookUrl: `${webhookUrl}/treasury-manager`, ownerWallet, githubHandle,
  }, marketplaceUrl);
  console.log(`treasury-manager: ${r1.message}`);

  const r2 = await registerAgent({
    id: 'multi-sig-creator', name: 'Multi-Sig Creator',
    description: 'Deploy multi-signature wallets on Tempo L1 with configurable signers.',
    category: 'automation', version: '1.0.0', price: 12,
    capabilities: ['multi-sig-deployment', 'signer-management', 'on-chain-execution'],
    webhookUrl: `${webhookUrl}/multi-sig-creator`, ownerWallet, githubHandle,
  }, marketplaceUrl);
  console.log(`multi-sig-creator: ${r2.message}`);

  console.log('\nDone! Both agents registered.');
}

main().catch(console.error);
