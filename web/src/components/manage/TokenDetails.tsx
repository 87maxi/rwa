/**
 * TokenDetails.tsx
 *
 * Componente de vista detallada del token.
 * Muestra toda la información del token seleccionado.
 *
 * Fase 6 del Token List Management Plan
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { TokenInfo } from '@/hooks/useTokenList';

// ============================================================================
// Types
// ============================================================================

interface TokenDetailsProps {
  token: TokenInfo;
  onClose: () => void;
  onManage: () => void;
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

const shortenAddress = (address: string): string => {
  if (address.length <= 12) return address;
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
};

// ============================================================================
// Component
// ============================================================================

export function TokenDetails({
  token,
  onClose,
  onManage,
}: TokenDetailsProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const circulatingSupply = token.totalSupply - token.balance;

  // Focus trap and ESC handler
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    // Focus first focusable element
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    firstElement?.focus();

    // ESC handler
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = Array.from(modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )) as HTMLElement[];

      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEsc);
    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('keydown', handleTab);
    };
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalles del token ${token.name}`}
    >
      <div
        className="bg-surface-raised backdrop-blur-xl rounded-xl border border-surface-border max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface-raised/95 backdrop-blur-xl border-b border-surface-border px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-surface-primary font-bold text-lg">
              {token.symbol.charAt(0)}
            </div>
            Token Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5 text-foreground-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Token Info */}
          <div>
            <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-3">
              Token Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-secondary rounded-lg p-3">
                <div className="text-xs text-foreground-muted mb-1">Name</div>
                <div className="font-medium text-foreground">
                  {token.name}
                </div>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3">
                <div className="text-xs text-foreground-muted mb-1">Symbol</div>
                <div className="font-medium text-foreground">
                  {token.symbol}
                </div>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3">
                <div className="text-xs text-foreground-muted mb-1">Token ID</div>
                <div className="font-medium text-foreground">
                  {token.tokenId}
                </div>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3">
                <div className="text-xs text-foreground-muted mb-1">Decimals</div>
                <div className="font-medium text-foreground">
                  {token.decimals}
                </div>
              </div>
            </div>
          </div>

          {/* Supply */}
          <div>
            <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-3">
              Supply
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-surface-secondary rounded-lg p-3">
                <span className="text-foreground-muted">Total Supply</span>
                <span className="font-medium text-foreground">
                  {formatSupply(token.totalSupply, token.decimals)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-surface-secondary rounded-lg p-3">
                <span className="text-foreground-muted">Your Balance</span>
                <span className="font-medium text-primary">
                  {formatBalance(token.balance, token.decimals)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-surface-secondary rounded-lg p-3">
                <span className="text-foreground-muted">Circulating</span>
                <span className="font-medium text-foreground">
                  {formatSupply(circulatingSupply, token.decimals)}
                </span>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div>
            <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-3">
              Activity
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-secondary rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {token.agentCount}
                </div>
                <div className="text-xs text-foreground-muted mt-1">
                  Agents
                </div>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {token.frozenCount}
                </div>
                <div className="text-xs text-foreground-muted mt-1">
                  Frozen
                </div>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">
                  {token.balance > 0n ? '1' : '0'}
                </div>
                <div className="text-xs text-foreground-muted mt-1">
                  Your Balance
                </div>
              </div>
            </div>
          </div>

          {/* Authorities */}
          <div>
            <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wider mb-3">
              Authorities
            </h3>
            <div className="space-y-2">
              <div className="bg-surface-secondary rounded-lg p-3">
                <div className="text-xs text-foreground-muted mb-1">Owner</div>
                <div className="font-mono text-sm text-foreground break-all">
                  {shortenAddress(token.owner)}
                </div>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3">
                <div className="text-xs text-foreground-muted mb-1">
                  Freeze Authority
                </div>
                <div className="font-mono text-sm text-foreground break-all">
                  {shortenAddress(token.freezeAuthority)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface-raised/95 backdrop-blur-xl border-t border-surface-border px-6 py-4 flex gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-surface-secondary text-foreground rounded-lg hover:bg-surface-hover transition-colors font-medium"
          >
            Back to List
          </button>
          <button
            onClick={onManage}
            className="flex-1 px-4 py-2.5 bg-primary text-surface-primary rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Manage Token
          </button>
        </div>
      </div>
    </div>
  );
}
