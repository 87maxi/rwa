//! Tests for PDA derivation functions

#[cfg(test)]
mod tests {
    use crate::pdas::*;
    use crate::id;
    use anchor_lang::prelude::*;

    #[test]
    fn test_aggregator_pda_derivation() {
        let (pda, bump) = derive_aggregator_pda();

        assert_ne!(pda, Pubkey::default());
        // bump es un valor válido retornado por find_program_address (1-255)
        assert!(bump > 0);
    }

    #[test]
    fn test_token_compliance_pda_derivation() {
        let aggregator = Pubkey::new_unique();
        let token = Pubkey::new_unique();
        let pda_info = derive_compliance_pda(aggregator, token);

        assert_ne!(pda_info.pda, Pubkey::default());
        assert!(pda_info.bump > 0);
    }

    #[test]
    fn test_token_compliance_pda_unique_for_different_tokens() {
        let aggregator = Pubkey::new_unique();
        let token1 = Pubkey::new_unique();
        let token2 = Pubkey::new_unique();

        let pda1 = derive_compliance_pda(aggregator, token1);
        let pda2 = derive_compliance_pda(aggregator, token2);

        assert_ne!(pda1.pda, pda2.pda);
    }

    #[test]
    fn test_token_compliance_pda_deterministic() {
        let aggregator = Pubkey::new_unique();
        let token = Pubkey::new_unique();

        let pda1 = derive_compliance_pda(aggregator, token);
        let pda2 = derive_compliance_pda(aggregator, token);

        assert_eq!(pda1.pda, pda2.pda);
        assert_eq!(pda1.bump, pda2.bump);
    }
}
