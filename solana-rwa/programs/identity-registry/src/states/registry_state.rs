use anchor_lang::prelude::*;

/// IdentityRegistryState is the control account for the identity registry.
/// It is stored as a PDA with seeds [b"registry"].
#[account]
#[derive(Default)]
pub struct IdentityRegistryState {
    pub owner: Pubkey,      // Who created this registry
    pub registry_bump: u8,  // Bump for the registry PDA
}
