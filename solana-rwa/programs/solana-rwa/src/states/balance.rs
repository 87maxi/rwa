use anchor_lang::prelude::*;

/// BalanceAccount stores a single wallet's token balance.
/// Seeds: [b"balance", token_pubkey, wallet_pubkey]
#[account]
#[derive(Default)]
pub struct BalanceAccount {
    pub wallet: Pubkey,   // Wallet address
    pub balance: u64,     // Balance in smallest units
    pub bump: u8,         // PDA bump
}
