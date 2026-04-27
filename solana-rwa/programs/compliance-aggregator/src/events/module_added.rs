use anchor_lang::prelude::*;

/// Event emitted when a new compliance module is added
#[event]
pub struct ModuleAddedEvent {
    pub token: Pubkey,
    pub module: Pubkey,
    pub added_by: Pubkey,
}
