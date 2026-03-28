# Engineering Guidelines

This document defines the development standards and practices for the PayPol Protocol.

## Code Style

### TypeScript

- **Strict mode:** All packages must use `"strict": true` in `tsconfig.json`
- **No `any`:** Avoid `any` types. Use `unknown` with type guards when the type is genuinely unknown
- **Explicit return types:** All exported functions must have explicit return type annotations
- **Imports:** Use named imports; avoid default exports where possible
- **Naming:**
  - `camelCase` for variables and functions
  - `PascalCase` for types, interfaces, classes, and components
  - `UPPER_SNAKE_CASE` for constants and environment variables
  - `kebab-case` for file and directory names
- **Formatting:** Prettier with project defaults (run `pnpm prettier --write`)
- **Linting:** ESLint with project config (run `pnpm lint`)

### Solidity

- **Version:** Solidity `^0.8.20`
- **Formatter:** `forge fmt`
- **Naming:**
  - `PascalCase` for contracts and interfaces
  - `camelCase` for functions and variables
  - `UPPER_SNAKE_CASE` for constants
  - Prefix interfaces with `I` (e.g., `INexusV2`)
  - Prefix internal/private functions with `_`
- **NatSpec:** All public and external functions must have NatSpec documentation (`@notice`, `@param`, `@return`)
- **Custom errors:** Use custom errors instead of `require` strings for gas efficiency
- **Visibility:** Always specify visibility explicitly; prefer `external` over `public` for functions not called internally

### Circom

- **Version:** Circom V2
- **Template naming:** `PascalCase` (e.g., `ComplianceVerifier`)
- **Signal naming:** `camelCase` with descriptive names
- **Comments:** Document constraint counts and security properties for each template
- **Library:** Use `circomlib` for standard components (Poseidon, comparators, etc.)

## Testing

### Requirements

- **Unit tests** are required for all new functionality
- **Integration tests** are required for cross-contract interactions and SDK flows
- **ZK circuit tests** must verify both valid and invalid proof generation
- **Coverage target:** Aim for 80%+ line coverage on contracts and SDK

### Contracts (Foundry)

```bash
# Run all tests
forge test -vvv

# Run specific test
forge test --match-test testCreateJob -vvv

# Gas report
forge test --gas-report
```

### SDK / MCP Server / CLI

```bash
# Run tests
pnpm test

# Typecheck
pnpm typecheck
```

### ZK Circuits

```bash
# Test proof generation and verification
node test_compliance.mjs
node test_reputation.mjs
node test_proof_chain.mjs
```

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons, etc. |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `build` | Build system or external dependency changes |
| `ci` | CI configuration changes |
| `chore` | Other changes that don't modify src or test files |

### Scopes

| Scope | Package |
|-------|---------|
| `contracts` | `packages/contracts` |
| `sdk` | `packages/sdk` |
| `circuits` | `packages/circuits` |
| `mcp` | `packages/mcp-server` |
| `cli` | `packages/cli` |
| `dashboard` | `apps/dashboard` |
| `daemon` | Backend daemon |
| `ci` | CI/CD workflows |

### Examples

```
feat(contracts): add platform fee setter to StreamV1
fix(sdk): handle TIP-20 gas estimation overflow
docs(circuits): document shield_v2 constraint count
refactor(mcp): extract tool handlers into separate modules
```

## Pull Request Process

1. **Branch naming:** `feat/description`, `fix/description`, `chore/description`
2. **Draft PRs** for work in progress
3. **Description:** Use the PR template; include motivation, changes summary, and test plan
4. **Changesets:** Add a changeset (`pnpm changeset`) for any user-facing change
5. **CI must pass:** All workflow jobs must be green before merge
6. **Review requirements:**
   - At least 1 approval from `@agentic-finance`
   - Contract changes require explicit security review
   - Circuit changes require review of constraint soundness
7. **Merge strategy:** Squash and merge to `main`

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated for changes
- [ ] No hardcoded secrets or private keys
- [ ] Gas usage considered (for contract changes)
- [ ] Constraint count verified (for circuit changes)
- [ ] Breaking changes documented
- [ ] Changeset added (if applicable)

## ZK Circuit Development

### Security Properties

Every circuit must document:

1. **Soundness:** What false statements cannot be proven?
2. **Completeness:** What true statements can always be proven?
3. **Zero-knowledge:** What information is hidden from the verifier?

### Development Workflow

1. Write the circuit in Circom V2
2. Compile: `circom circuit.circom --r1cs --wasm --sym -l lib`
3. Trusted setup: Use existing Powers of Tau ceremony files (`pot14_final.ptau` through `pot16_final.ptau`)
4. Generate proving key: `snarkjs groth16 setup circuit.r1cs potN_final.ptau circuit_0000.zkey`
5. Contribute to ceremony: `snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey`
6. Export verifier: `snarkjs zkey export solidityverifier circuit_final.zkey Verifier.sol`
7. Write tests that verify:
   - Valid inputs produce valid proofs
   - Invalid inputs fail proof generation
   - On-chain verifier accepts valid proofs
   - On-chain verifier rejects manipulated proofs

### Constraint Budget

Keep circuits efficient. Document constraint counts in code comments:

| Circuit | Constraints | Powers of Tau |
|---------|------------|---------------|
| agtfi_compliance | ~2,000 | pot14 |
| agtfi_reputation | ~3,500 | pot14 |
| agtfi_proof_chain | ~5,000 | pot15 |
| agtfi_shield | ~8,000 | pot15 |
| agtfi_shield_v2 | ~12,000 | pot16 |

## Tempo L1 Quirks

When developing for Tempo Moderato (Chain 42431), be aware of:

- **TIP-20 tokens** (like AlphaUSD) use precompile addresses and consume 5-6x more gas than standard ERC20
- **Custom tx type `0x76`** breaks ethers.js v6 parsing; use `verifyTxOnChain()` with raw RPC calls
- **Gas is free** on testnet (no native gas token)
- **Use legacy transactions** (`{ type: 0 }`) to avoid tx type parsing errors in ethers.js

## Environment Variables

Never commit `.env` files. Use `.env.example` files to document required variables:

```bash
# Required for signing transactions
DAEMON_PRIVATE_KEY=
# RPC endpoint
RPC_URL=https://rpc.moderato.tempo.xyz
# Dashboard URL
DASHBOARD_URL=https://agt.finance
```

## Dependency Management

- **Package manager:** pnpm (monorepo workspace)
- **Lock files:** Always commit lock files
- **Updates:** Run `pnpm update` periodically; review changelogs for breaking changes
- **Audit:** Run `pnpm audit` before releases
