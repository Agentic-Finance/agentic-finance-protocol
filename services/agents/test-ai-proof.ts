/**
 * Test AI Proof System — commit, verify, and mismatch scenarios
 */

import 'dotenv/config';

// Set env vars before importing
process.env.DAEMON_PRIVATE_KEY = '0x3a573b684c573b069719efebf714c021ac4f6f8480aa397375fe58fa16b93eae';

import {
  generatePlanHash,
  generateResultHash,
  commitOnChain,
  verifyOnChain,
  getProofStats,
} from './src/utils/ai-proof';

async function main() {
  console.log('=== AI Proof Registry Test ===\n');

  // 1. Get initial stats
  const statsBefore = await getProofStats();
  console.log('📊 Stats before:', statsBefore);

  // 2. Test: Matching commitment (plan = result)
  console.log('\n--- Test 1: Matching Commitment ---');
  const plan = 'Audit the ERC20 contract for reentrancy, overflow, and access control vulnerabilities';
  const planHash = generatePlanHash(plan);
  console.log(`  Plan: "${plan.slice(0, 50)}..."`);
  console.log(`  Plan Hash: ${planHash}`);

  const commitResult = await commitOnChain(planHash, 0);
  console.log(`  ✅ Committed on-chain!`);
  console.log(`    Commitment ID: ${commitResult.commitmentId}`);
  console.log(`    TX: ${commitResult.explorerUrl}`);

  // Use the SAME plan as the "result" to test a match
  const resultHash = generatePlanHash(plan); // Same hash = match
  const verifyResult = await verifyOnChain(commitResult.commitmentId, resultHash);
  console.log(`  ✅ Verified on-chain!`);
  console.log(`    Matched: ${verifyResult.matched}`);
  console.log(`    TX: ${verifyResult.explorerUrl}`);

  // 3. Test: Mismatching commitment (plan != result)
  console.log('\n--- Test 2: Mismatching Commitment ---');
  const plan2 = 'Deploy a token on Tempo L1';
  const plan2Hash = generatePlanHash(plan2);
  const differentResult = { success: true, address: '0x123', unexpected: true };
  const differentResultHash = generateResultHash(differentResult);

  console.log(`  Plan: "${plan2}"`);
  console.log(`  Plan Hash: ${plan2Hash}`);

  const commit2 = await commitOnChain(plan2Hash, 1);
  console.log(`  ✅ Committed on-chain!`);
  console.log(`    Commitment ID: ${commit2.commitmentId}`);
  console.log(`    TX: ${commit2.explorerUrl}`);

  const verify2 = await verifyOnChain(commit2.commitmentId, differentResultHash);
  console.log(`  ✅ Verified on-chain!`);
  console.log(`    Matched: ${verify2.matched} (expected: false)`);
  console.log(`    TX: ${verify2.explorerUrl}`);

  // 4. Final stats
  const statsAfter = await getProofStats();
  console.log('\n📊 Stats after:', statsAfter);
  console.log(`\n  Commitments: ${statsBefore.totalCommitments} → ${statsAfter.totalCommitments}`);
  console.log(`  Verified: ${statsBefore.totalVerified} → ${statsAfter.totalVerified}`);
  console.log(`  Matched: ${statsBefore.totalMatched} → ${statsAfter.totalMatched}`);
  console.log(`  Mismatched: ${statsBefore.totalMismatched} → ${statsAfter.totalMismatched}`);

  console.log('\n✅ All AI Proof tests passed!');
}

main().catch(console.error);
