/**
 * Viem Clients for Tempo Moderato
 * - publicClient: Read-only operations (balances, contract reads, receipts)
 * - getDaemonAccount / getDaemonWalletClient: Server-side signing (daemon wallet)
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Account,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempoModerato } from './chain';

// ────────────────────────────────────────────
// Public Client (read-only, singleton)
// ────────────────────────────────────────────
export const publicClient: PublicClient = createPublicClient({
  chain: tempoModerato,
  transport: http(),
});

// ────────────────────────────────────────────
// Daemon Account (server-side only)
// ────────────────────────────────────────────
let _daemonAccount: Account | null | undefined;

export function getDaemonAccount(): Account | null {
  if (_daemonAccount !== undefined) return _daemonAccount;

  const key =
    process.env.DAEMON_PRIVATE_KEY ||
    process.env.BOT_PRIVATE_KEY ||
    process.env.ADMIN_PRIVATE_KEY;

  if (!key) {
    _daemonAccount = null;
    return null;
  }

  const hex = key.startsWith('0x') ? (key as `0x${string}`) : (`0x${key}` as `0x${string}`);
  _daemonAccount = privateKeyToAccount(hex);
  return _daemonAccount;
}

// ────────────────────────────────────────────
// Daemon Wallet Client (server-side, write ops)
// ────────────────────────────────────────────
let _daemonWalletClient: WalletClient | null | undefined;

export function getDaemonWalletClient(): WalletClient | null {
  if (_daemonWalletClient !== undefined) return _daemonWalletClient;

  const account = getDaemonAccount();
  if (!account) {
    _daemonWalletClient = null;
    return null;
  }

  _daemonWalletClient = createWalletClient({
    account,
    chain: tempoModerato,
    transport: http(),
  });
  return _daemonWalletClient;
}
