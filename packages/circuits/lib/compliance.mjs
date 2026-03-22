/**
 * AgtFi Compliance Proof Library
 *
 * Utility functions for generating and verifying ZK compliance proofs.
 * Used by the daemon and SDK to create proofs that an address:
 *   1. Is NOT on the OFAC sanctions list
 *   2. Transaction amount < AML threshold
 *   3. 30-day cumulative volume < reporting threshold
 *
 * All proofs are generated locally — private data never leaves the device.
 */

import { buildPoseidon } from 'circomlibjs';
import { newMemEmptyTrie } from 'circomlibjs';
import * as snarkjs from 'snarkjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CIRCUITS_DIR = path.join(__dirname, '..');

const WASM_PATH = path.join(CIRCUITS_DIR, 'agtfi_compliance_js', 'agtfi_compliance.wasm');
const ZKEY_PATH = path.join(CIRCUITS_DIR, 'agtfi_compliance_final.zkey');

const SMT_LEVELS = 20;

// Singleton Poseidon instance (cached after first use)
let _poseidon = null;

/**
 * Get or create Poseidon hash instance (singleton)
 */
export async function getPoseidon() {
    if (!_poseidon) {
        _poseidon = await buildPoseidon();
    }
    return _poseidon;
}

/**
 * Build a Sparse Merkle Tree from a list of sanctioned addresses
 *
 * @param {BigInt[]} addresses - Array of sanctioned addresses as BigInt
 * @returns {{ tree, root: string }} - The SMT and its root as string
 */
export async function buildSanctionsTree(addresses) {
    const tree = await newMemEmptyTrie();
    for (const addr of addresses) {
        await tree.insert(BigInt(addr), BigInt(1));
    }
    const root = tree.F.toObject(tree.root).toString();
    return { tree, root };
}

/**
 * Compute a compliance commitment
 * commitment = Poseidon(senderAddress, secret)
 *
 * @param {string|BigInt} senderAddress
 * @param {string|BigInt} secret
 * @returns {string} commitment as string
 */
export async function computeComplianceCommitment(senderAddress, secret) {
    const poseidon = await getPoseidon();
    const hash = poseidon([BigInt(senderAddress), BigInt(secret)]);
    return poseidon.F.toObject(hash).toString();
}

/**
 * Generate a ZK compliance proof
 *
 * @param {Object} params
 * @param {Object} params.tree - Sparse Merkle Tree of sanctioned addresses
 * @param {string|BigInt} params.senderAddress - Address to prove compliance for
 * @param {string|BigInt} params.secret - Random secret for commitment
 * @param {string|BigInt} params.amount - Transaction amount (hidden)
 * @param {string|BigInt} params.cumulativeVolume - 30-day cumulative volume (hidden)
 * @param {string|BigInt} params.sanctionsRoot - Current sanctions tree root
 * @param {string|BigInt} params.amountThreshold - AML per-tx limit
 * @param {string|BigInt} params.volumeThreshold - AML 30-day limit
 * @returns {{ proof, publicSignals, commitment, proofTime }}
 */
export async function generateComplianceProof({
    tree,
    senderAddress,
    secret,
    amount,
    cumulativeVolume,
    sanctionsRoot,
    amountThreshold,
    volumeThreshold,
}) {
    const poseidon = await getPoseidon();
    const F = poseidon.F;

    // Compute commitment
    const commitment = await computeComplianceCommitment(senderAddress, secret);

    // Get SMT non-inclusion proof
    const res = await tree.find(BigInt(senderAddress));
    if (res.found) {
        throw new Error(`COMPLIANCE REJECTED: Address is on the sanctions list`);
    }

    // Build siblings array (padded to SMT_LEVELS)
    const smtSiblings = res.siblings.map(s => F.toObject(s).toString());
    while (smtSiblings.length < SMT_LEVELS) smtSiblings.push("0");

    const input = {
        // Public
        sanctionsRoot: sanctionsRoot.toString(),
        complianceCommitment: commitment,
        amountThreshold: BigInt(amountThreshold).toString(),
        volumeThreshold: BigInt(volumeThreshold).toString(),
        // Private
        senderAddress: BigInt(senderAddress).toString(),
        secret: BigInt(secret).toString(),
        amount: BigInt(amount).toString(),
        cumulativeVolume: BigInt(cumulativeVolume).toString(),
        smtSiblings,
        smtOldKey: res.isOld0 ? "0" : F.toObject(res.notFoundKey).toString(),
        smtOldValue: res.isOld0 ? "0" : F.toObject(res.notFoundValue).toString(),
        smtIsOld0: res.isOld0 ? "1" : "0",
    };

    const t0 = Date.now();
    const { proof, publicSignals } = await snarkjs.plonk.fullProve(input, WASM_PATH, ZKEY_PATH);
    const proofTime = Date.now() - t0;

    return { proof, publicSignals, commitment, proofTime };
}

/**
 * Verify a compliance proof off-chain
 *
 * @param {Object} proof - PLONK proof
 * @param {string[]} publicSignals - Public signals array
 * @returns {boolean} - Whether proof is valid
 */
export async function verifyComplianceProof(proof, publicSignals) {
    const vkey = await snarkjs.zKey.exportVerificationKey(ZKEY_PATH);
    return snarkjs.plonk.verify(vkey, publicSignals, proof);
}

/**
 * Export proof as Solidity calldata for on-chain verification
 *
 * @param {Object} proof - PLONK proof
 * @param {string[]} publicSignals - Public signals
 * @returns {{ proofArray: string[], pubSignalsArray: string[] }}
 */
export async function exportSolidityCalldata(proof, publicSignals) {
    const rawCalldata = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);

    // Parse the calldata string: [proof_24_elements],[pubSignals_4_elements]
    const [proofStr, pubStr] = rawCalldata.split('][');
    const proofArray = proofStr.replace('[', '').split(',').map(s => s.trim().replace(/"/g, ''));
    const pubSignalsArray = pubStr.replace(']', '').split(',').map(s => s.trim().replace(/"/g, ''));

    return { proofArray, pubSignalsArray };
}

/**
 * Generate a random secret for compliance commitment
 * @returns {string} Random 31-byte value as decimal string
 */
export function generateSecret() {
    const bytes = new Uint8Array(31);
    crypto.getRandomValues(bytes);
    let result = BigInt(0);
    for (const b of bytes) {
        result = (result << BigInt(8)) + BigInt(b);
    }
    return result.toString();
}
