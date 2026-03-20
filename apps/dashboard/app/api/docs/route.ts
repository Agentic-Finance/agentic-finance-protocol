import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_DOCS = {
    name: 'Agentic Finance API',
    version: '1.0.0',
    description: 'Agent-to-agent payment infrastructure on Tempo L1',
    baseUrl: 'https://agt.finance/api',
    chain: { id: 42431, name: 'Tempo Moderato', rpc: 'https://rpc.moderato.tempo.xyz' },
    endpoints: [
        {
            group: 'Payroll',
            routes: [
                { method: 'GET', path: '/api/employees', description: 'Fetch pending and completed payroll payloads', params: [{ name: 'wallet', type: 'query', required: true }] },
                { method: 'POST', path: '/api/employees', description: 'Create payroll intents (batch)', body: { intents: [{ name: 'string', wallet: 'address', amount: 'number', token: 'string', note: 'string' }] } },
                { method: 'GET', path: '/api/payout-history', description: 'Settlement history (workspace-scoped)', params: [{ name: 'wallet', type: 'query', required: true }] },
            ]
        },
        {
            group: 'Workspace',
            routes: [
                { method: 'GET', path: '/api/workspace', description: 'Get workspace by admin wallet', params: [{ name: 'wallet', type: 'query', required: true }] },
                { method: 'POST', path: '/api/workspace', description: 'Create workspace', body: { adminWallet: 'address', name: 'string', type: 'Organization|Personal' } },
                { method: 'GET', path: '/api/workspace/stats', description: 'Workspace analytics', params: [{ name: 'wallet', type: 'query', required: true }, { name: 'range', type: 'query', required: false, default: '7d', options: ['7d', '30d', 'all'] }] },
            ]
        },
        {
            group: 'MPP (Machine Payments Protocol)',
            routes: [
                { method: 'GET', path: '/api/mpp/charge', description: 'List charge intents' },
                { method: 'POST', path: '/api/mpp/charge', description: 'Create charge intent', body: { serviceUrl: 'string', amount: 'number', token: 'address', memo: 'string' } },
                { method: 'GET', path: '/api/mpp/session', description: 'List MPP sessions' },
                { method: 'POST', path: '/api/mpp/session', description: 'Create pay-as-you-go session', body: { serviceUrl: 'string', spendingLimit: 'number', token: 'address', durationMs: 'number' } },
                { method: 'PATCH', path: '/api/mpp/session', description: 'Update session (add spent, cancel)', body: { sessionId: 'string', addSpent: 'number', cancel: 'boolean' } },
            ]
        },
        {
            group: 'Streaming Payroll',
            routes: [
                { method: 'GET', path: '/api/streaming', description: 'List active streams with real-time accrual', params: [{ name: 'wallet', type: 'query', required: false }] },
                { method: 'POST', path: '/api/streaming', description: 'Create salary stream', body: { employerWallet: 'address', employeeWallet: 'address', employeeName: 'string', ratePerSecond: 'number', durationSeconds: 'number', depositAmount: 'number' } },
            ]
        },
        {
            group: 'Employee Portal',
            routes: [
                { method: 'GET', path: '/api/employee-portal', description: 'Employee payment history + earnings', params: [{ name: 'wallet', type: 'query', required: true }] },
            ]
        },
        {
            group: 'Compliance (TIP-403)',
            routes: [
                { method: 'GET', path: '/api/compliance', description: 'Check transfer compliance', params: [{ name: 'wallet', type: 'query', required: true }, { name: 'token', type: 'query', required: false }, { name: 'action', type: 'query', required: false, options: ['check', 'policy', 'whitelist'] }] },
            ]
        },
        {
            group: 'Authentication',
            routes: [
                { method: 'GET', path: '/api/auth/passkey', description: 'Check passkey registration', params: [{ name: 'wallet', type: 'query', required: true }] },
                { method: 'POST', path: '/api/auth/passkey', description: 'Register passkey', body: { wallet: 'address', credentialId: 'string', publicKey: 'string' } },
            ]
        },
        {
            group: 'System',
            routes: [
                { method: 'GET', path: '/api/stats', description: 'Protocol-wide statistics' },
                { method: 'GET', path: '/api/daemon-status', description: 'Daemon engine status', params: [{ name: 'wallet', type: 'query', required: true }] },
                { method: 'GET', path: '/api/docs', description: 'This API documentation' },
            ]
        },
    ],
    contracts: {
        chain: 'Tempo Moderato (42431)',
        addresses: {
            NexusV2: '0x6A467Cd4156093bB528e448C04366586a1052Fab',
            ShieldVaultV2: '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055',
            PlonkVerifierV2: '0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B',
            AIProofRegistry: '0x8fDB8E871c9eaF2955009566F41490Bbb128a014',
            StreamV1: '0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C',
            MultisendV2: '0x25f4d3f12C579002681a52821F3a6251c46D4575',
            BatchShieldExecutor: '0xBc7dF45b15739c41c3223b1b794A73d793A65Ea2',
            AlphaUSD: '0x20c0000000000000000000000000000000000001',
        },
    },
};

export async function GET() {
    return NextResponse.json(API_DOCS, {
        headers: { 'Access-Control-Allow-Origin': '*' },
    });
}
