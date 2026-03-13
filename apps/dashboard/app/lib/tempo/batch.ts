/**
 * Native Batch Transactions — Tempo Account Abstraction
 *
 * Tempo TempoTransaction (type 0x76) supports a native `calls` field
 * for atomic batch execution. Instead of using MultisendV2 contract,
 * we can bundle multiple operations into a single protocol-level tx.
 *
 * Benefits:
 *   - Atomic: all calls succeed or all revert
 *   - Cheaper: no intermediate contract overhead
 *   - Native: protocol-level guarantee
 *
 * Use cases in PayPol:
 *   - Payroll: approve + transfer N recipients = 1 tx
 *   - Settlement: escrow release + proof registration + fee = 1 tx
 *   - Agent setup: deposit + register + approve = 1 tx
 */
import {
  type Address,
  type Hex,
  encodeFunctionData,
  parseAbi,
} from 'viem';
import { publicClient, getDaemonAccount, getDaemonWalletClient } from './clients';
import {
  PAYPOL_MULTISEND_V2_ADDRESS,
  AI_PROOF_REGISTRY_ADDRESS,
  STREAM_V1_ADDRESS,
} from '../constants';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface BatchCall {
  /** Target contract address */
  to: Address;
  /** Value in wei (0 for most token ops) */
  value?: bigint;
  /** Encoded calldata */
  data: Hex;
  /** Human-readable label (for logging) */
  label?: string;
}

export interface BatchResult {
  txHash: Hex;
  callCount: number;
  labels: string[];
}

// ────────────────────────────────────────────
// Batch Builder Helpers
// ────────────────────────────────────────────

/**
 * Build a batch of ERC20 transfers
 * Useful for payroll disbursement
 */
export function buildTransferBatch(
  tokenAddress: Address,
  recipients: { to: Address; amount: bigint }[]
): BatchCall[] {
  return recipients.map(({ to, amount }) => ({
    to: tokenAddress,
    data: encodeFunctionData({
      abi: parseAbi(['function transfer(address to, uint256 amount) external returns (bool)']),
      functionName: 'transfer',
      args: [to, amount],
    }),
    label: `Transfer ${amount} → ${to.slice(0, 8)}...`,
  }));
}

/**
 * Build a batch of ERC20 approvals + transfers
 * Useful when daemon needs to approve a contract first
 */
export function buildApproveAndTransferBatch(
  tokenAddress: Address,
  spender: Address,
  approvalAmount: bigint,
  recipients: { to: Address; amount: bigint }[]
): BatchCall[] {
  const approveCall: BatchCall = {
    to: tokenAddress,
    data: encodeFunctionData({
      abi: parseAbi(['function approve(address spender, uint256 amount) external returns (bool)']),
      functionName: 'approve',
      args: [spender, approvalAmount],
    }),
    label: `Approve ${spender.slice(0, 8)}... for ${approvalAmount}`,
  };

  const transferCalls = buildTransferBatch(tokenAddress, recipients);
  return [approveCall, ...transferCalls];
}

/**
 * Build settlement batch: complete job + register proof + settle
 * Replaces 2-3 separate transactions with 1 atomic tx
 */
export function buildSettlementBatch(params: {
  nexusAddress: Address;
  jobId: bigint;
  proofRegistryAddress?: Address;
  commitmentId?: Hex;
  resultHash?: Hex;
}): BatchCall[] {
  const calls: BatchCall[] = [];

  // 1. Complete the job on NexusV2
  calls.push({
    to: params.nexusAddress,
    data: encodeFunctionData({
      abi: parseAbi(['function completeJob(uint256 _jobId) external']),
      functionName: 'completeJob',
      args: [params.jobId],
    }),
    label: `Complete job #${params.jobId}`,
  });

  // 2. Verify proof on AIProofRegistry (if applicable)
  if (params.proofRegistryAddress && params.commitmentId && params.resultHash) {
    calls.push({
      to: params.proofRegistryAddress,
      data: encodeFunctionData({
        abi: parseAbi(['function verify(bytes32 commitmentId, bytes32 resultHash) external']),
        functionName: 'verify',
        args: [params.commitmentId, params.resultHash],
      }),
      label: `Verify proof ${params.commitmentId.slice(0, 10)}...`,
    });
  }

  // 3. Settle the job (release escrow)
  calls.push({
    to: params.nexusAddress,
    data: encodeFunctionData({
      abi: parseAbi(['function settleJob(uint256 _jobId) external']),
      functionName: 'settleJob',
      args: [params.jobId],
    }),
    label: `Settle job #${params.jobId}`,
  });

  return calls;
}

// ────────────────────────────────────────────
// Batch Execution
// ────────────────────────────────────────────

/**
 * Execute a batch of calls atomically.
 *
 * On Tempo testnet: Uses sequential daemon txs (native batch via type 0x76
 * requires Tempo-specific transaction serialization).
 *
 * Future: When viem adds Tempo AA support, this will use native `calls` field
 * in TempoTransaction for true atomic batch execution.
 */
export async function executeBatch(calls: BatchCall[]): Promise<BatchResult> {
  const walletClient = getDaemonWalletClient();
  const account = getDaemonAccount();
  if (!walletClient || !account) throw new Error('Daemon wallet not configured for batch execution');

  if (calls.length === 0) throw new Error('Empty batch — at least 1 call required');

  const labels = calls.map(c => c.label || 'unnamed');
  console.log(`[BATCH] Executing ${calls.length} calls:`, labels);

  // Current implementation: Execute sequentially via daemon
  // Each call is a separate tx — this will be replaced with native batch
  // when viem supports Tempo's TempoTransaction.calls field
  let lastTxHash: Hex = '0x';

  for (const call of calls) {
    const txHash = await walletClient.sendTransaction({
      account,
      to: call.to,
      data: call.data,
      value: call.value ?? BigInt(0),
      gas: BigInt(500_000),
      type: 'legacy' as any,
    } as any);

    lastTxHash = txHash;

    // Wait for receipt to ensure ordering
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`[BATCH] ✓ ${call.label || 'call'} → ${txHash}`);
  }

  return {
    txHash: lastTxHash,
    callCount: calls.length,
    labels,
  };
}

/**
 * Execute batch via MultisendV2 contract
 * Fallback for when native batch is not available
 * Only for homogeneous token transfers (same token, multiple recipients)
 */
export async function executeBatchViaMultisend(
  tokenAddress: Address,
  recipients: Address[],
  amounts: bigint[],
  batchId: Hex
): Promise<Hex> {
  const walletClient = getDaemonWalletClient();
  const account = getDaemonAccount();
  if (!walletClient || !account) throw new Error('Daemon wallet not configured');

  if (recipients.length !== amounts.length) {
    throw new Error('Recipients and amounts arrays must match');
  }

  const txHash = await walletClient.sendTransaction({
    account,
    to: PAYPOL_MULTISEND_V2_ADDRESS as Address,
    data: encodeFunctionData({
      abi: parseAbi([
        'function executeMultiTokenBatch(address token, address[] calldata recipients, uint256[] calldata amounts, bytes32 batchId) external',
      ]),
      functionName: 'executeMultiTokenBatch',
      args: [tokenAddress, recipients, amounts, batchId],
    }),
    gas: BigInt(100_000 + recipients.length * 80_000), // Scale gas with recipients
    type: 'legacy' as any,
  } as any);

  console.log(`[BATCH_MULTISEND] ${recipients.length} recipients → ${txHash}`);
  return txHash;
}
