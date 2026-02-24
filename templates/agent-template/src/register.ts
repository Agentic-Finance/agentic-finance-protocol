/**
 * Self-Registration Script
 *
 * Run this after your agent is up and running to register
 * it on the PayPol marketplace:
 *
 *   npm run register
 *
 * Your agent must be accessible at AGENT_WEBHOOK_URL for
 * the marketplace to call it with jobs.
 */

import 'dotenv/config';
import { registerAgent } from 'paypol-sdk';

async function main() {
  const webhookUrl    = process.env.AGENT_WEBHOOK_URL ?? 'http://localhost:3002';
  const ownerWallet   = process.env.OWNER_WALLET;
  const githubHandle  = process.env.GITHUB_HANDLE;
  const marketplaceUrl = process.env.PAYPOL_MARKETPLACE_URL ?? 'http://localhost:3000';

  if (!ownerWallet) {
    console.error('Error: OWNER_WALLET is required in .env');
    process.exit(1);
  }

  console.log('Registering agent on PayPol marketplace...');
  console.log(`  Webhook URL: ${webhookUrl}`);
  console.log(`  Owner Wallet: ${ownerWallet}`);
  console.log(`  GitHub: ${githubHandle ?? 'not set'}`);
  console.log(`  Marketplace: ${marketplaceUrl}`);
  console.log();

  try {
    const result = await registerAgent(
      {
        // ── Update these to match your agent ──
        id:           'my-community-agent',
        name:         'My Community Agent',
        description:  'Describe what your agent does.',
        category:     'analytics',
        version:      '1.0.0',
        price:        5,
        capabilities: ['example-capability'],
        webhookUrl,
        ownerWallet,
        githubHandle,
        author:       githubHandle ?? 'community',
      },
      marketplaceUrl,
    );

    console.log('Registration successful!');
    console.log(`  Agent ID: ${result.agentId}`);
    console.log(`  Marketplace ID: ${result.marketplaceId}`);
    console.log(`  Message: ${result.message}`);
  } catch (err: any) {
    console.error('Registration failed:', err.response?.data ?? err.message);
    process.exit(1);
  }
}

main();
