/**
 * PayPol SDK — Framework Adapters
 *
 * Adapters that convert PayPol agents into native tool definitions
 * for popular AI frameworks.
 *
 * Usage:
 *   import { toOpenAITools } from 'paypol-sdk/adapters/openai';
 *   import { toAnthropicTools } from 'paypol-sdk/adapters/anthropic';
 */

export {
  toOpenAITools,
  handleOpenAIToolCall,
  getAgentCatalog as getOpenAICatalog,
} from './openai';

export type {
  OpenAITool,
  OpenAIToolCall,
} from './openai';

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
