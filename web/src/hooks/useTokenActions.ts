'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
  buildInitializeInstruction,
  buildMintInstruction,
  buildBurnInstruction,
  buildTransferInstruction,
  buildFreezeInstruction,
  buildUnfreezeInstruction,
  buildAddAgentInstruction,
  buildRemoveAgentInstruction,
  executeLegacyTransaction,
} from '@/anchor/client';
import { getCurrentNetwork, PROGRAM_IDS } from '@/config/solana';
import { isValidSolanaAddress } from '@/utils/solana';

// Token action result
export interface TransactionResult {
  signature: string | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

/**
 * Hook para acciones de tokens en Solana usando Anchor SDK
 */
export function useTokenActions(tokenAccountPubkey: string | null) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  // Note: No mounted state needed - actions are triggered by user interaction (not render)
  // so they don't cause hydration mismatch issues

  const reset = () => {
    setError(null);
    setSignature(null);
  };

  const getProgramPublicKey = useCallback(() => {
    const network = getCurrentNetwork();
    const programIdStr = PROGRAM_IDS[network]?.solanaRwa;
    if (!programIdStr) {
      throw new Error('Program ID not configured for current network');
    }
    return new PublicKey(programIdStr);
  }, []);

  // Helper to create transaction instruction
  const createInstruction = useCallback((
    keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>,
    data: Buffer,
    programId: PublicKey
  ): TransactionInstruction => {
    return new TransactionInstruction({
      keys,
      data,
      programId,
    });
  }, []);

  // Initialize token
  const initializeToken = useCallback(async (
    name: string,
    symbol: string,
    decimals: number
  ): Promise<TransactionResult> => {
    if (!tokenAccountPubkey || !publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected or token account not provided', success: false };
    }

    if (!isValidSolanaAddress(tokenAccountPubkey)) {
      return { signature: null, loading: false, error: 'Invalid token account address', success: false };
    }

    if (name.length > 32) {
      return { signature: null, loading: false, error: 'Token name too long (max 32 chars)', success: false };
    }
    if (symbol.length > 8) {
      return { signature: null, loading: false, error: 'Token symbol too long (max 8 chars)', success: false };
    }
    if (decimals < 0 || decimals > 18) {
      return { signature: null, loading: false, error: 'Decimals must be between 0 and 18', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getProgramPublicKey();
      const tokenState = new PublicKey(tokenAccountPubkey);

      const { keys, data } = buildInitializeInstruction(
        tokenState,
        publicKey,
        name,
        symbol,
        decimals,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

      const sig = await executeLegacyTransaction(connection, transaction, []);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [tokenAccountPubkey, publicKey, connection, getProgramPublicKey, createInstruction]);

  // Mint tokens
  const mintTokens = useCallback(async (
    recipient: string,
    amount: number | bigint
  ): Promise<TransactionResult> => {
    if (!tokenAccountPubkey || !publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected or token account not provided', success: false };
    }

    if (!isValidSolanaAddress(tokenAccountPubkey)) {
      return { signature: null, loading: false, error: 'Invalid token account address', success: false };
    }
    if (!isValidSolanaAddress(recipient)) {
      return { signature: null, loading: false, error: 'Invalid recipient address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getProgramPublicKey();
      const tokenState = new PublicKey(tokenAccountPubkey);
      const recipientPubkey = new PublicKey(recipient);
      const amountBigInt = BigInt(amount);

      const { keys, data } = buildMintInstruction(
        tokenState,
        publicKey,
        recipientPubkey,
        amountBigInt,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

      const sig = await executeLegacyTransaction(connection, transaction, []);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [tokenAccountPubkey, publicKey, connection, getProgramPublicKey, createInstruction]);

  // Transfer tokens
  const transferTokens = useCallback(async (
    from: string,
    to: string,
    amount: number | bigint
  ): Promise<TransactionResult> => {
    if (!tokenAccountPubkey || !publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected or token account not provided', success: false };
    }

    if (!isValidSolanaAddress(tokenAccountPubkey)) {
      return { signature: null, loading: false, error: 'Invalid token account address', success: false };
    }
    if (!isValidSolanaAddress(from)) {
      return { signature: null, loading: false, error: 'Invalid source address', success: false };
    }
    if (!isValidSolanaAddress(to)) {
      return { signature: null, loading: false, error: 'Invalid recipient address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getProgramPublicKey();
      const tokenState = new PublicKey(tokenAccountPubkey);
      const fromPubkey = new PublicKey(from);
      const toPubkey = new PublicKey(to);
      const amountBigInt = BigInt(amount);

      const { keys, data } = buildTransferInstruction(
        tokenState,
        publicKey,
        fromPubkey,
        toPubkey,
        amountBigInt,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

      const sig = await executeLegacyTransaction(connection, transaction, []);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [tokenAccountPubkey, publicKey, connection, getProgramPublicKey, createInstruction]);

  // Burn tokens
  const burnTokens = useCallback(async (
    from: string,
    amount: number | bigint
  ): Promise<TransactionResult> => {
    if (!tokenAccountPubkey || !publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected or token account not provided', success: false };
    }

    if (!isValidSolanaAddress(tokenAccountPubkey)) {
      return { signature: null, loading: false, error: 'Invalid token account address', success: false };
    }
    if (!isValidSolanaAddress(from)) {
      return { signature: null, loading: false, error: 'Invalid source address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getProgramPublicKey();
      const tokenState = new PublicKey(tokenAccountPubkey);
      const fromPubkey = new PublicKey(from);
      const amountBigInt = BigInt(amount);

      const { keys, data } = buildBurnInstruction(
        tokenState,
        publicKey,
        fromPubkey,
        amountBigInt,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

      const sig = await executeLegacyTransaction(connection, transaction, []);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [tokenAccountPubkey, publicKey, connection, getProgramPublicKey, createInstruction]);

  // Freeze account
  const freezeAccount = useCallback(async (
    account: string
  ): Promise<TransactionResult> => {
    if (!tokenAccountPubkey || !publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected or token account not provided', success: false };
    }

    if (!isValidSolanaAddress(tokenAccountPubkey)) {
      return { signature: null, loading: false, error: 'Invalid token account address', success: false };
    }
    if (!isValidSolanaAddress(account)) {
      return { signature: null, loading: false, error: 'Invalid account address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getProgramPublicKey();
      const tokenState = new PublicKey(tokenAccountPubkey);
      const accountPubkey = new PublicKey(account);

      const { keys, data } = buildFreezeInstruction(
        tokenState,
        publicKey,
        accountPubkey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

      const sig = await executeLegacyTransaction(connection, transaction, []);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [tokenAccountPubkey, publicKey, connection, getProgramPublicKey, createInstruction]);

  // Unfreeze account
  const unfreezeAccount = useCallback(async (
    account: string
  ): Promise<TransactionResult> => {
    if (!tokenAccountPubkey || !publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected or token account not provided', success: false };
    }

    if (!isValidSolanaAddress(tokenAccountPubkey)) {
      return { signature: null, loading: false, error: 'Invalid token account address', success: false };
    }
    if (!isValidSolanaAddress(account)) {
      return { signature: null, loading: false, error: 'Invalid account address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getProgramPublicKey();
      const tokenState = new PublicKey(tokenAccountPubkey);
      const accountPubkey = new PublicKey(account);

      const { keys, data } = buildUnfreezeInstruction(
        tokenState,
        publicKey,
        accountPubkey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

      const sig = await executeLegacyTransaction(connection, transaction, []);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [tokenAccountPubkey, publicKey, connection, getProgramPublicKey, createInstruction]);

  // Add agent
  const addAgent = useCallback(async (
    agent: string
  ): Promise<TransactionResult> => {
    if (!tokenAccountPubkey || !publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected or token account not provided', success: false };
    }

    if (!isValidSolanaAddress(tokenAccountPubkey)) {
      return { signature: null, loading: false, error: 'Invalid token account address', success: false };
    }
    if (!isValidSolanaAddress(agent)) {
      return { signature: null, loading: false, error: 'Invalid agent address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getProgramPublicKey();
      const tokenState = new PublicKey(tokenAccountPubkey);
      const agentPubkey = new PublicKey(agent);

      const { keys, data } = buildAddAgentInstruction(
        tokenState,
        publicKey,
        agentPubkey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

      const sig = await executeLegacyTransaction(connection, transaction, []);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [tokenAccountPubkey, publicKey, connection, getProgramPublicKey, createInstruction]);

  // Remove agent
  const removeAgent = useCallback(async (
    agent: string
  ): Promise<TransactionResult> => {
    if (!tokenAccountPubkey || !publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected or token account not provided', success: false };
    }

    if (!isValidSolanaAddress(tokenAccountPubkey)) {
      return { signature: null, loading: false, error: 'Invalid token account address', success: false };
    }
    if (!isValidSolanaAddress(agent)) {
      return { signature: null, loading: false, error: 'Invalid agent address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getProgramPublicKey();
      const tokenState = new PublicKey(tokenAccountPubkey);
      const agentPubkey = new PublicKey(agent);

      const { keys, data } = buildRemoveAgentInstruction(
        tokenState,
        publicKey,
        agentPubkey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

      const sig = await executeLegacyTransaction(connection, transaction, []);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [tokenAccountPubkey, publicKey, connection, getProgramPublicKey, createInstruction]);

  return {
    initializeToken,
    mintTokens,
    transferTokens,
    burnTokens,
    freezeAccount,
    unfreezeAccount,
    addAgent,
    removeAgent,
    loading,
    error,
    signature,
    reset,
  };
}
