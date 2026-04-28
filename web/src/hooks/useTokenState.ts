'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
// Token State interface matching Anchor IDL
export interface BalanceEntry {
  key: string;
  value: bigint;
}

export interface FrozenEntry {
  key: string;
  frozen: boolean;
}

export interface TokenState {
  owner: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  balances: BalanceEntry[];
  frozenAccounts: FrozenEntry[];
  agents: string[];
  complianceModules: string[];
}

export interface TokenStateResponse {
  state: TokenState | null;
  loading: boolean;
  error: string | null;
}


/**
 * Hook para obtener el estado del TokenState on-chain
 */
export function useTokenState(tokenAccountPubkey: string | null): TokenStateResponse {
  const { connection } = useConnection();
  const [state, setState] = useState<TokenState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectionRef = useRef(connection);

  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  const fetchTokenState = useCallback(async () => {
    const currentConnection = connectionRef.current;
    if (!tokenAccountPubkey || !currentConnection) {
      setState(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const publicKey = new PublicKey(tokenAccountPubkey);
      const accountInfo = await currentConnection.getAccountInfo(publicKey, 'confirmed');

      if (!accountInfo) {
        setState(null);
        return;
      }

      // Deserialize the account data (Anchor uses Borsh serialization)
      const tokenState = deserializeTokenState(accountInfo.data);
      setState(tokenState);
    } catch (err) {
      console.error('Error fetching token state:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [tokenAccountPubkey]);

  useEffect(() => {
    // Async IIFE to fetch initial state
    (async () => {
      await fetchTokenState();
    })();
  }, [fetchTokenState]);

  // Subscribe to account changes
  useEffect(() => {
    if (!tokenAccountPubkey || !connection) return;

    try {
      const publicKey = new PublicKey(tokenAccountPubkey);
      const subscriptionId = connection.onAccountChange(
        publicKey,
        (accountInfo) => {
          if (accountInfo && accountInfo.data.length > 0) {
            const tokenState = deserializeTokenState(accountInfo.data);
            setState(tokenState);
          } else {
            setState(null);
          }
        },
        'confirmed'
      );

      return () => {
        connection.removeAccountChangeListener(subscriptionId);
      };
    } catch (err) {
      console.error('Error setting up account subscription:', err);
    }
  }, [tokenAccountPubkey, connection]);

  return { state, loading, error };
}

/**
 * Deserialize TokenState from zero_copy layout data.
 * Uses #[repr(C)] layout matching Anchor's zero_copy account serialization.
 *
 * Optimized Rust struct layout (zero_copy, repr(C)) - 120 bytes:
 *   pub struct TokenState {
 *       pub owner: Pubkey,           // Offset 0:   32 bytes
 *       pub freeze_authority: Pubkey, // Offset 32:  32 bytes
 *       pub total_supply: u64,        // Offset 64:  8 bytes
 *       pub name: [u8; 32],           // Offset 72:  32 bytes (fixed array, null-padded)
 *       pub symbol: [u8; 8],          // Offset 104: 8 bytes (fixed array, null-padded)
 *       pub decimals: u8,             // Offset 112: 1 byte
 *       pub bump: u8,                 // Offset 113: 1 byte
 *       pub _padding: [u8; 6],        // Offset 114: 6 bytes
 *   }
 *   Total: 120 bytes (no discriminator, no Vecs)
 *
 * Note: Anchor zero_copy accounts do NOT include an 8-byte discriminator prefix.
 * The discriminator is only used in instruction data, not in account data for zero_copy.
 */
function deserializeTokenState(data: Buffer): TokenState {
  // Anchor AccountLoader adds 8-byte discriminator prefix even for zero_copy
  const discriminatorSize = 8;
  const minSize = discriminatorSize + 120;

  if (data.length < minSize) {
    throw new Error(`Invalid data length: ${data.length}, expected at least ${minSize} bytes for TokenState`);
  }

  let offset = discriminatorSize;

  const readPubkey = (): string => {
    if (offset + 32 > data.length) {
      throw new Error(`Cannot read pubkey: not enough data at offset ${offset}`);
    }
    const pubkeyBytes = data.slice(offset, offset + 32);
    offset += 32;
    return hexToBase58(pubkeyBytes.toString('hex'));
  };

  const readU8 = (): number => {
    if (offset + 1 > data.length) {
      throw new Error(`Cannot read u8: not enough data at offset ${offset}`);
    }
    const value = data.readUInt8(offset);
    offset += 1;
    return value;
  };

  const readU64 = (): bigint => {
    if (offset + 8 > data.length) {
      throw new Error(`Cannot read u64: not enough data at offset ${offset}`);
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const value = view.getBigUint64(offset, true); // little-endian
    offset += 8;
    return value;
  };

  /**
   * Read a fixed-size null-padded string from a [u8; N] array.
   * Reads until the first null byte (0x00) or the array end.
   */
  const readFixedString = (length: number): string => {
    if (offset + length > data.length) {
      throw new Error(`Cannot read fixed string: length ${length} exceeds buffer at offset ${offset}`);
    }
    const slice = data.slice(offset, offset + length);
    offset += length;
    // Find null terminator or use full slice
    const nullIndex = slice.indexOf(0);
    const strBytes = nullIndex >= 0 ? slice.slice(0, nullIndex) : slice;
    return strBytes.toString('utf-8').trim();
  };

  const readPadding = (length: number) => {
    offset += length;
  };

  // Offset 0:   owner: Pubkey (32 bytes)
  const owner = readPubkey();
  // Offset 32:  freeze_authority: Pubkey (32 bytes)
  const freezeAuthority = readPubkey();
  // Offset 64:  total_supply: u64 (8 bytes)
  const totalSupply = readU64();
  // Offset 72:  name: [u8; 32] (32 bytes)
  const name = readFixedString(32);
  // Offset 104: symbol: [u8; 8] (8 bytes)
  const symbol = readFixedString(8);
  // Offset 112: decimals: u8 (1 byte)
  const decimals = readU8();
  // Offset 113: bump: u8 (1 byte)
  const bump = readU8();
  // Offset 114: _padding: [u8; 6] (6 bytes)
  readPadding(6);

  return {
    owner,
    name,
    symbol,
    decimals,
    totalSupply,
    // PDA architecture: balances, frozen, agents are separate accounts (PDAs)
    // These are empty in TokenState as they don't exist as Vec fields
    balances: [],
    frozenAccounts: [],
    agents: [],
    complianceModules: [],
  };
}

/**
 * Convert pubkey hex string to base58 encoding
 * Simplified implementation - uses public key bytes directly
 */
// hexToBase58 is available for future use when base58 encoding is needed
function hexToBase58(hex: string): string {
  // For display purposes, we return the hex representation
  // In production, use a proper base58 library like @solana/web3.js
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const base = BigInt(58);
  let num = BigInt('0x' + hex);
  let result = '';

  while (num > 0n) {
    const remainder = Number(num % base);
    num = num / base;
    result = ALPHABET[remainder] + result;
  }

  // Handle leading zeros
  for (const byteHex of hex.match(/.{2}/g) || []) {
    if (byteHex === '00') {
      result = '1' + result;
    } else {
      break;
    }
  }

  return result || '1';
}

/**
 * Format token balance for display
 */
export function formatBalance(amount: bigint, decimals: number): string {
  const amountStr = amount.toString();
  const paddedAmount = amountStr.padStart(Number(decimals) + 1, '0');
  const integerPart = paddedAmount.slice(0, paddedAmount.length - Number(decimals));
  const fractionalPart = paddedAmount.slice(paddedAmount.length - Number(decimals));
  
  const formattedFractional = fractionalPart.replace(/0+$/, '');
  
  return formattedFractional
    ? `${integerPart}.${formattedFractional}`
    : integerPart;
}
