/**
 * Solana RWA Token Program - Instruction Builders
 *
 * All instruction builders for the solana-rwa program.
 */

import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { SOLANA_RWA_DISCRIMINATORS } from './discriminators';

// ============================================================================
// Types
// ============================================================================

/**
 * Instruction builder result
 */
export interface InstructionResult {
  keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>;
  data: Buffer;
}

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

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Serializes a string according to Anchor's format:
 * 4 bytes length prefix (u32 LE) + UTF-8 bytes.
 */
function serializeAnchorString(s: string): Buffer {
  const utf8Buffer = Buffer.from(s, 'utf-8');
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32LE(utf8Buffer.length, 0);
  return Buffer.concat([prefix, utf8Buffer]);
}

// ============================================================================
// Instruction Builders
// ============================================================================

/**
 * Build initialize instruction for Token State.
 */
export function buildInitializeInstruction(
  tokenState: PublicKey,
  owner: PublicKey,
  name: string,
  symbol: string,
  decimals: number,
  _programId: PublicKey
): InstructionResult {
  const nameBuffer = serializeAnchorString(name);
  const symbolBuffer = serializeAnchorString(symbol);

  const dataLength = 8 + nameBuffer.length + symbolBuffer.length + 1;
  const data = Buffer.alloc(dataLength);

  let offset = 0;

  // Write discriminator (8 bytes)
  SOLANA_RWA_DISCRIMINATORS.initialize.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write name (Anchor String format)
  nameBuffer.copy(data, offset);
  offset += nameBuffer.length;

  // Write symbol (Anchor String format)
  symbolBuffer.copy(data, offset);
  offset += symbolBuffer.length;

  // Write decimals (1 byte)
  data[offset] = decimals;

  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: tokenState, isSigner: false, isWritable: true },
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
  tokenOwner: PublicKey,
  agent: PublicKey,
  recipient: PublicKey,
  balanceAccount: PublicKey,
  amount: bigint,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(16);
  let offset = 0;

  SOLANA_RWA_DISCRIMINATORS.mint.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  data.writeBigUInt64LE(amount, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: tokenOwner, isSigner: false, isWritable: false },
      { pubkey: agent, isSigner: true, isWritable: false },
      { pubkey: recipient, isSigner: false, isWritable: false },
      { pubkey: balanceAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build burn instruction
 */
export function buildBurnInstruction(
  tokenState: PublicKey,
  tokenOwner: PublicKey,
  agent: PublicKey,
  sender: PublicKey,
  balanceAccount: PublicKey,
  amount: bigint,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(48);
  let offset = 0;

  SOLANA_RWA_DISCRIMINATORS.burn.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  sender.toBuffer().copy(data, offset);
  offset += 32;

  data.writeBigUInt64LE(amount, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: tokenOwner, isSigner: false, isWritable: false },
      { pubkey: agent, isSigner: true, isWritable: false },
      { pubkey: sender, isSigner: true, isWritable: true },
      { pubkey: balanceAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build transfer instruction
 */
export function buildTransferInstruction(
  tokenState: PublicKey,
  tokenOwner: PublicKey,
  from: PublicKey,
  fromBalance: PublicKey,
  receiver: PublicKey,
  toBalance: PublicKey,
  amount: bigint,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(16);
  let offset = 0;

  SOLANA_RWA_DISCRIMINATORS.transfer.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  data.writeBigUInt64LE(amount, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: false },
      { pubkey: tokenOwner, isSigner: false, isWritable: false },
      { pubkey: from, isSigner: true, isWritable: false },
      { pubkey: fromBalance, isSigner: false, isWritable: true },
      { pubkey: receiver, isSigner: false, isWritable: false },
      { pubkey: toBalance, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build freeze account instruction
 */
export function buildFreezeInstruction(
  tokenState: PublicKey,
  tokenOwner: PublicKey,
  authority: PublicKey,
  walletToFreeze: PublicKey,
  frozenAccount: PublicKey,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(40);
  let offset = 0;

  SOLANA_RWA_DISCRIMINATORS.freeze_account.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  walletToFreeze.toBuffer().copy(data, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: false },
      { pubkey: tokenOwner, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: walletToFreeze, isSigner: false, isWritable: false },
      { pubkey: frozenAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build unfreeze account instruction
 */
export function buildUnfreezeInstruction(
  tokenState: PublicKey,
  tokenOwner: PublicKey,
  authority: PublicKey,
  walletToFreeze: PublicKey,
  frozenAccount: PublicKey,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(40);
  let offset = 0;

  SOLANA_RWA_DISCRIMINATORS.unfreeze_account.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  walletToFreeze.toBuffer().copy(data, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: false },
      { pubkey: tokenOwner, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: walletToFreeze, isSigner: false, isWritable: false },
      { pubkey: frozenAccount, isSigner: false, isWritable: true },
    ],
    data,
  };
}

/**
 * Build add agent instruction
 */
export function buildAddAgentInstruction(
  tokenState: PublicKey,
  tokenOwner: PublicKey,
  payer: PublicKey,
  newAgent: PublicKey,
  agentAccount: PublicKey,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(40);
  let offset = 0;

  SOLANA_RWA_DISCRIMINATORS.add_agent.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  newAgent.toBuffer().copy(data, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: tokenOwner, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: newAgent, isSigner: false, isWritable: false },
      { pubkey: agentAccount, isSigner: false, isWritable: true },
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
  tokenOwner: PublicKey,
  payer: PublicKey,
  agentToRemove: PublicKey,
  agentAccount: PublicKey,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(8);
  let offset = 0;

  SOLANA_RWA_DISCRIMINATORS.remove_agent.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: tokenOwner, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: agentToRemove, isSigner: false, isWritable: false },
      { pubkey: agentAccount, isSigner: false, isWritable: true },
    ],
    data,
  };
}

/**
 * Build transfer owner instruction
 */
export function buildTransferOwnerInstruction(
  tokenState: PublicKey,
  tokenOwner: PublicKey,
  currentOwner: PublicKey,
  newOwner: PublicKey,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(40);
  let offset = 0;

  SOLANA_RWA_DISCRIMINATORS.transfer_owner.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  newOwner.toBuffer().copy(data, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: tokenOwner, isSigner: false, isWritable: false },
      { pubkey: currentOwner, isSigner: true, isWritable: false },
    ],
    data,
  };
}

/**
 * Build transfer freeze authority instruction
 */
export function buildTransferFreezeAuthorityInstruction(
  tokenState: PublicKey,
  tokenOwner: PublicKey,
  currentFreezeAuthority: PublicKey,
  newFreezeAuthority: PublicKey,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(40);
  let offset = 0;

  SOLANA_RWA_DISCRIMINATORS.transfer_freeze_authority.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  newFreezeAuthority.toBuffer().copy(data, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: tokenOwner, isSigner: false, isWritable: false },
      { pubkey: currentFreezeAuthority, isSigner: true, isWritable: false },
    ],
    data,
  };
}

/**
 * Build get supply info instruction (read-only query)
 */
export function buildGetSupplyInfoInstruction(
  tokenState: PublicKey,
  tokenOwner: PublicKey,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(8);
  let offset = 0;

  SOLANA_RWA_DISCRIMINATORS.get_supply_info.forEach((b, i) => {
    data[offset + i] = b;
  });

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: false },
      { pubkey: tokenOwner, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Create a TransactionInstruction from an InstructionResult
 */
export function createInstruction(
  keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>,
  data: Buffer,
  programId: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    keys,
    data,
    programId,
  });
}
