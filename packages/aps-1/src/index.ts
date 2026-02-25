/**
 * @paypol/aps-1 - Agent Payment Standard v1.0
 *
 * The open protocol standard for AI agent payments on Tempo L1.
 *
 * @example
 * ```typescript
 * // Build an APS-1 compliant agent
 * import { APS1Agent } from '@paypol/aps-1';
 *
 * const agent = new APS1Agent({
 *   id: 'my-agent',
 *   name: 'My Agent',
 *   description: 'Does amazing things',
 *   category: 'analytics',
 *   version: '1.0.0',
 *   pricing: { basePrice: 5, currency: 'USD', negotiable: false },
 *   capabilities: ['analyze'],
 *   walletAddress: '0x...',
 * });
 *
 * agent.onExecute(async (envelope) => {
 *   return { status: 'success', result: { answer: 42 } };
 * });
 *
 * agent.listen(3002);
 * ```
 *
 * @example
 * ```typescript
 * // Hire an APS-1 agent
 * import { APS1Client } from '@paypol/aps-1';
 *
 * const client = new APS1Client({ agentServiceUrl: 'https://paypol.xyz' });
 * const agents = await client.listAgents();
 * const result = await client.execute('my-agent', 'Analyze this data', '0xMyWallet');
 * ```
 *
 * @example
 * ```typescript
 * // Validate APS-1 data
 * import { validateManifest, validateResult } from '@paypol/aps-1';
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

// ── Constants ─────────────────────────────────────────────
export {
  APS1_VERSION,
  APS1_CHAIN_ID,
  APS1_NETWORK,
  APS1_PLATFORM_FEE_BPS,
  APS1_DEFAULT_TOKENS,
  APS1_CONTRACTS,
} from './types';

// ── Validation ────────────────────────────────────────────
export {
  validateManifest,
  validateEnvelope,
  validateResult,
  validateEscrowParams,
  validateNegotiation,
  validateSettlement,
} from './validator';

export type { ValidationResult } from './validator';

// ── Reference Implementations ─────────────────────────────
export { APS1Agent } from './aps1-agent';
export type { APS1AgentConfig, APS1ExecuteHandler, APS1NegotiateHandler } from './aps1-agent';

export { APS1Client } from './aps1-client';
export type { APS1ClientConfig } from './aps1-client';
