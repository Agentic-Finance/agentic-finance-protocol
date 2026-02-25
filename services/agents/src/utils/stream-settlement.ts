/**
 * Stream Settlement Utility — On-Chain Progressive Milestone Escrow
 *
 * Wraps PayPolStreamV1 contract interactions. Clients lock budgets,
 * agents submit milestones with AI proofs, clients approve/reject,
 * and payments release progressively per milestone.
 *
 * Uses the PayPolStreamV1 contract on Tempo L1.
 */

import { ethers } from 'ethers';
import { getWallet, getProvider, sendTx, ensureApproval, parseTokenAmount, explorerUrl, CONTRACTS, DEFAULT_TOKEN } from './chain';

// ── Contract Config ──────────────────────────────────────────

export const STREAM_V1_ADDRESS = '0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C';

export const STREAM_V1_ABI = [
  'function createStream(address _agent, address _token, uint256[] calldata _milestoneAmounts, uint256 _deadlineDuration) external returns (uint256)',
  'function submitMilestone(uint256 _streamId, uint256 _milestoneIndex, bytes32 _proofHash) external',
  'function approveMilestone(uint256 _streamId, uint256 _milestoneIndex) external',
  'function rejectMilestone(uint256 _streamId, uint256 _milestoneIndex) external',
  'function cancelStream(uint256 _streamId) external',
  'function claimTimeout(uint256 _streamId) external',
  'function getStream(uint256 _streamId) external view returns (address client, address agent, address token, uint256 totalBudget, uint256 releasedAmount, uint256 milestoneCount, uint256 approvedCount, uint256 deadline, uint8 status)',
  'function getMilestone(uint256 _streamId, uint256 _milestoneIndex) external view returns (uint256 amount, bytes32 proofHash, uint8 status)',
  'function isTimedOut(uint256 _streamId) external view returns (bool)',
  'function getRemainingBalance(uint256 _streamId) external view returns (uint256)',
  'function streamCount() external view returns (uint256)',
  'event StreamCreated(uint256 indexed streamId, address indexed client, address indexed agent, uint256 totalBudget, uint256 milestoneCount, uint256 deadline)',
  'event MilestoneSubmitted(uint256 indexed streamId, uint256 indexed milestoneIndex, bytes32 proofHash)',
  'event MilestoneApproved(uint256 indexed streamId, uint256 indexed milestoneIndex, uint256 agentPayout, uint256 fee)',
  'event MilestoneRejected(uint256 indexed streamId, uint256 indexed milestoneIndex)',
  'event StreamCompleted(uint256 indexed streamId, uint256 totalReleased, uint256 totalFees)',
  'event StreamCancelled(uint256 indexed streamId, uint256 refundedAmount)',
];

// ── Helper Functions ─────────────────────────────────────────

/**
 * Get StreamV1 contract instance.
 */
export function getStreamV1(): ethers.Contract {
  return new ethers.Contract(STREAM_V1_ADDRESS, STREAM_V1_ABI, getWallet());
}

/**
 * Generate a keccak256 proof hash from a deliverable string.
 */
export function generateProofHash(deliverable: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(deliverable));
}

// ── On-Chain Actions ────────────────────────────────────────

/**
 * Create a stream on-chain. Locks total budget in the contract.
 * Client must have approved the token spending first.
 *
 * @param agentAddress     - Agent's wallet address
 * @param tokenAddress     - ERC20 token (e.g. AlphaUSD)
 * @param milestoneAmounts - Array of amounts per milestone (in human units, e.g. [50, 30, 20])
 * @param deadlineSeconds  - Deadline duration in seconds (e.g. 604800 = 7 days)
 * @param decimals         - Token decimals (default 6)
 */
export async function createStreamOnChain(
  agentAddress: string,
  tokenAddress: string,
  milestoneAmounts: number[],
  deadlineSeconds: number,
  decimals: number = 6,
): Promise<{ streamId: number; txHash: string; explorerUrl: string }> {
  const contract = getStreamV1();

  // Convert amounts to on-chain units
  const amountsWei = milestoneAmounts.map(a => parseTokenAmount(a, decimals));
  const totalWei = amountsWei.reduce((sum, a) => sum + a, 0n);

  // Ensure approval
  await ensureApproval(tokenAddress, STREAM_V1_ADDRESS, totalWei);

  const wallet = getWallet();
  const provider = getProvider();
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');

  const tx = await contract.createStream(
    agentAddress,
    tokenAddress,
    amountsWei,
    deadlineSeconds,
    { nonce, gasLimit: 5_000_000, type: 0 },
  );
  const receipt = await tx.wait(1);

  // Parse StreamCreated event
  const iface = new ethers.Interface([
    'event StreamCreated(uint256 indexed streamId, address indexed client, address indexed agent, uint256 totalBudget, uint256 milestoneCount, uint256 deadline)',
  ]);
  let streamId = -1;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === 'StreamCreated') {
        streamId = Number(parsed.args.streamId);
        break;
      }
    } catch { /* skip */ }
  }

  return {
    streamId,
    txHash: receipt.hash,
    explorerUrl: explorerUrl(receipt.hash),
  };
}

/**
 * Agent submits a milestone deliverable with proof hash.
 */
export async function submitMilestoneOnChain(
  streamId: number,
  milestoneIndex: number,
  proofHash: string,
): Promise<{ txHash: string; explorerUrl: string }> {
  const contract = getStreamV1();
  const wallet = getWallet();
  const provider = getProvider();
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');

  const tx = await contract.submitMilestone(streamId, milestoneIndex, proofHash, {
    nonce,
    gasLimit: 5_000_000,
    type: 0,
  });
  const receipt = await tx.wait(1);

  return {
    txHash: receipt.hash,
    explorerUrl: explorerUrl(receipt.hash),
  };
}

/**
 * Client approves a submitted milestone. Releases payment on-chain.
 */
export async function approveMilestoneOnChain(
  streamId: number,
  milestoneIndex: number,
): Promise<{ txHash: string; agentPayout: string; fee: string; explorerUrl: string }> {
  const contract = getStreamV1();
  const wallet = getWallet();
  const provider = getProvider();
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');

  const tx = await contract.approveMilestone(streamId, milestoneIndex, {
    nonce,
    gasLimit: 5_000_000,
    type: 0,
  });
  const receipt = await tx.wait(1);

  // Parse MilestoneApproved event
  const iface = new ethers.Interface([
    'event MilestoneApproved(uint256 indexed streamId, uint256 indexed milestoneIndex, uint256 agentPayout, uint256 fee)',
  ]);
  let agentPayout = '0';
  let fee = '0';
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === 'MilestoneApproved') {
        agentPayout = parsed.args.agentPayout.toString();
        fee = parsed.args.fee.toString();
        break;
      }
    } catch { /* skip */ }
  }

  return {
    txHash: receipt.hash,
    agentPayout,
    fee,
    explorerUrl: explorerUrl(receipt.hash),
  };
}

/**
 * Client rejects a submitted milestone.
 */
export async function rejectMilestoneOnChain(
  streamId: number,
  milestoneIndex: number,
): Promise<{ txHash: string; explorerUrl: string }> {
  const contract = getStreamV1();
  const wallet = getWallet();
  const provider = getProvider();
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');

  const tx = await contract.rejectMilestone(streamId, milestoneIndex, {
    nonce,
    gasLimit: 5_000_000,
    type: 0,
  });
  const receipt = await tx.wait(1);

  return {
    txHash: receipt.hash,
    explorerUrl: explorerUrl(receipt.hash),
  };
}

/**
 * Client cancels a stream. Refunds all unreleased funds.
 */
export async function cancelStreamOnChain(
  streamId: number,
): Promise<{ txHash: string; explorerUrl: string }> {
  const contract = getStreamV1();
  const wallet = getWallet();
  const provider = getProvider();
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');

  const tx = await contract.cancelStream(streamId, {
    nonce,
    gasLimit: 5_000_000,
    type: 0,
  });
  const receipt = await tx.wait(1);

  return {
    txHash: receipt.hash,
    explorerUrl: explorerUrl(receipt.hash),
  };
}

/**
 * Read on-chain stream state.
 */
export async function getStreamOnChain(streamId: number): Promise<{
  client: string;
  agent: string;
  token: string;
  totalBudget: bigint;
  releasedAmount: bigint;
  milestoneCount: number;
  approvedCount: number;
  deadline: number;
  status: number; // 0=Active, 1=Completed, 2=Cancelled
}> {
  const contract = getStreamV1();
  const result = await contract.getStream(streamId);
  return {
    client: result[0],
    agent: result[1],
    token: result[2],
    totalBudget: result[3],
    releasedAmount: result[4],
    milestoneCount: Number(result[5]),
    approvedCount: Number(result[6]),
    deadline: Number(result[7]),
    status: Number(result[8]),
  };
}

/**
 * Read on-chain milestone state.
 */
export async function getMilestoneOnChain(streamId: number, milestoneIndex: number): Promise<{
  amount: bigint;
  proofHash: string;
  status: number; // 0=Pending, 1=Submitted, 2=Approved, 3=Rejected
}> {
  const contract = getStreamV1();
  const result = await contract.getMilestone(streamId, milestoneIndex);
  return {
    amount: result[0],
    proofHash: result[1],
    status: Number(result[2]),
  };
}
