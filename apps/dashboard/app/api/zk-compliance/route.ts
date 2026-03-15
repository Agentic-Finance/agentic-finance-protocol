/**
 * ZK Compliance API
 *
 * POST /api/zk-compliance — Generate ZK compliance proof for a wallet
 * GET  /api/zk-compliance?wallet=0x... — Get existing compliance status
 *
 * Generates privacy-preserving proofs using Poseidon hashing:
 * - KYC attestation (without revealing identity)
 * - Reputation threshold proof
 * - Zero-slash record proof
 * - Minimum deposit proof
 * - Audit compliance proof
 * - Selective disclosure of agent identity
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import prisma from '@/app/lib/prisma';
import {
  RPC_URL,
  REPUTATION_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ABI,
  SECURITY_DEPOSIT_ADDRESS,
  SECURITY_DEPOSIT_ABI,
  AI_PROOF_REGISTRY_ADDRESS,
  AI_PROOF_REGISTRY_ABI,
} from '@/app/lib/constants';
import {
  generateKYCClaim,
  generateReputationClaim,
  generateZeroSlashClaim,
  generateMinDepositClaim,
  generateAuditClaim,
  aggregateProof,
  selectiveDisclosure,
  ZKProofClaim,
} from '@/app/lib/zk-compliance';
import { requireWalletAuth } from '@/app/lib/api-auth';

/**
 * POST /api/zk-compliance — Generate new ZK compliance proof
 *
 * Body: {
 *   claims: string[]  — Which claims to prove:
 *     "kyc-passed", "min-reputation", "zero-slash",
 *     "min-deposit", "audit-compliant", "verified-agent"
 *   params?: {
 *     kycLevel?: "basic" | "enhanced" | "institutional",
 *     jurisdiction?: string,
 *     reputationThreshold?: number,
 *     minDeposit?: number,
 *     auditPeriod?: string,
 *     auditLimit?: number,
 *     selectiveFields?: string[]  — Fields to reveal in disclosure
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  const auth = requireWalletAuth(req);
  if (!auth.valid) return auth.response!;

  try {
    const body = await req.json();
    const { claims: requestedClaims = [], params = {} } = body;
    const wallet = auth.wallet!;

    if (!requestedClaims.length) {
      return NextResponse.json(
        {
          error: 'No claims requested',
          availableClaims: [
            'kyc-passed', 'min-reputation', 'zero-slash',
            'min-deposit', 'audit-compliant', 'verified-agent',
          ],
        },
        { status: 400 },
      );
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // ── Fetch on-chain data in parallel ────────────────────

    const [reputationData, depositData, proofStats, jobStats] = await Promise.all([
      (async () => {
        try {
          const rep = new ethers.Contract(REPUTATION_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ABI, provider);
          const [score, tier, data] = await Promise.all([
            rep.getCompositeScore(wallet),
            rep.getTier(wallet),
            rep.getReputation(wallet),
          ]);
          return {
            compositeScore: Number(score),
            tier: Number(tier),
            proofSlashed: Number(data.proofSlashed),
          };
        } catch {
          return { compositeScore: 0, tier: 0, proofSlashed: 0 };
        }
      })(),

      (async () => {
        try {
          const vault = new ethers.Contract(SECURITY_DEPOSIT_ADDRESS, SECURITY_DEPOSIT_ABI, provider);
          const [amount, , slashCount] = await vault.getDeposit(wallet);
          return {
            amount: Number(ethers.formatUnits(amount, 6)),
            slashCount: Number(slashCount),
          };
        } catch {
          return { amount: 0, slashCount: 0 };
        }
      })(),

      (async () => {
        try {
          const reg = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI, provider);
          const s = await reg.getStats();
          return { totalSlashed: Number(s[4]) };
        } catch {
          return { totalSlashed: 0 };
        }
      })(),

      (async () => {
        const completed = await prisma.agentJob.count({
          where: { clientWallet: wallet, status: 'COMPLETED' },
        });
        const total = await prisma.agentJob.count({
          where: { clientWallet: wallet },
        });
        return { completed, total };
      })(),
    ]);

    // ── Generate requested claims ──────────────────────────

    const generatedClaims: ZKProofClaim[] = [];
    const errors: Record<string, string> = {};

    for (const claimType of requestedClaims) {
      try {
        switch (claimType) {
          case 'kyc-passed': {
            const claim = await generateKYCClaim(
              wallet,
              params.kycLevel || 'basic',
              params.jurisdiction || 'US',
            );
            generatedClaims.push(claim);
            break;
          }

          case 'min-reputation': {
            const threshold = params.reputationThreshold || 5000;
            const claim = await generateReputationClaim(
              wallet,
              reputationData.compositeScore,
              threshold,
            );
            generatedClaims.push(claim);
            break;
          }

          case 'zero-slash': {
            const totalSlashes = depositData.slashCount + reputationData.proofSlashed;
            const claim = await generateZeroSlashClaim(wallet, totalSlashes);
            generatedClaims.push(claim);
            break;
          }

          case 'min-deposit': {
            const minDeposit = params.minDeposit || 50;
            const claim = await generateMinDepositClaim(
              wallet,
              depositData.amount,
              minDeposit,
            );
            generatedClaims.push(claim);
            break;
          }

          case 'audit-compliant': {
            // Calculate transaction volume from completed jobs
            const totalVolume = jobStats.completed * 10; // Estimated avg $10/job
            const regulatoryLimit = params.auditLimit || 100000;
            const period = params.auditPeriod || '2026-Q1';
            const claim = await generateAuditClaim(
              wallet,
              totalVolume,
              regulatoryLimit,
              period,
            );
            generatedClaims.push(claim);
            break;
          }

          case 'verified-agent': {
            const agent = await prisma.marketplaceAgent.findFirst({
              where: { ownerWallet: wallet, isVerified: true },
            });
            if (!agent) {
              errors['verified-agent'] = 'No verified agents found for this wallet';
            } else {
              const claim = await generateKYCClaim(wallet, 'enhanced', 'VERIFIED');
              claim.claimType = 'verified-agent';
              claim.publicParams = {
                ...claim.publicParams,
                isVerified: true,
                agentName: agent.name,
              };
              generatedClaims.push(claim);
            }
            break;
          }

          default:
            errors[claimType] = `Unknown claim type: ${claimType}`;
        }
      } catch (err: any) {
        errors[claimType] = err.message;
      }
    }

    if (generatedClaims.length === 0) {
      return NextResponse.json(
        {
          error: 'No claims could be generated',
          errors,
          hint: 'Ensure your wallet has sufficient reputation, deposits, or other prerequisites.',
        },
        { status: 400 },
      );
    }

    // ── Aggregate into composite proof ─────────────────────

    const proof = await aggregateProof(wallet, generatedClaims);

    // ── Optional: Selective Disclosure ──────────────────────

    let disclosure: any = null;
    if (params.selectiveFields) {
      const agentData = {
        wallet,
        reputationScore: reputationData.compositeScore,
        reputationTier: reputationData.tier,
        depositAmount: depositData.amount,
        slashCount: depositData.slashCount,
        totalJobs: jobStats.total,
        completedJobs: jobStats.completed,
      };
      disclosure = await selectiveDisclosure(agentData, params.selectiveFields);
    }

    return NextResponse.json({
      success: true,
      proof: {
        did: proof.did,
        wallet: proof.wallet,
        proofRoot: proof.proofRoot,
        attestation: proof.attestation,
        expiresAt: proof.expiresAt,
        chainId: proof.chainId,
        claimCount: proof.claims.length,
        claims: proof.claims.map(c => ({
          claimType: c.claimType,
          claimHash: c.claimHash,
          nullifier: c.nullifier,
          publicParams: c.publicParams,
          timestamp: c.timestamp,
          // NOTE: salt is NOT included — only prover knows it
        })),
      },
      selectiveDisclosure: disclosure,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      metadata: {
        proofMethod: 'Poseidon Hash (BN254)',
        hashFunction: 'circomlibjs/buildPoseidon',
        network: 'Tempo Moderato Testnet',
        chainId: 42431,
        verifiableOnChain: true,
        contracts: {
          ReputationRegistry: REPUTATION_REGISTRY_ADDRESS,
          SecurityDeposit: SECURITY_DEPOSIT_ADDRESS,
          AIProofRegistry: AI_PROOF_REGISTRY_ADDRESS,
        },
      },
    });

  } catch (err: any) {
    console.error('[zk-compliance] Error:', err.message);
    return NextResponse.json(
      { error: 'Failed to generate compliance proof', details: err.message },
      { status: 500 },
    );
  }
}

/**
 * GET /api/zk-compliance?wallet=0x... — Get compliance status overview
 */
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet');
    if (!wallet || !ethers.isAddress(wallet)) {
      return NextResponse.json({ error: 'Valid wallet required' }, { status: 400 });
    }

    const w = wallet.toLowerCase();
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const [repScore, repTier, deposit, slashCount, jobCount, agentVerified] = await Promise.all([
      (async () => {
        try {
          const rep = new ethers.Contract(REPUTATION_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ABI, provider);
          return Number(await rep.getCompositeScore(w));
        } catch { return 0; }
      })(),
      (async () => {
        try {
          const rep = new ethers.Contract(REPUTATION_REGISTRY_ADDRESS, REPUTATION_REGISTRY_ABI, provider);
          return Number(await rep.getTier(w));
        } catch { return 0; }
      })(),
      (async () => {
        try {
          const vault = new ethers.Contract(SECURITY_DEPOSIT_ADDRESS, SECURITY_DEPOSIT_ABI, provider);
          const [amount] = await vault.getDeposit(w);
          return Number(ethers.formatUnits(amount, 6));
        } catch { return 0; }
      })(),
      (async () => {
        try {
          const vault = new ethers.Contract(SECURITY_DEPOSIT_ADDRESS, SECURITY_DEPOSIT_ABI, provider);
          const [, , count] = await vault.getDeposit(w);
          return Number(count);
        } catch { return 0; }
      })(),
      prisma.agentJob.count({ where: { clientWallet: w } }),
      prisma.marketplaceAgent.findFirst({
        where: { ownerWallet: w, isVerified: true },
        select: { name: true },
      }),
    ]);

    // Determine which claims this wallet CAN prove
    const availableClaims: string[] = ['kyc-passed', 'audit-compliant']; // Always available
    if (repScore >= 5000) availableClaims.push('min-reputation');
    if (slashCount === 0) availableClaims.push('zero-slash');
    if (deposit >= 50) availableClaims.push('min-deposit');
    if (agentVerified) availableClaims.push('verified-agent');

    return NextResponse.json({
      wallet: w,
      did: `did:agtfi:tempo:42431:${w}`,
      complianceStatus: {
        reputationScore: repScore,
        reputationTier: repTier,
        securityDeposit: deposit,
        slashCount,
        totalJobs: jobCount,
        isVerified: !!agentVerified,
      },
      availableClaims,
      unavailableClaims: {
        ...(repScore < 5000 ? { 'min-reputation': `Score ${repScore} < 5000 threshold` } : {}),
        ...(slashCount > 0 ? { 'zero-slash': `Has ${slashCount} slash(es)` } : {}),
        ...(deposit < 50 ? { 'min-deposit': `Deposit ${deposit} < 50 minimum` } : {}),
        ...(!agentVerified ? { 'verified-agent': 'No verified agents' } : {}),
      },
      proofEndpoint: 'POST /api/zk-compliance',
    });

  } catch (err: any) {
    console.error('[zk-compliance] GET error:', err.message);
    return NextResponse.json({ error: 'Failed to check compliance' }, { status: 500 });
  }
}
