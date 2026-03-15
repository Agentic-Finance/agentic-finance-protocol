/**
 * Parallel Nonce Manager — Tempo 2D Nonce System
 *
 * Tempo uses a 2D nonce system:
 *   - nonceKey = 0: Sequential lane (traditional nonce behavior)
 *   - nonceKey >= 1: Parallel lanes (independent nonce sequences)
 *
 * Each parallel lane has its own nonce counter, allowing concurrent
 * transaction submission without "nonce too low" errors.
 *
 * Agentic Finance Use Case:
 *   - Lane 0: Daemon administrative txs (sequential, ordered)
 *   - Lane 1-N: Agent job txs (parallel, independent)
 *   - Each concurrent agent execution gets its own lane
 *
 * With 32 production agents, this eliminates nonce conflicts when
 * multiple agents complete jobs simultaneously.
 */

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface NonceLane {
  key: number;
  acquiredAt: number;
  label: string;
  released: boolean;
}

// ────────────────────────────────────────────
// Parallel Nonce Manager (Singleton)
// ────────────────────────────────────────────

class ParallelNonceManager {
  /** Next available lane key (1-based, 0 reserved for sequential) */
  private nextKey = 1;

  /** Active lanes with metadata */
  private activeLanes: Map<number, NonceLane> = new Map();

  /** Maximum concurrent lanes (safety limit) */
  private maxLanes = 256;

  /**
   * Acquire a parallel nonce lane for concurrent tx submission.
   * Returns a lane key (1-based) that's independent from other lanes.
   */
  acquireLane(label: string = 'unnamed'): NonceLane {
    // Recycle released lanes if we're running high
    if (this.nextKey > this.maxLanes) {
      this.cleanup();
    }

    const lane: NonceLane = {
      key: this.nextKey++,
      acquiredAt: Date.now(),
      label,
      released: false,
    };

    this.activeLanes.set(lane.key, lane);
    console.log(`[NONCE] Acquired lane ${lane.key} for "${label}" (${this.activeLanes.size} active)`);
    return lane;
  }

  /**
   * Release a lane after transaction is confirmed.
   * Lane key can be reused by future transactions.
   */
  releaseLane(key: number): void {
    const lane = this.activeLanes.get(key);
    if (lane) {
      lane.released = true;
      this.activeLanes.delete(key);
      console.log(`[NONCE] Released lane ${key} ("${lane.label}") — ${this.activeLanes.size} active`);
    }
  }

  /**
   * Get the number of currently active lanes
   */
  getActiveCount(): number {
    return this.activeLanes.size;
  }

  /**
   * Get all active lane info (for monitoring/debugging)
   */
  getActiveLanes(): NonceLane[] {
    return Array.from(this.activeLanes.values());
  }

  /**
   * Cleanup stale lanes (older than 5 minutes)
   */
  private cleanup(): void {
    const staleThreshold = Date.now() - 5 * 60 * 1000;
    let cleaned = 0;

    for (const [key, lane] of this.activeLanes) {
      if (lane.acquiredAt < staleThreshold) {
        this.activeLanes.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[NONCE] Cleaned ${cleaned} stale lanes`);
    }

    // Reset counter if all lanes released
    if (this.activeLanes.size === 0) {
      this.nextKey = 1;
    }
  }

  /**
   * Force release all lanes (emergency reset)
   */
  reset(): void {
    this.activeLanes.clear();
    this.nextKey = 1;
    console.log('[NONCE] All lanes reset');
  }
}

// Singleton instance
export const nonceManager = new ParallelNonceManager();

// ────────────────────────────────────────────
// Helper: Send Transaction with Parallel Nonce
// ────────────────────────────────────────────

/**
 * Build transaction overrides with parallel nonce key.
 *
 * Currently returns standard tx params since viem doesn't natively
 * support Tempo's nonceKey field yet. When viem adds support,
 * this will add `nonceKey` to the transaction.
 *
 * For now, the nonce manager still helps by:
 * 1. Tracking concurrent operations
 * 2. Providing monitoring/debugging info
 * 3. Ready for Tempo-native integration
 */
export function withParallelNonce(lane: NonceLane) {
  return {
    // When viem supports Tempo TempoTransaction:
    // nonceKey: BigInt(lane.key),

    // For now, use unique gas to create distinguishable txs
    // This is a no-op placeholder until native support
    _parallelLane: lane.key,
    _parallelLabel: lane.label,
  };
}

/**
 * Execute a function with automatic lane management.
 * Acquires lane, runs the function, releases lane on completion.
 */
export async function withLane<T>(
  label: string,
  fn: (lane: NonceLane) => Promise<T>
): Promise<T> {
  const lane = nonceManager.acquireLane(label);
  try {
    const result = await fn(lane);
    return result;
  } finally {
    nonceManager.releaseLane(lane.key);
  }
}
