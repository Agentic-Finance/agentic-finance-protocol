# Agentic Finance Smart Contracts

Solidity smart contracts for the Agentic Finance, built with [Foundry](https://book.getfoundry.sh/).

## Deployed & Verified Contracts

All contracts are deployed on **Tempo Moderato Testnet (Chain ID: 42431)** and source-verified on the [Tempo Explorer](https://explore.tempo.xyz).

| Contract | Address | Description |
|----------|---------|-------------|
| **PlonkVerifierV2** | [`0x9FB90e9...`](https://explore.tempo.xyz/address/0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B) | ZK-SNARK on-chain PLONK proof verifier. Auto-generated from snarkJS trusted setup. |
| **AgtFiShieldVaultV2** | [`0x3B4b479...`](https://explore.tempo.xyz/address/0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055) | ZK-shielded payroll vault with Poseidon 4-input commitments and nullifier anti-double-spend. |
| **AgtFiNexusV2** | [`0x6A467Cd...`](https://explore.tempo.xyz/address/0x6A467Cd4156093bB528e448C04366586a1052Fab) | Full-lifecycle escrow: creation, execution, dispute, settlement, rating. Platform fee 5%. |
| **Agentic FinanceMultisendV2** | [`0x25f4d3f...`](https://explore.tempo.xyz/address/0x25f4d3f12C579002681a52821F3a6251c46D4575) | Gas-optimized batch payments. Up to 100 recipients per TX with per-transfer events. |
| **AIProofRegistry** | [`0x8fDB8E8...`](https://explore.tempo.xyz/address/0x8fDB8E871c9eaF2955009566F41490Bbb128a014) | AI proof commitment & verification. Pre-hash commit, post-verify, slashing. |
| **Agentic FinanceStreamV1** | [`0x4fE37c4...`](https://explore.tempo.xyz/address/0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C) | Milestone-based streaming escrow with timeout protection. |
| **ReputationRegistry** | [`0x9332c1B...`](https://explore.tempo.xyz/address/0x9332c1B2bb94C96DA2D729423f345c76dB3494D0) | On-chain reputation scoring from job completions, disputes, and peer reviews. |
| **SecurityDepositVault** | [`0x8C1d4da...`](https://explore.tempo.xyz/address/0x8C1d4da4034FFEB5E3809aa017785cB70B081A80) | Tiered deposit system (Bronze/Silver/Gold) with fee discounts and slashing. |
| **SimpleERC20** | - | Test stablecoin (AlphaUSD) for development. |

> **Legacy V1 Contracts** (still operational): PlonkVerifier V1 (`0xa7F8Bd...`), AgtFiShieldVault V1 (`0x4cfcaE...`), Agentic FinanceMultisendVault V1 (`0xc0e6F0...`)

## Network Configuration

| Property | Value |
|----------|-------|
| **Network** | Tempo Moderato Testnet |
| **Chain ID** | `42431` |
| **RPC URL** | `https://rpc.moderato.tempo.xyz` |
| **Explorer** | `https://explore.tempo.xyz` |
| **Compiler** | Solidity 0.8.20 |
| **EVM Version** | Paris |
| **Optimizer** | Enabled (200 runs) |

## Contract Architecture

```
PlonkVerifierV2 (ZK Proof Verification — PLONK)
    │
    ▼
AgtFiShieldVaultV2 (Private Payroll — Nullifier Pattern)
    ├── deposit()                  - Lock tokens with Poseidon commitment
    ├── executeShieldedPayout()    - ZK-verified private transfer (PLONK proof)
    └── isNullifierUsed()          - Anti-double-spend check

Agentic FinanceMultisendV2 (Batch Payroll)
    └── batchDisburse()            - Pay up to 100 recipients in one tx

AgtFiNexusV2 (Agent Marketplace Escrow)
    ├── createJob()       - Employer locks ERC-20 in escrow
    ├── startJob()        - Agent begins work
    ├── completeJob()     - Agent claims completion
    ├── disputeJob()      - Employer disputes result
    ├── settleJob()       - Judge releases funds (5% platform fee)
    ├── refundJob()       - Judge refunds employer
    ├── claimTimeout()    - Employer claims after deadline
    └── rateWorker()      - Employer rates 1-5 stars

AIProofRegistry (Verifiable AI Proofs)
    ├── commit()          - Pre-hash AI plan before execution
    ├── verify()          - Post-verify AI result hash
    └── slash()           - Penalize mismatched results

Agentic FinanceStreamV1 (Milestone Streaming)
    ├── createStream()    - Create milestone-based escrow
    ├── submitMilestone() - Worker submits proof
    └── approveMilestone()- Employer approves + releases funds
```

## Getting Started

### Prerequisites

- [Foundry](https://getfoundry.sh/) (forge, cast, anvil)

### Build

```bash
forge build
```

### Test

```bash
forge test -vvv
```

### Deploy

```bash
# Load environment variables
source .env

# Deploy PlonkVerifier + AgtFiShieldVault
forge script script/DeployAgentic Finance.s.sol --rpc-url $RPC_URL --broadcast

# Deploy Agentic FinanceMultisendVault
forge script script/DeployMultisend.s.sol --rpc-url $RPC_URL --broadcast

# Deploy AgtFiNexusV2
forge create src/AgtFiNexusV2.sol:AgtFiNexusV2 --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

### Verify on Tempo

```bash
# Verify a contract (no constructor args)
forge verify-contract \
  --verifier sourcify \
  --verifier-url https://contracts.tempo.xyz \
  --chain 42431 \
  <CONTRACT_ADDRESS> \
  src/MyContract.sol:MyContract

# Verify with constructor args
forge verify-contract \
  --verifier sourcify \
  --verifier-url https://contracts.tempo.xyz \
  --chain 42431 \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0xARG1 0xARG2) \
  <CONTRACT_ADDRESS> \
  src/MyContract.sol:MyContract
```

### Fund Testnet Wallet

Tempo has no native gas token. Gas fees are paid in TIP-20 stablecoins.

```bash
# Get testnet funds via faucet
cast rpc tempo_fundAddress <YOUR_WALLET_ADDRESS> --rpc-url https://rpc.moderato.tempo.xyz
```

## Dependencies

- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) - Access control, ReentrancyGuard, SafeERC20
- [Forge Standard Library](https://github.com/foundry-rs/forge-std) - Testing utilities

## License

MIT
