/**
 * Anchor IDL Types for Solana RWA Program
 *
 * Generated from IDL JSON files in @/anchor/idl/
 * These types serve as the source of truth for program interfaces.
 */

// ============================================================================
// PROGRAM ADDRESSES (from IDLs)
// ============================================================================

export const SOLANA_RWA_PROGRAM_ID = '2XuB3ngjvJkMTxB82eM9NszBUGNovjuJUs4mzdez7EEX';
export const IDENTITY_REGISTRY_PROGRAM_ID = '5SeHm9i7CcgHqF9UBYBtGbzqf3F3FWFETQF8AxfU2Rce';
export const COMPLIANCE_AGGREGATOR_PROGRAM_ID = '7cURjJvyf3oe6JsuVxS9EiVHKNauiFj7Gao3THzZSnpb';

// ============================================================================
// INSTRUCTION DISCRIMINATORS (from IDLs)
// ============================================================================

export const DISCRIMINATOR_MAP = {
  // Solana RWA Token Program instructions
  solanaRwa: {
    initialize: [175, 175, 109, 31, 13, 152, 155, 237] as number[],
    mint: [51, 57, 225, 47, 182, 146, 137, 166] as number[],
    burn: [116, 110, 29, 56, 107, 219, 42, 93] as number[],
    transfer: [163, 52, 200, 231, 140, 3, 69, 186] as number[],
    freeze_account: [253, 75, 82, 133, 167, 238, 43, 130] as number[],
    unfreeze_account: [28, 255, 156, 206, 139, 228, 5, 213] as number[],
    add_agent: [214, 206, 14, 110, 178, 131, 218, 45] as number[],
    remove_agent: [126, 25, 90, 199, 104, 237, 225, 130] as number[],
    transfer_owner: [245, 25, 221, 175, 106, 229, 225, 45] as number[],
    transfer_freeze_authority: [235, 44, 91, 221, 224, 5, 187, 172] as number[],
    get_supply_info: [195, 15, 219, 198, 89, 216, 184, 95] as number[],
  },
  // Compliance Aggregator instructions
  complianceAggregator: {
    initialize: [175, 175, 109, 31, 13, 152, 155, 237] as number[],
    add_module: [81, 183, 101, 212, 17, 241, 122, 204] as number[],
    add_module_to_existing: [203, 126, 130, 90, 26, 18, 76, 11] as number[],
    can_transfer: [233, 153, 157, 96, 140, 58, 200, 137] as number[],
    get_module_count: [208, 166, 2, 246, 185, 112, 23, 15] as number[],
    get_modules: [134, 121, 45, 135, 3, 24, 47, 199] as number[],
    get_state: [45, 27, 40, 94, 135, 141, 130, 172] as number[],
    remove_module: [115, 146, 208, 15, 125, 73, 88, 161] as number[],
    rebalance_modules: [56, 55, 46, 23, 128, 216, 111, 201] as number[],
  },
  // Identity Registry instructions
  identityRegistry: {
    initialize: [175, 175, 109, 31, 13, 152, 155, 237] as number[],
    register_identity: [164, 118, 227, 177, 47, 176, 187, 248] as number[],
    register_identity_with_data: [108, 188, 121, 153, 200, 193, 22, 7] as number[],
    remove_identity: [146, 93, 160, 7, 61, 138, 181, 113] as number[],
    update_identity: [130, 54, 88, 104, 222, 124, 238, 252] as number[],
  },
} as const;

// ============================================================================
// ACCOUNT DISCRIMINATORS (from IDLs)
// ============================================================================

export const ACCOUNT_DISCRIMINATORS = {
  // Solana RWA Token Program accounts
  solanaRwa: {
    TokenState: [218, 112, 6, 149, 55, 186, 168, 163] as number[],
    BalanceAccount: [44, 165, 195, 3, 17, 107, 110, 188] as number[],
    AgentAccount: [241, 119, 69, 140, 233, 9, 112, 50] as number[],
    FrozenAccount: [158, 228, 34, 188, 28, 83, 228, 244] as number[],
  },
  // Identity Registry accounts
  identityRegistry: {
    IdentityRegistryState: [50, 240, 176, 174, 121, 45, 186, 90] as number[],
    IdentityAccount: [194, 90, 181, 160, 182, 206, 116, 158] as number[],
  },
  // Compliance Aggregator accounts
  complianceAggregator: {
    ComplianceAggregatorState: [150, 198, 94, 35, 222, 80, 225, 150] as number[],
    TokenComplianceAccount: [47, 104, 232, 130, 84, 184, 101, 97] as number[],
  },
} as const;

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
 * Fields: owner, identity_count, identities
 */
export interface IdentityRegistryStateData {
  owner: string;
  identityCount: number;
  identities: string[];
}

/**
 * IdentityAccount - Individual identity record
 * Fields: wallet, name, kyc_status, aml_status, created_at, updated_at
 */
export interface IdentityAccountData {
  wallet: string;
  name: string;
  kycStatus: number;
  amlStatus: number;
  createdAt: bigint;
  updatedAt: bigint;
}

/**
 * Compliance Aggregator Program types
 */

/**
 * ComplianceAggregatorState - Main aggregator state
 * Fields: owner, module_count, modules
 */
export interface ComplianceAggregatorStateData {
  owner: string;
  moduleCount: number;
  modules: string[];
}

/**
 * TokenComplianceAccount - Token-specific compliance settings
 * Fields: token, aggregator, weights, limits, rules
 */
export interface TokenComplianceAccountData {
  token: string;
  aggregator: string;
  weights: number[];
  limits: Record<string, bigint>;
  rules: string[];
}

/**
 * AggregatorState - Return type for compliance state queries
 * Fields: total_modules, active_modules, compliance_score
 */
export interface AggregatorStateData {
  totalModules: number;
  activeModules: number;
  complianceScore: number;
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
