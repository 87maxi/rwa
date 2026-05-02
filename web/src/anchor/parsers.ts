/**
 * Account Data Parsers
 *
 * Functions for parsing account data from Solana program accounts.
 * All parsers read raw buffer data and return typed objects.
 */

import { PublicKey } from '@solana/web3.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper to read a fixed-size byte array as a string (null-terminated or full).
 */
function readFixedString(data: Buffer, offset: number, length: number): string {
  const bytes = data.slice(offset, offset + length);
  const nullIdx = bytes.indexOf(0);
  return bytes.slice(0, nullIdx === -1 ? length : nullIdx).toString('utf-8');
}

/**
 * Helper to read an Anchor-serialized string from a buffer.
 * Returns the string value and total bytes consumed (4 byte length prefix + string bytes).
 */
export function readAnchorString(data: Buffer, offset: number): { value: string; bytesRead: number } {
  if (offset + 4 > data.length) {
    throw new Error(`Not enough data to read string length at offset ${offset}`);
  }
  const len = data.readUInt32LE(offset);
  const strStart = offset + 4;
  if (strStart + len > data.length) {
    throw new Error(`Not enough data to read string of length ${len} at offset ${strStart}`);
  }
  return {
    value: data.slice(strStart, strStart + len).toString('utf-8'),
    bytesRead: 4 + len,
  };
}

// ============================================================================
// Solana RWA Parsers
// ============================================================================

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
 * Parse TokenState from account data (zero_copy)
 *
 * IMPORTANT: Anchor adds an 8-byte discriminator at the start.
 * The actual TokenState struct starts at offset 8.
 *
 * ACCOUNT LAYOUT (144 bytes total):
 * - Offset 0-7:   Anchor discriminator (8 bytes)
 * - Offset 8-39:  owner: Pubkey (32 bytes)
 * - Offset 40-71: freeze_authority: Pubkey (32 bytes)
 * - Offset 72-79: total_supply: u64 (8 bytes)
 * - Offset 80-111: name: [u8; 32] (32 bytes)
 * - Offset 112-119: symbol: [u8; 8] (8 bytes)
 * - Offset 120-135: token_id: [u8; 16] (16 bytes)
 * - Offset 136: decimals: u8 (1 byte)
 * - Offset 137: bump: u8 (1 byte)
 * - Offset 138-143: _padding: [u8; 6] (6 bytes)
 *
 * STRUCT LAYOUT (136 bytes, starts at offset 8):
 * - owner(32), freeze_authority(32), total_supply(8),
 *   name(32), symbol(8), token_id(16), decimals(1), bump(1), padding(6)
 */
export function parseTokenState(data: Buffer): {
  owner: string;
  freezeAuthority: string;
  totalSupply: bigint;
  name: string;
  symbol: string;
  tokenId: string;
  decimals: number;
  bump: number;
} {
  // Anchor discriminator is 8 bytes, struct starts at offset 8
  const DISCRIMINATOR_SIZE = 8;
  
  if (data.length < 144) {
    throw new Error(`Invalid TokenState data length: expected 144, got ${data.length}`);
  }
  
  // Skip Anchor discriminator
  let offset = DISCRIMINATOR_SIZE;
  
  // owner: Pubkey (32 bytes) at offset 8
  const owner = new PublicKey(data.slice(offset, offset + 32)).toBase58();
  offset += 32; // offset = 40
  
  // freeze_authority: Pubkey (32 bytes) at offset 40
  const freezeAuthority = new PublicKey(data.slice(offset, offset + 32)).toBase58();
  offset += 32; // offset = 72
  
  // total_supply: u64 at offset 72
  const totalSupply = BigInt(data.readBigUInt64LE(offset));
  offset += 8; // offset = 80
  
  // name: [u8; 32] at offset 80
  const name = readFixedString(data, offset, 32);
  offset += 32; // offset = 112
  
  // symbol: [u8; 8] at offset 112
  const symbol = readFixedString(data, offset, 8);
  offset += 8; // offset = 120
  
  // token_id: [u8; 16] at offset 120
  const tokenIdBytes = data.slice(offset, offset + 16);
  const tokenId = Buffer.from(tokenIdBytes).toString('utf-8').trim();
  offset += 16; // offset = 136
  
  // decimals: u8 at offset 136
  const decimals = data[offset];
  offset += 1; // offset = 137
  
  // bump: u8 at offset 137
  const bump = data[offset];
  
  return {
    owner,
    freezeAuthority,
    totalSupply,
    name,
    symbol,
    tokenId,
    decimals,
    bump,
  };
}

/**
 * Parse BalanceAccount from account data (zero_copy)
 * Structure: wallet(32), balance(8), bump(1), padding(7) = 48 bytes
 */
export function parseBalanceAccount(data: Buffer): {
  wallet: string;
  balance: bigint;
  bump: number;
} {
  if (data.length < 48) {
    throw new Error('Invalid BalanceAccount data length');
  }
  return {
    wallet: new PublicKey(data.slice(0, 32)).toBase58(),
    balance: BigInt(data.readBigUInt64LE(32)),
    bump: data[40],
  };
}

/**
 * Parse FrozenAccount from account data (zero_copy)
 * Structure: wallet(32), frozen(1), bump(1), padding(6) = 40 bytes
 */
export function parseFrozenAccount(data: Buffer): {
  wallet: string;
  frozen: boolean;
  bump: number;
} {
  if (data.length < 40) {
    throw new Error('Invalid FrozenAccount data length');
  }
  return {
    wallet: new PublicKey(data.slice(0, 32)).toBase58(),
    frozen: data[32] === 1, // ACCOUNT_FROZEN = 1
    bump: data[33],
  };
}

// ============================================================================
// Compliance Aggregator Parsers
// ============================================================================

/**
 * Parse AggregatorState from account data
 * ComplianceAggregatorState (regular Account): owner (32) + bump (1)
 */
export function parseAggregatorState(data: Buffer): {
  owner: string;
  aggregatorBump: number;
} {
  if (data.length < 33) {
    throw new Error('Invalid AggregatorState data length');
  }

  return {
    owner: new PublicKey(data.slice(0, 32)).toBase58(),
    aggregatorBump: data[32],
  };
}

/**
 * Parse TokenComplianceAccount from account data (zero_copy)
 * Structure: token(32), modules(320), moduleCount(1), bump(1), padding(6) = 360 bytes
 */
export function parseTokenCompliance(data: Buffer): {
  token: string;
  modules: string[];
  moduleCount: number;
  bump: number;
} {
  if (data.length < 360) {
    throw new Error('Invalid TokenCompliance data length');
  }
  let offset = 0;
  const token = new PublicKey(data.slice(offset, offset + 32)).toBase58();
  offset += 32;

  const moduleCount = data[offset + 320];
  const modules: string[] = [];
  for (let i = 0; i < moduleCount; i++) {
    modules.push(new PublicKey(data.slice(offset + (i * 32), offset + (i * 32) + 32)).toBase58());
  }
  offset += 320;
  offset += 1; // moduleCount
  const bump = data[offset];

  return {
    token,
    modules,
    moduleCount,
    bump,
  };
}

// ============================================================================
// Identity Registry Parsers
// ============================================================================

/**
 * Parse IdentityAccount from account data (zero_copy)
 * Structure: wallet(32), identity(32), name(32), data(64), uri(128), symbol(10), bump(1), padding(5) = 304 bytes
 */
export function parseIdentityInfo(data: Buffer): {
  wallet: string;
  identity: string;
  name: string;
  symbol: string;
  identityData: string;
  metadataUri: string;
  bump: number;
} {
  if (data.length < 304) {
    throw new Error(`Invalid IdentityAccount data length: expected 304, got ${data.length}`);
  }

  let offset = 0;
  const wallet = new PublicKey(data.slice(offset, offset + 32)).toBase58();
  offset += 32;
  const identity = new PublicKey(data.slice(offset, offset + 32)).toBase58();
  offset += 32;
  const name = readFixedString(data, offset, 32);
  offset += 32;
  const identityData = readFixedString(data, offset, 64);
  offset += 64;
  const metadataUri = readFixedString(data, offset, 128);
  offset += 128;
  const symbol = readFixedString(data, offset, 10);
  offset += 10;
  const bump = data[offset];

  return {
    wallet,
    identity,
    name,
    symbol,
    identityData,
    metadataUri,
    bump,
  };
}
