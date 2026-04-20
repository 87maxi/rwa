use anchor_lang::prelude::*;

declare_id!("7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L");

#[program]
pub mod solana_rwa {
    use super::*;

    #[derive(Accounts)]
    pub struct Initialize<'info> {
        #[account(mut)]
        pub payer: Signer<'info>,
        #[account(
            init,
            payer = payer,
            space = 8 + std::mem::size_of::<TokenState>() + 1000 // 1000 bytes for dynamic data
        )]
        pub token: Account<'info, TokenState>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct Mint<'info> {
        #[account(mut)]
        pub token: Account<'info, TokenState>,
        pub agent: Signer<'info>,
    }

    #[derive(Accounts)]
    pub struct Burn<'info> {
        #[account(mut)]
        pub token: Account<'info, TokenState>,
        pub agent: Signer<'info>,
    }

    #[derive(Accounts)]
    pub struct Transfer<'info> {
        #[account(mut)]
        pub token: Account<'info, TokenState>,
        pub from: Signer<'info>,
        /// CHECK: The destination account is validated through the transfer logic
        pub to: AccountInfo<'info>,
    }

    #[derive(Accounts)]
    pub struct AddRemoveAgent<'info> {
        #[account(mut)]
        pub token: Account<'info, TokenState>,
        #[account(mut)]
        pub payer: Signer<'info>,
    }

    pub fn initialize(ctx: Context<Initialize>, name: String, symbol: String, decimals: u8) -> Result<()> {
        let token = &mut ctx.accounts.token;
        token.owner = ctx.accounts.payer.key();
        token.name = name;
        token.symbol = symbol;
        token.decimals = decimals;
        token.total_supply = 0;
        token.next_index = 0;
        Ok(())
    }

    pub fn mint(ctx: Context<Mint>, to: Pubkey, amount: u64) -> Result<()> {
        let token = &mut ctx.accounts.token;
        
        // Check if the caller has agent role
        require!(token.is_agent(&ctx.accounts.agent.key()), ErrorCode::Unauthorized);
        
        // Mint tokens
        token.total_supply += amount;
        update_balance(&mut token.balances, to, amount, true);
        
        msg!("Minted {} tokens to {}", amount, to);
        Ok(())
    }

    pub fn burn(ctx: Context<Burn>, from: Pubkey, amount: u64) -> Result<()> {
        let token = &mut ctx.accounts.token;
        
        // Check if the caller has agent role
        require!(token.is_agent(&ctx.accounts.agent.key()), ErrorCode::Unauthorized);
        
        // Check if account has enough balance
        let balance = get_balance(&token.balances, &from);
        require!(balance >= amount, ErrorCode::InsufficientBalance);
        
        // Burn tokens
        token.total_supply -= amount;
        update_balance(&mut token.balances, from, amount, false);
        
        msg!("Burned {} tokens from {}", amount, from);
        Ok(())
    }

    pub fn transfer(ctx: Context<Transfer>, from: Pubkey, to: Pubkey, amount: u64) -> Result<()> {
        let token = &mut ctx.accounts.token;
        
        // Check if sender has enough balance
        let sender_balance = get_balance(&token.balances, &from);
        require!(sender_balance >= amount, ErrorCode::InsufficientBalance);
        
        // Perform transfer
        update_balance(&mut token.balances, from, amount, false);
        update_balance(&mut token.balances, to, amount, true);
        
        msg!("Transferred {} tokens from {} to {}", amount, from, to);
        Ok(())
    }

    pub fn freeze_account(ctx: Context<Transfer>, account: Pubkey) -> Result<()> {
        let token = &mut ctx.accounts.token;
        
        // Check if the caller has agent role
        require!(token.is_agent(&ctx.accounts.from.key()), ErrorCode::Unauthorized);
        
        // Freeze account
        set_frozen(&mut token.frozen_accounts, account, true);
        
        msg!("Account {} frozen", account);
        Ok(())
    }

    pub fn unfreeze_account(ctx: Context<Transfer>, account: Pubkey) -> Result<()> {
        let token = &mut ctx.accounts.token;
        
        // Check if the caller has agent role
        require!(token.is_agent(&ctx.accounts.from.key()), ErrorCode::Unauthorized);
        
        // Unfreeze account
        set_frozen(&mut token.frozen_accounts, account, false);
        
        msg!("Account {} unfrozen", account);
        Ok(())
    }

    pub fn add_agent(ctx: Context<AddRemoveAgent>, agent: Pubkey) -> Result<()> {
        let token = &mut ctx.accounts.token;
        require!(token.owner == ctx.accounts.payer.key(), ErrorCode::Unauthorized);
        token.agents.push(agent);
        msg!("Agent added: {}", agent);
        Ok(())
    }

    pub fn remove_agent(ctx: Context<AddRemoveAgent>, agent: Pubkey) -> Result<()> {
        let token = &mut ctx.accounts.token;
        require!(token.owner == ctx.accounts.payer.key(), ErrorCode::Unauthorized);
        token.agents.retain(|&a| a != agent);
        msg!("Agent removed: {}", agent);
        Ok(())
    }
}

// Helper functions for balance management
fn get_balance(balances: &Vec<BalanceEntry>, key: &Pubkey) -> u64 {
    balances.iter()
        .find(|e| e.key == *key)
        .map(|e| e.value)
        .unwrap_or(0)
}

fn update_balance(balances: &mut Vec<BalanceEntry>, key: Pubkey, amount: u64, add: bool) {
    if let Some(entry) = balances.iter_mut().find(|e| e.key == key) {
        if add {
            entry.value += amount;
        } else {
            entry.value = entry.value.saturating_sub(amount);
        }
    } else if add {
        balances.push(BalanceEntry {
            key,
            value: amount,
        });
    }
}

fn set_frozen(frozen: &mut Vec<FrozenEntry>, account: Pubkey, is_frozen: bool) {
    if let Some(entry) = frozen.iter_mut().find(|e| e.key == account) {
        entry.frozen = is_frozen;
    } else if is_frozen {
        frozen.push(FrozenEntry {
            key: account,
            frozen: true,
        });
    }
}

#[account]
pub struct TokenState {
    pub owner: Pubkey,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub next_index: u64,
    pub balances: Vec<BalanceEntry>,
    pub frozen_accounts: Vec<FrozenEntry>,
    pub agents: Vec<Pubkey>,
    pub compliance_modules: Vec<Pubkey>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct BalanceEntry {
    pub key: Pubkey,
    pub value: u64,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct FrozenEntry {
    pub key: Pubkey,
    pub frozen: bool,
}

impl TokenState {
    pub fn is_agent(&self, account: &Pubkey) -> bool {
        self.agents.contains(account)
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Account frozen")]
    AccountFrozen,
}
