use anchor_lang::prelude::*;

/// TokenState is the main control account for the token program.
/// It is stored as a PDA with seeds [b"token", owner].
#[account(zero_copy)]
#[repr(C)]
pub struct TokenState {
    pub owner: Pubkey,              // 32
    pub freeze_authority: Pubkey,   // 32
    pub total_supply: u64,          // 8
    pub next_index: u64,            // 8
    pub name: [u8; 32],             // 32
    pub symbol: [u8; 10],           // 10
    pub decimals: u8,               // 1
    pub bump: u8,                   // 1
    pub _padding: [u8; 4],          // 4
} // Total: 128 bytes
