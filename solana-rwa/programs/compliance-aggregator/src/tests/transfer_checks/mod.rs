//! Tests for transfer check scenarios

#[cfg(test)]
mod tests {
    use crate::events::TransferCheckEvent;
    use anchor_lang::prelude::*;

    #[test]
    fn test_transfer_check_allowed() {
        let event = TransferCheckEvent {
            token: Pubkey::new_unique(),
            from: Pubkey::new_unique(),
            to: Pubkey::new_unique(),
            amount: 100,
            allowed: true,
            reason: "KYC verified".to_string(),
        };

        assert!(event.allowed);
        assert_eq!(event.amount, 100);
    }

    #[test]
    fn test_transfer_check_not_allowed() {
        let event = TransferCheckEvent {
            token: Pubkey::new_unique(),
            from: Pubkey::new_unique(),
            to: Pubkey::new_unique(),
            amount: 0,
            allowed: false,
            reason: "Zero amount".to_string(),
        };

        assert!(!event.allowed);
        assert_eq!(event.amount, 0);
    }
}
