//! Event definitions for the identity registry program

pub mod registration;
pub mod update;
pub mod removal;
pub mod registration_with_data;

// Re-export for easy access
pub use registration::IdentityRegisteredEvent;
pub use update::IdentityUpdatedEvent;
pub use removal::IdentityRemovedEvent;
pub use registration_with_data::IdentityRegisteredWithDataEvent;
