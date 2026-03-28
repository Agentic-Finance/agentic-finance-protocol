# @agtfi/cli

Command-line interface for the PayPol Protocol. Deploy contracts, generate ZK proofs, manage agents, and send payments from your terminal.

## Installation

```bash
npm install -g @agtfi/cli
```

Or use directly with npx:

```bash
npx @agtfi/cli <command>
```

## Commands

### `agtfi init`

Initialize a new PayPol project with configuration files, circuit templates, and agent scaffolding.

```bash
# Default project setup
agtfi init

# With a specific template
agtfi init --template agent-marketplace
```

Creates:
- `agtfi.config.ts` -- Protocol configuration
- `circuits/` -- ZK circuit templates
- `agents/` -- Agent definitions
- `contracts/` -- Contract ABIs

### `agtfi deploy`

Deploy smart contracts to Tempo L1.

```bash
# Deploy to Tempo Moderato testnet
agtfi deploy --chain tempo

# Deploy with source verification
agtfi deploy --chain tempo --verify
```

### `agtfi prove`

Generate a ZK-SNARK proof from a circuit and input file.

```bash
# Generate a compliance proof
agtfi prove --circuit compliance --input input.json

# Specify output location
agtfi prove --circuit shield_v2 --input input.json --output proof.json
```

Supported circuits: `compliance`, `reputation`, `proof_chain`, `shield`, `shield_v2`

### `agtfi verify`

Verify a ZK proof locally or on-chain.

```bash
# Verify locally
agtfi verify --proof proof.json

# Verify on-chain via PlonkVerifierV2
agtfi verify --proof proof.json --chain tempo
```

### `agtfi agent register`

Register a new agent on the AgentDiscoveryRegistry.

```bash
agtfi agent register \
  --name "Code Auditor" \
  --capabilities "solidity-audit,gas-optimization" \
  --endpoint "https://my-agent.example.com"
```

### `agtfi transfer`

Send tokens to an address.

```bash
agtfi transfer \
  --to 0x1234...abcd \
  --amount 100 \
  --token AlphaUSD
```

### `agtfi balance`

Check token balance.

```bash
agtfi balance 0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793
```

### `agtfi status`

Check platform statistics and contract status.

```bash
agtfi status
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGTFI_PRIVATE_KEY` | Wallet private key for signing | (required) |
| `AGTFI_RPC_URL` | RPC endpoint | `https://rpc.moderato.tempo.xyz` |
| `AGTFI_CHAIN` | Default chain | `tempo` |

### Config File

The CLI reads from `agtfi.config.ts` in the current directory:

```typescript
export default {
  chain: 'tempo',
  rpc: 'https://rpc.moderato.tempo.xyz',
  contracts: {
    nexus: '0x6A467Cd4156093bB528e448C04366586a1052Fab',
    shield: '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055',
    verifier: '0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B',
  },
  circuits: {
    ptauDir: './ptau',
    outputDir: './build',
  },
};
```

## Development Workflow

A typical development workflow using the CLI:

```bash
# 1. Initialize project
agtfi init

# 2. Generate a compliance proof
agtfi prove --circuit compliance --input compliance_input.json

# 3. Verify the proof on-chain
agtfi verify --proof proof.json --chain tempo

# 4. Register your agent
agtfi agent register --name "My Agent" --capabilities "analysis"

# 5. Send a test payment
agtfi transfer --to 0xRecipient --amount 10 --token AlphaUSD
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run in development mode
pnpm dev
```

## License

MIT
