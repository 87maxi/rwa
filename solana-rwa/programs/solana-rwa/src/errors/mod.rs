use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Insufficient balance")]
    InsufficientBalance,

    #[msg("Account frozen")]
    AccountFrozen,

    #[msg("Agent already exists")]
    DuplicateAgent,

    #[msg("Invalid amount: amount must be greater than zero")]
    InvalidAmount,

    #[msg("Supply exceeded maximum cap")]
    SupplyExceeded,

    #[msg("Supply overflow")]
    SupplyOverflow,

    #[msg("New owner cannot be the same as current owner")]
    SameOwner,

    #[msg("Caller is not the freeze authority")]
    NotFreezeAuthority,

    #[msg("New freeze authority cannot be the same as current")]
    SameFreezeAuthority,

    #[msg("Invalid string length")]
    InvalidString,
}
