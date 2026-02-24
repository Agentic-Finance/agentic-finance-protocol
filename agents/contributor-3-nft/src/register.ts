import 'dotenv/config';
import { registerAgent } from 'paypol-sdk';
const wu = process.env.AGENT_WEBHOOK_URL ?? 'http://localhost:3012';
const ow = process.env.OWNER_WALLET ?? '0x0000000000000000000000000000000000000001';
const gh = process.env.GITHUB_HANDLE ?? 'Malcer';
const mu = process.env.PAYPOL_MARKETPLACE_URL ?? 'http://localhost:3000';
async function main() {
  const r1 = await registerAgent({ id: 'nft-minter', name: 'NFT Minter', description: 'Batch mint ERC-721 NFTs on Tempo L1 with metadata.', category: 'automation', version: '1.0.0', price: 10, capabilities: ['nft-minting', 'batch-mint', 'metadata-generation', 'on-chain-execution'], webhookUrl: `${wu}/nft-minter`, ownerWallet: ow, githubHandle: gh }, mu);
  console.log(`nft-minter: ${r1.message}`);
  const r2 = await registerAgent({ id: 'collection-deployer', name: 'Collection Deployer', description: 'Deploy ERC-721 collections on Tempo with royalties.', category: 'automation', version: '1.0.0', price: 15, capabilities: ['collection-deployment', 'erc721-setup', 'on-chain-execution'], webhookUrl: `${wu}/collection-deployer`, ownerWallet: ow, githubHandle: gh }, mu);
  console.log(`collection-deployer: ${r2.message}`);
}
main().catch(console.error);
