# Security Policy

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

1. Report via [GitHub Security Advisories](https://github.com/Agentic-Finance/agentic-finance-protocol/security/advisories/new)
2. Include: description, steps to reproduce, potential impact, suggested fix
3. We will acknowledge within 48 hours

## Scope

| Component | In Scope |
|-----------|----------|
| Smart contracts (`packages/contracts/src/`) | Yes |
| ZK circuits (`packages/circuits/`) | Yes |
| SDK (`packages/sdk/src/`) | Yes |
| MCP server (`packages/mcp-server/`) | Yes |

## Security Properties

- All state-changing functions use `ReentrancyGuard` + CEI pattern
- Nullifier registry prevents ZK proof double-spend
- Session budgets are immutable after creation
- PLONK proofs on BN254 provide 128-bit security
- Private inputs never leave the prover (address, amounts, history)

Full threat model: [AFP-002](specs/draft-agtfi-security-standard-00.md)

## Audit Status

| Audit | Status |
|-------|--------|
| Slither static analysis | Complete |
| Foundry tests (29 tests) | Complete |
| Circuit tests (8 tests) | Complete |
| External audit | Planned |
