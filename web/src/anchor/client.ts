'use client';

/**
 * Anchor SDK Client for Solana RWA Program
 *
 * This module provides a lightweight Anchor client for interacting with the
 * Solana RWA token program without requiring the full Anchor framework.
 * It uses manual instruction building based on the program's IDL.
 */

import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  SystemProgram,
  TransactionMessage,
  type Connection,
  type Signer,
} from '@solana/web3.js';
import { PROGRAM_IDS } from '@/config/solana';
import type { NetworkType } from '@/config/solana';

// Instruction discriminators (4-byte tag + data)
const DISCRIMINATORS: Record<string, number[]> = {
  initialize: [172, 126, 250, 222, 211, 123, 83, 106],
  mint: [70, 168, 124, 228, 253, 79, 124, 126],
  burn: [116, 110, 29, 56, 107, 219, 42, 93],
  transfer: [9, 202, 238, 138, 146, 147, 135, 203],
  freezeAccount: [253, 75, 82, 133, 167, 238, 43, 130],
  unfreezeAccount: [193, 107, 221, 229, 120, 136, 106, 182],
  addAgent: [214, 206, 14, 110, 178, 131, 218, 45],
  removeAgent: [18, 36, 107, 128, 13, 62, 156, 138],
};

/**
 * Token state account data structure (matches Anchor struct)
 */
export interface BalanceEntry {
  account: Uint8Array;
  amount: bigint;
}

export interface FrozenEntry {
  account: Uint8Array;
}

/**
 * Instruction builder result
 */
export interface InstructionResult {
  keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>;
  data: Buffer;
}

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
 * Build initialize instruction
 */
export function buildInitializeInstruction(
  tokenState: PublicKey,
  owner: PublicKey,
  name: string,
  symbol: string,
  decimals: number,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  const nameBuffer = Buffer.from(name, 'utf-8');
  const symbolBuffer = Buffer.from(symbol, 'utf-8');

  const dataLength = 8 + 1 + nameBuffer.length + 1 + symbolBuffer.length + 1;
  const data = Buffer.alloc(dataLength);

  let offset = 0;
  // Write discriminator
  DISCRIMINATORS.initialize.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write name (length-prefixed string)
  data[offset] = nameBuffer.length;
  offset += 1;
  nameBuffer.copy(data, offset);
  offset += nameBuffer.length;

  // Write symbol (length-prefixed string)
  data[offset] = symbolBuffer.length;
  offset += 1;
  symbolBuffer.copy(data, offset);
  offset += symbolBuffer.length;

  // Write decimals
  data[offset] = decimals;

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build mint instruction
 */
export function buildMintInstruction(
  tokenState: PublicKey,
  agent: PublicKey,
  to: PublicKey,
  amount: bigint,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  const data = Buffer.alloc(16);
  let offset = 0;

  DISCRIMINATORS.mint.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  data.writeBigUInt64LE(amount, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: agent, isSigner: true, isWritable: false },
      { pubkey: to, isSigner: false, isWritable: true },
    ],
    data,
  };
}

/**
 * Build burn instruction
 */
export function buildBurnInstruction(
  tokenState: PublicKey,
  agent: PublicKey,
  from: PublicKey,
  amount: bigint,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  const data = Buffer.alloc(16);
  let offset = 0;

  DISCRIMINATORS.burn.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  data.writeBigUInt64LE(amount, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: agent, isSigner: true, isWritable: false },
      { pubkey: from, isSigner: false, isWritable: true },
    ],
    data,
  };
}

/**
 * Build transfer instruction
 */
export function buildTransferInstruction(
  tokenState: PublicKey,
  agent: PublicKey,
  from: PublicKey,
  to: PublicKey,
  amount: bigint,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  // Anchor layout: discriminator + amount (from/to are in accounts)
  const data = Buffer.alloc(16);
  let offset = 0;

  DISCRIMINATORS.transfer.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  data.writeBigUInt64LE(amount, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: agent, isSigner: true, isWritable: false },
      { pubkey: from, isSigner: false, isWritable: true },
      { pubkey: to, isSigner: false, isWritable: true },
    ],
    data,
  };
}

/**
 * Build freeze account instruction
 */
export function buildFreezeInstruction(
  tokenState: PublicKey,
  agent: PublicKey,
  account: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  const data = Buffer.alloc(8);
  const offset = 0;

  DISCRIMINATORS.freezeAccount.forEach((b, i) => {
    data[offset + i] = b;
  });

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: agent, isSigner: true, isWritable: false },
      { pubkey: account, isSigner: false, isWritable: true },
    ],
    data,
  };
}

/**
 * Build unfreeze account instruction
 */
export function buildUnfreezeInstruction(
  tokenState: PublicKey,
  agent: PublicKey,
  account: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  const data = Buffer.alloc(8);
  const offset = 0;

  DISCRIMINATORS.unfreezeAccount.forEach((b, i) => {
    data[offset + i] = b;
  });

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: agent, isSigner: true, isWritable: false },
      { pubkey: account, isSigner: false, isWritable: true },
    ],
    data,
  };
}

/**
 * Build add agent instruction
 */
export function buildAddAgentInstruction(
  tokenState: PublicKey,
  payer: PublicKey,
  agent: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  const data = Buffer.alloc(40);
  const offset = 0;

  DISCRIMINATORS.addAgent.forEach((b, i) => {
    data[offset + i] = b;
  });

  agent.toBuffer().copy(data, 8);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build remove agent instruction
 */
export function buildRemoveAgentInstruction(
  tokenState: PublicKey,
  payer: PublicKey,
  agent: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  const data = Buffer.alloc(40);
  const offset = 0;

  DISCRIMINATORS.removeAgent.forEach((b, i) => {
    data[offset + i] = b;
  });

  agent.toBuffer().copy(data, 8);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Execute a legacy transaction with the Solana RWA program
 */
export async function executeLegacyTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Signer[]
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = signers[0]?.publicKey;

  if (signers.length > 0) {
    transaction.sign(...signers);
  }

  const signature = await connection.sendTransaction(transaction, signers, {
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

  // Create instructions with proper format
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
