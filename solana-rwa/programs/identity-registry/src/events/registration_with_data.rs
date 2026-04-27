use anchor_lang::prelude::*;

/// Event emitted when a new identity is registered with string-based data (MEDIUM-01)
#[event]
pub struct IdentityRegisteredWithDataEvent {
    pub wallet: Pubkey,
    pub name: String,
    pub symbol: String,
    pub identity_data: String,
    pub metadata_uri: String,
    pub registered_by: Pubkey,
}
