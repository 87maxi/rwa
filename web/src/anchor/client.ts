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

// Instruction discriminators (8-byte tag + data)
// Generated from Anchor IDL: sha256(instruction_name) first 8 bytes
// Anchor uses snake_case for instruction names (e.g., "freeze_account", not "freezeAccount")
const DISCRIMINATORS: Record<string, number[]> = {
  // Solana RWA Token Program instructions
  initialize: [175, 175, 109, 31, 13, 152, 155, 237],
  mint: [51, 57, 225, 47, 182, 146, 137, 166],
  burn: [116, 110, 29, 56, 107, 219, 42, 93],
  transfer: [163, 52, 200, 231, 140, 3, 69, 186],
  freeze_account: [253, 75, 82, 133, 167, 238, 43, 130],
  unfreeze_account: [28, 255, 156, 206, 139, 228, 5, 213],
  add_agent: [214, 206, 14, 110, 178, 131, 218, 45],
  remove_agent: [126, 25, 90, 199, 104, 237, 225, 130],
  transfer_owner: [245, 25, 221, 175, 106, 229, 225, 45],
  transfer_freeze_authority: [235, 44, 91, 221, 224, 5, 187, 172],
  get_supply_info: [195, 15, 219, 198, 89, 216, 184, 95],
  // Compliance Aggregator instructions - from target/idl/compliance_aggregator.json
  compliance_initialize: [175, 175, 109, 31, 13, 152, 155, 237],
  compliance_add_module: [81, 183, 101, 212, 17, 241, 122, 204],
  compliance_add_module_to_existing: [203, 126, 130, 90, 26, 18, 76, 11],
  compliance_remove_module: [115, 146, 208, 15, 125, 73, 88, 161],
  compliance_rebalance_modules: [56, 55, 46, 23, 128, 216, 111, 201],
  compliance_get_modules: [134, 121, 45, 135, 3, 24, 47, 199],
  compliance_get_state: [45, 27, 40, 94, 135, 141, 130, 172],
  compliance_get_module_count: [208, 166, 2, 246, 185, 112, 23, 15],
  compliance_can_transfer: [233, 153, 157, 96, 140, 58, 200, 137],
  // Identity Registry instructions - from target/idl/identity_registry.json
  identity_initialize: [175, 175, 109, 31, 13, 152, 155, 237],
  identity_register_identity: [164, 118, 227, 177, 47, 176, 187, 248],
  identity_register_identity_with_data: [108, 188, 121, 153, 200, 193, 22, 7],
  identity_update_identity: [130, 54, 88, 104, 222, 124, 238, 252],
  identity_remove_identity: [146, 93, 160, 7, 61, 138, 181, 113],
  identity_get_identity: [239, 148, 144, 13, 242, 216, 55, 213],
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

  // Account order must match Anchor struct: payer, token, system_program
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
  agent: PublicKey,
  balanceAccount: PublicKey,
  amount: bigint,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  // Anchor layout: discriminator(8) + amount(8) = 16 bytes
  const data = Buffer.alloc(16);
  let offset = 0;

  DISCRIMINATORS.mint.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'amount' (8 bytes)
  data.writeBigUInt64LE(amount, offset);

  // Account order: token, agent, balance_account, system_program
  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: agent, isSigner: true, isWritable: false },
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
  agent: PublicKey,
  from: PublicKey,
  balanceAccount: PublicKey,
  amount: bigint,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  // Anchor layout: discriminator(8) + from(32) + amount(8) = 48 bytes
  const data = Buffer.alloc(48);
  let offset = 0;

  DISCRIMINATORS.burn.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'from' pubkey (32 bytes)
  from.toBuffer().copy(data, offset);
  offset += 32;

  // Write 'amount' (8 bytes)
  data.writeBigUInt64LE(amount, offset);

  // Account order: token, agent, sender, balance_account, system_program
  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: agent, isSigner: true, isWritable: false },
      { pubkey: from, isSigner: true, isWritable: true },
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
  from: PublicKey,
  fromBalance: PublicKey,
  toBalance: PublicKey,
  amount: bigint,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  // Anchor layout: discriminator(8) + amount(8) = 16 bytes
  // The from/to addresses are derived from from_balance/to_balance PDAs
  const data = Buffer.alloc(16);
  let offset = 0;

  DISCRIMINATORS.transfer.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'amount' (8 bytes)
  data.writeBigUInt64LE(amount, offset);

  // Account order: token, from, from_balance, to_balance, system_program
  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: false },
      { pubkey: from, isSigner: true, isWritable: false },
      { pubkey: fromBalance, isSigner: false, isWritable: true },
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
  agent: PublicKey,
  account: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  // Anchor layout: discriminator(8) + account(32) = 40 bytes
  const data = Buffer.alloc(40);
  let offset = 0;

  DISCRIMINATORS.freeze_account.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'account' pubkey (32 bytes)
  account.toBuffer().copy(data, offset);

  // Account order: token, authority, frozen_account, system_program
  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: agent, isSigner: true, isWritable: false },
      { pubkey: account, isSigner: false, isWritable: true },
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
  agent: PublicKey,
  account: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  // Anchor layout: discriminator(8) + account(32) = 40 bytes
  const data = Buffer.alloc(40);
  let offset = 0;

  DISCRIMINATORS.unfreeze_account.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'account' pubkey (32 bytes)
  account.toBuffer().copy(data, offset);

  // Account order: token, authority, frozen_account
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
  // Anchor layout: discriminator(8) + agent(32) = 40 bytes
  const data = Buffer.alloc(40);
  let offset = 0;

  DISCRIMINATORS.add_agent.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'agent' pubkey (32 bytes)
  agent.toBuffer().copy(data, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: agent, isSigner: false, isWritable: false },
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
  // Anchor layout: discriminator(8) + agent(32) = 40 bytes
  const data = Buffer.alloc(40);
  let offset = 0;

  DISCRIMINATORS.remove_agent.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'agent' pubkey (32 bytes)
  agent.toBuffer().copy(data, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: agent, isSigner: false, isWritable: true },
    ],
    data,
  };
}

/**
 * Build transfer owner instruction - transfers token ownership
 */
export function buildTransferOwnerInstruction(
  tokenState: PublicKey,
  currentOwner: PublicKey,
  newOwner: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Anchor layout: discriminator(8) + newOwner(32) = 40 bytes
  const data = Buffer.alloc(40);
  let offset = 0;

  DISCRIMINATORS.transfer_owner.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'newOwner' pubkey (32 bytes)
  newOwner.toBuffer().copy(data, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
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
  currentFreezeAuthority: PublicKey,
  newFreezeAuthority: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Anchor layout: discriminator(8) + newFreezeAuthority(32) = 40 bytes
  const data = Buffer.alloc(40);
  let offset = 0;

  DISCRIMINATORS.transfer_freeze_authority.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'newFreezeAuthority' pubkey (32 bytes)
  newFreezeAuthority.toBuffer().copy(data, offset);

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
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
  _programId: PublicKey
): InstructionResult {
  // Read-only query instruction: only discriminator needed
  const data = Buffer.alloc(8);
  let offset = 0;

  DISCRIMINATORS.get_supply_info.forEach((b, i) => {
    data[offset + i] = b;
  });

  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build compliance aggregator initialize instruction
 */
export function buildComplianceInitializeInstruction(
  aggregatorState: PublicKey,
  payer: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Read-only/initialize instruction: only discriminator needed
  const data = Buffer.alloc(8);
  let offset = 0;

  DISCRIMINATORS.compliance_initialize.forEach((b, i) => {
    data[offset + i] = b;
  });

  return {
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: aggregatorState, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
   * Build compliance add module instruction
   */
  export function buildComplianceAddModuleInstruction(
  aggregatorState: PublicKey,
  owner: PublicKey,
  token: PublicKey,
  module: PublicKey,
  tokenCompliance: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Anchor layout: discriminator(8) + token(32) + module(32) = 72 bytes
  const data = Buffer.alloc(72);
  let offset = 0;

  DISCRIMINATORS.compliance_add_module.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'token' pubkey (32 bytes)
  token.toBuffer().copy(data, offset);
  offset += 32;

  // Write 'module' pubkey (32 bytes)
  module.toBuffer().copy(data, offset);

  // Account order from AddModule struct: aggregator, owner, token, token_compliance, system_program
  return {
    keys: [
      { pubkey: aggregatorState, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: token, isSigner: false, isWritable: false },
      { pubkey: tokenCompliance, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
   * Build compliance remove module instruction
   */
  export function buildComplianceRemoveModuleInstruction(
  aggregatorState: PublicKey,
  owner: PublicKey,
  tokenCompliance: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // No arguments - just discriminator
  const data = Buffer.alloc(8);
  let offset = 0;

  DISCRIMINATORS.compliance_remove_module.forEach((b, i) => {
    data[offset + i] = b;
  });

  // Account order from RemoveModule struct: aggregator, owner, token_compliance
  return {
    keys: [
      { pubkey: aggregatorState, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: tokenCompliance, isSigner: false, isWritable: true },
    ],
    data,
  };
}

/**
 * Build compliance rebalance modules instruction
 */
export function buildComplianceRebalanceInstruction(
  aggregatorState: PublicKey,
  owner: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Only discriminator needed (no parameters)
  const data = Buffer.alloc(8);
  let offset = 0;

  DISCRIMINATORS.compliance_rebalance_modules.forEach((b, i) => {
    data[offset + i] = b;
  });

  return {
    keys: [
      { pubkey: aggregatorState, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  };
}

/**
 * Build compliance get state instruction (read-only query)
 */
export function buildComplianceGetStateInstruction(
  aggregatorState: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Anchor layout: discriminator(8) + token(32, optional) = 40 bytes
  const data = Buffer.alloc(40);
  let offset = 0;

  DISCRIMINATORS.compliance_get_state.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Optional token parameter (32 bytes, all zeros if no token specified)
  const defaultToken = Buffer.alloc(32, 0);
  defaultToken.copy(data, offset);

  return {
    keys: [
      { pubkey: aggregatorState, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build identity registry initialize instruction
 */
export function buildIdentityInitializeInstruction(
  registryState: PublicKey,
  payer: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Only discriminator needed (no parameters)
  const data = Buffer.alloc(8);
  let offset = 0;

  DISCRIMINATORS.identity_initialize.forEach((b, i) => {
    data[offset + i] = b;
  });

  return {
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: registryState, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
   * Build identity register identity instruction
   */
  export function buildIdentityRegisterInstruction(
  registryState: PublicKey,
  owner: PublicKey,
  payer: PublicKey,
  wallet: PublicKey,
  identity: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Anchor layout: discriminator(8) + wallet(32) + identity(32) = 72 bytes
  const data = Buffer.alloc(72);
  let offset = 0;

  DISCRIMINATORS.identity_register_identity.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'wallet' pubkey (32 bytes)
  wallet.toBuffer().copy(data, offset);
  offset += 32;

  // Write 'identity' pubkey (32 bytes)
  identity.toBuffer().copy(data, offset);

  // Account order from RegisterIdentity struct: payer, registry, owner, identity_account, system_program
  return {
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: registryState, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: wallet, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build identity register identity with data instruction
 */
export function buildIdentityRegisterWithDataInstruction(
  registryState: PublicKey,
  owner: PublicKey,
  payer: PublicKey,
  wallet: PublicKey,
  name: string,
  symbol: string,
  identityData: string,
  metadataUri: string,
  _programId: PublicKey
): InstructionResult {
  // Anchor layout: discriminator(8) + wallet(32) + name_len(1) + name + symbol_len(1) + symbol + identity_data_len(1) + identity_data + metadata_uri_len(1) + metadata_uri
  const nameBuffer = Buffer.from(name, 'utf-8');
  const symbolBuffer = Buffer.from(symbol, 'utf-8');
  const identityDataBuffer = Buffer.from(identityData, 'utf-8');
  const metadataUriBuffer = Buffer.from(metadataUri, 'utf-8');

  const dataLength = 8 + 32 + 1 + nameBuffer.length + 1 + symbolBuffer.length + 1 + identityDataBuffer.length + 1 + metadataUriBuffer.length;
  const data = Buffer.alloc(dataLength);

  let offset = 0;
  DISCRIMINATORS.identity_register_identity_with_data.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'wallet' pubkey (32 bytes)
  wallet.toBuffer().copy(data, offset);
  offset += 32;

  data[offset] = nameBuffer.length;
  offset += 1;
  nameBuffer.copy(data, offset);
  offset += nameBuffer.length;

  data[offset] = symbolBuffer.length;
  offset += 1;
  symbolBuffer.copy(data, offset);
  offset += symbolBuffer.length;

  data[offset] = identityDataBuffer.length;
  offset += 1;
  identityDataBuffer.copy(data, offset);
  offset += identityDataBuffer.length;

  data[offset] = metadataUriBuffer.length;
  offset += 1;
  metadataUriBuffer.copy(data, offset);
  offset += metadataUriBuffer.length;

  return {
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: registryState, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: wallet, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
   * Build identity update identity instruction
   */
  export function buildIdentityUpdateInstruction(
  registryState: PublicKey,
  owner: PublicKey,
  wallet: PublicKey,
  newIdentity: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Anchor layout: discriminator(8) + wallet(32) + newIdentity(32) = 72 bytes
  // wallet is used for PDA derivation: [b"identity", registry.key(), wallet.key()]
  const data = Buffer.alloc(72);
  let offset = 0;

  DISCRIMINATORS.identity_update_identity.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'wallet' pubkey (32 bytes) - used for PDA derivation
  wallet.toBuffer().copy(data, offset);
  offset += 32;

  // Write 'newIdentity' pubkey (32 bytes)
  newIdentity.toBuffer().copy(data, offset);

  // Account order from UpdateIdentity struct: registry (read-only), identity_account (writable), owner
  return {
    keys: [
      { pubkey: registryState, isSigner: false, isWritable: false },
      { pubkey: wallet, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  };
}

/**
 * Build identity remove identity instruction
 */
export function buildIdentityRemoveInstruction(
  registryState: PublicKey,
  owner: PublicKey,
  wallet: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Anchor layout: discriminator(8) + wallet(32) = 40 bytes
  const data = Buffer.alloc(40);
  let offset = 0;

  DISCRIMINATORS.identity_remove_identity.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'wallet' pubkey (32 bytes)
  wallet.toBuffer().copy(data, offset);

  return {
    keys: [
      { pubkey: registryState, isSigner: false, isWritable: true },
      { pubkey: wallet, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  };
}

/**
 * Build identity get identity instruction (read-only query)
 */
export function buildIdentityGetInstruction(
  registryState: PublicKey,
  wallet: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Anchor layout: discriminator(8) + wallet(32) = 40 bytes
  const data = Buffer.alloc(40);
  let offset = 0;

  DISCRIMINATORS.identity_get_identity.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'wallet' pubkey (32 bytes)
  wallet.toBuffer().copy(data, offset);

  return {
    keys: [
      { pubkey: registryState, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Parse SupplyInfo from account data
 * Format: currentSupply (8 bytes u64) + maxSupply (8 bytes u64) + remainingSupply (8 bytes u64)
 */
export function parseSupplyInfo(data: Buffer): {
  currentSupply: bigint;
  maxSupply: bigint;
  remainingSupply: bigint;
} {
  if (data.length < 24) {
    throw new Error('Invalid SupplyInfo data length: expected 24 bytes');
  }

  return {
    currentSupply: BigInt(data.readBigUInt64LE(0)),
    maxSupply: BigInt(data.readBigUInt64LE(8)),
    remainingSupply: BigInt(data.readBigUInt64LE(16)),
  };
}

/**
 * Parse AggregatorState from account data
 * Format: owner (32 bytes) + totalUniqueTokens (4 bytes u32) + totalModuleEntries (4 bytes u32) +
 *         tokenModuleCount (4 bytes u32) + nextIndex (8 bytes u64)
 */
export function parseAggregatorState(data: Buffer): {
  owner: string;
  totalUniqueTokens: number;
  totalModuleEntries: number;
  tokenModuleCount: number;
  nextIndex: bigint;
} {
  if (data.length < 52) {
    throw new Error('Invalid AggregatorState data length: expected at least 52 bytes');
  }

  return {
    owner: data.slice(0, 32).toString('hex'),
    totalUniqueTokens: data.readUInt32LE(32),
    totalModuleEntries: data.readUInt32LE(36),
    tokenModuleCount: data.readUInt32LE(40),
    nextIndex: BigInt(data.readBigUInt64LE(44)),
  };
}

/**
 * Parse IdentityInfo from account data
 * Format: wallet (32 bytes) + identity (32 bytes)
 */
export function parseIdentityInfo(data: Buffer): {
  wallet: string;
  identity: string;
} {
  if (data.length < 64) {
    throw new Error('Invalid IdentityInfo data length: expected 64 bytes');
  }

  return {
    wallet: data.slice(0, 32).toString('hex'),
    identity: data.slice(32, 64).toString('hex'),
  };
}

/**
 * Execute a legacy transaction with the Solana RWA program using wallet signing.
 * 
 * @param connection - Solana connection
 * @param instruction - Instruction result with keys and data
 * @param payer - Payer public key (fee payer)
 * @param programId - Program ID
 * @param signTransaction - Async function to sign a legacy transaction (from wallet adapter)
 */
export async function executeTransaction(
  connection: Connection,
  instruction: { keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>; data: Buffer },
  payer: PublicKey,
  programId: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  // Create TransactionInstruction from instruction result
  const txInstruction = new TransactionInstruction({
    keys: instruction.keys,
    data: instruction.data,
    programId,
  });

  // Create legacy transaction
  const transaction = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: payer,
  }).add(txInstruction);

  // Sign transaction using wallet adapter
  const signedTransaction = await signTransaction(transaction);

  // Send pre-signed transaction (signers=[] because wallet already signed)
  const signature = await connection.sendTransaction(signedTransaction, [], {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  // Confirm transaction
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  return signature;
}

/**
 * Execute a versioned transaction with wallet signing.
 * This is the recommended approach for versioned transactions.
 * 
 * @param connection - Solana connection
 * @param instruction - Instruction result with keys and data
 * @param payer - Payer public key (fee payer)
 * @param programId - Program ID
 * @param signTransaction - Async function to sign a versioned transaction (from wallet adapter)
 */
export async function executeVersionedTransaction(
  connection: Connection,
  instruction: { keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>; data: Buffer },
  payer: PublicKey,
  programId: PublicKey,
  signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash();

  // Create TransactionInstruction from instruction result
  const txInstruction = new TransactionInstruction({
    keys: instruction.keys,
    data: instruction.data,
    programId,
  });

  // Create TransactionMessage with correct feePayer and blockhash
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: [txInstruction],
  }).compileToV0Message();

  // Create versioned transaction
  const transaction = new VersionedTransaction(message);

  // Sign transaction using wallet adapter
  const signedTransaction = await signTransaction(transaction);

  // Send pre-signed versioned transaction
  const signature = await connection.sendTransaction(signedTransaction, {
    maxRetries: 3,
    skipPreflight: false,
  });

  // Confirm transaction
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
