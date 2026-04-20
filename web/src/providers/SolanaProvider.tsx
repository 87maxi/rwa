'use client';

import React, { useMemo, useCallback } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  LedgerWalletAdapter,
  TrezorWalletAdapter,
  CoinbaseWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type NetworkType } from '@/config/solana';
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

  // Final RPC endpoint
  const finalEndpoint = useMemo(() => {
    // Always use the custom endpoint if provided or configured
    if (endpoint && (endpoint.includes('localhost') || endpoint.includes('127.0.0.1'))) {
      return endpoint;
    }
    // urls is defined for potential future use
    const urls: Record<NetworkType, string> = {
      localnet: 'http://localhost:8899',
      devnet: 'https://api.devnet.solana.com',
      mainnet: 'https://api.mainnet-beta.solana.com',
    };
    if (endpoint) {
      return endpoint;
    }
    // For public networks, use cluster API URL
    return clusterApiUrl(solanaNetwork);
  }, [endpoint, solanaNetwork]);

  // Available wallets - agnostic support for multiple Solana wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new LedgerWalletAdapter(),
      new TrezorWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solanaNetwork]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={finalEndpoint}>
        <WalletProvider wallets={wallets} autoConnect onError={handleError}>
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
