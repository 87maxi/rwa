use anchor_lang::prelude::*;

/// Event emitted when a transfer compliance check is performed
#[event]
pub struct TransferCheckEvent {
    pub token: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub allowed: bool,
    pub reason: String,
}
