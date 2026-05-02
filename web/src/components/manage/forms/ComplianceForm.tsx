/**
 * ComplianceForm.tsx
 * 
 * Formulario para operaciones del Compliance Aggregator program.
 * Incluye: initialize aggregator, add/remove module, rebalance.
 */

import React, { useState, useCallback } from 'react';
import { TokenInput, TransactionButton, ActionCard, ResultDisplay } from '@/components/manage/ui';
import { useComplianceOperations, type ComplianceResult } from '@/hooks/useComplianceOperations';

// ============================================================================
// Types
// ============================================================================

export interface ComplianceFormProps {
  currentAuthority: import('@solana/web3.js').PublicKey | null;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ComplianceForm({
  currentAuthority,
  onSuccess,
  onError,
  className = '',
}: ComplianceFormProps) {
  const [tokenId, setTokenId] = useState('');
  const [moduleProgramId, setModuleProgramId] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [isValidModule, setIsValidModule] = useState(false);
  const [lastResult, setLastResult] = useState<ComplianceResult | null>(null);

  const {
    initializeAggregator,
    addModule,
    removeModule,
    rebalanceModules,
    getAggregatorState,
    loading,
    error,
    signature,
    reset,
  } = useComplianceOperations({
    currentAuthority: currentAuthority || new (require('@solana/web3.js').PublicKey)(11111111111111111111111111111111),
    onSuccess: (sig) => {
      onSuccess?.(`Transaction submitted: ${sig}`);
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  const handleAddModule = useCallback(async () => {
    if (!tokenId || !moduleProgramId || !isValidToken || !isValidModule) return;

    const result = await addModule(tokenId, moduleProgramId);
    setLastResult(result);

    if (result.success) {
      setTokenId('');
      setModuleProgramId('');
    }
  }, [tokenId, moduleProgramId, isValidToken, isValidModule, addModule]);

  const handleRemoveModule = useCallback(async () => {
    if (!tokenId || !moduleProgramId || !isValidToken || !isValidModule) return;

    const result = await removeModule(tokenId, moduleProgramId);
    setLastResult(result);

    if (result.success) {
      setTokenId('');
      setModuleProgramId('');
    }
  }, [tokenId, moduleProgramId, isValidToken, isValidModule, removeModule]);

  const handleRebalance = useCallback(async () => {
    const result = await rebalanceModules();
    setLastResult(result);
  }, [rebalanceModules]);

  const handleGetState = useCallback(async () => {
    const result = await getAggregatorState();
    setLastResult(result);
  }, [getAggregatorState]);

  const resultFields = currentAuthority ? [
    {
      label: 'Firmante',
      value: currentAuthority.toBase58(),
      copyable: true,
    },
    {
      label: 'Token ID',
      value: tokenId || undefined,
      copyable: true,
    },
    {
      label: 'Módulo',
      value: moduleProgramId || undefined,
      copyable: true,
    },
  ] : [];

  return (
    <div className={className}>
      <ActionCard
        title="Compliance Aggregator"
        description="Gestiona los módulos de cumplimiento para los tokens. Los módulos determinan las reglas de transferencia."
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        variant="default"
      >
        <div className="space-y-4">
          <TokenInput
            value={tokenId}
            onChange={setTokenId}
            onValid={setIsValidToken}
            label="Token ID"
            placeholder="Ingrese el Token ID"
            required
            name="compliance-token"
          />

          <TokenInput
            value={moduleProgramId}
            onChange={setModuleProgramId}
            onValid={setIsValidModule}
            label="Módulo Program ID"
            placeholder="Ingrese el Program ID del módulo"
            required
            name="compliance-module"
          />

          <div className="flex flex-wrap gap-3">
            <TransactionButton
              onClick={handleAddModule}
              disabled={!isValidToken || !isValidModule || loading}
              loading={loading}
              variant="primary"
              aria-label="Agregar módulo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-60H6" />
              </svg>
              Agregar Módulo
            </TransactionButton>

            <TransactionButton
              onClick={handleRemoveModule}
              disabled={!isValidToken || !isValidModule || loading}
              loading={loading}
              variant="danger"
              aria-label="Remover módulo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remover Módulo
            </TransactionButton>

            <TransactionButton
              onClick={handleRebalance}
              disabled={loading}
              loading={loading}
              variant="warning"
              aria-label="Rebalancear módulos"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Rebalancear
            </TransactionButton>

            <TransactionButton
              onClick={handleGetState}
              disabled={loading}
              loading={loading}
              variant="success"
              aria-label="Obtener estado"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Obtener Estado
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
