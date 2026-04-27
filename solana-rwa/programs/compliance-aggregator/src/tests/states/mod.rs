//! Tests for on-chain data structures (states)

#[cfg(test)]
mod tests {
    use crate::states::*;
    use anchor_lang::prelude::*;

    #[test]
    fn test_compliance_aggregator_state_structure() {
        let state = ComplianceAggregatorState {
            owner: Pubkey::new_unique(),
            aggregator_bump: 3,
        };

        assert_ne!(state.owner, Pubkey::default());
        assert_eq!(state.aggregator_bump, 3);
    }

    #[test]
    fn test_compliance_aggregator_state_default_owner() {
        let state = ComplianceAggregatorState {
            owner: Pubkey::default(),
            aggregator_bump: 0,
        };

        assert_eq!(state.owner, Pubkey::default());
    }

    #[test]
    fn test_token_compliance_account_structure() {
        let token = Pubkey::new_unique();
        let modules = vec![Pubkey::new_unique(), Pubkey::new_unique()];
        let account = TokenComplianceAccount {
            token,
            modules,
            bump: 5,
        };

        assert_eq!(account.token, token);
        assert_eq!(account.modules.len(), 2);
        assert_eq!(account.bump, 5);
    }

    #[test]
    fn test_token_compliance_account_empty_modules() {
        let account = TokenComplianceAccount {
            token: Pubkey::new_unique(),
            modules: vec![],
            bump: 1,
        };

        assert_eq!(account.modules.len(), 0);
    }

    #[test]
    fn test_token_compliance_account_single_module() {
        let token = Pubkey::new_unique();
        let module = Pubkey::new_unique();
        let account = TokenComplianceAccount {
            token,
            modules: vec![module],
            bump: 2,
        };

        assert_eq!(account.modules.len(), 1);
        assert_eq!(account.modules[0], module);
    }
}
