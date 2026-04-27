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
        let _unauthorized = ErrorCode::Unauthorized;
        let _insufficient_balance = ErrorCode::InsufficientBalance;
        let _account_frozen = ErrorCode::AccountFrozen;
        let _duplicate_agent = ErrorCode::DuplicateAgent;
        let _invalid_amount = ErrorCode::InvalidAmount;
        let _supply_exceeded = ErrorCode::SupplyExceeded;
        let _supply_overflow = ErrorCode::SupplyOverflow;
        let _same_owner = ErrorCode::SameOwner;
        let _not_freeze_authority = ErrorCode::NotFreezeAuthority;
        let _same_freeze_authority = ErrorCode::SameFreezeAuthority;
        let _invalid_string = ErrorCode::InvalidString;
    }
}
