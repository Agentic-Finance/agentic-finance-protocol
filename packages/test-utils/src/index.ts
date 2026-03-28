// ============================================================================
// @agtfi/test-utils — Shared testing utilities, fixtures, and mocks
// ============================================================================

import { ethers } from 'ethers';

// ---------------------------------------------------------------------------
// Types (inline to avoid circular dependency with @agtfi/types)
// ---------------------------------------------------------------------------

interface MockAgent {
  id: string;
  name: string;
  description: string;
  walletAddress: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  reputationScore: number;
  tasksCompleted: number;
  supportedChains: number[];
  category: string;
  registeredAt: string;
}

interface MockProof {
  type: string;
  protocol: string;
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
  vkeyHash: string;
  circuitId: string;
  generatedAt: string;
  generationTimeMs: number;
}

interface MockTransactionReceipt {
  hash: string;
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  gasUsed: string;
  effectiveGasPrice: string;
  status: 0 | 1;
  contractAddress: string | null;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
    logIndex: number;
    blockNumber: number;
    transactionHash: string;
  }>;
  cumulativeGasUsed: string;
}

// ---------------------------------------------------------------------------
// Deterministic Test Wallets
// ---------------------------------------------------------------------------

/**
 * Deterministic test wallets derived from a known mnemonic.
 * NEVER use these in production — they are publicly known.
 */
const TEST_MNEMONIC = 'test test test test test test test test test test test junk';

/** Array of 10 deterministic test wallets with addresses and private keys */
export const FIXTURE_WALLETS = Array.from({ length: 10 }, (_, i) => {
  const path = `m/44'/60'/0'/0/${i}`;
  const wallet = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(TEST_MNEMONIC),
    path,
  );
  return {
    index: i,
    address: wallet.address,
    privateKey: wallet.privateKey,
    path,
  };
});

// ---------------------------------------------------------------------------
// Fixture Agents
// ---------------------------------------------------------------------------

/** Pre-configured test agents spanning different categories */
export const FIXTURE_AGENTS: MockAgent[] = [
  {
    id: 'agent-payment-001',
    name: 'PayBot Alpha',
    description: 'Handles payment routing and token transfers',
    walletAddress: FIXTURE_WALLETS[0].address,
    capabilities: ['payment', 'multisend'],
    status: 'active',
    reputationScore: 950,
    tasksCompleted: 1234,
    supportedChains: [42431, 1],
    category: 'payment',
    registeredAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'agent-escrow-002',
    name: 'EscrowGuard',
    description: 'Manages escrow deposits, releases, and disputes',
    walletAddress: FIXTURE_WALLETS[1].address,
    capabilities: ['escrow', 'compliance'],
    status: 'active',
    reputationScore: 880,
    tasksCompleted: 567,
    supportedChains: [42431],
    category: 'escrow',
    registeredAt: '2025-02-01T00:00:00Z',
  },
  {
    id: 'agent-proof-003',
    name: 'ZKProver',
    description: 'Generates and verifies ZK-SNARK proofs',
    walletAddress: FIXTURE_WALLETS[2].address,
    capabilities: ['proof-generation', 'proof-verification'],
    status: 'active',
    reputationScore: 990,
    tasksCompleted: 2345,
    supportedChains: [42431],
    category: 'proof',
    registeredAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'agent-stream-004',
    name: 'StreamFlow',
    description: 'Creates and manages streaming payment channels',
    walletAddress: FIXTURE_WALLETS[3].address,
    capabilities: ['streaming', 'payment'],
    status: 'active',
    reputationScore: 820,
    tasksCompleted: 321,
    supportedChains: [42431, 137],
    category: 'streaming',
    registeredAt: '2025-03-10T00:00:00Z',
  },
  {
    id: 'agent-analytics-005',
    name: 'InsightBot',
    description: 'Provides protocol analytics and monitoring',
    walletAddress: FIXTURE_WALLETS[4].address,
    capabilities: ['analytics', 'monitoring'],
    status: 'inactive',
    reputationScore: 750,
    tasksCompleted: 89,
    supportedChains: [42431, 1, 137, 8453],
    category: 'analytics',
    registeredAt: '2025-04-01T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Mock Factory Functions
// ---------------------------------------------------------------------------

/**
 * Create a mock wallet with a random private key.
 * Optionally connect to a provider for transaction signing.
 */
export function createMockWallet(provider?: ethers.Provider): {
  wallet: ethers.Wallet;
  address: string;
  privateKey: string;
} {
  const wallet = provider
    ? ethers.Wallet.createRandom(provider)
    : ethers.Wallet.createRandom();
  return {
    wallet,
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Create a mock agent with optional overrides.
 * Generates a random wallet if no address is provided.
 */
export function createMockAgent(overrides: Partial<MockAgent> = {}): MockAgent {
  const wallet = ethers.Wallet.createRandom();
  return {
    id: `agent-${Math.random().toString(36).slice(2, 10)}`,
    name: `TestAgent-${Math.random().toString(36).slice(2, 6)}`,
    description: 'A mock agent for testing purposes',
    walletAddress: wallet.address,
    capabilities: ['payment'],
    status: 'active',
    reputationScore: 800,
    tasksCompleted: 0,
    supportedChains: [42431],
    category: 'payment',
    registeredAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock ZK-SNARK proof for testing.
 * The proof data is syntactically valid but cryptographically meaningless.
 */
export function createMockProof(overrides: Partial<MockProof> = {}): MockProof {
  const randomField = () => ethers.hexlify(ethers.randomBytes(32));
  return {
    type: 'compliance',
    protocol: 'plonk',
    proof: {
      pi_a: [randomField(), randomField(), '1'],
      pi_b: [
        [randomField(), randomField()],
        [randomField(), randomField()],
        ['1', '0'],
      ],
      pi_c: [randomField(), randomField(), '1'],
      protocol: 'plonk',
      curve: 'bn128',
    },
    publicSignals: [randomField(), randomField(), randomField()],
    vkeyHash: ethers.keccak256(ethers.randomBytes(32)),
    circuitId: 'compliance',
    generatedAt: new Date().toISOString(),
    generationTimeMs: 3500,
    ...overrides,
  };
}

/**
 * Create a mock transaction receipt for testing.
 * Simulates a successful on-chain transaction.
 */
export function createMockTransaction(overrides: Partial<MockTransactionReceipt> = {}): MockTransactionReceipt {
  const txHash = ethers.hexlify(ethers.randomBytes(32));
  const blockHash = ethers.hexlify(ethers.randomBytes(32));
  return {
    hash: txHash,
    blockNumber: 1000000 + Math.floor(Math.random() * 100000),
    blockHash,
    transactionIndex: 0,
    from: FIXTURE_WALLETS[0].address,
    to: FIXTURE_WALLETS[1].address,
    gasUsed: '21000',
    effectiveGasPrice: '0',
    status: 1,
    contractAddress: null,
    logs: [],
    cumulativeGasUsed: '21000',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/**
 * Wait for a transaction to be confirmed on-chain.
 * Polls the provider until the receipt is available or the timeout is reached.
 *
 * @param provider - Ethers provider to query
 * @param txHash - Transaction hash to wait for
 * @param confirmations - Number of confirmations to wait for (default: 1)
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 30000)
 * @returns The transaction receipt
 * @throws Error if the transaction is not confirmed within the timeout
 */
export async function waitForTx(
  provider: ethers.Provider,
  txHash: string,
  confirmations = 1,
  timeoutMs = 30_000,
): Promise<ethers.TransactionReceipt> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt && (await receipt.confirmations()) >= confirmations) {
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Transaction ${txHash} not confirmed within ${timeoutMs}ms`);
}

/**
 * Deploy all protocol contracts to a local Anvil/Hardhat node.
 * Returns the deployed contract addresses.
 *
 * NOTE: This is a stub that returns mock addresses. In a real setup,
 * it would compile and deploy Solidity contracts via ethers ContractFactory.
 *
 * @param provider - Provider connected to local Anvil node
 * @param deployer - Wallet that will deploy the contracts
 * @returns Object containing all deployed contract addresses
 */
export async function deployTestContracts(
  provider: ethers.Provider,
  deployer: ethers.Wallet,
): Promise<Record<string, string>> {
  // In a real implementation, this would compile and deploy contracts.
  // For now, return deterministic addresses based on deployer nonce.
  const connectedDeployer = deployer.connect(provider);
  const nonce = await connectedDeployer.getNonce();

  const contractNames = [
    'NexusV2',
    'ShieldVaultV2',
    'PlonkVerifierV2',
    'AIProofRegistry',
    'StreamV1',
    'MultisendV2',
    'ComplianceVerifier',
    'ComplianceRegistry',
    'ReputationVerifier',
    'ReputationRegistry',
    'AgentDiscoveryRegistry',
    'ProofChainSettlement',
  ];

  const addresses: Record<string, string> = {};
  for (let i = 0; i < contractNames.length; i++) {
    // Compute the deterministic address based on deployer + nonce
    addresses[contractNames[i]] = ethers.getCreateAddress({
      from: connectedDeployer.address,
      nonce: nonce + i,
    });
  }

  return addresses;
}
