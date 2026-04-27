//! Event definitions for the program

pub mod owner_transfer;
pub mod minting;
pub mod freezing;
pub mod agent_events;

// Re-export for easy access
pub use owner_transfer::OwnerTransferredEvent;
pub use minting::TokensMintedEvent;
pub use freezing::AccountFrozenEvent;
pub use freezing::AccountUnfrozenEvent;
pub use agent_events::AgentAddedEvent;
pub use agent_events::AgentRemovedEvent;

// Also export FreezeAuthorityTransferredEvent
use anchor_lang::prelude::*;

#[event]
pub struct FreezeAuthorityTransferredEvent {
    pub old_freeze_authority: Pubkey,
    pub new_freeze_authority: Pubkey,
    pub transferred_by: Pubkey,
}
