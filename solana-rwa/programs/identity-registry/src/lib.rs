// =============================================================================
// IDENTITY REGISTRY PROGRAM
// =============================================================================
//
// This program manages identity registrations on Solana.
// It maps wallet addresses (Solana public keys) to identity credentials.
//
// USE CASE:
// ---------
// In Real World Asset (RWA) tokenization, participants often need to prove
// their identity (KYC - Know Your Customer). This program stores:
// - Which wallet addresses have been verified
// - What identity credential each wallet holds
//
// ANALOGY WITH TRADITIONAL PROGRAMMING:
// --------------------------------------
// Think of this as a database table with these columns:
//   wallet_address (PRIMARY KEY) | identity_credential
//
// Plus these operations:
//   INSERT INTO identities (wallet, identity) VALUES (...);
//   UPDATE identities SET identity = ... WHERE wallet = ...;
//   DELETE FROM identities WHERE wallet = ...;
//   SELECT identity FROM identities WHERE wallet = ...;
//
// In Solana/Anchor, there's no SQL. Instead, we store data in accounts
// and access them through program instructions.

use anchor_lang::prelude::*;  // Import Anchor essentials

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
// This is like deploying a smart contract and getting its address
declare_id!("3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5");

// #[program] marks this module as containing all instruction handlers
#[program]
pub mod identity_registry {
    use super::*;  // Import helper functions, structs, and errors from parent

    // =================================================================
    // ACCOUNT VALIDATION STRUCTURES
    // =================================================================
    //
    // Each struct defines which accounts are needed for an instruction.
    // Anchor validates these accounts before calling your handler function.
    //
    // Rust pattern explanation:
    // - <'info> is a LIFETIME parameter
    //   Lifetimes in Rust ensure references don't outlive the data they point to
    //   'info specifically means "lives as long as the Solana transaction context"
    //   Analogy: Like Python's garbage collection, but checked at compile time
    //
    // - #[account(mut)] = this account will be modified
    //   Without this, Anchor won't give you mutable access (&mut)
    //   Like Python: you need the object to be mutable (list vs tuple)
    //
    // - #[account(init)] = create this account if it doesn't exist
    //   Anchor handles rent payment and account initialization
    //   Like Python's: if key not in dict: dict[key] = new_value
    //   But on Solana, this also allocates storage space on-chain

    /// Initialize instruction - creates a new identity registry
    ///
    /// Accounts needed:
    /// - payer: Who pays the rent for creating the registry account
    /// - registry: The new account that will store all identity data
    /// - system_program: Solana's system program (required for account creation)
    #[derive(Accounts)]
    pub struct Initialize<'info> {
        /// Who pays for the registry account creation
        #[account(mut)]  // Their SOL will be deducted for rent
        pub payer: Signer<'info>,  // Must sign the transaction

        /// The new registry account (stores all identity mappings)
        #[account(
            init,              // Create if doesn't exist
            payer = payer,     // Payer funds the account
            space = 8 + std::mem::size_of::<IdentityRegistryState>() + 5000
            // space = 8 (discriminator) + struct size + 5000 (extra for Vec growth, supports 20+ entries)
        )]
        pub registry: Account<'info, IdentityRegistryState>,

        /// Solana's system program (required for account creation)
        pub system_program: Program<'info, System>,
    }

    /// RegisterIdentity instruction - adds a new identity mapping
    ///
    /// Accounts needed:
    /// - payer: Who pays the rent (registry is modified, needs rent exemption)
    /// - registry: The identity registry account (will be modified)
    /// - owner: Who is registering (must sign)
    ///
    /// Note: The 'wallet' and 'identity' parameters are NOT accounts.
    /// They're just Pubkey values passed as instruction data.
    /// Like function parameters in Python: def register(wallet, identity)
    #[derive(Accounts)]
    pub struct RegisterIdentity<'info> {
        /// Payer for rent (registry account grows, needs more rent)
        #[account(mut)]
        pub payer: Signer<'info>,

        /// Registry account (identity list will grow)
        #[account(mut)]
        pub registry: Account<'info, IdentityRegistryState>,

        /// The person registering (must sign to prove authority)
        pub owner: Signer<'info>,
    }

    /// UpdateIdentity instruction - changes an existing identity
    #[derive(Accounts)]
    pub struct UpdateIdentity<'info> {
        /// Registry account (identity value will change)
        #[account(mut)]
        pub registry: Account<'info, IdentityRegistryState>,

        /// The person updating (must sign)
        pub owner: Signer<'info>,
    }

    /// RemoveIdentity instruction - deletes an identity mapping
    #[derive(Accounts)]
    pub struct RemoveIdentity<'info> {
        /// Registry account (identity list will shrink)
        #[account(mut)]
        pub registry: Account<'info, IdentityRegistryState>,

        /// The person removing (must sign)
        pub owner: Signer<'info>,
    }

    /// GetIdentity instruction - reads an identity (no accounts modified)
    ///
    /// This is a "view" or "read-only" instruction.
    /// In Anchor, read-only instructions don't need #[account(mut)].
    #[derive(Accounts)]
    pub struct GetIdentity<'info> {
        /// Registry account (read-only, no modification)
        pub registry: Account<'info, IdentityRegistryState>,
    }

    // =================================================================
    // INSTRUCTION HANDLERS
    // =================================================================

    /// Initialize a new identity registry
    ///
    /// This is the "constructor" - called once to set up the registry.
    ///
    /// Parameters: None (all data comes from account context)
    ///
    /// Rust explanation:
    /// - ctx: Context<Initialize> = access to all accounts in Initialize struct
    ///   ctx.accounts.registry = the IdentityRegistryState account
    ///   ctx.accounts.payer = the payer account
    /// - -> Result<()> = returns Ok(()) on success or Err(error) on failure
    ///   () is the "unit" type (like void in Go, None in Python)
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Get mutable reference to the registry account
        let registry = &mut ctx.accounts.registry;

        // Set initial values
        // registry.owner = whoever paid to create this registry
        registry.owner = ctx.accounts.payer.key();
        // .key() returns the Pubkey (32-byte address) of the account
        // Analogy: wallet.address in Python Web3.py

        // next_index starts at 0 (counter for future use)
        registry.next_index = 0;

        msg!("Identity registry initialized by {}", registry.owner);
        Ok(())
    }

    /// Register a new identity mapping (Pubkey-based)
    ///
    /// Maps a wallet address to an identity credential.
    ///
    /// Parameters:
    /// - wallet: The Solana wallet address being registered
    /// - identity: The identity credential (e.g., a KYC provider's signature)
    ///
    /// Rust explanation:
    /// - Pubkey = 32-byte array representing a Solana address
    ///   Like bytes32 in Solidity or str in Python (but fixed 32 bytes)
    /// - We push to TWO Vecs to maintain consistency:
    ///   1. registered_addresses: list of all wallets (for quick lookup)
    ///   2. identity_map: list of (wallet, identity) pairs (for data)
    ///   This is like maintaining both a list and an index in a database
    pub fn register_identity(
        ctx: Context<RegisterIdentity>,
        wallet: Pubkey,    // Wallet address to register
        identity: Pubkey,  // Identity credential
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        let caller = ctx.accounts.owner.key();

        // SECURITY CHECK: Prevent duplicate registrations
        // registry.is_registered(&wallet) checks if wallet is already in the list
        // require!(condition, error) = if condition is false, return error
        // Analogy: if wallet in self.registered_addresses: raise ValueError("Already registered")
        require!(!registry.is_registered(&wallet), ErrorCode::WalletAlreadyRegistered);

        // ADD TO REGISTERED ADDRESSES LIST
        // .push() adds to the end of the Vec (O(1) amortized)
        // Like Python's: self.registered_addresses.append(wallet)
        // Or Go's: self.RegisteredAddresses = append(self.RegisteredAddresses, wallet)
        registry.registered_addresses.push(wallet);

        // ADD TO IDENTITY MAP
        // Create a new IdentityEntry struct and push it
        // IdentityEntry { wallet, identity } is shorthand for:
        // IdentityEntry { wallet: wallet, identity: identity }
        // (Rust's "field init shorthand" when variable name matches field name)
        registry.identity_map.push(IdentityEntry {
            wallet,    // Shorthand for: wallet: wallet
            identity,  // Shorthand for: identity: identity
        });

        // INCREMENT COUNTER
        // next_index is like an auto-increment ID in databases
        // Used for:
        // - Tracking registration order
        // - Versioning and auditing
        // Note: IdentityEntry doesn't store index; use next_index for sequential tracking
        registry.next_index += 1;

        // Emit event for audit trail
        emit!(IdentityRegisteredEvent {
            wallet,
            identity,
            registered_by: caller,
        });

        msg!("Identity registered for wallet: {} (by {})", wallet, caller);
        Ok(())
    }

    /// Register a new identity with string-based identity data (MEDIUM-01: with length validation)
    ///
    /// Maps a wallet address to a detailed identity record with string fields.
    /// This function validates all string lengths to prevent excessive storage usage.
    ///
    /// Parameters:
    /// - wallet: The Solana wallet address being registered
    /// - name: Human-readable name (max 32 chars)
    /// - symbol: Short symbol/identifier (max 10 chars)
    /// - identity_data: Additional identity data (max 128 chars)
    /// - metadata_uri: URI to metadata (max 256 chars)
    ///
    /// MEDIUM-01 FIX: All string parameters are validated against maximum lengths
    pub fn register_identity_with_data(
        ctx: Context<RegisterIdentity>,
        wallet: Pubkey,   // Wallet address to register
        name: String,     // Human-readable name
        symbol: String,   // Short symbol
        identity_data: String, // Additional identity data
        metadata_uri: String,  // Metadata URI
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        let caller = ctx.accounts.owner.key();

        // MEDIUM-01: String length validation
        require!(name.len() <= MAX_NAME_LENGTH, ErrorCode::StringTooLong);
        require!(symbol.len() <= MAX_SYMBOL_LENGTH, ErrorCode::StringTooLong);
        require!(identity_data.len() <= MAX_IDENTITY_DATA_LENGTH, ErrorCode::StringTooLong);
        require!(metadata_uri.len() <= MAX_METADATA_URI_LENGTH, ErrorCode::StringTooLong);

        // SECURITY CHECK: Prevent duplicate registrations
        require!(!registry.is_registered(&wallet), ErrorCode::WalletAlreadyRegistered);

        // ADD TO REGISTERED ADDRESSES LIST
        registry.registered_addresses.push(wallet);

        // ADD TO IDENTITY MAP (using wallet as identity key for backward compatibility)
        registry.identity_map.push(IdentityEntry {
            wallet,
            identity: wallet, // Using wallet as identity key; full data stored in events
        });

        // INCREMENT COUNTER
        registry.next_index += 1;

        // Emit event with full identity data for audit trail
        emit!(IdentityRegisteredWithDataEvent {
            wallet,
            name,
            symbol,
            identity_data,
            metadata_uri,
            registered_by: caller,
        });

        msg!("Identity with data registered for wallet: {} (by {})", wallet, caller);
        Ok(())
    }

    /// Update an existing identity mapping
    ///
    /// Changes the identity credential for an already-registered wallet.
    ///
    /// SECURITY: Only the identity owner (wallet) or the registry admin can update.
    /// This prevents unauthorized parties from modifying identity records.
    ///
    /// Parameters:
    /// - wallet: The wallet address to update
    /// - new_identity: The new identity credential
    ///
    /// Rust explanation:
    /// - We iterate through identity_map to find the matching wallet
    /// - .iter_mut() = iterator over mutable references
    ///   This lets us modify entry.identity without taking ownership
    /// - .find() returns the FIRST match (like Python's next(x for x in list if condition))
    /// - .break exits the loop early (optimization: no need to search further)
    pub fn update_identity(
        ctx: Context<UpdateIdentity>,
        wallet: Pubkey,       // Which wallet to update
        new_identity: Pubkey, // New identity value
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        let caller = ctx.accounts.owner.key();

        // SECURITY CHECK: Wallet must be registered
        require!(registry.is_registered(&wallet), ErrorCode::WalletNotRegistered);

        // CRIT-02 FIX: Ownership verification
        // Only the identity owner (wallet) or the registry admin can update the identity
        let is_identity_owner = wallet == caller;
        let is_registry_admin = registry.owner == caller;

        require!(
            is_identity_owner || is_registry_admin,
            ErrorCode::NotIdentityOwner
        );

        // Emit event for audit trail
        emit!(IdentityUpdatedEvent {
            wallet,
            new_identity,
            updated_by: caller,
            is_admin_override: is_registry_admin,
        });

        // FIND AND UPDATE THE ENTRY
        // Iterate through all entries, find the one with matching wallet
        // iter_mut() gives us &mut IdentityEntry (mutable reference)
        for entry in registry.identity_map.iter_mut() {
            if entry.wallet == wallet {
                // Found it! Update the identity
                entry.identity = new_identity;
                break;  // Exit loop (no need to search further)
            }
        }

        msg!("Identity updated for wallet: {} (by {})", wallet, caller);
        Ok(())
    }

    /// Remove an identity mapping
    ///
    /// Deletes the registration for a wallet.
    ///
    /// Parameters:
    /// - wallet: The wallet address to remove
    ///
    /// Rust explanation:
    /// - .retain(|&addr| addr != wallet) = keep only entries where condition is true
    ///   This is like Python's:
    ///   self.registered_addresses = [a for a in self.registered_addresses if a != wallet]
    ///   Or Go's:
    ///   filtered := make([]Pubkey, 0)
    ///   for _, a := range self.RegisteredAddresses {
    ///       if a != wallet { filtered = append(filtered, a) }
    ///   }
    ///   .retain() is more efficient because it modifies in-place
    pub fn remove_identity(
        ctx: Context<RemoveIdentity>,
        wallet: Pubkey,  // Which wallet to remove
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        let caller = ctx.accounts.owner.key();

        // SECURITY CHECK: Wallet must be registered
        require!(registry.is_registered(&wallet), ErrorCode::WalletNotRegistered);

        // CRIT-02 FIX: Ownership verification
        // Only the identity owner (wallet) or the registry admin can remove the identity
        let is_identity_owner = wallet == caller;
        let is_registry_admin = registry.owner == caller;

        require!(
            is_identity_owner || is_registry_admin,
            ErrorCode::NotIdentityOwner
        );

        // Emit event for audit trail
        emit!(IdentityRemovedEvent {
            wallet,
            removed_by: caller,
            was_admin_override: is_registry_admin,
        });

        // REMOVE FROM REGISTERED ADDRESSES
        // Keep only addresses that don't match the wallet
        registry.registered_addresses.retain(|&addr| addr != wallet);
        // |&addr| is a closure:
        //   &addr = pattern matching to dereference (we get Pubkey, not &Pubkey)
        //   addr != wallet = the condition (keep if NOT equal)

        // REMOVE FROM IDENTITY MAP
        // Keep only entries where wallet doesn't match
        registry.identity_map.retain(|entry| entry.wallet != wallet);
        // Note: entry is &IdentityEntry (mutable reference)
        // entry.wallet accesses the wallet field through the reference
        // Rust automatically dereferences (like Python's implicit deref)

        msg!("Identity removed for wallet: {} (by {})", wallet, caller);
        Ok(())
    }

    /// Get the identity for a wallet (read-only query)
    ///
    /// This is a "view" function - it doesn't modify any state.
    /// On Solana, view functions are called with .view() instead of sending a transaction.
    ///
    /// Parameters:
    /// - wallet: The wallet address to look up
    ///
    /// Returns: Pubkey = the identity credential, or default (all zeros) if not found
    ///
    /// Rust explanation:
    /// - .view() = calls this function without sending a transaction
    ///   The function runs on a validator, returns data to you
    ///   Like making a GET request instead of POST
    /// - .find() returns Option<&IdentityEntry> (Some(entry) or None)
    /// - .map(|e| e.identity) transforms Option<&IdentityEntry> to Option<Pubkey>
    ///   If Some(entry) -> Some(entry.identity)
    ///   If None -> None (map doesn't apply the function)
    /// - .unwrap_or_default() = if None, return Pubkey::default() (all zeros)
    ///   Like Python's: result if result is not None else PublicKey.default()
    ///   Or Go's: result if result != nil : zeroValue
    pub fn get_identity(ctx: Context<GetIdentity>, wallet: Pubkey) -> Result<Pubkey> {
        // &ctx.accounts.registry = immutable reference (we're only reading)
        let registry = &ctx.accounts.registry;

        // LOOKUP LOGIC:
        // 1. Create iterator over identity_map entries
        // 2. Find first entry where wallet matches
        // 3. If found, extract the identity field
        // 4. If not found, return default Pubkey (all zeros)
        let entry = registry.identity_map.iter()
            .find(|e| e.wallet == wallet);  // Find matching entry (returns Option)

        // Transform Option<&IdentityEntry> to Pubkey
        // .map() = if Some(entry), apply function; if None, return None
        // .unwrap_or_default() = if None, return Pubkey::default() (32 zero bytes)
        Ok(entry.map(|e| e.identity).unwrap_or_default())
    }
}

// =================================================================
// DATA STRUCTURES (On-Chain Storage)
// =================================================================

/// IdentityRegistryState is the main storage account for the identity registry.
/// It holds all registered identities and their mappings.
///
/// Rust explanation:
/// - #[account] = Anchor macro: this struct is stored as a Solana account
/// - The data is serialized to bytes and stored on-chain
/// - Deserialization happens automatically when you fetch the account
#[account]
pub struct IdentityRegistryState {
    pub owner: Pubkey,              // Who created this registry (can manage it)
    pub next_index: u64,            // Counter for future use (like auto-increment ID)
    pub registered_addresses: Vec<Pubkey>,  // List of all registered wallets
    pub identity_map: Vec<IdentityEntry>,   // List of (wallet, identity) pairs
}

/// IdentityEntry stores a single wallet-to-identity mapping.
///
/// Rust explanation:
/// - #[derive(Clone)] = generates .clone() method (copy the struct)
/// - #[derive(AnchorSerialize, AnchorDeserialize)] = generates serialization code
///   Converts struct to/from bytes for Solana storage
///   Like Python's pickle.dumps/pickle.loads or Go's encoding/binary
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct IdentityEntry {
    pub wallet: Pubkey,   // Solana wallet address (32 bytes)
    pub identity: Pubkey, // Identity credential (32 bytes)
}

// =================================================================
// TRAIT IMPLEMENTATIONS (Add methods to existing structs)
// =================================================================

impl IdentityRegistryState {
    /// Check if a wallet is already registered
    ///
    /// Parameters:
    /// - &self = reference to this instance (like 'self' in Python)
    /// - wallet = the Pubkey to look up
    ///
    /// Returns: bool = true if registered, false otherwise
    ///
    /// Rust explanation:
    /// - self.registered_addresses.contains(wallet) checks if Vec contains Pubkey
    ///   Like: wallet in self.registered_addresses in Python
    ///   Or: contains(self.registeredAddresses, wallet) in Go
    /// - This is O(n) where n = number of registered wallets
    ///   For large registries, consider using a different data structure
    pub fn is_registered(&self, wallet: &Pubkey) -> bool {
        self.registered_addresses.contains(wallet)
    }
}

// =================================================================
// ERROR CODES
// =================================================================

#[error_code]  // Anchor macro: generates efficient error codes
pub enum ErrorCode {
    /// Wallet is already registered
    /// Returned when: trying to register a wallet that's already in the registry
    #[msg("Wallet already registered")]
    WalletAlreadyRegistered,

    /// Wallet is not registered
    /// Returned when: trying to update/remove a wallet that's not in the registry
    #[msg("Wallet not registered")]
    WalletNotRegistered,

    /// Caller is not the identity owner or registry admin
    /// Returned when: unauthorized party tries to update or remove an identity
    #[msg("Caller is not the identity owner or registry admin")]
    NotIdentityOwner,

    /// String length exceeds maximum allowed
    /// Returned when: identity_data, name, symbol, or metadata_uri exceeds the maximum length
    #[msg("String length exceeds maximum allowed")]
    StringTooLong,
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
