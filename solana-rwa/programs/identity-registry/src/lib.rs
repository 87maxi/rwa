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

use anchor_lang::prelude::*;

// =================================================================
// CONSTANTS
// =================================================================

/// Maximum length for identity name (prevents excessive storage)
pub const MAX_NAME_LENGTH: usize = 32;

/// Maximum length for identity symbol
pub const MAX_SYMBOL_LENGTH: usize = 10;

/// Maximum length for metadata URI
pub const MAX_METADATA_URI_LENGTH: usize = 256;

/// Maximum length for identity data string
pub const MAX_IDENTITY_DATA_LENGTH: usize = 128;

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
    ///
    /// Accounts needed:
    /// - payer: Who pays the rent for creating the registry account
    /// - registry: The new PDA account that will control the registry
    /// - system_program: Solana's system program (required for PDA creation)
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
    ///
    /// Accounts needed:
    /// - payer: Who pays the rent for the new identity PDA
    /// - registry: The registry PDA (must be signed via PDA)
    /// - owner: The wallet being registered (must sign to prove ownership)
    ///
    /// The IdentityAccount PDA will be derived from:
    /// [b"identity", registry_pubkey, wallet_pubkey]
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
        pub identity_account: Account<'info, IdentityAccount>,

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
            seeds = [b"identity", registry.key().as_ref(), identity_account.wallet.key().as_ref()],
            bump = identity_account.bump,
        )]
        pub identity_account: Account<'info, IdentityAccount>,

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
            seeds = [b"identity", registry.key().as_ref(), identity_account.wallet.key().as_ref()],
            bump = identity_account.bump,
            close = owner // Return remaining SOL to owner
        )]
        pub identity_account: Account<'info, IdentityAccount>,

        /// Recipient for remaining SOL (must be identity owner)
        pub owner: Signer<'info>,
    }

    // =================================================================
    // INSTRUCTION HANDLERS
    // =================================================================

    /// Initialize a new identity registry
    ///
    /// Creates the registry PDA that will control all identity registrations.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.owner = ctx.accounts.payer.key();
        registry.registry_bump = ctx.bumps.registry;

        msg!("Identity registry initialized by {}", registry.owner);
        Ok(())
    }

    /// Register a new identity mapping (Pubkey-based)
    ///
    /// Creates a new IdentityAccount PDA for the wallet.
    pub fn register_identity(
        ctx: Context<RegisterIdentity>,
        wallet: Pubkey,
        identity: Pubkey,
    ) -> Result<()> {
        // SECURITY CHECK: Wallet must match owner
        require!(wallet == ctx.accounts.owner.key(), ErrorCode::WalletMismatch);

        let identity_account = &mut ctx.accounts.identity_account;

        // Initialize the IdentityAccount PDA
        identity_account.wallet = ctx.accounts.owner.key();
        identity_account.identity = identity;
        identity_account.name = String::from("");
        identity_account.symbol = String::from("");
        identity_account.identity_data = String::from("");
        identity_account.metadata_uri = String::from("");
        identity_account.bump = ctx.bumps.identity_account;

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

        let identity_account = &mut ctx.accounts.identity_account;

        // Initialize the IdentityAccount PDA with full data
        identity_account.wallet = ctx.accounts.owner.key();
        identity_account.identity = wallet;
        identity_account.name = name;
        identity_account.symbol = symbol;
        identity_account.identity_data = identity_data;
        identity_account.metadata_uri = metadata_uri;
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
    ///
    /// Only the identity owner or registry admin can update.
    pub fn update_identity(
        ctx: Context<UpdateIdentity>,
        new_identity: Pubkey,
        name: Option<String>,
        symbol: Option<String>,
        identity_data: Option<String>,
        metadata_uri: Option<String>,
    ) -> Result<()> {
        let identity_account = &mut ctx.accounts.identity_account;
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
            identity_account.name = n;
        }
        if let Some(s) = symbol {
            require!(s.len() <= MAX_SYMBOL_LENGTH, ErrorCode::StringTooLong);
            identity_account.symbol = s;
        }
        if let Some(d) = identity_data {
            require!(d.len() <= MAX_IDENTITY_DATA_LENGTH, ErrorCode::StringTooLong);
            identity_account.identity_data = d;
        }
        if let Some(u) = metadata_uri {
            require!(u.len() <= MAX_METADATA_URI_LENGTH, ErrorCode::StringTooLong);
            identity_account.metadata_uri = u;
        }

        msg!("Identity updated for wallet: {} (by {})", identity_account.wallet, caller);
        Ok(())
    }

    /// Remove an identity mapping
    ///
    /// Only the identity owner or registry admin can remove.
    pub fn remove_identity(ctx: Context<RemoveIdentity>) -> Result<()> {
        let identity_account = &ctx.accounts.identity_account;
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

// =================================================================
// DATA STRUCTURES (On-Chain Storage)
// =================================================================

/// IdentityRegistryState is the control account for the identity registry.
/// It is stored as a PDA with seeds [b"registry"].
#[account]
pub struct IdentityRegistryState {
    pub owner: Pubkey,      // Who created this registry
    pub registry_bump: u8,  // Bump for the registry PDA
}

/// IdentityAccount stores a single identity record using a PDA.
///
/// Seeds: [b"identity", registry_pubkey, wallet_pubkey]
#[account]
pub struct IdentityAccount {
    pub wallet: Pubkey,           // The owner of this identity
    pub identity: Pubkey,         // The identity credential
    pub name: String,             // Human-readable name
    pub symbol: String,           // Short symbol
    pub identity_data: String,    // Additional identity data
    pub metadata_uri: String,     // URI to metadata
    pub bump: u8,                 // PDA bump
}

// =================================================================
// ERROR CODES
// =================================================================

#[error_code]
pub enum ErrorCode {
    /// Wallet already registered
    #[msg("Wallet already registered")]
    WalletAlreadyRegistered,

    /// Wallet not registered
    #[msg("Wallet not registered")]
    WalletNotRegistered,

    /// Caller is not the identity owner or registry admin
    #[msg("Caller is not the identity owner or registry admin")]
    NotIdentityOwner,

    /// String length exceeds maximum allowed
    #[msg("String length exceeds maximum allowed")]
    StringTooLong,

    /// Wallet mismatch
    #[msg("Wallet does not match owner")]
    WalletMismatch,
}

// =================================================================
// EVENTS
// =================================================================

/// Event emitted when a new identity is registered
#[event]
pub struct IdentityRegisteredEvent {
    pub wallet: Pubkey,
    pub identity: Pubkey,
    pub registered_by: Pubkey,
}

/// Event emitted when an identity is updated
#[event]
pub struct IdentityUpdatedEvent {
    pub wallet: Pubkey,
    pub new_identity: Pubkey,
    pub updated_by: Pubkey,
    pub is_admin_override: bool,
}

/// Event emitted when an identity is removed
#[event]
pub struct IdentityRemovedEvent {
    pub wallet: Pubkey,
    pub removed_by: Pubkey,
    pub was_admin_override: bool,
}

/// Event emitted when a new identity is registered with string-based data (MEDIUM-01)
#[event]
pub struct IdentityRegisteredWithDataEvent {
    pub wallet: Pubkey,
    pub name: String,
    pub symbol: String,
    pub identity_data: String,
    pub metadata_uri: String,
    pub registered_by: Pubkey,
}

// =================================================================
// COMPREHENSIVE TESTS
// =================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // =================================================================
    // Constants Tests
    // =================================================================

    #[test]
    fn test_max_name_length_constant() {
        assert_eq!(MAX_NAME_LENGTH, 32);
    }

    #[test]
    fn test_max_symbol_length_constant() {
        assert_eq!(MAX_SYMBOL_LENGTH, 10);
    }

    #[test]
    fn test_max_metadata_uri_length_constant() {
        assert_eq!(MAX_METADATA_URI_LENGTH, 256);
    }

    #[test]
    fn test_max_identity_data_length_constant() {
        assert_eq!(MAX_IDENTITY_DATA_LENGTH, 128);
    }

    // =================================================================
    // IdentityRegistryState Tests
    // =================================================================

    #[test]
    fn test_identity_registry_state_structure() {
        let state = IdentityRegistryState {
            owner: Pubkey::new_unique(),
            registry_bump: 5,
        };

        assert_ne!(state.owner, Pubkey::default());
        assert_eq!(state.registry_bump, 5);
    }

    #[test]
    fn test_identity_registry_state_default_owner() {
        let state = IdentityRegistryState {
            owner: Pubkey::default(),
            registry_bump: 0,
        };

        assert_eq!(state.owner, Pubkey::default());
    }

    // =================================================================
    // IdentityAccount Tests
    // =================================================================

    #[test]
    fn test_identity_account_structure() {
        let wallet = Pubkey::new_unique();
        let identity = Pubkey::new_unique();
        let account = IdentityAccount {
            wallet,
            identity,
            name: "KYC".to_string(),
            symbol: "K".to_string(),
            identity_data: "verified".to_string(),
            metadata_uri: "https://example.com/metadata".to_string(),
            bump: 7,
        };

        assert_eq!(account.wallet, wallet);
        assert_eq!(account.identity, identity);
        assert_eq!(account.name, "KYC");
        assert_eq!(account.symbol, "K");
        assert_eq!(account.bump, 7);
    }

    #[test]
    fn test_identity_account_empty_strings() {
        let account = IdentityAccount {
            wallet: Pubkey::new_unique(),
            identity: Pubkey::new_unique(),
            name: "".to_string(),
            symbol: "".to_string(),
            identity_data: "".to_string(),
            metadata_uri: "".to_string(),
            bump: 1,
        };

        assert_eq!(account.name.len(), 0);
        assert_eq!(account.symbol.len(), 0);
    }

    // =================================================================
    // Error Code Tests
    // =================================================================

    #[test]
    fn test_error_codes_all_defined() {
        let _wallet_already_registered = ErrorCode::WalletAlreadyRegistered;
        let _wallet_not_registered = ErrorCode::WalletNotRegistered;
        let _not_identity_owner = ErrorCode::NotIdentityOwner;
        let _string_too_long = ErrorCode::StringTooLong;
        let _wallet_mismatch = ErrorCode::WalletMismatch;
    }

    // =================================================================
    // Event Structure Tests
    // =================================================================

    #[test]
    fn test_identity_registered_event() {
        let wallet = Pubkey::new_unique();
        let identity = Pubkey::new_unique();
        let registered_by = Pubkey::new_unique();

        let event = IdentityRegisteredEvent {
            wallet,
            identity,
            registered_by,
        };

        assert_eq!(event.wallet, wallet);
        assert_eq!(event.identity, identity);
        assert_eq!(event.registered_by, registered_by);
    }

    #[test]
    fn test_identity_updated_event() {
        let wallet = Pubkey::new_unique();
        let new_identity = Pubkey::new_unique();
        let updated_by = Pubkey::new_unique();

        let event = IdentityUpdatedEvent {
            wallet,
            new_identity,
            updated_by,
            is_admin_override: true,
        };

        assert_eq!(event.wallet, wallet);
        assert!(event.is_admin_override);
    }

    #[test]
    fn test_identity_removed_event() {
        let wallet = Pubkey::new_unique();
        let removed_by = Pubkey::new_unique();

        let event = IdentityRemovedEvent {
            wallet,
            removed_by,
            was_admin_override: false,
        };

        assert_eq!(event.wallet, wallet);
        assert!(!event.was_admin_override);
    }

    #[test]
    fn test_identity_registered_with_data_event() {
        let event = IdentityRegisteredWithDataEvent {
            wallet: Pubkey::new_unique(),
            name: "Identity".to_string(),
            symbol: "ID".to_string(),
            identity_data: "data".to_string(),
            metadata_uri: "https://example.com".to_string(),
            registered_by: Pubkey::new_unique(),
        };

        assert_eq!(event.name, "Identity");
        assert_eq!(event.symbol, "ID");
    }

    // =================================================================
    // PDA Derivation Tests
    // =================================================================

    #[test]
    fn test_registry_pda_derivation() {
        let seeds: &[&[u8]] = &[b"registry"];
        let (pda, _bump) = Pubkey::find_program_address(seeds, &id());

        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_identity_pda_derivation() {
        let registry = Pubkey::new_unique();
        let wallet = Pubkey::new_unique();
        let seeds = &[b"identity", registry.as_ref(), wallet.as_ref()];
        let (pda, _bump) = Pubkey::find_program_address(seeds, &id());

        assert_ne!(pda, Pubkey::default());
    }

    #[test]
    fn test_identity_pda_unique_for_different_wallets() {
        let registry = Pubkey::new_unique();
        let wallet1 = Pubkey::new_unique();
        let wallet2 = Pubkey::new_unique();

        let seeds1 = &[b"identity", registry.as_ref(), wallet1.as_ref()];
        let seeds2 = &[b"identity", registry.as_ref(), wallet2.as_ref()];

        let (pda1, _) = Pubkey::find_program_address(seeds1, &id());
        let (pda2, _) = Pubkey::find_program_address(seeds2, &id());

        assert_ne!(pda1, pda2);
    }

    #[test]
    fn test_identity_pda_deterministic() {
        let registry = Pubkey::new_unique();
        let wallet = Pubkey::new_unique();
        let seeds = &[b"identity", registry.as_ref(), wallet.as_ref()];

        let (pda1, _bump1) = Pubkey::find_program_address(seeds, &id());
        let (pda2, _bump2) = Pubkey::find_program_address(seeds, &id());

        assert_eq!(pda1, pda2);
    }
}
