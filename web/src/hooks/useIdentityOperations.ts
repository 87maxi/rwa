/**
 * useIdentityOperations.ts
 * 
 * Hook para manejar operaciones del Identity Registry program.
 * Incluye: initialize registry, register identity, update identity, remove identity, get identity.
 */

import React, { useCallback, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  buildIdentityInitializeInstruction,
  buildIdentityRegisterInstruction,
  buildIdentityRegisterWithDataInstruction,
  buildIdentityUpdateInstruction,
  buildIdentityRemoveInstruction,
} from '@/anchor/identity';
import { deriveRegistryPda, getIdentityPda } from '@/anchor/pdas';
import { executeTransaction } from '@/anchor/client';

// ============================================================================
// Types
// ============================================================================

export interface IdentityResult {
  signature: string | null;
  loading: boolean;
  error: string | null;
  success: boolean;
  data?: any;
}

export interface IdentityInfo {
  wallet: string;
  identity: string;
  name: string;
  symbol: string;
  identityData: string;
  metadataUri: string;
  timestamp: number;
}

export interface UseIdentityOperationsProps {
  currentAuthority: PublicKey;
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
}

export interface IdentityOperationsReturn {
  initializeRegistry: () => Promise<IdentityResult>;
  registerIdentity: (walletAddress: string) => Promise<IdentityResult>;
  registerIdentityWithData: (
    walletAddress: string,
    name: string,
    symbol: string,
    identityData: string,
    metadataUri: string
  ) => Promise<IdentityResult>;
  updateIdentity: (
    walletAddress: string,
    name?: string | null,
    symbol?: string | null,
    identityData?: string | null,
    metadataUri?: string | null
  ) => Promise<IdentityResult>;
  removeIdentity: (walletAddress: string) => Promise<IdentityResult>;
  getIdentity: (walletAddress: string) => Promise<IdentityResult>;
  loading: boolean;
  error: string | null;
  signature: string | null;
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const IDENTITY_PROGRAM_ID = '5SeHm9i7CcgHqF9UBYBtGbzqf3F3FWFETQF8AxfU2Rce';

// ============================================================================
// Hook Implementation
// ============================================================================

export function useIdentityOperations({
  currentAuthority,
  onSuccess,
  onError,
}: UseIdentityOperationsProps): IdentityOperationsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const executeTransactionOp = useCallback(async (
    instruction: {
      keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>;
      data: Buffer;
    },
    programId: PublicKey
  ): Promise<string> => {
    const sig = await executeTransaction(
      window.solana?.connection,
      instruction,
      currentAuthority,
      programId,
      // @ts-ignore - signTransaction will be provided by wallet adapter
      window.solana?.signTransaction
    );
    return sig;
  }, [currentAuthority]);

  const execute = useCallback(async (
    operation: () => Promise<string>
  ): Promise<IdentityResult> => {
    if (!currentAuthority) {
      const errorMessage = 'No current authority available';
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const sig = await operation();
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
  }, [currentAuthority, onSuccess, onError]);

  const initializeRegistry = useCallback(async (): Promise<IdentityResult> => {
    return execute(async () => {
      const programId = new PublicKey(IDENTITY_PROGRAM_ID);
      const registryPda = deriveRegistryPda(programId);

      const instruction = buildIdentityInitializeInstruction(
        registryPda,
        currentAuthority,
        programId
      );

      return executeTransactionOp(instruction, programId);
    });
  }, [currentAuthority, execute, executeTransactionOp]);

  const registerIdentity = useCallback(async (
    walletAddress: string
  ): Promise<IdentityResult> => {
    // Validate wallet address
    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(walletAddress);
    } catch {
      const errorMessage = 'Invalid wallet address';
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    }

    return execute(async () => {
      const programId = new PublicKey(IDENTITY_PROGRAM_ID);
      const registryPda = deriveRegistryPda(programId);
      const identityPda = getIdentityPda(registryPda, walletPubkey, programId);

      const instruction = buildIdentityRegisterInstruction(
        registryPda,
        currentAuthority,
        currentAuthority,
        walletPubkey,
        identityPda,
        programId
      );

      return executeTransactionOp(instruction, programId);
    });
  }, [currentAuthority, execute, executeTransactionOp]); // eslint-disable-next-line react-hooks/exhaustive-deps

  const registerIdentityWithData = useCallback(async (
    walletAddress: string,
    name: string,
    symbol: string,
    identityData: string,
    metadataUri: string
  ): Promise<IdentityResult> => {
    // Validate wallet address
    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(walletAddress);
    } catch {
      const errorMessage = 'Invalid wallet address';
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    }

    return execute(async () => {
      const programId = new PublicKey(IDENTITY_PROGRAM_ID);

      const instruction = buildIdentityRegisterWithDataInstruction(
        deriveRegistryPda(programId),
        currentAuthority,
        currentAuthority,
        walletPubkey,
        name,
        symbol,
        identityData,
        metadataUri,
        programId
      );

      return executeTransactionOp(instruction, programId);
    });
  }, [currentAuthority, execute, executeTransactionOp]);

  const updateIdentity = useCallback(async (
    walletAddress: string,
    name?: string | null,
    symbol?: string | null,
    identityData?: string | null,
    metadataUri?: string | null
  ): Promise<IdentityResult> => {
    // Validate wallet address
    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(walletAddress);
    } catch {
      const errorMessage = 'Invalid wallet address';
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    }

    return execute(async () => {
      const programId = new PublicKey(IDENTITY_PROGRAM_ID);
      const registryPda = deriveRegistryPda(programId);
      const identityPda = getIdentityPda(registryPda, walletPubkey, programId);

      const instruction = buildIdentityUpdateInstruction(
        registryPda,
        currentAuthority,
        walletPubkey,
        identityPda,
        name ?? null,
        symbol ?? null,
        identityData ?? null,
        metadataUri ?? null,
        programId
      );

      return executeTransactionOp(instruction, programId);
    });
  }, [currentAuthority, execute, executeTransactionOp]);

  const removeIdentity = useCallback(async (
    walletAddress: string
  ): Promise<IdentityResult> => {
    // Validate wallet address
    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(walletAddress);
    } catch {
      const errorMessage = 'Invalid wallet address';
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    }

    return execute(async () => {
      const programId = new PublicKey(IDENTITY_PROGRAM_ID);
      const registryPda = deriveRegistryPda(programId);

      const instruction = buildIdentityRemoveInstruction(
        registryPda,
        currentAuthority,
        walletPubkey,
        programId
      );

      return executeTransactionOp(instruction, programId);
    });
  }, [currentAuthority, execute, executeTransactionOp]);

  const getIdentity = useCallback(async (
    walletAddress: string
  ): Promise<IdentityResult> => {
    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      let walletPubkey: PublicKey;
      try {
        walletPubkey = new PublicKey(walletAddress);
      } catch {
        const errorMessage = 'Invalid wallet address';
        onError?.(errorMessage);
        return { signature: null, loading: false, error: errorMessage, success: false };
      }

      const programId = new PublicKey(IDENTITY_PROGRAM_ID);
      const registryPda = deriveRegistryPda(programId);
      const identityPda = getIdentityPda(registryPda, walletPubkey, programId);

      // For read-only queries, we need to fetch the account info
      const connection = window.solana?.connection;
      if (!connection) {
        throw new Error('Connection not available');
      }

      const accountInfo = await connection.getAccountInfo(identityPda);

      if (!accountInfo) {
        return {
          signature: null,
          loading: false,
          error: null,
          success: true,
          data: null,
        };
      }

      return {
        signature: null,
        loading: false,
        error: null,
        success: true,
        data: accountInfo,
      };
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to get identity';
      setError(errorMessage);
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    }
  }, [onError]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSignature(null);
  }, []);

  return {
    initializeRegistry,
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
