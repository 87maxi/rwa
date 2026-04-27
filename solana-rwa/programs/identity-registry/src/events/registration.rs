use anchor_lang::prelude::*;

/// Event emitted when a new identity is registered
#[event]
pub struct IdentityRegisteredEvent {
    pub wallet: Pubkey,
    pub identity: Pubkey,
    pub registered_by: Pubkey,
}
