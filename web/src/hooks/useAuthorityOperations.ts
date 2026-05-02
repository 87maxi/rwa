'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
  buildTransferOwnerInstruction,
  buildTransferFreezeAuthorityInstruction,
  executeTransaction,
} from '@/anchor/client';
import { isValidSolanaAddress } from '@/utils/solana';
import { getCurrentNetwork, PROGRAM_IDS } from '@/config/solana';

export interface TransactionResult {
  signature: string | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export interface UseAuthorityOperationsProps {
  tokenStatePda: string | null;
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook para operaciones de autoridad (transfer owner, transfer freeze authority).
 */
export function useAuthorityOperations({
  tokenStatePda,
  onSuccess,
  onError,
}: UseAuthorityOperationsProps) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const signTransactionRef = useRef(signTransaction);
  const publicKeyRef = useRef(publicKey);

  useEffect(() => { signTransactionRef.current = signTransaction; }, [signTransaction]);
  useEffect(() => { publicKeyRef.current = publicKey; }, [publicKey]);

  const reset = useCallback(() => {
    setError(null);
    setSignature(null);
  }, []);

  const getProgramId = useCallback(() => {
    const network = getCurrentNetwork();
    const programIdStr = PROGRAM_IDS[network]?.solanaRwa;
    if (!programIdStr) {
      throw new Error('Solana RWA program ID not configured');
    }
    return new PublicKey(programIdStr);
  }, []);

  const transferOwner = useCallback(async (
    newOwner: string
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKeyRef.current;
    
    if (!currentPublicKey || !tokenStatePda) {
      const errorMsg = 'Wallet not connected or token not selected';
      setError(errorMsg);
      onError?.(errorMsg);
      return { signature: null, loading: false, error: errorMsg, success: false };
    }

    if (!isValidSolanaAddress(newOwner)) {
      const errorMsg = 'Invalid new owner address';
      setError(errorMsg);
      onError?.(errorMsg);
      return { signature: null, loading: false, error: errorMsg, success: false };
    }

    if (newOwner.toLowerCase() === currentPublicKey.toString().toLowerCase()) {
      const errorMsg = 'New owner cannot be the same as current owner';
      setError(errorMsg);
      onError?.(errorMsg);
      return { signature: null, loading: false, error: errorMsg, success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getProgramId();
      const tokenStatePubkey = new PublicKey(tokenStatePda);
      const newOwnerPubkey = new PublicKey(newOwner);

      const instruction = buildTransferOwnerInstruction(
        tokenStatePubkey,
        currentPublicKey,
        newOwnerPubkey,
        programId
      );

      if (!signTransactionRef.current) {
        const errorMsg = 'Wallet does not support transaction signing';
        setError(errorMsg);
        onError?.(errorMsg);
        return { signature: null, loading: false, error: errorMsg, success: false };
      }

      const sig = await executeTransaction(
        connection,
        instruction,
        currentPublicKey,
        programId,
        signTransactionRef.current
      );
      
      setSignature(sig);
      onSuccess?.(sig);
      
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [tokenStatePda, getProgramId, connection, onSuccess, onError]);

  const transferFreezeAuthority = useCallback(async (
    newFreezeAuthority: string
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKeyRef.current;
    
    if (!currentPublicKey || !tokenStatePda) {
      const errorMsg = 'Wallet not connected or token not selected';
      setError(errorMsg);
      onError?.(errorMsg);
      return { signature: null, loading: false, error: errorMsg, success: false };
    }

    if (!isValidSolanaAddress(newFreezeAuthority)) {
      const errorMsg = 'Invalid new freeze authority address';
      setError(errorMsg);
      onError?.(errorMsg);
      return { signature: null, loading: false, error: errorMsg, success: false };
    }

    if (newFreezeAuthority.toLowerCase() === currentPublicKey.toString().toLowerCase()) {
      const errorMsg = 'New freeze authority cannot be the same as current';
      setError(errorMsg);
      onError?.(errorMsg);
      return { signature: null, loading: false, error: errorMsg, success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getProgramId();
      const tokenStatePubkey = new PublicKey(tokenStatePda);
      const newFreezePubkey = new PublicKey(newFreezeAuthority);

      const instruction = buildTransferFreezeAuthorityInstruction(
        tokenStatePubkey,
        currentPublicKey,
        newFreezePubkey,
        programId
      );

      if (!signTransactionRef.current) {
        const errorMsg = 'Wallet does not support transaction signing';
        setError(errorMsg);
        onError?.(errorMsg);
        return { signature: null, loading: false, error: errorMsg, success: false };
      }

      const sig = await executeTransaction(
        connection,
        instruction,
        currentPublicKey,
        programId,
        signTransactionRef.current
      );
      
      setSignature(sig);
      onSuccess?.(sig);
      
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [tokenStatePda, getProgramId, connection, onSuccess, onError]);

  return {
    transferOwner,
    transferFreezeAuthority,
    loading,
    error,
    signature,
    reset,
  };
}
