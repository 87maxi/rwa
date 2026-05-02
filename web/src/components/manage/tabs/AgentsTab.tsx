/**
 * AgentsTab.tsx
 * 
 * Tab para gestión de agentes.
 * Orquesta AgentForm con useAgentOperations.
 */

import React from 'react';
import { AgentForm } from '../forms';
import type { PublicKey } from '@solana/web3.js';

// ============================================================================
// Types
// ============================================================================

interface AgentsTabProps {
  tokenStatePda: PublicKey;
  currentAuthority: PublicKey;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AgentsTab({
  tokenStatePda,
  currentAuthority,
  onSuccess,
  onError,
}: AgentsTabProps) {
  return (
    <div className="max-w-2xl">
      <AgentForm
        tokenStatePda={tokenStatePda}
        currentAuthority={currentAuthority}
        onSuccess={onSuccess}
        onError={onError}
      />
    </div>
  );
}
