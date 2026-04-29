'use client';

import { useCallback } from 'react';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
  buildComplianceInitializeInstruction,
  buildComplianceAddModuleInstruction,
  buildComplianceRemoveModuleInstruction,
  buildComplianceRebalanceInstruction,
  buildComplianceGetStateInstruction,
} from '@/anchor/compliance';
import { deriveCompliancePda } from '@/anchor/pdas';
import { parseAggregatorState } from '@/anchor/parsers';
import { getCurrentNetwork, PROGRAM_IDS } from '@/config/solana';
import { isValidSolanaAddress } from '@/utils/solana';
import { useSolanaTransaction, type TransactionResult } from './useSolanaTransaction';

// Aggregator state return type (matches ComplianceAggregatorState Rust struct)
export interface AggregatorState {
  owner: string;
  aggregatorBump: number;
}

/**
 * Hook para acciones de Compliance Aggregator
 */
export function useComplianceActions() {
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

  const getComplianceProgramId = useCallback(() => {
    const network = getCurrentNetwork();
    const programIdStr = PROGRAM_IDS[network]?.complianceAggregator;
    if (!programIdStr) {
      throw new Error('Compliance aggregator program ID not configured for current network');
    }
    return new PublicKey(programIdStr);
  }, []);

  // Initialize compliance aggregator
  const initializeComplianceAggregator = useCallback(async (
    aggregatorAccount: string
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKey.current;
    if (!currentPublicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected', success: false };
    }

    if (!isValidSolanaAddress(aggregatorAccount)) {
      return { signature: null, loading: false, error: 'Invalid aggregator account address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getComplianceProgramId();
      const aggregatorState = new PublicKey(aggregatorAccount);

      const { keys, data } = buildComplianceInitializeInstruction(
        aggregatorState,
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
  }, [signAndSend, publicKey, getComplianceProgramId, setLoading, setError, setSignature]);

  // Add compliance module
  const addComplianceModule = useCallback(async (
    aggregatorAccount: string,
    tokenProgramId: string,
    moduleProgramId: string
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKey.current;
    if (!currentPublicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction.current) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }

    if (!isValidSolanaAddress(aggregatorAccount)) {
      return { signature: null, loading: false, error: 'Invalid aggregator account address', success: false };
    }
    if (!isValidSolanaAddress(tokenProgramId)) {
      return { signature: null, loading: false, error: 'Invalid token program address', success: false };
    }
    if (!isValidSolanaAddress(moduleProgramId)) {
      return { signature: null, loading: false, error: 'Invalid module program address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getComplianceProgramId();
      const aggregatorState = new PublicKey(aggregatorAccount);
      const token = new PublicKey(tokenProgramId);
      const modulePubkey = new PublicKey(moduleProgramId);
      // Derive the TokenCompliance PDA: [b"compliance", aggregator, token]
      const tokenCompliance = deriveCompliancePda(aggregatorState, token, programId);
      const { keys, data } = buildComplianceAddModuleInstruction(
        aggregatorState,
        currentPublicKey,
        token,
        modulePubkey,
        tokenCompliance,
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
  }, [signAndSend, publicKey, signTransaction, getComplianceProgramId, setLoading, setError, setSignature]);

  // Remove compliance module
  const removeComplianceModule = useCallback(async (
    aggregatorAccount: string,
    tokenProgramId: string,
    _moduleProgramId: string
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKey.current;
    if (!currentPublicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction.current) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }

    if (!isValidSolanaAddress(aggregatorAccount)) {
      return { signature: null, loading: false, error: 'Invalid aggregator account address', success: false };
    }
    if (!isValidSolanaAddress(tokenProgramId)) {
      return { signature: null, loading: false, error: 'Invalid token program address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getComplianceProgramId();
      const aggregatorState = new PublicKey(aggregatorAccount);
      const token = new PublicKey(tokenProgramId);
      // Derive the TokenCompliance PDA: [b"compliance", aggregator, token]
      const tokenCompliance = deriveCompliancePda(aggregatorState, token, programId);
      const { keys, data } = buildComplianceRemoveModuleInstruction(
        aggregatorState,
        currentPublicKey,
        tokenCompliance,
        token,
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
  }, [signAndSend, publicKey, signTransaction, getComplianceProgramId, setLoading, setError, setSignature]);

  // Rebalance modules
  const rebalanceModules = useCallback(async (
    aggregatorAccount: string
  ): Promise<TransactionResult> => {
    const currentPublicKey = publicKey.current;
    if (!currentPublicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction.current) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }

    if (!isValidSolanaAddress(aggregatorAccount)) {
      return { signature: null, loading: false, error: 'Invalid aggregator account address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getComplianceProgramId();
      const aggregatorState = new PublicKey(aggregatorAccount);

      const { keys, data } = buildComplianceRebalanceInstruction(
        aggregatorState,
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
  }, [signAndSend, publicKey, signTransaction, getComplianceProgramId, setLoading, setError, setSignature]);

  // Get aggregator state (read-only query)
  const getAggregatorState = useCallback(async (
    aggregatorAccount: string
  ): Promise<AggregatorState | null> => {
    if (!aggregatorAccount) {
      return null;
    }

    try {
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.complianceAggregator;
      if (!programIdStr) {
        return null;
      }
      const programId = new PublicKey(programIdStr);
      const aggregatorState = new PublicKey(aggregatorAccount);

      const { keys, data } = buildComplianceGetStateInstruction(
        aggregatorState,
        programId
      );

      const instruction = new TransactionInstruction({
        keys,
        data,
        programId,
      });

      const transaction = new Transaction();
      transaction.add(instruction);
      const simulation = await connection.simulateTransaction(transaction);

      if (simulation.value.err) {
        throw new Error(simulation.value.err.toString());
      }

      if (!simulation.value.returnData) {
        console.warn('No return data in aggregator state response');
        return null;
      }

      const decodedData = Buffer.from(simulation.value.returnData.data[0], 'base64');

      if (decodedData.length < 33) {
        console.warn('Invalid aggregator state data length:', decodedData.length);
        return null;
      }

      const state = parseAggregatorState(decodedData);
      console.log('Aggregator state:', state);
      return state;
    } catch (err) {
      console.error('Error getting aggregator state:', err);
      return null;
    }
  }, [connection]);

  return {
    initializeComplianceAggregator,
    addComplianceModule,
    removeComplianceModule,
    rebalanceModules,
    getAggregatorState,
    loading,
    error,
    signature,
    reset,
  };
}
