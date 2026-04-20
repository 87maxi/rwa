use anchor_lang::prelude::*;

// Program IDs for cross-program calls
pub const IDENTITY_REGISTRY_PROGRAM_ID: &str = "9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n5";
pub const COMPLIANCE_AGGREGATOR_PROGRAM_ID: &str = "8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o7";

pub fn get_identity_registry_program_id() -> Pubkey {
    Pubkey::from_str(IDENTITY_REGISTRY_PROGRAM_ID).unwrap()
}

pub fn get_compliance_aggregator_program_id() -> Pubkey {
    Pubkey::from_str(COMPLIANCE_AGGREGATOR_PROGRAM_ID).unwrap()
}