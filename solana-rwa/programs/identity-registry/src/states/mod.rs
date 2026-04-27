//! Data structures for on-chain storage

pub mod registry_state;
pub mod identity_account;

// Re-export for easy access
pub use registry_state::IdentityRegistryState;
pub use identity_account::IdentityAccount;
