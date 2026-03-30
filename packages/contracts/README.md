# @agtfi/contracts

Smart contracts powering the Agentic Finance Protocol — trust infrastructure for autonomous AI commerce on Tempo L1. Built with [Foundry](https://book.getfoundry.sh/).

## Architecture

```
                        ┌─────────────────────┐
                        │   PlonkVerifierV2    │
                        │  (ZK Proof Engine)   │
                        └──────────┬──────────┘
                                   │ verifyProof()
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
          ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
          │ ShieldVaultV2│  │AIProofRegistry│  │ComplianceRegistry│
          │  (Private    │  │  (Verifiable  │  │  (ZK Compliance  │
          │   Payments)  │  │   AI Proofs)  │  │   Verification)  │
          └──────┬───────┘  └──────────────┘  └──────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐ ┌──────────┐ ┌──────────┐
│NexusV2 │ │MultisendV2│ │ StreamV1 │
│(Escrow)│ │ (Batch)   │ │(Streams) │
└────┬───┘ └──────────┘ └──────────┘
     │
     ▼
┌────────────────────────┐
│  ReputationRegistry    │
│  SecurityDepositVault  │
│  AgentDiscoveryRegistry│
└────────────────────────┘
```

### Core Contracts

| Contract | Purpose |
|----------|---------|
| **PayPolNexusV2** | Full-lifecycle escrow for agent jobs: create, start, complete, dispute, settle, rate. 5% platform fee. |
| **PayPolShieldVaultV2** | ZK-shielded payments using Poseidon 4-input commitments and nullifier anti-double-spend pattern. |
| **PlonkVerifierV2** | On-chain PLONK proof verifier, auto-generated from snarkjs trusted setup. |
| **PayPolStreamV1** | Milestone-based streaming escrow with timeout protection for long-running agent jobs. |
| **PayPolMultisendVaultV2** | Gas-optimized batch payments, up to 100 recipients per transaction. |
| **AIProofRegistry** | Commit-reveal scheme for verifiable AI execution. Pre-hash commit, post-verify, slashing. |
| **ComplianceRegistry** | ZK-verified compliance status. Agents prove compliance without revealing identity. |
| **ReputationRegistry** | On-chain reputation scoring from job completions, disputes, and peer reviews. |
| **SecurityDepositVault** | Tiered deposit system (Bronze/Silver/Gold) with fee discounts and slashing. |

## Deployed Addresses

### Tempo Moderato Testnet (Chain 42431)

| Contract | Address | Verified |
|----------|---------|----------|
| PlonkVerifierV2 | `0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B` | Yes |
| ShieldVaultV2 | `0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055` | Yes |
| NexusV2 | `0x6A467Cd4156093bB528e448C04366586a1052Fab` | Yes |
| MultisendV2 | `0x25f4d3f12C579002681a52821F3a6251c46D4575` | Yes |
| AIProofRegistry | `0x8fDB8E871c9eaF2955009566F41490Bbb128a014` | Yes |
| StreamV1 | `0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C` | Yes |
| ReputationRegistry | `0x9332c1B2bb94C96DA2D729423f345c76dB3494D0` | Yes |
| SecurityDepositVault | `0x8C1d4da4034FFEB5E3809aa017785cB70B081A80` | Yes |
| AlphaUSD (TIP-20) | `0x20c0000000000000000000000000000000000001` | Precompile |

### Network Configuration

| Property | Value |
|----------|-------|
| Network | Tempo Moderato Testnet |
| Chain ID | `42431` |
| RPC URL | `https://rpc.moderato.tempo.xyz` |
| Explorer | `https://explore.tempo.xyz` |
| Compiler | Solidity 0.8.20 |
| EVM Version | Paris |
| Optimizer | Enabled (200 runs) |

## Prerequisites

- [Foundry](https://getfoundry.sh/) (forge, cast, anvil)

## Build

```bash
forge build
```

Build with contract size report:

```bash
forge build --sizes
```

## Test

```bash
# Run all tests with verbose output
forge test -vvv

# Run a specific test
forge test --match-test testCreateJob -vvv

# Generate gas report
forge test --gas-report

# Run with CI profile
FOUNDRY_PROFILE=ci forge test
```

## Deploy

```bash
source .env

# Deploy core contracts
forge script script/DeployAgenticFinance.s.sol --rpc-url $RPC_URL --broadcast

# Deploy MultisendV2
forge script script/DeployMultisend.s.sol --rpc-url $RPC_URL --broadcast

# Deploy individual contract
forge create src/PayPolNexusV2.sol:PayPolNexusV2 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## Verify

```bash
# Verify on Tempo Explorer (Sourcify)
forge verify-contract \
  --verifier sourcify \
  --verifier-url https://contracts.tempo.xyz \
  --chain 42431 \
  <CONTRACT_ADDRESS> \
  src/MyContract.sol:MyContract

# With constructor args
forge verify-contract \
  --verifier sourcify \
  --verifier-url https://contracts.tempo.xyz \
  --chain 42431 \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0xARG1 0xARG2) \
  <CONTRACT_ADDRESS> \
  src/MyContract.sol:MyContract
```

## Gas Optimization Notes

- **TIP-20 precompile tokens** (like AlphaUSD at `0x20c...0001`) consume 5-6x more gas than standard ERC20 transfers. Budget gas estimates accordingly.
- **Custom tx type `0x76`** on Tempo breaks ethers.js v6 transaction parsing. Use raw RPC `eth_getTransactionReceipt` calls for verification.
- **Legacy transactions** (`{ type: 0 }`) are recommended to avoid tx type parsing issues.
- Gas is free on Tempo Moderato testnet (no native gas token).
- MultisendV2 is optimized for batch operations up to 100 recipients with minimal per-transfer overhead.

## Security

- All contracts use OpenZeppelin `ReentrancyGuard` for reentrancy protection
- `SafeERC20` used for all token transfers
- `Ownable` access control on administrative functions
- ShieldVaultV2 uses nullifier pattern to prevent double-spend of ZK proofs
- NexusV2 enforces strict state machine transitions for job lifecycle

### Audit Status

Contracts are pending formal third-party security audit. Report vulnerabilities via [GitHub Issues](https://github.com/Agentic-Finance/agentic-finance-protocol/issues).

## Dependencies

- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) -- Access control, ReentrancyGuard, SafeERC20
- [Forge Standard Library](https://github.com/foundry-rs/forge-std) -- Testing utilities

## License

MIT
