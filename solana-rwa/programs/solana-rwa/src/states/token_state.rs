use anchor_lang::prelude::*;

/// TokenState is the main control account for the token program.
/// It is stored as a PDA with seeds [b"token", owner, token_id].
///
/// Multi-token support: Each wallet can create multiple tokens differentiated
/// by a unique token_id (16 bytes). This allows a single wallet to manage
/// multiple independent RWA token instances.
///
/// Optimized layout (136 bytes):
/// - Added token_id: [u8; 16] for multi-token differentiation
/// - Removido next_index (no se usa en la lógica actual)
/// - Reducido symbol de [u8; 10] a [u8; 8]
///
/// Layout:
///   Offset 0:   owner: Pubkey (32 bytes)
///   Offset 32:  freeze_authority: Pubkey (32 bytes)
///   Offset 64:  total_supply: u64 (8 bytes)
///   Offset 72:  name: [u8; 32] (32 bytes)
///   Offset 104: symbol: [u8; 8] (8 bytes)
///   Offset 112: token_id: [u8; 16] (16 bytes) NEW
///   Offset 128: decimals: u8 (1 byte)
///   Offset 129: bump: u8 (1 byte)
///   Offset 130: _padding: [u8; 6] (6 bytes para alineamiento a 8)
///   Total: 136 bytes
#[account(zero_copy)]
#[repr(C)]
pub struct TokenState {
    pub owner: Pubkey,              // 32
    pub freeze_authority: Pubkey,   // 32
    pub total_supply: u64,          // 8
    pub name: [u8; 32],             // 32
    pub symbol: [u8; 8],            // 8 (reducido de 10)
    pub token_id: [u8; 16],         // 16 NEW - unique identifier per token
    pub decimals: u8,               // 1
    pub bump: u8,                   // 1
    pub _padding: [u8; 6],          // 6 (ajustado para múltiplo de 8)
} // Total: 136 bytes
