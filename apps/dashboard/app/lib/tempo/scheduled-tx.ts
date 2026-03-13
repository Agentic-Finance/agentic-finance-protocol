/**
 * Scheduled Transactions — Tempo Native Time-Windowed Execution
 *
 * Tempo TempoTransaction supports `validAfter` and `validBefore` timestamp
 * fields for time-windowed execution. Transactions are only valid within
 * the specified window.
 *
 * PayPol Use Cases:
 *   - Recurring payroll disbursement (monthly schedule)
 *   - Time-locked escrow releases (dispute window expiry)
 *   - Scheduled agent budget top-ups
 *   - Deferred settlement after review period
 */
import { type Address, type Hex } from 'viem';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface CreateScheduledTxParams {
  /** Sender wallet address */
  wallet: string;
  /** Human-readable label */
  label: string;
  /** Target contract address */
  toAddress: Address;
  /** Hex-encoded calldata */
  calldata: Hex;
  /** Value in wei */
  value?: string;
  /** Token symbol (for display) */
  token?: string;
  /** Earliest execution time */
  validAfter: Date;
  /** Latest execution time (deadline) */
  validBefore: Date;
}

export interface ScheduledTxRecord {
  id: string;
  wallet: string;
  label: string;
  toAddress: string;
  calldata: string;
  value: string;
  token: string | null;
  validAfter: Date;
  validBefore: Date;
  status: 'PENDING' | 'BROADCAST' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
  txHash: string | null;
  createdAt: Date;
  executedAt: Date | null;
}

// ────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────

/**
 * Validate scheduled transaction parameters
 */
export function validateScheduledTx(params: CreateScheduledTxParams): string | null {
  if (!params.wallet) return 'Wallet address is required';
  if (!params.label?.trim()) return 'Label is required';
  if (!params.toAddress) return 'Target address is required';
  if (!params.calldata) return 'Calldata is required';

  const now = new Date();
  if (params.validAfter <= now) {
    return 'validAfter must be in the future';
  }
  if (params.validBefore <= params.validAfter) {
    return 'validBefore must be after validAfter';
  }

  // Max schedule window: 90 days
  const maxWindow = 90 * 24 * 60 * 60 * 1000;
  if (params.validBefore.getTime() - params.validAfter.getTime() > maxWindow) {
    return 'Execution window cannot exceed 90 days';
  }

  return null; // Valid
}

/**
 * Check if a scheduled transaction is ready for execution
 */
export function isReadyForExecution(tx: ScheduledTxRecord): boolean {
  const now = new Date();
  return (
    tx.status === 'PENDING' &&
    now >= tx.validAfter &&
    now < tx.validBefore
  );
}

/**
 * Check if a scheduled transaction has expired
 */
export function isExpired(tx: ScheduledTxRecord): boolean {
  const now = new Date();
  return tx.status === 'PENDING' && now >= tx.validBefore;
}

/**
 * Format execution window for display
 */
export function formatWindow(validAfter: Date, validBefore: Date): string {
  const afterStr = validAfter.toISOString().replace('T', ' ').slice(0, 19);
  const beforeStr = validBefore.toISOString().replace('T', ' ').slice(0, 19);
  return `${afterStr} → ${beforeStr}`;
}
