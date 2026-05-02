/**
 * IdentityTab.tsx
 * 
 * Tab para operaciones de identity.
 * Orquesta IdentityForm con useIdentityOperations.
 */

import React from 'react';
import { IdentityForm } from '../forms';

// ============================================================================
// Types
// ============================================================================

interface IdentityTabProps {
  currentAuthority: import('@solana/web3.js').PublicKey | null;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function IdentityTab({
  currentAuthority,
  onSuccess,
  onError,
}: IdentityTabProps) {
  return (
    <div className="max-w-2xl">
      <IdentityForm
        currentAuthority={currentAuthority}
        onSuccess={onSuccess}
        onError={onError}
      />
    </div>
  );
}
