use anchor_lang::prelude::*;

/// FrozenAccount stores the frozen status of a wallet account.
/// Seeds: [b"frozen", token_pubkey, wallet_pubkey]
#[account]
#[derive(Default)]
pub struct FrozenAccount {
    pub wallet: Pubkey,   // Wallet address
    pub frozen: bool,     // true = frozen, false = active
    pub bump: u8,         // PDA bump
}
