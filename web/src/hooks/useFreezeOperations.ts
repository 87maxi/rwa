/**
 * useFreezeOperations.ts
 * 
 * Hook para manejar operaciones de freeze/unfreeze de cuentas de tokens.
 * Proporciona funciones unificadas para congelar/descongelar wallets.
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  buildFreezeInstruction,
  buildUnfreezeInstruction,
} from '@/anchor/solana-rwa';
import { deriveFrozenPda } from '@/anchor/pdas';
import { executeTransaction } from '@/anchor/client';

// ============================================================================
// Types
// ============================================================================

export interface FreezeResult {
  signature: string | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export interface UseFreezeOperationsProps {
  tokenStatePda: PublicKey;
  currentAuthority: PublicKey;
  freezeAuthorityPda: PublicKey;
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
}

export interface FreezeOperationsReturn {
  freezeAccount: (walletAddress: string) => Promise<FreezeResult>;
  unfreezeAccount: (walletAddress: string) => Promise<FreezeResult>;
  loading: boolean;
  error: string | null;
  signature: string | null;
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFreezeOperations({
  tokenStatePda,
  currentAuthority,
  freezeAuthorityPda,
  onSuccess,
  onError,
}: UseFreezeOperationsProps): FreezeOperationsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  
  const signTransactionRef = useRef<((tx: any) => Promise<any>) | null>(null);

  const execute = useCallback(async (
    walletAddress: string,
    instructionBuilder: (
      tokenState: PublicKey,
      authority: PublicKey,
      walletToFreeze: PublicKey,
      frozenAccount: PublicKey,
      programId: PublicKey
    ) => { keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>; data: Buffer }
  ): Promise<FreezeResult> => {
    // Validate wallet address
    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(walletAddress);
    } catch {
      const errorMessage = 'Invalid wallet address';
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    }

    // Validate authority
    if (!currentAuthority) {
      const errorMessage = 'No current authority available';
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      // Derive frozen account PDA
      const frozenPda = deriveFrozenPda(tokenStatePda, walletPubkey, 
        new PublicKey('2XuB3ngjvJkMTxB82eM9NszBUGNovjuJUs4mzdez7EEX'));

      // Build instruction
      const instruction = instructionBuilder(
        tokenStatePda,
        currentAuthority,
        walletPubkey,
        frozenPda,
        new PublicKey('2XuB3ngjvJkMTxB82eM9NszBUGNovjuJUs4mzdez7EEX')
      );

      // Execute transaction
      // Note: signTransaction should be provided by the parent component
      const sig = await executeTransaction(
        window.solana?.connection,
        instruction,
        currentAuthority,
        new PublicKey('2XuB3ngjvJkMTxB82eM9NszBUGNovjuJUs4mzdez7EEX'),
        // @ts-ignore - signTransaction will be provided by wallet adapter
        window.solana?.signTransaction
      );

      setSignature(sig);
      onSuccess?.(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err: any) {
      const errorMessage = err?.message || 'Transaction failed';
      setError(errorMessage);
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [tokenStatePda, currentAuthority, onSuccess, onError]);

  const freezeAccount = useCallback(async (
    walletAddress: string
  ): Promise<FreezeResult> => {
    return execute(walletAddress, buildFreezeInstruction);
  }, [execute]);

  const unfreezeAccount = useCallback(async (
    walletAddress: string
  ): Promise<FreezeResult> => {
    return execute(walletAddress, buildUnfreezeInstruction);
  }, [execute]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSignature(null);
  }, []);

  return {
    freezeAccount,
    unfreezeAccount,
    loading,
    error,
    signature,
    reset,
  };
}
