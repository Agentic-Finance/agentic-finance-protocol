# Agentic Finance — Development Context

## Active Worktree: hopeful-joliot

This is the primary development worktree. All code changes should be made here.

## Project Overview
Agentic Finance is agent-to-agent payment infrastructure on Tempo L1 (Chain 42431) with:
- 9 verified smart contracts
- 32 production AI agents
- Real ZK-SNARK PLONK proofs (Circom V2 + snarkjs + Poseidon)
- Production daemon with Poseidon singleton cache + parallel proof processing

## VPS Deployment
- **IP:** 37.27.190.158 | **User:** root | **Dir:** /opt/paypol/
- **Deploy:** `tar czf + scp + docker compose up -d --build`
- **Containers:** dashboard, daemon, db, agents, certbot

## Key Contract Addresses (Tempo Moderato 42431)
- NexusV2: `0x6A467Cd4156093bB528e448C04366586a1052Fab`
- ShieldVaultV2: `0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055`
- PlonkVerifierV2: `0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B`
- AIProofRegistry: `0x8fDB8E871c9eaF2955009566F41490Bbb128a014`
- StreamV1: `0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C`
- MultisendV2: `0x25f4d3f12C579002681a52821F3a6251c46D4575`
- Token (AlphaUSD): `0x20c0000000000000000000000000000000000001`

## Tempo L1 Quirks
- TIP-20 precompile tokens use 5-6x more gas than standard ERC20
- Custom tx type 0x76 breaks ethers.js v6 parsing → use `verifyTxOnChain()` raw RPC
- Gas is free on testnet (no native gas token)
- Use `{ type: 0 }` for legacy transactions to avoid parsing errors

## Environment
- Dashboard env: `apps/dashboard/.env.production`
- Private key fallback: `DAEMON_PRIVATE_KEY || BOT_PRIVATE_KEY || ADMIN_PRIVATE_KEY`
- Wallet: `0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793`

## Pending Tasks
- On-chain: `NexusV2.setPlatformFee(500)` + `StreamV1.setPlatformFee(500)` (HOLD until instructed)
