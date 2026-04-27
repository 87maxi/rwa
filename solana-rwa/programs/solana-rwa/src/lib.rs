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
//
// MODULE STRUCTURE:
// -----------------
// - constants: Global constants (MAX_SUPPLY, etc.)
// - states: On-chain data structures (TokenState, BalanceAccount, etc.)
// - events: Event definitions (OwnerTransferred, TokensMinted, etc.)
// - errors: Error codes (ErrorCode enum)
// - pdas: PDA derivation helper functions
// - tests: Comprehensive test suite
// =============================================================================

use anchor_lang::prelude::*;

// Module for cross-program invocation (CPI) program IDs
pub mod ids;

// Module for global constants
pub mod constants;

// Module for on-chain data structures
pub mod states;

// Module for event definitions
pub mod events;

// Module for error codes
pub mod errors;

// Module for PDA derivation helpers
pub mod pdas;

// Module for comprehensive tests
pub mod tests;

// declare_id!() = the program's on-chain address
declare_id!("2XuB3ngjvJkMTxB82eM9NszBUGNovjuJUs4mzdez7EEX");

// Re-export all public items for easy access
pub use constants::MAX_SUPPLY;
pub use states::{TokenState, BalanceAccount, FrozenAccount, AgentAccount, SupplyInfo};
pub use events::{OwnerTransferredEvent, TokensMintedEvent, AccountFrozenEvent, AccountUnfrozenEvent, FreezeAuthorityTransferredEvent};
pub use errors::ErrorCode;
pub use pdas::{derive_balance_pda, derive_frozen_pda, derive_agent_pda};

// #[program] marks this module as containing all instruction handlers
#[program]
pub mod solana_rwa {
    use super::*;

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
