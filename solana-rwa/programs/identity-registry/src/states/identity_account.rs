use anchor_lang::prelude::*;

/// IdentityAccount stores a single identity record using a PDA.
///
/// Seeds: [b"identity", registry_pubkey, wallet_pubkey]
#[account]
#[derive(Default)]
pub struct IdentityAccount {
    pub wallet: Pubkey,           // The owner of this identity
    pub identity: Pubkey,         // The identity credential
    pub name: String,             // Human-readable name
    pub symbol: String,           // Short symbol
    pub identity_data: String,    // Additional identity data
    pub metadata_uri: String,     // URI to metadata
    pub bump: u8,                 // PDA bump
}
