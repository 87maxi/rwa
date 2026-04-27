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
    fn test_registry_pda_derivation() {
        let (pda, _bump) = derive_registry_pda();

        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_identity_pda_derivation() {
        let registry = Pubkey::new_unique();
        let wallet = Pubkey::new_unique();
        let (pda, _bump) = derive_identity_pda(&registry, &wallet);

        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_identity_pda_unique_for_different_wallets() {
        let registry = Pubkey::new_unique();
        let wallet1 = Pubkey::new_unique();
        let wallet2 = Pubkey::new_unique();

        let pda1 = derive_identity_pda(&registry, &wallet1).0;
        let pda2 = derive_identity_pda(&registry, &wallet2).0;

        assert_ne!(pda1, pda2);
    }

    #[test]
    fn test_identity_pda_deterministic() {
        let registry = Pubkey::new_unique();
        let wallet = Pubkey::new_unique();

        let (pda1, _bump1) = derive_identity_pda(&registry, &wallet);
        let (pda2, _bump2) = derive_identity_pda(&registry, &wallet);

        assert_eq!(pda1, pda2);
        assert_eq!(_bump1, _bump2);
    }
}
