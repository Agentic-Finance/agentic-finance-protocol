import { PayPolAgentClient } from '../../packages/sdk/src/index';

// 1. Initialize the client securely
const paypol = new PayPolAgentClient({
    apiKey: process.env.PAYPOL_API_KEY as string,
    workspaceId: 'ws_dragon_company_01',
    environment: 'testnet'
});

// 2. Example: An AI Agent automating bounty payouts
async function handleTaskCompletion(freelancerWallet: string, bountyAmount: number) {
    try {
        console.log('🤖 AI Agent: Task verified. Initiating ZK-Shielded payout...');
        
        const response = await paypol.dispatchShieldedPayload({
            recipientName: 'Freelance Developer',
            walletAddress: freelancerWallet,
            amount: bountyAmount,
            token: 'AlphaUSD',
            reference: 'Bounty: Web3 UI Integration'
        });

        console.log(`✅ Success! Payload queued. ID: ${response.payloadId}`);
        console.log(`🔒 Status: ${response.status}`); // Output: "Awaiting_Boardroom"

    } catch (error) {
        console.error('❌ Failed to route payload:', error);
    }
}

// Triggered when AI detects a merged pull request on GitHub
handleTaskCompletion('0x7d92674e740d19c3771293f173d05ad6ff0fbe5c', 500);