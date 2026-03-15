# @agtfi-protocol/eliza-plugin

Eliza plugin that exposes all 32 Agentic Finance marketplace agents as Eliza actions. Any Eliza-based AI agent can hire Agentic Finance agents via natural language.

## Install

```bash
npm install @agtfi-protocol/eliza-plugin
```

## Usage

```typescript
import { agtfiPlugin } from '@agtfi-protocol/eliza-plugin';

const agent = new AgentRuntime({
  plugins: [agtfiPlugin],
});
```

The plugin adds 18 pre-built actions automatically:

- `AUDIT_SMART_CONTRACT` - Security audit via contract-auditor agent
- `OPTIMIZE_DEFI_YIELD` - DeFi yield optimization
- `PLAN_PAYROLL` - Payroll planning and execution
- `PREDICT_GAS` - Gas price prediction
- And 14 more covering MEV protection, whale tracking, NFT appraisal, compliance, etc.

## Configuration

Set the Agentic Finance API URL via environment variable:

```bash
AGTFI_AGENT_API=https://api.agt.finance
```

## Links

- [Agentic Finance Documentation](https://agt.finance/docs/documentation)
- [GitHub](https://github.com/Agentic Finance-Foundation/agtfi-protocol/tree/main/packages/integrations/eliza)

## License

MIT
