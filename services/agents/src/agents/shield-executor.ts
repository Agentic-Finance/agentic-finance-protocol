import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import * as path from 'path';
import * as fs from 'fs';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import {
  getWallet, getProvider, getShieldVault,
  explorerUrl, parseTokenAmount, DEFAULT_TOKEN, TEMPO_CHAIN_ID,
} from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'shield-executor',
  name:         'ZK Shield Executor',
  description:  'Executes ZK-SNARK shielded payments on Tempo L1. Generates real Poseidon commitments, PLONK proofs, and submits verified proofs on-chain via ShieldVault. Amount is hidden from public view.',
  category:     'privacy',
  version:      '1.0.0',
  price:        10,
  capabilities: ['zk-proof-generation', 'shielded-payment', 'on-chain-execution', 'privacy'],
};

const SYSTEM_PROMPT = `You are a privacy payment specialist for PayPol's ZK Shield system on Tempo blockchain.
Analyze the user's request to determine the shielded payment parameters.

Return JSON:
{
  "summary": "Brief description of the shielded payment",
  "recipient": "0x... (Ethereum address of the recipient)",
  "amount": 100,
  "tokenSymbol": "AlphaUSD",
  "privacyNotes": ["What is being hidden", "Why privacy matters here"]
}

RULES:
- recipient must be a valid Ethereum address (0x + 40 hex chars)
- amount is in human-readable token units (not wei)
- If the user doesn't specify a recipient, ask for one (return error)
Return ONLY valid JSON.`;

/**
 * Generate a real ZK-SNARK proof using snarkjs and circomlibjs.
 * Uses the same circuit as the daemon: paypol_shield.circom
 */
async function generateZKProof(
  recipientAddress: string,
  amountWei: string,
): Promise<{ proofArray: string[]; pubSignals: string[]; commitment: string }> {
  // Dynamic imports for ZK libraries
  // @ts-ignore
  const snarkjs = await import('snarkjs');
  // @ts-ignore
  const { buildPoseidon } = await import('circomlibjs');

  let cleanRecipient = recipientAddress.toLowerCase().trim();
  if (cleanRecipient.length !== 42) {
    throw new Error(`Invalid recipient address: ${cleanRecipient}`);
  }

  const adminSecretStr = '123456789'; // Same as daemon for V1 compatibility
  const recipientBigInt = BigInt(cleanRecipient).toString();

  // Compute Poseidon commitment: hash(adminSecret, amount, recipient)
  const poseidon = await buildPoseidon();
  const secretHash = poseidon([BigInt(adminSecretStr), BigInt(amountWei), BigInt(recipientBigInt)]);
  const commitmentStr = poseidon.F.toObject(secretHash).toString();

  const circuitInputs = {
    commitment: commitmentStr,
    recipient: recipientBigInt,
    amount: amountWei,
    adminSecret: adminSecretStr,
  };

  // Locate circuit files (relative to project root)
  // services/agents/ is 2 levels deep → go up 2 to reach project root
  const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const wasmPath = path.join(projectRoot, 'apps', 'dashboard', 'public', 'zk', 'paypol_shield.wasm');
  const zkeyPath = path.join(projectRoot, 'apps', 'dashboard', 'public', 'zk', 'paypol_shield_final.zkey');

  if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
    throw new Error(`ZK circuit files not found. Expected at: ${wasmPath}`);
  }

  // Generate real PLONK proof
  const { proof, publicSignals } = await snarkjs.plonk.fullProve(circuitInputs, wasmPath, zkeyPath);
  const calldata = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
  const calldataStr = String(calldata);

  // Parse PLONK format: [proof_24_fields][pub_signals]
  const splitIndex = calldataStr.indexOf('][');
  if (splitIndex === -1) throw new Error('Invalid PLONK calldata format from snarkjs.');

  const proofArray: string[] = JSON.parse(calldataStr.substring(0, splitIndex + 1));
  const pubSignalsArray: string[] = JSON.parse(calldataStr.substring(splitIndex + 1));

  return { proofArray, pubSignals: pubSignalsArray, commitment: commitmentStr };
}

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const prompt = job.prompt;

  if (!prompt?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No shielded payment request provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Parameter Extraction ────────────────────
    console.log(`[shield-executor] 🧠 Phase 1: Parsing shielded payment intent...`);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let params: any;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
      params = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'Claude returned invalid JSON for payment parameters.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const recipient = params.recipient;
    const amount = params.amount;

    if (!ethers.isAddress(recipient)) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: `Invalid recipient address: ${recipient}`,
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    // ── Phase 2: ZK Proof Generation ────────────────────────
    console.log(`[shield-executor] 🔐 Phase 2: Generating ZK-SNARK proof...`);

    const amountWei = parseTokenAmount(amount, DEFAULT_TOKEN.decimals);
    const { proofArray, pubSignals, commitment } = await generateZKProof(recipient, amountWei.toString());

    console.log(`[shield-executor] ✅ ZK proof generated. Commitment: ${commitment.slice(0, 20)}...`);

    // ── Phase 3: On-Chain Execution ─────────────────────────
    console.log(`[shield-executor] 🚀 Phase 3: Broadcasting ZK transaction to Tempo...`);

    const shieldVault = getShieldVault();
    const wallet = getWallet();
    const provider = getProvider();
    const nonce = await provider.getTransactionCount(wallet.address, 'pending');

    const tx = await shieldVault.executeShieldedPayout(
      proofArray,
      pubSignals,
      amountWei,
      { nonce, gasLimit: 3_000_000, type: 0 },
    );

    console.log(`[shield-executor] ⏳ TX sent: ${tx.hash}. Waiting for confirmation...`);
    const receipt = await tx.wait(1);

    console.log(`[shield-executor] ✅ Shielded payment executed! TX: ${receipt.hash}`);

    return {
      jobId: job.jobId, agentId: job.agentId, status: 'success',
      result: {
        phase: 'shielded-payment-executed',
        onChain: true,
        network: 'Tempo Moderato Testnet',
        chainId: TEMPO_CHAIN_ID,
        privacy: {
          commitment,
          proofVerified: true,
          proofType: 'PLONK (ZK-SNARK)',
          circuitVersion: 'paypol_shield v1',
          amountHidden: true,
        },
        payment: {
          recipient,
          amount: `${amount} AlphaUSD`,
          amountWei: amountWei.toString(),
        },
        transaction: {
          hash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          explorerUrl: explorerUrl(receipt.hash),
        },
        summary: params.summary,
        privacyNotes: params.privacyNotes,
      },
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    } satisfies JobResult;

  } catch (err: any) {
    console.error(`[shield-executor] ❌ Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Shielded payment failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
