/**
 * TokenSelector.tsx
 *
 * Componente de selección de tokens (dropdown).
 * Permite al usuario seleccionar un token de la lista o crear uno nuevo.
 *
 * Fase 2 del Token List Management Plan
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { TokenInfo } from '@/hooks/useTokenList';

// ============================================================================
// Types
// ============================================================================

interface TokenSelectorProps {
  tokens: TokenInfo[];
  selectedTokenId: string | null;
  onSelect: (token: TokenInfo) => void;
  onNewToken?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function TokenSelector({
  tokens,
  selectedTokenId,
  onSelect,
  onNewToken,
  className = '',
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedToken = tokens.find((t) => t.tokenId === selectedTokenId);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (token: TokenInfo) => {
    onSelect(token);
    setIsOpen(false);
  };

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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-secondary border border-surface-border rounded-lg hover:border-primary transition-colors text-left"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-3">
          {selectedToken ? (
            <>
              {/* Token Icon Placeholder */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-surface-primary font-bold text-sm">
                {selectedToken.symbol.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-foreground">
                  {selectedToken.name}
                </div>
                <div className="text-xs text-foreground-muted">
                  ID: {selectedToken.tokenId} · {selectedToken.symbol}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-surface-tertiary flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-foreground-muted"
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
              <div>
                <div className="text-foreground-muted">
                  {tokens.length > 0
                    ? 'Seleccionar token...'
                    : 'No hay tokens disponibles'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={`w-5 h-5 text-foreground-muted transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface-primary border border-surface-border rounded-lg shadow-lg overflow-hidden">
          {tokens.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto" role="listbox">
              {tokens.map((token) => (
                <li key={token.tokenId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(token)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors ${
                      token.tokenId === selectedTokenId
                        ? 'bg-surface-hover border-l-2 border-primary'
                        : ''
                    }`}
                    role="option"
                    aria-selected={token.tokenId === selectedTokenId}
                  >
                    {/* Token Icon */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-surface-primary font-bold text-sm flex-shrink-0">
                      {token.symbol.charAt(0)}
                    </div>

                    {/* Token Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {token.name}
                      </div>
                      <div className="text-xs text-foreground-muted">
                        ID: {token.tokenId} · {token.symbol}
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="text-right flex-shrink-0">
                      <div className="font-medium text-foreground text-sm">
                        {formatBalance(token.balance, token.decimals)}
                      </div>
                      <div className="text-xs text-foreground-muted">
                        {token.agentCount} agents · {token.frozenCount} frozen
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-foreground-muted">
              <svg
                className="w-8 h-8 mx-auto mb-2"
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
              <p>No hay tokens disponibles</p>
            </div>
          )}

          {/* Create New Token Button */}
          {onNewToken && tokens.length > 0 && (
            <div className="border-t border-surface-border">
              <button
                type="button"
                onClick={() => {
                  onNewToken();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-primary hover:bg-surface-hover transition-colors"
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
                <span className="font-medium">Create New Token</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
