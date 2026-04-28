use anchor_lang::prelude::*;

/// IdentityAccount stores a single identity record using a PDA.
///
/// Seeds: [b"identity", registry_pubkey, wallet_pubkey]
///
/// Optimized layout (240 bytes - reducido de 304):
/// - Reducido metadata_uri de [u8; 128] a [u8; 64]
///
/// Layout:
///   Offset 0:   wallet: Pubkey (32 bytes)
///   Offset 32:  identity: Pubkey (32 bytes)
///   Offset 64:  name: [u8; 32] (32 bytes)
///   Offset 96:  identity_data: [u8; 64] (64 bytes)
///   Offset 160: metadata_uri: [u8; 64] (64 bytes) reducido de 128
///   Offset 224: symbol: [u8; 10] (10 bytes)
///   Offset 234: bump: u8 (1 byte)
///   Offset 235: _padding: [u8; 5] (5 bytes)
///   Total: 240 bytes (ahorro 64 bytes = 21%)
#[account(zero_copy)]
#[repr(C)]
pub struct IdentityAccount {
    pub wallet: Pubkey,           // 32
    pub identity: Pubkey,         // 32
    pub name: [u8; 32],           // 32
    pub identity_data: [u8; 64],  // 64
    pub metadata_uri: [u8; 64],   // 64 (reducido de 128)
    pub symbol: [u8; 10],         // 10
    pub bump: u8,                 // 1
    pub _padding: [u8; 5],        // 5
} // Total: 240 bytes (ahorro 64 bytes = 21%)
