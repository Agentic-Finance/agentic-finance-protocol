/**
 * PayPol On-Chain Utility
 *
 * Shared blockchain helpers for agents that execute real transactions
 * on Tempo L1 testnet (Chain ID 42431).
 *
 * Provides: provider, wallet, contract instances, deploy/send helpers,
 * and human-readable ABI fragments for all PayPol smart contracts.
 */

import { ethers } from 'ethers';

// ── Tempo Network Config ─────────────────────────────────────

export const TEMPO_RPC = 'https://rpc.moderato.tempo.xyz';
export const TEMPO_CHAIN_ID = 42431;
export const TEMPO_EXPLORER = 'https://explore.tempo.xyz';

// ── Deployed Contract Addresses ──────────────────────────────

export const CONTRACTS = {
  NEXUS_V2:          '0x6A467Cd4156093bB528e448C04366586a1052Fab',
  SHIELD_VAULT:      '0x4cfcaE530d7a49A0FE8c0de858a0fA8Cf9Aea8B1',
  SHIELD_VAULT_V2:   '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055',
  PLONK_V2:          '0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B',
  MULTISEND:         '0xc0e6F06EfD5A9d40b1018B0ba396A925aBC4cF69',
  MULTISEND_V2:      '0x25f4d3f12C579002681a52821F3a6251c46D4575',
  NEXUS_V1:          '0xc608cd2EAbfcb0734927433b7A3a7d7b43990F2c',
  AI_PROOF_REGISTRY: '0x8fDB8E871c9eaF2955009566F41490Bbb128a014',
  STREAM_V1:         '0x280842e90B850b4E08688177632EC9561862B8fd',
  REPUTATION:        '0x9332c1B2bb94C96DA2D729423f345c76dB3494D0',
  SECURITY_DEPOSIT:  '0x0778aD4b3EE44BC38398E90a7c57F55C17b7424E',
} as const;

// ── Supported Tokens ─────────────────────────────────────────

export const TOKENS = {
  AlphaUSD:  { address: '0x20c0000000000000000000000000000000000001', decimals: 6 },
  pathUSD:   { address: '0x20c0000000000000000000000000000000000000', decimals: 6 },
  BetaUSD:   { address: '0x20c0000000000000000000000000000000000002', decimals: 6 },
  ThetaUSD:  { address: '0x20c0000000000000000000000000000000000003', decimals: 6 },
} as const;

export const DEFAULT_TOKEN = TOKENS.AlphaUSD;

// ── ABIs (Human-Readable Fragments) ─────────────────────────

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

export const NEXUS_V2_ABI = [
  'function createJob(address _worker, address _judge, address _token, uint256 _amount, uint256 _deadlineDuration) external returns (uint256)',
  'function startJob(uint256 _jobId) external',
  'function completeJob(uint256 _jobId) external',
  'function disputeJob(uint256 _jobId) external',
  'function settleJob(uint256 _jobId) external',
  'function refundJob(uint256 _jobId) external',
  'function claimTimeout(uint256 _jobId) external',
  'function rateWorker(uint256 _jobId, uint256 _rating) external',
  'function getJob(uint256 _jobId) external view returns (address employer, address worker, address judge, address token, uint256 budget, uint256 platformFee, uint256 deadline, uint8 status, bool rated)',
  'function isTimedOut(uint256 _jobId) external view returns (bool)',
  'function getWorkerRating(address _worker) external view returns (uint256)',
  'function nextJobId() view returns (uint256)',
  'event JobCreated(uint256 indexed jobId, address indexed employer, address indexed worker, uint256 budget, uint256 deadline)',
  'event JobSettled(uint256 indexed jobId, uint256 workerPay, uint256 fee)',
  'event JobRefunded(uint256 indexed jobId, uint256 amount)',
];

export const SHIELD_VAULT_ABI = [
  'function executeShieldedPayout(uint256[24] calldata proof, uint256[2] calldata pubSignals, uint256 exactAmount) external',
  'function executePublicPayout(address recipient, uint256 amount) external',
  'event ShieldedPayoutExecuted(uint256 indexed commitment, address indexed recipient, uint256 amount)',
  'event PublicPayoutExecuted(address indexed recipient, uint256 amount)',
];

export const SHIELD_VAULT_V2_ABI = [
  'function deposit(uint256 commitment, uint256 amount) external',
  'function executeShieldedPayout(uint256[24] calldata proof, uint256[3] calldata pubSignals, uint256 exactAmount) external',
  'function executePublicPayout(address recipient, uint256 amount) external',
  'function isCommitmentRegistered(uint256 commitment) external view returns (bool)',
  'function isNullifierUsed(uint256 nullifierHash) external view returns (bool)',
  'function getCommitmentAmount(uint256 commitment) external view returns (uint256)',
  'event Deposited(uint256 indexed commitment, address indexed depositor, uint256 amount)',
  'event ShieldedWithdrawal(uint256 indexed commitment, uint256 indexed nullifierHash, address indexed recipient, uint256 amount)',
  'event PublicPayoutExecuted(address indexed recipient, uint256 amount)',
];

export const MULTISEND_ABI = [
  'function executePublicBatch(address[] calldata recipients, uint256[] calldata amounts, bytes32 batchId) external',
  'function depositFunds(uint256 amount) external',
  'function paymentToken() view returns (address)',
  'event BatchDisbursed(uint256 totalRecipients, uint256 totalAmount, bytes32 batchId)',
];

export const MULTISEND_V2_ABI = [
  'function depositFunds(uint256 amount) external',
  'function depositToken(address token, uint256 amount) external',
  'function executePublicBatch(address[] calldata recipients, uint256[] calldata amounts, bytes32 batchId) external',
  'function executeMultiTokenBatch(address token, address[] calldata recipients, uint256[] calldata amounts, bytes32 batchId) external',
  'function refundDeposit(address token, uint256 amount) external',
  'function getBatchCount() external view returns (uint256)',
  'function getBatchRecord(uint256 index) external view returns (bytes32 batchId, address token, uint256 totalRecipients, uint256 totalAmount, uint256 executedAt, address executor)',
  'function getVaultBalance(address token) external view returns (uint256)',
  'function getDepositBalance(address depositor, address token) external view returns (uint256)',
  'function batchExecuted(bytes32) external view returns (bool)',
  'event IndividualTransfer(bytes32 indexed batchId, address indexed recipient, uint256 amount, uint256 index)',
  'event BatchDisbursedV2(bytes32 indexed batchId, address indexed token, uint256 totalRecipients, uint256 totalAmount, address executor)',
  'event BatchDisbursed(uint256 totalRecipients, uint256 totalAmount, bytes32 batchId)',
];

// ── Provider & Wallet Singleton ──────────────────────────────

let _provider: ethers.JsonRpcProvider | null = null;
let _wallet: ethers.Wallet | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(TEMPO_RPC, {
      name: 'tempo-moderato',
      chainId: TEMPO_CHAIN_ID,
    });
  }
  return _provider;
}

export function getWallet(): ethers.Wallet {
  if (!_wallet) {
    const pk = process.env.DAEMON_PRIVATE_KEY;
    if (!pk) throw new Error('DAEMON_PRIVATE_KEY not set in environment');
    _wallet = new ethers.Wallet(pk, getProvider());
  }
  return _wallet;
}

// ── Contract Helpers ─────────────────────────────────────────

export function getContract(address: string, abi: string[]): ethers.Contract {
  return new ethers.Contract(address, abi, getWallet());
}

export function getNexusV2(): ethers.Contract {
  return getContract(CONTRACTS.NEXUS_V2, NEXUS_V2_ABI);
}

export function getShieldVault(): ethers.Contract {
  return getContract(CONTRACTS.SHIELD_VAULT, SHIELD_VAULT_ABI);
}

export function getShieldVaultV2(): ethers.Contract {
  return getContract(CONTRACTS.SHIELD_VAULT_V2, SHIELD_VAULT_V2_ABI);
}

export function getMultisend(): ethers.Contract {
  return getContract(CONTRACTS.MULTISEND, MULTISEND_ABI);
}

export function getMultisendV2(): ethers.Contract {
  return getContract(CONTRACTS.MULTISEND_V2, MULTISEND_V2_ABI);
}

export function getERC20(tokenAddress: string): ethers.Contract {
  return getContract(tokenAddress, ERC20_ABI);
}

// ── Reputation Registry ────────────────────────────────────

export const REPUTATION_ABI = [
  'function getReputation(address _agent) external view returns (tuple(uint256 nexusRatingSum, uint256 nexusRatingCount, uint256 offChainRatingSum, uint256 offChainRatingCount, uint256 totalJobsCompleted, uint256 totalJobsFailed, uint256 proofCommitments, uint256 proofVerified, uint256 proofMatched, uint256 proofSlashed, uint256 compositeScore, uint256 updatedAt))',
  'function getCompositeScore(address _agent) external view returns (uint256)',
  'function getTier(address _agent) external view returns (uint256)',
  'function getTrackedAgentCount() external view returns (uint256)',
  'function totalAgentsScored() external view returns (uint256)',
  'function updateReputation(address _agent, uint256 _nexusRatingSum, uint256 _nexusRatingCount, uint256 _offChainRatingSum, uint256 _offChainRatingCount, uint256 _totalJobsCompleted, uint256 _totalJobsFailed, uint256 _proofCommitments, uint256 _proofVerified, uint256 _proofMatched, uint256 _proofSlashed) external',
  'event ReputationUpdated(address indexed agent, uint256 compositeScore, uint256 timestamp)',
];

export function getReputationRegistry(): ethers.Contract {
  return getContract(CONTRACTS.REPUTATION, REPUTATION_ABI);
}

// SecurityDepositVault ABI
export const SECURITY_DEPOSIT_ABI = [
  'function deposit(uint256 _amount) external',
  'function withdraw(uint256 _amount) external',
  'function slash(address _agent, string calldata _reason) external',
  'function getTier(address _agent) external view returns (uint8)',
  'function getFeeDiscount(address _agent) external view returns (uint256)',
  'function getDeposit(address _agent) external view returns (uint256 amount, uint256 depositedAt, uint256 slashCount, uint256 totalSlashedAmt, uint8 tier, uint256 feeDiscount, bool lockExpired)',
  'function getStats() external view returns (uint256 _totalDeposited, uint256 _totalSlashed, uint256 _totalInsurancePaid, uint256 _insurancePool, uint256 _totalAgents)',
  'event DepositMade(address indexed agent, uint256 amount, uint256 total, uint8 tier)',
  'event DepositSlashed(address indexed agent, uint256 slashAmount, string reason)',
];

export function getSecurityDepositVault(): ethers.Contract {
  return getContract(CONTRACTS.SECURITY_DEPOSIT, SECURITY_DEPOSIT_ABI);
}

// ── Transaction Helpers ──────────────────────────────────────

export interface TxResult {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  explorerUrl: string;
}

/**
 * Send a transaction and wait for confirmation.
 * Handles nonce management and gas settings for Tempo.
 */
export async function sendTx(
  contract: ethers.Contract,
  method: string,
  args: unknown[],
  overrides?: ethers.Overrides,
): Promise<TxResult> {
  const wallet = getWallet();
  const provider = getProvider();

  // Fetch fresh nonce to avoid conflicts
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');

  const txOverrides: ethers.Overrides = {
    nonce,
    gasLimit: 5_000_000, // Tempo L1 requires higher gas than typical EVM
    type: 0, // Legacy tx type for Tempo compatibility
    ...overrides,
  };

  const tx = await contract[method](...args, txOverrides);
  const receipt = await tx.wait(1);

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    explorerUrl: `${TEMPO_EXPLORER}/tx/${receipt.hash}`,
  };
}

/**
 * Deploy a contract from bytecode + ABI.
 * Returns the deployed contract address and tx hash.
 */
export async function deployContract(
  abi: ethers.InterfaceAbi,
  bytecode: string,
  constructorArgs: unknown[] = [],
): Promise<{ address: string; txHash: string; explorerUrl: string }> {
  const wallet = getWallet();
  const provider = getProvider();
  const nonce = await provider.getTransactionCount(wallet.address, 'pending');

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  const contract = await factory.deploy(...constructorArgs, {
    nonce,
    gasLimit: 15_000_000, // Tempo L1 deploys need extra gas
    type: 0,
  });

  const receipt = await contract.deploymentTransaction()!.wait(1);

  const deployedAddress = await contract.getAddress();

  return {
    address: deployedAddress,
    txHash: receipt!.hash,
    explorerUrl: `${TEMPO_EXPLORER}/address/${deployedAddress}`,
  };
}

/**
 * Approve ERC20 spending if current allowance is insufficient.
 * Returns tx hash if approval was needed, null if already approved.
 */
export async function ensureApproval(
  tokenAddress: string,
  spender: string,
  amount: bigint,
): Promise<string | null> {
  const wallet = getWallet();
  const token = getERC20(tokenAddress);

  const currentAllowance: bigint = await token.allowance(wallet.address, spender);
  if (currentAllowance >= amount) return null;

  // Approve max to avoid repeated approvals
  const { txHash } = await sendTx(token, 'approve', [spender, ethers.MaxUint256]);
  return txHash;
}

/**
 * Get the current balance of a token for the agent wallet.
 */
export async function getBalance(tokenAddress: string): Promise<{ raw: bigint; formatted: string; decimals: number }> {
  const wallet = getWallet();
  const token = getERC20(tokenAddress);
  const [balance, decimals] = await Promise.all([
    token.balanceOf(wallet.address) as Promise<bigint>,
    token.decimals() as Promise<number>,
  ]);
  return {
    raw: balance,
    formatted: ethers.formatUnits(balance, decimals),
    decimals: Number(decimals),
  };
}

/**
 * Format an amount to the correct token decimals.
 */
export function parseTokenAmount(amount: number | string, decimals: number = 6): bigint {
  return ethers.parseUnits(String(amount), decimals);
}

/**
 * Build explorer URL for a tx hash or address.
 */
export function explorerUrl(hashOrAddress: string, type: 'tx' | 'address' = 'tx'): string {
  return `${TEMPO_EXPLORER}/${type}/${hashOrAddress}`;
}
