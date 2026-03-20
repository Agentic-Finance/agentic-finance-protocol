import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

/**
 * POST /api/sentinel/action
 *
 * Records a Sentinel governance action (flag, pause vote, slash vote).
 * Creates an AuditEvent in the database. On-chain governance is future work.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { actionType, targetWallet, reason, senderWallet } = body;

    if (!actionType || !targetWallet || !senderWallet) {
      return NextResponse.json(
        { error: 'actionType, targetWallet, and senderWallet are required' },
        { status: 400 },
      );
    }

    const validActions = ['flag', 'pause_vote', 'slash_vote'];
    if (!validActions.includes(actionType)) {
      return NextResponse.json(
        { error: `Invalid actionType. Must be one of: ${validActions.join(', ')}` },
        { status: 400 },
      );
    }

    // Create audit event
    const event = await prisma.auditEvent.create({
      data: {
        eventType: `SENTINEL_${actionType.toUpperCase()}`,
        title: `Sentinel ${actionType.replace('_', ' ')}: ${targetWallet}`,
        severity: actionType === 'slash_vote' ? 'ERROR' : 'WARNING',
        agentName: targetWallet,
        description: reason || 'No reason provided',
        metadata: {
          actionType,
          targetWallet,
          senderWallet,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      eventId: event.id,
      message: `${actionType} action recorded for ${targetWallet}`,
    });
  } catch (error: any) {
    console.error('[sentinel/action] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
