/**
 * Wallet Logger - Centralized logging system for wallet operations
 *
 * Provides structured logging for all wallet, transaction, and network events.
 * All logs follow a standard format and can be exported for debugging.
 *
 * Format:
 * [TIMESTAMP] [LEVEL] [CATEGORY] MESSAGE
 * ├─ key1: value1
 * ├─ key2: value2
 * └─ keyN: valueN
 */

import type {
  LogEntry,
  LogLevel,
  LogCategory,
  LoggerOptions,
  WalletLoggerInterface,
  ConnectionEvent,
  TransactionEvent,
  NetworkEvent,
  ErrorEvent,
} from './types';

// Log level priority for filtering
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Format a log entry for console output
 */
function formatLogEntry(entry: LogEntry, prefix: string): string {
  const header = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}] ${prefix} ${entry.message}`;

  if (!entry.data || Object.keys(entry.data).length === 0) {
    return header;
  }

  const entries = Object.entries(entry.data);
  const lines = [header];

  entries.forEach(([key, value], index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? '└─' : '├─';
    const formattedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    lines.push(`${connector} ${key}: ${formattedValue}`);
  });

  return lines.join('\n');
}

/**
 * Centralized logger for wallet operations
 */
export class WalletLogger implements WalletLoggerInterface {
  private entries: LogEntry[] = [];
  private enabled: boolean;
  private minLevel: LogLevel;
  private maxEntries: number;
  private prefix: string;

  constructor(options?: LoggerOptions) {
    this.enabled = options?.enabled ?? true;
    this.minLevel = options?.minLevel ?? 'debug';
    this.maxEntries = options?.maxEntries ?? 1000;
    this.prefix = options?.prefix ?? '[Wallet]';
  }

  /**
   * Internal log method with level filtering
   */
  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.enabled) return;

    // Filter by minimum level
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data || undefined,
    };

    this.entries.push(entry);

    // Trim old entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Output to console
    const formatted = formatLogEntry(entry, this.prefix);

    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  // ========================================================================
  // Category-specific logging methods
  // ========================================================================

  /**
   * Log a wallet connection event
   */
  logConnection(event: ConnectionEvent): void {
    this.log('info', 'wallet', `Connection: ${event.status}`, {
      wallet: event.wallet || 'none',
      status: event.status,
      publicKey: event.publicKey?.toString()?.slice(0, 12) + '...' || 'none',
      ...(event.error ? { error: event.error } : {}),
    });
  }

  /**
   * Log a transaction event
   */
  logTransaction(event: TransactionEvent): void {
    const data: Record<string, unknown> = {};

    if (event.signature) data.signature = event.signature.slice(0, 32) + '...';
    if (event.programId) data.programId = event.programId;
    if (event.instructions !== undefined) data.instructions = event.instructions;
    if (event.accounts?.length) data.accounts = event.accounts;
    if (event.data) data.data = event.data.slice(0, 64) + '...';
    if (event.blockhash) data.blockhash = event.blockhash.slice(0, 20) + '...';
    if (event.blockHeight) data.blockHeight = event.blockHeight;
    if (event.commitment) data.commitment = event.commitment;
    if (event.logs?.length) data.logs = event.logs.slice(0, 3);
    if (event.error) data.error = event.error;

    this.log('info', 'transaction', `Transaction: ${event.signature ? 'executed' : 'building'}`, data);
  }

  /**
   * Log a network communication event
   */
  logNetwork(event: NetworkEvent): void {
    const data: Record<string, unknown> = {
      endpoint: event.endpoint,
      method: event.method,
    };

    if (event.request) data.request = event.request;
    if (event.response) data.response = event.response;
    if (event.error) data.error = event.error;

    this.log('debug', 'network', `RPC: ${event.method}`, data);
  }

  /**
   * Log an error event
   */
  logError(event: ErrorEvent): void {
    const data: Record<string, unknown> = {};

    if (event.error) {
      data.error = event.error instanceof Error ? event.error.message : String(event.error);
      if (event.error instanceof Error && event.error.stack) {
        data.stack = event.error.stack.split('\n').slice(0, 3).join('; ');
      }
    }

    if (event.context) {
      Object.assign(data, event.context);
    }

    this.log('error', 'error', `${event.category}: ${event.message}`, data);
  }

  /**
   * Log an Ethereum-related event
   */
  logEthereum(message: string, data?: Record<string, unknown>): void {
    this.log('warn', 'ethereum', message, data);
  }

  // ========================================================================
  // Generic logging methods
  // ========================================================================

  /**
   * Debug level log
   */
  debug(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log('debug', category, message, data);
  }

  /**
   * Info level log
   */
  info(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log('info', category, message, data);
  }

  /**
   * Warning level log
   */
  warn(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log('warn', category, message, data);
  }

  /**
   * Error level log
   */
  error(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log('error', category, message, data);
  }

  // ========================================================================
  // Management methods
  // ========================================================================

  /**
   * Get all stored log entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Export logs as formatted JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Clear all stored log entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}
