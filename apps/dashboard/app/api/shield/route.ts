/**
 * POST /api/shield — ZK Shield Engine API (Circom V2 + snarkjs)
 *
 * Real ZK-SNARK implementation using Poseidon hashing (circomlibjs) and PLONK proofs (snarkjs).
 * Poseidon is cached as a singleton — first call ~200ms, subsequent calls ~0ms.
 *
 * Actions:
 *   - generate_commitment: Generate Poseidon commitment for ShieldVaultV2 deposit
 *   - generate_proof: Generate PLONK ZK proof for shielded withdrawal
 *   - (default): Legacy vault creation (backward compat)
 */

import { NextResponse } from 'next/server';
import prisma from "@/app/lib/prisma";
import { getPoseidon, generateRandomSecret, computeCommitment } from "@/app/lib/poseidon-cache";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action } = body;

        // ═══════════════════════════════════════════════════════════
        // ACTION: generate_commitment
        // Generates Poseidon commitment for ShieldVaultV2 deposit.
        // Called by frontend before on-chain deposit.
        // ═══════════════════════════════════════════════════════════
        if (action === 'generate_commitment') {
            const { amount, recipient, tokenDecimals = 6 } = body;

            if (!amount || !recipient) {
                return NextResponse.json({ error: 'Missing amount or recipient' }, { status: 400 });
            }

            const cleanRecipient = recipient.toLowerCase().trim();
            if (!/^0x[a-fA-F0-9]{40}$/.test(cleanRecipient)) {
                return NextResponse.json({ error: 'Invalid recipient wallet address' }, { status: 400 });
            }

            const secret = generateRandomSecret();
            const nullifier = generateRandomSecret();

            const amountScaled = BigInt(Math.round(Number(amount) * 10 ** tokenDecimals)).toString();
            const recipientBigInt = BigInt(cleanRecipient).toString();

            const { commitment, nullifierHash } = await computeCommitment(secret, nullifier, amountScaled, recipientBigInt);

            console.log(`[Shield API] Commitment generated for ${amount} AlphaUSD → ${recipient.slice(0, 10)}...`);

            return NextResponse.json({
                success: true,
                commitment,
                nullifierHash,
                secret,
                nullifier,
                amountScaled,
            });
        }

        // ═══════════════════════════════════════════════════════════
        // ACTION: generate_proof
        // Generates PLONK ZK proof for shielded withdrawal.
        // Used by daemon or direct API calls.
        // ═══════════════════════════════════════════════════════════
        if (action === 'generate_proof') {
            const { secret, nullifier, amount, recipient, tokenDecimals = 6 } = body;

            if (!secret || !nullifier || !amount || !recipient) {
                return NextResponse.json(
                    { error: 'Missing required fields: secret, nullifier, amount, recipient' },
                    { status: 400 }
                );
            }

            const snarkjs = await import('snarkjs');
            const path = await import('path');
            const fs = await import('fs');

            const amountScaled = BigInt(Math.round(Number(amount) * 10 ** tokenDecimals)).toString();
            let cleanRecipient = recipient.toLowerCase().trim();
            if (cleanRecipient.includes('...') || cleanRecipient.length !== 42) {
                cleanRecipient = "0x0000000000000000000000000000000000000001";
            }
            const recipientBigInt = BigInt(cleanRecipient).toString();

            // Use cached Poseidon — no WASM rebuild
            const { commitment, nullifierHash } = await computeCommitment(secret, nullifier, amountScaled, recipientBigInt);

            const circuitInputs = {
                commitment,
                nullifierHash,
                recipient: recipientBigInt,
                amount: amountScaled,
                secret,
                nullifier,
            };

            // Circuit files — try multiple paths (dev vs Docker)
            const circuitBase = path.join(process.cwd(), '../../packages/circuits');
            const containerBase = path.join(process.cwd(), 'circuits');

            let wasmPath = path.join(circuitBase, 'paypol_shield_v2_js', 'paypol_shield_v2.wasm');
            let zkeyPath = path.join(circuitBase, 'paypol_shield_v2_final.zkey');

            if (!fs.existsSync(wasmPath)) {
                wasmPath = path.join(containerBase, 'paypol_shield_v2.wasm');
                zkeyPath = path.join(containerBase, 'paypol_shield_v2_final.zkey');
            }

            if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
                return NextResponse.json({
                    error: 'ZK circuit files not found',
                    hint: `Tried: ${wasmPath}. Copy from packages/circuits/`,
                }, { status: 500 });
            }

            console.log(`[Shield API] Generating PLONK proof for commitment: ${commitment.slice(0, 20)}...`);

            // Generate real PLONK ZK proof
            const { proof, publicSignals } = await snarkjs.plonk.fullProve(circuitInputs, wasmPath, zkeyPath);
            const calldata = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
            const calldataStr = String(calldata);

            const splitIndex = calldataStr.indexOf('][');
            if (splitIndex === -1) throw new Error("Invalid PLONK calldata format from snarkjs");

            const proofArray: string[] = JSON.parse(calldataStr.substring(0, splitIndex + 1));
            const pubSignals: string[] = JSON.parse(calldataStr.substring(splitIndex + 1));

            console.log(`[Shield API] PLONK proof generated successfully. ${proofArray.length} proof elements, ${pubSignals.length} public signals.`);

            return NextResponse.json({
                success: true,
                proof: proofArray,
                pubSignals,
                commitment,
                nullifierHash,
            });
        }

        // ═══════════════════════════════════════════════════════════
        // DEFAULT: Legacy vault creation (backward compat)
        // ═══════════════════════════════════════════════════════════
        const { salary, fee, recipientWallet, workspaceId, shieldEnabled } = body;

        let validWorkspaceId = workspaceId;
        if (!validWorkspaceId) {
            const existingWorkspace = await prisma.workspace.findFirst();
            if (existingWorkspace) {
                validWorkspaceId = existingWorkspace.id;
            } else {
                const fallbackWs = await prisma.workspace.create({
                    data: { name: "PayPol Vault", adminWallet: "0xAdmin" + Date.now() }
                });
                validWorkspaceId = fallbackWs.id;
            }
        }

        let finalCommitment = "";
        let finalProof = "N/A";

        if (shieldEnabled) {
            const secret = generateRandomSecret();
            const nullifier = generateRandomSecret();
            const amountScaled = BigInt(Math.round(Number(salary) * 1_000_000)).toString();
            const recipientBig = BigInt(
                (recipientWallet || "0x0000000000000000000000000000000000000001").toLowerCase()
            ).toString();

            const { commitment, nullifierHash } = await computeCommitment(secret, nullifier, amountScaled, recipientBig);
            finalCommitment = commitment;

            // Store secrets for daemon to later generate ZK proof
            finalProof = JSON.stringify({ secret, nullifier, nullifierHash, amountScaled });

            console.log(`[Shield API] Real Poseidon commitment: ${finalCommitment.slice(0, 20)}...`);
        } else {
            finalCommitment = `Public-Cleartext-${Number(salary).toFixed(3)}-AlphaUSD`;
        }

        const vaultedData = await prisma.timeVaultPayload.create({
            data: {
                workspaceId: validWorkspaceId,
                recipientWallet: recipientWallet || "0xUnknown",
                isShielded: shieldEnabled,
                zkCommitment: finalCommitment,
                zkProof: finalProof,
                amount: Number(salary),
                status: "Vaulted"
            }
        });

        return NextResponse.json({ success: true, data: vaultedData });

    } catch (error: any) {
        console.error("❌ SHIELD API ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
