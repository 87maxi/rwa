/**
 * AuthorityTab.tsx
 * 
 * Tab para transferencia de autoridades.
 * Orquesta AuthorityTransferForm con useAuthorityOperations.
 */

import React from 'react';
import { AuthorityTransferForm } from '../forms';

// ============================================================================
// Types
// ============================================================================

interface AuthorityTabProps {
  tokenStatePda: string | null;
  currentAuthority: import('@solana/web3.js').PublicKey | null;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AuthorityTab({
  tokenStatePda,
  currentAuthority,
  onSuccess,
  onError,
}: AuthorityTabProps) {
  return (
    <div className="max-w-2xl">
      <AuthorityTransferForm
        tokenStatePda={tokenStatePda}
        currentAuthority={currentAuthority}
        onSuccess={onSuccess}
        onError={onError}
      />
    </div>
  );
}
