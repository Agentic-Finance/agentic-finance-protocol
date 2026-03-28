# @agtfi/mcp-server

MCP (Model Context Protocol) payment server for the PayPol Protocol. Gives any AI agent -- Claude, Cursor, GPT, LangChain -- the ability to send payments, check compliance, verify reputation, and discover other agents from their terminal or IDE.

## Installation

```bash
# Run directly with npx
npx @agtfi/mcp-server

# Or install globally
npm install -g @agtfi/mcp-server
```

## Setup

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agtfi": {
      "command": "npx",
      "args": ["@agtfi/mcp-server"],
      "env": {
        "AGTFI_PRIVATE_KEY": "your-private-key",
        "AGTFI_RPC_URL": "https://rpc.moderato.tempo.xyz"
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "agtfi": {
    "command": "npx",
    "args": ["@agtfi/mcp-server"],
    "env": {
      "AGTFI_PRIVATE_KEY": "your-private-key"
    }
  }
}
```

### Claude Code

```bash
claude mcp add agtfi npx @agtfi/mcp-server
```

### Generic MCP Client

The server uses stdio transport. Connect to it with any MCP-compatible client:

```bash
AGTFI_PRIVATE_KEY=0x... npx @agtfi/mcp-server
```

## Available Tools

| Tool | Description | Auth Required |
|------|-------------|---------------|
| `agtfi_transfer` | Send tokens to an address | Yes |
| `agtfi_balance` | Check token balance of any address | No |
| `agtfi_check_compliance` | Verify if a commitment is compliant | No |
| `agtfi_check_reputation` | Query agent reputation by commitment | No |
| `agtfi_create_session` | Create an MPP-compliant payment session | Yes |
| `agtfi_discover_agents` | Find agents by capability or category | No |
| `agtfi_hire_agent` | Hire an agent from the marketplace | Yes |
| `agtfi_create_payment_link` | Generate a payment link with QR code | No |
| `agtfi_deploy_token` | Deploy a new ERC-20 token | Yes |
| `agtfi_create_escrow` | Create a NexusV2 escrow job | Yes |
| `agtfi_get_stats` | Get platform statistics | No |

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `AGTFI_PRIVATE_KEY` | Wallet private key for signing transactions | (required for write operations) |
| `AGTFI_RPC_URL` | Tempo L1 RPC endpoint | `https://rpc.moderato.tempo.xyz` |
| `AGTFI_DASHBOARD_URL` | Dashboard URL for payment links | `https://agt.finance` |

## Examples

### Check a Balance

Ask your AI assistant:

> "Check the AlphaUSD balance of 0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793"

The MCP server calls `agtfi_balance` and returns the formatted balance.

### Send a Payment

> "Send 100 AlphaUSD to 0x1234...abcd"

The server creates and broadcasts the transaction, returning the transaction hash.

### Discover and Hire Agents

> "Find me a Solidity auditor agent and hire it to review my contract"

The server uses `agtfi_discover_agents` to find matching agents, then `agtfi_hire_agent` to create an escrow job via NexusV2.

### Create Escrow

> "Create an escrow job for 500 AlphaUSD with worker 0xABC... and 7-day deadline"

The server calls `agtfi_create_escrow` to lock funds in NexusV2 with the specified parameters.

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build

# Typecheck
pnpm exec tsc --noEmit
```

## Contract Addresses (Tempo Moderato, Chain 42431)

| Contract | Address |
|----------|---------|
| AlphaUSD | `0x20c0000000000000000000000000000000000001` |
| NexusV2 | `0x6A467Cd4156093bB528e448C04366586a1052Fab` |
| ShieldVaultV2 | `0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055` |
| MultisendV2 | `0x25f4d3f12C579002681a52821F3a6251c46D4575` |
| StreamV1 | `0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C` |
| ComplianceRegistry | `0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14` |
| ReputationRegistry | `0xF3296984cb8785Ab236322658c13051801E58875` |
| DiscoveryRegistry | `0x74D79e0AEd3CF9aE9A325558940bB1c8fB8CeA47` |
| MPP Gateway | `0x5F68F2A17a28b06A02A649cade5a666C49cb6B6d` |

## License

MIT
