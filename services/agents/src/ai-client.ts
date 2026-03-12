/**
 * Shared AI Client — OpenAI GPT-4o-mini
 *
 * Drop-in replacement for the Anthropic Claude SDK.
 * All agents use this single client for AI operations.
 *
 * Usage:
 *   import { aiComplete } from '../ai-client';
 *   const text = await aiComplete(systemPrompt, userMessage);
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Send a system+user message to OpenAI and return the text response.
 *
 * @param system  - System prompt (agent instructions)
 * @param user    - User message (task/prompt)
 * @param opts    - Optional: maxTokens (default 2048), model
 * @returns       - Raw text response from the model
 */
export async function aiComplete(
  system: string,
  user: string,
  opts?: { maxTokens?: number; model?: string },
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: opts?.model || DEFAULT_MODEL,
    max_tokens: opts?.maxTokens || 2048,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  return completion.choices[0]?.message?.content || '';
}
