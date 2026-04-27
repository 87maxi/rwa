use anchor_lang::prelude::*;

/// Event emitted when a compliance module is removed
#[event]
pub struct ModuleRemovedEvent {
    pub token: Pubkey,
    pub module: Pubkey,
    pub removed_by: Pubkey,
}
