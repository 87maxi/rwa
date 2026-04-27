use anchor_lang::prelude::*;

/// BalanceAccount stores a single wallet's token balance.
/// Seeds: [b"balance", token_pubkey, wallet_pubkey]
#[account(zero_copy)]
#[repr(C)]
pub struct BalanceAccount {
    pub wallet: Pubkey,   // Wallet address
    pub balance: u64,     // Balance in smallest units
    pub bump: u8,         // PDA bump
    pub _padding: [u8; 7], // Padding for 8-byte alignment
}
