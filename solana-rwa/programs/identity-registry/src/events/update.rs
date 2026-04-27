use anchor_lang::prelude::*;

/// Event emitted when an identity is updated
#[event]
pub struct IdentityUpdatedEvent {
    pub wallet: Pubkey,
    pub new_identity: Pubkey,
    pub updated_by: Pubkey,
    pub is_admin_override: bool,
}
