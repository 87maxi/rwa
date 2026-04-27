use anchor_lang::prelude::*;

/// TokenState is the main control account for the token program.
/// It is stored as a PDA with seeds [b"token", owner].
#[account]
#[derive(Default)]
pub struct TokenState {
    pub owner: Pubkey,              // Who created this token
    pub freeze_authority: Pubkey,   // Freeze authority
    pub name: String,               // Token name
    pub symbol: String,             // Token symbol
    pub decimals: u8,               // Decimal places
    pub total_supply: u64,          // Total tokens minted
    pub next_index: u64,            // Counter for future use
    pub bump: u8,                   // PDA bump for token
}
