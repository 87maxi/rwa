use anchor_lang::prelude::*;

#[event]
pub struct TokensMintedEvent {
    pub to: Pubkey,
    pub amount: u64,
    pub total_supply: u64,
    pub minted_by: Pubkey,
}
