/**
 * Verifiable AI API
 *
 * POST /api/verifiable-ai — Register model, commit decision, verify result
 * GET  /api/verifiable-ai — Stats, model info, agent integrity
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import {
  computeModelHash,
  computeFrameworkHash,
  hashDecisionInput,
  hashDecisionOutput,
  hashFullDecision,
  commitDecisionOnChain,
  verifyDecisionOnChain,
  getVerificationStats,
  calculateIntegrityScore,
} from '@/app/lib/verifiable-ai/engine';

// ────────────────────────────────────────────
// GET /api/verifiable-ai
// ────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // Get on-chain verification stats
  if (action === 'stats') {
    try {
      const onChainStats = await getVerificationStats();
      const dbStats = await Promise.all([
        prisma.modelRegistry.count(),
        prisma.decisionProof.count(),
        prisma.decisionProof.count({ where: { verified: true } }),
      ]);

      return NextResponse.json({
        onChain: onChainStats,
        offChain: {
          registeredModels: dbStats[0],
          totalDecisionProofs: dbStats[1],
          verifiedProofs: dbStats[2],
        },
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Get model registry for an agent
  if (action === 'models') {
    const agentId = searchParams.get('agentId');
    const models = await prisma.modelRegistry.findMany({
      where: agentId ? { agentId } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ models, count: models.length });
  }

  // Get integrity score for an agent
  if (action === 'integrity') {
    const agentId = searchParams.get('agentId');
    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
    }

    const proofs = await prisma.decisionProof.aggregate({
      where: { agentId },
      _count: true,
    });

    const verified = await prisma.decisionProof.count({
      where: { agentId, verified: true },
    });

    const matched = await prisma.decisionProof.count({
      where: { agentId, matched: true },
    });

    const slashed = await prisma.decisionProof.count({
      where: { agentId, slashed: true },
    });

    const score = calculateIntegrityScore({
      totalCommitments: proofs._count,
      totalVerified: verified,
      totalMatched: matched,
      totalSlashed: slashed,
    });

    const tier =
      score >= 90 ? 'Platinum' :
      score >= 75 ? 'Gold' :
      score >= 60 ? 'Silver' :
      score >= 40 ? 'Bronze' : 'Unverified';

    return NextResponse.json({
      agentId,
      integrityScore: score,
      tier,
      stats: {
        totalCommitments: proofs._count,
        verified,
        matched,
        slashed,
        matchRate: verified > 0 ? ((matched / verified) * 100).toFixed(1) + '%' : 'N/A',
      },
    });
  }

  // Decision proof history for an agent
  if (action === 'proofs') {
    const agentId = searchParams.get('agentId');
    const jobId = searchParams.get('jobId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const proofs = await prisma.decisionProof.findMany({
      where: {
        ...(agentId ? { agentId } : {}),
        ...(jobId ? { jobId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return NextResponse.json({ proofs, count: proofs.length });
  }

  // Protocol info
  return NextResponse.json({
    protocol: 'Agentic Finance Verifiable AI',
    description: 'Cryptographic proofs that AI agents make correct decisions. Model hashes + decision commitments verified on-chain.',
    contract: '0x8fDB8E871c9eaF2955009566F41490Bbb128a014',
    chain: 'Tempo Moderato (42431)',
    features: [
      'Model Registry — hash agent model weights and code on-chain',
      'Decision Proofs — commit input→output pairs with keccak256',
      'On-chain Verification — AIProofRegistry verifies plan matches result',
      'Integrity Scoring — 0-100 score based on proof history',
      'Slashing — agents with mismatched proofs get slashed',
    ],
    endpoints: {
      register_model: 'POST /api/verifiable-ai { action: "register_model", ... }',
      commit: 'POST /api/verifiable-ai { action: "commit", ... }',
      verify: 'POST /api/verifiable-ai { action: "verify", ... }',
      stats: 'GET /api/verifiable-ai?action=stats',
      models: 'GET /api/verifiable-ai?action=models&agentId=xxx',
      integrity: 'GET /api/verifiable-ai?action=integrity&agentId=xxx',
      proofs: 'GET /api/verifiable-ai?action=proofs&agentId=xxx',
    },
  });
}

// ────────────────────────────────────────────
// POST /api/verifiable-ai
// ────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'register_model':
        return await handleRegisterModel(body);
      case 'commit':
        return await handleCommit(body);
      case 'verify':
        return await handleVerify(body);
      case 'hash_decision':
        return await handleHashDecision(body);
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: register_model, commit, verify, hash_decision' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[Verifiable AI Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// Action Handlers
// ────────────────────────────────────────────

async function handleRegisterModel(body: any) {
  const { agentId, modelName, modelVersion, modelCode, framework, dependencies, inputSchema, outputSchema } = body;

  if (!agentId || !modelName || !modelVersion) {
    return NextResponse.json({ error: 'Missing agentId, modelName, or modelVersion' }, { status: 400 });
  }

  const modelHash = computeModelHash(modelCode || modelName, modelVersion, agentId);
  const frameworkHash = computeFrameworkHash(
    framework || 'unknown',
    dependencies || {}
  );

  // Check for duplicate
  const existing = await prisma.modelRegistry.findFirst({
    where: { agentId, modelHash },
  });
  if (existing) {
    return NextResponse.json({
      success: true,
      message: 'Model already registered',
      modelId: existing.id,
      modelHash: existing.modelHash,
    });
  }

  const model = await prisma.modelRegistry.create({
    data: {
      agentId,
      modelName,
      modelVersion,
      modelHash,
      frameworkHash,
      inputSchema: inputSchema ? JSON.stringify(inputSchema) : null,
      outputSchema: outputSchema ? JSON.stringify(outputSchema) : null,
      isActive: true,
    },
  });

  return NextResponse.json({
    success: true,
    modelId: model.id,
    modelHash: model.modelHash,
    frameworkHash: model.frameworkHash,
    message: 'Model registered. Use this modelHash in decision commitments.',
  });
}

async function handleCommit(body: any) {
  const { agentId, jobId, input, modelHash, nexusJobId } = body;

  if (!agentId || !input) {
    return NextResponse.json({ error: 'Missing agentId or input' }, { status: 400 });
  }

  const inputHash = hashDecisionInput(input);
  const planHash = modelHash
    ? hashFullDecision(inputHash, inputHash, modelHash)
    : inputHash;

  // Record off-chain
  const proof = await prisma.decisionProof.create({
    data: {
      agentId,
      jobId: jobId || null,
      inputHash,
      planHash,
      modelHash: modelHash || null,
      verified: false,
      matched: false,
      slashed: false,
    },
  });

  // Optional: commit on-chain if nexusJobId provided
  let onChain: { commitmentId: string; txHash: string } | null = null;
  if (nexusJobId) {
    try {
      onChain = await commitDecisionOnChain(planHash, nexusJobId);
      await prisma.decisionProof.update({
        where: { id: proof.id },
        data: {
          commitmentId: onChain.commitmentId,
          commitTxHash: onChain.txHash,
        },
      });
    } catch (error: any) {
      console.error('[Verifiable AI] On-chain commit failed:', error.message);
    }
  }

  return NextResponse.json({
    success: true,
    proofId: proof.id,
    planHash,
    inputHash,
    onChain: onChain ? { commitmentId: onChain.commitmentId, txHash: onChain.txHash } : null,
    message: 'Decision committed. After execution, call verify with the output.',
  });
}

async function handleVerify(body: any) {
  const { proofId, output, commitmentId } = body;

  if (!proofId || !output) {
    return NextResponse.json({ error: 'Missing proofId or output' }, { status: 400 });
  }

  const proof = await prisma.decisionProof.findUnique({ where: { id: proofId } });
  if (!proof) {
    return NextResponse.json({ error: 'Proof not found' }, { status: 404 });
  }

  const outputHash = hashDecisionOutput(output);
  const resultHash = proof.modelHash
    ? hashFullDecision(proof.inputHash, outputHash, proof.modelHash)
    : outputHash;

  const matched = proof.planHash === resultHash;

  // Update off-chain record
  await prisma.decisionProof.update({
    where: { id: proofId },
    data: {
      outputHash,
      resultHash,
      verified: true,
      matched,
      verifiedAt: new Date(),
    },
  });

  // Optional: verify on-chain
  let onChainVerify: { txHash: string; matched: boolean } | null = null;
  if (commitmentId || proof.commitmentId) {
    try {
      onChainVerify = await verifyDecisionOnChain(
        commitmentId || proof.commitmentId!,
        resultHash
      );
      await prisma.decisionProof.update({
        where: { id: proofId },
        data: { verifyTxHash: onChainVerify.txHash },
      });
    } catch (error: any) {
      console.error('[Verifiable AI] On-chain verify failed:', error.message);
    }
  }

  return NextResponse.json({
    success: true,
    proofId,
    matched,
    planHash: proof.planHash,
    resultHash,
    onChain: onChainVerify ? { txHash: onChainVerify.txHash, matched: onChainVerify.matched } : null,
    message: matched
      ? 'Decision verified: output matches committed plan.'
      : 'Decision mismatch: output does NOT match committed plan.',
  });
}

async function handleHashDecision(body: any) {
  const { input, output, modelHash } = body;

  const result: any = {};

  if (input) {
    result.inputHash = hashDecisionInput(input);
  }
  if (output) {
    result.outputHash = hashDecisionOutput(output);
  }
  if (input && output && modelHash) {
    result.fullHash = hashFullDecision(result.inputHash, result.outputHash, modelHash);
  }

  return NextResponse.json({
    success: true,
    hashes: result,
    message: 'Use these hashes for commit and verify operations.',
  });
}
