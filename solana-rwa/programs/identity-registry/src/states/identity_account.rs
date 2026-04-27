use anchor_lang::prelude::*;

/// IdentityAccount stores a single identity record using a PDA.
///
/// Seeds: [b"identity", registry_pubkey, wallet_pubkey]
#[account(zero_copy)]
#[repr(C)]
pub struct IdentityAccount {
    pub wallet: Pubkey,           // 32
    pub identity: Pubkey,         // 32
    pub name: [u8; 32],           // 32
    pub identity_data: [u8; 64],  // 64
    pub metadata_uri: [u8; 128], // 128
    pub symbol: [u8; 10],         // 10
    pub bump: u8,                 // 1
    pub _padding: [u8; 5],        // 5
} // Total: 304 bytes (8-byte aligned)
