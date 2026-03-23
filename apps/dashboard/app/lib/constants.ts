// ==========================================
// SMART CONTRACT CONSTANTS
// ==========================================
export const AGTFI_NEXUS_ADDRESS = "0xc608cd2EAbfcb0734927433b7A3a7d7b43990F2c";
export const AGTFI_MULTISEND_ADDRESS = "0xc0e6F06EfD5A9d40b1018B0ba396A925aBC4cF69";
// V2 Multisend - Multi-token, batch registry, per-transfer events
export const AGTFI_MULTISEND_V2_ADDRESS = "0x25f4d3f12C579002681a52821F3a6251c46D4575";
export const AGTFI_SHIELD_ADDRESS = "0x4cfcaE530d7a49A0FE8c0de858a0fA8Cf9Aea8B1";

// V2 Shield Vault - Nullifier Anti-Double-Spend (ZK-SNARK PLONK)
// Deployed & verified on Tempo Moderato (chain 42431)
export const AGTFI_SHIELD_V2_ADDRESS = "0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055";
export const PLONK_VERIFIER_V2_ADDRESS = "0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B";

// Batch Shield Executor - batches multiple ZK payouts into 1 atomic TX
// ShieldVaultV2.masterDaemon → BatchShieldExecutor → ShieldVaultV2.executeShieldedPayout
export const BATCH_SHIELD_EXECUTOR_ADDRESS = "0xBc7dF45b15739c41c3223b1B794A73d793A65Ea2";

// V2 Escrow Contract - full lifecycle (dispute, refund, timeout, settlement)
// Deployed & verified on Tempo Moderato (chain 42431)
export const AGTFI_NEXUS_V2_ADDRESS = "0x6A467Cd4156093bB528e448C04366586a1052Fab";

// AI Proof Registry - Verifiable on-chain AI commitments
// Deployed & verified on Tempo Moderato (chain 42431)
export const AI_PROOF_REGISTRY_ADDRESS = "0x8fDB8E871c9eaF2955009566F41490Bbb128a014";

// Stream Settlement V1 - Progressive milestone-based escrow
// Deployed & verified on Tempo Moderato (chain 42431)
export const STREAM_V1_ADDRESS = "0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C";

// ZK Compliance Registry - "Private but Legal" compliance proofs
// OFAC non-membership + AML amount/volume range proofs (PLONK)
// Deployed on Tempo Moderato (chain 42431)
export const COMPLIANCE_VERIFIER_ADDRESS = "0x4896f5797b59CC8EE5e942eBd0Ed6772af9131fF";
export const COMPLIANCE_REGISTRY_ADDRESS = "0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14";

// ZK Agent Reputation Registry - Anonymous credit score for AI agents
// Hash chain accumulator + reputation proofs (PLONK)
// Deployed on Tempo Moderato (chain 42431)
export const REPUTATION_VERIFIER_ADDRESS = "0x2e2C368afB20810AadA9e6BB2Fb51002614F7Da4";
export const REPUTATION_REGISTRY_ADDRESS = "0xF3296984cb8785Ab236322658c13051801E58875";

// Proof Chain Settlement — Incremental proof chaining for micropayments
// 16 payments/batch, chained proofs, 90%+ gas savings vs individual verification
// Deployed on Tempo Moderato (chain 42431)
export const PROOF_CHAIN_VERIFIER_ADDRESS = "0xc5B22fE8a493441aAc5fD17B15D2C423E2587b42";
export const PROOF_CHAIN_SETTLEMENT_ADDRESS = "0x0ED1D5cFDe33f05Ce377cB6e9a0A23570255060D";

// LayerZero ZK DVN — Cross-chain ZK-verified messaging
// Deployed on Tempo Moderato (chain 42431)
export const AGTFI_ZK_DVN_ADDRESS = "0xff5E640b867858C30a673ff68e5c0D687f11E29e";
export const CROSS_CHAIN_HUB_ADDRESS = "0x5794051787300d44379e4CF686C64EDc43ADf0C4";
export const CROSS_CHAIN_SPOKE_ADDRESS = "0x7201B8Bdd76AC1696408FD7A429dd83BcBE8CFda";

// MPP Compliance Gateway — session keys bound to ZK compliance
export const MPP_COMPLIANCE_GATEWAY_ADDRESS = "0x5F68F2A17a28b06A02A649cade5a666C49cb6B6d";

// Agent Discovery Registry — privacy-preserving agent marketplace
export const AGENT_DISCOVERY_REGISTRY_ADDRESS = "0x74D79e0AEd3CF9aE9A325558940bB1c8fB8CeA47";

// Legacy ABI - kept for backward compatibility
export const NEXUS_ABI = ["function createJob(address _worker, address _judge, address _token, uint256 _amount) external"] as const;

// NexusV2 ABI - full escrow lifecycle
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

// ShieldVault V2 ABI - Nullifier + Commitment registry
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

// MultisendVault V2 ABI - Multi-token batch payments with tracking
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

// AIProofRegistry ABI - Verifiable AI execution commitments
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

// StreamV1 ABI - Progressive milestone-based escrow
export const STREAM_V1_ABI = [
    "function createStream(address _agent, address _token, uint256[] calldata _milestoneAmounts, uint256 _deadlineDuration) external returns (uint256)",
    "function submitMilestone(uint256 _streamId, uint256 _milestoneIndex, bytes32 _proofHash) external",
    "function approveMilestone(uint256 _streamId, uint256 _milestoneIndex) external",
    "function rejectMilestone(uint256 _streamId, uint256 _milestoneIndex) external",
    "function cancelStream(uint256 _streamId) external",
    "function claimTimeout(uint256 _streamId) external",
    "function getStream(uint256 _streamId) external view returns (address client, address agent, address token, uint256 totalBudget, uint256 releasedAmount, uint256 milestoneCount, uint256 approvedCount, uint256 deadline, uint8 status)",
    "function getMilestone(uint256 _streamId, uint256 _milestoneIndex) external view returns (uint256 amount, bytes32 proofHash, uint8 status)",
    "function isTimedOut(uint256 _streamId) external view returns (bool)",
    "function getRemainingBalance(uint256 _streamId) external view returns (uint256)",
    "function streamCount() external view returns (uint256)",
    "event StreamCreated(uint256 indexed streamId, address indexed client, address indexed agent, uint256 totalBudget, uint256 milestoneCount, uint256 deadline)",
    "event MilestoneSubmitted(uint256 indexed streamId, uint256 indexed milestoneIndex, bytes32 proofHash)",
    "event MilestoneApproved(uint256 indexed streamId, uint256 indexed milestoneIndex, uint256 agentPayout, uint256 fee)",
    "event MilestoneRejected(uint256 indexed streamId, uint256 indexed milestoneIndex)",
    "event StreamCompleted(uint256 indexed streamId, uint256 totalReleased, uint256 totalFees)",
    "event StreamCancelled(uint256 indexed streamId, uint256 refundedAmount)",
] as const;

// Reputation Registry ABI (legacy — used for non-ZK reputation queries)

export const REPUTATION_REGISTRY_ABI = [
    "function updateReputation(address _agent, uint256 _nexusRatingSum, uint256 _nexusRatingCount, uint256 _offChainRatingSum, uint256 _offChainRatingCount, uint256 _totalJobsCompleted, uint256 _totalJobsFailed, uint256 _proofCommitments, uint256 _proofVerified, uint256 _proofMatched, uint256 _proofSlashed) external",
    "function getReputation(address _agent) external view returns (tuple(uint256 nexusRatingSum, uint256 nexusRatingCount, uint256 offChainRatingSum, uint256 offChainRatingCount, uint256 totalJobsCompleted, uint256 totalJobsFailed, uint256 proofCommitments, uint256 proofVerified, uint256 proofMatched, uint256 proofSlashed, uint256 compositeScore, uint256 updatedAt))",
    "function getCompositeScore(address _agent) external view returns (uint256)",
    "function getTier(address _agent) external view returns (uint256)",
    "function getTrackedAgentCount() external view returns (uint256)",
    "function getTrackedAgent(uint256 _index) external view returns (address)",
    "function totalAgentsScored() external view returns (uint256)",
    "event ReputationUpdated(address indexed agent, uint256 compositeScore, uint256 timestamp)",
] as const;

// Security Deposit Vault - Agent staking alternative with tiered fee discounts
// Deployed & verified on Tempo Moderato (chain 42431)
export const SECURITY_DEPOSIT_ADDRESS = "0x8C1d4da4034FFEB5E3809aa017785cB70B081A80";

export const SECURITY_DEPOSIT_ABI = [
    "function deposit(uint256 _amount) external",
    "function withdraw(uint256 _amount) external",
    "function slash(address _agent, string calldata _reason) external",
    "function insurancePayout(address _claimant, uint256 _amount, string calldata _reason) external",
    "function getTier(address _agent) external view returns (uint8)",
    "function getFeeDiscount(address _agent) external view returns (uint256)",
    "function getDeposit(address _agent) external view returns (uint256 amount, uint256 depositedAt, uint256 slashCount, uint256 totalSlashedAmt, uint8 tier, uint256 feeDiscount, bool lockExpired)",
    "function getStats() external view returns (uint256 _totalDeposited, uint256 _totalSlashed, uint256 _totalInsurancePaid, uint256 _insurancePool, uint256 _totalAgents)",
    "function getDepositorCount() external view returns (uint256)",
    "event DepositMade(address indexed agent, uint256 amount, uint256 total, uint8 tier)",
    "event DepositWithdrawn(address indexed agent, uint256 amount, uint256 remaining)",
    "event DepositSlashed(address indexed agent, uint256 slashAmount, string reason)",
    "event InsurancePayout(address indexed claimant, uint256 amount, string reason)",
] as const;

// Platform Treasury Wallet (controlled by DAEMON_PRIVATE_KEY)
// Receives payroll ZK deposits — daemon handles ShieldVaultV2 lifecycle
export const AGTFI_TREASURY_WALLET = "0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793";

export const RPC_URL = "https://rpc.moderato.tempo.xyz";

export const SUPPORTED_TOKENS = [
    { symbol: "AlphaUSD", address: "0x20c0000000000000000000000000000000000001", decimals: 6, icon: "🟣" },
    { symbol: "pathUSD", address: "0x20c0000000000000000000000000000000000000", decimals: 6, icon: "🟢" },
    { symbol: "BetaUSD", address: "0x20c0000000000000000000000000000000000002", decimals: 6, icon: "🟡" },
    { symbol: "ThetaUSD", address: "0x20c0000000000000000000000000000000000003", decimals: 6, icon: "🔴" }
] as const;

export type SupportedToken = typeof SUPPORTED_TOKENS[number];
