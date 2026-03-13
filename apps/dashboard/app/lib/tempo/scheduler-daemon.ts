/**
 * Scheduler Daemon — Broadcasts pending scheduled transactions
 *
 * Polls every 30s for PENDING transactions where `now >= validAfter`,
 * broadcasts them, and updates status.
 *
 * Marks as EXPIRED if `now >= validBefore` without broadcast.
 *
 * Usage:
 *   import { startSchedulerDaemon, stopSchedulerDaemon } from './scheduler-daemon';
 *   startSchedulerDaemon(); // Start polling
 *   stopSchedulerDaemon();  // Stop polling
 */
import { type Hex, type Address } from 'viem';
import { getDaemonAccount, getDaemonWalletClient, publicClient } from './clients';
import { isReadyForExecution, isExpired } from './scheduled-tx';

// ────────────────────────────────────────────
// Scheduler State
// ────────────────────────────────────────────

let pollInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

const POLL_INTERVAL_MS = 30_000; // 30 seconds

// ────────────────────────────────────────────
// Core Processing
// ────────────────────────────────────────────

/**
 * Process all pending scheduled transactions.
 * Called by the polling loop every 30s.
 */
async function processPendingTransactions(): Promise<void> {
  if (isProcessing) return; // Skip if already processing
  isProcessing = true;

  try {
    // Dynamic import to avoid circular deps
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const now = new Date();

      // 1. Find all PENDING transactions
      const pending = await prisma.scheduledTransaction.findMany({
        where: { status: 'PENDING' },
        orderBy: { validAfter: 'asc' },
      });

      if (pending.length === 0) return;

      for (const tx of pending) {
        const record = {
          ...tx,
          status: tx.status as any,
        };

        // Check if expired
        if (isExpired(record)) {
          await prisma.scheduledTransaction.update({
            where: { id: tx.id },
            data: { status: 'EXPIRED' },
          });
          console.log(`[SCHEDULER] Expired: "${tx.label}" (window closed at ${tx.validBefore.toISOString()})`);
          continue;
        }

        // Check if ready for execution
        if (isReadyForExecution(record)) {
          await broadcastTransaction(prisma, tx);
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  } catch (err) {
    console.error('[SCHEDULER] Error processing transactions:', err);
  } finally {
    isProcessing = false;
  }
}

/**
 * Broadcast a single scheduled transaction
 */
async function broadcastTransaction(prisma: any, tx: any): Promise<void> {
  const walletClient = getDaemonWalletClient();
  const account = getDaemonAccount();
  if (!walletClient || !account) {
    console.error('[SCHEDULER] Cannot broadcast — daemon wallet not configured');
    return;
  }

  try {
    // Mark as BROADCAST (in-flight)
    await prisma.scheduledTransaction.update({
      where: { id: tx.id },
      data: { status: 'BROADCAST' },
    });

    // Send the transaction
    const txHash = await walletClient.sendTransaction({
      account,
      to: tx.toAddress as Address,
      data: tx.calldata as Hex,
      value: BigInt(tx.value || '0'),
      gas: BigInt(500_000),
      type: 'legacy' as any,
    } as any);

    console.log(`[SCHEDULER] Broadcast: "${tx.label}" → ${txHash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    // Update with confirmation
    await prisma.scheduledTransaction.update({
      where: { id: tx.id },
      data: {
        status: 'CONFIRMED',
        txHash,
        gasUsed: receipt.gasUsed?.toString(),
        executedAt: new Date(),
      },
    });

    console.log(`[SCHEDULER] ✓ Confirmed: "${tx.label}" (gas: ${receipt.gasUsed})`);
  } catch (err: any) {
    console.error(`[SCHEDULER] Failed to broadcast "${tx.label}":`, err);

    // Mark error but keep PENDING for retry (unless expired)
    await prisma.scheduledTransaction.update({
      where: { id: tx.id },
      data: {
        status: 'PENDING',
        errorMessage: err?.message?.slice(0, 500) || 'Unknown error',
      },
    });
  }
}

// ────────────────────────────────────────────
// Start / Stop
// ────────────────────────────────────────────

/**
 * Start the scheduler daemon polling loop
 */
export function startSchedulerDaemon(): void {
  if (pollInterval) {
    console.log('[SCHEDULER] Already running');
    return;
  }

  console.log(`[SCHEDULER] Started — polling every ${POLL_INTERVAL_MS / 1000}s`);
  pollInterval = setInterval(processPendingTransactions, POLL_INTERVAL_MS);

  // Run immediately on start
  processPendingTransactions();
}

/**
 * Stop the scheduler daemon
 */
export function stopSchedulerDaemon(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('[SCHEDULER] Stopped');
  }
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return pollInterval !== null;
}
