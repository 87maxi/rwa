/**
 * Solana Configuration
 * 
 * Centralized configuration for Solana network and program IDs.
 * Supports multiple networks with automatic detection.
 */

import { Connection } from '@solana/web3.js';

// Program IDs for different networks
export const PROGRAM_IDS = {
  devnet: {
    solanaRwa: '7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L',
    identityRegistry: '3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5',
    complianceAggregator: 'EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT',
  },
  mainnet: {
    solanaRwa: '7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L',
    identityRegistry: '3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5',
    complianceAggregator: 'EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT',
  },
  localnet: {
    solanaRwa: '7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L',
    identityRegistry: '3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5',
    complianceAggregator: 'EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT',
  },
} as const;

export type NetworkType = keyof typeof PROGRAM_IDS;

export function getNetworkFromUrl(url: string): NetworkType {
  if (url.includes('localnet') || url.includes('localhost') || url.includes('127.0.0.1')) {
    return 'localnet';
  }
  if (url.includes('devnet')) {
    return 'devnet';
  }
  return 'mainnet';
}

export function getConnection(network: NetworkType = 'localnet'): Connection {
  const urls: Record<NetworkType, string> = {
    localnet: 'http://localhost:8899',
    devnet: 'https://api.devnet.solana.com',
    mainnet: 'https://api.mainnet-beta.solana.com',
  };
  
  return new Connection(urls[network], 'confirmed');
}

export function getConnectionUrl(network: NetworkType = 'localnet'): string {
  const urls: Record<NetworkType, string> = {
    localnet: 'http://localhost:8899',
    devnet: 'https://api.devnet.solana.com',
    mainnet: 'https://api.mainnet-beta.solana.com',
  };
  
  return urls[network];
}

// Token configuration
export const TOKEN_CONFIG = {
  defaultName: 'RWA Token',
  defaultSymbol: 'RWA',
  defaultDecimals: 9,
  mintAmount: 1000000,
} as const;

// Wallet adapter configuration
export const WALLET_CONFIG = {
  preferredWallets: ['phantom', 'solflare', 'backpack', 'multiversx'],
  maxWallets: 10,
} as const;
