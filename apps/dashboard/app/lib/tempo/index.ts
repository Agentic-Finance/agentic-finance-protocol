/**
 * Tempo AA Foundation — Barrel Export
 *
 * Usage:
 *   import { publicClient, getDaemonWalletClient, tempoModerato } from '@/lib/tempo';
 *   import { getNexusV2Read, getProofRegistryWrite } from '@/lib/tempo';
 */

// Chain
export { tempoModerato, tempoMainnet, getActiveChain, isMainnet } from './chain';

// Clients
export {
  publicClient,
  getDaemonAccount,
  getDaemonWalletClient,
} from './clients';

// Contracts (read)
export {
  getNexusV2Read,
  getShieldV2Read,
  getMultisendV2Read,
  getProofRegistryRead,
  getStreamV1Read,
} from './contracts';

// Contracts (write — daemon)
export {
  getNexusV2Write,
  getProofRegistryWrite,
  getStreamV1Write,
  getMultisendV2Write,
} from './contracts';

// ABIs (for direct use)
export {
  NEXUS_V2_VIEM_ABI,
  SHIELD_V2_VIEM_ABI,
  MULTISEND_V2_VIEM_ABI,
  AI_PROOF_REGISTRY_VIEM_ABI,
  STREAM_V1_VIEM_ABI,
  ERC20_VIEM_ABI,
} from './contracts';

// Fee Sponsorship (Phase 2)
export {
  sponsorTransaction,
  estimateSponsoredGas,
  canSponsor,
  buildTransferCalldata,
} from './fee-payer';

// Native Batch Transactions (Phase 3)
export {
  buildTransferBatch,
  buildApproveAndTransferBatch,
  buildSettlementBatch,
  executeBatch,
  executeBatchViaMultisend,
} from './batch';

// Parallel Nonce Manager (Phase 4)
export { nonceManager, withLane } from './parallel-nonce';

// Scheduled Transactions (Phase 5)
export {
  validateScheduledTx,
  isReadyForExecution,
  isExpired,
  formatWindow,
} from './scheduled-tx';

// Scheduler Daemon (Phase 5)
export {
  startSchedulerDaemon,
  stopSchedulerDaemon,
  isSchedulerRunning,
} from './scheduler-daemon';

// Access Keys (Phase 6)
export {
  ACCESS_KEY_PRECOMPILE,
  checkSpendingLimit,
  isContractAllowed,
  ACCESS_KEY_TIERS,
  getDefaultConfig,
} from './access-keys';

// MPP — Machine Payments Protocol (Tempo + Stripe)
export {
  createChargeIntent,
  createSession,
  streamPayment,
  canPay,
  cancelSession,
} from './mpp-client';

// TIP-403 Compliance Registry
export {
  isTransferAllowed,
  getTokenPolicy,
  isWhitelisted,
  checkBatchCompliance,
} from './compliance';

// Passkey Authentication (WebAuthn P256)
export {
  isPasskeySupported,
  registerPasskey,
  authenticatePasskey,
} from './passkey';
