use anchor_lang::prelude::*;

/// Event emitted when an identity is removed
#[event]
pub struct IdentityRemovedEvent {
    pub wallet: Pubkey,
    pub removed_by: Pubkey,
    pub was_admin_override: bool,
}
