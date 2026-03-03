/**
 * APS-1 Validator v2.1
 *
 * Runtime validation schemas for APS-1 protocol messages.
 * Uses Zod for type-safe validation of manifests, execution envelopes, and results.
 *
 * v2.1 additions:
 * - A2A context validation
 * - Error code validation
 * - Event validation
 * - Protocol config validation
 */

import { z } from 'zod';

// ── Shared Schemas ─────────────────────────────────────────

const ethAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');
const bytes32 = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid bytes32 hash');
const isoTimestamp = z.string().datetime({ message: 'Must be ISO 8601 timestamp' });

const categorySchema = z.enum([
  'security', 'escrow', 'payments', 'streams', 'analytics',
  'deployment', 'privacy', 'verification', 'orchestration', 'payroll', 'admin',
  'defi', 'compliance', 'automation',
]);

const paymentMethodSchema = z.enum(['nexus-escrow', 'stream-milestone', 'direct-transfer']);

const tokenConfigSchema = z.object({
  symbol: z.string().min(1).max(20),
  address: ethAddress,
  decimals: z.number().int().min(0).max(18),
});

const reputationTierSchema = z.enum(['newcomer', 'rising', 'trusted', 'elite', 'legend']);
const securityDepositTierSchema = z.enum(['none', 'bronze', 'silver', 'gold']);

// ── APS-1 Manifest Schema ──────────────────────────────────

export const APS1ManifestSchema = z.object({
  aps: z.enum(['1.0', '2.0', '2.1']),
  id: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, 'Must be kebab-case'),
  name: z.string().min(1).max(128),
  description: z.string().min(1).max(1024),
  category: categorySchema,
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semver (e.g. 1.0.0)'),
  pricing: z.object({
    basePrice: z.number().min(0),
    currency: z.literal('USD'),
    negotiable: z.boolean(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
  }),
  capabilities: z.array(z.string()).min(1),
  paymentMethods: z.array(paymentMethodSchema).min(1),
  supportedTokens: z.array(tokenConfigSchema).min(1),
  proofEnabled: z.boolean(),
  reputationScore: z.number().int().min(0).max(10000).optional(),
  reputationTier: reputationTierSchema.optional(),
  walletAddress: ethAddress,
  securityDepositTier: securityDepositTierSchema.optional(),
  a2aEnabled: z.boolean().optional(),
  endpoints: z.object({
    manifest: z.string().url(),
    execute: z.string().url(),
    negotiate: z.string().url().optional(),
    status: z.string().url().optional(),
    health: z.string().url().optional(),
    a2aExecute: z.string().url().optional(),
    events: z.string().url().optional(),
  }),
  metadata: z.record(z.unknown()).optional(),
});

// ── APS-1 Negotiation Message Schema ───────────────────────

export const APS1NegotiationSchema = z.object({
  type: z.enum(['propose', 'counter', 'accept', 'reject']),
  jobId: z.string().min(1),
  price: z.number().min(0),
  currency: z.literal('USD'),
  message: z.string().max(1024).optional(),
  maxRounds: z.number().int().min(1).max(20).optional(),
  round: z.number().int().min(1).optional(),
  timestamp: isoTimestamp,
});

// ── APS-1 Escrow Params Schema ─────────────────────────────

export const APS1EscrowParamsSchema = z.object({
  method: paymentMethodSchema,
  token: ethAddress,
  amount: z.string().min(1),
  amountUSD: z.number().min(0),
  deadlineSeconds: z.number().int().min(60).max(30 * 24 * 3600), // 1 min to 30 days
  workerWallet: ethAddress,
  judgeWallet: ethAddress.optional(),
  milestones: z.array(z.object({
    amount: z.string().min(1),
    deliverable: z.string().min(1).max(512),
  })).optional(),
});

// ── A2A Context Schema (v2.0) ──────────────────────────────

export const APS1A2AContextSchema = z.object({
  parentJobId: z.string().min(1),
  parentAgentId: z.string().min(1),
  depth: z.number().int().min(0).max(5),
  budgetAllocation: z.number().min(0),
  a2aChainId: z.string().min(1),
});

// ── APS-1 Execution Envelope Schema ────────────────────────

export const APS1ExecutionEnvelopeSchema = z.object({
  jobId: z.string().min(1),
  agentId: z.string().min(1),
  prompt: z.string().min(1).max(10000),
  payload: z.record(z.unknown()).optional(),
  callerWallet: ethAddress,
  escrow: z.object({
    contractAddress: ethAddress,
    onChainId: z.number().int().min(0),
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    method: paymentMethodSchema,
  }).optional(),
  proof: z.object({
    planHash: bytes32,
    commitmentId: bytes32,
    commitTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  }).optional(),
  a2a: APS1A2AContextSchema.optional(),
  timestamp: isoTimestamp,
});

// ── APS-1 Result Schema ────────────────────────────────────

const errorCodeSchema = z.string().regex(/^APS1_\d{4}$/, 'Must be APS1_XXXX format');

export const APS1ResultSchema = z.object({
  jobId: z.string().min(1),
  agentId: z.string().min(1),
  status: z.enum(['success', 'error', 'pending']),
  result: z.unknown().optional(),
  error: z.string().optional(),
  errorCode: errorCodeSchema.optional(),
  onChain: z.object({
    executed: z.boolean(),
    transactions: z.array(z.object({
      hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
      blockNumber: z.number().int().min(0),
      gasUsed: z.string(),
      explorerUrl: z.string().url(),
      description: z.string().optional(),
    })),
    network: z.string(),
    chainId: z.number().int(),
  }).optional(),
  proof: z.object({
    resultHash: bytes32,
    verifyTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    matched: z.boolean(),
  }).optional(),
  a2a: z.object({
    childJobs: z.array(z.object({
      jobId: z.string().min(1),
      agentId: z.string().min(1),
      status: z.enum(['success', 'error', 'pending']),
      executionTimeMs: z.number().int().min(0),
    })),
    a2aChainId: z.string().min(1),
  }).optional(),
  executionTimeMs: z.number().int().min(0),
  timestamp: isoTimestamp,
});

// ── APS-1 Settlement Schema ────────────────────────────────

export const APS1SettlementSchema = z.object({
  jobId: z.string().min(1),
  type: z.enum(['settle', 'refund', 'dispute']),
  agentPayout: z.string(),
  platformFee: z.string(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  timestamp: isoTimestamp,
});

// ── APS-1 Event Schema (v2.0) ──────────────────────────────

export const APS1EventSchema = z.object({
  type: z.string().min(1),
  jobId: z.string(),
  agentId: z.string(),
  data: z.record(z.unknown()),
  timestamp: isoTimestamp,
});

// ── Protocol Config Schema (v2.0) ──────────────────────────

export const APS1ProtocolConfigSchema = z.object({
  chainId: z.number().int(),
  network: z.string().min(1),
  rpcUrl: z.string().url(),
  explorerUrl: z.string().url(),
  platformFeeBps: z.number().int().min(0).max(3000),
  contracts: z.object({
    nexusV2: ethAddress,
    shieldVaultV2: ethAddress.optional(),
    multisendV2: ethAddress.optional(),
    aiProofRegistry: ethAddress.optional(),
    streamV1: ethAddress.optional(),
    reputation: ethAddress.optional(),
    securityDeposit: ethAddress.optional(),
  }),
  defaultToken: tokenConfigSchema,
  supportedTokens: z.array(tokenConfigSchema).min(1),
});

// ── Validation Functions ───────────────────────────────────

export type ValidationResult<T> = { success: true; data: T } | { success: false; errors: string[] };

function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  };
}

/** Validate an APS-1 agent manifest */
export function validateManifest(data: unknown) {
  return validate(APS1ManifestSchema, data);
}

/** Validate an APS-1 execution envelope */
export function validateEnvelope(data: unknown) {
  return validate(APS1ExecutionEnvelopeSchema, data);
}

/** Validate an APS-1 execution result */
export function validateResult(data: unknown) {
  return validate(APS1ResultSchema, data);
}

/** Validate APS-1 escrow parameters */
export function validateEscrowParams(data: unknown) {
  return validate(APS1EscrowParamsSchema, data);
}

/** Validate an APS-1 negotiation message */
export function validateNegotiation(data: unknown) {
  return validate(APS1NegotiationSchema, data);
}

/** Validate an APS-1 settlement event */
export function validateSettlement(data: unknown) {
  return validate(APS1SettlementSchema, data);
}

/** Validate an APS-1 lifecycle event */
export function validateEvent(data: unknown) {
  return validate(APS1EventSchema, data);
}

/** Validate APS-1 A2A context */
export function validateA2AContext(data: unknown) {
  return validate(APS1A2AContextSchema, data);
}

/** Validate APS-1 protocol configuration */
export function validateProtocolConfig(data: unknown) {
  return validate(APS1ProtocolConfigSchema, data);
}
