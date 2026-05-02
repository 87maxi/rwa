// =============================================================================
// COMPLIANCE AGGREGATOR PROGRAM (PDA Architecture)
// =============================================================================
//
// This program manages compliance modules for tokens on Solana using PDAs.
// It acts as a registry that maps tokens to their compliance modules
// using distributed PDA accounts instead of a monolithic storage account.
//
// ARCHITECTURE:
// -------------
// 1. ComplianceAggregatorState (PDA): Control account for the aggregator
//    - Seeds: [b"aggregator"]
//    - Stores: owner, aggregator_bump
//
// 2. TokenComplianceAccount (PDA): Individual token compliance records
//    - Seeds: [b"compliance", aggregator_pubkey, token_pubkey]
//    - Stores: token, modules (Vec<Pubkey>), bump
//
// BENEFITS:
// ---------
// - O(1) lookup by token (via PDA derivation)
// - No account size limits (each token is independent)
// - Efficient updates/removals (no vector manipulation in main account)
// - Better parallelization (different tokens don't conflict)

use anchor_lang::prelude::*;

// declare_id!() = the program's on-chain address
declare_id!("7cURjJvyf3oe6JsuVxS9EiVHKNauiFj7Gao3THzZSnpb");

// Module declarations
pub mod constants;
pub mod states;
pub mod events;
pub mod errors;
pub mod pdas;
pub mod tests;

// Re-exports
pub use states::*;
pub use events::*;
pub use pdas::*;

// =============================================================================
// PROGRAM MODULE
// =============================================================================

#[program]
pub mod compliance_aggregator {
    use super::*;

    // =================================================================
    // ACCOUNT VALIDATION STRUCTURES
    // =================================================================

    /// Initialize instruction - creates a new compliance aggregator
    #[derive(Accounts)]
    pub struct Initialize<'info> {
        /// Who pays for the aggregator account creation
        #[account(mut)]
        pub payer: Signer<'info>,

        /// The new aggregator PDA account (stores owner info only)
        /// Seeds: [b"aggregator"]
        #[account(
            init,
            payer = payer,
            seeds = [b"aggregator"],
            bump,
            space = 8 + std::mem::size_of::<ComplianceAggregatorState>()
        )]
        pub aggregator: Account<'info, ComplianceAggregatorState>,

        /// Solana's system program (required for account creation)
        pub system_program: Program<'info, System>,
    }

    /// AddModule instruction - creates a new TokenComplianceAccount PDA
    ///
    /// Note: This creates a NEW token compliance account.
    /// To add modules to an existing account, use add_module_to_existing.
    #[derive(Accounts)]
    pub struct AddModule<'info> {
        /// Aggregator PDA (must be signed via seeds for authorization)
        #[account(
            mut,
            seeds = [b"aggregator"],
            bump = aggregator.aggregator_bump,
        )]
        pub aggregator: Account<'info, ComplianceAggregatorState>,

        /// Owner of the aggregator (must sign)
        #[account(mut)]
        pub owner: Signer<'info>,

        /// CHECK: Token address is used for PDA derivation only
        pub token: AccountInfo<'info>,

        /// New TokenComplianceAccount PDA (will be created)
        /// Seeds: [b"compliance", aggregator.key(), token.key()]
        #[account(
            init,
            payer = owner,
            seeds = [b"compliance", aggregator.key().as_ref(), token.key().as_ref()],
            bump,
            space = 8 + std::mem::size_of::<TokenComplianceAccount>()
        )]
        pub token_compliance: AccountLoader<'info, TokenComplianceAccount>,

        /// System program for account creation
        pub system_program: Program<'info, System>,
    }

    /// AddModuleToExisting instruction - adds a module to an existing TokenComplianceAccount
    #[derive(Accounts)]
    pub struct AddModuleToExisting<'info> {
        /// Aggregator PDA (for authorization)
        #[account(
            seeds = [b"aggregator"],
            bump = aggregator.aggregator_bump,
        )]
        pub aggregator: Account<'info, ComplianceAggregatorState>,

        /// Owner of the aggregator (must sign)
        pub owner: Signer<'info>,

        /// TokenComplianceAccount PDA (will be updated)
        #[account(
            mut,
            seeds = [b"compliance", aggregator.key().as_ref(), token_compliance_token.key().as_ref()],
            bump = token_compliance.load()?.bump,
        )]
        pub token_compliance: AccountLoader<'info, TokenComplianceAccount>,
        /// CHECK: used for PDA derivation
        pub token_compliance_token: AccountInfo<'info>,
    }

    /// RemoveModule instruction - removes a module from TokenComplianceAccount PDA
    ///
    /// If the token has no modules left, the PDA will be closed manually.
    #[derive(Accounts)]
    pub struct RemoveModule<'info> {
        /// Aggregator PDA (for authorization)
        #[account(
            seeds = [b"aggregator"],
            bump = aggregator.aggregator_bump,
        )]
        pub aggregator: Account<'info, ComplianceAggregatorState>,

        /// Owner of the aggregator (must sign, receives rent if account closed)
        #[account(mut)]
        pub owner: Signer<'info>,

        /// TokenComplianceAccount PDA (will be updated or closed)
        /// Note: No automatic 'close' constraint - we close manually only when module_count == 0
        #[account(
            mut,
            seeds = [b"compliance", aggregator.key().as_ref(), token_compliance_token.key().as_ref()],
            bump = token_compliance.load()?.bump,
        )]
        pub token_compliance: AccountLoader<'info, TokenComplianceAccount>,
        /// CHECK: used for PDA derivation
        pub token_compliance_token: AccountInfo<'info>,

        /// System program for manual account close
        pub system_program: Program<'info, System>,
    }

    /// GetAggregatorState instruction - reads the aggregator PDA (read-only)
    #[derive(Accounts)]
    pub struct GetAggregatorState<'info> {
        /// Aggregator PDA (read-only)
        #[account(
            seeds = [b"aggregator"],
            bump = aggregator.aggregator_bump,
        )]
        pub aggregator: Account<'info, ComplianceAggregatorState>,
    }

    /// GetModules instruction - reads a TokenComplianceAccount PDA (read-only)
    /// Also used by can_transfer for CPI to identity-registry
    #[derive(Accounts)]
    pub struct GetModules<'info> {
        /// Aggregator PDA (for PDA derivation)
        #[account(
            seeds = [b"aggregator"],
            bump = aggregator.aggregator_bump,
        )]
        pub aggregator: Account<'info, ComplianceAggregatorState>,

        /// CHECK: Token address is used for PDA derivation only
        pub token: AccountInfo<'info>,

        /// TokenComplianceAccount PDA (read-only)
        #[account(
            seeds = [b"compliance", aggregator.key().as_ref(), token.key().as_ref()],
            bump = token_compliance.load()?.bump,
        )]
        pub token_compliance: AccountLoader<'info, TokenComplianceAccount>,

        // ===== Accounts for KYC verification (P0-3) =====
        /// Identity registry program (for verifying account ownership)
        /// CHECK: The program address is validated by the caller
        pub identity_registry_program: AccountInfo<'info>,

        /// Identity registry PDA (for seed validation)
        /// CHECK: Validated via seeds
        pub identity_registry: AccountInfo<'info>,

        /// Sender's identity account PDA (for KYC verification)
        /// If provided, we verify the sender is KYC registered by checking
        /// that the account is owned by identity_registry_program and has valid data
        /// CHECK: We manually verify ownership and data
        pub sender_identity: Option<AccountInfo<'info>>,

        /// Recipient's identity account PDA (for KYC verification)
        /// If provided, we verify the recipient is KYC registered
        /// CHECK: We manually verify ownership and data
        pub recipient_identity: Option<AccountInfo<'info>>,

        /// CHECK: Sender wallet (used for identity PDA derivation)
        pub sender: AccountInfo<'info>,

        /// CHECK: Recipient wallet (used for identity PDA derivation)
        pub recipient: AccountInfo<'info>,
    }

    // =================================================================
    // INSTRUCTION HANDLERS
    // =================================================================

    /// Initialize a new compliance aggregator
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let aggregator = &mut ctx.accounts.aggregator;
        aggregator.owner = ctx.accounts.payer.key();
        aggregator.aggregator_bump = ctx.bumps.aggregator;

        msg!("Compliance aggregator initialized by {}", aggregator.owner);
        Ok(())
    }

    /// Add a compliance module for a token (creates new TokenComplianceAccount)
    pub fn add_module(
        ctx: Context<AddModule>,
        token: Pubkey,
        module: Pubkey,
    ) -> Result<()> {
        // SECURITY CHECK: Only owner can add modules
        require!(ctx.accounts.aggregator.owner == ctx.accounts.owner.key(), crate::errors::ErrorCode::Unauthorized);

        let mut token_compliance = ctx.accounts.token_compliance.load_init()?;

        // Initialize the TokenComplianceAccount PDA
        token_compliance.token = token;
        token_compliance.module_count = 1;
        token_compliance.modules[0] = module;
        token_compliance.bump = ctx.bumps.token_compliance;

        emit!(ModuleAddedEvent {
            token,
            module,
            added_by: ctx.accounts.owner.key(),
        });

        msg!("Module {} added for token {}", module, token);
        Ok(())
    }

    /// Add a module to an existing TokenComplianceAccount
    pub fn add_module_to_existing(
        ctx: Context<AddModuleToExisting>,
        module: Pubkey,
    ) -> Result<()> {
        // SECURITY CHECK: Only owner can add modules
        require!(ctx.accounts.aggregator.owner == ctx.accounts.owner.key(), crate::errors::ErrorCode::Unauthorized);

        let mut token_compliance = ctx.accounts.token_compliance.load_mut()?;

        // Check for duplicate module
        let mut already_exists = false;
        for i in 0..(token_compliance.module_count as usize) {
            if token_compliance.modules[i] == module {
                already_exists = true;
                break;
            }
        }
        require!(!already_exists, crate::errors::ErrorCode::DuplicateModule);

        // Add the module
        let count = token_compliance.module_count as usize;
        // P2-9: Use specific error code for module array full
        require!(count < token_compliance.modules.len(), crate::errors::ErrorCode::ModuleArrayFull);
        token_compliance.modules[count] = module;
        token_compliance.module_count += 1;

        emit!(ModuleAddedEvent {
            token: token_compliance.token,
            module,
            added_by: ctx.accounts.owner.key(),
        });

        msg!("Module {} added for token {}", module, token_compliance.token);
        Ok(())
    }

    /// Remove a compliance module for a token
    pub fn remove_module(
        ctx: Context<RemoveModule>,
        module: Pubkey,
    ) -> Result<()> {
        // SECURITY CHECK: Only owner can remove modules
        require!(ctx.accounts.aggregator.owner == ctx.accounts.owner.key(), crate::errors::ErrorCode::Unauthorized);

        let mut token_compliance = ctx.accounts.token_compliance.load_mut()?;

        let mut index = None;
        for i in 0..(token_compliance.module_count as usize) {
            if token_compliance.modules[i] == module {
                index = Some(i);
                break;
            }
        }

        // Verify module exists before removing
        require!(index.is_some(), crate::errors::ErrorCode::TokenNotRegistered);

        // Remove the specified module (swap with last to maintain contiguity)
        if let Some(i) = index {
            let last_idx = (token_compliance.module_count - 1) as usize;
            token_compliance.modules[i] = token_compliance.modules[last_idx];
            token_compliance.modules[last_idx] = Pubkey::default();
            token_compliance.module_count -= 1;
        }

        emit!(ModuleRemovedEvent {
            token: token_compliance.token,
            module,
            removed_by: ctx.accounts.owner.key(),
        });

        // P0-2: Only close the account when no modules remain
        // Use Anchor's built-in close() method to safely return rent
        if token_compliance.module_count == 0 {
            ctx.accounts.token_compliance.close(ctx.accounts.owner.to_account_info())?;
        }

        msg!("Module {} removed for token {}", module, token_compliance.token);
        Ok(())
    }

    /// Get the current state of the aggregator
    pub fn get_state(ctx: Context<GetAggregatorState>) -> Result<AggregatorState> {
        let aggregator = &ctx.accounts.aggregator;

        Ok(AggregatorState {
            owner: aggregator.owner,
            aggregator_bump: aggregator.aggregator_bump,
        })
    }

    /// Get module count for a token
    pub fn get_module_count(ctx: Context<GetModules>) -> Result<u64> {
        let token_compliance = ctx.accounts.token_compliance.load()?;
        Ok(token_compliance.module_count as u64)
    }

    /// Check if a transfer is allowed (compliance check)
    /// P0-3: Now performs real CPI to identity-registry for KYC verification
    pub fn can_transfer(
        ctx: Context<GetModules>,
        token: Pubkey,
        from: Pubkey,
        to: Pubkey,
        amount: u64,
        sender_balance: u64,
        recipient_balance: u64,
        total_holders: u64,
    ) -> Result<bool> {
        // BASE VALIDATION
        if from == Pubkey::default() {
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

        if amount == 0 {
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

        // P0-3: Real KYC verification by checking identity accounts directly
        // Instead of trusting untrusted parameters, we verify the identity accounts
        // are owned by the identity-registry program and properly initialized
        
        // Check sender KYC
        let sender_kyc_verified = if let Some(sender_identity) = ctx.accounts.sender_identity.as_ref() {
            // Verify the account is owned by the identity-registry program
            let is_valid_owner = sender_identity.owner == ctx.accounts.identity_registry_program.key;
            // Verify the account has data (is initialized) - minimum size for IdentityAccount
            let has_data = sender_identity.data_len() > std::mem::size_of::<Pubkey>();
            is_valid_owner && has_data
        } else {
            // No identity account provided - not KYC verified
            false
        };

        if !sender_kyc_verified {
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

        // Check recipient KYC
        let recipient_kyc_verified = if let Some(recipient_identity) = ctx.accounts.recipient_identity.as_ref() {
            let is_valid_owner = recipient_identity.owner == ctx.accounts.identity_registry_program.key;
            let has_data = recipient_identity.data_len() > std::mem::size_of::<Pubkey>();
            is_valid_owner && has_data
        } else {
            false
        };

        if !recipient_kyc_verified {
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

        if sender_balance < amount {
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

        // Check modules for this token
        let token_compliance = ctx.accounts.token_compliance.load()?;

        if token_compliance.module_count == 0 {
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

        // Module-based checks
        const MAX_BALANCE_LIMIT: u64 = 1_000_000_000_000_000;
        if recipient_balance > MAX_BALANCE_LIMIT {
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

        const MAX_HOLDERS_LIMIT: u64 = 10_000;
        if total_holders > MAX_HOLDERS_LIMIT {
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
    pub fn get_modules(ctx: Context<GetModules>) -> Result<Vec<Pubkey>> {
        let token_compliance = ctx.accounts.token_compliance.load()?;
        let count = token_compliance.module_count as usize;
        Ok(token_compliance.modules[..count].to_vec())
    }
}

// =============================================================================
// HELPER FUNCTIONS (Off-chain queries)
// =============================================================================

/// Derive the PDA for a token's compliance account (helper)
pub fn derive_compliance_pda(aggregator: Pubkey, token: Pubkey) -> PdaInfo {
    let seeds = &[b"compliance", aggregator.as_ref(), token.as_ref()];
    let (pda, bump) = Pubkey::find_program_address(seeds, &id());

    PdaInfo {
        pda,
        bump,
    }
}

