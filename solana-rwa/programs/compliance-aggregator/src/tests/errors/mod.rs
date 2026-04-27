//! Tests for error codes

#[cfg(test)]
mod tests {
    use crate::errors::ErrorCode;

    #[test]
    fn test_error_codes_all_defined() {
        let _token_not_registered = ErrorCode::TokenNotRegistered;
        let _unauthorized = ErrorCode::Unauthorized;
        let _duplicate_module = ErrorCode::DuplicateModule;
        let _wallet_not_kyc_verified = ErrorCode::WalletNotKYCVerified;
        let _balance_limit_exceeded = ErrorCode::BalanceLimitExceeded;
        let _max_holders_exceeded = ErrorCode::MaxHoldersExceeded;
        let _transfer_locked = ErrorCode::TransferLocked;
        let _zero_amount_not_allowed = ErrorCode::ZeroAmountNotAllowed;
        let _invalid_address = ErrorCode::InvalidAddress;
        let _transfer_amount_exceeded = ErrorCode::TransferAmountExceeded;
    }
}
