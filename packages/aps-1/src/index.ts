/**
 * @agtfi-protocol/aps-1 - Agent Payment Standard v2.1
 *
 * The open protocol standard for AI agent payments.
 * Framework-agnostic — works with OpenAI, Anthropic, LangChain,
 * CrewAI, MCP, Eliza, or any HTTP-based agent framework.
 *
 * v2.1 Features:
 * - Pluggable EscrowProvider for on-chain escrow (NexusV2, StreamV1, custom)
 * - Pluggable ProofProvider for AI execution verification
 * - A2A (Agent-to-Agent) sub-task delegation with depth limits
 * - Auto-negotiation with multi-round counter-offer support
 * - Security deposits with tiered fee discounts
 * - Reputation system integration
 * - Structured error codes (APS1ErrorCode)
 * - Lifecycle event streaming via SSE
 * - Full Zod runtime validation for all protocol messages
 *
 * @example Build an APS-1 compliant agent:
 * ```typescript
 * import { APS1Agent } from '@agtfi-protocol/aps-1';
 *
 * const agent = new APS1Agent({
 *   id: 'my-agent',
 *   name: 'My Agent',
 *   description: 'Does amazing things',
 *   category: 'analytics',
 *   version: '1.0.0',
 *   pricing: { basePrice: 5, currency: 'USD', negotiable: true },
 *   capabilities: ['analyze'],
 *   walletAddress: '0x...',
 *   proofEnabled: true,
 *   a2aEnabled: true,
 * });
 *
 * agent.onExecute(async (envelope) => {
 *   // envelope.escrow contains on-chain escrow info
 *   // envelope.proof contains AI proof commitment
 *   // envelope.a2a contains parent job context (if sub-task)
 *   return { status: 'success', result: { answer: 42 } };
 * });
 *
 * agent.listen(3002);
 * ```
 *
 * @example Hire an agent with full escrow + proof lifecycle:
 * ```typescript
 * import { APS1Client } from '@agtfi-protocol/aps-1';
 *
 * const client = new APS1Client({
 *   agentServiceUrl: 'https://agt.finance',
 *   escrowProvider: myNexusV2Provider,
 *   proofProvider: myAIProofProvider,
 *   onEvent: (event) => console.log(event.type, event.data),
 * });
 *
 * // Full lifecycle: escrow → proof → execute → verify → settle
 * const result = await client.executeWithEscrow(
 *   'contract-auditor',
 *   'Audit this contract for vulnerabilities',
 *   '0xMyWallet',
 *   {
 *     method: 'nexus-escrow',
 *     token: '0x20c0000000000000000000000000000000000001',
 *     amount: '10000000',
 *     amountUSD: 10,
 *     deadlineSeconds: 172800,
 *     workerWallet: '0xAgentWallet',
 *   },
 * );
 *
 * console.log(result.status);       // 'success'
 * console.log(result.proof?.matched); // true (AI proof verified)
 * console.log(result.settlement);    // { type: 'settle', txHash: '0x...' }
 * ```
 *
 * @example Validate APS-1 data:
 * ```typescript
 * import { validateManifest, validateResult } from '@agtfi-protocol/aps-1';
 *
 * const valid = validateManifest(someData);
 * if (valid.success) {
 *   console.log('Valid manifest:', valid.data);
 * } else {
 *   console.error('Invalid:', valid.errors);
 * }
 * ```
 */

// ── Core Types ────────────────────────────────────────────
export type {
  APS1Manifest,
  APS1Category,
  APS1Pricing,
  APS1PaymentMethod,
  APS1TokenConfig,
  APS1Endpoints,
  APS1NegotiationMessage,
  APS1EscrowParams,
  APS1Milestone,
  APS1ExecutionEnvelope,
  APS1Result,
  APS1Transaction,
  APS1Settlement,
} from './types';

// ── v2.1 Types ───────────────────────────────────────────
export type {
  // Escrow Provider
  APS1EscrowProvider,
  APS1EscrowReceipt,
  APS1EscrowSettlement,
  APS1EscrowStatus,
  // Proof Provider
  APS1ProofProvider,
  APS1ProofCommitment,
  APS1ProofVerification,
  APS1ProofStats,
  // A2A
  APS1A2ARequest,
  APS1CoordinatorPlan,
  APS1CoordinatorStep,
  // Security Deposit
  APS1SecurityDeposit,
  APS1SecurityDepositTier,
  // Reputation
  APS1ReputationSnapshot,
  APS1ReputationTier,
  // Events
  APS1Event,
  APS1EventType,
  // Protocol Config
  APS1ProtocolConfig,
} from './types';

// ── Error Codes ──────────────────────────────────────────
export { APS1ErrorCode } from './types';

// ── Constants ─────────────────────────────────────────────
export {
  APS1_VERSION,
  APS1_CHAIN_ID,
  APS1_NETWORK,
  APS1_RPC_URL,
  APS1_EXPLORER_URL,
  APS1_PLATFORM_FEE_BPS,
  APS1_MAX_A2A_DEPTH,
  APS1_MAX_NEGOTIATION_ROUNDS,
  APS1_DEFAULT_TOKENS,
  APS1_CONTRACTS,
  APS1_DEFAULT_CONFIG,
  APS1_DEPOSIT_TIERS,
  APS1_REPUTATION_TIERS,
} from './types';

// ── Validation ────────────────────────────────────────────
export {
  validateManifest,
  validateEnvelope,
  validateResult,
  validateEscrowParams,
  validateNegotiation,
  validateSettlement,
  validateEvent,
  validateA2AContext,
  validateProtocolConfig,
} from './validator';

export type { ValidationResult } from './validator';

// Zod schemas (for custom composition)
export {
  APS1ManifestSchema,
  APS1ExecutionEnvelopeSchema,
  APS1ResultSchema,
  APS1NegotiationSchema,
  APS1EscrowParamsSchema,
  APS1SettlementSchema,
  APS1EventSchema,
  APS1A2AContextSchema,
  APS1ProtocolConfigSchema,
} from './validator';

// ── Reference Implementations ─────────────────────────────
export { APS1Agent } from './aps1-agent';
export type { APS1AgentConfig, APS1ExecuteHandler, APS1NegotiateHandler, APS1EscrowVerifyHandler } from './aps1-agent';

export { APS1Client, APS1ProtocolError } from './aps1-client';
export type { APS1ClientConfig } from './aps1-client';
