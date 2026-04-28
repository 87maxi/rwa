'use client';

import { useCallback } from 'react';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
  buildIdentityInitializeInstruction,
  buildIdentityRegisterInstruction,
  buildIdentityRegisterWithDataInstruction,
  buildIdentityUpdateInstruction,
  buildIdentityRemoveInstruction,
} from '@/anchor/identity';
import { getIdentityPda } from '@/anchor/pdas';
import { parseIdentityInfo } from '@/anchor/parsers';
import { getCurrentNetwork, PROGRAM_IDS } from '@/config/solana';
import { isValidSolanaAddress } from '@/utils/solana';
import { useSolanaTransaction, type TransactionResult } from './useSolanaTransaction';

// Identity state return type (matches IdentityAccount Rust struct)
export interface IdentityInfo {
  wallet: string;
  identity: string;
  name: string;
  symbol: string;
  identityData: string;
  metadataUri: string;
  bump: number;
}

/**
 * Hook para acciones de Identity Registry
 */
export function useIdentityActions() {
  const {
    loading,
    error,
    signature,
    setLoading,
    setError,
    setSignature,
    reset,
    signAndSend,
    publicKey,
    signTransaction,
    connection,
  } = useSolanaTransaction();

  const getIdentityProgramId = useCallback(() => {
    const network = getCurrentNetwork();
    const programIdStr = PROGRAM_IDS[network]?.identityRegistry;
    if (!programIdStr) {
      throw new Error('Identity registry program ID not configured for current network');
    }
    return new PublicKey(programIdStr);
  }, []);

  // Initialize identity registry
  const initializeIdentityRegistry = useCallback(async (
    registryAccount: string
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKey.current;
    if (!currentPublicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected', success: false };
    }

    if (!isValidSolanaAddress(registryAccount)) {
      return { signature: null, loading: false, error: 'Invalid registry account address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getIdentityProgramId();
      const registryState = new PublicKey(registryAccount);

      const { keys, data } = buildIdentityInitializeInstruction(
        registryState,
        currentPublicKey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(new TransactionInstruction({ keys, data, programId }));

      const sig = await signAndSend(transaction, programId);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [signAndSend, publicKey, getIdentityProgramId, setLoading, setError, setSignature]);

  // Register identity
  const registerIdentity = useCallback(async (
    registryAccount: string,
    wallet: string,
    identity: string
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKey.current;
    if (!currentPublicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction.current) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }

    if (!isValidSolanaAddress(registryAccount)) {
      return { signature: null, loading: false, error: 'Invalid registry account address', success: false };
    }
    if (!isValidSolanaAddress(wallet)) {
      return { signature: null, loading: false, error: 'Invalid wallet address', success: false };
    }
    if (!isValidSolanaAddress(identity)) {
      return { signature: null, loading: false, error: 'Invalid identity address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getIdentityProgramId();
      const registryState = new PublicKey(registryAccount);
      const walletPubkey = new PublicKey(wallet);
      const identityPubkey = new PublicKey(identity);

      const { keys, data } = buildIdentityRegisterInstruction(
        registryState,
        currentPublicKey,
        currentPublicKey,
        walletPubkey,
        identityPubkey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(new TransactionInstruction({ keys, data, programId }));

      const sig = await signAndSend(transaction, programId);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [signAndSend, publicKey, signTransaction, getIdentityProgramId, setLoading, setError, setSignature]);

  // Register identity with data
  const registerIdentityWithData = useCallback(async (
    registryAccount: string,
    wallet: string,
    name: string,
    symbol: string,
    identityData: string,
    metadataUri: string
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKey.current;
    if (!currentPublicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction.current) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }

    if (!isValidSolanaAddress(registryAccount)) {
      return { signature: null, loading: false, error: 'Invalid registry account address', success: false };
    }
    if (!isValidSolanaAddress(wallet)) {
      return { signature: null, loading: false, error: 'Invalid wallet address', success: false };
    }

    if (name.length > 32) {
      return { signature: null, loading: false, error: 'Name too long (max 32 chars)', success: false };
    }
    if (symbol.length > 10) {
      return { signature: null, loading: false, error: 'Symbol too long (max 10 chars)', success: false };
    }
    if (identityData.length > 128) {
      return { signature: null, loading: false, error: 'Identity data too long (max 128 chars)', success: false };
    }
    if (metadataUri.length > 256) {
      return { signature: null, loading: false, error: 'Metadata URI too long (max 256 chars)', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getIdentityProgramId();
      const registryState = new PublicKey(registryAccount);
      const walletPubkey = new PublicKey(wallet);

      const { keys, data } = buildIdentityRegisterWithDataInstruction(
        registryState,
        currentPublicKey,
        currentPublicKey,
        walletPubkey,
        name,
        symbol,
        identityData,
        metadataUri,
        programId
      );

      const transaction = new Transaction();
      transaction.add(new TransactionInstruction({ keys, data, programId }));

      const sig = await signAndSend(transaction, programId);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [signAndSend, publicKey, signTransaction, getIdentityProgramId, setLoading, setError, setSignature]);

  // Update identity
  const updateIdentity = useCallback(async (
    registryAccount: string,
    wallet: string,
    newIdentity: string,
    name: string | null = null,
    symbol: string | null = null,
    identityData: string | null = null,
    metadataUri: string | null = null
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKey.current;
    if (!currentPublicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction.current) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }

    if (!isValidSolanaAddress(registryAccount)) {
      return { signature: null, loading: false, error: 'Invalid registry account address', success: false };
    }
    if (!isValidSolanaAddress(wallet)) {
      return { signature: null, loading: false, error: 'Invalid wallet address', success: false };
    }
    if (!isValidSolanaAddress(newIdentity)) {
      return { signature: null, loading: false, error: 'Invalid new identity address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getIdentityProgramId();
      const registryState = new PublicKey(registryAccount);
      const walletPubkey = new PublicKey(wallet);
      const newIdentityPubkey = new PublicKey(newIdentity);

      const { keys, data } = buildIdentityUpdateInstruction(
        registryState,
        currentPublicKey,
        walletPubkey,
        newIdentityPubkey,
        name,
        symbol,
        identityData,
        metadataUri,
        programId
      );

      const transaction = new Transaction();
      transaction.add(new TransactionInstruction({ keys, data, programId }));

      const sig = await signAndSend(transaction, programId);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [signAndSend, publicKey, signTransaction, getIdentityProgramId, setLoading, setError, setSignature]);

  // Remove identity
  const removeIdentity = useCallback(async (
    registryAccount: string,
    wallet: string
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKey.current;
    if (!currentPublicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction.current) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }

    if (!isValidSolanaAddress(registryAccount)) {
      return { signature: null, loading: false, error: 'Invalid registry account address', success: false };
    }
    if (!isValidSolanaAddress(wallet)) {
      return { signature: null, loading: false, error: 'Invalid wallet address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getIdentityProgramId();
      const registryState = new PublicKey(registryAccount);
      const walletPubkey = new PublicKey(wallet);

      const { keys, data } = buildIdentityRemoveInstruction(
        registryState,
        currentPublicKey,
        walletPubkey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(new TransactionInstruction({ keys, data, programId }));

      const sig = await signAndSend(transaction, programId);
      setSignature(sig);
      return { signature: sig, loading: false, error: null, success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    } finally {
      setLoading(false);
    }
  }, [signAndSend, publicKey, signTransaction, getIdentityProgramId, setLoading, setError, setSignature]);

  // Get identity (read-only query)
  const getIdentity = useCallback(async (
    registryAccount: string,
    wallet: string
  ): Promise<IdentityInfo | null> => {
    if (!registryAccount || !wallet) {
      return null;
    }

    try {
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.identityRegistry;
      if (!programIdStr) {
        return null;
      }
      const programId = new PublicKey(programIdStr);
      const registryState = new PublicKey(registryAccount);
      const walletPubkey = new PublicKey(wallet);

      const identityAccount = getIdentityPda(registryState, walletPubkey, programId);

      const accountInfo = await connection.getAccountInfo(identityAccount);

      if (!accountInfo?.data) {
        console.warn('No identity account found');
        return null;
      }

      const decodedData = Buffer.from(accountInfo.data);

      if (decodedData.length < 304) {
        console.warn('Invalid identity data length:', decodedData.length);
        return null;
      }

      const identityInfo = parseIdentityInfo(decodedData);
      console.log('Identity info:', identityInfo);
      return identityInfo;
    } catch (err) {
      console.error('Error getting identity:', err);
      return null;
    }
  }, [connection]);

  return {
    initializeIdentityRegistry,
    registerIdentity,
    registerIdentityWithData,
    updateIdentity,
    removeIdentity,
    getIdentity,
    loading,
    error,
    signature,
    reset,
  };
}
