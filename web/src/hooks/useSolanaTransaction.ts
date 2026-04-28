'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';

/**
 * Result of a transaction execution
 */
export interface TransactionResult {
  signature: string | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

/**
 * Base hook for Solana transactions.
 *
 * Extracts common transaction logic (loading, error, signature state)
 * and the signAndSend function shared across all action hooks.
 */
export function useSolanaTransaction() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, wallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  // Refs to stabilize callbacks and avoid exhaustive-deps warnings
  const signTransactionRef = useRef(signTransaction);
  const publicKeyRef = useRef(publicKey);
  const walletRef = useRef(wallet);

  useEffect(() => {
    signTransactionRef.current = signTransaction;
  }, [signTransaction]);

  useEffect(() => {
    publicKeyRef.current = publicKey;
  }, [publicKey]);

  useEffect(() => {
    walletRef.current = wallet;
  }, [wallet]);

  const reset = useCallback(() => {
    setError(null);
    setSignature(null);
  }, []);

  /**
   * Sign and send a transaction using the wallet adapter.
   * Uses sendRawTransaction approach to avoid "Plugin Closed" errors with Backpack.
   */
  const signAndSend = useCallback(async (
    transaction: Transaction,
    _programId: PublicKey
  ): Promise<string> => {
    const currentPublicKey = publicKeyRef.current;
    if (!currentPublicKey) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }
    const currentSignTransaction = signTransactionRef.current;
    if (!currentSignTransaction) {
      throw new Error('Wallet does not support transaction signing. Please use a wallet like Phantom or Solflare.');
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = currentPublicKey;

    try {
      const signedTransaction = await currentSignTransaction(transaction);
      const serializedTransaction = signedTransaction.serialize({ verifySignatures: false });

      console.log('[useSolanaTransaction] Sending raw transaction...');
      const sig = await connection.sendRawTransaction(serializedTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });

      console.log('[useSolanaTransaction] Transaction sent, signature:', sig.slice(0, 32) + '...');

      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      console.log('[useSolanaTransaction] Transaction confirmed');

      return sig;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('User rejected') || message.includes('rejected') || message.includes('User canceled')) {
        throw new Error('Transaction rejected by user.');
      }
      if (message.includes('blockhash not found') || message.includes('Blockhash not found')) {
        throw new Error('Failed to get a valid blockhash. Please try again.');
      }
      if (message.includes('No signers') || message.includes('no signers')) {
        throw new Error('Transaction signing failed. The wallet did not sign the transaction. Please ensure your wallet is connected and try again.');
      }
      if (message.includes('Plugin Closed') || message.includes('plugin closed')) {
        console.warn('[useSolanaTransaction] sendTransaction failed with Plugin Closed, retrying with sendRawTransaction...');

        const signedTransaction = await currentSignTransaction(transaction);
        const serializedTransaction = signedTransaction.serialize({ verifySignatures: false });

        const sig = await connection.sendRawTransaction(serializedTransaction, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        });

        await connection.confirmTransaction(
          { signature: sig, blockhash, lastValidBlockHeight },
          'confirmed'
        );

        return sig;
      }
      throw err;
    }
  }, [connection]);

  /**
   * Execute an instruction builder result as a transaction.
   * Wraps the common pattern of building instruction -> creating transaction -> signing and sending.
   */
  const executeInstruction = useCallback(async <T extends { keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>; data: Buffer }>(
    instructionBuilder: () => T,
    programId: PublicKey
  ): Promise<string> => {
    const { keys, data } = instructionBuilder();

    const transaction = new Transaction();
    transaction.add(new TransactionInstruction({
      keys,
      data,
      programId,
    }));

    return signAndSend(transaction, programId);
  }, [signAndSend]);

  return {
    loading,
    error,
    signature,
    setLoading,
    setError,
    setSignature,
    reset,
    signAndSend,
    executeInstruction,
    publicKey: publicKeyRef,
    signTransaction: signTransactionRef,
    wallet: walletRef,
    connection,
  };
}
