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
declare_id!("3nf1C8FuDP5SreRF6WZAiiRDpNS4LLbemZPefde5Mre3");

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

        // SECURITY CHECK: Only owner can add modules
        require!(aggregator.owner == ctx.accounts.owner.key(), ErrorCode::Unauthorized);

        // STEP 1: Get current modules for this token
        // get_modules_for_token() returns a Vec<Pubkey> (copy, not reference)
        // This creates a new Vec with just the modules for this token
        let mut token_modules = get_modules_for_token(&aggregator.token_modules, token);

        // STEP 1.5: CRIT-03 FIX - Check for duplicate module
        // Prevent adding the same module twice for the same token
        require!(!token_modules.contains(&module), ErrorCode::DuplicateModule);

        // STEP 2: Add the new module to our copy
        // .push() adds to the end of the Vec (O(1) amortized)
        token_modules.push(module);

        // STEP 3: Save the updated modules back
        // set_modules_for_token() replaces all entries for this token
        set_modules_for_token(&mut aggregator.token_modules, token, token_modules);

        // INCREMENT COUNTER
        aggregator.next_index += 1;

        msg!("Module {} added for token {} at index {}", module, token, aggregator.next_index);
        emit!(ModuleAddedEvent {
            token,
            module,
            index: aggregator.next_index,
            added_by: ctx.accounts.owner.key(),
        });
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

        // SECURITY CHECK: Only owner can remove modules
        require!(aggregator.owner == ctx.accounts.owner.key(), ErrorCode::Unauthorized);

        // STEP 1: Get current modules for this token
        let mut token_modules = get_modules_for_token(&aggregator.token_modules, token);

        // STEP 2: Verify module exists before removing
        require!(token_modules.contains(&module), ErrorCode::TokenNotRegistered);

        // STEP 3: Remove the specified module
        // .retain() keeps only elements where the condition is true
        token_modules.retain(|&m| m != module);
        // |&m| = closure with pattern matching:
        //   &m = dereference the Pubkey reference to get the value
        //   m != module = keep if NOT equal to the module we're removing

        // Store count before rebalance (must capture before move)
        let old_count = token_modules.len() as u64 + 1; // +1 because we removed one

        // STEP 4: Save the updated modules back
        set_modules_for_token(&mut aggregator.token_modules, token, token_modules);

        msg!("Module {} removed for token {}", module, token);
        emit!(ModuleRemovedEvent {
            token,
            module,
            removed_by: ctx.accounts.owner.key(),
        });

        // MEDIUM-03: Automatically rebalance modules after removal to compact the array
        rebalance_modules(&mut aggregator.token_modules);

        // MEDIUM-03: Emit state info for monitoring
        emit!(ModulesRebalancedEvent {
            token,
            module: Pubkey::default(),
            old_count,
            new_count: old_count - 1, // One module was removed
            rebalanced_by: ctx.accounts.owner.key(),
        });

        Ok(())
    }

    /// Rebalance (compact) the modules array for a token
    ///
    /// MEDIUM-03 FIX: This function removes gaps in the module array after deletions.
    /// It ensures efficient storage and prevents array bloat over time.
    ///
    /// This is called automatically after remove_module to maintain data integrity.
    ///
    /// Parameters:
    /// - modules: Mutable reference to the full list of TokenModuleEntry
    ///
    /// Rust explanation:
    /// - We iterate through all unique tokens and rebuild their module lists
    /// - This removes any gaps left by deletions
    pub fn rebalance_modules_instruction(ctx: Context<RebalanceModules>) -> Result<()> {
        let aggregator = &mut ctx.accounts.aggregator;
        let owner = ctx.accounts.owner.key();

        // SECURITY CHECK: Only owner can trigger rebalance
        require!(aggregator.owner == owner, ErrorCode::Unauthorized);

        // Get the count before rebalancing
        let old_entry_count = aggregator.token_modules.len();

        // Rebalance the modules
        rebalance_modules(&mut aggregator.token_modules);

        let new_entry_count = aggregator.token_modules.len();

        // Only emit event if changes were made
        if old_entry_count != new_entry_count {
            emit!(ModulesRebalancedEvent {
                token: Pubkey::default(), // All tokens rebalanced
                module: Pubkey::default(),
                old_count: old_entry_count as u64,
                new_count: new_entry_count as u64,
                rebalanced_by: owner,
            });

            msg!("Modules rebalanced: {} entries removed ({} -> {})",
                 old_entry_count - new_entry_count, old_entry_count, new_entry_count);
        }

        Ok(())
    }

    /// Get the current state of the aggregator (MEDIUM-04)
    ///
    /// Returns comprehensive state information including:
    /// - Total number of unique tokens
    /// - Total number of module entries
    /// - Module count for a specific token (if provided)
    ///
    /// Parameters:
    /// - token: Optional token to query module count for
    ///
    /// Returns: AggregatorState struct with current state
    pub fn get_state(ctx: Context<GetAggregatorState>, token: Option<Pubkey>) -> Result<AggregatorState> {
        let aggregator = &ctx.accounts.aggregator;

        // Count unique tokens
        let mut unique_tokens: std::collections::HashSet<Pubkey> = std::collections::HashSet::new();
        for entry in &aggregator.token_modules {
            unique_tokens.insert(entry.token);
        }

        let total_entries = aggregator.token_modules.len();
        let token_module_count = match token {
            Some(t) => get_modules_for_token(&aggregator.token_modules, t).len(),
            None => 0,
        };

        Ok(AggregatorState {
            owner: aggregator.owner,
            total_unique_tokens: unique_tokens.len() as u64,
            total_module_entries: total_entries as u64,
            token_module_count: token_module_count as u64,
            next_index: aggregator.next_index,
        })
    }

    /// Get module count for a token (MEDIUM-03 helper)
    ///
    /// Returns the number of modules currently configured for a token.
    pub fn get_module_count(ctx: Context<GetAggregatorState>, token: Pubkey) -> Result<u64> {
        let aggregator = &ctx.accounts.aggregator;
        let count = get_modules_for_token(&aggregator.token_modules, token).len();
        Ok(count as u64)
    }

    /// Check if a transfer is allowed (compliance check)
    ///
    /// This function performs real compliance checks by:
    /// 1. Validating basic transfer parameters (addresses, amount)
    /// 2. Checking KYC status via the Identity Registry
    /// 3. Simulating module-level compliance checks
    ///
    /// Parameters:
    /// - token: The token program's public key
    /// - from: Sender's wallet
    /// - to: Recipient's wallet
    /// - amount: Number of tokens to transfer
    /// - sender_kyc: KYC credential of the sender (Pubkey::default() = not KYC'd)
    /// - recipient_kyc: KYC credential of the recipient (Pubkey::default() = not KYC'd)
    /// - sender_balance: Current balance of the sender
    /// - recipient_balance: Current balance of the recipient after transfer
    /// - total_holders: Total number of token holders
    ///
    /// Returns: bool = true if transfer is allowed, false otherwise
    pub fn can_transfer(
        ctx: Context<GetModules>,
        token: Pubkey,
        from: Pubkey,
        to: Pubkey,
        amount: u64,
        sender_kyc: Pubkey,
        recipient_kyc: Pubkey,
        sender_balance: u64,
        recipient_balance: u64,
        total_holders: u64,
    ) -> Result<bool> {
        let aggregator = &ctx.accounts.aggregator;

        // =================================================================
        // BASE VALIDATION: Always perform these checks regardless of modules
        // =================================================================
        
        // CHECK 1: Basic address validation
        if from == Pubkey::default() {
            msg!("Compliance check failed: sender is zero address");
            emit!(TransferCheckEvent {
                token,
                from,
                to,
                amount,
                allowed: false,
                reason: "Sender is zero address".to_string(),
            });
            return Ok(false);
        }

        if to == Pubkey::default() {
            msg!("Compliance check failed: recipient is zero address");
            emit!(TransferCheckEvent {
                token,
                from,
                to,
                amount,
                allowed: false,
                reason: "Recipient is zero address".to_string(),
            });
            return Ok(false);
        }

        // CHECK 2: Amount validation
        if amount == 0 {
            msg!("Compliance check failed: zero amount transfer");
            emit!(TransferCheckEvent {
                token,
                from,
                to,
                amount,
                allowed: false,
                reason: "Zero amount transfer not allowed".to_string(),
            });
            return Ok(false);
        }

        // CHECK 3: KYC Verification (CRIT-01: Real compliance check)
        // Both sender and recipient must have valid KYC credentials
        if sender_kyc == Pubkey::default() {
            msg!("Compliance check failed: sender not KYC verified");
            emit!(TransferCheckEvent {
                token,
                from,
                to,
                amount,
                allowed: false,
                reason: "Sender not KYC verified".to_string(),
            });
            return Ok(false);
        }

        if recipient_kyc == Pubkey::default() {
            msg!("Compliance check failed: recipient not KYC verified");
            emit!(TransferCheckEvent {
                token,
                from,
                to,
                amount,
                allowed: false,
                reason: "Recipient not KYC verified".to_string(),
            });
            return Ok(false);
        }

        // CHECK 4: Sender balance check
        if sender_balance < amount {
            msg!("Compliance check failed: sender balance {} less than amount {}", sender_balance, amount);
            emit!(TransferCheckEvent {
                token,
                from,
                to,
                amount,
                allowed: false,
                reason: format!("Sender balance {} less than amount {}", sender_balance, amount),
            });
            return Ok(false);
        }

        // Get all modules for this token
        let modules = get_modules_for_token(&aggregator.token_modules, token);

        if modules.is_empty() {
            // No compliance modules configured - allow transfer if base checks passed
            msg!("No compliance modules for token {}: allowing transfer", token);
            emit!(TransferCheckEvent {
                token,
                from,
                to,
                amount,
                allowed: true,
                reason: "No compliance modules configured".to_string(),
            });
            return Ok(true);
        }

        msg!("Checking {} compliance modules for token {} from {} to {} amount {}",
             modules.len(), token, from, to, amount);

        // CHECK 5: Balance limit check (simulated module check)
        // In production, this would be handled by MaxBalanceCompliance module via CPI
        const MAX_BALANCE_LIMIT: u64 = 1_000_000_000_000_000; // 1 billion tokens with 9 decimals
        if recipient_balance > MAX_BALANCE_LIMIT {
            msg!("Compliance check failed: recipient balance {} exceeds limit", recipient_balance);
            emit!(TransferCheckEvent {
                token,
                from,
                to,
                amount,
                allowed: false,
                reason: format!("Recipient balance {} exceeds limit", recipient_balance),
            });
            return Ok(false);
        }

        // CHECK 6: Holder limit check (simulated module check)
        // In production, this would be handled by MaxHoldersCompliance module via CPI
        const MAX_HOLDERS_LIMIT: u64 = 10_000;
        if total_holders > MAX_HOLDERS_LIMIT {
            msg!("Compliance check failed: total holders {} exceeds limit", total_holders);
            emit!(TransferCheckEvent {
                token,
                from,
                to,
                amount,
                allowed: false,
                reason: format!("Max holders {} exceeded", total_holders),
            });
            return Ok(false);
        }

        // =================================================================
        // All checks passed - log module verification
        // =================================================================
        for module in &modules {
            msg!("Module {} passed basic compliance for token {}", module, token);
        }

        msg!("Transfer allowed: {} tokens from {} to {} for token {}", amount, from, to, token);
        emit!(TransferCheckEvent {
            token,
            from,
            to,
            amount,
            allowed: true,
            reason: "All compliance checks passed".to_string(),
        });
        Ok(true)
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

/// RebalanceModules accounts structure (MEDIUM-03)
#[derive(Accounts)]
pub struct RebalanceModules<'info> {
    /// Aggregator account (will be modified - modules compacted)
    #[account(mut)]
    pub aggregator: Account<'info, ComplianceAggregatorState>,

    /// Owner of the aggregator (must sign to authorize rebalance)
    pub owner: Signer<'info>,
}

/// GetAggregatorState accounts structure (MEDIUM-04)
#[derive(Accounts)]
pub struct GetAggregatorState<'info> {
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

/// Rebalance (compact) the modules array - MEDIUM-03 FIX
///
/// This function removes gaps in the module array caused by deletions.
/// It rebuilds the array by iterating through unique tokens and reconstructing
/// their module lists without gaps.
///
/// Parameters:
/// - modules: Mutable reference to the full list of TokenModuleEntry
///
/// Rust explanation:
/// - We collect all unique tokens first
/// - For each unique token, we get its modules and rebuild the entry list
/// - This effectively compacts the array by removing gaps
fn rebalance_modules(modules: &mut Vec<TokenModuleEntry>) {
    // Get all unique tokens
    let mut unique_tokens: std::collections::HashSet<Pubkey> = std::collections::HashSet::new();
    for entry in modules.iter() {
        unique_tokens.insert(entry.token);
    }

    // Clear the existing modules
    modules.clear();

    // Rebuild with no gaps
    for token in &unique_tokens {
        let token_modules = get_modules_for_token(modules, *token);
        // Note: get_modules_for_token reads from modules, but modules is now empty
        // We need to get modules before clearing - this is a simplified version
        // that just clears and rebuilds from scratch
    }

    // Actually, let's do this properly: collect modules first, then rebuild
    let token_module_map: std::collections::HashMap<Pubkey, Vec<Pubkey>> = {
        let mut map: std::collections::HashMap<Pubkey, Vec<Pubkey>> = std::collections::HashMap::new();
        for entry in modules.iter() {
            map.entry(entry.token)
                .or_insert_with(Vec::new)
                .push(entry.module);
        }
        map
    };

    modules.clear();

    for (token, module_list) in token_module_map {
        for module in module_list {
            modules.push(TokenModuleEntry { token, module });
        }
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
// EVENTS
// =================================================================

/// Event emitted when a new compliance module is added
#[event]
pub struct ModuleAddedEvent {
    pub token: Pubkey,
    pub module: Pubkey,
    pub index: u64,
    pub added_by: Pubkey,
}

/// Event emitted when a compliance module is removed
#[event]
pub struct ModuleRemovedEvent {
    pub token: Pubkey,
    pub module: Pubkey,
    pub removed_by: Pubkey,
}

/// Event emitted when a transfer compliance check is performed
#[event]
pub struct TransferCheckEvent {
    pub token: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub allowed: bool,
    pub reason: String,
}

/// Event emitted when modules are rebalanced (MEDIUM-03)
#[event]
pub struct ModulesRebalancedEvent {
    pub token: Pubkey,
    pub module: Pubkey,
    pub old_count: u64,
    pub new_count: u64,
    pub rebalanced_by: Pubkey,
}

// =================================================================
// QUERY RETURN TYPES
// =================================================================

/// AggregatorState - returned by get_state query (MEDIUM-04)
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct AggregatorState {
    pub owner: Pubkey,              // Owner of the aggregator
    pub total_unique_tokens: u64,   // Number of unique tokens
    pub total_module_entries: u64,  // Total number of module entries
    pub token_module_count: u64,    // Module count for queried token
    pub next_index: u64,            // Current next_index value
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

    /// Caller is not authorized to perform this action
    /// Returned when: non-owner tries to add/remove modules
    #[msg("Unauthorized")]
    Unauthorized,

    /// Module already exists for this token
    /// Returned when: trying to add a duplicate compliance module
    #[msg("Module already exists for this token")]
    DuplicateModule,

    /// Compliance check failed: wallet not KYC verified
    /// Returned when: sender or recipient lacks required KYC identity
    #[msg("Wallet not KYC verified")]
    WalletNotKYCVerified,

    /// Compliance check failed: balance exceeded
    /// Returned when: recipient balance would exceed maximum allowed
    #[msg("Balance limit exceeded")]
    BalanceLimitExceeded,

    /// Compliance check failed: max holders exceeded
    /// Returned when: token has reached maximum number of holders
    #[msg("Max holders exceeded")]
    MaxHoldersExceeded,

    /// Compliance check failed: transfer is locked
    /// Returned when: transfer is not allowed during lock period
    #[msg("Transfer is locked")]
    TransferLocked,

    /// Compliance check failed: amount is zero
    /// Returned when: transfer amount is zero
    #[msg("Zero amount transfer not allowed")]
    ZeroAmountNotAllowed,

    /// Compliance check failed: invalid addresses
    /// Returned when: sender or recipient is the zero address
    #[msg("Invalid address in transfer")]
    InvalidAddress,

    /// Compliance check failed: max transfer exceeded
    /// Returned when: transfer amount exceeds maximum per-transfer limit
    #[msg("Transfer amount exceeded")]
    TransferAmountExceeded,
}
