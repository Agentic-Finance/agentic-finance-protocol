// ==========================================
// SMART CONTRACT CONSTANTS
// ==========================================
export const PAYPOL_NEXUS_ADDRESS = "0xc608cd2EAbfcb0734927433b7A3a7d7b43990F2c";
export const PAYPOL_MULTISEND_ADDRESS = "0xc0e6F06EfD5A9d40b1018B0ba396A925aBC4cF69";
// V2 Multisend — Multi-token, batch registry, per-transfer events
export const PAYPOL_MULTISEND_V2_ADDRESS = "0x25f4d3f12C579002681a52821F3a6251c46D4575";
export const PAYPOL_SHIELD_ADDRESS = "0x4cfcaE530d7a49A0FE8c0de858a0fA8Cf9Aea8B1";

// V2 Shield Vault — Nullifier Anti-Double-Spend (ZK-SNARK PLONK)
// Deployed & verified on Tempo Moderato (chain 42431)
export const PAYPOL_SHIELD_V2_ADDRESS = "0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055";
export const PLONK_VERIFIER_V2_ADDRESS = "0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B";

// V2 Escrow Contract — full lifecycle (dispute, refund, timeout, settlement)
// Deployed & verified on Tempo Moderato (chain 42431)
export const PAYPOL_NEXUS_V2_ADDRESS = "0x6A467Cd4156093bB528e448C04366586a1052Fab";

// AI Proof Registry — Verifiable on-chain AI commitments
// Deployed & verified on Tempo Moderato (chain 42431)
export const AI_PROOF_REGISTRY_ADDRESS = "0x8fDB8E871c9eaF2955009566F41490Bbb128a014";

// Legacy ABI — kept for backward compatibility
export const NEXUS_ABI = ["function createJob(address _worker, address _judge, address _token, uint256 _amount) external"] as const;

// NexusV2 ABI — full escrow lifecycle
export const NEXUS_V2_ABI = [
    "function createJob(address _worker, address _judge, address _token, uint256 _amount, uint256 _deadlineDuration) external returns (uint256)",
    "function startJob(uint256 _jobId) external",
    "function completeJob(uint256 _jobId) external",
    "function disputeJob(uint256 _jobId) external",
    "function settleJob(uint256 _jobId) external",
    "function refundJob(uint256 _jobId) external",
    "function claimTimeout(uint256 _jobId) external",
    "function rateWorker(uint256 _jobId, uint256 _rating) external",
    "function getJob(uint256 _jobId) external view returns (address employer, address worker, address judge, address token, uint256 budget, uint256 platformFee, uint256 deadline, uint8 status, bool rated)",
    "function isTimedOut(uint256 _jobId) external view returns (bool)",
    "function getWorkerRating(address _worker) external view returns (uint256)",
    "event JobCreated(uint256 indexed jobId, address indexed employer, address indexed worker, uint256 budget, uint256 deadline)",
    "event JobSettled(uint256 indexed jobId, uint256 workerPay, uint256 fee)",
    "event JobRefunded(uint256 indexed jobId, uint256 amount)",
    "event JobDisputed(uint256 indexed jobId, address indexed employer)",
    "event WorkerRated(uint256 indexed jobId, address indexed worker, uint256 rating)",
] as const;

// ShieldVault V2 ABI — Nullifier + Commitment registry
export const SHIELD_V2_ABI = [
    "function deposit(uint256 commitment, uint256 amount) external",
    "function executeShieldedPayout(uint256[24] calldata proof, uint256[3] calldata pubSignals, uint256 exactAmount) external",
    "function executePublicPayout(address recipient, uint256 amount) external",
    "function isCommitmentRegistered(uint256 commitment) external view returns (bool)",
    "function isNullifierUsed(uint256 nullifierHash) external view returns (bool)",
    "function getCommitmentAmount(uint256 commitment) external view returns (uint256)",
    "event Deposited(uint256 indexed commitment, address indexed depositor, uint256 amount)",
    "event ShieldedWithdrawal(uint256 indexed commitment, uint256 indexed nullifierHash, address indexed recipient, uint256 amount)",
    "event PublicPayoutExecuted(address indexed recipient, uint256 amount)",
] as const;

// MultisendVault V2 ABI — Multi-token batch payments with tracking
export const MULTISEND_V2_ABI = [
    "function depositFunds(uint256 amount) external",
    "function depositToken(address token, uint256 amount) external",
    "function executePublicBatch(address[] calldata recipients, uint256[] calldata amounts, bytes32 batchId) external",
    "function executeMultiTokenBatch(address token, address[] calldata recipients, uint256[] calldata amounts, bytes32 batchId) external",
    "function refundDeposit(address token, uint256 amount) external",
    "function getBatchCount() external view returns (uint256)",
    "function getVaultBalance(address token) external view returns (uint256)",
    "function batchExecuted(bytes32) external view returns (bool)",
    "event IndividualTransfer(bytes32 indexed batchId, address indexed recipient, uint256 amount, uint256 index)",
    "event BatchDisbursedV2(bytes32 indexed batchId, address indexed token, uint256 totalRecipients, uint256 totalAmount, address executor)",
    "event BatchDisbursed(uint256 totalRecipients, uint256 totalAmount, bytes32 batchId)",
] as const;

export const ERC20_ABI = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)"
] as const;

// AIProofRegistry ABI — Verifiable AI execution commitments
export const AI_PROOF_REGISTRY_ABI = [
    "function commit(bytes32 planHash, uint256 nexusJobId) external returns (bytes32)",
    "function verify(bytes32 commitmentId, bytes32 resultHash) external",
    "function slash(bytes32 commitmentId) external",
    "function getCommitment(bytes32 commitmentId) external view returns (bytes32 planHash, address agent, uint256 nexusJobId, bytes32 resultHash, bool verified, bool matched, uint256 committedAt, uint256 verifiedAt)",
    "function getJobCommitment(uint256 nexusJobId) external view returns (bytes32)",
    "function getStats() external view returns (uint256 totalCommitments, uint256 totalVerified, uint256 totalMatched, uint256 totalMismatched, uint256 totalSlashed)",
    "event CommitmentMade(bytes32 indexed commitmentId, address indexed agent, uint256 indexed nexusJobId, bytes32 planHash)",
    "event CommitmentVerified(bytes32 indexed commitmentId, bool matched, bytes32 resultHash)",
    "event AgentSlashed(bytes32 indexed commitmentId, address indexed agent, uint256 indexed nexusJobId)",
] as const;

export const RPC_URL = "https://rpc.moderato.tempo.xyz";

export const SUPPORTED_TOKENS = [
    { symbol: "AlphaUSD", address: "0x20c0000000000000000000000000000000000001", decimals: 6, icon: "🟣" },
    { symbol: "pathUSD", address: "0x20c0000000000000000000000000000000000000", decimals: 6, icon: "🟢" },
    { symbol: "BetaUSD", address: "0x20c0000000000000000000000000000000000002", decimals: 6, icon: "🟡" },
    { symbol: "ThetaUSD", address: "0x20c0000000000000000000000000000000000003", decimals: 6, icon: "🔴" }
] as const;

export type SupportedToken = typeof SUPPORTED_TOKENS[number];
