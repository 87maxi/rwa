//! Tests for on-chain data structures (states)

#[cfg(test)]
mod tests {
    use super::*;
    use crate::states::token_state::TokenState;
    use crate::states::balance::BalanceAccount;
    use crate::states::frozen::FrozenAccount;
    use crate::states::agent::AgentAccount;
    use crate::states::supply_info::SupplyInfo;
    use crate::MAX_SUPPLY;
    use anchor_lang::prelude::Pubkey;

    // =================================================================
    // TokenState Tests
    // =================================================================

    #[test]
    fn test_token_state_default_creation() {
        let dummy_pubkey = Pubkey::default();
        let state = TokenState {
            owner: dummy_pubkey,
            freeze_authority: dummy_pubkey,
            name: "Test Token".to_string(),
            symbol: "TT".to_string(),
            decimals: 9,
            total_supply: 0,
            next_index: 0,
            bump: 255,
        };

        assert_eq!(state.name, "Test Token");
        assert_eq!(state.symbol, "TT");
        assert_eq!(state.decimals, 9);
        assert_eq!(state.total_supply, 0);
        assert_eq!(state.bump, 255);
    }

    // =================================================================
    // BalanceAccount Tests
    // =================================================================

    #[test]
    fn test_balance_account_structure() {
        let wallet = Pubkey::new_unique();
        let balance_account = BalanceAccount {
            wallet,
            balance: 1000,
            bump: 1,
        };

        assert_eq!(balance_account.wallet, wallet);
        assert_eq!(balance_account.balance, 1000);
        assert_eq!(balance_account.bump, 1);
    }

    #[test]
    fn test_balance_account_zero_balance() {
        let wallet = Pubkey::new_unique();
        let balance_account = BalanceAccount {
            wallet,
            balance: 0,
            bump: 0,
        };

        assert_eq!(balance_account.balance, 0);
    }

    // =================================================================
    // FrozenAccount Tests
    // =================================================================

    #[test]
    fn test_frozen_account_frozen_status() {
        let wallet = Pubkey::new_unique();
        let frozen_account = FrozenAccount {
            wallet,
            frozen: true,
            bump: 2,
        };

        assert!(frozen_account.frozen);
    }

    #[test]
    fn test_frozen_account_active_status() {
        let wallet = Pubkey::new_unique();
        let frozen_account = FrozenAccount {
            wallet,
            frozen: false,
            bump: 3,
        };

        assert!(!frozen_account.frozen);
    }

    // =================================================================
    // AgentAccount Tests
    // =================================================================

    #[test]
    fn test_agent_account_structure() {
        let agent = Pubkey::new_unique();
        let agent_account = AgentAccount {
            agent,
            bump: 4,
        };

        assert_eq!(agent_account.agent, agent);
        assert_eq!(agent_account.bump, 4);
    }

    // =================================================================
    // SupplyInfo Tests
    // =================================================================

    #[test]
    fn test_supply_info_calculation() {
        let max_supply = MAX_SUPPLY;
        let current_supply = 1_000_000_000_000_000u64;

        let supply_info = SupplyInfo {
            current_supply,
            max_supply,
            remaining_supply: max_supply - current_supply,
        };

        assert_eq!(supply_info.current_supply, current_supply);
        assert_eq!(supply_info.max_supply, max_supply);
        assert_eq!(supply_info.remaining_supply, max_supply - current_supply);
    }

    #[test]
    fn test_supply_info_zero_supply() {
        let max_supply = MAX_SUPPLY;

        let supply_info = SupplyInfo {
            current_supply: 0,
            max_supply,
            remaining_supply: max_supply,
        };

        assert_eq!(supply_info.current_supply, 0);
        assert_eq!(supply_info.remaining_supply, max_supply);
    }

    #[test]
    fn test_supply_info_max_supply_value() {
        assert_eq!(MAX_SUPPLY, 1_000_000_000_000_000_000u64);
    }
}
