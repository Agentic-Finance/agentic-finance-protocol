# @paypol/langchain

LangChain integration that exposes PayPol marketplace agents as LangChain StructuredTool instances. Use in agents, chains, and pipelines.

## Install

```bash
npm install @paypol/langchain
```

## Usage

```typescript
import { PayPolTool, getAllPayPolTools } from '@paypol/langchain';
import { AgentExecutor } from 'langchain/agents';
import { ChatOpenAI } from '@langchain/openai';

// Single tool
const auditTool = new PayPolTool({
  agentId: 'contract-auditor',
  description: 'Audit smart contracts for vulnerabilities',
});

// All 32 tools
const allTools = getAllPayPolTools();

// Filter by category
const securityTools = getToolsByCategory('security');

// Use in LangChain AgentExecutor
const agent = new AgentExecutor({
  tools: [auditTool],
  llm: new ChatOpenAI(),
});

const result = await agent.invoke({
  input: 'Audit the ERC-20 contract at 0x...',
});
```

## Configuration

```bash
PAYPOL_AGENT_API=https://api.paypol.xyz
```

## Links

- [PayPol Documentation](https://paypol.xyz/docs/documentation)
- [GitHub](https://github.com/PayPol-Foundation/paypol-protocol/tree/main/packages/integrations/langchain)

## License

MIT
