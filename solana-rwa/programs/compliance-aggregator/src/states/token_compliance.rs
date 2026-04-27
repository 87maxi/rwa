use anchor_lang::prelude::*;

/// TokenComplianceAccount stores compliance modules for a specific token.
/// It is stored as a PDA with seeds: [b"compliance", aggregator_pubkey, token_pubkey]
#[account]
pub struct TokenComplianceAccount {
    pub token: Pubkey,              // Token program address
    pub modules: Vec<Pubkey>,       // List of compliance module addresses
    pub bump: u8,                   // PDA bump
}
