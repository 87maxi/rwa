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
  // Note: identity_get is a view function (query), not a transaction instruction
  // It uses the account's data directly, no discriminator needed
};

// =============================================================================
// PDA DERIVATION HELPERS
// =============================================================================
// These functions derive PDAs based on the seeds defined in the IDL.
// They ensure consistency between the frontend and the smart contract.

/**
 * Derive the PDA for a BalanceAccount.
 * Seeds: [b"balance", token_state, wallet]
 * @see IDL: solana-rwa.json - balance_account PDA seeds
 */
export function deriveBalancePda(
  tokenState: PublicKey,
  wallet: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("balance"), tokenState.toBuffer(), wallet.toBuffer()],
    programId
  );
  return pda;
}

/**
 * Derive the PDA for a FrozenAccount.
 * Seeds: [b"frozen", token_state, wallet]
 * @see IDL: solana-rwa.json - frozen_account PDA seeds
 */
export function deriveFrozenPda(
  tokenState: PublicKey,
  wallet: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("frozen"), tokenState.toBuffer(), wallet.toBuffer()],
    programId
  );
  return pda;
}

/**
 * Derive the PDA for an AgentAccount.
 * Seeds: [b"agent", token_state, agent]
 * @see IDL: solana-rwa.json - agent_account PDA seeds
 */
export function deriveAgentPda(
  tokenState: PublicKey,
  agent: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), tokenState.toBuffer(), agent.toBuffer()],
    programId
  );
  return pda;
}

/**
 * Derive the TokenState PDA.
 * Seeds: [b"token", owner]
 * @see IDL: solana-rwa.json - token PDA seeds
 */
export function deriveTokenStatePda(
  owner: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token"), owner.toBuffer()],
    programId
  );
  return pda;
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
/**
 * Serializes a string according to Anchor's format:
 * 4 bytes length prefix (u32 LE) + UTF-8 bytes.
 *
 * According to Anchor documentation: "A String requires 4 bytes for the length
 * prefix plus the number of bytes in the string."
 *
 * Fase 6.3: Fix para error "memory allocation failed, out of memory" en Surfpool.
 *
 * Problema: El formato anterior usaba 8 bytes para el prefijo, pero Anchor usa
 * exactamente 4 bytes (u32 LE) para el prefijo de longitud de los Strings.
 *
 * Solución: Usar prefijo de 4 bytes (u32 LE) para la longitud del string.
 */
function serializeAnchorString(s: string): Buffer {
  const utf8Buffer = Buffer.from(s, 'utf-8');
  // Anchor String type: 4-byte u32 LE length prefix + UTF-8 bytes
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32LE(utf8Buffer.length, 0);
  return Buffer.concat([prefix, utf8Buffer]);
}

/**
 * Build initialize instruction for Token State.
 *
 * Fase 6.3: Fix para error "memory allocation failed, out of memory" en Surfpool.
 * El formato de datos ahora coincide con Anchor's String serialization (4-byte u32 LE prefix).
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
  
  // Serialize strings using Anchor's format (4-byte u32 LE length prefix + UTF-8 bytes)
  const nameBuffer = serializeAnchorString(name);
  const symbolBuffer = serializeAnchorString(symbol);

  // Data layout: 8-byte discriminator + 4-byte name length + name bytes + 4-byte symbol length + symbol bytes + 1-byte decimals
  const dataLength = 8 + nameBuffer.length + symbolBuffer.length + 1;
  const data = Buffer.alloc(dataLength);

  let offset = 0;
  
  // Write discriminator (8 bytes)
  DISCRIMINATORS.initialize.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write name (Anchor String format: 4-byte u32 LE length prefix + UTF-8 bytes)
  nameBuffer.copy(data, offset);
  offset += nameBuffer.length;

  // Write symbol (Anchor String format: 4-byte u32 LE length prefix + UTF-8 bytes)
  symbolBuffer.copy(data, offset);
  offset += symbolBuffer.length;

  // Write decimals (1 byte)
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
  * @param tokenState - Token state PDA (read-only in FreezeAccount struct)
  * @param agent - Authority performing the freeze (must be freeze_authority)
  * @param account - Frozen status PDA to freeze
  * @param _programId - Program ID (reserved for future use)
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

  // Account order: token (read-only), authority, frozen_account, system_program
  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: false },
      { pubkey: agent, isSigner: true, isWritable: false },
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
  * Build unfreeze account instruction
  * @param tokenState - Token state PDA (read-only in UnfreezeAccount struct)
  * @param agent - Authority performing the unfreeze
  * @param account - Frozen status PDA to unfreeze
  * @param _programId - Program ID (reserved for future use)
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

  // Account order: token (read-only), authority, frozen_account
  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: false },
      { pubkey: agent, isSigner: true, isWritable: false },
      { pubkey: account, isSigner: false, isWritable: true },
    ],
    data,
  };
}

/**
  * Build add agent instruction
  * @param tokenState - Token state PDA
  * @param payer - Payer (must be token owner)
  * @param agent - New agent wallet pubkey
  * @param agentAccount - Agent account PDA (seeds: [b"agent", tokenState, agent])
  * @param _programId - Program ID (reserved for future use)
  */
  export function buildAddAgentInstruction(
  tokenState: PublicKey,
  payer: PublicKey,
  agent: PublicKey,
  agentAccount: PublicKey,
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

  // Account order from AddAgent struct: token, payer, new_agent, agent_account, system_program
  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: agent, isSigner: false, isWritable: false },
      { pubkey: agentAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build remove agent instruction.
 *
 * Accounts from RemoveAgent struct (IDL):
 * - token: TokenState PDA (writable, read-only for this operation)
 * - payer: Signer (must be token owner)
 * - agent_account: AgentAccount PDA (writable, closes account, returns SOL to payer)
 *
 * PDA derivation for agent_account: [b"agent", token_state, agent]
 * @see IDL: solana-rwa.json - remove_agent accounts
 */
export function buildRemoveAgentInstruction(
  tokenState: PublicKey,
  payer: PublicKey,
  agentAccount: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // programId parameter reserved for future use
  // No arguments in data - just discriminator (the agent pubkey is stored in agent_account PDA)
  const data = Buffer.alloc(8);
  let offset = 0;

  DISCRIMINATORS.remove_agent.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Account order from RemoveAgent struct in IDL: token, payer, agent_account
  return {
    keys: [
      { pubkey: tokenState, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: agentAccount, isSigner: false, isWritable: true },
    ],
    data,
  };
}

/**
  * Build transfer owner instruction - transfers token ownership
  * @param tokenState - Token state PDA (writable to update owner)
  * @param currentOwner - Current owner (must sign)
  * @param newOwner - New owner pubkey (written in data payload)
  * @param _programId - Program ID (reserved for future use)
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

  // Account order from TransferOwner struct: token, current_owner
  // NOTE: Rust TransferOwner struct only has 2 accounts (no new_owner account)
  // The new_owner is passed as data, not as an account
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
  * @param tokenState - Token state PDA (writable to update freeze_authority)
  * @param currentFreezeAuthority - Current freeze authority (must sign)
  * @param newFreezeAuthority - New freeze authority pubkey (written in data payload)
  * @param _programId - Program ID (reserved for future use)
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

  // Account order from TransferFreezeAuthority struct: token, current_freeze_authority
  // NOTE: Rust TransferFreezeAuthority struct only has 2 accounts (no new_freeze_authority account)
  // The new_freeze_authority is passed as data, not as an account
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
 * Build compliance add module to existing token instruction
 */
export function buildComplianceAddModuleToExistingInstruction(
  aggregatorState: PublicKey,
  owner: PublicKey,
  tokenCompliance: PublicKey,
  module: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Anchor layout: discriminator(8) + module(32) = 40 bytes
  const data = Buffer.alloc(40);
  let offset = 0;

  DISCRIMINATORS.compliance_add_module_to_existing.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'module' pubkey (32 bytes)
  module.toBuffer().copy(data, offset);

  // Account order: aggregator, owner, token_compliance
  // NOTE: NO system_program - AddModuleToExisting struct doesn't include it
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
 * Build compliance get modules instruction (read-only query)
 */
export function buildComplianceGetModulesInstruction(
  aggregatorState: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Only discriminator needed (no parameters)
  const data = Buffer.alloc(8);
  let offset = 0;

  DISCRIMINATORS.compliance_get_modules.forEach((b, i) => {
    data[offset + i] = b;
  });

  return {
    keys: [
      { pubkey: aggregatorState, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build compliance get module count instruction (read-only query)
 */
export function buildComplianceGetModuleCountInstruction(
  aggregatorState: PublicKey,
  _programId: PublicKey
): InstructionResult {
  // Only discriminator needed (no parameters)
  const data = Buffer.alloc(8);
  let offset = 0;

  DISCRIMINATORS.compliance_get_module_count.forEach((b, i) => {
    data[offset + i] = b;
  });

  return {
    keys: [
      { pubkey: aggregatorState, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build compliance can transfer instruction (read-only query)
 *
 * Parameters match Rust can_transfer() signature:
 * token, from, to, amount, sender_kyc, recipient_kyc, sender_balance, recipient_balance, total_holders
 *
 * Data layout: discriminator(8) + token(32) + from(32) + to(32) + amount(8) +
 *              sender_kyc(32) + recipient_kyc(32) + sender_balance(8) +
 *              recipient_balance(8) + total_holders(8) = 200 bytes
 */
export function buildComplianceCanTransferInstruction(
  aggregatorState: PublicKey,
  token: PublicKey,
  from: PublicKey,
  to: PublicKey,
  amount: bigint,
  senderKyc: PublicKey,
  recipientKyc: PublicKey,
  senderBalance: bigint,
  recipientBalance: bigint,
  totalHolders: bigint,
  _programId: PublicKey
): InstructionResult {
  // Anchor layout: discriminator(8) + token(32) + from(32) + to(32) + amount(8) +
  //                sender_kyc(32) + recipient_kyc(32) + sender_balance(8) +
  //                recipient_balance(8) + total_holders(8) = 200 bytes
  const data = Buffer.alloc(200);
  let offset = 0;

  DISCRIMINATORS.compliance_can_transfer.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'token' pubkey (32 bytes)
  token.toBuffer().copy(data, offset);
  offset += 32;

  // Write 'from' pubkey (32 bytes)
  from.toBuffer().copy(data, offset);
  offset += 32;

  // Write 'to' pubkey (32 bytes)
  to.toBuffer().copy(data, offset);
  offset += 32;

  // Write 'amount' (8 bytes, u64)
  data.writeBigUInt64LE(amount, offset);
  offset += 8;

  // Write 'sender_kyc' pubkey (32 bytes)
  senderKyc.toBuffer().copy(data, offset);
  offset += 32;

  // Write 'recipient_kyc' pubkey (32 bytes)
  recipientKyc.toBuffer().copy(data, offset);
  offset += 32;

  // Write 'sender_balance' (8 bytes, u64)
  data.writeBigUInt64LE(senderBalance, offset);
  offset += 8;

  // Write 'recipient_balance' (8 bytes, u64)
  data.writeBigUInt64LE(recipientBalance, offset);
  offset += 8;

  // Write 'total_holders' (8 bytes, u64)
  data.writeBigUInt64LE(totalHolders, offset);

  // Account order from IDL: aggregator, token, token_compliance
  return {
    keys: [
      { pubkey: aggregatorState, isSigner: false, isWritable: false },
      { pubkey: token, isSigner: false, isWritable: false },
      { pubkey: token, isSigner: false, isWritable: false }, // token_compliance derives from token
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
  programId: PublicKey
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

  // Derive identity_account PDA: [b"identity", registry, owner]
  const [identityAccountPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("identity"), registryState.toBuffer(), owner.toBuffer()],
    programId
  );

  // Account order from RegisterIdentity struct: payer, registry, owner, identity_account, system_program
  return {
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: registryState, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: identityAccountPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  };
}

/**
 * Build identity register identity with data instruction.
 *
 * Fase 6.3: Fix para formato de Strings. Usar 4-byte u32 LE prefix en lugar de 1-byte u8.
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
  // Serialize strings using Anchor's format (4-byte u32 LE length prefix + UTF-8 bytes)
  const nameBuffer = serializeAnchorString(name);
  const symbolBuffer = serializeAnchorString(symbol);
  const identityDataBuffer = serializeAnchorString(identityData);
  const metadataUriBuffer = serializeAnchorString(metadataUri);

  // Anchor layout: discriminator(8) + wallet(32) + name(4+len) + symbol(4+len) + identity_data(4+len) + metadata_uri(4+len)
  const dataLength = 8 + 32 + nameBuffer.length + symbolBuffer.length + identityDataBuffer.length + metadataUriBuffer.length;
  const data = Buffer.alloc(dataLength);

  let offset = 0;
  
  // Write discriminator (8 bytes)
  DISCRIMINATORS.identity_register_identity_with_data.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'wallet' pubkey (32 bytes)
  wallet.toBuffer().copy(data, offset);
  offset += 32;

  // Write name (Anchor String format: 4-byte u32 LE length prefix + UTF-8 bytes)
  nameBuffer.copy(data, offset);
  offset += nameBuffer.length;

  // Write symbol (Anchor String format: 4-byte u32 LE length prefix + UTF-8 bytes)
  symbolBuffer.copy(data, offset);
  offset += symbolBuffer.length;

  // Write identity_data (Anchor String format: 4-byte u32 LE length prefix + UTF-8 bytes)
  identityDataBuffer.copy(data, offset);
  offset += identityDataBuffer.length;

  // Write metadata_uri (Anchor String format: 4-byte u32 LE length prefix + UTF-8 bytes)
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
    *
    * Parameters match Rust/IDL signature:
    * - new_identity: Pubkey (required)
    * - name: Option<String> (optional)
    * - symbol: Option<String> (optional)
    * - identity_data: Option<String> (optional)
    * - metadata_uri: Option<String> (optional)
    *
    * Data layout: discriminator(8) + wallet(32) + newIdentity(32) +
    *              name_option(1 + 4 + len) + symbol_option(1 + 4 + len) +
    *              identity_data_option(1 + 4 + len) + metadata_uri_option(1 + 4 + len)
    */
  export function buildIdentityUpdateInstruction(
  registryState: PublicKey,
  owner: PublicKey,
  wallet: PublicKey,
  newIdentity: PublicKey,
  name: string | null,
  symbol: string | null,
  identityData: string | null,
  metadataUri: string | null,
  programId: PublicKey
): InstructionResult {
  // Calculate data size: discriminator(8) + wallet(32) + newIdentity(32) + options
  function serializeOptionString(s: string | null): number {
    if (s === null || s === undefined) return 1; // None = 0x00
    // Some = 0x01 + u32 length (LE) + string bytes
    return 1 + 4 + Buffer.byteLength(s);
  }

  const nameSize = serializeOptionString(name);
  const symbolSize = serializeOptionString(symbol);
  const identityDataSize = serializeOptionString(identityData);
  const metadataUriSize = serializeOptionString(metadataUri);
  
  const data = Buffer.alloc(8 + 32 + 32 + nameSize + symbolSize + identityDataSize + metadataUriSize);
  let offset = 0;

  // Write discriminator (8 bytes)
  DISCRIMINATORS.identity_update_identity.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Write 'wallet' pubkey (32 bytes) - used for PDA derivation
  wallet.toBuffer().copy(data, offset);
  offset += 32;

  // Write 'newIdentity' pubkey (32 bytes)
  newIdentity.toBuffer().copy(data, offset);
  offset += 32;

  // Write 'name' option
  if (name === null || name === undefined) {
    data[offset++] = 0; // None
  } else {
    data[offset++] = 1; // Some
    const bytes = Buffer.from(name, 'utf8');
    data.writeUInt32LE(bytes.length, offset);
    offset += 4;
    bytes.copy(data, offset);
    offset += bytes.length;
  }

  // Write 'symbol' option
  if (symbol === null || symbol === undefined) {
    data[offset++] = 0; // None
  } else {
    data[offset++] = 1; // Some
    const bytes = Buffer.from(symbol, 'utf8');
    data.writeUInt32LE(bytes.length, offset);
    offset += 4;
    bytes.copy(data, offset);
    offset += bytes.length;
  }

  // Write 'identity_data' option
  if (identityData === null || identityData === undefined) {
    data[offset++] = 0; // None
  } else {
    data[offset++] = 1; // Some
    const bytes = Buffer.from(identityData, 'utf8');
    data.writeUInt32LE(bytes.length, offset);
    offset += 4;
    bytes.copy(data, offset);
    offset += bytes.length;
  }

  // Write 'metadata_uri' option
  if (metadataUri === null || metadataUri === undefined) {
    data[offset++] = 0; // None
  } else {
    data[offset++] = 1; // Some
    const bytes = Buffer.from(metadataUri, 'utf8');
    data.writeUInt32LE(bytes.length, offset);
    offset += 4;
    bytes.copy(data, offset);
    offset += bytes.length;
  }

  // Derive identity_account PDA: [b"identity", registry, wallet]
  const [identityAccountPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("identity"), registryState.toBuffer(), wallet.toBuffer()],
    programId
  );

  // Account order from UpdateIdentity struct: registry (read-only), identity_account (writable), owner
  return {
    keys: [
      { pubkey: registryState, isSigner: false, isWritable: false },
      { pubkey: identityAccountPda, isSigner: false, isWritable: true },
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
  programId: PublicKey
): InstructionResult {
  // remove_identity has no args (empty args array in IDL)
  const data = Buffer.alloc(8);
  let offset = 0;

  DISCRIMINATORS.identity_remove_identity.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  // Derive identity_account PDA: [b"identity", registry, wallet]
  const [identityAccountPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("identity"), registryState.toBuffer(), wallet.toBuffer()],
    programId
  );

  // Account order from RemoveIdentity struct: registry, identity_account, owner
  return {
    keys: [
      { pubkey: registryState, isSigner: false, isWritable: false },
      { pubkey: identityAccountPda, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  };
}

/**
 * Get Identity PDA
 * Derives the identity account PDA for a given wallet
 * Seeds: [b"identity", registry, wallet]
 */
export function getIdentityPda(
  registryState: PublicKey,
  wallet: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("identity"), registryState.toBuffer(), wallet.toBuffer()],
    programId
  );
  return pda;
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
