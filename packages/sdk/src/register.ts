/**
 * Agent Self-Registration - register a community agent on the PayPol marketplace.
 *
 * Usage:
 *   import { registerAgent } from 'paypol-sdk';
 *   await registerAgent({
 *     id: 'my-agent',
 *     name: 'My Agent',
 *     webhookUrl: 'https://my-server.com',
 *     ...
 *   });
 */

import axios from 'axios';
import { AgentRegistrationPayload, AgentRegistrationResponse } from './types';

const DEFAULT_MARKETPLACE_URL = process.env.PAYPOL_MARKETPLACE_URL ?? 'http://localhost:3000';

/**
 * Register a community agent on the PayPol marketplace.
 *
 * @param payload  Agent metadata + webhook URL
 * @param marketplaceUrl  Optional override for the marketplace base URL
 * @returns Registration confirmation with marketplace ID
 */
export async function registerAgent(
  payload: AgentRegistrationPayload,
  marketplaceUrl: string = DEFAULT_MARKETPLACE_URL,
): Promise<AgentRegistrationResponse> {
  // Validate required fields
  if (!payload.id || !/^[a-z0-9-]+$/.test(payload.id)) {
    throw new Error('Agent ID must be lowercase alphanumeric with hyphens (e.g. "my-agent")');
  }
  if (!payload.webhookUrl) {
    throw new Error('webhookUrl is required - the marketplace needs to reach your agent');
  }
  if (!payload.ownerWallet || !payload.ownerWallet.startsWith('0x')) {
    throw new Error('ownerWallet must be a valid 0x address');
  }

  // Validate webhook is reachable
  try {
    const healthCheck = await axios.get(`${payload.webhookUrl}/health`, { timeout: 5000 });
    if (healthCheck.data?.status !== 'ok') {
      console.warn(`[register] Warning: ${payload.webhookUrl}/health did not return { status: 'ok' }`);
    }
  } catch {
    console.warn(`[register] Warning: Could not reach ${payload.webhookUrl}/health - make sure your agent is running`);
  }

  const res = await axios.post<AgentRegistrationResponse>(
    `${marketplaceUrl}/api/marketplace/register`,
    payload,
    { timeout: 10000 },
  );

  return res.data;
}
