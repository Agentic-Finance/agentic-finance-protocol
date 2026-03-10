/**
 * Formatting Utilities for PayPol Protocol
 *
 * Consistent number/amount formatting across the entire app.
 * Replaces inconsistent .toFixed(2), .toFixed(3), .toFixed(6) calls.
 */

/** Token display configuration */
interface TokenConfig {
    symbol: string;
    decimals: number;
    /** Max fraction digits for display (may differ from on-chain decimals) */
    displayDecimals?: number;
}

/** Known token display settings */
const TOKEN_DISPLAY: Record<string, { displayDecimals: number }> = {
    AlphaUSD: { displayDecimals: 2 },
    pathUSD:  { displayDecimals: 2 },
    BetaUSD:  { displayDecimals: 2 },
    ThetaUSD: { displayDecimals: 2 },
    TEMPO:    { displayDecimals: 4 },
    ETH:      { displayDecimals: 6 },
};

/**
 * Format a token amount for display with consistent precision.
 *
 * @param value - The numeric amount
 * @param tokenSymbol - Token symbol (e.g., "AlphaUSD")
 * @param opts - Override options
 * @returns Formatted string (e.g., "1,234.56")
 *
 * @example
 *   formatAmount(1234.567, 'AlphaUSD')     → "1,234.57"
 *   formatAmount(0.000045, 'ETH')           → "0.000045"
 *   formatAmount(1000000, 'AlphaUSD')       → "1,000,000.00"
 */
export function formatAmount(
    value: number | string,
    tokenSymbol = 'AlphaUSD',
    opts?: { compact?: boolean; showSymbol?: boolean; maxDecimals?: number }
): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (!Number.isFinite(num)) return '0.00';

    const config = TOKEN_DISPLAY[tokenSymbol] || { displayDecimals: 2 };
    const maxDecimals = opts?.maxDecimals ?? config.displayDecimals;

    if (opts?.compact && Math.abs(num) >= 1000) {
        return formatCompact(num, maxDecimals);
    }

    const formatted = num.toLocaleString('en-US', {
        minimumFractionDigits: Math.min(2, maxDecimals),
        maximumFractionDigits: maxDecimals,
    });

    return opts?.showSymbol ? `${formatted} ${tokenSymbol}` : formatted;
}

/**
 * Format large numbers compactly: 1.2K, 3.5M, etc.
 */
function formatCompact(num: number, decimals: number): string {
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';

    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(Math.min(decimals, 2))}B`;
    if (abs >= 1_000_000)     return `${sign}${(abs / 1_000_000).toFixed(Math.min(decimals, 2))}M`;
    if (abs >= 1_000)         return `${sign}${(abs / 1_000).toFixed(Math.min(decimals, 1))}K`;
    return num.toFixed(decimals);
}

/**
 * Format a percentage value consistently.
 * @example formatPercent(98.625) → "98.63%"
 */
export function formatPercent(value: number, decimals = 2): string {
    if (!Number.isFinite(value)) return '0%';
    return `${value.toFixed(decimals)}%`;
}

/**
 * Format a wallet address for display (truncated).
 * @example formatAddress("0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793") → "0x33F7...0793"
 */
export function formatAddress(address: string, chars = 4): string {
    if (!address || address.length < 10) return address || '';
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a time duration in seconds to human-readable.
 * @example formatDuration(90) → "1m 30s"
 */
export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

/**
 * Format a date relative to now.
 * @example formatRelativeTime(new Date(Date.now() - 120000)) → "2 minutes ago"
 */
export function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = Date.now();
    const diff = now - d.getTime();

    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
