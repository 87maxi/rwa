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
  buildTransferOwnerInstruction,
  buildTransferFreezeAuthorityInstruction,
  buildGetSupplyInfoInstruction,
  buildComplianceInitializeInstruction,
  buildComplianceAddModuleInstruction,
  buildComplianceRemoveModuleInstruction,
  buildComplianceRebalanceInstruction,
  buildComplianceGetStateInstruction,
  buildIdentityInitializeInstruction,
  buildIdentityRegisterInstruction,
  buildIdentityRegisterWithDataInstruction,
  buildIdentityUpdateInstruction,
  buildIdentityRemoveInstruction,
  buildIdentityGetInstruction,
  executeTransaction,
} from '@/anchor/client';
import {
  parseSupplyInfo,
  parseAggregatorState,
  parseIdentityInfo,
} from '@/anchor/client';
import { getCurrentNetwork, PROGRAM_IDS } from '@/config/solana';
import { isValidSolanaAddress } from '@/utils/solana';

// Supply info return type
export interface SupplyInfo {
  currentSupply: bigint;
  maxSupply: bigint;
  remainingSupply: bigint;
}

// Aggregator state return type
export interface AggregatorState {
  owner: string;
  totalUniqueTokens: number;
  totalModuleEntries: number;
  tokenModuleCount: number;
  nextIndex: bigint;
}

// Identity state return type
export interface IdentityInfo {
  wallet: string;
  identity: string;
}

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
  const { publicKey, signTransaction, sendTransaction, wallets, wallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  // Note: No mounted state needed - actions are triggered by user interaction (not render)
  // so they don't cause hydration mismatch issues

  const reset = () => {
    setError(null);
    setSignature(null);
  };

  /**
   * Sign and send a transaction using the wallet adapter.
   * Returns the transaction signature on success.
   */
  const signAndSend = useCallback(async (
    transaction: Transaction,
    programId: PublicKey
  ): Promise<string> => {
    if (!publicKey) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }
    if (!signTransaction) {
      throw new Error('Wallet does not support transaction signing. Please use a wallet like Phantom or Solflare.');
    }

    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    // Set transaction fields
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = publicKey;

    try {
      // Sign with wallet - this stores signatures internally in the adapter
      const signedTransaction = await signTransaction(transaction);

      // Send using wallet adapter's sendTransaction which properly handles signatures
      // The wallet adapter stores signatures internally and sends them with the transaction
      const sig = await sendTransaction(signedTransaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });

      // Confirm
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      return sig;
    } catch (err: unknown) {
      // Handle wallet rejection
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
      throw err;
    }
  }, [publicKey, signTransaction, sendTransaction, connection]);

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
    // Check wallet connected AND signing support
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!tokenAccountPubkey) {
      return { signature: null, loading: false, error: 'Token account not provided', success: false };
    }
    if (!signTransaction) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare. Localnet mock wallets cannot sign transactions.', success: false };
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
  }, [tokenAccountPubkey, publicKey, signAndSend, getProgramPublicKey, createInstruction]);

  // Mint tokens
  const mintTokens = useCallback(async (
    recipient: string,
    amount: number | bigint
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }
    if (!tokenAccountPubkey) {
      return { signature: null, loading: false, error: 'Token account not provided', success: false };
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
  }, [tokenAccountPubkey, publicKey, signAndSend, getProgramPublicKey, createInstruction]);

  // Transfer tokens
  const transferTokens = useCallback(async (
    from: string,
    to: string,
    amount: number | bigint
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }
    if (!tokenAccountPubkey) {
      return { signature: null, loading: false, error: 'Token account not provided', success: false };
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
  }, [tokenAccountPubkey, publicKey, signAndSend, getProgramPublicKey, createInstruction]);

  // Burn tokens
  const burnTokens = useCallback(async (
    from: string,
    amount: number | bigint
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }
    if (!tokenAccountPubkey) {
      return { signature: null, loading: false, error: 'Token account not provided', success: false };
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
  }, [tokenAccountPubkey, publicKey, signAndSend, getProgramPublicKey, createInstruction]);

  // Freeze account
  const freezeAccount = useCallback(async (
    account: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }
    if (!tokenAccountPubkey) {
      return { signature: null, loading: false, error: 'Token account not provided', success: false };
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
  }, [tokenAccountPubkey, publicKey, signAndSend, getProgramPublicKey, createInstruction]);

  // Unfreeze account
  const unfreezeAccount = useCallback(async (
    account: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }
    if (!tokenAccountPubkey) {
      return { signature: null, loading: false, error: 'Token account not provided', success: false };
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
  }, [tokenAccountPubkey, publicKey, signAndSend, getProgramPublicKey, createInstruction]);

  // Add agent
  const addAgent = useCallback(async (
    agent: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }
    if (!tokenAccountPubkey) {
      return { signature: null, loading: false, error: 'Token account not provided', success: false };
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
  }, [tokenAccountPubkey, publicKey, signAndSend, getProgramPublicKey, createInstruction]);

  // Remove agent
  const removeAgent = useCallback(async (
    agent: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }
    if (!tokenAccountPubkey) {
      return { signature: null, loading: false, error: 'Token account not provided', success: false };
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
  }, [tokenAccountPubkey, publicKey, signAndSend, getProgramPublicKey, createInstruction]);

  // Transfer owner
  const transferOwner = useCallback(async (
    newOwner: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }
    if (!tokenAccountPubkey) {
      return { signature: null, loading: false, error: 'Token account not provided', success: false };
    }

    if (!isValidSolanaAddress(tokenAccountPubkey)) {
      return { signature: null, loading: false, error: 'Invalid token account address', success: false };
    }
    if (!isValidSolanaAddress(newOwner)) {
      return { signature: null, loading: false, error: 'Invalid new owner address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getProgramPublicKey();
      const tokenState = new PublicKey(tokenAccountPubkey);
      const newOwnerPubkey = new PublicKey(newOwner);

      const { keys, data } = buildTransferOwnerInstruction(
        tokenState,
        publicKey,
        newOwnerPubkey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

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
  }, [tokenAccountPubkey, publicKey, signAndSend, getProgramPublicKey, createInstruction]);

  // Transfer freeze authority
  const transferFreezeAuthority = useCallback(async (
    newFreezeAuthority: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }
    if (!tokenAccountPubkey) {
      return { signature: null, loading: false, error: 'Token account not provided', success: false };
    }

    if (!isValidSolanaAddress(tokenAccountPubkey)) {
      return { signature: null, loading: false, error: 'Invalid token account address', success: false };
    }
    if (!isValidSolanaAddress(newFreezeAuthority)) {
      return { signature: null, loading: false, error: 'Invalid new freeze authority address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const programId = getProgramPublicKey();
      const tokenState = new PublicKey(tokenAccountPubkey);
      const newFreezeAuthorityPubkey = new PublicKey(newFreezeAuthority);

      const { keys, data } = buildTransferFreezeAuthorityInstruction(
        tokenState,
        publicKey,
        newFreezeAuthorityPubkey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

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
  }, [tokenAccountPubkey, publicKey, signAndSend, getProgramPublicKey, createInstruction]);

  // Get supply info (read-only query)
  const getSupplyInfo = useCallback(async (): Promise<SupplyInfo | null> => {
    if (!tokenAccountPubkey) {
      return null;
    }

    try {
      const programId = getProgramPublicKey();
      const tokenState = new PublicKey(tokenAccountPubkey);

      const { keys, data } = buildGetSupplyInfoInstruction(
        tokenState,
        programId
      );

      // Create instruction for query
      const instruction = new TransactionInstruction({
        keys,
        data,
        programId,
      });

      // Simulate the transaction to get the return data
      const transaction = new Transaction();
      transaction.add(instruction);
      const simulation = await connection.simulateTransaction(transaction);

      if (simulation.value.err) {
        throw new Error(simulation.value.err.toString());
      }

      // Extract return data from simulation
      if (!simulation.value.returnData) {
        console.warn('No return data in supply info response');
        return null;
      }

      // The return data comes as base64 encoded bytes
      const decodedData = Buffer.from(simulation.value.returnData.data[0], 'base64');
      
      if (decodedData.length < 24) {
        console.warn('Invalid supply info data length:', decodedData.length);
        return null;
      }

      const supplyInfo = parseSupplyInfo(decodedData);
      console.log('Supply info:', supplyInfo);
      return supplyInfo;
    } catch (err) {
      console.error('Error getting supply info:', err);
      return null;
    }
  }, [tokenAccountPubkey, getProgramPublicKey, connection]);

  // Compliance: Initialize aggregator
  const initializeComplianceAggregator = useCallback(async (
    aggregatorAccount: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected', success: false };
    }

    if (!isValidSolanaAddress(aggregatorAccount)) {
      return { signature: null, loading: false, error: 'Invalid aggregator account address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.complianceAggregator;
      if (!programIdStr) {
        throw new Error('Compliance aggregator program ID not configured');
      }
      const programId = new PublicKey(programIdStr);
      const aggregatorState = new PublicKey(aggregatorAccount);

      const { keys, data } = buildComplianceInitializeInstruction(
        aggregatorState,
        publicKey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

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
  }, [publicKey, signAndSend, createInstruction]);

  // Compliance: Add module
  const addComplianceModule = useCallback(async (
    aggregatorAccount: string,
    tokenProgramId: string,
    moduleProgramId: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
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
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.complianceAggregator;
      if (!programIdStr) {
        throw new Error('Compliance aggregator program ID not configured');
      }
      const programId = new PublicKey(programIdStr);
      const aggregatorState = new PublicKey(aggregatorAccount);
      const token = new PublicKey(tokenProgramId);
      const module = new PublicKey(moduleProgramId);

      const { keys, data } = buildComplianceAddModuleInstruction(
        aggregatorState,
        publicKey,
        token,
        module,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

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
  }, [publicKey, signAndSend, createInstruction]);

  // Compliance: Remove module
  const removeComplianceModule = useCallback(async (
    aggregatorAccount: string,
    tokenProgramId: string,
    moduleProgramId: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
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
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.complianceAggregator;
      if (!programIdStr) {
        throw new Error('Compliance aggregator program ID not configured');
      }
      const programId = new PublicKey(programIdStr);
      const aggregatorState = new PublicKey(aggregatorAccount);
      const token = new PublicKey(tokenProgramId);
      const module = new PublicKey(moduleProgramId);

      const { keys, data } = buildComplianceRemoveModuleInstruction(
        aggregatorState,
        publicKey,
        token,
        module,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

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
  }, [publicKey, signAndSend, createInstruction]);

  // Compliance: Rebalance modules
  const rebalanceModules = useCallback(async (
    aggregatorAccount: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }

    if (!isValidSolanaAddress(aggregatorAccount)) {
      return { signature: null, loading: false, error: 'Invalid aggregator account address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.complianceAggregator;
      if (!programIdStr) {
        throw new Error('Compliance aggregator program ID not configured');
      }
      const programId = new PublicKey(programIdStr);
      const aggregatorState = new PublicKey(aggregatorAccount);

      const { keys, data } = buildComplianceRebalanceInstruction(
        aggregatorState,
        publicKey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

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
  }, [publicKey, signAndSend, createInstruction]);

  // Compliance: Get state (read-only query)
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

      // Create instruction for query
      const instruction = new TransactionInstruction({
        keys,
        data,
        programId,
      });

      // Simulate the transaction to get the return data
      const transaction = new Transaction();
      transaction.add(instruction);
      const simulation = await connection.simulateTransaction(transaction);

      if (simulation.value.err) {
        throw new Error(simulation.value.err.toString());
      }

      // Extract return data from simulation
      if (!simulation.value.returnData) {
        console.warn('No return data in aggregator state response');
        return null;
      }

      // The return data comes as base64 encoded bytes
      const decodedData = Buffer.from(simulation.value.returnData.data[0], 'base64');
      
      if (decodedData.length < 52) {
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

  // Identity: Initialize registry
  const initializeIdentityRegistry = useCallback(async (
    registryAccount: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected', success: false };
    }

    if (!isValidSolanaAddress(registryAccount)) {
      return { signature: null, loading: false, error: 'Invalid registry account address', success: false };
    }

    setLoading(true);
    setError(null);
    setSignature(null);

    try {
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.identityRegistry;
      if (!programIdStr) {
        throw new Error('Identity registry program ID not configured');
      }
      const programId = new PublicKey(programIdStr);
      const registryState = new PublicKey(registryAccount);

      const { keys, data } = buildIdentityInitializeInstruction(
        registryState,
        publicKey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

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
  }, [publicKey, signAndSend, createInstruction]);

  // Identity: Register identity
  const registerIdentity = useCallback(async (
    registryAccount: string,
    wallet: string,
    identity: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
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
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.identityRegistry;
      if (!programIdStr) {
        throw new Error('Identity registry program ID not configured');
      }
      const programId = new PublicKey(programIdStr);
      const registryState = new PublicKey(registryAccount);
      const walletPubkey = new PublicKey(wallet);
      const identityPubkey = new PublicKey(identity);

      const { keys, data } = buildIdentityRegisterInstruction(
        registryState,
        publicKey,
        publicKey,
        walletPubkey,
        identityPubkey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

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
  }, [publicKey, signAndSend, createInstruction]);

  // Identity: Register identity with data
  const registerIdentityWithData = useCallback(async (
    registryAccount: string,
    wallet: string,
    name: string,
    symbol: string,
    identityData: string,
    metadataUri: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
      return { signature: null, loading: false, error: 'Wallet does not support transaction signing. Please connect a wallet like Phantom or Solflare.', success: false };
    }

    if (!isValidSolanaAddress(registryAccount)) {
      return { signature: null, loading: false, error: 'Invalid registry account address', success: false };
    }
    if (!isValidSolanaAddress(wallet)) {
      return { signature: null, loading: false, error: 'Invalid wallet address', success: false };
    }

    // Validate string lengths per smart contract constraints
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
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.identityRegistry;
      if (!programIdStr) {
        throw new Error('Identity registry program ID not configured');
      }
      const programId = new PublicKey(programIdStr);
      const registryState = new PublicKey(registryAccount);
      const walletPubkey = new PublicKey(wallet);

      const { keys, data } = buildIdentityRegisterWithDataInstruction(
        registryState,
        publicKey,
        publicKey,
        walletPubkey,
        name,
        symbol,
        identityData,
        metadataUri,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

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
  }, [publicKey, signAndSend, createInstruction]);

  // Identity: Update identity
  const updateIdentity = useCallback(async (
    registryAccount: string,
    wallet: string,
    newIdentity: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
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
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.identityRegistry;
      if (!programIdStr) {
        throw new Error('Identity registry program ID not configured');
      }
      const programId = new PublicKey(programIdStr);
      const registryState = new PublicKey(registryAccount);
      const walletPubkey = new PublicKey(wallet);
      const newIdentityPubkey = new PublicKey(newIdentity);

      const { keys, data } = buildIdentityUpdateInstruction(
        registryState,
        publicKey,
        walletPubkey,
        newIdentityPubkey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

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
  }, [publicKey, signAndSend, createInstruction]);

  // Identity: Remove identity
  const removeIdentity = useCallback(async (
    registryAccount: string,
    wallet: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { signature: null, loading: false, error: 'Wallet not connected. Please connect your wallet first.', success: false };
    }
    if (!signTransaction) {
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
      const network = getCurrentNetwork();
      const programIdStr = PROGRAM_IDS[network]?.identityRegistry;
      if (!programIdStr) {
        throw new Error('Identity registry program ID not configured');
      }
      const programId = new PublicKey(programIdStr);
      const registryState = new PublicKey(registryAccount);
      const walletPubkey = new PublicKey(wallet);

      const { keys, data } = buildIdentityRemoveInstruction(
        registryState,
        publicKey,
        walletPubkey,
        programId
      );

      const transaction = new Transaction();
      transaction.add(createInstruction(keys, data, programId));

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
  }, [publicKey, signAndSend, createInstruction]);

  // Identity: Get identity (read-only query)
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

      const { keys, data } = buildIdentityGetInstruction(
        registryState,
        walletPubkey,
        programId
      );

      // Create instruction for query
      const instruction = new TransactionInstruction({
        keys,
        data,
        programId,
      });

      // Simulate the transaction to get the return data
      const transaction = new Transaction();
      transaction.add(instruction);
      const simulation = await connection.simulateTransaction(transaction);

      if (simulation.value.err) {
        throw new Error(simulation.value.err.toString());
      }

      // Extract return data from simulation
      if (!simulation.value.returnData) {
        console.warn('No return data in identity response');
        return null;
      }

      // The return data comes as base64 encoded bytes
      const decodedData = Buffer.from(simulation.value.returnData.data[0], 'base64');
      
      if (decodedData.length < 64) {
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
    initializeToken,
    mintTokens,
    transferTokens,
    burnTokens,
    freezeAccount,
    unfreezeAccount,
    addAgent,
    removeAgent,
    transferOwner,
    transferFreezeAuthority,
    getSupplyInfo,
    initializeComplianceAggregator,
    addComplianceModule,
    removeComplianceModule,
    rebalanceModules,
    getAggregatorState,
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
