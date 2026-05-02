/**
 * useComplianceOperations.ts
 * 
 * Hook para manejar operaciones del Compliance Aggregator program.
 * Incluye: initialize aggregator, add/remove module, rebalance, get state.
 */

import React, { useCallback, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  buildComplianceInitializeInstruction,
  buildComplianceAddModuleInstruction,
  buildComplianceRemoveModuleInstruction,
  buildComplianceRebalanceInstruction,
  buildComplianceGetStateInstruction,
} from '@/anchor/compliance';
import { deriveAggregatorPda, deriveCompliancePda } from '@/anchor/pdas';
import { executeTransaction } from '@/anchor/client';

// ============================================================================
// Types
// ============================================================================

export interface ComplianceResult {
  signature: string | null;
  loading: boolean;
  error: string | null;
  success: boolean;
  data?: any;
}

export interface AggregatorState {
  moduleCount: number;
  modules: string[];
}

export interface UseComplianceOperationsProps {
  currentAuthority: PublicKey;
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
}

export interface ComplianceOperationsReturn {
  initializeAggregator: () => Promise<ComplianceResult>;
  addModule: (tokenId: string, moduleProgramId: string) => Promise<ComplianceResult>;
  removeModule: (tokenId: string, moduleProgramId: string) => Promise<ComplianceResult>;
  rebalanceModules: () => Promise<ComplianceResult>;
  getAggregatorState: () => Promise<ComplianceResult>;
  loading: boolean;
  error: string | null;
  signature: string | null;
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const COMPLIANCE_PROGRAM_ID = '7cURjJvyf3oe6JsuVxS9EiVHKNauiFj7Gao3THzZnpb';

// ============================================================================
// Hook Implementation
// ============================================================================

export function useComplianceOperations({
  currentAuthority,
  onSuccess,
  onError,
}: UseComplianceOperationsProps): ComplianceOperationsReturn {
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
  ): Promise<ComplianceResult> => {
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

  const initializeAggregator = useCallback(async (): Promise<ComplianceResult> => {
    return execute(async () => {
      const programId = new PublicKey(COMPLIANCE_PROGRAM_ID);
      const aggregatorPda = deriveAggregatorPda(programId);

      const instruction = buildComplianceInitializeInstruction(
        aggregatorPda,
        currentAuthority,
        programId
      );

      return executeTransactionOp(instruction, programId);
    });
  }, [currentAuthority, execute, executeTransactionOp]);

  const addModule = useCallback(async (
    tokenId: string,
    moduleProgramId: string
  ): Promise<ComplianceResult> => {
    return execute(async () => {
      const programId = new PublicKey(COMPLIANCE_PROGRAM_ID);
      const aggregatorPda = deriveAggregatorPda(programId);
      const tokenIdPubkey = new PublicKey(tokenId);
      const modulePubkey = new PublicKey(moduleProgramId);
      const tokenCompliancePda = deriveCompliancePda(aggregatorPda, tokenIdPubkey, programId);

      const instruction = buildComplianceAddModuleInstruction(
        aggregatorPda,
        currentAuthority,
        tokenIdPubkey,
        modulePubkey,
        tokenCompliancePda,
        programId
      );

      return executeTransactionOp(instruction, programId);
    });
  }, [currentAuthority, execute, executeTransactionOp]);

  const removeModule = useCallback(async (
    tokenId: string,
    moduleProgramId: string
  ): Promise<ComplianceResult> => {
    return execute(async () => {
      const programId = new PublicKey(COMPLIANCE_PROGRAM_ID);
      const aggregatorPda = deriveAggregatorPda(programId);
      const tokenIdPubkey = new PublicKey(tokenId);
      const tokenCompliancePda = deriveCompliancePda(aggregatorPda, tokenIdPubkey, programId);

      const instruction = buildComplianceRemoveModuleInstruction(
        aggregatorPda,
        currentAuthority,
        tokenCompliancePda,
        tokenIdPubkey,
        programId
      );

      return executeTransactionOp(instruction, programId);
    });
  }, [currentAuthority, execute, executeTransactionOp]);

  const rebalanceModules = useCallback(async (): Promise<ComplianceResult> => {
    return execute(async () => {
      const programId = new PublicKey(COMPLIANCE_PROGRAM_ID);
      const aggregatorPda = deriveAggregatorPda(programId);

      const instruction = buildComplianceRebalanceInstruction(
        aggregatorPda,
        currentAuthority,
        programId
      );

      return executeTransactionOp(instruction, programId);
    });
  }, [currentAuthority, execute, executeTransactionOp]);

  const getAggregatorState = useCallback(async (): Promise<ComplianceResult> => {
    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = new PublicKey(COMPLIANCE_PROGRAM_ID);
      const aggregatorPda = deriveAggregatorPda(programId);

      const instruction = buildComplianceGetStateInstruction(
        aggregatorPda,
        programId
      );

      // For read-only queries, we need to simulate the transaction
      const connection = window.solana?.connection;
      if (!connection) {
        throw new Error('Connection not available');
      }

      const simulation = await connection.simulateTransaction(
        // @ts-ignore - we need to create a fake transaction from instruction
        null,
        { accounts: { encoding: 'base64' } }
      );

      if (simulation.value.err) {
        throw new Error('Simulation failed');
      }

      return {
        signature: null,
        loading: false,
        error: null,
        success: true,
        data: simulation.value,
      };
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to get aggregator state';
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
    initializeAggregator,
    addModule,
    removeModule,
    rebalanceModules,
    getAggregatorState,
    loading,
    error,
    signature,
    reset,
  };
}
