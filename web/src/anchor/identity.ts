/**
 * Identity Registry Program - Instruction Builders
 *
 * All instruction builders for the identity-registry program.
 */

import { PublicKey, SystemProgram } from '@solana/web3.js';
import { IDENTITY_REGISTRY_DISCRIMINATORS } from './discriminators';
import type { InstructionResult } from './solana-rwa';

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
 * Build identity registry initialize instruction
 */
export function buildIdentityInitializeInstruction(
  registryState: PublicKey,
  payer: PublicKey,
  _programId: PublicKey
): InstructionResult {
  const data = Buffer.alloc(8);
  let offset = 0;

  IDENTITY_REGISTRY_DISCRIMINATORS.initialize.forEach((b, i) => {
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
  const data = Buffer.alloc(72);
  let offset = 0;

  IDENTITY_REGISTRY_DISCRIMINATORS.register_identity.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  wallet.toBuffer().copy(data, offset);
  offset += 32;

  identity.toBuffer().copy(data, offset);

  const [identityAccountPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("identity"), registryState.toBuffer(), owner.toBuffer()],
    programId
  );

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
  const nameBuffer = serializeAnchorString(name);
  const symbolBuffer = serializeAnchorString(symbol);
  const identityDataBuffer = serializeAnchorString(identityData);
  const metadataUriBuffer = serializeAnchorString(metadataUri);

  const dataLength = 8 + 32 + nameBuffer.length + symbolBuffer.length + identityDataBuffer.length + metadataUriBuffer.length;
  const data = Buffer.alloc(dataLength);

  let offset = 0;

  IDENTITY_REGISTRY_DISCRIMINATORS.register_identity_with_data.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  wallet.toBuffer().copy(data, offset);
  offset += 32;

  nameBuffer.copy(data, offset);
  offset += nameBuffer.length;

  symbolBuffer.copy(data, offset);
  offset += symbolBuffer.length;

  identityDataBuffer.copy(data, offset);
  offset += identityDataBuffer.length;

  metadataUriBuffer.copy(data, offset);

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
  name: string | null,
  symbol: string | null,
  identityData: string | null,
  metadataUri: string | null,
  programId: PublicKey
): InstructionResult {
  function serializeOptionString(s: string | null): number {
    if (s === null || s === undefined) return 1;
    return 1 + 4 + Buffer.byteLength(s);
  }

  const nameSize = serializeOptionString(name);
  const symbolSize = serializeOptionString(symbol);
  const identityDataSize = serializeOptionString(identityData);
  const metadataUriSize = serializeOptionString(metadataUri);

  const data = Buffer.alloc(8 + 32 + 32 + nameSize + symbolSize + identityDataSize + metadataUriSize);
  let offset = 0;

  IDENTITY_REGISTRY_DISCRIMINATORS.update_identity.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  wallet.toBuffer().copy(data, offset);
  offset += 32;

  newIdentity.toBuffer().copy(data, offset);
  offset += 32;

  // Write 'name' option
  if (name === null || name === undefined) {
    data[offset++] = 0;
  } else {
    data[offset++] = 1;
    const bytes = Buffer.from(name, 'utf8');
    data.writeUInt32LE(bytes.length, offset);
    offset += 4;
    bytes.copy(data, offset);
    offset += bytes.length;
  }

  // Write 'symbol' option
  if (symbol === null || symbol === undefined) {
    data[offset++] = 0;
  } else {
    data[offset++] = 1;
    const bytes = Buffer.from(symbol, 'utf8');
    data.writeUInt32LE(bytes.length, offset);
    offset += 4;
    bytes.copy(data, offset);
    offset += bytes.length;
  }

  // Write 'identity_data' option
  if (identityData === null || identityData === undefined) {
    data[offset++] = 0;
  } else {
    data[offset++] = 1;
    const bytes = Buffer.from(identityData, 'utf8');
    data.writeUInt32LE(bytes.length, offset);
    offset += 4;
    bytes.copy(data, offset);
    offset += bytes.length;
  }

  // Write 'metadata_uri' option
  if (metadataUri === null || metadataUri === undefined) {
    data[offset++] = 0;
  } else {
    data[offset++] = 1;
    const bytes = Buffer.from(metadataUri, 'utf8');
    data.writeUInt32LE(bytes.length, offset);
    offset += 4;
    bytes.copy(data, offset);
    offset += bytes.length;
  }

  const [identityAccountPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("identity"), registryState.toBuffer(), wallet.toBuffer()],
    programId
  );

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
  const data = Buffer.alloc(8);
  let offset = 0;

  IDENTITY_REGISTRY_DISCRIMINATORS.remove_identity.forEach((b, i) => {
    data[offset + i] = b;
  });
  offset += 8;

  const [identityAccountPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("identity"), registryState.toBuffer(), wallet.toBuffer()],
    programId
  );

  return {
    keys: [
      { pubkey: registryState, isSigner: false, isWritable: false },
      { pubkey: identityAccountPda, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  };
}
