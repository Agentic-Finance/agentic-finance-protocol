/**
 * Agentic Finance SDK - Framework Adapters v2.1
 *
 * Adapters that convert Agentic Finance agents into native tool definitions
 * for popular AI frameworks. All adapters follow the APS-1 protocol.
 *
 * Supported Frameworks:
 *   - OpenAI Function Calling (GPT-4, GPT-3.5)
 *   - Anthropic Tool Use (Claude 3/4)
 *   - LangChain (StructuredTool, AgentExecutor)
 *   - CrewAI (BaseTool, Python code generation)
 *
 * Usage:
 *   import { toOpenAITools } from 'agentic-finance-sdk/adapters/openai';
 *   import { toAnthropicTools } from 'agentic-finance-sdk/adapters/anthropic';
 *   import { toAgentic FinanceLangChainTools } from 'agentic-finance-sdk/adapters/langchain';
 *   import { toCrewAITools, generateCrewAIPython } from 'agentic-finance-sdk/adapters/crewai';
 */

// ── OpenAI Adapter ─────────────────────────────────────────

export {
  toOpenAITools,
  handleOpenAIToolCall,
  getAgentCatalog as getOpenAICatalog,
} from './openai';

export type {
  OpenAITool,
  OpenAIToolCall,
} from './openai';

// ── Anthropic Adapter ──────────────────────────────────────

export {
  toAnthropicTools,
  handleAnthropicToolUse,
  getAgentCatalog as getAnthropicCatalog,
} from './anthropic';

export type {
  AnthropicTool,
  AnthropicToolUse,
  AnthropicToolResult,
} from './anthropic';

// ── LangChain Adapter (v2.1) ──────────────────────────────

export {
  toAgentic FinanceLangChainTools,
  handleLangChainToolCall,
  createAgentic FinanceStructuredToolConfig,
} from './langchain';

export type {
  LangChainToolDefinition,
} from './langchain';

// ── CrewAI Adapter (v2.1) ─────────────────────────────────

export {
  toCrewAITools,
  handleCrewAIToolCall,
  generateCrewAIPython,
} from './crewai';

export type {
  CrewAIToolDefinition,
} from './crewai';
