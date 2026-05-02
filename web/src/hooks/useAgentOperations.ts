/**
 * useAgentOperations.ts
 * 
 * Hook para manejar operaciones de agentes (add/remove agent).
 * Los agentes pueden realizar operaciones de mint/burn/transfer en nombre del emisor.
 */

import React, { useCallback, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  buildAddAgentInstruction,
  buildRemoveAgentInstruction,
} from '@/anchor/solana-rwa';
import { deriveAgentPda } from '@/anchor/pdas';
import { executeTransaction } from '@/anchor/client';

// ============================================================================
// Types
// ============================================================================

export interface AgentResult {
  signature: string | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export interface UseAgentOperationsProps {
  tokenStatePda: PublicKey;
  currentAuthority: PublicKey;
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
}

export interface AgentOperationsReturn {
  addAgent: (agentAddress: string) => Promise<AgentResult>;
  removeAgent: (agentAddress: string) => Promise<AgentResult>;
  loading: boolean;
  error: string | null;
  signature: string | null;
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const RWA_PROGRAM_ID = '2XuB3ngjvJkMTxB82eM9NszBUGNovjuJUs4mzdez7EEX';

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAgentOperations({
  tokenStatePda,
  currentAuthority,
  onSuccess,
  onError,
}: UseAgentOperationsProps): AgentOperationsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const execute = useCallback(async (
    agentAddress: string,
    action: 'add' | 'remove'
  ): Promise<AgentResult> => {
    // Validate agent address
    let agentPubkey: PublicKey;
    try {
      agentPubkey = new PublicKey(agentAddress);
    } catch {
      const errorMessage = 'Invalid agent address';
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    }

    // Validate authority
    if (!currentAuthority) {
      const errorMessage = 'No current authority available';
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    }

    // Validate that agent is not the same as authority
    if (agentAddress.toLowerCase() === currentAuthority.toBase58().toLowerCase()) {
      const errorMessage = 'Agent cannot be the same as the current authority';
      onError?.(errorMessage);
      return { signature: null, loading: false, error: errorMessage, success: false };
    }

    const programId = new PublicKey(RWA_PROGRAM_ID);
    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      // Derive agent account PDA
      const agentPda = deriveAgentPda(tokenStatePda, agentPubkey, programId);

      // Build instruction based on action
      const instruction = action === 'add'
        ? buildAddAgentInstruction(
            tokenStatePda,
            currentAuthority,
            agentPubkey,
            agentPda,
            programId
          )
        : buildRemoveAgentInstruction(
            tokenStatePda,
            currentAuthority,
            agentPubkey,
            agentPda,
            programId
          );

      // Execute transaction
      const sig = await executeTransaction(
        window.solana?.connection,
        instruction,
        currentAuthority,
        programId,
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

  const addAgent = useCallback(async (
    agentAddress: string
  ): Promise<AgentResult> => {
    return execute(agentAddress, 'add');
  }, [execute]);

  const removeAgent = useCallback(async (
    agentAddress: string
  ): Promise<AgentResult> => {
    return execute(agentAddress, 'remove');
  }, [execute]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSignature(null);
  }, []);

  return {
    addAgent,
    removeAgent,
    loading,
    error,
    signature,
    reset,
  };
}
