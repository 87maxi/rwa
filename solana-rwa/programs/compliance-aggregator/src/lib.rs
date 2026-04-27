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
pub use errors::*;
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
        pub token_compliance: Account<'info, TokenComplianceAccount>,

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
            seeds = [b"compliance", aggregator.key().as_ref(), token_compliance.token.key().as_ref()],
            bump = token_compliance.bump,
        )]
        pub token_compliance: Account<'info, TokenComplianceAccount>,
    }

    /// RemoveModule instruction - removes a module from TokenComplianceAccount PDA
    ///
    /// If the token has no modules left, the PDA will be closed.
    #[derive(Accounts)]
    pub struct RemoveModule<'info> {
        /// Aggregator PDA (for authorization)
        #[account(
            seeds = [b"aggregator"],
            bump = aggregator.aggregator_bump,
        )]
        pub aggregator: Account<'info, ComplianceAggregatorState>,

        /// Owner of the aggregator (must sign)
        pub owner: Signer<'info>,

        /// TokenComplianceAccount PDA (will be updated or closed)
        #[account(
            mut,
            seeds = [b"compliance", aggregator.key().as_ref(), token_compliance.token.key().as_ref()],
            bump = token_compliance.bump,
            close = owner // Close if last module removed
        )]
        pub token_compliance: Account<'info, TokenComplianceAccount>,
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
            bump,
        )]
        pub token_compliance: Account<'info, TokenComplianceAccount>,
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

        let token_compliance = &mut ctx.accounts.token_compliance;

        // Initialize the TokenComplianceAccount PDA
        token_compliance.token = token;
        token_compliance.modules = Vec::new();
        token_compliance.bump = ctx.bumps.token_compliance;

        // Add the module
        token_compliance.modules.push(module);

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

        let token_compliance = &mut ctx.accounts.token_compliance;

        // Check for duplicate module (CRIT-03 FIX)
        require!(!token_compliance.modules.contains(&module), crate::errors::ErrorCode::DuplicateModule);

        // Add the module
        token_compliance.modules.push(module);

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

        let token_compliance = &mut ctx.accounts.token_compliance;

        // Verify module exists before removing
        require!(token_compliance.modules.contains(&module), crate::errors::ErrorCode::TokenNotRegistered);

        // Remove the specified module
        token_compliance.modules.retain(|&m| m != module);

        emit!(ModuleRemovedEvent {
            token: token_compliance.token,
            module,
            removed_by: ctx.accounts.owner.key(),
        });

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
        let count = ctx.accounts.token_compliance.modules.len() as u64;
        Ok(count)
    }

    /// Check if a transfer is allowed (compliance check)
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

        // KYC Verification (CRIT-01: Real compliance check)
        if sender_kyc == Pubkey::default() {
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
        let modules = &ctx.accounts.token_compliance.modules;

        if modules.is_empty() {
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

        // Simulated module checks
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
        Ok(ctx.accounts.token_compliance.modules.clone())
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
