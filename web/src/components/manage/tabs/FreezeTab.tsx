/**
 * FreezeTab.tsx
 * 
 * Tab para operaciones de freeze/unfreeze.
 * Orquesta FreezeForm con useFreezeOperations.
 */

import React from 'react';
import { FreezeForm } from '../forms';
import type { PublicKey } from '@solana/web3.js';

// ============================================================================
// Types
// ============================================================================

interface FreezeTabProps {
  tokenStatePda: PublicKey;
  currentAuthority: PublicKey;
  freezeAuthorityPda: PublicKey;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function FreezeTab({
  tokenStatePda,
  currentAuthority,
  freezeAuthorityPda,
  onSuccess,
  onError,
}: FreezeTabProps) {
  return (
    <div className="max-w-2xl">
      <FreezeForm
        tokenStatePda={tokenStatePda}
        currentAuthority={currentAuthority}
        freezeAuthorityPda={freezeAuthorityPda}
        onSuccess={onSuccess}
        onError={onError}
      />
    </div>
  );
}
