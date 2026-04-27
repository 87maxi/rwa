use anchor_lang::prelude::*;
use crate::states::PdaInfo;

/// Derive the PDA for a token's compliance account (helper)
pub fn derive_compliance_pda(aggregator: Pubkey, token: Pubkey) -> PdaInfo {
    let seeds = &[b"compliance", aggregator.as_ref(), token.as_ref()];
    let (pda, bump) = Pubkey::find_program_address(seeds, &crate::id());

    PdaInfo {
        pda,
        bump,
    }
}

/// Derive the aggregator PDA
pub fn derive_aggregator_pda() -> (Pubkey, u8) {
    let seeds: &[&[u8]] = &[b"aggregator"];
    Pubkey::find_program_address(seeds, &crate::id())
}
