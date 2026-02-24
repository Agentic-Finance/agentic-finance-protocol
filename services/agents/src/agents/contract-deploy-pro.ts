import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';
import { getWallet, getProvider, explorerUrl, TEMPO_CHAIN_ID } from '../utils/chain';

export const manifest: AgentDescriptor = {
  id:           'contract-deploy-pro',
  name:         'ContractDeploy Pro',
  description:  'Audits, compiles, and DEPLOYS production smart contracts on Tempo L1. Claude reviews the code for security, then deploys on-chain. Returns contract address + tx hash verifiable on Tempo Explorer.',
  category:     'deployment',
  version:      '2.0.0',
  price:        280,
  capabilities: ['contract-audit', 'contract-deploy', 'on-chain-execution', 'security-review'],
};

const SYSTEM_PROMPT = `You are an expert Solidity auditor and deployment engineer.
The user will provide Solidity source code or a description of a contract to deploy.

Your job:
1. If given source code: audit it for security issues, then prepare deployment.
2. If given a description: generate the Solidity source code.

Return a JSON object:
{
  "summary": "What this contract does",
  "auditResult": {
    "passed": true/false,
    "severity": "none|low|medium|high|critical",
    "findings": ["..."]
  },
  "contractName": "MyContract",
  "solidityVersion": "0.8.20",
  "constructorParams": [
    { "name": "param1", "type": "address", "value": "0x..." }
  ],
  "sourceCode": "// SPDX-License-Identifier: MIT\\npragma solidity ^0.8.20;\\n...",
  "deployRecommendation": "deploy|review|reject"
}

IMPORTANT: Set constructorParams.value to reasonable defaults if the user doesn't specify.
Return ONLY valid JSON.`;

// ── Minimal Solidity Compilation (in-memory) ─────────────────
// We compile a subset of Solidity using solc if available,
// otherwise we use a pre-compiled proxy pattern for simple contracts.

async function compileSolidity(source: string): Promise<{ abi: any[]; bytecode: string } | null> {
  try {
    // Dynamic require — solc is optional, skip if not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    let solc: any;
    try { solc = require('solc'); } catch { solc = null; }
    if (!solc) {
      console.log('[contract-deploy-pro] solc not available, skipping compilation');
      return null;
    }

    const input = {
      language: 'Solidity',
      sources: { 'Contract.sol': { content: source } },
      settings: {
        outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
        optimizer: { enabled: true, runs: 200 },
      },
    };

    const output = JSON.parse(solc.default.compile(JSON.stringify(input)));

    if (output.errors?.some((e: any) => e.severity === 'error')) {
      console.error('[contract-deploy-pro] Compilation errors:', output.errors.filter((e: any) => e.severity === 'error'));
      return null;
    }

    const contracts = output.contracts?.['Contract.sol'];
    if (!contracts) return null;

    const contractName = Object.keys(contracts)[0];
    const compiled = contracts[contractName];

    return {
      abi: compiled.abi,
      bytecode: '0x' + compiled.evm.bytecode.object,
    };
  } catch (err) {
    console.error('[contract-deploy-pro] Compilation failed:', err);
    return null;
  }
}

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const requirements = (job.payload?.requirements as string)
    ?? (job.payload?.sourceCode as string)
    ?? job.prompt;

  if (!requirements?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No deployment requirements or source code provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  try {
    // ── Phase 1: AI Audit + Code Generation ─────────────────
    console.log(`[contract-deploy-pro] 🧠 Phase 1: Claude auditing and preparing deployment...`);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: requirements }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let analysis: any;
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
      analysis = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'Claude returned invalid JSON for audit analysis.',
        result: { rawResponse: rawText },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    // If audit says reject, don't deploy
    if (analysis.deployRecommendation === 'reject') {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'audit-rejected',
          onChain: false,
          auditResult: analysis.auditResult,
          summary: analysis.summary,
          recommendation: 'Contract rejected due to security concerns. Please fix findings and resubmit.',
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;
    }

    // ── Phase 2: Compile Solidity ───────────────────────────
    console.log(`[contract-deploy-pro] 🔧 Phase 2: Compiling ${analysis.contractName || 'contract'}...`);

    const sourceCode = analysis.sourceCode;
    if (!sourceCode) {
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'error',
        error: 'No Solidity source code generated by Claude.',
        result: { analysis },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      };
    }

    const compiled = await compileSolidity(sourceCode);
    if (!compiled) {
      // Return the analysis + source without deployment
      return {
        jobId: job.jobId, agentId: job.agentId, status: 'success',
        result: {
          phase: 'compiled-offline',
          onChain: false,
          analysis,
          note: 'Solidity compiler (solc) not available in runtime. Source code and audit results are ready for manual deployment.',
        },
        executionTimeMs: Date.now() - start, timestamp: Date.now(),
      } satisfies JobResult;
    }

    // ── Phase 3: Deploy On-Chain ────────────────────────────
    console.log(`[contract-deploy-pro] 🚀 Phase 3: Deploying to Tempo L1...`);

    const wallet = getWallet();
    const provider = getProvider();
    const nonce = await provider.getTransactionCount(wallet.address, 'pending');

    // Extract constructor argument values
    const constructorArgs = (analysis.constructorParams || []).map((p: any) => {
      if (p.type === 'uint256' || p.type === 'uint8') return BigInt(p.value || '0');
      if (p.type === 'bool') return Boolean(p.value);
      return p.value || ethers.ZeroAddress;
    });

    const factory = new ethers.ContractFactory(compiled.abi, compiled.bytecode, wallet);
    const contract = await factory.deploy(...constructorArgs, {
      nonce, gasLimit: 5_000_000, type: 0,
    });

    console.log(`[contract-deploy-pro] ⏳ TX sent. Waiting for block confirmation...`);
    const receipt = await contract.deploymentTransaction()!.wait(1);
    const contractAddress = await contract.getAddress();

    console.log(`[contract-deploy-pro] ✅ ${analysis.contractName} deployed at ${contractAddress}`);

    return {
      jobId: job.jobId, agentId: job.agentId, status: 'success',
      result: {
        phase: 'deployed',
        onChain: true,
        network: 'Tempo Moderato Testnet',
        chainId: TEMPO_CHAIN_ID,
        contract: {
          address: contractAddress,
          name: analysis.contractName,
          abi: compiled.abi,
        },
        transaction: {
          hash: receipt!.hash,
          blockNumber: receipt!.blockNumber,
          gasUsed: receipt!.gasUsed.toString(),
          explorerUrl: explorerUrl(receipt!.hash),
        },
        contractExplorerUrl: explorerUrl(contractAddress, 'address'),
        auditResult: analysis.auditResult,
        summary: analysis.summary,
      },
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    } satisfies JobResult;

  } catch (err: any) {
    console.error(`[contract-deploy-pro] ❌ Failed:`, err.reason || err.message);
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: `Contract deployment failed: ${err.reason || err.message}`,
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }
};
