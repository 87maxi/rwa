//! Tests for event structures

#[cfg(test)]
mod tests {
    use crate::events::*;
    use anchor_lang::prelude::*;

    #[test]
    fn test_module_added_event() {
        let event = ModuleAddedEvent {
            token: Pubkey::new_unique(),
            module: Pubkey::new_unique(),
            added_by: Pubkey::new_unique(),
        };

        assert_ne!(event.token, Pubkey::default());
        assert_ne!(event.module, Pubkey::default());
    }

    #[test]
    fn test_module_removed_event() {
        let event = ModuleRemovedEvent {
            token: Pubkey::new_unique(),
            module: Pubkey::new_unique(),
            removed_by: Pubkey::new_unique(),
        };

        assert_ne!(event.token, Pubkey::default());
    }

    #[test]
    fn test_transfer_check_event() {
        let event = TransferCheckEvent {
            token: Pubkey::new_unique(),
            from: Pubkey::new_unique(),
            to: Pubkey::new_unique(),
            amount: 1000,
            allowed: true,
            reason: "All checks passed".to_string(),
        };

        assert!(event.allowed);
        assert_eq!(event.amount, 1000);
        assert_eq!(event.reason, "All checks passed");
    }
}
