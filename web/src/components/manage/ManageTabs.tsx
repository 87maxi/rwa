/**
 * ManageTabs.tsx
 * 
 * Componente de tabs para la página de gestión.
 * Orquesta todos los tabs disponibles.
 */

'use client';

import React, { useState } from 'react';
import {
  TransferTab,
  FreezeTab,
  AgentsTab,
  AuthorityTab,
  SupplyInfoTab,
  ComplianceTab,
  IdentityTab,
} from './tabs';
import type { PublicKey } from '@solana/web3.js';

// ============================================================================
// Types
// ============================================================================

interface ManageTabsProps {
  tokenStatePda: string | null;
  tokenStatePubkey: PublicKey | null;
  currentAuthority: PublicKey | null;
  freezeAuthorityPda: PublicKey | null;
  programId: PublicKey;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

// ============================================================================
// Types
// ============================================================================

type TabType = 'transfer' | 'freeze' | 'agents' | 'authority' | 'supply' | 'compliance' | 'identity';

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabItem[] = [
  {
    id: 'transfer',
    label: 'Transfer/Mint/Burn',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    id: 'freeze',
    label: 'Freeze/Unfreeze',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'authority',
    label: 'Authority',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'supply',
    label: 'Supply Info',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'identity',
    label: 'Identity',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
      </svg>
    ),
  },
];

// ============================================================================
// Component
// ============================================================================

export function ManageTabs({
  tokenStatePda,
  tokenStatePubkey,
  currentAuthority,
  freezeAuthorityPda,
  programId,
  onSuccess,
  onError,
}: ManageTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('transfer');

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-surface-border">
        <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-surface-primary text-primary border-b-2 border-primary'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                }
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'transfer' && (
          <TransferTab
            tokenStatePda={tokenStatePda}
            currentAuthority={currentAuthority}
            onSuccess={onSuccess}
            onError={onError}
          />
        )}

        {activeTab === 'freeze' && freezeAuthorityPda && tokenStatePubkey && currentAuthority && (
          <FreezeTab
            tokenStatePda={tokenStatePubkey}
            currentAuthority={currentAuthority}
            freezeAuthorityPda={freezeAuthorityPda}
            onSuccess={onSuccess}
            onError={onError}
          />
        )}

        {activeTab === 'agents' && tokenStatePubkey && currentAuthority && (
          <AgentsTab
            tokenStatePda={tokenStatePubkey}
            currentAuthority={currentAuthority}
            onSuccess={onSuccess}
            onError={onError}
          />
        )}

        {activeTab === 'authority' && (
          <AuthorityTab
            tokenStatePda={tokenStatePda}
            currentAuthority={currentAuthority}
            onSuccess={onSuccess}
            onError={onError}
          />
        )}

        {activeTab === 'supply' && (
          <SupplyInfoTab
            tokenStatePda={tokenStatePubkey}
            ownerAddress={currentAuthority}
            programId={programId}
          />
        )}

        {activeTab === 'compliance' && (
          <ComplianceTab
            currentAuthority={currentAuthority}
            onSuccess={onSuccess}
            onError={onError}
          />
        )}

        {activeTab === 'identity' && (
          <IdentityTab
            currentAuthority={currentAuthority}
            onSuccess={onSuccess}
            onError={onError}
          />
        )}
      </div>
    </div>
  );
}
