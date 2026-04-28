// =============================================================================
// IDENTITY REGISTRY PROGRAM (PDA Architecture)
// =============================================================================
//
// This program manages identity registrations on Solana using PDAs.
// It maps wallet addresses (Solana public keys) to identity credentials
// using distributed PDA accounts instead of a monolithic storage account.
//
// ARCHITECTURE:
// -------------
// 1. IdentityRegistryState (PDA): Control account for the registry
//    - Seeds: [b"registry"]
//    - Stores: owner, registry_bump
//
// 2. IdentityAccount (PDA): Individual identity records
//    - Seeds: [b"identity", registry_pubkey, wallet_pubkey]
//    - Stores: wallet, identity, name, symbol, identity_data, metadata_uri, bump
//
// BENEFITS:
// ---------
// - O(1) lookup by wallet address (via PDA derivation)
// - No account size limits (each identity is independent)
// - Efficient updates/removals (no vector manipulation)
// - Better parallelization (different PDAs don't conflict)
//
// MODULE STRUCTURE:
// -----------------
// - constants: Global constants (MAX_NAME_LENGTH, etc.)
// - states: On-chain data structures (IdentityRegistryState, IdentityAccount)
// - events: Event definitions (IdentityRegistered, IdentityUpdated, etc.)
// - errors: Error codes (ErrorCode enum)
// - pdas: PDA derivation helper functions
// - tests: Comprehensive test suite
// =============================================================================

use anchor_lang::prelude::*;

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

// Re-export all public items for easy access
pub use constants::{MAX_NAME_LENGTH, MAX_SYMBOL_LENGTH, MAX_METADATA_URI_LENGTH, MAX_IDENTITY_DATA_LENGTH};
pub use states::{IdentityRegistryState, IdentityAccount};
pub use events::{IdentityRegisteredEvent, IdentityUpdatedEvent, IdentityRemovedEvent, IdentityRegisteredWithDataEvent};
pub use errors::ErrorCode;
pub use pdas::{derive_registry_pda, derive_identity_pda};

// declare_id!() = the program's on-chain address
declare_id!("5SeHm9i7CcgHqF9UBYBtGbzqf3F3FWFETQF8AxfU2Rce");

// #[program] marks this module as containing all instruction handlers
#[program]
pub mod identity_registry {
    use super::*;

    // =================================================================
    // ACCOUNT VALIDATION STRUCTURES
    // =================================================================

    /// Initialize instruction - creates a new identity registry
    #[derive(Accounts)]
    pub struct Initialize<'info> {
        /// Who pays for the registry account creation
        #[account(mut)]
        pub payer: Signer<'info>,

        /// The new registry PDA account (stores owner info only)
        /// Seeds: [b"registry"]
        #[account(
            init,
            payer = payer,
            seeds = [b"registry"],
            bump,
            space = 8 + std::mem::size_of::<IdentityRegistryState>()
        )]
        pub registry: Account<'info, IdentityRegistryState>,

        /// Solana's system program (required for account creation)
        pub system_program: Program<'info, System>,
    }

    /// RegisterIdentity instruction - creates a new IdentityAccount PDA
    #[derive(Accounts)]
    pub struct RegisterIdentity<'info> {
        /// Payer for rent (new identity PDA needs rent exemption)
        #[account(mut)]
        pub payer: Signer<'info>,

        /// Registry PDA (must be signed via seeds for authorization)
        #[account(
            mut,
            seeds = [b"registry"],
            bump = registry.registry_bump,
        )]
        pub registry: Account<'info, IdentityRegistryState>,

        /// The wallet being registered (must sign to prove authority)
        pub owner: Signer<'info>,

        /// New IdentityAccount PDA (will be created)
        /// Seeds: [b"identity", registry.key(), owner.key()]
        #[account(
            init,
            payer = payer,
            seeds = [b"identity", registry.key().as_ref(), owner.key().as_ref()],
            bump,
            space = 8 + std::mem::size_of::<IdentityAccount>()
        )]
        pub identity_account: AccountLoader<'info, IdentityAccount>,

        /// System program for account creation
        pub system_program: Program<'info, System>,
    }

    /// UpdateIdentity instruction - updates an existing IdentityAccount PDA
    #[derive(Accounts)]
    pub struct UpdateIdentity<'info> {
        /// Registry PDA (for authorization)
        #[account(
            seeds = [b"registry"],
            bump = registry.registry_bump,
        )]
        pub registry: Account<'info, IdentityRegistryState>,

        /// IdentityAccount PDA (will be updated)
        #[account(
            mut,
            seeds = [b"identity", registry.key().as_ref(), identity_account_owner.key().as_ref()],
            bump = identity_account.load()?.bump,
        )]
        pub identity_account: AccountLoader<'info, IdentityAccount>,
        /// CHECK: used for PDA derivation
        pub identity_account_owner: AccountInfo<'info>,

        /// The person updating (must be identity owner or registry admin)
        pub owner: Signer<'info>,
    }

    /// RemoveIdentity instruction - closes the IdentityAccount PDA
    #[derive(Accounts)]
    pub struct RemoveIdentity<'info> {
        /// Registry PDA (for authorization)
        #[account(
            seeds = [b"registry"],
            bump = registry.registry_bump,
        )]
        pub registry: Account<'info, IdentityRegistryState>,

        /// IdentityAccount PDA (will be closed, SOL returned to owner)
        #[account(
            mut,
            seeds = [b"identity", registry.key().as_ref(), identity_account_owner.key().as_ref()],
            bump = identity_account.load()?.bump,
            close = owner // Return remaining SOL to owner
        )]
        pub identity_account: AccountLoader<'info, IdentityAccount>,
        /// CHECK: used for PDA derivation
        pub identity_account_owner: AccountInfo<'info>,

        /// Recipient for remaining SOL (must be identity owner)
        pub owner: Signer<'info>,
    }

    // =================================================================
    // INSTRUCTION HANDLERS
    // =================================================================

    /// Initialize a new identity registry
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.owner = ctx.accounts.payer.key();
        registry.registry_bump = ctx.bumps.registry;

        msg!("Identity registry initialized by {}", registry.owner);
        Ok(())
    }

    /// Register a new identity mapping (Pubkey-based)
    pub fn register_identity(
        ctx: Context<RegisterIdentity>,
        wallet: Pubkey,
        identity: Pubkey,
    ) -> Result<()> {
        // SECURITY CHECK: Wallet must match owner
        require!(wallet == ctx.accounts.owner.key(), ErrorCode::WalletMismatch);

        let mut identity_account = ctx.accounts.identity_account.load_init()?;

        // Initialize the IdentityAccount PDA
        identity_account.wallet = ctx.accounts.owner.key();
        identity_account.identity = identity;
        identity_account.bump = ctx.bumps.identity_account;
        // String fields are initialized to zeros by load_init (Pod)

        // Emit event for audit trail
        emit!(IdentityRegisteredEvent {
            wallet: ctx.accounts.owner.key(),
            identity,
            registered_by: ctx.accounts.owner.key(),
        });

        msg!("Identity registered for wallet: {} (by {})", ctx.accounts.owner.key(), ctx.accounts.owner.key());
        Ok(())
    }

    /// Register a new identity with string-based identity data (MEDIUM-01: with length validation)
    pub fn register_identity_with_data(
        ctx: Context<RegisterIdentity>,
        wallet: Pubkey,
        name: String,
        symbol: String,
        identity_data: String,
        metadata_uri: String,
    ) -> Result<()> {
        // MEDIUM-01: String length validation
        require!(name.len() <= MAX_NAME_LENGTH, ErrorCode::StringTooLong);
        require!(symbol.len() <= MAX_SYMBOL_LENGTH, ErrorCode::StringTooLong);
        require!(identity_data.len() <= MAX_IDENTITY_DATA_LENGTH, ErrorCode::StringTooLong);
        require!(metadata_uri.len() <= MAX_METADATA_URI_LENGTH, ErrorCode::StringTooLong);

        // SECURITY CHECK: Wallet must match owner
        require!(wallet == ctx.accounts.owner.key(), ErrorCode::WalletMismatch);

        // Clone strings BEFORE moving them (for event emission)
        let name_clone = name.clone();
        let symbol_clone = symbol.clone();
        let identity_data_clone = identity_data.clone();
        let metadata_uri_clone = metadata_uri.clone();

        let mut identity_account = ctx.accounts.identity_account.load_init()?;

        // Initialize the IdentityAccount PDA with full data
        identity_account.wallet = ctx.accounts.owner.key();
        identity_account.identity = wallet;
        crate::states::copy_str_to_bytes(&name, &mut identity_account.name);
        crate::states::copy_str_to_bytes(&symbol, &mut identity_account.symbol);
        crate::states::copy_str_to_bytes(&identity_data, &mut identity_account.identity_data);
        crate::states::copy_str_to_bytes(&metadata_uri, &mut identity_account.metadata_uri);
        identity_account.bump = ctx.bumps.identity_account;

        // Emit event with full identity data for audit trail
        emit!(IdentityRegisteredWithDataEvent {
            wallet: ctx.accounts.owner.key(),
            name: name_clone,
            symbol: symbol_clone,
            identity_data: identity_data_clone,
            metadata_uri: metadata_uri_clone,
            registered_by: ctx.accounts.owner.key(),
        });

        msg!("Identity with data registered for wallet: {} (by {})", ctx.accounts.owner.key(), ctx.accounts.owner.key());
        Ok(())
    }

    /// Update an existing identity mapping
    pub fn update_identity(
        ctx: Context<UpdateIdentity>,
        new_identity: Pubkey,
        name: Option<String>,
        symbol: Option<String>,
        identity_data: Option<String>,
        metadata_uri: Option<String>,
    ) -> Result<()> {
        let mut identity_account = ctx.accounts.identity_account.load_mut()?;
        let caller = ctx.accounts.owner.key();

        // SECURITY CHECK: Ownership verification
        let is_identity_owner = identity_account.wallet == caller;
        let is_registry_admin = ctx.accounts.registry.owner == caller;

        require!(
            is_identity_owner || is_registry_admin,
            ErrorCode::NotIdentityOwner
        );

        // Emit event for audit trail
        emit!(IdentityUpdatedEvent {
            wallet: identity_account.wallet,
            new_identity,
            updated_by: caller,
            is_admin_override: is_registry_admin,
        });

        // Update fields (only if provided)
        identity_account.identity = new_identity;
        if let Some(n) = name {
            require!(n.len() <= MAX_NAME_LENGTH, ErrorCode::StringTooLong);
            crate::states::copy_str_to_bytes(&n, &mut identity_account.name);
        }
        if let Some(s) = symbol {
            require!(s.len() <= MAX_SYMBOL_LENGTH, ErrorCode::StringTooLong);
            crate::states::copy_str_to_bytes(&s, &mut identity_account.symbol);
        }
        if let Some(d) = identity_data {
            require!(d.len() <= MAX_IDENTITY_DATA_LENGTH, ErrorCode::StringTooLong);
            crate::states::copy_str_to_bytes(&d, &mut identity_account.identity_data);
        }
        if let Some(u) = metadata_uri {
            require!(u.len() <= MAX_METADATA_URI_LENGTH, ErrorCode::StringTooLong);
            crate::states::copy_str_to_bytes(&u, &mut identity_account.metadata_uri);
        }

        msg!("Identity updated for wallet: {} (by {})", identity_account.wallet, caller);
        Ok(())
    }

    /// Remove an identity mapping
    pub fn remove_identity(ctx: Context<RemoveIdentity>) -> Result<()> {
        let identity_account = ctx.accounts.identity_account.load()?;
        let caller = ctx.accounts.owner.key();

        // SECURITY CHECK: Ownership verification
        let is_identity_owner = identity_account.wallet == caller;
        let is_registry_admin = ctx.accounts.registry.owner == caller;

        require!(
            is_identity_owner || is_registry_admin,
            ErrorCode::NotIdentityOwner
        );

        // Emit event for audit trail
        emit!(IdentityRemovedEvent {
            wallet: identity_account.wallet,
            removed_by: caller,
            was_admin_override: is_registry_admin,
        });

        msg!("Identity removed for wallet: {} (by {})", identity_account.wallet, caller);
        Ok(())
    }

}
