/**
 * AgentForm.tsx
 * 
 * Formulario para agregar/remover agentes.
 * Los agentes pueden realizar operaciones de mint/burn/transfer en nombre del emisor.
 */

import React, { useState, useCallback } from 'react';
import { TokenInput, TransactionButton, ActionCard, ResultDisplay } from '@/components/manage/ui';
import { useAgentOperations, type AgentResult } from '@/hooks/useAgentOperations';
import type { PublicKey } from '@solana/web3.js';

// ============================================================================
// Types
// ============================================================================

export interface AgentFormProps {
  tokenStatePda: PublicKey;
  currentAuthority: PublicKey;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AgentForm({
  tokenStatePda,
  currentAuthority,
  onSuccess,
  onError,
  className = '',
}: AgentFormProps) {
  const [agentAddress, setAgentAddress] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [lastResult, setLastResult] = useState<AgentResult | null>(null);

  const {
    addAgent,
    removeAgent,
    loading,
    error,
    signature,
    reset,
  } = useAgentOperations({
    tokenStatePda,
    currentAuthority,
    onSuccess: (sig) => {
      onSuccess?.(`Transaction submitted: ${sig}`);
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  const handleAddAgent = useCallback(async () => {
    if (!agentAddress || !isValid) return;

    const agentResult = await addAgent(agentAddress);
    setLastResult(agentResult);

    if (agentResult.success) {
      setAgentAddress('');
    }
  }, [agentAddress, isValid, addAgent]);

  const handleRemoveAgent = useCallback(async () => {
    if (!agentAddress || !isValid) return;

    const agentResult = await removeAgent(agentAddress);
    setLastResult(agentResult);

    if (agentResult.success) {
      setAgentAddress('');
    }
  }, [agentAddress, isValid, removeAgent]);

  const resultFields = [
    {
      label: 'Firmante',
      value: currentAuthority?.toBase58(),
      copyable: true,
    },
    {
      label: 'Agente',
      value: agentAddress,
      copyable: true,
    },
  ];

  return (
    <div className={className}>
      <ActionCard
        title="Gestionar Agentes"
        description="Los agentes pueden realizar operaciones de mint, burn y transfer en nombre del emisor. Gestione la lista de agentes autorizados."
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }
        variant="default"
      >
        <div className="space-y-4">
          <TokenInput
            value={agentAddress}
            onChange={setAgentAddress}
            onValid={setIsValid}
            label="Dirección del Agente"
            placeholder="Ingrese la dirección del agente"
            required
            name="agent-address"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <TransactionButton
              onClick={handleAddAgent}
              disabled={!isValid || loading}
              loading={loading}
              variant="primary"
              aria-label="Agregar agente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-60H6" />
              </svg>
              Agregar Agente
            </TransactionButton>

            <TransactionButton
              onClick={handleRemoveAgent}
              disabled={!isValid || loading}
              loading={loading}
              variant="danger"
              aria-label="Remover agente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remover Agente
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
