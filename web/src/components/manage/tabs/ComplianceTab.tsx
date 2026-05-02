/**
 * ComplianceTab.tsx
 * 
 * Tab para operaciones de compliance.
 * Orquesta ComplianceForm con useComplianceOperations.
 */

import React from 'react';
import { ComplianceForm } from '../forms';

// ============================================================================
// Types
// ============================================================================

interface ComplianceTabProps {
  currentAuthority: import('@solana/web3.js').PublicKey | null;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ComplianceTab({
  currentAuthority,
  onSuccess,
  onError,
}: ComplianceTabProps) {
  return (
    <div className="max-w-2xl">
      <ComplianceForm
        currentAuthority={currentAuthority}
        onSuccess={onSuccess}
        onError={onError}
      />
    </div>
  );
}
