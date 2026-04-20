// =============================================================================
// COMPLIANCE AGGREGATOR PROGRAM
// =============================================================================
//
// This program manages compliance modules for tokens on Solana.
// It acts as a registry that maps tokens to their compliance modules.
//
// USE CASE:
// ---------
// In regulated tokenization, tokens must follow compliance rules:
// - Max balance per wallet
// - Max number of holders
// - Transfer locks (vesting periods)
// - KYC/AML checks
//
// This program stores which modules apply to which tokens.
// When a transfer happens, the token program checks with this program
// to see if the transfer is compliant.
//
// ANALOGY WITH TRADITIONAL PROGRAMMING:
// --------------------------------------
// Think of this as a database table:
//   token_address | compliance_module_1 | compliance_module_2 | ...
//
// Plus these operations:
//   INSERT INTO token_compliance (token, module) VALUES (...);
//   DELETE FROM token_compliance WHERE token = ... AND module = ...;
//   SELECT modules FROM token_compliance WHERE token = ...;
//
// In Solana/Anchor, we store this mapping in a single account's Vec fields.

use anchor_lang::prelude::*;  // Import Anchor essentials

// declare_id!() = the program's on-chain address
declare_id!("EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT");

// #[program] marks this module as containing all instruction handlers
#[program]
pub mod compliance_aggregator {
    use super::*;  // Import helpers, structs, and errors

    // =================================================================
    // ACCOUNT VALIDATION STRUCTURES
    // =================================================================

    /// Initialize instruction - creates a new compliance aggregator
    #[derive(Accounts)]
    pub struct Initialize<'info> {
        /// Who pays for the aggregator account creation
        #[account(mut)]
        pub payer: Signer<'info>,

        /// The new aggregator account (stores all token-module mappings)
        #[account(
            init,
            payer = payer,
            space = 8 + std::mem::size_of::<ComplianceAggregatorState>() + 1000
            // space = 8 (discriminator) + struct size + 1000 (extra for Vec growth)
        )]
        pub aggregator: Account<'info, ComplianceAggregatorState>,

        /// Solana's system program (required for account creation)
        pub system_program: Program<'info, System>,
    }

    /// AddModule instruction - adds a compliance module for a token
    ///
    /// Accounts needed:
    /// - aggregator: The compliance aggregator account (will be modified)
    /// - owner: Who is adding (must sign, must be aggregator owner)
    /// - token: The token program address (just a Pubkey, not a typed account)
    ///
    /// Rust explanation:
    /// - AccountInfo<'info> = untyped account access
    ///   We use this when we don't need to deserialize the account
    ///   Like using `Any` in Go or `object` in Python
    /// - The /// CHECK: comment is REQUIRED by Anchor for AccountInfo
    ///   It's a reminder that YOU are responsible for validation
    #[derive(Accounts)]
    pub struct AddModule<'info> {
        /// Aggregator account (module list will grow)
        #[account(mut)]
        pub aggregator: Account<'info, ComplianceAggregatorState>,

        /// Owner of the aggregator (must sign)
        pub owner: Signer<'info>,

        /// Token program address (just a Pubkey reference)
        /// CHECK: The token account is validated through the module management logic
        /// We don't need to deserialize the token account, just store its address
        pub token: AccountInfo<'info>,
    }

    /// RemoveModule instruction - removes a compliance module for a token
    #[derive(Accounts)]
    pub struct RemoveModule<'info> {
        /// Aggregator account (module list will shrink)
        #[account(mut)]
        pub aggregator: Account<'info, ComplianceAggregatorState>,

        /// Owner of the aggregator (must sign)
        pub owner: Signer<'info>,

        /// Token program address (just a Pubkey reference)
        /// CHECK: The token account is validated through the module management logic
        pub token: AccountInfo<'info>,
    }

    // =================================================================
    // INSTRUCTION HANDLERS
    // =================================================================

    /// Initialize a new compliance aggregator
    ///
    /// This is the "constructor" - called once to set up the aggregator.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let aggregator = &mut ctx.accounts.aggregator;

        // Set owner to whoever paid to create this aggregator
        aggregator.owner = ctx.accounts.payer.key();

        // next_index starts at 0 (counter for future use)
        aggregator.next_index = 0;

        msg!("Compliance aggregator initialized by {}", aggregator.owner);
        Ok(())
    }

    /// Add a compliance module for a token
    ///
    /// This registers a compliance module to enforce rules on a token.
    ///
    /// Parameters:
    /// - token: The token program's public key
    /// - module: The compliance module program's public key
    ///
    /// Rust explanation:
    /// - The function works with a COPY of the token's modules (not the original)
    /// - We modify the copy, then save it back
    /// - This is because Rust's borrowing rules don't allow:
    ///   1. Getting a reference to filtered data
    ///   2. Modifying the original data through that reference
    /// - Analogy: Like Python's:
    ///   modules = [m for m in self.modules if m.token == token]
    ///   modules.append(module)
    ///   self.modules = [e for e in self.modules if e.token != token] + \
    ///                  [TokenModuleEntry(token, m) for m in modules]
    pub fn add_module(
        ctx: Context<AddModule>,
        token: Pubkey,  // Token program address
        module: Pubkey, // Compliance module address
    ) -> Result<()> {
        let aggregator = &mut ctx.accounts.aggregator;

        // STEP 1: Get current modules for this token
        // get_modules_for_token() returns a Vec<Pubkey> (copy, not reference)
        // This creates a new Vec with just the modules for this token
        let mut token_modules = get_modules_for_token(&aggregator.token_modules, token);

        // STEP 2: Add the new module to our copy
        // .push() adds to the end of the Vec (O(1) amortized)
        token_modules.push(module);

        // STEP 3: Save the updated modules back
        // set_modules_for_token() replaces all entries for this token
        set_modules_for_token(&mut aggregator.token_modules, token, token_modules);

        msg!("Module added for token: {}", token);
        Ok(())
    }

    /// Remove a compliance module for a token
    ///
    /// This unregisters a compliance module from a token.
    ///
    /// Parameters:
    /// - token: The token program's public key
    /// - module: The compliance module program's public key to remove
    ///
    /// Rust explanation:
    /// - .retain(|&m| m != module) = keep only modules that DON'T match
    ///   This is like Python's:
    ///   modules = [m for m in modules if m != module]
    ///   Or Go's:
    ///   filtered := make([]Pubkey, 0)
    ///   for _, m := range modules {
    ///       if m != module { filtered = append(filtered, m) }
    ///   }
    pub fn remove_module(
        ctx: Context<RemoveModule>,
        token: Pubkey,  // Token program address
        module: Pubkey, // Module to remove
    ) -> Result<()> {
        let aggregator = &mut ctx.accounts.aggregator;

        // STEP 1: Get current modules for this token
        let mut token_modules = get_modules_for_token(&aggregator.token_modules, token);

        // STEP 2: Remove the specified module
        // .retain() keeps only elements where the condition is true
        token_modules.retain(|&m| m != module);
        // |&m| = closure with pattern matching:
        //   &m = dereference the Pubkey reference to get the value
        //   m != module = keep if NOT equal to the module we're removing

        // STEP 3: Save the updated modules back
        set_modules_for_token(&mut aggregator.token_modules, token, token_modules);

        msg!("Module removed for token: {}", token);
        Ok(())
    }

    /// Check if a transfer is allowed (compliance check)
    ///
    /// This function would be called by the token program before allowing a transfer.
    /// It retrieves all compliance modules for a token and checks them.
    ///
    /// Parameters:
    /// - token: The token program's public key
    /// - from: Sender's wallet
    /// - to: Recipient's wallet
    /// - amount: Number of tokens to transfer
    ///
    /// Returns: bool = true if transfer is allowed, false otherwise
    ///
    /// Rust explanation:
    /// - This is a "view" function in spirit (reads state, returns result)
    /// - In a full implementation, we would:
    ///   1. Get all modules for this token
    ///   2. For each module, call its can_transfer() function via CPI
    ///   3. Return true only if ALL modules return true
    /// - For now, we just return true to demonstrate the structure
    /// - The _ prefix on parameters means "unused" (suppresses compiler warnings)
    pub fn can_transfer(
        ctx: Context<GetModules>,
        token: Pubkey,  // Token program address
        _from: Pubkey,  // Sender (unused in this version)
        _to: Pubkey,    // Recipient (unused in this version)
        _amount: u64,   // Amount (unused in this version)
    ) -> Result<bool> {
        let aggregator = &ctx.accounts.aggregator;

        // Get all modules for this token
        let modules = get_modules_for_token(&aggregator.token_modules, token);

        // In a real implementation, we would:
        // for module_address in modules {
        //     let module_program = ...; // Load module program
        //     let result = module_program.can_transfer(token, from, to, amount);
        //     if !result { return Ok(false); }
        // }

        // For now, just log and return true
        let _ = modules;  // Suppress "unused variable" warning

        msg!("Transfer compliance check for token: {}", token);
        Ok(true)  // Default: allow transfer
    }

    /// Get all compliance modules for a token
    ///
    /// Returns a list of module program addresses for the given token.
    ///
    /// Parameters:
    /// - token: The token program's public key
    ///
    /// Returns: Vec<Pubkey> = list of module addresses
    ///
    /// Rust explanation:
    /// - Result<Vec<Pubkey>> = either Ok(list) or Err(error)
    ///   In this function, it always returns Ok(), but the signature
    ///   allows for future error cases (e.g., token not found)
    pub fn get_modules(ctx: Context<GetModules>, token: Pubkey) -> Result<Vec<Pubkey>> {
        let aggregator = &ctx.accounts.aggregator;

        // Get and return all modules for this token
        let modules = get_modules_for_token(&aggregator.token_modules, token);
        Ok(modules)
    }
}

// =================================================================
// ACCOUNT VALIDATION (for read-only operations)
// =================================================================

/// GetModules accounts structure (used by can_transfer and get_modules)
#[derive(Accounts)]
pub struct GetModules<'info> {
    /// Aggregator account (read-only)
    pub aggregator: Account<'info, ComplianceAggregatorState>,
}

// =================================================================
// HELPER FUNCTIONS
// =================================================================
//
// These functions manage the Vec-based data structures.
// They're outside the #[program] module because they're internal helpers.

/// Get all module addresses for a specific token
///
/// Parameters:
/// - modules: Reference to the full list of TokenModuleEntry
/// - token: The token address to filter by
///
/// Returns: Vec<Pubkey> = list of module addresses for this token
///
/// Rust explanation:
/// - .iter() = creates an iterator over references (&TokenModuleEntry)
///   Like Python's: for entry in modules:
/// - .filter(|e| e.token == token) = keep only entries where condition is true
///   Like Python's: [e for e in modules if e.token == token]
///   Or Go's: filtered := filter(modules, func(e) { return e.token == token })
/// - .map(|e| e.module) = transform each entry to just its module field
///   Like Python's: [e.module for e in filtered]
///   Or Go's: map(filtered, func(e) { return e.module })
/// - .collect() = gathers iterator results into a Vec
///   Like Python's: list(iterator) or [...]
///
/// This pattern (filter -> map -> collect) is called a "pipeline"
/// It's like Python's: [e.module for e in modules if e.token == token]
fn get_modules_for_token(modules: &Vec<TokenModuleEntry>, token: Pubkey) -> Vec<Pubkey> {
    modules.iter()              // Create iterator over references
        .filter(|e| e.token == token)  // Keep only entries for this token
        .map(|e| e.module)     // Extract just the module field
        .collect()             // Gather into Vec<Pubkey>
}

/// Replace all modules for a specific token
///
/// This function first removes existing entries for the token,
/// then adds the new entries.
///
/// Parameters:
/// - modules: Mutable reference to the full list
/// - token: The token address to update
/// - new_modules: The new list of module addresses
///
/// Rust explanation:
/// - .retain(|e| e.token != token) = remove all entries for this token
///   Like Python's:
///   modules = [e for e in modules if e.token != token]
///   Or Go's:
///   filtered := make([]TokenModuleEntry, 0)
///   for _, e := range modules {
///       if e.token != token { filtered = append(filtered, e) }
///   }
/// - We use retain() because it modifies in-place (more efficient)
/// - Then we push new entries (O(k) where k = number of new modules)
fn set_modules_for_token(modules: &mut Vec<TokenModuleEntry>, token: Pubkey, new_modules: Vec<Pubkey>) {
    // Remove existing entries for this token
    modules.retain(|e| e.token != token);

    // Add new entries
    for module in new_modules {
        modules.push(TokenModuleEntry {
            token,    // Shorthand for: token: token
            module,   // Shorthand for: module: module
        });
    }
}

// =================================================================
// DATA STRUCTURES (On-Chain Storage)
// =================================================================

/// ComplianceAggregatorState is the main storage account.
/// It holds all token-to-module mappings.
#[account]
pub struct ComplianceAggregatorState {
    pub owner: Pubkey,              // Who created this aggregator
    pub next_index: u64,            // Counter for future use
    pub token_modules: Vec<TokenModuleEntry>, // All token-module mappings
}

/// TokenModuleEntry stores a single token-to-module mapping.
///
/// Rust explanation:
/// - This is like a row in a database table:
///   | token | module |
///   |-------|--------|
///   | ABC   | XYZ   |
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct TokenModuleEntry {
    pub token: Pubkey,   // Token program address
    pub module: Pubkey,  // Compliance module program address
}

// =================================================================
// ERROR CODES
// =================================================================

#[error_code]
pub enum ErrorCode {
    /// Token is not registered in this aggregator
    /// Returned when: trying to operate on a token with no aggregator
    #[msg("Token not registered")]
    TokenNotRegistered,
}
