import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  RPC_URL,
  AI_PROOF_REGISTRY_ADDRESS,
  AI_PROOF_REGISTRY_ABI,
  SECURITY_DEPOSIT_ADDRESS,
  SECURITY_DEPOSIT_ABI,
} from '../../../lib/constants';

/**
 * GET /api/sentinel/node-status
 *
 * Aggregates node health from on-chain contracts (AIProofRegistry, SecurityDepositVault)
 * and existing API data.
 */
export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const [proofStats, vaultStats] = await Promise.allSettled([
      // AIProofRegistry stats
      (async () => {
        const registry = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI, provider);
        const stats = await registry.getStats();
        return {
          totalCommitments: Number(stats[0]),
          totalVerified: Number(stats[1]),
          totalMatched: Number(stats[2]),
          totalSlashed: Number(stats[4]),
        };
      })(),

      // SecurityDepositVault stats
      (async () => {
        const vault = new ethers.Contract(SECURITY_DEPOSIT_ADDRESS, SECURITY_DEPOSIT_ABI, provider);
        const [totalDeposited, , , insurancePool, totalAgents] = await vault.getStats();
        return {
          totalDeposited: Number(ethers.formatUnits(totalDeposited, 6)),
          insurancePool: Number(ethers.formatUnits(insurancePool, 6)),
          totalAgents: Number(totalAgents),
        };
      })(),
    ]);

    const proof = proofStats.status === 'fulfilled'
      ? proofStats.value
      : { totalCommitments: 0, totalVerified: 0, totalMatched: 0, totalSlashed: 0 };

    const vault = vaultStats.status === 'fulfilled'
      ? vaultStats.value
      : { totalDeposited: 0, insurancePool: 0, totalAgents: 0 };

    return NextResponse.json({
      success: true,
      status: {
        uptime: 99.8, // Derived from daemon health — hardcoded for now
        activeAgents: 32,
        totalAgents: 32,
        a2aVolume: 0, // Will be enriched from stats if available
        proofStats: proof,
        vaultStats: vault,
      },
    });
  } catch (error: any) {
    console.error('[sentinel/node-status] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
