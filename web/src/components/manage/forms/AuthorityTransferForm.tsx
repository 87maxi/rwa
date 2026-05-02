/**
 * AuthorityTransferForm.tsx
 *
 * Formulario para transferir owner y freeze authority.
 */

import React, { useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { TokenInput, TransactionButton, ActionCard, ResultDisplay } from '@/components/manage/ui';
import { useAuthorityOperations, type TransactionResult } from '@/hooks/useAuthorityOperations';

// ============================================================================
// Types
// ============================================================================

export interface AuthorityTransferFormProps {
  tokenStatePda: string | null;
  currentAuthority: PublicKey | null;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AuthorityTransferForm({
  tokenStatePda,
  currentAuthority,
  onSuccess,
  onError,
  className = '',
}: AuthorityTransferFormProps) {
  const [newAuthority, setNewAuthority] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [lastResult, setLastResult] = useState<TransactionResult | null>(null);

  const {
    transferOwner,
    transferFreezeAuthority,
    loading,
    error,
    signature,
    reset,
  } = useAuthorityOperations({
    tokenStatePda,
    onSuccess: (sig) => {
      onSuccess?.(`Transaction submitted: ${sig}`);
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  const handleTransferOwner = useCallback(async () => {
    if (!newAuthority || !isValid) return;

    const authResult = await transferOwner(newAuthority);
    setLastResult(authResult);

    if (authResult.success) {
      setNewAuthority('');
    }
  }, [newAuthority, isValid, transferOwner]);

  const handleTransferFreezeAuthority = useCallback(async () => {
    if (!newAuthority || !isValid) return;

    const authResult = await transferFreezeAuthority(newAuthority);
    setLastResult(authResult);

    if (authResult.success) {
      setNewAuthority('');
    }
  }, [newAuthority, isValid, transferFreezeAuthority]);

  const resultFields = [
    {
      label: 'Firmante',
      value: currentAuthority?.toBase58(),
      copyable: true,
    },
    {
      label: 'Nueva Autoridad',
      value: newAuthority || undefined,
      copyable: true,
    },
  ];

  return (
    <div className={className}>
      <ActionCard
        title="Transferir Autoridades"
        description="Transfiere la autoridad de owner o freeze authority a una nueva dirección. Esta acción es irreversible."
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        }
        variant="warning"
      >
        <div className="space-y-4">
          <TokenInput
            value={newAuthority}
            onChange={setNewAuthority}
            onValid={setIsValid}
            label="Nueva Autoridad"
            placeholder="Ingrese la dirección de la nueva autoridad"
            required
            name="new-authority"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <TransactionButton
              onClick={handleTransferOwner}
              disabled={!isValid || loading || !tokenStatePda}
              loading={loading}
              variant="primary"
              aria-label="Transferir owner"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Transferir Owner
            </TransactionButton>

            <TransactionButton
              onClick={handleTransferFreezeAuthority}
              disabled={!isValid || loading || !tokenStatePda}
              loading={loading}
              variant="primary"
              aria-label="Transferir freeze authority"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Transferir Freeze Authority
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
