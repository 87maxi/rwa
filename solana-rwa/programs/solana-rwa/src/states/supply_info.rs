use anchor_lang::prelude::*;

/// SupplyInfo - returned by get_supply_info query
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SupplyInfo {
    pub current_supply: u64,
    pub max_supply: u64,
    pub remaining_supply: u64,
}
