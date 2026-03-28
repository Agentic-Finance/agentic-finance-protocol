# @agtfi/circuits

Zero-knowledge circuits for the Agentic Finance Protocol. Built with Circom V2, using PLONK proofs via snarkjs with Poseidon hashing.

## Circuit Architecture

```
                    ┌──────────────────────┐
                    │   Powers of Tau       │
                    │  (Trusted Setup)      │
                    │  pot14 / pot15 / pot16│
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                     ▼
 ┌─────────────────┐ ┌─────────────────┐  ┌──────────────────┐
 │  agtfi_shield   │ │agtfi_compliance │  │ agtfi_reputation │
 │  agtfi_shield_v2│ │                 │  │                  │
 │                 │ │  Prove policy   │  │  Prove reputation│
 │  Private payroll│ │  compliance     │  │  without reveal  │
 │  with nullifier │ │  without reveal │  │  exact scores    │
 │  anti-replay    │ │  identity       │  │                  │
 └────────┬────────┘ └────────┬────────┘  └────────┬─────────┘
          │                   │                     │
          │         ┌─────────┴─────────┐           │
          │         ▼                   ▼           │
          │  ┌──────────────┐  ┌──────────────┐    │
          │  │agtfi_proof   │  │  On-chain    │    │
          │  │  _chain      │  │  Verifier    │    │
          │  │              │  │  Contracts   │◄───┘
          │  │ Chain proofs │  │              │
          │  │ together     │  │ PlonkVerifier│
          └──┤              │  │ Compliance   │
             │              │  │ Reputation   │
             └──────────────┘  └──────────────┘
```

## Circuits

### agtfi_shield / agtfi_shield_v2

Private payment circuit using Poseidon commitments and nullifier pattern.

- **Purpose:** Enable ZK-shielded payroll payments where the amount and recipient are hidden from on-chain observers
- **Inputs (private):** recipient address, amount, salt, nullifier secret
- **Inputs (public):** commitment hash, nullifier hash, root
- **Security:** Nullifier prevents double-spend; Poseidon 4-input commitment binds all payment parameters
- **V2 improvements:** Additional range checks, optimized Poseidon configuration

### agtfi_compliance

Prove that an agent meets compliance requirements without revealing identity.

- **Purpose:** Agents prove they satisfy policy constraints (KYC tier, jurisdiction, etc.) without disclosing personal data
- **Inputs (private):** agent identity, compliance credentials, policy parameters
- **Inputs (public):** commitment, compliance status flag
- **Security:** Zero-knowledge property ensures the verifier learns nothing beyond the boolean compliance result

### agtfi_reputation

Prove reputation meets a threshold without revealing exact scores.

- **Purpose:** Agents prove they have sufficient reputation (e.g., "reputation > 80") without revealing their precise score, transaction count, or volume
- **Inputs (private):** reputation score, transaction count, volume, commitment secret
- **Inputs (public):** commitment, threshold, meets_requirements flag
- **Security:** Exact reputation metrics remain private; only the threshold comparison result is public

### agtfi_proof_chain

Chain multiple proofs together for complex multi-step verification.

- **Purpose:** Link compliance proof, reputation proof, and payment proof into a single verifiable chain, ensuring all conditions were met by the same entity
- **Inputs (private):** individual proof witnesses, linking secrets
- **Inputs (public):** chained commitment, individual proof hashes
- **Security:** Binding property ensures the same entity produced all linked proofs

## Constraint Counts and Proof Times

| Circuit | Constraints | Powers of Tau | Proof Time (est.) |
|---------|------------|---------------|-------------------|
| agtfi_compliance | ~2,000 | pot14 (16K) | ~1s |
| agtfi_reputation | ~3,500 | pot14 (16K) | ~1.5s |
| agtfi_proof_chain | ~5,000 | pot15 (32K) | ~2s |
| agtfi_shield | ~8,000 | pot15 (32K) | ~3s |
| agtfi_shield_v2 | ~12,000 | pot16 (64K) | ~4s |

Proof times measured on a standard x86_64 machine. Production daemon uses Poseidon singleton cache and parallel proof processing for throughput.

## Prerequisites

- [Circom V2](https://docs.circom.io/getting-started/installation/)
- [snarkjs](https://github.com/iden3/snarkjs) (`npm install -g snarkjs`)
- Node.js 20+

## Compile a Circuit

```bash
# Compile to R1CS + WASM + symbol file
circom agtfi_compliance.circom --r1cs --wasm --sym -l lib

# Check constraint count
snarkjs r1cs info agtfi_compliance.r1cs
```

## Trusted Setup

The repository includes pre-computed Powers of Tau ceremony files:

- `pot14_final.ptau` -- supports up to 16,384 constraints
- `pot15_final.ptau` -- supports up to 32,768 constraints
- `pot16_final.ptau` -- supports up to 65,536 constraints

Generate a proving key:

```bash
# Phase 2: circuit-specific setup
snarkjs groth16 setup agtfi_compliance.r1cs pot14_final.ptau agtfi_compliance_0000.zkey

# Contribute to the ceremony
snarkjs zkey contribute agtfi_compliance_0000.zkey agtfi_compliance_final.zkey \
  --name="Agentic Finance Contribution" -v

# Export verification key
snarkjs zkey export verificationkey agtfi_compliance_final.zkey verification_key.json
```

## Generate and Verify a Proof

```bash
# Generate witness
node agtfi_compliance_js/generate_witness.js agtfi_compliance_js/agtfi_compliance.wasm input.json witness.wtns

# Generate proof
snarkjs groth16 prove agtfi_compliance_final.zkey witness.wtns proof.json public.json

# Verify off-chain
snarkjs groth16 verify verification_key.json public.json proof.json
```

## Export Solidity Verifier

```bash
# Generate on-chain verifier contract
snarkjs zkey export solidityverifier agtfi_compliance_final.zkey ComplianceVerifier.sol
```

The generated verifier contracts are deployed alongside the protocol contracts. See `packages/contracts` for deployed addresses.

## Run Tests

```bash
# Test all circuits
node test_compliance.mjs
node test_reputation.mjs
node test_proof_chain.mjs
```

Each test generates a proof with known-good inputs, verifies it succeeds, and optionally tests that invalid inputs produce verification failures.

## Security Properties

1. **Soundness:** No adversary can produce a valid proof for a false statement (e.g., proving compliance when not compliant) without breaking the discrete log assumption
2. **Completeness:** Any agent with valid credentials can always produce a valid proof
3. **Zero-knowledge:** The verifier (and on-chain observers) learn nothing beyond the public outputs (boolean flags and commitments)
4. **Nullifier uniqueness:** Each shielded payment can only be claimed once, preventing double-spend

## File Structure

```
packages/circuits/
  agtfi_compliance.circom        # Compliance circuit source
  agtfi_reputation.circom        # Reputation circuit source
  agtfi_proof_chain.circom       # Proof chain circuit source
  agtfi_shield.circom            # Shield V1 circuit source
  agtfi_shield_v2.circom         # Shield V2 circuit source
  *_final.zkey                   # Proving keys (per circuit)
  *_js/                          # WASM witness generators
  *.r1cs                         # Compiled R1CS constraints
  *.sym                          # Debug symbol files
  pot{14,15,16}_final.ptau       # Powers of Tau ceremony files
  test_*.mjs                     # Circuit test scripts
  lib/                           # Circomlib dependencies
```

## License

MIT
