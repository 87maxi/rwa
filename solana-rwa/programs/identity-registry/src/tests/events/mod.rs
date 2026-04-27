//! Tests for event structures

#[cfg(test)]
mod tests {
    use super::*;
    use crate::events::*;
    use anchor_lang::prelude::Pubkey;

    // =================================================================
    // Event Structure Tests
    // =================================================================

    #[test]
    fn test_identity_registered_event() {
        let wallet = Pubkey::new_unique();
        let identity = Pubkey::new_unique();
        let registered_by = Pubkey::new_unique();

        let event = IdentityRegisteredEvent {
            wallet,
            identity,
            registered_by,
        };

        assert_eq!(event.wallet, wallet);
        assert_eq!(event.identity, identity);
        assert_eq!(event.registered_by, registered_by);
    }

    #[test]
    fn test_identity_updated_event() {
        let wallet = Pubkey::new_unique();
        let new_identity = Pubkey::new_unique();
        let updated_by = Pubkey::new_unique();

        let event = IdentityUpdatedEvent {
            wallet,
            new_identity,
            updated_by,
            is_admin_override: true,
        };

        assert_eq!(event.wallet, wallet);
        assert!(event.is_admin_override);
    }

    #[test]
    fn test_identity_removed_event() {
        let wallet = Pubkey::new_unique();
        let removed_by = Pubkey::new_unique();

        let event = IdentityRemovedEvent {
            wallet,
            removed_by,
            was_admin_override: false,
        };

        assert_eq!(event.wallet, wallet);
        assert!(!event.was_admin_override);
    }

    #[test]
    fn test_identity_registered_with_data_event() {
        let event = IdentityRegisteredWithDataEvent {
            wallet: Pubkey::new_unique(),
            name: "Identity".to_string(),
            symbol: "ID".to_string(),
            identity_data: "data".to_string(),
            metadata_uri: "https://example.com".to_string(),
            registered_by: Pubkey::new_unique(),
        };

        assert_eq!(event.name, "Identity");
        assert_eq!(event.symbol, "ID");
    }
}
