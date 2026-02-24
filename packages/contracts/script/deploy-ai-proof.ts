/**
 * Deploy AIProofRegistry to Tempo Moderato testnet
 */
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

const RPC_URL = 'https://rpc.moderato.tempo.xyz';
const PRIVATE_KEY = '0x3a573b684c573b069719efebf714c021ac4f6f8480aa397375fe58fa16b93eae';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, { name: 'tempo-moderato', chainId: 42431 });
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`Deploying AIProofRegistry from ${wallet.address}...`);

  // Read compiled artifact
  const artifactPath = path.resolve(process.cwd(), 'out/AIProofRegistry.sol/AIProofRegistry.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, wallet);
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');

  const contract = await factory.deploy({ nonce, gasLimit: 5_000_000, type: 0 });
  const receipt = await contract.deploymentTransaction()!.wait(1);
  const address = await contract.getAddress();

  console.log(`\n✅ AIProofRegistry deployed!`);
  console.log(`   Address: ${address}`);
  console.log(`   TX Hash: ${receipt!.hash}`);
  console.log(`   Gas Used: ${receipt!.gasUsed.toString()}`);
  console.log(`   Explorer: https://explore.tempo.xyz/address/${address}`);
}

main().catch(console.error);
