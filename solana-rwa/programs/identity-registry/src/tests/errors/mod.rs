//! Tests for error codes

#[cfg(test)]
mod tests {
    use super::*;
    use crate::errors::ErrorCode;

    // =================================================================
    // Error Code Tests
    // =================================================================

    #[test]
    fn test_error_codes_all_defined() {
        let _wallet_already_registered = ErrorCode::WalletAlreadyRegistered;
        let _wallet_not_registered = ErrorCode::WalletNotRegistered;
        let _not_identity_owner = ErrorCode::NotIdentityOwner;
        let _string_too_long = ErrorCode::StringTooLong;
        let _wallet_mismatch = ErrorCode::WalletMismatch;
    }
}
