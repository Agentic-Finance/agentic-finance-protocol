/**
 * Agentic Finance — Sanctions Oracle
 *
 * Automated service that:
 * 1. Downloads real OFAC SDN crypto addresses (from GitHub mirror, updated nightly)
 * 2. Builds a Sparse Merkle Tree with Poseidon hashing
 * 3. Publishes the tree root to ComplianceRegistry on-chain
 * 4. Stores the tree locally for proof generation
 *
 * Runs daily via cron or manual trigger.
 *
 * Data source: github.com/0xB10C/ofac-sanctioned-digital-currency-addresses
 * (Auto-updated nightly from official OFAC SDN list)
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const RPC_URL = process.env.RPC_URL || 'https://rpc.moderato.tempo.xyz';
const PRIVATE_KEY = process.env.DAEMON_PRIVATE_KEY || process.env.BOT_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
const COMPLIANCE_REGISTRY = process.env.COMPLIANCE_REGISTRY_ADDRESS || '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14';

// OFAC data source — auto-updated nightly from official OFAC SDN list
const OFAC_ETH_URL = 'https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.txt';

const REGISTRY_ABI = [
    'function updateSanctionsRoot(uint256 _newRoot) external',
    'function sanctionsRoot() external view returns (uint256)',
    'function sanctionsRootUpdatedAt() external view returns (uint256)',
    'function owner() external view returns (address)',
];

const TREE_CACHE_PATH = path.join(__dirname, 'sanctions-tree-cache.json');

interface SanctionsData {
    addresses: string[];
    treeRoot: string;
    fetchedAt: string;
    addressCount: number;
    source: string;
}

/**
 * Fetch OFAC sanctioned Ethereum addresses
 */
async function fetchOFACAddresses(): Promise<string[]> {
    console.log('[Oracle] Fetching OFAC sanctioned ETH addresses...');

    const response = await fetch(OFAC_ETH_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch OFAC list: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const addresses = text
        .split('\n')
        .map(line => line.trim().toLowerCase())
        .filter(line => line.startsWith('0x') && line.length === 42);

    console.log(`[Oracle] Found ${addresses.length} sanctioned ETH addresses`);
    return addresses;
}

/**
 * Build Sparse Merkle Tree from addresses
 * Uses circomlibjs for Poseidon-compatible SMT
 */
async function buildSanctionsTree(addresses: string[]): Promise<{ root: string; tree: any }> {
    console.log('[Oracle] Building Sparse Merkle Tree...');

    // Dynamic import for ESM modules
    const { newMemEmptyTrie } = await import('circomlibjs');
    const tree = await newMemEmptyTrie();

    let inserted = 0;
    for (const addr of addresses) {
        try {
            const addrBigInt = BigInt(addr);
            await tree.insert(addrBigInt, BigInt(1));
            inserted++;
        } catch (e: any) {
            console.warn(`[Oracle] Skipped invalid address: ${addr} — ${e.message}`);
        }
    }

    const root = tree.F.toObject(tree.root).toString();
    console.log(`[Oracle] SMT built: ${inserted} addresses, root: ${root.slice(0, 20)}...`);

    return { root, tree };
}

/**
 * Publish tree root to ComplianceRegistry on-chain
 */
async function publishRoot(root: string): Promise<string | null> {
    if (!PRIVATE_KEY) {
        console.error('[Oracle] No private key configured — cannot publish on-chain');
        return null;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const registry = new ethers.Contract(COMPLIANCE_REGISTRY, REGISTRY_ABI, wallet);

    // Check current root
    const currentRoot = (await registry.sanctionsRoot()).toString();
    if (currentRoot === root) {
        console.log('[Oracle] Root unchanged — no update needed');
        return null;
    }

    console.log(`[Oracle] Publishing new sanctions root on-chain...`);
    console.log(`[Oracle]   Old root: ${currentRoot.slice(0, 20)}...`);
    console.log(`[Oracle]   New root: ${root.slice(0, 20)}...`);

    const tx = await registry.updateSanctionsRoot(root, { type: 0 });
    const receipt = await tx.wait();

    console.log(`[Oracle] Root updated! TX: ${receipt?.hash}`);
    return receipt?.hash || null;
}

/**
 * Cache tree data locally for proof generation
 */
function cacheTreeData(data: SanctionsData): void {
    fs.writeFileSync(TREE_CACHE_PATH, JSON.stringify(data, null, 2));
    console.log(`[Oracle] Tree cached at ${TREE_CACHE_PATH}`);
}

/**
 * Load cached tree data
 */
function loadCachedTree(): SanctionsData | null {
    if (!fs.existsSync(TREE_CACHE_PATH)) return null;
    try {
        return JSON.parse(fs.readFileSync(TREE_CACHE_PATH, 'utf-8'));
    } catch {
        return null;
    }
}

/**
 * Main oracle execution
 */
async function runOracle(): Promise<void> {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('  Agentic Finance — Sanctions Oracle');
    console.log('  OFAC SDN List → SMT → On-Chain Root');
    console.log('═══════════════════════════════════════════════');
    console.log('');

    try {
        // 1. Fetch OFAC addresses
        const addresses = await fetchOFACAddresses();

        if (addresses.length === 0) {
            console.error('[Oracle] No addresses fetched — aborting');
            return;
        }

        // 2. Build SMT
        const { root } = await buildSanctionsTree(addresses);

        // 3. Cache locally
        const data: SanctionsData = {
            addresses,
            treeRoot: root,
            fetchedAt: new Date().toISOString(),
            addressCount: addresses.length,
            source: OFAC_ETH_URL,
        };
        cacheTreeData(data);

        // 4. Publish on-chain
        const txHash = await publishRoot(root);

        // Summary
        console.log('');
        console.log('═══════════════════════════════════════════════');
        console.log('  Oracle Run Complete');
        console.log(`  Addresses: ${addresses.length}`);
        console.log(`  Tree Root: ${root.slice(0, 20)}...`);
        console.log(`  TX Hash:   ${txHash || 'no update needed'}`);
        console.log(`  Time:      ${new Date().toISOString()}`);
        console.log('═══════════════════════════════════════════════');
        console.log('');

    } catch (error: any) {
        console.error('[Oracle] FATAL ERROR:', error.message);
        process.exit(1);
    }
}

// Execute
runOracle().then(() => process.exit(0));
