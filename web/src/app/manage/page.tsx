/**
 * ManagePage.tsx
 * 
 * Página principal de gestión de tokens.
 * Soporta multi-token con selección, listadop y detalles.
 * 
 * Fase 4 del Token List Management Plan
 * 
 * @see web/src/components/manage/ - Componentes modulares
 * @see web/src/hooks/useTokenList.ts - Hook para listado de tokens
 * @see solana-rwa/idl_solana_rwa.json - IDL del programa
 */

'use client';

import { useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ManageLayout, ManageTabs, TokenSelector, TokenList, TokenDetails } from '@/components/manage';
import { deriveTokenStatePda, deriveFrozenPda } from '@/anchor/pdas';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_IDS, getCurrentNetwork } from '@/config/solana';
import { useTokenList } from '@/hooks';
import type { TokenInfo } from '@/hooks/useTokenList';

export default function ManagePage() {
  const { connected, publicKey } = useWallet();
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsToken, setDetailsToken] = useState<TokenInfo | null>(null);

  // Obtener program ID
  const programId = useMemo(() => {
    try {
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.solanaRwa;
      if (!programIdStr) return null;

      return new PublicKey(programIdStr);
    } catch {
      return null;
    }
  }, []);

  // Hook para listar tokens
  const { tokens, loading, error, refetch } = useTokenList({
    ownerAddress: publicKey,
    programId,
    enabled: connected && !!publicKey && !!programId,
  });

  // Derive PDA for the token state account
  const tokenStatePda = useMemo(() => {
    try {
      if (!selectedToken || !programId) return null;

      const owner = publicKey ?? new PublicKey(selectedToken.owner);
      const derivedPda = deriveTokenStatePda(owner, selectedToken.tokenId, programId);

      return derivedPda;
    } catch {
      return null;
    }
  }, [selectedToken, publicKey, programId]);

  // Derive PDA for the freeze authority
  const freezeAuthorityPda = useMemo(() => {
    try {
      if (!tokenStatePda || !publicKey || !programId) return null;

      return deriveFrozenPda(tokenStatePda, publicKey, programId);
    } catch {
      return null;
    }
  }, [tokenStatePda, publicKey, programId]);

  const handleSuccess = (message: string) => {
    console.log('[Manage] Success:', message);
    refetch();
  };

  const handleError = (message: string) => {
    console.error('[Manage] Error:', message);
  };

  const handleSelectToken = (token: TokenInfo) => {
    setSelectedToken(token);
    setShowDetails(false);
    setDetailsToken(null);
  };

  const handleViewDetails = (token: TokenInfo) => {
    setDetailsToken(token);
    setShowDetails(true);
  };

  const handleNewToken = () => {
    // TODO: Implementar creación de nuevo token
    console.log('[Manage] Create new token');
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setDetailsToken(null);
  };

  const handleManageFromDetails = () => {
    setShowDetails(false);
    setDetailsToken(null);
    if (detailsToken) {
      setSelectedToken(detailsToken);
    }
  };

  const handleBackToList = () => {
    setSelectedToken(null);
    setShowDetails(false);
    setDetailsToken(null);
  };

  return (
    <ManageLayout>
      {connected && publicKey && programId ? (
        <>
          {/* Si no hay token seleccionado, mostrar listadop */}
          {!selectedToken && (
            <TokenList
              tokens={tokens}
              onSelect={handleSelectToken}
              onNewToken={handleNewToken}
              loading={loading}
              error={error}
            />
          )}

          {/* Si hay token seleccionado, mostrar selector y tabs */}
          {selectedToken && (
            <div className="space-y-6">
              {/* Header con selector y acciones */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1 w-full sm:w-auto">
                  <TokenSelector
                    tokens={tokens}
                    selectedTokenId={selectedToken.tokenId}
                    onSelect={handleSelectToken}
                    onNewToken={handleNewToken}
                    className="w-full"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(selectedToken)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-lg hover:bg-surface-hover transition-colors text-foreground"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Details
                  </button>
                  <button
                    onClick={handleBackToList}
                    className="flex items-center gap-2 px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-lg hover:bg-surface-hover transition-colors text-foreground"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                </div>
              </div>

              {/* Token Summary Bar */}
              <div className="bg-surface-secondary rounded-lg border border-surface-border p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-surface-primary font-bold text-lg">
                      {selectedToken.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{selectedToken.name}</div>
                      <div className="text-xs text-foreground-muted">ID: {selectedToken.tokenId} · {selectedToken.symbol}</div>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-surface-border" />

                  <div className="flex gap-6 flex-wrap">
                    <div>
                      <div className="text-xs text-foreground-muted">Your Balance</div>
                      <div className="font-bold text-primary">
                        {selectedToken.balance.toString()} {selectedToken.symbol}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-foreground-muted">Total Supply</div>
                      <div className="font-medium text-foreground">
                        {selectedToken.totalSupply.toString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-foreground-muted">Agents</div>
                      <div className="font-medium text-foreground">{selectedToken.agentCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-foreground-muted">Frozen</div>
                      <div className="font-medium text-foreground">{selectedToken.frozenCount}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Management Tabs */}
              <ManageTabs
                tokenStatePda={tokenStatePda?.toString() ?? null}
                tokenStatePubkey={tokenStatePda}
                currentAuthority={publicKey}
                freezeAuthorityPda={freezeAuthorityPda}
                programId={programId}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <p className="text-foreground-muted text-lg">
            Please connect your wallet to manage tokens.
          </p>
        </div>
      )}

      {/* Token Details Modal */}
      {showDetails && detailsToken && (
        <TokenDetails
          token={detailsToken}
          onClose={handleCloseDetails}
          onManage={handleManageFromDetails}
        />
      )}
    </ManageLayout>
  );
}
