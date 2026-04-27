//! Tests for on-chain data structures (states)

#[cfg(test)]
mod tests {
    use super::*;
    use crate::states::registry_state::IdentityRegistryState;
    use crate::states::identity_account::IdentityAccount;
    use anchor_lang::prelude::Pubkey;

    // =================================================================
    // IdentityRegistryState Tests
    // =================================================================

    #[test]
    fn test_identity_registry_state_structure() {
        let state = IdentityRegistryState {
            owner: Pubkey::new_unique(),
            registry_bump: 5,
        };

        assert_ne!(state.owner, Pubkey::default());
        assert_eq!(state.registry_bump, 5);
    }

    #[test]
    fn test_identity_registry_state_default_owner() {
        let state = IdentityRegistryState {
            owner: Pubkey::default(),
            registry_bump: 0,
        };

        assert_eq!(state.owner, Pubkey::default());
    }

    // =================================================================
    // IdentityAccount Tests
    // =================================================================

    #[test]
    fn test_identity_account_structure() {
        let wallet = Pubkey::new_unique();
        let identity = Pubkey::new_unique();
        let account = IdentityAccount {
            wallet,
            identity,
            name: "KYC".to_string(),
            symbol: "K".to_string(),
            identity_data: "verified".to_string(),
            metadata_uri: "https://example.com/metadata".to_string(),
            bump: 7,
        };

        assert_eq!(account.wallet, wallet);
        assert_eq!(account.identity, identity);
        assert_eq!(account.name, "KYC");
        assert_eq!(account.symbol, "K");
        assert_eq!(account.bump, 7);
    }

    #[test]
    fn test_identity_account_empty_strings() {
        let account = IdentityAccount {
            wallet: Pubkey::new_unique(),
            identity: Pubkey::new_unique(),
            name: "".to_string(),
            symbol: "".to_string(),
            identity_data: "".to_string(),
            metadata_uri: "".to_string(),
            bump: 1,
        };

        assert_eq!(account.name.len(), 0);
        assert_eq!(account.symbol.len(), 0);
    }
}
