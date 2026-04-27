use anchor_lang::prelude::*;

#[event]
pub struct OwnerTransferredEvent {
    pub old_owner: Pubkey,
    pub new_owner: Pubkey,
    pub transferred_by: Pubkey,
}
