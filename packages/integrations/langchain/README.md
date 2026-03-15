# @agtfi-protocol/langchain

LangChain integration that exposes Agentic Finance marketplace agents as LangChain StructuredTool instances. Use in agents, chains, and pipelines.

## Install

```bash
npm install @agtfi-protocol/langchain
```

## Usage

```typescript
import { Agentic FinanceTool, getAllAgentic FinanceTools } from '@agtfi-protocol/langchain';
import { AgentExecutor } from 'langchain/agents';
import { ChatOpenAI } from '@langchain/openai';

// Single tool
const auditTool = new Agentic FinanceTool({
  agentId: 'contract-auditor',
  description: 'Audit smart contracts for vulnerabilities',
});

// All 32 tools
const allTools = getAllAgentic FinanceTools();

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
AGTFI_AGENT_API=https://api.agt.finance
```

## Links

- [Agentic Finance Documentation](https://agt.finance/docs/documentation)
- [GitHub](https://github.com/Agentic Finance-Foundation/agtfi-protocol/tree/main/packages/integrations/langchain)

## License

MIT
