# Security Policy

## Reporting a Vulnerability

The PayPol Protocol team takes security seriously. We appreciate your efforts to responsibly disclose any vulnerabilities you find.

### How to Report

**DO NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report vulnerabilities through one of the following channels:

- **Email:** security@agt.finance
- **Subject line format:** `[SECURITY] Brief description of vulnerability`

### What to Include

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if any)
- Your contact information for follow-up

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 5 business days |
| Status update | Every 7 days until resolved |
| Fix deployment | Dependent on severity |

## Scope

The following components are in scope for security reports:

### Critical (Highest Priority)

- **Smart Contracts** (`packages/contracts/src/`)
  - PayPolNexusV2 (escrow and job management)
  - PayPolShieldVaultV2 (ZK-shielded payments)
  - PlonkVerifierV2 (on-chain proof verification)
  - PayPolStreamV1 (streaming payments)
  - PayPolMultisendVaultV2 (batch payments)
  - AIProofRegistry (proof chain storage)
  - All access control and fund management logic

- **ZK Circuits** (`packages/circuits/`)
  - Compliance circuit (agtfi_compliance)
  - Reputation circuit (agtfi_reputation)
  - Proof chain circuit (agtfi_proof_chain)
  - Shield circuits (agtfi_shield, agtfi_shield_v2)
  - Trusted setup artifacts (.zkey, .ptau)

### High Priority

- **Daemon / Backend** (payment processing, proof generation)
- **Private key management** (key storage, signing flows)
- **API endpoints** (authentication, authorization)

### Medium Priority

- **SDK** (`packages/sdk/`) — client-side libraries
- **MCP Server** (`packages/mcp-server/`) — tool execution
- **Dashboard** (`apps/dashboard/`) — frontend application
- **CLI** (`packages/cli/`) — command-line interface

### Out of Scope

- Third-party dependencies (report upstream)
- Tempo L1 chain-level issues (report to Tempo team)
- Social engineering attacks
- Denial of service attacks against public testnet infrastructure
- Issues in test files or development tooling

## Severity Classification

| Severity | Description | Examples |
|----------|-------------|----------|
| **Critical** | Direct loss of funds or private keys | Contract exploit draining escrow, key exfiltration |
| **High** | Indirect fund loss or ZK proof forgery | Bypassing compliance checks, proof manipulation |
| **Medium** | Data exposure or access control bypass | Unauthorized API access, information leakage |
| **Low** | Minor issues with limited impact | UI bugs, non-sensitive information disclosure |

## Bug Bounty

We offer bounties for qualifying vulnerability reports:

| Severity | Bounty Range |
|----------|-------------|
| Critical | Up to $10,000 |
| High | Up to $5,000 |
| Medium | Up to $1,000 |
| Low | Up to $250 |

Bounty amounts are determined at our discretion based on the severity, impact, and quality of the report. Only the first reporter of a given vulnerability is eligible for a bounty.

### Eligibility

- Vulnerability must be previously unreported
- Reporter must not exploit the vulnerability beyond proof of concept
- Reporter must not publicly disclose before a fix is deployed
- Reporter must comply with responsible disclosure practices

## Deployed Contracts

Current production contracts on Tempo Moderato (Chain 42431):

| Contract | Address |
|----------|---------|
| NexusV2 | `0x6A467Cd4156093bB528e448C04366586a1052Fab` |
| ShieldVaultV2 | `0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055` |
| PlonkVerifierV2 | `0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B` |
| AIProofRegistry | `0x8fDB8E871c9eaF2955009566F41490Bbb128a014` |
| StreamV1 | `0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C` |
| MultisendV2 | `0x25f4d3f12C579002681a52821F3a6251c46D4575` |

## Security Practices

- All contract changes require code review from `@agentic-finance`
- ZK circuits use Groth16/PLONK with audited trusted setup ceremonies
- Private keys are never stored in source control
- Production deployments use Docker with minimal attack surface
- Continuous integration runs `forge test` and circuit proof verification on every PR

## Audit Status

Contracts and circuits are pending formal third-party audit. This document will be updated with audit reports as they become available.

## Contact

- **Security reports:** security@agt.finance
- **General inquiries:** team@agt.finance
