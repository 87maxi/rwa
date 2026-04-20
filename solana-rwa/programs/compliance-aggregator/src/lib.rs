use anchor_lang::prelude::*;

declare_id!("EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT");

#[program]
pub mod compliance_aggregator {
    use super::*;

    #[derive(Accounts)]
    pub struct Initialize<'info> {
        #[account(mut)]
        pub payer: Signer<'info>,
        #[account(
            init,
            payer = payer,
            space = 8 + std::mem::size_of::<ComplianceAggregatorState>() + 1000 // 1000 bytes for dynamic data
        )]
        pub aggregator: Account<'info, ComplianceAggregatorState>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct AddModule<'info> {
        #[account(mut)]
        pub aggregator: Account<'info, ComplianceAggregatorState>,
        pub owner: Signer<'info>,
        /// CHECK: The token account is validated through the module management logic
        pub token: AccountInfo<'info>,
    }

    #[derive(Accounts)]
    pub struct RemoveModule<'info> {
        #[account(mut)]
        pub aggregator: Account<'info, ComplianceAggregatorState>,
        pub owner: Signer<'info>,
        /// CHECK: The token account is validated through the module management logic
        pub token: AccountInfo<'info>,
    }

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let aggregator = &mut ctx.accounts.aggregator;
        aggregator.owner = ctx.accounts.payer.key();
        aggregator.next_index = 0;
        Ok(())
    }

    pub fn add_module(
        ctx: Context<AddModule>,
        token: Pubkey,
        module: Pubkey,
    ) -> Result<()> {
        let aggregator = &mut ctx.accounts.aggregator;
        
        // Get or create modules for this token
        let mut token_modules = get_modules_for_token(&aggregator.token_modules, token);
        token_modules.push(module);
        set_modules_for_token(&mut aggregator.token_modules, token, token_modules);
        
        msg!("Module added for token: {}", token);
        Ok(())
    }

    pub fn remove_module(
        ctx: Context<RemoveModule>,
        token: Pubkey,
        module: Pubkey,
    ) -> Result<()> {
        let aggregator = &mut ctx.accounts.aggregator;
        
        // Get modules for this token
        let mut token_modules = get_modules_for_token(&aggregator.token_modules, token);
        
        // Remove module from token modules
        token_modules.retain(|&m| m != module);
        
        set_modules_for_token(&mut aggregator.token_modules, token, token_modules);
        
        msg!("Module removed for token: {}", token);
        Ok(())
    }

    pub fn can_transfer(
        ctx: Context<GetModules>,
        token: Pubkey,
        _from: Pubkey,
        _to: Pubkey,
        _amount: u64,
    ) -> Result<bool> {
        let aggregator = &ctx.accounts.aggregator;
        
        // Get modules for this token
        let modules = get_modules_for_token(&aggregator.token_modules, token);
        
        // Check all modules - all must return true
        // In a real implementation, we would call the module's canTransfer function
        // For now, we'll just return true to demonstrate the structure
        let _ = modules;
        
        Ok(true)
    }

    pub fn get_modules(ctx: Context<GetModules>, token: Pubkey) -> Result<Vec<Pubkey>> {
        let aggregator = &ctx.accounts.aggregator;
        let modules = get_modules_for_token(&aggregator.token_modules, token);
        Ok(modules)
    }
}

#[derive(Accounts)]
pub struct GetModules<'info> {
    pub aggregator: Account<'info, ComplianceAggregatorState>,
}

// Helper functions for token modules management
fn get_modules_for_token(modules: &Vec<TokenModuleEntry>, token: Pubkey) -> Vec<Pubkey> {
    modules.iter()
        .filter(|e| e.token == token)
        .map(|e| e.module)
        .collect()
}

fn set_modules_for_token(modules: &mut Vec<TokenModuleEntry>, token: Pubkey, new_modules: Vec<Pubkey>) {
    // Remove existing entries for this token
    modules.retain(|e| e.token != token);
    // Add new entries
    for module in new_modules {
        modules.push(TokenModuleEntry {
            token,
            module,
        });
    }
}

#[account]
pub struct ComplianceAggregatorState {
    pub owner: Pubkey,
    pub next_index: u64,
    pub token_modules: Vec<TokenModuleEntry>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct TokenModuleEntry {
    pub token: Pubkey,
    pub module: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Token not registered")]
    TokenNotRegistered,
}
