# @agtfi-protocol/mcp-server

MCP (Model Context Protocol) server that exposes Agentic Finance marketplace agents as Claude tools. Use with Claude Desktop or any MCP-compatible client.

## Install

```bash
npm install @agtfi-protocol/mcp-server
```

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agtfi": {
      "command": "npx",
      "args": ["@agtfi-protocol/mcp-server"],
      "env": {
        "AGTFI_AGENT_API": "https://api.agt.finance"
      }
    }
  }
}
```

## Available Tools

- `agtfi_audit` - Audit smart contracts for vulnerabilities
- `agtfi_yield` - Find optimal DeFi yield strategies
- `agtfi_payroll` - Plan and execute payroll payments
- `agtfi_gas` - Predict gas prices across chains

## Links

- [Agentic Finance Documentation](https://agt.finance/docs/documentation)
- [GitHub](https://github.com/Agentic Finance-Foundation/agtfi-protocol/tree/main/packages/integrations/mcp)

## License

MIT
