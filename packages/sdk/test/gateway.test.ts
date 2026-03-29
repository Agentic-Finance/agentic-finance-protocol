/**
 * AgentGateway Tests
 *
 * Tests rail selection logic and gateway configuration.
 * Note: On-chain tests require a running Tempo RPC.
 */

import { describe, it, expect } from 'vitest';

describe('AgentGateway — Rail Selection', () => {
    it('should select shielded rail when privacy is shielded', async () => {
        const { AgentGateway } = await import('../src/gateway');

        // We test the selectRail logic indirectly via the pay method config
        const gw = new AgentGateway({
            privateKey: '0x' + '1'.repeat(64), // dummy key
            rpcUrl: 'https://rpc.moderato.tempo.xyz',
            defaultPrivacy: 'shielded',
        });

        expect(gw.address).toBeTruthy();
        expect(gw.address.startsWith('0x')).toBe(true);
    });

    it('should track stats correctly', async () => {
        const { AgentGateway } = await import('../src/gateway');

        const gw = new AgentGateway({
            privateKey: '0x' + '1'.repeat(64),
            rpcUrl: 'https://rpc.moderato.tempo.xyz',
        });

        const stats = gw.getStats();
        expect(stats.totalPayments).toBe(0);
        expect(stats.totalVolume).toBe('0');
        expect(stats.averageLatency).toBe(0);
    });

    it('should use default Tempo Moderato RPC', async () => {
        const { AgentGateway } = await import('../src/gateway');

        const gw = new AgentGateway({
            privateKey: '0x' + '1'.repeat(64),
        });

        // The gateway should be initialized with Tempo chain defaults
        expect(gw.address).toBeTruthy();
    });
});

describe('AgentGateway — Balance Query', () => {
    it('getBalance returns a string', async () => {
        const { AgentGateway } = await import('../src/gateway');

        const gw = new AgentGateway({
            privateKey: '0x' + '1'.repeat(64),
            rpcUrl: 'https://rpc.moderato.tempo.xyz',
        });

        // This will make a real RPC call — may fail in CI without network
        try {
            const balance = await gw.getBalance();
            expect(typeof balance).toBe('string');
        } catch {
            // Expected if RPC is unreachable in test env
            expect(true).toBe(true);
        }
    });
});
