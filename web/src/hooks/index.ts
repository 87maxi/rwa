export { useSolanaConnection, useWalletBalance } from './useSolanaConnection';
export { useTokenState, type TokenState, type BalanceEntry, type FrozenEntry, type TokenStateResponse, formatBalance } from './useTokenState';
export {
  useTokenActions,
  type TransactionResult,
} from './useTokenActions';
export { useSolanaNotification, type Notification, type NotificationType } from './useSolanaNotification';
export { useWalletErrorHandling } from './useSolanaNotification';
export { useWalletManager } from './useWalletManager';

// Re-export new modular hooks
export { useSolanaTransaction } from './useSolanaTransaction';
export { useComplianceActions } from './useComplianceActions';
export { useIdentityActions } from './useIdentityActions';

// Re-export new modular operation hooks (types only from first export to avoid duplicates)
export { useTransferOperations, type UseTransferOperationsProps } from './useTransferOperations';
export { useAuthorityOperations, type UseAuthorityOperationsProps } from './useAuthorityOperations';
export { useFreezeOperations, type UseFreezeOperationsProps } from './useFreezeOperations';
export { useAgentOperations, type AgentOperationsReturn, type UseAgentOperationsProps } from './useAgentOperations';
export { useComplianceOperations, type ComplianceOperationsReturn, type UseComplianceOperationsProps } from './useComplianceOperations';
export { useIdentityOperations, type UseIdentityOperationsProps } from './useIdentityOperations';
export { useTokenQuery, type UseTokenQueryProps } from './useTokenQuery';
export { useTokenList, type UseTokenListReturn, type UseTokenListProps, type TokenInfo } from './useTokenList';

// Re-export Anchor client utilities
export {
  getIdentityPda,
  type InstructionResult,
} from '@/anchor/client';
