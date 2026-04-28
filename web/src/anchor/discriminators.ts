/**
 * Instruction Discriminators - Single Source of Truth
 *
 * All discriminators are derived from Anchor IDLs using sha256(instruction_name) first 8 bytes.
 * Anchor uses snake_case for instruction names.
 *
 * This file unifies the discriminator definitions between client.ts and types.ts
 * to avoid duplication and ensure consistency.
 */

// ============================================================================
// Solana RWA Token Program discriminators
// ============================================================================

export const SOLANA_RWA_DISCRIMINATORS = {
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
} as const;

// ============================================================================
// Compliance Aggregator Program discriminators
// ============================================================================

export const COMPLIANCE_AGGREGATOR_DISCRIMINATORS = {
  initialize: [175, 175, 109, 31, 13, 152, 155, 237] as number[],
  add_module: [81, 183, 101, 212, 17, 241, 122, 204] as number[],
  add_module_to_existing: [203, 126, 130, 90, 26, 18, 76, 11] as number[],
  can_transfer: [233, 153, 157, 96, 140, 58, 200, 137] as number[],
  get_module_count: [208, 166, 2, 246, 185, 112, 23, 15] as number[],
  get_modules: [134, 121, 45, 135, 3, 24, 47, 199] as number[],
  get_state: [45, 27, 40, 94, 135, 141, 130, 172] as number[],
  remove_module: [115, 146, 208, 15, 125, 73, 88, 161] as number[],
  rebalance_modules: [56, 55, 46, 23, 128, 216, 111, 201] as number[],
} as const;

// ============================================================================
// Identity Registry Program discriminators
// ============================================================================

export const IDENTITY_REGISTRY_DISCRIMINATORS = {
  initialize: [175, 175, 109, 31, 13, 152, 155, 237] as number[],
  register_identity: [164, 118, 227, 177, 47, 176, 187, 248] as number[],
  register_identity_with_data: [108, 188, 121, 153, 200, 193, 22, 7] as number[],
  remove_identity: [146, 93, 160, 7, 61, 138, 181, 113] as number[],
  update_identity: [130, 54, 88, 104, 222, 124, 238, 252] as number[],
} as const;

// ============================================================================
// Account Discriminators (from IDLs)
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
// Legacy unified map (for backward compatibility)
// ============================================================================

export const DISCRIMINATOR_MAP = {
  solanaRwa: SOLANA_RWA_DISCRIMINATORS,
  complianceAggregator: COMPLIANCE_AGGREGATOR_DISCRIMINATORS,
  identityRegistry: IDENTITY_REGISTRY_DISCRIMINATORS,
} as const;
