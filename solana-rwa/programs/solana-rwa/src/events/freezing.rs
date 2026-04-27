use anchor_lang::prelude::*;

#[event]
pub struct AccountFrozenEvent {
    pub account: Pubkey,
    pub frozen_by: Pubkey,
}

#[event]
pub struct AccountUnfrozenEvent {
    pub account: Pubkey,
    pub unfrozen_by: Pubkey,
}
