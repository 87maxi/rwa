use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    /// Token is not registered in this aggregator
    #[msg("Token not registered")]
    TokenNotRegistered,

    /// Caller is not authorized to perform this action
    #[msg("Unauthorized")]
    Unauthorized,

    /// Module already exists for this token
    #[msg("Module already exists for this token")]
    DuplicateModule,

    /// Compliance check failed: wallet not KYC verified
    #[msg("Wallet not KYC verified")]
    WalletNotKYCVerified,

    /// Compliance check failed: balance exceeded
    #[msg("Balance limit exceeded")]
    BalanceLimitExceeded,

    /// Compliance check failed: max holders exceeded
    #[msg("Max holders exceeded")]
    MaxHoldersExceeded,

    /// Compliance check failed: transfer is locked
    #[msg("Transfer is locked")]
    TransferLocked,

    /// Compliance check failed: amount is zero
    #[msg("Zero amount transfer not allowed")]
    ZeroAmountNotAllowed,

    /// Compliance check failed: invalid addresses
    #[msg("Invalid address in transfer")]
    InvalidAddress,

    /// Compliance check failed: max transfer exceeded
    #[msg("Transfer amount exceeded")]
    TransferAmountExceeded,

    /// Module array is full - cannot add more modules
    #[msg("Module array is full")]
    ModuleArrayFull,
}
