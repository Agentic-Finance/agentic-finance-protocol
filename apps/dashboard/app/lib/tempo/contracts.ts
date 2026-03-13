/**
 * Typed Contract Instances (viem)
 * Re-uses ABI definitions from constants.ts
 * Provides getContract() helpers for both read (publicClient) and write (walletClient)
 */
import { getContract, type GetContractReturnType } from 'viem';
import { publicClient, getDaemonWalletClient } from './clients';
import {
  PAYPOL_NEXUS_V2_ADDRESS,
  PAYPOL_SHIELD_V2_ADDRESS,
  PAYPOL_MULTISEND_V2_ADDRESS,
  AI_PROOF_REGISTRY_ADDRESS,
  STREAM_V1_ADDRESS,
  REPUTATION_REGISTRY_ADDRESS,
  SECURITY_DEPOSIT_ADDRESS,
} from '../constants';

// ────────────────────────────────────────────
// Viem-compatible ABIs (const arrays)
// ────────────────────────────────────────────

export const NEXUS_V2_VIEM_ABI = [
  { type: 'function', name: 'createJob', inputs: [{ name: '_worker', type: 'address' }, { name: '_judge', type: 'address' }, { name: '_token', type: 'address' }, { name: '_amount', type: 'uint256' }, { name: '_deadlineDuration', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'startJob', inputs: [{ name: '_jobId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'completeJob', inputs: [{ name: '_jobId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'settleJob', inputs: [{ name: '_jobId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'refundJob', inputs: [{ name: '_jobId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getJob', inputs: [{ name: '_jobId', type: 'uint256' }], outputs: [{ name: 'employer', type: 'address' }, { name: 'worker', type: 'address' }, { name: 'judge', type: 'address' }, { name: 'token', type: 'address' }, { name: 'budget', type: 'uint256' }, { name: 'platformFee', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'rated', type: 'bool' }], stateMutability: 'view' },
  { type: 'event', name: 'JobCreated', inputs: [{ name: 'jobId', type: 'uint256', indexed: true }, { name: 'employer', type: 'address', indexed: true }, { name: 'worker', type: 'address', indexed: true }, { name: 'budget', type: 'uint256', indexed: false }, { name: 'deadline', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'JobSettled', inputs: [{ name: 'jobId', type: 'uint256', indexed: true }, { name: 'workerPay', type: 'uint256', indexed: false }, { name: 'fee', type: 'uint256', indexed: false }] },
] as const;

export const SHIELD_V2_VIEM_ABI = [
  { type: 'function', name: 'deposit', inputs: [{ name: 'commitment', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'executeShieldedPayout', inputs: [{ name: 'proof', type: 'uint256[24]' }, { name: 'pubSignals', type: 'uint256[3]' }, { name: 'exactAmount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'executePublicPayout', inputs: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'isCommitmentRegistered', inputs: [{ name: 'commitment', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getCommitmentAmount', inputs: [{ name: 'commitment', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
] as const;

export const MULTISEND_V2_VIEM_ABI = [
  { type: 'function', name: 'depositFunds', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'depositToken', inputs: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'executePublicBatch', inputs: [{ name: 'recipients', type: 'address[]' }, { name: 'amounts', type: 'uint256[]' }, { name: 'batchId', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'executeMultiTokenBatch', inputs: [{ name: 'token', type: 'address' }, { name: 'recipients', type: 'address[]' }, { name: 'amounts', type: 'uint256[]' }, { name: 'batchId', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getVaultBalance', inputs: [{ name: 'token', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getBatchCount', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'BatchDisbursedV2', inputs: [{ name: 'batchId', type: 'bytes32', indexed: true }, { name: 'token', type: 'address', indexed: true }, { name: 'totalRecipients', type: 'uint256', indexed: false }, { name: 'totalAmount', type: 'uint256', indexed: false }, { name: 'executor', type: 'address', indexed: false }] },
] as const;

export const AI_PROOF_REGISTRY_VIEM_ABI = [
  { type: 'function', name: 'commit', inputs: [{ name: 'planHash', type: 'bytes32' }, { name: 'nexusJobId', type: 'uint256' }], outputs: [{ type: 'bytes32' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'verify', inputs: [{ name: 'commitmentId', type: 'bytes32' }, { name: 'resultHash', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'slash', inputs: [{ name: 'commitmentId', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getCommitment', inputs: [{ name: 'commitmentId', type: 'bytes32' }], outputs: [{ name: 'planHash', type: 'bytes32' }, { name: 'agent', type: 'address' }, { name: 'nexusJobId', type: 'uint256' }, { name: 'resultHash', type: 'bytes32' }, { name: 'verified', type: 'bool' }, { name: 'matched', type: 'bool' }, { name: 'committedAt', type: 'uint256' }, { name: 'verifiedAt', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getStats', inputs: [], outputs: [{ name: 'totalCommitments', type: 'uint256' }, { name: 'totalVerified', type: 'uint256' }, { name: 'totalMatched', type: 'uint256' }, { name: 'totalMismatched', type: 'uint256' }, { name: 'totalSlashed', type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'CommitmentMade', inputs: [{ name: 'commitmentId', type: 'bytes32', indexed: true }, { name: 'agent', type: 'address', indexed: true }, { name: 'nexusJobId', type: 'uint256', indexed: true }, { name: 'planHash', type: 'bytes32', indexed: false }] },
] as const;

export const STREAM_V1_VIEM_ABI = [
  { type: 'function', name: 'createStream', inputs: [{ name: '_agent', type: 'address' }, { name: '_token', type: 'address' }, { name: '_milestoneAmounts', type: 'uint256[]' }, { name: '_deadlineDuration', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'submitMilestone', inputs: [{ name: '_streamId', type: 'uint256' }, { name: '_milestoneIndex', type: 'uint256' }, { name: '_proofHash', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'approveMilestone', inputs: [{ name: '_streamId', type: 'uint256' }, { name: '_milestoneIndex', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getStream', inputs: [{ name: '_streamId', type: 'uint256' }], outputs: [{ name: 'client', type: 'address' }, { name: 'agent', type: 'address' }, { name: 'token', type: 'address' }, { name: 'totalBudget', type: 'uint256' }, { name: 'releasedAmount', type: 'uint256' }, { name: 'milestoneCount', type: 'uint256' }, { name: 'approvedCount', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'status', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'streamCount', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'StreamCreated', inputs: [{ name: 'streamId', type: 'uint256', indexed: true }, { name: 'client', type: 'address', indexed: true }, { name: 'agent', type: 'address', indexed: true }, { name: 'totalBudget', type: 'uint256', indexed: false }, { name: 'milestoneCount', type: 'uint256', indexed: false }, { name: 'deadline', type: 'uint256', indexed: false }] },
] as const;

export const ERC20_VIEM_ABI = [
  { type: 'function', name: 'transfer', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
] as const;

// ────────────────────────────────────────────
// Contract Getters (read-only via publicClient)
// ────────────────────────────────────────────

export function getNexusV2Read() {
  return getContract({
    address: PAYPOL_NEXUS_V2_ADDRESS as `0x${string}`,
    abi: NEXUS_V2_VIEM_ABI,
    client: publicClient,
  });
}

export function getShieldV2Read() {
  return getContract({
    address: PAYPOL_SHIELD_V2_ADDRESS as `0x${string}`,
    abi: SHIELD_V2_VIEM_ABI,
    client: publicClient,
  });
}

export function getMultisendV2Read() {
  return getContract({
    address: PAYPOL_MULTISEND_V2_ADDRESS as `0x${string}`,
    abi: MULTISEND_V2_VIEM_ABI,
    client: publicClient,
  });
}

export function getProofRegistryRead() {
  return getContract({
    address: AI_PROOF_REGISTRY_ADDRESS as `0x${string}`,
    abi: AI_PROOF_REGISTRY_VIEM_ABI,
    client: publicClient,
  });
}

export function getStreamV1Read() {
  return getContract({
    address: STREAM_V1_ADDRESS as `0x${string}`,
    abi: STREAM_V1_VIEM_ABI,
    client: publicClient,
  });
}

// ────────────────────────────────────────────
// Contract Getters (write via daemon walletClient)
// ────────────────────────────────────────────

export function getNexusV2Write() {
  const walletClient = getDaemonWalletClient();
  if (!walletClient) throw new Error('Daemon wallet not configured');
  return getContract({
    address: PAYPOL_NEXUS_V2_ADDRESS as `0x${string}`,
    abi: NEXUS_V2_VIEM_ABI,
    client: { public: publicClient, wallet: walletClient },
  });
}

export function getProofRegistryWrite() {
  const walletClient = getDaemonWalletClient();
  if (!walletClient) throw new Error('Daemon wallet not configured');
  return getContract({
    address: AI_PROOF_REGISTRY_ADDRESS as `0x${string}`,
    abi: AI_PROOF_REGISTRY_VIEM_ABI,
    client: { public: publicClient, wallet: walletClient },
  });
}

export function getStreamV1Write() {
  const walletClient = getDaemonWalletClient();
  if (!walletClient) throw new Error('Daemon wallet not configured');
  return getContract({
    address: STREAM_V1_ADDRESS as `0x${string}`,
    abi: STREAM_V1_VIEM_ABI,
    client: { public: publicClient, wallet: walletClient },
  });
}

export function getMultisendV2Write() {
  const walletClient = getDaemonWalletClient();
  if (!walletClient) throw new Error('Daemon wallet not configured');
  return getContract({
    address: PAYPOL_MULTISEND_V2_ADDRESS as `0x${string}`,
    abi: MULTISEND_V2_VIEM_ABI,
    client: { public: publicClient, wallet: walletClient },
  });
}
