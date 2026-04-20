/**
 * Solana Utility Functions
 * 
 * Validation, formatting, and helper utilities for Solana addresses and transactions.
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Validate a Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a Solana address for display (short version)
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 2) {
    return address;
  }
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format a transaction signature for display
 */
export function formatSignature(signature: string): string {
  return formatAddress(signature, 8);
}

/**
 * Explorer URL for transaction
 */
export function getExplorerUrl(
  signature: string,
  network: 'localnet' | 'devnet' | 'mainnet' = 'devnet'
): string {
  if (network === 'localnet') {
    return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=http://localhost:8899`;
  }
  return `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
}

/**
 * Format number with commas and decimal places
 */
export function formatNumber(value: number | bigint, decimals = 2): string {
  const num = typeof value === 'bigint' ? Number(value) : value;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Copy to clipboard utility
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
