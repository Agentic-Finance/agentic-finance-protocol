// ==========================================
// SMART CONTRACT CONSTANTS
// ==========================================
export const PAYPOL_NEXUS_ADDRESS = "0xc608cd2EAbfcb0734927433b7A3a7d7b43990F2c";
export const PAYPOL_MULTISEND_ADDRESS = "0xc0e6F06EfD5A9d40b1018B0ba396A925aBC4cF69";
export const PAYPOL_SHIELD_ADDRESS = "0x4cfcaE530d7a49A0FE8c0de858a0fA8Cf9Aea8B1";

// V2 Escrow Contract — full lifecycle (dispute, refund, timeout, settlement)
// Deployed & verified on Tempo Moderato (chain 42431)
export const PAYPOL_NEXUS_V2_ADDRESS = "0x6A467Cd4156093bB528e448C04366586a1052Fab";

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

export const ERC20_ABI = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)"
] as const;

export const RPC_URL = "https://rpc.moderato.tempo.xyz";

export const SUPPORTED_TOKENS = [
    { symbol: "AlphaUSD", address: "0x20c0000000000000000000000000000000000001", decimals: 6, icon: "🟣" },
    { symbol: "pathUSD", address: "0x20c0000000000000000000000000000000000000", decimals: 6, icon: "🟢" },
    { symbol: "BetaUSD", address: "0x20c0000000000000000000000000000000000002", decimals: 6, icon: "🟡" },
    { symbol: "ThetaUSD", address: "0x20c0000000000000000000000000000000000003", decimals: 6, icon: "🔴" }
] as const;

export type SupportedToken = typeof SUPPORTED_TOKENS[number];
