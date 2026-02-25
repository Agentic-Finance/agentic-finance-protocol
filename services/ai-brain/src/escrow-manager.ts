/**
 * Escrow Manager - On-chain escrow integration for orchestrator workflows
 *
 * Creates NexusV2 escrow jobs for each workflow step, providing:
 * - Trustless fund locking before agent execution
 * - Automatic settlement after successful completion
 * - Refund on failure or timeout
 */

import { ethers } from 'ethers';

// ── Types ────────────────────────────────────────────────────

export interface EscrowRecord {
  onChainJobId: string | null;
  stepId: number;
  agentId: string;
  amount: string;
  status: 'locked' | 'settled' | 'refunded' | 'failed';
  txHash?: string;
}

// ── Contract Config ──────────────────────────────────────────

const RPC_URL = 'https://rpc.moderato.tempo.xyz';
const NEXUS_V2_ADDRESS = '0x6A467Cd4156093bB528e448C04366586a1052Fab';
const DEFAULT_TOKEN = '0x20c0000000000000000000000000000000000001'; // AlphaUSD
const TOKEN_DECIMALS = 6;

const NEXUS_V2_ABI = [
  'function createJob(address _worker, address _judge, address _token, uint256 _amount, uint256 _deadlineDuration) external returns (uint256)',
  'function settleJob(uint256 _jobId) external',
  'function refundJob(uint256 _jobId) external',
  'event JobCreated(uint256 indexed jobId, address indexed employer, address indexed worker, uint256 budget, uint256 deadline)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// ── Agent Price Map (in USD, will be converted to AlphaUSD) ──

const AGENT_PRICES: Record<string, number> = {
  'contract-auditor':    150,
  'token-deployer':      350,
  'contract-deploy-pro': 280,
  'payroll-planner':     3,
  'escrow-manager':      5,
  'shield-executor':     10,
  'yield-optimizer':     50,
  'gas-predictor':       2,
  'risk-analyzer':       30,
};

// ── Escrow Manager Class ─────────────────────────────────────

export class EscrowManager {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;
  private nexus: ethers.Contract | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL, {
      name: 'tempo-moderato',
      chainId: 42431,
    });
  }

  private ensureWallet(): ethers.Wallet {
    if (!this.wallet) {
      const pk = process.env.DAEMON_PRIVATE_KEY;
      if (!pk) throw new Error('DAEMON_PRIVATE_KEY not set');
      this.wallet = new ethers.Wallet(pk, this.provider);
      this.nexus = new ethers.Contract(NEXUS_V2_ADDRESS, NEXUS_V2_ABI, this.wallet);
    }
    return this.wallet;
  }

  private getNexus(): ethers.Contract {
    this.ensureWallet();
    return this.nexus!;
  }

  /**
   * Lock escrow for a workflow step.
   * Creates a NexusV2 job with the agent's price as budget.
   */
  async lockEscrowForStep(agentId: string, callerWallet: string, stepId: number): Promise<EscrowRecord> {
    const wallet = this.ensureWallet();
    const price = AGENT_PRICES[agentId] || 10; // Default $10 if agent price unknown
    const amountWei = ethers.parseUnits(String(price), TOKEN_DECIMALS);

    console.log(`[escrow] Locking ${price} AlphaUSD for agent '${agentId}' (step ${stepId})...`);

    try {
      // Approve NexusV2 to spend tokens
      const token = new ethers.Contract(DEFAULT_TOKEN, ERC20_ABI, wallet);
      const currentAllowance: bigint = await token.allowance(wallet.address, NEXUS_V2_ADDRESS);
      if (currentAllowance < amountWei) {
        const nonce = await this.provider.getTransactionCount(wallet.address, 'pending');
        const approveTx = await token.approve(NEXUS_V2_ADDRESS, ethers.MaxUint256, {
          nonce, gasLimit: 100_000, type: 0,
        });
        await approveTx.wait(1);
        console.log(`[escrow] ERC20 approved for NexusV2`);
      }

      // Create escrow job
      // Worker = agent's wallet (daemon for now), Judge = daemon
      const nexus = this.getNexus();
      const nonce = await this.provider.getTransactionCount(wallet.address, 'pending');
      const deadlineSeconds = 3600; // 1 hour deadline for agent tasks

      const tx = await nexus.createJob(
        wallet.address,    // worker (self for demo - in prod this would be agent wallet)
        wallet.address,    // judge (daemon)
        DEFAULT_TOKEN,
        amountWei,
        deadlineSeconds,
        { nonce, gasLimit: 500_000, type: 0 },
      );

      const receipt = await tx.wait(1);

      // Parse JobCreated event
      const iface = new ethers.Interface([
        'event JobCreated(uint256 indexed jobId, address indexed employer, address indexed worker, uint256 budget, uint256 deadline)',
      ]);
      let jobId: string | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed?.name === 'JobCreated') {
            jobId = parsed.args.jobId.toString();
            break;
          }
        } catch { /* skip */ }
      }

      console.log(`[escrow] Escrow locked! Job #${jobId}, TX: ${receipt.hash}`);

      return {
        onChainJobId: jobId,
        stepId,
        agentId,
        amount: `${price} AlphaUSD`,
        status: 'locked',
        txHash: receipt.hash,
      };
    } catch (err: any) {
      console.error(`[escrow] Lock failed:`, err.reason || err.message);
      return {
        onChainJobId: null,
        stepId,
        agentId,
        amount: `${price} AlphaUSD`,
        status: 'failed',
      };
    }
  }

  /**
   * Settle an escrow after successful agent execution.
   */
  async settleEscrow(escrow: EscrowRecord): Promise<void> {
    if (!escrow.onChainJobId || escrow.status !== 'locked') return;

    const wallet = this.ensureWallet();
    const nexus = this.getNexus();

    try {
      const nonce = await this.provider.getTransactionCount(wallet.address, 'pending');
      const tx = await nexus.settleJob(escrow.onChainJobId, {
        nonce, gasLimit: 300_000, type: 0,
      });
      await tx.wait(1);
      escrow.status = 'settled';
      escrow.txHash = tx.hash;
      console.log(`[escrow] Job #${escrow.onChainJobId} settled`);
    } catch (err: any) {
      console.error(`[escrow] Settlement failed for job #${escrow.onChainJobId}:`, err.reason || err.message);
    }
  }

  /**
   * Refund an escrow after failed agent execution.
   */
  async refundEscrow(escrow: EscrowRecord): Promise<void> {
    if (!escrow.onChainJobId || escrow.status !== 'locked') return;

    const wallet = this.ensureWallet();
    const nexus = this.getNexus();

    try {
      const nonce = await this.provider.getTransactionCount(wallet.address, 'pending');
      const tx = await nexus.refundJob(escrow.onChainJobId, {
        nonce, gasLimit: 300_000, type: 0,
      });
      await tx.wait(1);
      escrow.status = 'refunded';
      escrow.txHash = tx.hash;
      console.log(`[escrow] Job #${escrow.onChainJobId} refunded`);
    } catch (err: any) {
      console.error(`[escrow] Refund failed for job #${escrow.onChainJobId}:`, err.reason || err.message);
    }
  }
}
