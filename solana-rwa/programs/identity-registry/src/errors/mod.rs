use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    /// Wallet already registered
    #[msg("Wallet already registered")]
    WalletAlreadyRegistered,

    /// Wallet not registered
    #[msg("Wallet not registered")]
    WalletNotRegistered,

    /// Caller is not the identity owner or registry admin
    #[msg("Caller is not the identity owner or registry admin")]
    NotIdentityOwner,

    /// String length exceeds maximum allowed
    #[msg("String length exceeds maximum allowed")]
    StringTooLong,

    /// Wallet mismatch
    #[msg("Wallet does not match owner")]
    WalletMismatch,
}
