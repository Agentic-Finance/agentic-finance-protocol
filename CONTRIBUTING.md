# Contributing to Agentic Finance Protocol

Thank you for your interest in contributing! This document provides guidelines for contributing to the Agentic Finance Protocol.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/agentic-finance-protocol.git`
3. Create a branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Push and open a Pull Request

## What We're Looking For

### High Priority

- **ZK Circuits** &mdash; New Circom V2 circuits for cross-chain verification, Travel Rule compliance, or novel trust proofs
- **Security Audits** &mdash; Review existing contracts, circuits, and SDK for vulnerabilities
- **Protocol Specs** &mdash; New AFP specifications extending the trust layer

### Welcome Contributions

- **SDK Adapters** &mdash; LangChain, AutoGPT, CrewAI, Eliza integrations
- **Contract Improvements** &mdash; Gas optimizations, new features, better error messages
- **Documentation** &mdash; Tutorials, examples, architecture guides
- **Testing** &mdash; Foundry tests, circuit test vectors, SDK tests

## Development Setup

### Contracts

```bash
cd packages/contracts
forge install && forge build && forge test -vvv
```

### ZK Circuits

```bash
cd packages/circuits
npm install
node test_compliance.mjs
node test_reputation.mjs
```

### SDK

```bash
cd packages/sdk
npm install && npm run build && npm test
```

## Pull Request Guidelines

- **One PR per feature/fix** &mdash; Keep PRs focused
- **Include tests** &mdash; Foundry tests for contracts, vitest for SDK
- **Update docs** &mdash; If your change affects the public API
- **Follow existing patterns** &mdash; Match the code style

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`

## Proposing a New Specification

1. Create `specs/draft-agtfi-{topic}-00.md`
2. Follow the format of [AFP-001](specs/draft-agtfi-zk-trust-00.md) or [AFP-002](specs/draft-agtfi-security-standard-00.md)
3. Include: Abstract, Motivation, Specification, Security Considerations, References
4. Open a PR with `[SPEC]` prefix

## Security

If you discover a vulnerability, **do NOT** open a public issue. See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
