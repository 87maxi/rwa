/**
 * Solana Configuration
 * 
 * Centralized configuration for Solana network and program IDs.
 * Supports multiple networks with environment variable overrides.
 * Uses dynamic program IDs based on the selected network.
 */

import { Connection, clusterApiUrl } from '@solana/web3.js';

export type NetworkType = 'localnet' | 'devnet' | 'mainnet';

/**
 * Default Program IDs from Anchor.toml / declare_id!() (source of truth).
 * Used as fallback when environment variables are not set.
 * @see solana-rwa/Anchor.toml [programs.localnet]
 */
const DEFAULT_PROGRAM_IDS = {
  solanaRwa: '2XuB3ngjvJkMTxB82eM9NszBUGNovjuJUs4mzdez7EEX',
  identityRegistry: '5SeHm9i7CcgHqF9UBYBtGbzqf3F3FWFETQF8AxfU2Rce',
  complianceAggregator: '7cURjJvyf3oe6JsuVxS9EiVHKNauiFj7Gao3THzZSnpb',
} as const;

/**
 * Program IDs configuration with environment variable override.
 * Priority: env vars > DEFAULT_PROGRAM_IDS from Anchor.toml.
 * Env var names use the _LOCALNET_ / _DEVNET_ / _MAINNET_ suffix to match .env files.
 */
export const PROGRAM_IDS = {
  localnet: {
    solanaRwa: process.env.NEXT_PUBLIC_SOLANA_RWA_LOCALNET_PROGRAM_ID || DEFAULT_PROGRAM_IDS.solanaRwa,
    identityRegistry: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_LOCALNET_PROGRAM_ID || DEFAULT_PROGRAM_IDS.identityRegistry,
    complianceAggregator: process.env.NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_LOCALNET_PROGRAM_ID || DEFAULT_PROGRAM_IDS.complianceAggregator,
  },
  devnet: {
    solanaRwa: process.env.NEXT_PUBLIC_SOLANA_RWA_DEVNET_PROGRAM_ID || DEFAULT_PROGRAM_IDS.solanaRwa,
    identityRegistry: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_DEVNET_PROGRAM_ID || DEFAULT_PROGRAM_IDS.identityRegistry,
    complianceAggregator: process.env.NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_DEVNET_PROGRAM_ID || DEFAULT_PROGRAM_IDS.complianceAggregator,
  },
  mainnet: {
    solanaRwa: process.env.NEXT_PUBLIC_SOLANA_RWA_MAINNET_PROGRAM_ID || DEFAULT_PROGRAM_IDS.solanaRwa,
    identityRegistry: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_MAINNET_PROGRAM_ID || DEFAULT_PROGRAM_IDS.identityRegistry,
    complianceAggregator: process.env.NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_MAINNET_PROGRAM_ID || DEFAULT_PROGRAM_IDS.complianceAggregator,
  },
} as const;

/**
 * Detect network from RPC URL
 */
export function getNetworkFromUrl(url: string): NetworkType {
  if (url.includes('localnet') || url.includes('localhost') || url.includes('127.0.0.1')) {
    return 'localnet';
  }
  if (url.includes('devnet')) {
    return 'devnet';
  }
  return 'mainnet';
}

/**
 * Get the current network from environment variables
 */
export function getCurrentNetwork(): NetworkType {
  return (process.env.NEXT_PUBLIC_SOLANA_NETWORK as NetworkType) || 'localnet';
}

/**
 * Get Connection instance for the specified network
 */
export function getConnection(network: NetworkType = 'localnet'): Connection {
  const customEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT;
  
  if (customEndpoint && network === 'localnet') {
    return new Connection(customEndpoint, 'confirmed');
  }
  
  const urls: Record<NetworkType, string> = {
    localnet: 'http://localhost:8899',
    devnet: clusterApiUrl('devnet'),
    mainnet: clusterApiUrl('mainnet-beta'),
  };
  
  return new Connection(urls[network], 'confirmed');
}

/**
 * Get RPC endpoint URL for the specified network
 */
export function getConnectionUrl(network: NetworkType = 'localnet'): string {
  const customEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT;
  
  if (customEndpoint && network === 'localnet') {
    return customEndpoint;
  }
  
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
  preferredWallets: ['phantom', 'solflare', 'ledger'],
  maxWallets: 10,
} as const;
