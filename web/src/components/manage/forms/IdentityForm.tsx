/**
 * IdentityForm.tsx
 * 
 * Formulario para operaciones del Identity Registry program.
 * Incluye: initialize registry, register/update/remove identity.
 */

import React, { useState, useCallback } from 'react';
import { TokenInput, TransactionButton, ActionCard, ResultDisplay } from '@/components/manage/ui';
import { useIdentityOperations, type IdentityResult } from '@/hooks/useIdentityOperations';

// ============================================================================
// Types
// ============================================================================

export interface IdentityFormProps {
  currentAuthority: import('@solana/web3.js').PublicKey | null;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function IdentityForm({
  currentAuthority,
  onSuccess,
  onError,
  className = '',
}: IdentityFormProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [identityData, setIdentityData] = useState('');
  const [metadataUri, setMetadataUri] = useState('');
  const [isValidWallet, setIsValidWallet] = useState(false);
  const [lastResult, setLastResult] = useState<IdentityResult | null>(null);

  const {
    initializeRegistry,
    registerIdentity,
    registerIdentityWithData,
    updateIdentity,
    removeIdentity,
    getIdentity,
    loading,
    error,
    signature,
    reset,
  } = useIdentityOperations({
    currentAuthority: currentAuthority || new (require('@solana/web3.js').PublicKey)(11111111111111111111111111111111),
    onSuccess: (sig) => {
      onSuccess?.(`Transaction submitted: ${sig}`);
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  const handleRegister = useCallback(async () => {
    if (!walletAddress || !isValidWallet) return;

    const result = await registerIdentity(walletAddress);
    setLastResult(result);

    if (result.success) {
      setWalletAddress('');
    }
  }, [walletAddress, isValidWallet, registerIdentity]);

  const handleRegisterWithData = useCallback(async () => {
    if (!walletAddress || !isValidWallet || !name || !symbol) return;

    const result = await registerIdentityWithData(
      walletAddress,
      name,
      symbol,
      identityData,
      metadataUri
    );
    setLastResult(result);

    if (result.success) {
      setWalletAddress('');
      setName('');
      setSymbol('');
      setIdentityData('');
      setMetadataUri('');
    }
  }, [walletAddress, isValidWallet, name, symbol, identityData, metadataUri, registerIdentityWithData]);

  const handleUpdate = useCallback(async () => {
    if (!walletAddress || !isValidWallet) return;

    const result = await updateIdentity(
      walletAddress,
      name || undefined,
      symbol || undefined,
      identityData || undefined,
      metadataUri || undefined
    );
    setLastResult(result);
  }, [walletAddress, isValidWallet, name, symbol, identityData, metadataUri, updateIdentity]);

  const handleRemove = useCallback(async () => {
    if (!walletAddress || !isValidWallet) return;

    const result = await removeIdentity(walletAddress);
    setLastResult(result);

    if (result.success) {
      setWalletAddress('');
    }
  }, [walletAddress, isValidWallet, removeIdentity]);

  const handleGetIdentity = useCallback(async () => {
    if (!walletAddress || !isValidWallet) return;

    const result = await getIdentity(walletAddress);
    setLastResult(result);
  }, [walletAddress, isValidWallet, getIdentity]);

  const resultFields = currentAuthority ? [
    {
      label: 'Firmante',
      value: currentAuthority.toBase58(),
      copyable: true,
    },
    {
      label: 'Wallet',
      value: walletAddress || undefined,
      copyable: true,
    },
    {
      label: 'Name',
      value: name || undefined,
    },
    {
      label: 'Symbol',
      value: symbol || undefined,
    },
  ] : [];

  return (
    <div className={className}>
      <ActionCard
        title="Identity Registry"
        description="Registra y gestiona identidades de tokens en el blockchain. Las identidades contienen información verificada sobre los tokens."
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
        }
        variant="default"
      >
        <div className="space-y-4">
          <TokenInput
            value={walletAddress}
            onChange={setWalletAddress}
            onValid={setIsValidWallet}
            label="Wallet Address"
            placeholder="Ingrese la wallet address"
            required
            name="identity-wallet"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-surface-primary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="Token name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1">
                Symbol
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-surface-primary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="Token symbol"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Identity Data
            </label>
            <input
              type="text"
              value={identityData}
              onChange={(e) => setIdentityData(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-surface-primary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="Additional identity data"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-secondary mb-1">
              Metadata URI
            </label>
            <input
              type="text"
              value={metadataUri}
              onChange={(e) => setMetadataUri(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-surface-primary border border-surface-border text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="https://example.com/metadata.json"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <TransactionButton
              onClick={handleRegister}
              disabled={!isValidWallet || loading}
              loading={loading}
              variant="primary"
              aria-label="Registrar identidad"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-60H6" />
              </svg>
              Registrar
            </TransactionButton>

            <TransactionButton
              onClick={handleRegisterWithData}
              disabled={!isValidWallet || !name || !symbol || loading}
              loading={loading}
              variant="primary"
              aria-label="Registrar identidad con datos"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Registrar con Datos
            </TransactionButton>

            <TransactionButton
              onClick={handleUpdate}
              disabled={!isValidWallet || loading}
              loading={loading}
              variant="warning"
              aria-label="Actualizar identidad"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Actualizar
            </TransactionButton>

            <TransactionButton
              onClick={handleRemove}
              disabled={!isValidWallet || loading}
              loading={loading}
              variant="danger"
              aria-label="Remover identidad"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remover
            </TransactionButton>

            <TransactionButton
              onClick={handleGetIdentity}
              disabled={!isValidWallet || loading}
              loading={loading}
              variant="success"
              aria-label="Obtener identidad"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Obtener
            </TransactionButton>
          </div>
        </div>
      </ActionCard>

      {lastResult && (
        <div className="mt-4">
          <ResultDisplay
            data={resultFields}
            title="Resultado"
            loading={lastResult.loading}
            onRefresh={reset}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
