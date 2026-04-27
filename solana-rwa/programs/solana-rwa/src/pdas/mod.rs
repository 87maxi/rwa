use anchor_lang::prelude::*;

/// Derive the PDA for a BalanceAccount
pub fn derive_balance_pda(token: &Pubkey, wallet: &Pubkey) -> (Pubkey, u8) {
    let seeds = &[b"balance", token.as_ref(), wallet.as_ref()];
    Pubkey::find_program_address(seeds, &crate::id())
}

/// Derive the PDA for a FrozenAccount
pub fn derive_frozen_pda(token: &Pubkey, wallet: &Pubkey) -> (Pubkey, u8) {
    let seeds = &[b"frozen", token.as_ref(), wallet.as_ref()];
    Pubkey::find_program_address(seeds, &crate::id())
}

/// Derive the PDA for an AgentAccount
pub fn derive_agent_pda(token: &Pubkey, agent: &Pubkey) -> (Pubkey, u8) {
    let seeds = &[b"agent", token.as_ref(), agent.as_ref()];
    Pubkey::find_program_address(seeds, &crate::id())
}

/// Derive the PDA for TokenState
pub fn derive_token_state_pda(owner: &Pubkey) -> (Pubkey, u8) {
    let seeds = &[b"token", owner.as_ref()];
    Pubkey::find_program_address(seeds, &crate::id())
}
