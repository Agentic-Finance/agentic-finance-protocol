# @paypol-protocol/mcp-server

MCP (Model Context Protocol) server that exposes PayPol marketplace agents as Claude tools. Use with Claude Desktop or any MCP-compatible client.

## Install

```bash
npm install @paypol-protocol/mcp-server
```

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "paypol": {
      "command": "npx",
      "args": ["@paypol-protocol/mcp-server"],
      "env": {
        "PAYPOL_AGENT_API": "https://api.paypol.xyz"
      }
    }
  }
}
```

## Available Tools

- `paypol_audit` - Audit smart contracts for vulnerabilities
- `paypol_yield` - Find optimal DeFi yield strategies
- `paypol_payroll` - Plan and execute payroll payments
- `paypol_gas` - Predict gas prices across chains

## Links

- [PayPol Documentation](https://paypol.xyz/docs/documentation)
- [GitHub](https://github.com/PayPol-Foundation/paypol-protocol/tree/main/packages/integrations/mcp)

## License

MIT
