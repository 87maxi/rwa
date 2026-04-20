'use client';

import { useState, useEffect, useCallback } from 'react';
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
  nextIndex: bigint;
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
  const [mounted, setMounted] = useState(false);

  // Set mounted state on client side only to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTokenState = useCallback(async () => {
    if (!mounted) return; // Skip if not mounted yet
    if (!tokenAccountPubkey || !connection) {
      setState(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const publicKey = new PublicKey(tokenAccountPubkey);
      const accountInfo = await connection.getAccountInfo(publicKey, 'confirmed');

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
  }, [tokenAccountPubkey, connection, mounted]);

  useEffect(() => {
    if (!mounted) return; // Skip if not mounted yet
    fetchTokenState();
  }, [fetchTokenState, mounted]);

  // Subscribe to account changes
  useEffect(() => {
    if (!mounted) return; // Skip if not mounted yet
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
  }, [tokenAccountPubkey, connection, mounted]);

  return { state, loading, error };
}

/**
 * Deserialize TokenState from Borsh-encoded data
 * Uses correct Borsh deserialization matching Anchor's Rust struct layout
 *
 * Rust struct layout (from lib.rs):
 * pub struct TokenState {
 *     pub owner: Pubkey,           // 32 bytes
 *     pub name: String,            // 4 bytes len + str
 *     pub symbol: String,          // 4 bytes len + str
 *     pub decimals: u8,            // 1 byte
 *     pub totalSupply: u64,        // 8 bytes
 *     pub nextIndex: u64,          // 8 bytes (agents counter)
 *     pub balances: Vec<BalanceEntry>,
 *     pub frozen_accounts: Vec<FrozenEntry>,
 *     pub agents: Vec<Pubkey>,     // Vec is length-prefixed
 *     pub compliance_modules: Vec<Pubkey>,
 * }
 */
function deserializeTokenState(data: Buffer, discriminatorSize: number = 8): TokenState {
  if (data.length < discriminatorSize + 32 + 4) {
    throw new Error(`Invalid data length: ${data.length}, expected at least ${discriminatorSize + 32 + 4}`);
  }

  let offset = discriminatorSize;

  const readPubkey = (): string => {
    if (offset + 32 > data.length) {
      throw new Error(`Cannot read pubkey: not enough data at offset ${offset}`);
    }
    const pubkeyBytes = data.slice(offset, offset + 32);
    // Convert to base58 using manual implementation
    const pubkey = pubkeyBytes.toString('hex');
    offset += 32;
    return pubkey;
  };

  const readU8 = (): number => {
    if (offset + 1 > data.length) {
      throw new Error(`Cannot read u8: not enough data at offset ${offset}`);
    }
    const value = data.readUInt8(offset);
    offset += 1;
    return value;
  };

  // readU16 is available for future use when u16 fields are added
  // const readU16 = (): number => {
  //   if (offset + 2 > data.length) {
  //     throw new Error(`Cannot read u16: not enough data at offset ${offset}`);
  //   }
  //   const value = data.readUInt16LE(offset);
  //   offset += 2;
  //   return value;
  // };

  const readU32 = (): number => {
    if (offset + 4 > data.length) {
      throw new Error(`Cannot read u32: not enough data at offset ${offset}`);
    }
    const value = data.readUInt32LE(offset);
    offset += 4;
    return value;
  };

  const readU64 = (): bigint => {
    if (offset + 8 > data.length) {
      throw new Error(`Cannot read u64: not enough data at offset ${offset}`);
    }
    // Read little-endian u64 using DataView for correctness
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const value = view.getBigUint64(offset, true); // true = little-endian
    offset += 8;
    return value;
  };

  // readI64 is available for future use when i64 fields are added
  // const readI64 = (): bigint => {
  //   if (offset + 8 > data.length) {
  //     throw new Error(`Cannot read i64: not enough data at offset ${offset}`);
  //   }
  //   // Read signed 64-bit integer (little-endian) manually
  //   let value = 0n;
  //   for (let i = 7; i >= 0; i--) {
  //     value = (value << 8n) | BigInt(data[offset + i]);
  //   }
  //   // Convert to signed if necessary
  //   const maxU64 = 2n ** 64n - 1n;
  //   const halfMaxU64 = 2n ** 63n;
  //   if (value > maxU64) {
  //     throw new Error('Value exceeds u64 range');
  //   }
  //   if (value >= halfMaxU64) {
  //     value = value - (2n ** 64n); // Convert to signed
  //   }
  //   offset += 8;
  //   return value;
  // };

  const readString = (): string => {
    const len = readU32();
    if (offset + len > data.length) {
      throw new Error(`Cannot read string: length ${len} exceeds buffer at offset ${offset}`);
    }
    const str = data.slice(offset, offset + len).toString('utf-8');
    offset += len;
    return str;
  };

  const readPubkeyVec = (): string[] => {
    const len = readU32();
    const vec: string[] = [];
    for (let i = 0; i < len; i++) {
      vec.push(readPubkey());
    }
    return vec;
  };

  const readBalanceEntryVec = (): BalanceEntry[] => {
    const len = readU32();
    const vec: BalanceEntry[] = [];
    for (let i = 0; i < len; i++) {
      vec.push({
        key: readPubkey(),
        value: readU64(),
      });
    }
    return vec;
  };

  const readFrozenEntryVec = (): FrozenEntry[] => {
    const len = readU32();
    const vec: FrozenEntry[] = [];
    for (let i = 0; i < len; i++) {
      vec.push({
        key: readPubkey(),
        frozen: readU8() !== 0,
      });
    }
    return vec;
  };

  // Note: discriminator already skipped at line 133 (offset = discriminatorSize)

  return {
    owner: readPubkey(),
    name: readString(),
    symbol: readString(),
    decimals: readU8(),
    totalSupply: readU64(),
    nextIndex: readU64(),
    balances: readBalanceEntryVec(),
    frozenAccounts: readFrozenEntryVec(),
    agents: readPubkeyVec(),
    complianceModules: readPubkeyVec(),
  };
}

/**
 * Convert pubkey hex string to base58 encoding
 * Simplified implementation - uses public key bytes directly
 */
// hexToBase58 is available for future use when base58 encoding is needed
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _hexToBase58(hex: string): string {
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
