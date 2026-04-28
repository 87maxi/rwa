use anchor_lang::prelude::*;

/// TokenComplianceAccount stores compliance modules for a specific token.
/// It is stored as a PDA with seeds: [b"compliance", aggregator_pubkey, token_pubkey]
///
/// Optimized layout (200 bytes - reducido de 360):
/// - Reducido modules de [Pubkey; 10] a [Pubkey; 5]
///
/// Layout:
///   Offset 0:   token: Pubkey (32 bytes)
///   Offset 32:  modules: [Pubkey; 5] (160 bytes)
///   Offset 192: module_count: u8 (1 byte)
///   Offset 193: bump: u8 (1 byte)
///   Offset 194: _padding: [u8; 6] (6 bytes)
///   Total: 200 bytes (ahorro 160 bytes = 44%)
#[account(zero_copy)]
#[repr(C)]
pub struct TokenComplianceAccount {
    pub token: Pubkey,              // Token program address (32)
    pub modules: [Pubkey; 5],       // List of compliance module addresses (160) reducido de 10
    pub module_count: u8,           // Current number of modules (1)
    pub bump: u8,                   // PDA bump (1)
    pub _padding: [u8; 6],          // Padding for 8-byte alignment (6)
} // Total: 200 bytes (ahorro 160 bytes = 44%)
