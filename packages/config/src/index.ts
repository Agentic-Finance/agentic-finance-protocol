// ============================================================================
// @agtfi/config — Shared chain configs, contract addresses, and token metadata
// ============================================================================

// ---------------------------------------------------------------------------
// Chain Configurations
// ---------------------------------------------------------------------------

/** All supported blockchain configurations indexed by chain ID */
export const CHAINS: Record<number, {
  chainId: number;
  name: string;
  shortName: string;
  rpcUrls: string[];
  wsUrls?: string[];
  explorerUrl: string;
  explorerApiUrl?: string;
  nativeToken: string;
  nativeDecimals: number;
  blockTime: number;
  freeGas: boolean;
  isTestnet: boolean;
  quirks?: Array<{ id: string; description: string; workaround: string }>;
}> = {
  // Tempo L1 — Primary deployment chain
  42431: {
    chainId: 42431,
    name: 'Tempo Moderato',
    shortName: 'tempo',
    rpcUrls: ['https://moderato-rpc.tempo.xyz'],
    wsUrls: ['wss://moderato-ws.tempo.xyz'],
    explorerUrl: 'https://moderato.tempo.xyz',
    nativeToken: 'TEMPO',
    nativeDecimals: 18,
    blockTime: 2,
    freeGas: true,
    isTestnet: true,
    quirks: [
      {
        id: 'tip20-gas',
        description: 'TIP-20 precompile tokens use 5-6x more gas than standard ERC20',
        workaround: 'Set higher gas limits for TIP-20 token transfers',
      },
      {
        id: 'tx-type-0x76',
        description: 'Custom tx type 0x76 breaks ethers.js v6 parsing',
        workaround: 'Use verifyTxOnChain() with raw RPC instead of ethers tx parsing',
      },
      {
        id: 'legacy-tx-only',
        description: 'EIP-1559 transaction parsing may fail',
        workaround: 'Always use { type: 0 } for legacy transactions',
      },
    ],
  },

  // Ethereum Mainnet
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    shortName: 'eth',
    rpcUrls: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'],
    explorerUrl: 'https://etherscan.io',
    explorerApiUrl: 'https://api.etherscan.io/api',
    nativeToken: 'ETH',
    nativeDecimals: 18,
    blockTime: 12,
    freeGas: false,
    isTestnet: false,
  },

  // Polygon PoS
  137: {
    chainId: 137,
    name: 'Polygon PoS',
    shortName: 'polygon',
    rpcUrls: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
    explorerUrl: 'https://polygonscan.com',
    explorerApiUrl: 'https://api.polygonscan.com/api',
    nativeToken: 'MATIC',
    nativeDecimals: 18,
    blockTime: 2,
    freeGas: false,
    isTestnet: false,
  },

  // Base
  8453: {
    chainId: 8453,
    name: 'Base',
    shortName: 'base',
    rpcUrls: ['https://mainnet.base.org', 'https://rpc.ankr.com/base'],
    explorerUrl: 'https://basescan.org',
    explorerApiUrl: 'https://api.basescan.org/api',
    nativeToken: 'ETH',
    nativeDecimals: 18,
    blockTime: 2,
    freeGas: false,
    isTestnet: false,
  },

  // Arbitrum One
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    shortName: 'arb',
    rpcUrls: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
    explorerUrl: 'https://arbiscan.io',
    explorerApiUrl: 'https://api.arbiscan.io/api',
    nativeToken: 'ETH',
    nativeDecimals: 18,
    blockTime: 0.25,
    freeGas: false,
    isTestnet: false,
  },

  // Optimism
  10: {
    chainId: 10,
    name: 'Optimism',
    shortName: 'op',
    rpcUrls: ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
    explorerUrl: 'https://optimistic.etherscan.io',
    explorerApiUrl: 'https://api-optimistic.etherscan.io/api',
    nativeToken: 'ETH',
    nativeDecimals: 18,
    blockTime: 2,
    freeGas: false,
    isTestnet: false,
  },
};

// ---------------------------------------------------------------------------
// Contract Addresses — Deployed on Tempo Moderato (42431)
// ---------------------------------------------------------------------------

/** All deployed contract addresses indexed by chain ID */
export const CONTRACTS: Record<number, {
  nexusV2?: string;
  shieldVaultV2?: string;
  plonkVerifierV2?: string;
  aiProofRegistry?: string;
  streamV1?: string;
  multisendV2?: string;
  complianceVerifier?: string;
  complianceRegistry?: string;
  reputationVerifier?: string;
  reputationRegistry?: string;
  agentDiscoveryRegistry?: string;
  proofChainSettlement?: string;
}> = {
  42431: {
    nexusV2: '0x6A467Cd4156093bB528e448C04366586a1052Fab',
    shieldVaultV2: '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055',
    plonkVerifierV2: '0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B',
    aiProofRegistry: '0x8fDB8E871c9eaF2955009566F41490Bbb128a014',
    streamV1: '0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C',
    multisendV2: '0x25f4d3f12C579002681a52821F3a6251c46D4575',
    complianceVerifier: '0x4896f5797b59CC8EE5e942eBd0Ed6772af9131fF',
    complianceRegistry: '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14',
    reputationVerifier: '0x2e2C368afB20810AadA9e6BB2Fb51002614F7Da4',
    reputationRegistry: '0xF3296984cb8785Ab236322658c13051801E58875',
    agentDiscoveryRegistry: '0x74D79e0AEd3CF9aE9A325558940bB1c8fB8CeA47',
    proofChainSettlement: '0x0ED1D5cFDe33f05Ce377cB6e9a0A23570255060D',
  },
};

// ---------------------------------------------------------------------------
// Token Metadata
// ---------------------------------------------------------------------------

/** Known token addresses indexed by chain ID, then by symbol */
export const TOKENS: Record<number, Record<string, {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isTip20?: boolean;
}>> = {
  42431: {
    AlphaUSD: {
      address: '0x20c0000000000000000000000000000000000001',
      symbol: 'AlphaUSD',
      name: 'Alpha USD',
      decimals: 18,
      isTip20: true,
    },
    pathUSD: {
      address: '0x20c0000000000000000000000000000000000002',
      symbol: 'pathUSD',
      name: 'Path USD',
      decimals: 18,
      isTip20: true,
    },
    BetaUSD: {
      address: '0x20c0000000000000000000000000000000000003',
      symbol: 'BetaUSD',
      name: 'Beta USD',
      decimals: 18,
      isTip20: true,
    },
    ThetaUSD: {
      address: '0x20c0000000000000000000000000000000000004',
      symbol: 'ThetaUSD',
      name: 'Theta USD',
      decimals: 18,
      isTip20: true,
    },
  },
};

// ---------------------------------------------------------------------------
// Circuit Configuration
// ---------------------------------------------------------------------------

/** ZK circuit configurations for proof generation */
export const CIRCUIT_CONFIG: Record<string, {
  name: string;
  constraintCount: number;
  expectedProofTimeMs: number;
  publicInputCount: number;
  privateInputCount: number;
  wasmPath: string;
  zkeyPath: string;
  vkeyPath: string;
}> = {
  compliance: {
    name: 'compliance',
    constraintCount: 12500,
    expectedProofTimeMs: 3500,
    publicInputCount: 4,
    privateInputCount: 6,
    wasmPath: 'circuits/compliance/compliance.wasm',
    zkeyPath: 'circuits/compliance/compliance_final.zkey',
    vkeyPath: 'circuits/compliance/verification_key.json',
  },
  reputation: {
    name: 'reputation',
    constraintCount: 8200,
    expectedProofTimeMs: 2200,
    publicInputCount: 3,
    privateInputCount: 5,
    wasmPath: 'circuits/reputation/reputation.wasm',
    zkeyPath: 'circuits/reputation/reputation_final.zkey',
    vkeyPath: 'circuits/reputation/verification_key.json',
  },
  payment: {
    name: 'payment',
    constraintCount: 15000,
    expectedProofTimeMs: 4500,
    publicInputCount: 5,
    privateInputCount: 8,
    wasmPath: 'circuits/payment/payment.wasm',
    zkeyPath: 'circuits/payment/payment_final.zkey',
    vkeyPath: 'circuits/payment/verification_key.json',
  },
  identity: {
    name: 'identity',
    constraintCount: 20000,
    expectedProofTimeMs: 6000,
    publicInputCount: 2,
    privateInputCount: 10,
    wasmPath: 'circuits/identity/identity.wasm',
    zkeyPath: 'circuits/identity/identity_final.zkey',
    vkeyPath: 'circuits/identity/verification_key.json',
  },
};

// ---------------------------------------------------------------------------
// Protocol Configuration
// ---------------------------------------------------------------------------

/** Global protocol configuration constants */
export const PROTOCOL_CONFIG = {
  /** Protocol version */
  version: '2.0.0',
  /** Platform fee in basis points (500 = 5%) */
  platformFeeBps: 500,
  /** Maximum single transfer amount (1M tokens) */
  maxTransferAmount: '1000000000000000000000000',
  /** Minimum single transfer amount (0.001 tokens) */
  minTransferAmount: '1000000000000000',
  /** Maximum recipients in a single multisend call */
  maxMultisendRecipients: 100,
  /** Maximum stream duration: 365 days in seconds */
  maxStreamDuration: 31_536_000,
  /** Proof validity duration: 24 hours in seconds */
  proofExpirySeconds: 86_400,
  /** Number of block confirmations to wait */
  confirmationBlocks: 1,
  /** Default gas multiplier for TIP-20 operations */
  tip20GasMultiplier: 6,
} as const;

// ---------------------------------------------------------------------------
// Helper: get chain config by short name
// ---------------------------------------------------------------------------

/**
 * Look up a chain config by its short name (e.g., "tempo", "eth", "arb").
 * Returns undefined if not found.
 */
export function getChainByName(shortName: string) {
  return Object.values(CHAINS).find((c) => c.shortName === shortName);
}

/**
 * Look up contract addresses for a given chain ID.
 * Returns undefined if no contracts are deployed on that chain.
 */
export function getContracts(chainId: number) {
  return CONTRACTS[chainId];
}

/**
 * Look up tokens for a given chain ID.
 * Returns an empty object if no tokens are known for that chain.
 */
export function getTokens(chainId: number) {
  return TOKENS[chainId] ?? {};
}
