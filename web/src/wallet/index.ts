/**
 * Wallet Abstraction Layer - Public API
 *
 * Centralized exports for the wallet provider system.
 * All wallet-related imports should come from this module.
 */

// ============================================================================
// Types
// ============================================================================

export type {
  WalletStatus,
  WalletInfo,
  ConnectionResult,
  TransactionResult,
  TransactionBuildData,
  LogLevel,
  LogCategory,
  LogEntry,
  LoggerOptions,
  ConnectionEvent,
  TransactionEvent,
  NetworkEvent,
  ErrorEvent,
  ConflictStatus,
  InjectedProvider,
  WalletContextType,
  WalletLoggerInterface,
  EthereumShieldInterface,
} from './types';

// ============================================================================
// Classes
// ============================================================================

export { WalletLogger } from './logger';
export { EthereumShield } from './ethereum-shield';

// ============================================================================
// Provider and Hook
// ============================================================================

export { WalletProvider, useWalletContext, useWalletContextSafe } from './WalletProvider';
