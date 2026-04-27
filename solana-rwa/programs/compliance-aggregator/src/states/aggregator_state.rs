use anchor_lang::prelude::*;

/// ComplianceAggregatorState is the control account for the compliance aggregator.
/// It is stored as a PDA with seeds [b"aggregator"].
#[account]
pub struct ComplianceAggregatorState {
    pub owner: Pubkey,          // Who created this aggregator
    pub aggregator_bump: u8,    // Bump for the aggregator PDA
}
