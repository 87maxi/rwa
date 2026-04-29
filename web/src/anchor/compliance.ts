/**
 * Compliance Aggregator Program - Instruction Builders
 *
 * All instruction builders for the compliance-aggregator program.
 */

import { PublicKey, SystemProgram } from '@solana/web3.js';
import { COMPLIANCE_AGGREGATOR_DISCRIMINATORS } from './discriminators';
import type { InstructionResult } from './solana-rwa';

// ============================================================================
// Instruction Builders
// ============================================================================

/**
 * Build compliance aggregator initialize instruction
 */
export function buildComplianceInitializeInstruction(
  aggregatorState: PublicKey,
  payer: PublicKey,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(8);
  let offset = 0;

  COMPLIANCE_AGGREGATOR_DISCRIMINATORS.initialize.forEach((b, i) => {
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
  const data = Buffer.alloc(72);
  let offset = 0;

  COMPLIANCE_AGGREGATOR_DISCRIMINATORS.add_module.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  token.toBuffer().copy(data, offset);
  offset += 32;

  module.toBuffer().copy(data, offset);

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
 * Accounts: aggregator_state, owner, token_compliance, token_compliance_token, system_program
 */
export function buildComplianceRemoveModuleInstruction(
  aggregatorState: PublicKey,
  owner: PublicKey,
  tokenCompliance: PublicKey,
  tokenComplianceToken: PublicKey,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(8);
  let offset = 0;

  COMPLIANCE_AGGREGATOR_DISCRIMINATORS.remove_module.forEach((b, i) => {
    data[offset + i] = b;
  });

  return {
    keys: [
      { pubkey: aggregatorState, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: tokenCompliance, isSigner: false, isWritable: true },
      { pubkey: tokenComplianceToken, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
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
  const data = Buffer.alloc(8);
  let offset = 0;

  COMPLIANCE_AGGREGATOR_DISCRIMINATORS.rebalance_modules.forEach((b, i) => {
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
  const data = Buffer.alloc(40);
  let offset = 0;

  COMPLIANCE_AGGREGATOR_DISCRIMINATORS.get_state.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

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
  const data = Buffer.alloc(40);
  let offset = 0;

  COMPLIANCE_AGGREGATOR_DISCRIMINATORS.add_module_to_existing.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  module.toBuffer().copy(data, offset);

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
  const data = Buffer.alloc(8);
  let offset = 0;

  COMPLIANCE_AGGREGATOR_DISCRIMINATORS.get_modules.forEach((b, i) => {
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
  const data = Buffer.alloc(8);
  let offset = 0;

  COMPLIANCE_AGGREGATOR_DISCRIMINATORS.get_module_count.forEach((b, i) => {
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
  const data = Buffer.alloc(200);
  let offset = 0;

  COMPLIANCE_AGGREGATOR_DISCRIMINATORS.can_transfer.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  token.toBuffer().copy(data, offset);
  offset += 32;

  from.toBuffer().copy(data, offset);
  offset += 32;

  to.toBuffer().copy(data, offset);
  offset += 32;

  data.writeBigUInt64LE(amount, offset);
  offset += 8;

  senderKyc.toBuffer().copy(data, offset);
  offset += 32;

  recipientKyc.toBuffer().copy(data, offset);
  offset += 32;

  data.writeBigUInt64LE(senderBalance, offset);
  offset += 8;

  data.writeBigUInt64LE(recipientBalance, offset);
  offset += 8;

  data.writeBigUInt64LE(totalHolders, offset);

  return {
    keys: [
      { pubkey: aggregatorState, isSigner: false, isWritable: false },
      { pubkey: token, isSigner: false, isWritable: false },
      { pubkey: token, isSigner: false, isWritable: false },
    ],
    data,
  };
}
