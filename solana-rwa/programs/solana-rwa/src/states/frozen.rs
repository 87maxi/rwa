use anchor_lang::prelude::*;

/// FrozenAccount stores the frozen status of a wallet account.
/// Seeds: [b"frozen", token_pubkey, wallet_pubkey]
#[account(zero_copy)]
#[repr(C)]
pub struct FrozenAccount {
    pub wallet: Pubkey,   // Wallet address
    pub frozen: u8,       // 1 = frozen, 0 = active (u8 for Pod compliance)
    pub bump: u8,         // PDA bump
    pub _padding: [u8; 6], // Padding for 8-byte alignment
}

pub const ACCOUNT_FROZEN: u8 = 1;
pub const ACCOUNT_ACTIVE: u8 = 0;
