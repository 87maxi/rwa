'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
  buildTransferInstruction,
  buildMintInstruction,
  buildBurnInstruction,
  executeTransaction,
  deriveBalancePda,
  deriveAgentPda,
} from '@/anchor/client';
import { isValidSolanaAddress } from '@/utils/solana';
import { getCurrentNetwork, PROGRAM_IDS } from '@/config/solana';

export interface TransactionResult {
  signature: string | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export interface UseTransferOperationsProps {
  tokenStatePda: string | null;
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook para operaciones de transferencia de tokens.
 * 
 * Encapsula la lógica de:
 * - transferTokens
 * - mintTokens
 * - burnTokens
 * 
 * Con manejo unificado de loading, error y success.
 */
export function useTransferOperations({
  tokenStatePda,
  onSuccess,
  onError,
}: UseTransferOperationsProps) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  // Refs to stabilize callbacks
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

  const transferTokens = useCallback(async (
    recipient: string,
    amount: number
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKeyRef.current;
    
    if (!currentPublicKey || !tokenStatePda) {
      const errorMsg = 'Wallet not connected or token not selected';
      setError(errorMsg);
      onError?.(errorMsg);
      return { signature: null, loading: false, error: errorMsg, success: false };
    }

    if (!isValidSolanaAddress(recipient)) {
      const errorMsg = 'Invalid recipient address';
      setError(errorMsg);
      onError?.(errorMsg);
      return { signature: null, loading: false, error: errorMsg, success: false };
    }

    if (amount <= 0) {
      const errorMsg = 'Amount must be greater than zero';
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
      const recipientPubkey = new PublicKey(recipient);

      const instruction = buildTransferInstruction(
        tokenStatePubkey,
        currentPublicKey,
        currentPublicKey,
        recipientPubkey,
        recipientPubkey,
        BigInt(amount),
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

  const mintTokens = useCallback(async (
    recipient: string,
    amount: number
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKeyRef.current;
    
    if (!currentPublicKey || !tokenStatePda) {
      const errorMsg = 'Wallet not connected or token not selected';
      setError(errorMsg);
      onError?.(errorMsg);
      return { signature: null, loading: false, error: errorMsg, success: false };
    }

    if (!isValidSolanaAddress(recipient)) {
      const errorMsg = 'Invalid recipient address';
      setError(errorMsg);
      onError?.(errorMsg);
      return { signature: null, loading: false, error: errorMsg, success: false };
    }

    if (amount <= 0) {
      const errorMsg = 'Amount must be greater than zero';
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
      const recipientPubkey = new PublicKey(recipient);

      // Derive agent account PDA
      const agentPda = deriveAgentPda(tokenStatePubkey, currentPublicKey, programId);
      
      // Derive balance account PDA for recipient
      const balancePda = deriveBalancePda(tokenStatePubkey, recipientPubkey, programId);

      const instruction = buildMintInstruction(
        tokenStatePubkey,
        currentPublicKey,
        agentPda,
        recipientPubkey,
        balancePda,
        BigInt(amount),
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

  const burnTokens = useCallback(async (
    fromAddress: string,
    amount: number
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKeyRef.current;
    
    if (!currentPublicKey || !tokenStatePda) {
      const errorMsg = 'Wallet not connected or token not selected';
      setError(errorMsg);
      onError?.(errorMsg);
      return { signature: null, loading: false, error: errorMsg, success: false };
    }

    if (!isValidSolanaAddress(fromAddress)) {
      const errorMsg = 'Invalid from address';
      setError(errorMsg);
      onError?.(errorMsg);
      return { signature: null, loading: false, error: errorMsg, success: false };
    }

    if (amount <= 0) {
      const errorMsg = 'Amount must be greater than zero';
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
      const fromPubkey = new PublicKey(fromAddress);

      // Derive agent account PDA
      const agentPda = deriveAgentPda(tokenStatePubkey, currentPublicKey, programId);
      
      // Derive balance account PDA for sender
      const balancePda = deriveBalancePda(tokenStatePubkey, fromPubkey, programId);

      const instruction = buildBurnInstruction(
        tokenStatePubkey,
        currentPublicKey,
        agentPda,
        fromPubkey,
        balancePda,
        BigInt(amount),
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
    transferTokens,
    mintTokens,
    burnTokens,
    loading,
    error,
    signature,
    reset,
  };
}
