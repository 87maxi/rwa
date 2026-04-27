use anchor_lang::prelude::*;

/// AgentAccount stores an authorized agent.
/// Seeds: [b"agent", token_pubkey, agent_pubkey]
#[account(zero_copy)]
#[repr(C)]
pub struct AgentAccount {
    pub agent: Pubkey,    // Agent wallet address
    pub bump: u8,         // PDA bump
    pub _padding: [u8; 7], // Padding for 8-byte alignment
}
