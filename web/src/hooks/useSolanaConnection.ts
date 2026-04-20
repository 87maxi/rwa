'use client';

import { useState, useEffect } from 'react';
import type { NetworkType } from '@/config/solana';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Hook para obtener información del estado de conexión Solana
 * Usa patrón mounted para prevenir hydration mismatch
 */
export function useSolanaConnection() {
  const { connection } = useConnection();
  const { publicKey, connected, connecting } = useWallet();
  const [mounted, setMounted] = useState(false);

  // Set mounted state on client side only
  useEffect(() => {
    setMounted(true);
  }, []);

  const getNetworkType = (): NetworkType => {
    if (!connection || !mounted) return 'localnet';
    
    const url = connection.rpcEndpoint;
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return 'localnet';
    }
    if (url.includes('devnet')) {
      return 'devnet';
    }
    return 'mainnet';
  };

  const getNetworkLabel = (): string => {
    const network = getNetworkType();
    const labels: Record<NetworkType, string> = {
      localnet: 'Red Local',
      devnet: 'Devnet',
      mainnet: 'Mainnet',
    };
    return labels[network];
  };

  const getNetworkColor = (): string => {
    const network = getNetworkType();
    const colors: Record<NetworkType, string> = {
      localnet: '#f59e0b',
      devnet: '#8b5cf6',
      mainnet: '#10b981',
    };
    return colors[network];
  };

  return {
    connection,
    publicKey,
    connected,
    connecting,
    networkType: getNetworkType(),
    networkLabel: getNetworkLabel(),
    networkColor: getNetworkColor(),
    address: publicKey?.toString(),
    shortAddress: publicKey
      ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
      : '',
  };
}

/**
 * Hook para obtener balance de la wallet conectada
 */
export function useWalletBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey || !connection) {
        setBalance(0);
        return;
      }

      setLoading(true);
      try {
        const lamports = await connection.getBalance(publicKey);
        setBalance(lamports / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance(0);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();

    // Subscribe to balance updates
    if (publicKey && connection) {
      const subscriptionId = connection.onAccountChange(
        publicKey,
        (accountInfo) => {
          setBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
        }
      );

      return () => {
        connection.removeAccountChangeListener(subscriptionId);
      };
    }
  }, [connection, publicKey]);

  return { balance, loading };
}
