'use client';

import React, { useMemo, useEffect, useState } from 'react';
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
import { type NetworkType } from '@/config/solana';
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaProviderProps {
  children: React.ReactNode;
  network?: NetworkType;
  endpoint?: string;
}

export function SolanaProvider({ children, network = 'localnet', endpoint }: SolanaProviderProps) {
  const [networkUrl, setNetworkUrl] = useState<string>('');

  // Determine network URL based on configuration
  useEffect(() => {
    if (endpoint) {
      setNetworkUrl(endpoint);
    } else {
      const urls: Record<NetworkType, string> = {
        localnet: 'http://localhost:8899',
        devnet: 'https://api.devnet.solana.com',
        mainnet: 'https://api.mainnet-beta.solana.com',
      };
      setNetworkUrl(urls[network]);
    }
  }, [network, endpoint]);

  // Determine Solana network type for RPC
  const solanaNetwork = useMemo(() => {
    if (networkUrl.includes('localhost') || networkUrl.includes('127.0.0.1')) {
      return WalletAdapterNetwork.Devnet; // Use Devnet as fallback, we'll override endpoint
    }
    if (networkUrl.includes('devnet')) {
      return WalletAdapterNetwork.Devnet;
    }
    if (networkUrl.includes('mainnet')) {
      return WalletAdapterNetwork.Mainnet;
    }
    return WalletAdapterNetwork.Devnet;
  }, [networkUrl]);

  // Final RPC endpoint
  const finalEndpoint = useMemo(() => {
    // Always use the custom endpoint if provided or configured
    if (networkUrl.includes('localhost') || networkUrl.includes('127.0.0.1')) {
      return networkUrl;
    }
    // For public networks, use cluster API URL
    return clusterApiUrl(solanaNetwork);
  }, [networkUrl, solanaNetwork]);

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
    <ConnectionProvider endpoint={finalEndpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// Network selector hook
export function useNetworkSelector() {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>('localnet');

  const switchNetwork = (network: NetworkType) => {
    setSelectedNetwork(network);
  };

  return { selectedNetwork, switchNetwork };
}
