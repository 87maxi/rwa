/**
 * Wallet Abstraction Layer - Types and Interfaces
 *
 * Centralized type definitions for the wallet provider system.
 * Provides a unified interface that is agnostic to the underlying
 * wallet implementation or browser extension.
 */

import type { PublicKey, Connection, Transaction, Commitment } from '@solana/web3.js';
import type { WalletAdapter } from '@solana/wallet-adapter-base';
import type { NetworkType } from '@/config/solana';

// ============================================================================
// Wallet Status and State
// ============================================================================

/**
 * Current status of the wallet connection
 */
export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Information about an available wallet
 */
import type { WalletReadyState } from '@solana/wallet-adapter-base';

export interface WalletInfo {
  name: string;
  icon: string | null;
  url: string | null;
  readyState: WalletReadyState;
  adapter: WalletAdapter;
}

// ============================================================================
// Connection Results
// ============================================================================

/**
 * Result of a connection attempt
 */
export interface ConnectionResult {
  success: boolean;
  publicKey: PublicKey | null;
  wallet: string | null;
  error: string | null;
}

// ============================================================================
// Transaction Results
// ============================================================================

/**
 * Detailed result of a transaction execution
 */
export interface TransactionResult {
  signature: string;
  blockhash: string;
  blockHeight: number;
  commitment: Commitment;
  logs: string[];
  error: string | null;
}

/**
 * Data about a transaction being built
 */
export interface TransactionBuildData {
  programId: string;
  instructions: number;
  accounts: string[];
  data: string;
  feePayer: string;
  recentBlockhash: string;
}

// ============================================================================
// Logging System
// ============================================================================

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log categories
 */
export type LogCategory = 'wallet' | 'transaction' | 'network' | 'error' | 'ethereum';

/**
 * Single log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /** Enable/disable logging (default: true) */
  enabled?: boolean;
  /** Minimum log level to display (default: 'debug') */
  minLevel?: LogLevel;
  /** Maximum number of entries to keep in memory (default: 1000) */
  maxEntries?: number;
  /** Prefix for all log messages (default: '[Wallet]') */
  prefix?: string;
}

/**
 * Connection event data
 */
export interface ConnectionEvent {
  wallet: string | null;
  status: WalletStatus;
  publicKey?: PublicKey | null;
  error?: string | null;
}

/**
 * Transaction event data
 */
export interface TransactionEvent {
  signature?: string | null;
  programId?: string | null;
  instructions?: number;
  accounts?: string[];
  data?: string;
  blockhash?: string;
  blockHeight?: number;
  commitment?: Commitment;
  logs?: string[];
  error?: string | null;
}

/**
 * Network event data
 */
export interface NetworkEvent {
  endpoint: string;
  method: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  error?: string | null;
}

/**
 * Error event data
 */
export interface ErrorEvent {
  category: LogCategory;
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
}

// ============================================================================
// Ethereum Shield
// ============================================================================

/**
 * Status of window.ethereum conflicts
 */
export interface ConflictStatus {
  hasConflict: boolean;
  providers: string[];
  recommendation: string;
}

/**
 * Information about an injected provider
 */
export interface InjectedProvider {
  name: string;
  type: 'ethereum' | 'solana' | 'wallet-standard';
  icon?: string;
  rdns?: string;
}

// ============================================================================
// Wallet Context
// ============================================================================

/**
 * Complete wallet context interface
 */
export interface WalletContextType {
  // Connection state
  status: WalletStatus;
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  currentWallet: string | null;
  availableWallets: WalletInfo[];

  // Connection actions
  connect: (walletName?: string) => Promise<ConnectionResult>;
  disconnect: () => Promise<void>;
  selectWallet: (walletName: string) => boolean;

  // Transaction actions
  signAndSend: (transaction: Transaction) => Promise<TransactionResult>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;

  // Network state
  network: NetworkType;
  endpoint: string;
  connection: Connection;

  // Logger
  logger: WalletLoggerInterface;

  // Ethereum Shield
  ethereumShield: EthereumShieldInterface;
}

/**
 * Wallet Logger interface
 */
export interface WalletLoggerInterface {
  logConnection(event: ConnectionEvent): void;
  logTransaction(event: TransactionEvent): void;
  logNetwork(event: NetworkEvent): void;
  logError(event: ErrorEvent): void;
  logEthereum(message: string, data?: Record<string, unknown>): void;
  debug(category: LogCategory, message: string, data?: Record<string, unknown>): void;
  info(category: LogCategory, message: string, data?: Record<string, unknown>): void;
  warn(category: LogCategory, message: string, data?: Record<string, unknown>): void;
  error(category: LogCategory, message: string, data?: Record<string, unknown>): void;
  getEntries(): LogEntry[];
  exportLogs(): string;
  clear(): void;
  setLevel(level: LogLevel): void;
}

/**
 * Ethereum Shield interface
 */
export interface EthereumShieldInterface {
  getConflictStatus(): ConflictStatus;
  getInjectedProviders(): InjectedProvider[];
  isShielded(): boolean;
  logStatus(): void;
}
