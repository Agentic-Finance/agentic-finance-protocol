/**
 * Structured Logger for PayPol Protocol
 *
 * Replaces raw console.log/error with structured JSON logging.
 * - Consistent format: { timestamp, level, label, message, ...meta }
 * - Environment-aware: verbose in dev, JSON in production
 * - Label-based filtering for easy debugging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    label: string;
    message: string;
    [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatEntry(entry: LogEntry): string {
    if (process.env.NODE_ENV === 'production') {
        return JSON.stringify(entry);
    }
    // Dev: human-readable
    const { timestamp, level, label, message, ...meta } = entry;
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] [${label}] ${message}${metaStr}`;
}

function log(level: LogLevel, label: string, message: string, meta?: Record<string, unknown>) {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        label,
        message,
        ...meta,
    };

    const formatted = formatEntry(entry);

    switch (level) {
        case 'error': console.error(formatted); break;
        case 'warn': console.warn(formatted); break;
        case 'debug': console.debug(formatted); break;
        default: console.log(formatted);
    }
}

/**
 * Create a scoped logger for a specific module/feature.
 * @example
 *   const log = createLogger('SHIELD_API');
 *   log.info('Processing commitment', { amount: 100 });
 *   log.error('Proof generation failed', { error: err.message });
 */
export function createLogger(label: string) {
    return {
        debug: (msg: string, meta?: Record<string, unknown>) => log('debug', label, msg, meta),
        info: (msg: string, meta?: Record<string, unknown>) => log('info', label, msg, meta),
        warn: (msg: string, meta?: Record<string, unknown>) => log('warn', label, msg, meta),
        error: (msg: string, meta?: Record<string, unknown>) => log('error', label, msg, meta),
    };
}

/** Pre-configured loggers for common modules */
export const logger = {
    api: createLogger('API'),
    shield: createLogger('SHIELD'),
    daemon: createLogger('DAEMON'),
    escrow: createLogger('ESCROW'),
    marketplace: createLogger('MARKETPLACE'),
    polling: createLogger('POLLING'),
    auth: createLogger('AUTH'),
    prisma: createLogger('PRISMA'),
    stream: createLogger('STREAM'),
    fiat: createLogger('FIAT'),
};
