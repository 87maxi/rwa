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
 * Program IDs configuration with environment variable support.
 * Falls back to defaults for localnet, requires env vars for devnet/mainnet.
 */
// getProgramIds is used internally for dynamic program ID resolution
function getProgramIds(network: NetworkType) {
  const defaults = {
    localnet: {
      solanaRwa: "EwAUDz8ZVXqJQqYYcd8ZEPSGpx2HvG61PweDThK5vrQt",
      identityRegistry: "48szCrY5scr6MbqdTDJe8X8NAWejkRaiTe4VEyCGRTu9",
      complianceAggregator: "AmFr5NUWU3E4neLzKHe2pkX5yTochgFTUHtwMB7aDszK",
    },
    devnet: {
      solanaRwa: process.env.NEXT_PUBLIC_SOLANA_RWA_DEVNET_PROGRAM_ID || '',
      identityRegistry: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_DEVNET_PROGRAM_ID || '',
      complianceAggregator: process.env.NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_DEVNET_PROGRAM_ID || '',
    },
    mainnet: {
      solanaRwa: process.env.NEXT_PUBLIC_SOLANA_RWA_MAINNET_PROGRAM_ID || '',
      identityRegistry: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_MAINNET_PROGRAM_ID || '',
      complianceAggregator: process.env.NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_MAINNET_PROGRAM_ID || '',
    },
  };

  return defaults[network];
}

export const PROGRAM_IDS = {
  localnet: {
    solanaRwa: "EwAUDz8ZVXqJQqYYcd8ZEPSGpx2HvG61PweDThK5vrQt",
    identityRegistry: "48szCrY5scr6MbqdTDJe8X8NAWejkRaiTe4VEyCGRTu9",
    complianceAggregator: "AmFr5NUWU3E4neLzKHe2pkX5yTochgFTUHtwMB7aDszK",
  },
  devnet: {
    solanaRwa: process.env.NEXT_PUBLIC_SOLANA_RWA_DEVNET_PROGRAM_ID || '',
    identityRegistry: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_DEVNET_PROGRAM_ID || '',
    complianceAggregator: process.env.NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_DEVNET_PROGRAM_ID || '',
  },
  mainnet: {
    solanaRwa: process.env.NEXT_PUBLIC_SOLANA_RWA_MAINNET_PROGRAM_ID || '',
    identityRegistry: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_MAINNET_PROGRAM_ID || '',
    complianceAggregator: process.env.NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_MAINNET_PROGRAM_ID || '',
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
