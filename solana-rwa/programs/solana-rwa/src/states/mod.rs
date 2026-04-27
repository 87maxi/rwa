//! Data structures for on-chain storage

pub mod token_state;
pub mod balance;
pub mod frozen;
pub mod agent;
pub mod supply_info;

// Re-export for easy access
pub use token_state::TokenState;
pub use balance::BalanceAccount;
pub use frozen::{FrozenAccount, ACCOUNT_FROZEN, ACCOUNT_ACTIVE};
pub use agent::AgentAccount;
pub use supply_info::SupplyInfo;

pub fn copy_str_to_bytes<const N: usize>(src: &str, dst: &mut [u8; N]) {
    let bytes = src.as_bytes();
    let len = bytes.len().min(N);
    dst[..len].copy_from_slice(&bytes[..len]);
    for i in len..N {
        dst[i] = 0;
    }
}

pub fn bytes_to_str(bytes: &[u8]) -> &str {
    let len = bytes.iter().position(|&b| b == 0).unwrap_or(bytes.len());
    std::str::from_utf8(&bytes[..len]).unwrap_or("")
}
