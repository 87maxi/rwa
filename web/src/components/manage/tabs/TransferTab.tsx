/**
 * TransferTab.tsx
 * 
 * Tab para operaciones de transferencia de tokens.
 * Orquesta BaseTransferForm con useTransferOperations.
 */

import React, { useState, useCallback } from 'react';
import { BaseTransferForm } from '../forms';
import { ResultDisplay } from '../ui';
import { useTransferOperations, type TransactionResult } from '@/hooks/useTransferOperations';

// ============================================================================
// Types
// ============================================================================

interface TransferTabProps {
  tokenStatePda: string | null;
  currentAuthority: import('@solana/web3.js').PublicKey | null;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function TransferTab({
  tokenStatePda,
  currentAuthority,
  onSuccess,
  onError,
}: TransferTabProps) {
  const [lastResult, setLastResult] = useState<TransactionResult | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const {
    transferTokens,
    mintTokens,
    burnTokens,
    loading,
    error,
    signature,
    reset,
  } = useTransferOperations({
    tokenStatePda,
    onSuccess: (sig) => {
      onSuccess?.(`Transaction submitted: ${sig}`);
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  const handleTransfer = useCallback(async (
    recipientAddr: string,
    amountNum: number
  ): Promise<TransactionResult> => {
    return transferTokens(recipientAddr, amountNum);
  }, [transferTokens]);

  const handleMint = useCallback(async (
    recipientAddr: string,
    amountNum: number
  ): Promise<TransactionResult> => {
    return mintTokens(recipientAddr, amountNum);
  }, [mintTokens]);

  const handleBurn = useCallback(async (
    recipientAddr: string,
    amountNum: number
  ): Promise<TransactionResult> => {
    return burnTokens(recipientAddr, amountNum);
  }, [burnTokens]);

  const resultFields = currentAuthority ? [
    {
      label: 'Token State',
      value: tokenStatePda ?? '-',
      copyable: true,
    },
    {
      label: 'Autoridad',
      value: currentAuthority.toBase58(),
      copyable: true,
    },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setLastResult(null); reset(); }}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-surface-border text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
        >
          Limpiar Resultado
        </button>
      </div>

      <BaseTransferForm
        operation="transfer"
        recipient={recipient}
        onRecipientChange={setRecipient}
        amount={amount}
        onAmountChange={setAmount}
        onExecute={handleTransfer}
        isLoading={loading}
      />

      {lastResult && (
        <ResultDisplay
          data={resultFields}
          title="Resultado"
          loading={lastResult.loading}
          onRefresh={reset}
        />
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
