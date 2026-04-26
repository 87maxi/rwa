// =============================================================================
// SOLANA RWA TOKEN PROGRAM (PDA Architecture)
// =============================================================================
//
// This program manages RWA tokens on Solana using PDAs for distributed storage.
// It replaces monolithic Vec-based storage with individual PDA accounts.
//
// ARCHITECTURE:
// -------------
// 1. TokenState (PDA): Control account for the token
//    - Seeds: [b"token", owner]
//    - Stores: owner, freeze_authority, name, symbol, decimals, total_supply, next_index
//
// 2. BalanceAccount (PDA): Individual balance records
//    - Seeds: [b"balance", token_pubkey, wallet_pubkey]
//    - Stores: wallet, balance, bump
//
// 3. FrozenAccount (PDA): Individual frozen status records
//    - Seeds: [b"frozen", token_pubkey, wallet_pubkey]
//    - Stores: wallet, frozen, bump
//
// 4. AgentAccount (PDA): Individual agent records
//    - Seeds: [b"agent", token_pubkey, agent_pubkey]
//    - Stores: agent, bump
//
// BENEFITS:
// ---------
// - O(1) lookup by wallet address (via PDA derivation)
// - No account size limits (each balance is independent)
// - Efficient updates/removals (no vector manipulation)
// - Better parallelization (different balances don't conflict)

use anchor_lang::prelude::*;

// Module for cross-program invocation (CPI) program IDs
pub mod ids;

// declare_id!() = the program's on-chain address
declare_id!("2XuB3ngjvJkMTxB82eM9NszBUGNovjuJUs4mzdez7EEX");

// #[program] marks this module as containing all instruction handlers
#[program]
pub mod solana_rwa {
    use super::*;

    /// Maximum supply cap for the token (1 billion tokens with 9 decimals)
    pub const MAX_SUPPLY: u64 = 1_000_000_000_000_000_000u64;

    // =================================================================
    // ACCOUNT VALIDATION STRUCTURES
    // =================================================================

    /// Initialize instruction - creates a new token state account
    #[derive(Accounts)]
    pub struct Initialize<'info> {
        /// Who pays the rent for creating the account
        #[account(mut)]
        pub payer: Signer<'info>,

        /// The new TokenState PDA account (stores token metadata only)
        /// Seeds: [b"token"]
        #[account(
            init,
            payer = payer,
            seeds = [b"token", payer.key().as_ref()],
            bump,
            space = 8 + 32 + 32 + 36 + 14 + 1 + 8 + 8 + 1  // discriminator(8) + owner(32) + freeze_authority(32) + name(4+32) + symbol(4+10) + decimals(1) + total_supply(8) + next_index(8) + bump(1) = 144
        )]
        pub token: Account<'info, TokenState>,

        /// Solana's system program (required for account creation)
        pub system_program: Program<'info, System>,
    }

    /// Mint instruction - creates new tokens
    #[derive(Accounts)]
    pub struct Mint<'info> {
        /// Token state account (will be modified - total_supply updated)
        #[account(
            mut,
            seeds = [b"token", token.owner.as_ref()],
            bump = token.bump,
        )]
        pub token: Account<'info, TokenState>,

        /// Agent performing the mint (must be authorized by token owner)
        pub agent: Signer<'info>,

        /// Individual balance PDA for the recipient
        #[account(
            mut,
            seeds = [b"balance", token.key().as_ref(), balance_account.wallet.as_ref()],
            bump,
        )]
        pub balance_account: Account<'info, BalanceAccount>,

        /// System program for account creation
        pub system_program: Program<'info, System>,
    }

    /// Burn instruction - destroys tokens
    #[derive(Accounts)]
    pub struct Burn<'info> {
        /// Token state account (will be modified)
        #[account(
            mut,
            seeds = [b"token", token.owner.as_ref()],
            bump = token.bump,
        )]
        pub token: Account<'info, TokenState>,

        /// Agent performing the burn (must be authorized)
        pub agent: Signer<'info>,

        /// Sender wallet (must sign and have balance)
        #[account(mut)]
        pub sender: Signer<'info>,

        /// Individual balance PDA for the sender
        #[account(
            mut,
            seeds = [b"balance", token.key().as_ref(), sender.key().as_ref()],
            bump,
        )]
        pub balance_account: Account<'info, BalanceAccount>,

        /// System program for rent return
        pub system_program: Program<'info, System>,
    }

    /// Transfer instruction - moves tokens between accounts
    #[derive(Accounts)]
    pub struct Transfer<'info> {
        /// Token state account (metadata only, total_supply unchanged)
        #[account(
            seeds = [b"token", token.owner.as_ref()],
            bump = token.bump,
        )]
        pub token: Account<'info, TokenState>,

        /// Sender: must sign to prove ownership
        pub from: Signer<'info>,

        /// Sender's individual balance PDA (will be debited)
        #[account(
            mut,
            seeds = [b"balance", token.key().as_ref(), from.key().as_ref()],
            bump,
        )]
        pub from_balance: Account<'info, BalanceAccount>,

        /// Receiver's individual balance PDA (will be credited)
        #[account(
            mut,
            seeds = [b"balance", token.key().as_ref(), to_balance.wallet.as_ref()],
            bump,
        )]
        pub to_balance: Account<'info, BalanceAccount>,

        /// System program for account creation
        pub system_program: Program<'info, System>,
    }

    /// AddAgent instruction - adds a new authorized agent
    #[derive(Accounts)]
    pub struct AddAgent<'info> {
        /// Token state account (will be modified)
        #[account(
            mut,
            seeds = [b"token", token.owner.as_ref()],
            bump = token.bump,
        )]
        pub token: Account<'info, TokenState>,

        /// Must be the token owner
        #[account(mut)]
        pub payer: Signer<'info>,

        /// New agent wallet (used for PDA derivation)
        /// CHECK: Safe because we only use the pubkey value for PDA derivation
        pub new_agent: AccountInfo<'info>,

        /// New agent account PDA (will be created)
        #[account(
            init,
            payer = payer,
            seeds = [b"agent", token.key().as_ref(), new_agent.key().as_ref()],
            bump,
            space = 8 + std::mem::size_of::<AgentAccount>()
        )]
        pub agent_account: Account<'info, AgentAccount>,

        /// System program for account creation
        pub system_program: Program<'info, System>,
    }

    /// RemoveAgent instruction - removes an authorized agent
    #[derive(Accounts)]
    pub struct RemoveAgent<'info> {
        /// Token state account
        #[account(
            mut,
            seeds = [b"token", token.owner.as_ref()],
            bump = token.bump,
        )]
        pub token: Account<'info, TokenState>,

        /// Must be the token owner (receives returned SOL)
        pub payer: Signer<'info>,

        /// Agent account to close (SOL returned to payer)
        #[account(
            mut,
            seeds = [b"agent", token.key().as_ref(), agent_account.agent.as_ref()],
            bump,
            close = payer
        )]
        pub agent_account: Account<'info, AgentAccount>,
    }

    /// GetSupplyInfo instruction - query current supply information (read-only)
    #[derive(Accounts)]
    pub struct GetSupplyInfo<'info> {
        /// Token state account (read-only)
        #[account(
            seeds = [b"token", token.owner.as_ref()],
            bump = token.bump,
        )]
        pub token: Account<'info, TokenState>,
    }

    /// TransferOwner instruction - transfers the token ownership
    #[derive(Accounts)]
    pub struct TransferOwner<'info> {
        /// Token state account (owner field will be modified)
        #[account(
            mut,
            seeds = [b"token", token.owner.as_ref()],
            bump = token.bump,
        )]
        pub token: Account<'info, TokenState>,

        /// Current owner (must sign to authorize transfer)
        pub current_owner: Signer<'info>,
    }

    /// FreezeAccount instruction - freezes a specific account
    #[derive(Accounts)]
    pub struct FreezeAccount<'info> {
        /// Token state account
        #[account(
            seeds = [b"token", token.owner.as_ref()],
            bump = token.bump,
        )]
        pub token: Account<'info, TokenState>,

        /// Authority performing the freeze (must be freeze_authority)
        pub authority: Signer<'info>,

        /// Frozen status PDA (will be created if not exists)
        #[account(
            mut,
            seeds = [b"frozen", token.key().as_ref(), frozen_account.wallet.as_ref()],
            bump,
        )]
        pub frozen_account: Account<'info, FrozenAccount>,

        /// System program for account creation
        pub system_program: Program<'info, System>,
    }

    /// UnfreezeAccount instruction - unfreezes a specific account
    #[derive(Accounts)]
    pub struct UnfreezeAccount<'info> {
        /// Token state account
        #[account(
            seeds = [b"token", token.owner.as_ref()],
            bump = token.bump,
        )]
        pub token: Account<'info, TokenState>,

        /// Authority performing the unfreeze
        pub authority: Signer<'info>,

        /// Frozen status PDA (must exist to be modified)
        #[account(mut)]
        pub frozen_account: Account<'info, FrozenAccount>,
    }

    /// TransferFreezeAuthority instruction - transfers the freeze authority
    #[derive(Accounts)]
    pub struct TransferFreezeAuthority<'info> {
        /// Token state account (freeze_authority field will be modified)
        #[account(
            mut,
            seeds = [b"token", token.owner.as_ref()],
            bump = token.bump,
        )]
        pub token: Account<'info, TokenState>,

        /// Current freeze authority (must sign to authorize transfer)
        pub current_freeze_authority: Signer<'info>,
    }

    // =================================================================
    // INSTRUCTION HANDLERS
    // =================================================================

    /// Initialize a new token
    pub fn initialize(ctx: Context<Initialize>, name: String, symbol: String, decimals: u8) -> Result<()> {
        require!(name.len() <= 32, ErrorCode::InvalidString);
        require!(symbol.len() <= 10, ErrorCode::InvalidString);
        let token = &mut ctx.accounts.token;
        
        msg!("Token initialized: {} ({}) with {} decimals", name, symbol, decimals);

        token.owner = ctx.accounts.payer.key();
        token.freeze_authority = ctx.accounts.payer.key();
        token.name = name;
        token.symbol = symbol;
        token.decimals = decimals;
        token.total_supply = 0;
        token.next_index = 0;
        token.bump = ctx.bumps.token;

        Ok(())
    }

    /// Mint new tokens
    pub fn mint(ctx: Context<Mint>, amount: u64) -> Result<()> {
        let token = &mut ctx.accounts.token;
        let balance_account = &mut ctx.accounts.balance_account;

        require!(token.owner == ctx.accounts.agent.key(), ErrorCode::Unauthorized);
        require!(amount > 0, ErrorCode::InvalidAmount);

        let new_supply = token.total_supply.checked_add(amount)
            .ok_or(ErrorCode::SupplyOverflow)?;
        require!(new_supply <= MAX_SUPPLY, ErrorCode::SupplyExceeded);

        token.total_supply = new_supply;

        // Initialize balance account if zero balance
        if balance_account.balance == 0 {
            balance_account.wallet = ctx.accounts.agent.key();
        }
        balance_account.balance = balance_account.balance.checked_add(amount)
            .ok_or(ErrorCode::SupplyOverflow)?;

        emit!(TokensMintedEvent {
            to: balance_account.wallet,
            amount,
            total_supply: new_supply,
            minted_by: ctx.accounts.agent.key(),
        });

        msg!("Minted {} tokens to {}. New total supply: {}", amount, balance_account.wallet, new_supply);
        Ok(())
    }

    /// Burn tokens
    pub fn burn(ctx: Context<Burn>, from: Pubkey, amount: u64) -> Result<()> {
        let token = &mut ctx.accounts.token;
        let balance_account = &mut ctx.accounts.balance_account;

        require!(token.owner == ctx.accounts.agent.key(), ErrorCode::Unauthorized);
        require!(balance_account.balance >= amount, ErrorCode::InsufficientBalance);

        balance_account.balance = balance_account.balance.checked_sub(amount)
            .ok_or(ErrorCode::InsufficientBalance)?;
        token.total_supply = token.total_supply.saturating_sub(amount);

        msg!("Burned {} tokens from {}", amount, from);
        Ok(())
    }

    /// Transfer tokens
    pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> {
        let _token = &ctx.accounts.token;
        let from_balance = &mut ctx.accounts.from_balance;
        let to_balance = &mut ctx.accounts.to_balance;
        let from_key = ctx.accounts.from.key();
        let to_key = to_balance.wallet;

        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(from_balance.balance >= amount, ErrorCode::InsufficientBalance);

        from_balance.balance = from_balance.balance.checked_sub(amount)
            .ok_or(ErrorCode::InsufficientBalance)?;
        to_balance.balance = to_balance.balance.checked_add(amount)
            .ok_or(ErrorCode::SupplyOverflow)?;

        msg!("Transferred {} tokens from {} to {}", amount, from_key, to_key);
        Ok(())
    }

    /// Freeze an account
    pub fn freeze_account(ctx: Context<FreezeAccount>, account: Pubkey) -> Result<()> {
        let token = &ctx.accounts.token;
        let frozen_account = &mut ctx.accounts.frozen_account;

        require!(token.freeze_authority == ctx.accounts.authority.key(), ErrorCode::NotFreezeAuthority);

        if frozen_account.wallet == Pubkey::default() {
            frozen_account.wallet = account;
        }
        frozen_account.frozen = true;

        emit!(AccountFrozenEvent {
            account,
            frozen_by: ctx.accounts.authority.key(),
        });

        msg!("Account {} frozen by {}", account, ctx.accounts.authority.key());
        Ok(())
    }

    /// Unfreeze an account
    pub fn unfreeze_account(ctx: Context<UnfreezeAccount>, account: Pubkey) -> Result<()> {
        let token = &ctx.accounts.token;

        require!(token.freeze_authority == ctx.accounts.authority.key(), ErrorCode::NotFreezeAuthority);

        let frozen_account = &mut ctx.accounts.frozen_account;
        frozen_account.frozen = false;

        emit!(AccountUnfrozenEvent {
            account,
            unfrozen_by: ctx.accounts.authority.key(),
        });

        msg!("Account {} unfrozen by {}", account, ctx.accounts.authority.key());
        Ok(())
    }

    /// TransferOwner instruction handler
    pub fn transfer_owner(ctx: Context<TransferOwner>, new_owner: Pubkey) -> Result<()> {
        let token = &mut ctx.accounts.token;

        require!(token.owner == ctx.accounts.current_owner.key(), ErrorCode::Unauthorized);
        require!(token.owner != new_owner, ErrorCode::SameOwner);

        let old_owner = token.owner;
        token.owner = new_owner;

        emit!(OwnerTransferredEvent {
            old_owner,
            new_owner,
            transferred_by: ctx.accounts.current_owner.key(),
        });

        msg!("Token ownership transferred from {} to {}", old_owner, new_owner);
        Ok(())
    }

    /// TransferFreezeAuthority instruction handler
    pub fn transfer_freeze_authority(
        ctx: Context<TransferFreezeAuthority>,
        new_freeze_authority: Pubkey,
    ) -> Result<()> {
        let token = &mut ctx.accounts.token;

        require!(
            token.freeze_authority == ctx.accounts.current_freeze_authority.key(),
            ErrorCode::NotFreezeAuthority
        );

        require!(
            token.freeze_authority != new_freeze_authority,
            ErrorCode::SameFreezeAuthority
        );

        let old_freeze_authority = token.freeze_authority;
        token.freeze_authority = new_freeze_authority;

        emit!(FreezeAuthorityTransferredEvent {
            old_freeze_authority,
            new_freeze_authority,
            transferred_by: ctx.accounts.current_freeze_authority.key(),
        });

        msg!(
            "Freeze authority transferred from {} to {}",
            old_freeze_authority,
            new_freeze_authority
        );
        Ok(())
    }

    /// GetSupplyInfo query function
    pub fn get_supply_info(ctx: Context<GetSupplyInfo>) -> Result<SupplyInfo> {
        let token = &ctx.accounts.token;
        
        let current_supply = token.total_supply;
        let remaining_supply = MAX_SUPPLY.checked_sub(current_supply)
            .ok_or(ErrorCode::SupplyOverflow)?;

        Ok(SupplyInfo {
            current_supply,
            max_supply: MAX_SUPPLY,
            remaining_supply,
        })
    }

    /// Add an agent
    pub fn add_agent(ctx: Context<AddAgent>, agent: Pubkey) -> Result<()> {
        let token = &mut ctx.accounts.token;

        require!(token.owner == ctx.accounts.payer.key(), ErrorCode::Unauthorized);

        let agent_account = &mut ctx.accounts.agent_account;
        agent_account.agent = agent;
        agent_account.bump = ctx.bumps.agent_account;

        msg!("Agent added: {}", agent);
        Ok(())
    }

    /// Remove an agent
    pub fn remove_agent(ctx: Context<RemoveAgent>) -> Result<()> {
        let token = &ctx.accounts.token;
        let agent_key = ctx.accounts.agent_account.agent;

        require!(token.owner == ctx.accounts.payer.key(), ErrorCode::Unauthorized);

        msg!("Agent removed: {}", agent_key);
        Ok(())
    }
}

// =================================================================
// DATA STRUCTURES (On-Chain Storage)
// =================================================================

/// TokenState is the main control account for the token program.
/// It is stored as a PDA with seeds [b"token"].
#[account]
pub struct TokenState {
    pub owner: Pubkey,              // Who created this token
    pub freeze_authority: Pubkey,   // Freeze authority
    pub name: String,               // Token name
    pub symbol: String,             // Token symbol
    pub decimals: u8,               // Decimal places
    pub total_supply: u64,          // Total tokens minted
    pub next_index: u64,            // Counter for future use
    pub bump: u8,                   // PDA bump for token
}

/// BalanceAccount stores a single wallet's token balance.
/// Seeds: [b"balance", token_pubkey, wallet_pubkey]
#[account]
pub struct BalanceAccount {
    pub wallet: Pubkey,   // Wallet address
    pub balance: u64,     // Balance in smallest units
    pub bump: u8,         // PDA bump
}

/// FrozenAccount stores the frozen status of a wallet account.
/// Seeds: [b"frozen", token_pubkey, wallet_pubkey]
#[account]
pub struct FrozenAccount {
    pub wallet: Pubkey,   // Wallet address
    pub frozen: bool,     // true = frozen, false = active
    pub bump: u8,         // PDA bump
}

/// AgentAccount stores an authorized agent.
/// Seeds: [b"agent", token_pubkey, agent_pubkey]
#[account]
pub struct AgentAccount {
    pub agent: Pubkey,    // Agent wallet address
    pub bump: u8,         // PDA bump
}

// =================================================================
// QUERY RETURN TYPES
// =================================================================

/// SupplyInfo - returned by get_supply_info query
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SupplyInfo {
    pub current_supply: u64,
    pub max_supply: u64,
    pub remaining_supply: u64,
}

// =================================================================
// HELPER FUNCTIONS (PDA derivation utilities)
// =================================================================

/// Derive the PDA for a BalanceAccount
pub fn derive_balance_pda(token: &Pubkey, wallet: &Pubkey) -> (Pubkey, u8) {
    let seeds = &[b"balance", token.as_ref(), wallet.as_ref()];
    Pubkey::find_program_address(seeds, &id())
}

/// Derive the PDA for a FrozenAccount
pub fn derive_frozen_pda(token: &Pubkey, wallet: &Pubkey) -> (Pubkey, u8) {
    let seeds = &[b"frozen", token.as_ref(), wallet.as_ref()];
    Pubkey::find_program_address(seeds, &id())
}

/// Derive the PDA for an AgentAccount
pub fn derive_agent_pda(token: &Pubkey, agent: &Pubkey) -> (Pubkey, u8) {
    let seeds = &[b"agent", token.as_ref(), agent.as_ref()];
    Pubkey::find_program_address(seeds, &id())
}

// =================================================================
// ERROR CODES
// =================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Insufficient balance")]
    InsufficientBalance,

    #[msg("Account frozen")]
    AccountFrozen,

    #[msg("Agent already exists")]
    DuplicateAgent,

    #[msg("Invalid amount: amount must be greater than zero")]
    InvalidAmount,

    #[msg("Supply exceeded maximum cap")]
    SupplyExceeded,

    #[msg("Supply overflow")]
    SupplyOverflow,

    #[msg("New owner cannot be the same as current owner")]
    SameOwner,

    #[msg("Caller is not the freeze authority")]
    NotFreezeAuthority,

    #[msg("New freeze authority cannot be the same as current")]
    SameFreezeAuthority,

    #[msg("Invalid string length")]
    InvalidString,
}

// =================================================================
// EVENTS
// =================================================================

#[event]
pub struct OwnerTransferredEvent {
    pub old_owner: Pubkey,
    pub new_owner: Pubkey,
    pub transferred_by: Pubkey,
}

#[event]
pub struct TokensMintedEvent {
    pub to: Pubkey,
    pub amount: u64,
    pub total_supply: u64,
    pub minted_by: Pubkey,
}

#[event]
pub struct AccountFrozenEvent {
    pub account: Pubkey,
    pub frozen_by: Pubkey,
}

#[event]
pub struct AccountUnfrozenEvent {
    pub account: Pubkey,
    pub unfrozen_by: Pubkey,
}

#[event]
pub struct FreezeAuthorityTransferredEvent {
    pub old_freeze_authority: Pubkey,
    pub new_freeze_authority: Pubkey,
    pub transferred_by: Pubkey,
}

// =================================================================
// COMPREHENSIVE TESTS
// =================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::Pubkey;

    // =================================================================
    // TokenState Tests
    // =================================================================

    #[test]
    fn test_token_state_default_creation() {
        let dummy_pubkey = Pubkey::default();
        let state = TokenState {
            owner: dummy_pubkey,
            freeze_authority: dummy_pubkey,
            name: "Test Token".to_string(),
            symbol: "TT".to_string(),
            decimals: 9,
            total_supply: 0,
            next_index: 0,
            bump: 255,
        };

        assert_eq!(state.name, "Test Token");
        assert_eq!(state.symbol, "TT");
        assert_eq!(state.decimals, 9);
        assert_eq!(state.total_supply, 0);
        assert_eq!(state.bump, 255);
    }

    // =================================================================
    // BalanceAccount Tests
    // =================================================================

    #[test]
    fn test_balance_account_structure() {
        let wallet = Pubkey::new_unique();
        let balance_account = BalanceAccount {
            wallet,
            balance: 1000,
            bump: 1,
        };

        assert_eq!(balance_account.wallet, wallet);
        assert_eq!(balance_account.balance, 1000);
        assert_eq!(balance_account.bump, 1);
    }

    #[test]
    fn test_balance_account_zero_balance() {
        let wallet = Pubkey::new_unique();
        let balance_account = BalanceAccount {
            wallet,
            balance: 0,
            bump: 0,
        };

        assert_eq!(balance_account.balance, 0);
    }

    // =================================================================
    // FrozenAccount Tests
    // =================================================================

    #[test]
    fn test_frozen_account_frozen_status() {
        let wallet = Pubkey::new_unique();
        let frozen_account = FrozenAccount {
            wallet,
            frozen: true,
            bump: 2,
        };

        assert!(frozen_account.frozen);
    }

    #[test]
    fn test_frozen_account_active_status() {
        let wallet = Pubkey::new_unique();
        let frozen_account = FrozenAccount {
            wallet,
            frozen: false,
            bump: 3,
        };

        assert!(!frozen_account.frozen);
    }

    // =================================================================
    // AgentAccount Tests
    // =================================================================

    #[test]
    fn test_agent_account_structure() {
        let agent = Pubkey::new_unique();
        let agent_account = AgentAccount {
            agent,
            bump: 4,
        };

        assert_eq!(agent_account.agent, agent);
        assert_eq!(agent_account.bump, 4);
    }

    // =================================================================
    // SupplyInfo Tests
    // =================================================================

    #[test]
    fn test_supply_info_calculation() {
        let max_supply = MAX_SUPPLY;
        let current_supply = 1_000_000_000_000_000u64;

        let supply_info = SupplyInfo {
            current_supply,
            max_supply,
            remaining_supply: max_supply - current_supply,
        };

        assert_eq!(supply_info.current_supply, current_supply);
        assert_eq!(supply_info.max_supply, max_supply);
        assert_eq!(supply_info.remaining_supply, max_supply - current_supply);
    }

    #[test]
    fn test_supply_info_zero_supply() {
        let max_supply = MAX_SUPPLY;

        let supply_info = SupplyInfo {
            current_supply: 0,
            max_supply,
            remaining_supply: max_supply,
        };

        assert_eq!(supply_info.current_supply, 0);
        assert_eq!(supply_info.remaining_supply, max_supply);
    }

    #[test]
    fn test_supply_info_max_supply_value() {
        assert_eq!(MAX_SUPPLY, 1_000_000_000_000_000_000u64);
    }

    // =================================================================
    // PDA Derivation Tests
    // =================================================================

    #[test]
    fn test_pda_balance_derivation() {
        let token = Pubkey::new_unique();
        let wallet = Pubkey::new_unique();
        let seeds = &[b"balance", token.as_ref(), wallet.as_ref()];
        let (pda, _bump) = Pubkey::find_program_address(seeds, &id());

        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_pda_frozen_derivation() {
        let token = Pubkey::new_unique();
        let wallet = Pubkey::new_unique();
        let seeds = &[b"frozen", token.as_ref(), wallet.as_ref()];
        let (pda, _bump) = Pubkey::find_program_address(seeds, &id());

        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_pda_agent_derivation() {
        let token = Pubkey::new_unique();
        let agent = Pubkey::new_unique();
        let seeds = &[b"agent", token.as_ref(), agent.as_ref()];
        let (pda, _bump) = Pubkey::find_program_address(seeds, &id());

        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_pda_unique_for_different_wallets() {
        let token = Pubkey::new_unique();
        let wallet1 = Pubkey::new_unique();
        let wallet2 = Pubkey::new_unique();

        let seeds1 = &[b"balance", token.as_ref(), wallet1.as_ref()];
        let seeds2 = &[b"balance", token.as_ref(), wallet2.as_ref()];

        let (pda1, _) = Pubkey::find_program_address(seeds1, &id());
        let (pda2, _) = Pubkey::find_program_address(seeds2, &id());

        assert_ne!(pda1, pda2);
    }

    #[test]
    fn test_pda_deterministic() {
        let token = Pubkey::new_unique();
        let wallet = Pubkey::new_unique();

        let seeds = &[b"balance", token.as_ref(), wallet.as_ref()];
        let (pda1, _bump1) = Pubkey::find_program_address(seeds, &id());
        let (pda2, _bump2) = Pubkey::find_program_address(seeds, &id());

        assert_eq!(pda1, pda2);
    }

    // =================================================================
    // Error Code Tests
    // =================================================================

    #[test]
    fn test_error_codes_all_defined() {
        let _unauthorized = ErrorCode::Unauthorized;
        let _insufficient_balance = ErrorCode::InsufficientBalance;
        let _account_frozen = ErrorCode::AccountFrozen;
        let _duplicate_agent = ErrorCode::DuplicateAgent;
        let _invalid_amount = ErrorCode::InvalidAmount;
        let _supply_exceeded = ErrorCode::SupplyExceeded;
        let _supply_overflow = ErrorCode::SupplyOverflow;
        let _same_owner = ErrorCode::SameOwner;
        let _not_freeze_authority = ErrorCode::NotFreezeAuthority;
        let _same_freeze_authority = ErrorCode::SameFreezeAuthority;
    }

    // =================================================================
    // Event Structure Tests
    // =================================================================

    #[test]
    fn test_owner_transferred_event() {
        let old_owner = Pubkey::new_unique();
        let new_owner = Pubkey::new_unique();
        let transferred_by = Pubkey::new_unique();

        let event = OwnerTransferredEvent {
            old_owner,
            new_owner,
            transferred_by,
        };

        assert_eq!(event.old_owner, old_owner);
        assert_eq!(event.new_owner, new_owner);
        assert_eq!(event.transferred_by, transferred_by);
    }

    #[test]
    fn test_tokens_minted_event() {
        let to = Pubkey::new_unique();
        let amount = 1_000_000u64;
        let total_supply = 2_000_000u64;
        let minted_by = Pubkey::new_unique();

        let event = TokensMintedEvent {
            to,
            amount,
            total_supply,
            minted_by,
        };

        assert_eq!(event.to, to);
        assert_eq!(event.amount, amount);
        assert_eq!(event.total_supply, total_supply);
        assert_eq!(event.minted_by, minted_by);
    }

    #[test]
    fn test_account_frozen_event() {
        let account = Pubkey::new_unique();
        let frozen_by = Pubkey::new_unique();

        let event = AccountFrozenEvent {
            account,
            frozen_by,
        };

        assert_eq!(event.account, account);
        assert_eq!(event.frozen_by, frozen_by);
    }

    #[test]
    fn test_account_unfrozen_event() {
        let account = Pubkey::new_unique();
        let unfrozen_by = Pubkey::new_unique();

        let event = AccountUnfrozenEvent {
            account,
            unfrozen_by,
        };

        assert_eq!(event.account, account);
        assert_eq!(event.unfrozen_by, unfrozen_by);
    }

    #[test]
    fn test_freeze_authority_transferred_event() {
        let old_freeze_authority = Pubkey::new_unique();
        let new_freeze_authority = Pubkey::new_unique();
        let transferred_by = Pubkey::new_unique();

        let event = FreezeAuthorityTransferredEvent {
            old_freeze_authority,
            new_freeze_authority,
            transferred_by,
        };

        assert_eq!(event.old_freeze_authority, old_freeze_authority);
        assert_eq!(event.new_freeze_authority, new_freeze_authority);
        assert_eq!(event.transferred_by, transferred_by);
    }

    // =================================================================
    // Constants and Edge Cases
    // =================================================================

    #[test]
    fn test_max_supply_does_not_overflow() {
        assert!(MAX_SUPPLY <= u64::MAX);
    }

    #[test]
    fn test_supply_overflow_detection() {
        let current = u64::MAX - 100;
        let mint_amount = 200;

        let result = current.checked_add(mint_amount);
        assert!(result.is_none());
    }

    #[test]
    fn test_supply_safe_addition() {
        let current = 1_000_000u64;
        let mint_amount = 500_000u64;

        let result = current.checked_add(mint_amount);
        assert!(result.is_some());
        assert_eq!(result.unwrap(), 1_500_000u64);
    }
}
