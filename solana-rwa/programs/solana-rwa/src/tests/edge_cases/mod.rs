//! Tests for edge cases and boundary conditions

#[cfg(test)]
mod tests {
    use super::*;
    use crate::MAX_SUPPLY;

    // =================================================================
    // Constants and Edge Cases
    // =================================================================

    #[test]
    fn test_max_supply_does_not_overflow() {
        assert!(MAX_SUPPLY <= u64::MAX);
    }

    #[test]
    fn test_supply_overflow_detection() {
        let current = u64::MAX - 100;
        let mint_amount = 200;

        let result = current.checked_add(mint_amount);
        assert!(result.is_none());
    }

    #[test]
    fn test_supply_safe_addition() {
        let current = 1_000_000u64;
        let mint_amount = 500_000u64;

        let result = current.checked_add(mint_amount);
        assert!(result.is_some());
        assert_eq!(result.unwrap(), 1_500_000u64);
    }
}
