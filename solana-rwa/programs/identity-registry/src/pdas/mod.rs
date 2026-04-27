use anchor_lang::prelude::*;

/// Derive the PDA for IdentityRegistryState
pub fn derive_registry_pda() -> (Pubkey, u8) {
    let seeds: &[&[u8]] = &[b"registry"];
    Pubkey::find_program_address(seeds, &crate::id())
}

/// Derive the PDA for IdentityAccount
pub fn derive_identity_pda(registry: &Pubkey, wallet: &Pubkey) -> (Pubkey, u8) {
    let seeds = &[b"identity", registry.as_ref(), wallet.as_ref()];
    Pubkey::find_program_address(seeds, &crate::id())
}
