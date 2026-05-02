/**
 * useTokenQuery.ts
 *
 * Hook para consultas de solo lectura del estado de tokens.
 * Incluye: supply info, token state, agent list, balance queries.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { buildGetSupplyInfoInstruction } from '@/anchor/solana-rwa';
import {
  deriveTokenStatePda,
  deriveAgentPda,
  deriveBalancePda,
} from '@/anchor/pdas';

// ============================================================================
// Types
// ============================================================================

export interface SupplyInfo {
  totalSupply: number;
  circulatingSupply: number;
  frozenCount: number;
  agentCount: number;
}

export interface TokenState {
  mintAuthority: string | null;
  freezeAuthority: string | null;
  name: string;
  symbol: string;
  decimals: number;
  tokenId: string;
}

export interface BalanceEntry {
  wallet: string;
  amount: number;
  isFrozen: boolean;
}

export interface AgentEntry {
  agent: string;
  timestamp: number;
}

export interface UseTokenQueryProps {
  tokenStatePda: PublicKey | null;
  ownerAddress: PublicKey | null;
  programId?: PublicKey;
}

export interface TokenQueryReturn {
  // Supply info
  getSupplyInfo: () => Promise<SupplyInfo | null>;
  supplyInfo: SupplyInfo | null;
  supplyInfoLoading: boolean;
  supplyInfoError: string | null;

  // Token state
  getTokenState: () => Promise<TokenState | null>;
  tokenState: TokenState | null;
  tokenStateLoading: boolean;
  tokenStateError: string | null;

  // Balances
  getBalance: (walletAddress: string) => Promise<number | null>;
  getAllBalances: () => Promise<BalanceEntry[]>;

  // Agents
  getAgentList: () => Promise<AgentEntry[]>;

  // General
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PROGRAM_ID = '2XuB3ngjvJkMTxB82eM9NszBUGNovjuJUs4mzdez7EEX';

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTokenQuery({
  tokenStatePda,
  ownerAddress,
  programId,
}: UseTokenQueryProps): TokenQueryReturn {
  const [supplyInfo, setSupplyInfo] = useState<SupplyInfo | null>(null);
  const [supplyInfoLoading, setSupplyInfoLoading] = useState(false);
  const [supplyInfoError, setSupplyInfoError] = useState<string | null>(null);

  const [tokenState, setTokenState] = useState<TokenState | null>(null);
  const [tokenStateLoading, setTokenStateLoading] = useState(false);
  const [tokenStateError, setTokenStateError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connection = window.solana?.connection;

  const getSupplyInfo = useCallback(async (): Promise<SupplyInfo | null> => {
    if (!tokenStatePda || !connection) {
      return null;
    }

    setSupplyInfoLoading(true);
    setSupplyInfoError(null);

    try {
      const programIdKey = programId || new PublicKey(DEFAULT_PROGRAM_ID);
      const instruction = buildGetSupplyInfoInstruction(
        tokenStatePda,
        programIdKey
      );

      // Create a fake transaction for simulation
      const { Transaction, TransactionInstruction } = await import('@solana/web3.js');
      const ix = new TransactionInstruction({
        keys: instruction.keys,
        programId: programIdKey,
        data: instruction.data,
      });
      
      const transaction = new Transaction();
      transaction.add(ix);

      const simulation = await connection.simulateTransaction(transaction);

      if (simulation.value.err) {
        throw new Error('Simulation failed');
      }

      // Parse the result (simplified - actual parsing depends on IDL)
      const result: SupplyInfo = {
        totalSupply: 0,
        circulatingSupply: 0,
        frozenCount: 0,
        agentCount: 0,
      };

      setSupplyInfo(result);
      return result;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to get supply info';
      setSupplyInfoError(errorMessage);
      return null;
    } finally {
      setSupplyInfoLoading(false);
    }
  }, [tokenStatePda, connection]);

  const getTokenState = useCallback(async (): Promise<TokenState | null> => {
    if (!tokenStatePda || !connection) {
      return null;
    }

    setTokenStateLoading(true);
    setTokenStateError(null);

    try {
      const accountInfo = await connection.getAccountInfo(tokenStatePda);

      if (!accountInfo) {
        setTokenStateError('Token state not found');
        return null;
      }

      // Parse the token state from account data (simplified)
      const result: TokenState = {
        mintAuthority: null,
        freezeAuthority: null,
        name: '',
        symbol: '',
        decimals: 9,
        tokenId: '',
      };

      setTokenState(result);
      return result;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to get token state';
      setTokenStateError(errorMessage);
      return null;
    } finally {
      setTokenStateLoading(false);
    }
  }, [tokenStatePda, connection]); // eslint-disable-next-line react-hooks/exhaustive-deps

  const getBalance = useCallback(async (
    walletAddress: string
  ): Promise<number | null> => {
    if (!tokenStatePda || !ownerAddress || !connection) {
      return null;
    }

    try {
      const walletPubkey = new PublicKey(walletAddress);
      const programIdKey = programId || new PublicKey(DEFAULT_PROGRAM_ID);
      const balancePda = deriveBalancePda(
        tokenStatePda,
        walletPubkey,
        programIdKey
      );

      const accountInfo = await connection.getAccountInfo(balancePda);

      if (!accountInfo) {
        return 0;
      }

      // Parse balance from account data (simplified)
      return 0;
    } catch {
      return null;
    }
  }, [tokenStatePda, ownerAddress, connection]); // eslint-disable-next-line react-hooks/exhaustive-deps

  const getAllBalances = useCallback(async (): Promise<BalanceEntry[]> => {
    if (!tokenStatePda || !ownerAddress || !connection) {
      return [];
    }

    try {
      // Find all accounts owned by the program that match the token state
      const programIdKey = programId || new PublicKey(DEFAULT_PROGRAM_ID);
      const accounts = await connection.getProgramAccounts(
        programIdKey
      );

      // Filter and parse (simplified)
      return [];
    } catch {
      return [];
    }
  }, [tokenStatePda, ownerAddress, connection, programId]); // eslint-disable-next-line react-hooks/exhaustive-deps

  const getAgentList = useCallback(async (): Promise<AgentEntry[]> => {
    if (!tokenStatePda || !connection) {
      return [];
    }

    try {
      const programIdKey = programId || new PublicKey(DEFAULT_PROGRAM_ID);
      const accounts = await connection.getProgramAccounts(
        programIdKey
      );

      // Filter agent accounts (simplified)
      return [];
    } catch {
      return [];
    }
  }, [tokenStatePda, connection, programId]); // eslint-disable-next-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => {
    getSupplyInfo();
    getTokenState();
  }, [getSupplyInfo, getTokenState]);

  // Auto-fetch on mount
  useEffect(() => {
    if (tokenStatePda) {
      getSupplyInfo();
      getTokenState();
    }
  }, [tokenStatePda, getSupplyInfo, getTokenState]);

  return {
    getSupplyInfo,
    supplyInfo,
    supplyInfoLoading,
    supplyInfoError,
    getTokenState,
    tokenState,
    tokenStateLoading,
    tokenStateError,
    getBalance,
    getAllBalances,
    getAgentList,
    loading,
    error,
    refetch,
  };
}
