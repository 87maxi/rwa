use anchor_lang::prelude::*;

/// AggregatorState - returned by get_state query
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct AggregatorState {
    pub owner: Pubkey,              // Owner of the aggregator
    pub aggregator_bump: u8,        // Bump for the aggregator PDA
}

/// PdaInfo - returned by derive_compliance_pda query
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct PdaInfo {
    pub pda: Pubkey,
    pub bump: u8,
}
