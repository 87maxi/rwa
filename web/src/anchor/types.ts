/**
 * Anchor IDL Types for Solana RWA Program
 *
 * Generated from IDL JSON files in @/anchor/idl/
 * These types serve as the source of truth for program interfaces.
 *
 * Fase 4 — Refactorización Frontend
 * Discriminadores ahora se importan desde discriminators.ts (single source of truth).
 */

import { PROGRAM_IDS } from '@/config/solana';

// ============================================================================
// PROGRAM ADDRESSES (re-exported from config/solana.ts — single source of truth)
// ============================================================================

export const SOLANA_RWA_PROGRAM_ID = PROGRAM_IDS.localnet.solanaRwa;
export const IDENTITY_REGISTRY_PROGRAM_ID = PROGRAM_IDS.localnet.identityRegistry;
export const COMPLIANCE_AGGREGATOR_PROGRAM_ID = PROGRAM_IDS.localnet.complianceAggregator;

// ============================================================================
// DISCRIMINATORS (re-exported from discriminators.ts — single source of truth)
// ============================================================================

export {
  DISCRIMINATOR_MAP,
  ACCOUNT_DISCRIMINATORS,
  SOLANA_RWA_DISCRIMINATORS,
  COMPLIANCE_AGGREGATOR_DISCRIMINATORS,
  IDENTITY_REGISTRY_DISCRIMINATORS,
} from './discriminators';

// ============================================================================
// PDA SEEDS (from IDLs)
// ============================================================================

// Solana RWA PDA seeds
export const SOLANA_RWA_SEEDS = {
  // TokenState PDA: [b"token", owner]
  token: 'token' as const,
  // AgentAccount PDA: [b"agent", tokenState, agent]
  agent: 'agent' as const,
  // BalanceAccount PDA: [b"balance", tokenState, mint]
  balance: 'balance' as const,
  // FrozenAccount PDA: [b"frozen", tokenState, account]
  frozen: 'frozen' as const,
} as const;

// Identity Registry PDA seeds
export const IDENTITY_REGISTRY_SEEDS = {
  // IdentityRegistryState PDA: [b"registry"]
  registry: 'registry' as const,
} as const;

// Compliance Aggregator PDA seeds
export const COMPLIANCE_AGGREGATOR_SEEDS = {
  // ComplianceAggregatorState PDA: [b"aggregator"]
  aggregator: 'aggregator' as const,
  // TokenComplianceAccount PDA: [b"compliance", aggregator, token]
  compliance: 'compliance' as const,
} as const;

// ============================================================================
// TYPE DEFINITIONS (from IDL types)
// ============================================================================

/**
 * Solana RWA Token Program types
 */

/**
 * TokenState - Main token state account
 * Rust struct: owner, freeze_authority, name, symbol, decimals, total_supply, next_index, bump
 * Seeds: [b"token", owner]
 */
export interface TokenStateData {
  owner: string;           // Pubkey - Who created this token
  freezeAuthority: string; // Pubkey - Freeze authority
  name: string;            // String - Token name
  symbol: string;          // String - Token symbol
  decimals: number;        // u8 - Decimal places
  totalSupply: bigint;     // u64 - Total tokens minted
  nextIndex: bigint;       // u64 - Counter for future use
  bump: number;            // u8 - PDA bump for token
}

/**
 * BalanceEntry - Token balance record
 * Rust struct: wallet, balance, bump
 * Seeds: [b"balance", token_state, wallet]
 */
export interface BalanceEntryData {
  wallet: string;    // Pubkey - Wallet address
  balance: bigint;   // u64 - Balance in smallest units
  bump: number;      // u8 - PDA bump
}

/**
 * AgentAccount - Agent permission record
 * Rust struct: agent, bump
 * Seeds: [b"agent", token_state, agent]
 */
export interface AgentAccountData {
  agent: string;  // Pubkey - Agent wallet address
  bump: number;   // u8 - PDA bump
}

/**
 * FrozenAccount - Frozen account record
 * Rust struct: wallet, frozen, bump
 * Seeds: [b"frozen", token_state, wallet]
 */
export interface FrozenAccountData {
  wallet: string;  // Pubkey - Wallet address
  frozen: boolean; // bool - true = frozen, false = active
  bump: number;    // u8 - PDA bump
}

/**
 * SupplyInfo - Return type for get_supply_info
 * Rust struct: current_supply, max_supply, remaining_supply
 */
export interface SupplyInfoData {
  currentSupply: bigint;    // u64 - Current supply
  maxSupply: bigint;        // u64 - Max supply
  remainingSupply: bigint;  // u64 - Remaining supply
}

/**
 * Identity Registry Program types
 */

/**
 * IdentityRegistryState - Main registry state
 * Rust struct: owner, registry_bump
 * Seeds: [b"registry"]
 */
export interface IdentityRegistryStateData {
  owner: string;         // Pubkey - Who created this registry
  registryBump: number;  // u8 - PDA bump for registry
}

/**
 * IdentityAccount - Individual identity record
 * Rust struct: wallet, identity, name, symbol, identity_data, metadata_uri, bump
 * Seeds: [b"identity", registry_pubkey, wallet_pubkey]
 */
export interface IdentityAccountData {
  wallet: string;        // Pubkey - The owner of this identity
  identity: string;      // Pubkey - The identity credential
  name: string;          // String - Human-readable name
  symbol: string;        // String - Short symbol
  identityData: string;  // String - Additional identity data
  metadataUri: string;   // String - URI to metadata
  bump: number;          // u8 - PDA bump
}

/**
 * Compliance Aggregator Program types
 */

/**
 * ComplianceAggregatorState - Main aggregator state
 * Rust struct: owner, aggregator_bump
 * Seeds: [b"aggregator"]
 */
export interface ComplianceAggregatorStateData {
  owner: string;           // Pubkey - Who created this aggregator
  aggregatorBump: number;  // u8 - Bump for the aggregator PDA
}

/**
 * TokenComplianceAccount - Token-specific compliance settings
 * Rust struct: token, modules (Vec<Pubkey>), bump
 * Seeds: [b"compliance", aggregator_pubkey, token_pubkey]
 */
export interface TokenComplianceAccountData {
  token: string;       // Pubkey - Token program address
  modules: string[];   // [Pubkey; 10] - List of compliance module addresses
  moduleCount: number; // u8 - Current number of modules
  bump: number;        // u8 - PDA bump
}

/**
 * AggregatorState - Return type for get_state queries
 * Rust struct: owner, aggregator_bump
 */
export interface AggregatorStateData {
  owner: string;           // Pubkey - Owner of the aggregator
  aggregatorBump: number;  // u8 - Bump for the aggregator PDA
}

/**
 * IdentityInfo - Return type for identity queries
 * Fields: wallet, name, kyc_verified, aml_cleared
 */
export interface IdentityInfoData {
  wallet: string;
  name: string;
  kycVerified: boolean;
  amlCleared: boolean;
}

// ============================================================================
// INSTRUCTION ARGUMENT TYPES
// ============================================================================

/**
 * Initialize instruction arguments
 */
export interface InitializeArgs {
  name: string;
  symbol: string;
  decimals: number;
}

/**
 * Mint instruction arguments
 */
export interface MintArgs {
  agent: string;
  amount: bigint;
}

/**
 * Burn instruction arguments
 */
export interface BurnArgs {
  agent: string;
  amount: bigint;
}

/**
 * Transfer instruction arguments
 */
export interface TransferArgs {
  source: string;
  destination: string;
  amount: bigint;
}

/**
 * Freeze/Unfreeze instruction arguments
 */
export interface FreezeArgs {
  freezeTarget: string;
}

/**
 * Add/Remove Agent instruction arguments
 */
export interface AgentArgs {
  agent: string;
}

/**
 * Transfer Owner instruction arguments
 */
export interface TransferOwnerArgs {
  newOwner: string;
}

/**
 * Transfer Freeze Authority instruction arguments
 */
export interface TransferFreezeAuthorityArgs {
  newFreezeAuthority: string;
}

/**
 * Compliance Add Module instruction arguments
 */
export interface ComplianceAddModuleArgs {
  moduleName: string;
  weight: number;
  config: string;
}

/**
 * Compliance Rebalance instruction arguments
 */
export interface ComplianceRebalanceArgs {
  moduleIndices: number[];
  newWeights: number[];
}

/**
 * Compliance Add Module to Existing instruction arguments
 */
export interface ComplianceAddModuleToExistingArgs {
  module: string;
}

/**
 * Compliance Can Transfer instruction arguments
 */
export interface ComplianceCanTransferArgs {
  token: string;
  from: string;
  to: string;
  amount: bigint;
}

/**
 * Identity Register instruction arguments
 */
export interface IdentityRegisterArgs {
  wallet: string;
}

/**
 * Identity Register with Data instruction arguments
 */
export interface IdentityRegisterWithDataArgs {
  wallet: string;
  name: string;
  kycStatus: number;
  amlStatus: number;
  metadataUri: string;
}

/**
 * Identity Update instruction arguments
 */
export interface IdentityUpdateArgs {
  newIdentity: string; // Pubkey as string
  name?: string | null;
  symbol?: string | null;
  identityData?: string | null;
  metadataUri?: string | null;
}
