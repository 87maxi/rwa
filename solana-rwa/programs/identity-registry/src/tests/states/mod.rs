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
        let mut account = IdentityAccount {
            wallet,
            identity,
            name: [0; 32],
            symbol: [0; 10],
            identity_data: [0; 64],
            metadata_uri: [0; 64],
            bump: 7,
            _padding: [0; 5],
        };
        crate::states::copy_str_to_bytes("KYC", &mut account.name);
        crate::states::copy_str_to_bytes("K", &mut account.symbol);
        crate::states::copy_str_to_bytes("verified", &mut account.identity_data);
        crate::states::copy_str_to_bytes("https://example.com/metadata", &mut account.metadata_uri);

        assert_eq!(account.wallet, wallet);
        assert_eq!(account.identity, identity);
        assert_eq!(crate::states::bytes_to_str(&account.name), "KYC");
        assert_eq!(crate::states::bytes_to_str(&account.symbol), "K");
        assert_eq!(account.bump, 7);
    }

    #[test]
    fn test_identity_account_empty_strings() {
        let account = IdentityAccount {
            wallet: Pubkey::new_unique(),
            identity: Pubkey::new_unique(),
            name: [0; 32],
            symbol: [0; 10],
            identity_data: [0; 64],
            metadata_uri: [0; 64],
            bump: 1,
            _padding: [0; 5],
        };

        assert_eq!(crate::states::bytes_to_str(&account.name).len(), 0);
        assert_eq!(crate::states::bytes_to_str(&account.symbol).len(), 0);
    }
}
