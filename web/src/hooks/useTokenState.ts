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

  const fetchTokenState = useCallback(async () => {
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
  }, [tokenAccountPubkey, connection]);

  useEffect(() => {
    fetchTokenState();
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
 * Deserialize TokenState from Borsh-encoded data
 * Note: This is a simplified deserializer. For production, use @coral-xyz/borsh
 */
function deserializeTokenState(data: Buffer): TokenState {
  let offset = 0;

  const readPubkey = (): string => {
    const pubkey = data.slice(offset, offset + 32).toString('base64');
    offset += 32;
    return pubkey;
  };

  const readU8 = (): number => {
    const value = data.readUInt8(offset);
    offset += 1;
    return value;
  };

  const readU64 = (): bigint => {
    // Read little-endian u64
    let value = 0n;
    for (let i = 7; i >= 0; i--) {
      value = (value << 8n) | BigInt(data.readUInt8(offset + i));
    }
    offset += 8;
    return value;
  };

  const readString = (): string => {
    const len = data.readUInt32LE(offset);
    offset += 4;
    const str = data.slice(offset, offset + len).toString('utf-8');
    offset += len;
    return str;
  };

  const readPubkeyVec = (): string[] => {
    const len = data.readUInt32LE(offset);
    offset += 4;
    const vec: string[] = [];
    for (let i = 0; i < len; i++) {
      vec.push(readPubkey());
    }
    return vec;
  };

  const readBalanceEntryVec = (): BalanceEntry[] => {
    const len = data.readUInt32LE(offset);
    offset += 4;
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
    const len = data.readUInt32LE(offset);
    offset += 4;
    const vec: FrozenEntry[] = [];
    for (let i = 0; i < len; i++) {
      vec.push({
        key: readPubkey(),
        frozen: data.readUInt8(offset) !== 0,
      });
      offset += 1;
    }
    return vec;
  };

  // Anchor discriminator (8 bytes)
  offset += 8;

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
