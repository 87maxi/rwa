use anchor_lang::prelude::*;

#[event]
pub struct AgentAddedEvent {
    pub token: Pubkey,
    pub agent: Pubkey,
    pub added_by: Pubkey,
}

#[event]
pub struct AgentRemovedEvent {
    pub token: Pubkey,
    pub agent: Pubkey,
    pub removed_by: Pubkey,
}
