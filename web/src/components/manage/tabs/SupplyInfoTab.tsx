/**
 * SupplyInfoTab.tsx
 * 
 * Tab para información de supply (solo lectura).
 * Utiliza useTokenQuery para obtener datos.
 */

import React from 'react';
import { ActionCard, ResultDisplay } from '../ui';
import { useTokenQuery } from '@/hooks/useTokenQuery';
import type { PublicKey } from '@solana/web3.js';

// ============================================================================
// Types
// ============================================================================

interface SupplyInfoTabProps {
  tokenStatePda: PublicKey | null;
  ownerAddress: PublicKey | null;
  programId: PublicKey;
}

// ============================================================================
// Component
// ============================================================================

export function SupplyInfoTab({
  tokenStatePda,
  ownerAddress,
  programId,
}: SupplyInfoTabProps) {
  const {
    supplyInfo,
    supplyInfoLoading,
    supplyInfoError,
    getSupplyInfo,
    tokenState,
    tokenStateLoading,
    tokenStateError,
    getTokenState,
    refetch,
  } = useTokenQuery({
    tokenStatePda,
    ownerAddress,
    programId,
  });

  const resultFields = [
    {
      label: 'Total Supply',
      value: supplyInfo?.totalSupply ?? '-',
    },
    {
      label: 'Circulating Supply',
      value: supplyInfo?.circulatingSupply ?? '-',
    },
    {
      label: 'Frozen Count',
      value: supplyInfo?.frozenCount ?? '-',
    },
    {
      label: 'Agent Count',
      value: supplyInfo?.agentCount ?? '-',
    },
    {
      label: 'Name',
      value: tokenState?.name ?? '-',
    },
    {
      label: 'Symbol',
      value: tokenState?.symbol ?? '-',
    },
    {
      label: 'Decimals',
      value: tokenState?.decimals ?? '-',
    },
  ];

  return (
    <div className="max-w-2xl">
      <ActionCard
        title="Información del Token"
        description="Visualiza el supply total, circulating supply, cuentas congeladas y agentes del token."
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        variant="default"
      >
        <div className="space-y-4">
          <button
            onClick={() => { getSupplyInfo(); getTokenState(); }}
            disabled={supplyInfoLoading || tokenStateLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {supplyInfoLoading || tokenStateLoading ? 'Cargando...' : 'Actualizar Datos'}
          </button>

          {(supplyInfoError || tokenStateError) && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">
                {supplyInfoError || tokenStateError}
              </p>
            </div>
          )}
        </div>
      </ActionCard>

      <ResultDisplay
        data={resultFields}
        title="Detalles"
        loading={supplyInfoLoading || tokenStateLoading}
        onRefresh={refetch}
      />
    </div>
  );
}
