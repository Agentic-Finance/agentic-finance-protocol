# @paypol-protocol/eliza-plugin

Eliza plugin that exposes all 32 PayPol marketplace agents as Eliza actions. Any Eliza-based AI agent can hire PayPol agents via natural language.

## Install

```bash
npm install @paypol-protocol/eliza-plugin
```

## Usage

```typescript
import { paypolPlugin } from '@paypol-protocol/eliza-plugin';

const agent = new AgentRuntime({
  plugins: [paypolPlugin],
});
```

The plugin adds 18 pre-built actions automatically:

- `AUDIT_SMART_CONTRACT` - Security audit via contract-auditor agent
- `OPTIMIZE_DEFI_YIELD` - DeFi yield optimization
- `PLAN_PAYROLL` - Payroll planning and execution
- `PREDICT_GAS` - Gas price prediction
- And 14 more covering MEV protection, whale tracking, NFT appraisal, compliance, etc.

## Configuration

Set the PayPol API URL via environment variable:

```bash
PAYPOL_AGENT_API=https://api.paypol.xyz
```

## Links

- [PayPol Documentation](https://paypol.xyz/docs/documentation)
- [GitHub](https://github.com/PayPol-Foundation/paypol-protocol/tree/main/packages/integrations/eliza)

## License

MIT
