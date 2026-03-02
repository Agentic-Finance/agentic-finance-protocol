/**
 * /api/intel/verify — Verify & Purchase Intelligence
 *
 * POST: Verify quality + record purchase payment
 */

import prisma from '../../../lib/prisma';
import { apiSuccess, apiError, logAndReturn } from '@/app/lib/api-response';
import { logAuditEvent } from '@/app/lib/audit-types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      submissionId,
      action, // 'verify' | 'purchase'
      qualityScore,
      buyerWallet,
      paymentTxHash,
      proofRegistryId,
    } = body;

    if (!submissionId || !action) {
      return apiError('Missing required fields: submissionId, action', 400);
    }

    const submission = await prisma.intelSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return apiError('Intel submission not found', 404);
    }

    if (action === 'verify') {
      // Verify quality (admin/oracle action)
      if (qualityScore === undefined || qualityScore < 0 || qualityScore > 100) {
        return apiError('qualityScore must be between 0 and 100', 400);
      }

      const updated = await prisma.intelSubmission.update({
        where: { id: submissionId },
        data: {
          qualityScore,
          proofRegistryId: proofRegistryId || null,
          status: 'VERIFIED',
        },
      });

      await logAuditEvent({
        agentId: submission.sourceAgentId || undefined,
        eventType: 'INTEL_VERIFIED',
        title: `Intel Verified: "${submission.title}"`,
        description: `Quality score: ${qualityScore}/100`,
        metadata: { submissionId, qualityScore },
        severity: 'SUCCESS',
      });

      return apiSuccess({ submission: updated });

    } else if (action === 'purchase') {
      // Purchase intel
      if (submission.status !== 'LISTED' && submission.status !== 'VERIFIED') {
        return apiError('Intel not available for purchase', 400);
      }
      if (!buyerWallet) {
        return apiError('buyerWallet required for purchase', 400);
      }

      const updated = await prisma.intelSubmission.update({
        where: { id: submissionId },
        data: {
          buyerWallet: buyerWallet.toLowerCase(),
          paymentTxHash: paymentTxHash || null,
          status: 'PURCHASED',
        },
      });

      await logAuditEvent({
        eventType: 'INTEL_PURCHASED',
        title: `Intel Purchased: "${submission.title}"`,
        description: `Buyer ${buyerWallet.slice(0, 8)}... paid $${submission.price}`,
        metadata: { submissionId, buyerWallet, price: submission.price },
        txHash: paymentTxHash,
        severity: 'SUCCESS',
      });

      return apiSuccess({ submission: updated });

    } else {
      return apiError(`Unknown action: ${action}. Must be 'verify' or 'purchase'`, 400);
    }
  } catch (error: any) {
    return logAndReturn('INTEL_VERIFY', error, 'Failed to process intel action');
  }
}
