'use client';

import React, { useMemo, useCallback } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

// Fase 3: Migración a Wallet Standard
// Los adapters legacy solo se usan para wallets que NO soportan Wallet Standard
// (Ledger y Trezor requieren conexión hardware específica)
import { LedgerWalletAdapter, TrezorWalletAdapter } from '@solana/wallet-adapter-wallets';

// Hook para convertir adapters legacy a adapters Wallet Standard
// Detecta automáticamente wallets que implementan Wallet Standard (Phantom, Solflare, Backpack, etc.)
import { useStandardWalletAdapters } from '@solana/wallet-standard-wallet-adapter-react';

// NOTE (Fase 1.2 + Fase 3): CoinbaseWalletAdapter fue removido porque causa conflictos
// con window.ethereum. El error "Backpack couldn't override window.ethereum" está relacionado
// con múltiples extensiones intentando modificar el mismo objeto global.
// Con Wallet Standard, Backpack, Phantom, Solflare y otras wallets compatibles
// son auto-detectadas sin necesidad de adapters manuales.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type NetworkType, getConnectionUrl } from '@/config/solana';
import { useSolanaNotification, useWalletErrorHandling } from '@/hooks/useSolanaNotification';
import '@solana/wallet-adapter-react-ui/styles.css';

// React Query configuration for Solana queries
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5000,
    },
  },
});

interface SolanaProviderProps {
  children: React.ReactNode;
  network?: NetworkType;
  endpoint?: string;
}

export function SolanaProvider({ children, network = 'localnet', endpoint }: SolanaProviderProps) {
  // Initialize notification system
  const { error: showError } = useSolanaNotification();

  // Handle wallet errors with user-friendly messages
  const handleWalletError = useWalletErrorHandling((message: string) => {
    showError(message);
  });

  // Error handler for WalletProvider
  const handleError = useCallback(
    (error: unknown) => {
      console.error('[SolanaProvider] Wallet error:', error);
      handleWalletError(error);
    },
    [handleWalletError]
  );

  // Determine Solana network type for RPC
  const solanaNetwork = useMemo(() => {
    if (endpoint && (endpoint.includes('localhost') || endpoint.includes('127.0.0.1'))) {
      return WalletAdapterNetwork.Devnet; // Use Devnet as fallback, we'll override endpoint
    }
    if (network === 'devnet') {
      return WalletAdapterNetwork.Devnet;
    }
    if (network === 'mainnet') {
      return WalletAdapterNetwork.Mainnet;
    }
    return WalletAdapterNetwork.Devnet;
  }, [network, endpoint]);

  // Final RPC endpoint - use centralized config
  const finalEndpoint = useMemo(() => {
    // Always use the custom endpoint if provided and points to localhost
    if (endpoint && (endpoint.includes('localhost') || endpoint.includes('127.0.0.1'))) {
      return endpoint;
    }
    // Use centralized config for network URLs
    return getConnectionUrl(network);
  }, [endpoint, network]);

  // Available wallets - Fase 3: Híbrido Wallet Standard + Legacy
  //
  // Enfoque Wallet Standard:
  // - useStandardWalletAdapters detecta automáticamente todas las wallets que
  //   implementan el Wallet Standard (Phantom, Solflare, Backpack, etc.)
  // - No es necesario instanciar adapters manuales para wallets compatibles
  //
  // Enfoque Legacy (solo para wallets que NO soportan Wallet Standard):
  // - LedgerWalletAdapter: requiere conexión hardware específica
  // - TrezorWalletAdapter: requiere conexión hardware específica
  //
  // Beneficios:
  // 1. Eliminación de conflictos window.ethereum (Backpack, Coinbase auto-detectados)
  // 2. Soporte automático para nuevas wallets compatibles con Wallet Standard
  // 3. Menos código de mantenimiento
  // 4. Compatibilidad con wallets de hardware (Ledger, Trezor)
  const legacyAdapters = useMemo(
    () => [
      // Legacy adapters para wallets de hardware que no soportan Wallet Standard
      new LedgerWalletAdapter(),
      new TrezorWalletAdapter(),
    ],
    []
  );

  // Convert legacy adapters to Wallet Standard adapters where possible
  // This enables auto-detection of Phantom, Solflare, Backpack, etc.
  const wallets = useStandardWalletAdapters(legacyAdapters);

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={finalEndpoint}>
        <WalletProvider wallets={wallets} autoConnect={network !== "localnet" && !endpoint?.includes("localhost")} onError={handleError}>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}

// Network selector hook - use useSolanaConnection() for network state instead
// This hook was removed as it managed local state that never synced with the provider.
// Network detection is now centralized in useSolanaConnection() which derives network
// from the connection.rpcEndpoint URL, ensuring a single source of truth.
