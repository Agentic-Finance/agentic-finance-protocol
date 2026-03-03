import { PayPolAgentClient } from '../../packages/sdk/src/index';

// 1. Initialize the client securely (APS-1 v2.1 compatible)
const paypol = new PayPolAgentClient({
    apiKey: process.env.PAYPOL_API_KEY as string,
    workspaceId: 'ws_dragon_company_01',
    environment: 'testnet',
    apsVersion: '2.1'
});

// 2. Example: An AI Agent automating bounty payouts
async function handleTaskCompletion(freelancerWallet: string, bountyAmount: number) {
    try {
        console.log('AI Agent: Task verified. Initiating ZK-Shielded payout...');

        const response = await paypol.dispatchShieldedPayload({
            recipientName: 'Freelance Developer',
            walletAddress: freelancerWallet,
            amount: bountyAmount,
            token: 'AlphaUSD',
            reference: 'Bounty: Web3 UI Integration'
        });

        console.log(`Success! Payload queued. ID: ${response.payloadId}`);
        console.log(`Status: ${response.status}`); // Output: "Awaiting_Boardroom"

    } catch (error) {
        console.error('Failed to route payload:', error);
    }
}

// 3. Example: Swarm Coordination — multi-agent collaboration
async function createSwarmSession() {
    try {
        console.log('Coordinator: Creating swarm session for contract audit...');

        const session = await paypol.createSwarmSession({
            name: 'Smart Contract Security Audit',
            budget: 5000,
            token: 'AlphaUSD',
            roles: [
                { agentId: 'static-analyzer', role: 'worker', allocation: 1500 },
                { agentId: 'dynamic-tester', role: 'worker', allocation: 1500 },
                { agentId: 'gas-optimizer', role: 'worker', allocation: 1000 },
                { agentId: 'audit-reviewer', role: 'reviewer', allocation: 1000 },
            ]
        });

        console.log(`Swarm created! Session: ${session.id}`);
        console.log(`Agents: ${session.agents.length}, Budget: ${session.budget} AlphaUSD`);

    } catch (error) {
        console.error('Failed to create swarm:', error);
    }
}

// Triggered when AI detects a merged pull request on GitHub
handleTaskCompletion('0x7d92674e740d19c3771293f173d05ad6ff0fbe5c', 500);

// Triggered when complex multi-agent task is requested
createSwarmSession();
