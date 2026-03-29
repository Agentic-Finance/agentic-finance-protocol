/**
 * ZKPrivacy Module Tests
 *
 * Tests ZK proof generation, commitment computation, and contract queries.
 * Note: Tests that require on-chain interaction are marked with [integration]
 * and need a running RPC endpoint.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Test the commitment computation logic independently
describe('ZKPrivacy — Commitment Computation', () => {
    it('should generate deterministic secrets per address', async () => {
        // Import the module
        const { ZKPrivacy } = await import('../src/zk-privacy');

        const zk = new ZKPrivacy({
            rpcUrl: 'https://rpc.moderato.tempo.xyz',
            complianceRegistry: '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14',
            reputationRegistry: '0xF3296984cb8785Ab236322658c13051801E58875',
        });

        const secret1 = zk.getSecretForAddress('0x1234567890abcdef1234567890abcdef12345678');
        const secret2 = zk.getSecretForAddress('0x1234567890abcdef1234567890abcdef12345678');
        const secret3 = zk.getSecretForAddress('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');

        // Same address → same secret (cached)
        expect(secret1).toBe(secret2);
        // Different address → different secret
        expect(secret1).not.toBe(secret3);
        // Secret is a valid bigint string
        expect(() => BigInt(secret1)).not.toThrow();
    });

    it('should generate non-zero secrets', async () => {
        const { ZKPrivacy } = await import('../src/zk-privacy');

        const zk = new ZKPrivacy({
            rpcUrl: 'https://rpc.moderato.tempo.xyz',
            complianceRegistry: '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14',
            reputationRegistry: '0xF3296984cb8785Ab236322658c13051801E58875',
        });

        const secret = zk.getSecretForAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12');
        expect(BigInt(secret)).toBeGreaterThan(BigInt(0));
    });

    it('should return correct chain ID', async () => {
        const { ZKPrivacy } = await import('../src/zk-privacy');

        const zk = new ZKPrivacy({
            rpcUrl: 'https://rpc.moderato.tempo.xyz',
            complianceRegistry: '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14',
            reputationRegistry: '0xF3296984cb8785Ab236322658c13051801E58875',
            chainId: 42431,
        });

        expect(zk.getChainId()).toBe(42431);
    });

    it('should default to chain 42431', async () => {
        const { ZKPrivacy } = await import('../src/zk-privacy');

        const zk = new ZKPrivacy({
            rpcUrl: 'https://rpc.moderato.tempo.xyz',
            complianceRegistry: '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14',
            reputationRegistry: '0xF3296984cb8785Ab236322658c13051801E58875',
        });

        expect(zk.getChainId()).toBe(42431);
    });
});

describe('ZKPrivacy — Proof Generation (without circuit files)', () => {
    it('proveCompliance returns error when circuit files not configured', async () => {
        const { ZKPrivacy } = await import('../src/zk-privacy');

        const zk = new ZKPrivacy({
            rpcUrl: 'https://rpc.moderato.tempo.xyz',
            complianceRegistry: '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14',
            reputationRegistry: '0xF3296984cb8785Ab236322658c13051801E58875',
        });

        const result = await zk.proveCompliance({
            senderAddress: '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793',
            amount: BigInt(5000_000000),
            cumulativeVolume: BigInt(8000_000000),
        }, false); // don't submit on-chain

        // Should succeed but indicate circuit files needed
        expect(result.success).toBe(true);
        expect(result.commitment).toBeTruthy();
        expect(result.error).toContain('Circuit files not configured');
        expect(result.publicSignals.length).toBe(4);
    });

    it('proveReputation returns error when circuit files not configured', async () => {
        const { ZKPrivacy } = await import('../src/zk-privacy');

        const zk = new ZKPrivacy({
            rpcUrl: 'https://rpc.moderato.tempo.xyz',
            complianceRegistry: '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14',
            reputationRegistry: '0xF3296984cb8785Ab236322658c13051801E58875',
        });

        const result = await zk.proveReputation({
            agentAddress: '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793',
            claims: [
                { amount: BigInt(100_000000), timestamp: 1700000000, status: 1 },
                { amount: BigInt(200_000000), timestamp: 1700001000, status: 1 },
            ],
            minTxCount: 2,
            minVolume: BigInt(300_000000),
        }, false);

        expect(result.success).toBe(true);
        expect(result.agentCommitment).toBeTruthy();
        expect(result.accumulatorHash).toBeTruthy();
        expect(result.error).toContain('Circuit files not configured');
    });

    it('computeCommitment produces valid output', async () => {
        const { ZKPrivacy } = await import('../src/zk-privacy');

        const zk = new ZKPrivacy({
            rpcUrl: 'https://rpc.moderato.tempo.xyz',
            complianceRegistry: '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14',
            reputationRegistry: '0xF3296984cb8785Ab236322658c13051801E58875',
        });

        const commitment = await zk.computeCommitment(
            '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793',
            '12345678901234567890'
        );

        expect(commitment).toBeTruthy();
        expect(() => BigInt(commitment)).not.toThrow();
        expect(BigInt(commitment)).toBeGreaterThan(BigInt(0));

        // Same inputs → same commitment (deterministic)
        const commitment2 = await zk.computeCommitment(
            '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793',
            '12345678901234567890'
        );
        expect(commitment).toBe(commitment2);
    });
});

describe('ZKPrivacy — Batch Proofs', () => {
    it('batchComplianceProofs processes inputs in batches', async () => {
        const { batchComplianceProofs } = await import('../src/zk-privacy');

        const inputs = [
            { senderAddress: '0x1111', amount: BigInt(100), cumulativeVolume: BigInt(100) },
            { senderAddress: '0x2222', amount: BigInt(200), cumulativeVolume: BigInt(200) },
            { senderAddress: '0x3333', amount: BigInt(300), cumulativeVolume: BigInt(300) },
        ];

        let callCount = 0;
        const mockGenerateFn = async (input: any) => {
            callCount++;
            return { proof: { mock: true }, publicSignals: [input.senderAddress] };
        };

        const result = await batchComplianceProofs(inputs, mockGenerateFn, 2);

        expect(result.count).toBe(3);
        expect(result.proofs.length).toBe(3);
        expect(callCount).toBe(3);
        expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
        expect(result.avgTimeMs).toBeGreaterThanOrEqual(0);
    });
});
