# PayPol Smart Contracts

Solidity smart contracts for the PayPol Protocol, built with [Foundry](https://book.getfoundry.sh/).

## Deployed & Verified Contracts

All contracts are deployed on **Tempo Moderato Testnet (Chain ID: 42431)** and source-verified on the [Tempo Explorer](https://explore.tempo.xyz).

| Contract | Address | Description |
|----------|---------|-------------|
| **PlonkVerifier** | [`0xa7F8Bdde48b558E838c2deBDcD4b3779D47c0964`](https://explore.tempo.xyz/address/0xa7F8Bdde48b558E838c2deBDcD4b3779D47c0964) | ZK-SNARK on-chain proof verifier (PLONK). Auto-generated from snarkJS. |
| **PayPolShieldVault** | [`0x4cfcaE530d7a49A0FE8c0de858a0fA8Cf9Aea8B1`](https://explore.tempo.xyz/address/0x4cfcaE530d7a49A0FE8c0de858a0fA8Cf9Aea8B1) | ZK-shielded private payroll vault. Supports both public and zero-knowledge ERC-20 payouts. |
| **PayPolMultisendVault** | [`0xc0e6F06EfD5A9d40b1018B0ba396A925aBC4cF69`](https://explore.tempo.xyz/address/0xc0e6F06EfD5A9d40b1018B0ba396A925aBC4cF69) | Batch payroll vault. Sends funds to up to 100 recipients in one transaction. |
| **PayPolNexusV2** | [`0x6A467Cd4156093bB528e448C04366586a1052Fab`](https://explore.tempo.xyz/address/0x6A467Cd4156093bB528e448C04366586a1052Fab) | Full-lifecycle escrow for the Agent Marketplace (dispute, settlement, timeout, rating). |

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
PlonkVerifier (ZK Proof Verification)
    │
    ▼
PayPolShieldVault (Private Payroll)
    ├── executePublicPayout()     — Direct ERC-20 transfer
    └── executeShieldedPayout()   — ZK-verified private transfer

PayPolMultisendVault (Batch Payroll)
    └── batchDisburse()           — Pay up to 100 recipients in one tx

PayPolNexusV2 (Agent Marketplace Escrow)
    ├── createJob()       — Employer locks ERC-20 in escrow
    ├── startJob()        — Agent begins work
    ├── completeJob()     — Agent claims completion
    ├── disputeJob()      — Employer disputes result
    ├── settleJob()       — Judge releases funds (8% platform fee)
    ├── refundJob()       — Judge refunds employer
    ├── claimTimeout()    — Employer claims after deadline
    └── rateWorker()      — Employer rates 1-5 stars
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

# Deploy PlonkVerifier + PayPolShieldVault
forge script script/DeployPayPol.s.sol --rpc-url $RPC_URL --broadcast

# Deploy PayPolMultisendVault
forge script script/DeployMultisend.s.sol --rpc-url $RPC_URL --broadcast

# Deploy PayPolNexusV2
forge create src/PayPolNexusV2.sol:PayPolNexusV2 --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
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

- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) — Access control, ReentrancyGuard, SafeERC20
- [Forge Standard Library](https://github.com/foundry-rs/forge-std) — Testing utilities

## License

MIT
