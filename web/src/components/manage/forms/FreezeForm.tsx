/**
 * FreezeForm.tsx
 * 
 * Formulario para freeze/unfreeze de cuentas de tokens.
 * Utiliza el hook useFreezeOperations para ejecutar las transacciones.
 */

import React, { useState, useCallback } from 'react';
import { TokenInput, TransactionButton, ActionCard, ResultDisplay } from '@/components/manage/ui';
import { useFreezeOperations, type FreezeResult } from '@/hooks/useFreezeOperations';
import type { PublicKey } from '@solana/web3.js';

// ============================================================================
// Types
// ============================================================================

export interface FreezeFormProps {
  tokenStatePda: PublicKey;
  currentAuthority: PublicKey;
  freezeAuthorityPda: PublicKey;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function FreezeForm({
  tokenStatePda,
  currentAuthority,
  freezeAuthorityPda,
  onSuccess,
  onError,
  className = '',
}: FreezeFormProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [lastResult, setLastResult] = useState<FreezeResult | null>(null);

  const {
    freezeAccount,
    unfreezeAccount,
    loading,
    error,
    signature,
    reset,
  } = useFreezeOperations({
    tokenStatePda,
    currentAuthority,
    freezeAuthorityPda,
    onSuccess: (sig) => {
      onSuccess?.(`Transaction submitted: ${sig}`);
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  const handleFreeze = useCallback(async () => {
    if (!walletAddress || !isValid) return;

    const freezeResult = await freezeAccount(walletAddress);
    setLastResult(freezeResult);

    if (freezeResult.success) {
      setWalletAddress('');
    }
  }, [walletAddress, isValid, freezeAccount]);

  const handleUnfreeze = useCallback(async () => {
    if (!walletAddress || !isValid) return;

    const freezeResult = await unfreezeAccount(walletAddress);
    setLastResult(freezeResult);

    if (freezeResult.success) {
      setWalletAddress('');
    }
  }, [walletAddress, isValid, unfreezeAccount]);

  const explorerUrl = signature
    ? `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${window.location.host}`
    : undefined;

  const resultFields = [
    {
      label: 'Firmante',
      value: currentAuthority?.toBase58(),
      copyable: true,
    },
    {
      label: 'Cuenta Objetivo',
      value: walletAddress,
      copyable: true,
    },
  ];

  return (
    <div className={className}>
      <ActionCard
        title="Congelar/Descongelar Cuenta"
        description="Congela o descongela una cuenta de tokens. Las cuentas congeladas no pueden realizar transferencias."
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        }
        variant="warning"
      >
        <div className="space-y-4">
          <TokenInput
            value={walletAddress}
            onChange={setWalletAddress}
            onValid={setIsValid}
            label="Dirección de la Cuenta"
            placeholder="Ingrese la dirección de la cuenta a congelar/descongelar"
            required
            name="freeze-wallet"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <TransactionButton
              onClick={handleFreeze}
              disabled={!isValid || loading}
              loading={loading}
              variant="danger"
              aria-label="Congelar cuenta"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Congelar Cuenta
            </TransactionButton>

            <TransactionButton
              onClick={handleUnfreeze}
              disabled={!isValid || loading}
              loading={loading}
              variant="primary"
              aria-label="Descongelar cuenta"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              Descongelar Cuenta
            </TransactionButton>
          </div>
        </div>
      </ActionCard>

      {lastResult && (
        <div className="mt-4">
          <ResultDisplay
            data={resultFields}
            title="Resultado"
            loading={lastResult.loading}
            onRefresh={reset}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
