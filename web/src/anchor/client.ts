'use client';

/**
 * Anchor SDK Client for Solana RWA Program
 *
 * This module provides a lightweight Anchor client for interacting with the
 * Solana RWA token program without requiring the full Anchor framework.
 * It uses manual instruction building based on the program's IDL.
 *
 * Fase 4 — Refactorización Frontend
 * Este archivo ahora re-exporta desde módulos especializados para mejor organización.
 */

// ============================================================================
// Re-exports from specialized modules
// ============================================================================

// Solana RWA Token Program instructions
export {
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
  createInstruction,
  type InstructionResult,
  type BalanceEntry,
  type FrozenEntry,
} from './solana-rwa';

// Compliance Aggregator instructions
export {
  buildComplianceInitializeInstruction,
  buildComplianceAddModuleInstruction,
  buildComplianceRemoveModuleInstruction,
  buildComplianceRebalanceInstruction,
  buildComplianceGetStateInstruction,
  buildComplianceAddModuleToExistingInstruction,
  buildComplianceGetModulesInstruction,
  buildComplianceGetModuleCountInstruction,
  buildComplianceCanTransferInstruction,
} from './compliance';

// Identity Registry instructions
export {
  buildIdentityInitializeInstruction,
  buildIdentityRegisterInstruction,
  buildIdentityRegisterWithDataInstruction,
  buildIdentityUpdateInstruction,
  buildIdentityRemoveInstruction,
} from './identity';

// PDA derivation helpers
export {
  deriveBalancePda,
  deriveFrozenPda,
  deriveAgentPda,
  deriveTokenStatePda,
  deriveRegistryPda,
  deriveAggregatorPda,
  deriveCompliancePda,
  getIdentityPda,
} from './pdas';

// Account data parsers
export {
  parseSupplyInfo,
  parseTokenState,
  parseBalanceAccount,
  parseFrozenAccount,
  parseAggregatorState,
  parseTokenCompliance,
  parseIdentityInfo,
  readAnchorString,
} from './parsers';

// Discriminators (single source of truth)
export {
  SOLANA_RWA_DISCRIMINATORS,
  COMPLIANCE_AGGREGATOR_DISCRIMINATORS,
  IDENTITY_REGISTRY_DISCRIMINATORS,
  ACCOUNT_DISCRIMINATORS,
  DISCRIMINATOR_MAP,
} from './discriminators';

// ============================================================================
// Transaction execution helpers (kept in client.ts as they are program-agnostic)
// ============================================================================

import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
  type Connection,
} from '@solana/web3.js';
import { PROGRAM_IDS } from '@/config/solana';
import type { NetworkType } from '@/config/solana';

/**
 * Get the program ID for the current network
 */
export function getProgramId(
  network: NetworkType = 'localnet',
  program: 'solanaRwa' | 'identityRegistry' | 'complianceAggregator' = 'solanaRwa'
): PublicKey {
  const programIdStr = PROGRAM_IDS[network]?.[program];
  if (!programIdStr) {
    throw new Error(`Program ID not found for ${program} on ${network}`);
  }
  return new PublicKey(programIdStr);
}

/**
 * Execute a legacy transaction with the Solana RWA program using wallet signing.
 */
export async function executeTransaction(
  connection: Connection,
  instruction: { keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>; data: Buffer },
  payer: PublicKey,
  programId: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  const txInstruction = new TransactionInstruction({
    keys: instruction.keys,
    data: instruction.data,
    programId,
  });

  const transaction = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: payer,
  }).add(txInstruction);

  const signedTransaction = await signTransaction(transaction);

  const signature = await connection.sendTransaction(signedTransaction, [], {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  return signature;
}

/**
 * Execute a versioned transaction with wallet signing.
 */
export async function executeVersionedTransaction(
  connection: Connection,
  instruction: { keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>; data: Buffer },
  payer: PublicKey,
  programId: PublicKey,
  signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash();

  const txInstruction = new TransactionInstruction({
    keys: instruction.keys,
    data: instruction.data,
    programId,
  });

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: [txInstruction],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);
  const signedTransaction = await signTransaction(transaction);

  const signature = await connection.sendTransaction(signedTransaction, {
    maxRetries: 3,
    skipPreflight: false,
  });

  const { lastValidBlockHeight: lvb } = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight: lvb },
    'confirmed'
  );

  return signature;
}

/**
 * Build a versioned transaction for the RWA program
 */
export async function buildVersionedTransaction(
  connection: Connection,
  instructions: Array<{ keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>; data: Buffer }>,
  payer: PublicKey,
  programId: PublicKey,
  signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash();

  const builtInstructions = instructions.map((ix) =>
    new TransactionInstruction({
      programId,
      keys: ix.keys,
      data: ix.data,
    })
  );

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: builtInstructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);
  const signedTransaction = await signTransaction(transaction);

  const signature = await connection.sendTransaction(signedTransaction, {
    maxRetries: 3,
    skipPreflight: false,
  });

  const { context } = await connection.getSignatureStatus(signature);
  if (!context || !context.slot) {
    throw new Error('Transaction failed');
  }

  return signature;
}
