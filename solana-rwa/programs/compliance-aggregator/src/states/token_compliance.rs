use anchor_lang::prelude::*;

/// TokenComplianceAccount stores compliance modules for a specific token.
/// It is stored as a PDA with seeds: [b"compliance", aggregator_pubkey, token_pubkey]
#[account(zero_copy)]
#[repr(C)]
pub struct TokenComplianceAccount {
    pub token: Pubkey,              // Token program address (32)
    pub modules: [Pubkey; 10],      // List of compliance module addresses (320)
    pub module_count: u8,           // Current number of modules (1)
    pub bump: u8,                   // PDA bump (1)
    pub _padding: [u8; 6],          // Padding for 8-byte alignment (6)
} // Total: 360 bytes (8-byte aligned)
