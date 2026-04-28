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
 * Structure: owner(32), authority(32), supply(8), index(8), name(32), symbol(10), decimals(1), bump(1), padding(4) = 128 bytes
 */
export function parseTokenState(data: Buffer): {
  owner: string;
  freezeAuthority: string;
  totalSupply: bigint;
  nextIndex: bigint;
  name: string;
  symbol: string;
  decimals: number;
  bump: number;
} {
  if (data.length < 128) {
    throw new Error(`Invalid TokenState data length: expected 128, got ${data.length}`);
  }

  let offset = 0;
  const owner = new PublicKey(data.slice(offset, offset + 32)).toBase58();
  offset += 32;
  const freezeAuthority = new PublicKey(data.slice(offset, offset + 32)).toBase58();
  offset += 32;
  const totalSupply = BigInt(data.readBigUInt64LE(offset));
  offset += 8;
  const nextIndex = BigInt(data.readBigUInt64LE(offset));
  offset += 8;
  const name = readFixedString(data, offset, 32);
  offset += 32;
  const symbol = readFixedString(data, offset, 10);
  offset += 10;
  const decimals = data[offset];
  offset += 1;
  const bump = data[offset];

  return {
    owner,
    freezeAuthority,
    totalSupply,
    nextIndex,
    name,
    symbol,
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
