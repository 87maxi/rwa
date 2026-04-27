//! Tests for PDA derivation functions

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pdas::*;
    use anchor_lang::prelude::Pubkey;

    // =================================================================
    // PDA Derivation Tests
    // =================================================================

    #[test]
    fn test_pda_balance_derivation() {
        let token = Pubkey::new_unique();
        let wallet = Pubkey::new_unique();
        let (pda, _bump) = derive_balance_pda(&token, &wallet);

        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_pda_frozen_derivation() {
        let token = Pubkey::new_unique();
        let wallet = Pubkey::new_unique();
        let (pda, _bump) = derive_frozen_pda(&token, &wallet);

        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_pda_agent_derivation() {
        let token = Pubkey::new_unique();
        let agent = Pubkey::new_unique();
        let (pda, _bump) = derive_agent_pda(&token, &agent);

        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_pda_unique_for_different_wallets() {
        let token = Pubkey::new_unique();
        let wallet1 = Pubkey::new_unique();
        let wallet2 = Pubkey::new_unique();

        let pda1 = derive_balance_pda(&token, &wallet1).0;
        let pda2 = derive_balance_pda(&token, &wallet2).0;

        assert_ne!(pda1, pda2);
    }

    #[test]
    fn test_pda_deterministic() {
        let token = Pubkey::new_unique();
        let wallet = Pubkey::new_unique();

        let (pda1, _bump1) = derive_balance_pda(&token, &wallet);
        let (pda2, _bump2) = derive_balance_pda(&token, &wallet);

        assert_eq!(pda1, pda2);
        assert_eq!(_bump1, _bump2);
    }
}
