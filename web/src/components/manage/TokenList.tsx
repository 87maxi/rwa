/**
 * TokenList.tsx
 *
 * Componente de listadop de tokens.
 * Muestra todos los tokens disponibles con opciones de gestión.
 *
 * Fase 3 del Token List Management Plan
 */

'use client';

import React from 'react';
import type { TokenInfo } from '@/hooks/useTokenList';

// ============================================================================
// Types
// ============================================================================

interface TokenListProps {
  tokens: TokenInfo[];
  onSelect: (token: TokenInfo) => void;
  onNewToken?: () => void;
  selectedTokenId?: string | null;
  loading?: boolean;
  error?: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

const formatBalance = (balance: bigint, decimals: number): string => {
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const remainder = balance % divisor;
  const fractional = remainder.toString().padStart(decimals, '0');
  const trimmedFractional = fractional
    .replace(/0+$/, '')
    .slice(0, decimals);

  if (trimmedFractional.length > 0) {
    return `${whole}.${trimmedFractional}`;
  }
  return whole.toString();
};

const formatSupply = (supply: bigint, decimals: number): string => {
  const divisor = BigInt(10 ** decimals);
  const whole = supply / divisor;
  const remainder = supply % divisor;
  const fractional = remainder.toString().padStart(decimals, '0');
  const trimmedFractional = fractional.replace(/0+$/, '').slice(0, 6);

  if (trimmedFractional.length > 0) {
    return `${whole.toLocaleString()}.${trimmedFractional}`;
  }
  return whole.toLocaleString();
};

// ============================================================================
// Component
// ============================================================================

export function TokenList({
  tokens,
  onSelect,
  onNewToken,
  selectedTokenId = null,
  loading = false,
  error = null,
}: TokenListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground-muted text-sm">
            Cargando tokens...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-error/10 border border-surface-error rounded-lg p-4">
        <p className="text-error text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">
          Your Tokens ({tokens.length})
        </h2>

        {onNewToken && (
          <button
            onClick={onNewToken}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-surface-primary rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create New Token
          </button>
        )}
      </div>

      {/* Token List */}
      {tokens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-surface-secondary rounded-lg border border-surface-border">
          <div className="w-16 h-16 rounded-full bg-surface-tertiary flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-foreground-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No hay tokens disponibles
          </h3>
          <p className="text-foreground-muted text-sm mb-4 text-center max-w-sm">
            No se encontraron tokens para esta wallet. Crea tu primer token
            para comenzar a gestionar activos.
          </p>
          {onNewToken && (
            <button
              onClick={onNewToken}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-surface-primary rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create First Token
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {tokens.map((token) => (
            <div
              key={token.tokenStatePda} // Usar PDA como key única en lugar de tokenId
              className={`bg-surface-secondary rounded-lg border transition-all hover:shadow-md ${
                token.tokenId === selectedTokenId
                  ? 'border-primary shadow-md'
                  : 'border-surface-border hover:border-primary/50'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Token Icon */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-surface-primary font-bold text-lg flex-shrink-0">
                    {token.symbol.charAt(0)}
                  </div>

                  {/* Token Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-foreground truncate">
                        {token.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-surface-tertiary text-foreground-muted text-xs rounded-full font-medium">
                        {token.symbol}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground-muted">
                      <span>Token ID: {token.tokenId}</span>
                      <span>Decimals: {token.decimals}</span>
                      <span>Agents: {token.agentCount}</span>
                      <span>Frozen: {token.frozenCount}</span>
                    </div>
                  </div>

                  {/* Balance & Actions */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-foreground">
                      {formatBalance(token.balance, token.decimals)}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      Supply: {formatSupply(token.totalSupply, token.decimals)}
                    </div>

                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        onClick={() => onSelect(token)}
                        className="px-3 py-1.5 bg-primary text-surface-primary rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
