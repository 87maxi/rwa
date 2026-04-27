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
        let mut modules = [Pubkey::default(); 10];
        let mod1 = Pubkey::new_unique();
        let mod2 = Pubkey::new_unique();
        modules[0] = mod1;
        modules[1] = mod2;
        
        let account = TokenComplianceAccount {
            token,
            modules,
            module_count: 2,
            bump: 5,
            _padding: [0; 6],
        };
 
        assert_eq!(account.token, token);
        assert_eq!(account.module_count, 2);
        assert_eq!(account.modules[0], mod1);
        assert_eq!(account.modules[1], mod2);
        assert_eq!(account.bump, 5);
    }

    #[test]
    fn test_token_compliance_account_empty_modules() {
        let account = TokenComplianceAccount {
            token: Pubkey::new_unique(),
            modules: [Pubkey::default(); 10],
            module_count: 0,
            bump: 1,
            _padding: [0; 6],
        };
 
        assert_eq!(account.module_count, 0);
    }

    #[test]
    fn test_token_compliance_account_single_module() {
        let token = Pubkey::new_unique();
        let module = Pubkey::new_unique();
        let mut modules = [Pubkey::default(); 10];
        modules[0] = module;
        
        let account = TokenComplianceAccount {
            token,
            modules,
            module_count: 1,
            bump: 2,
            _padding: [0; 6],
        };
 
        assert_eq!(account.module_count, 1);
        assert_eq!(account.modules[0], module);
    }
}
