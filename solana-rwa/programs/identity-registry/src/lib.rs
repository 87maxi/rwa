use anchor_lang::prelude::*;

declare_id!("3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5");

#[program]
pub mod identity_registry {
    use super::*;

    #[derive(Accounts)]
    pub struct Initialize<'info> {
        #[account(mut)]
        pub payer: Signer<'info>,
        #[account(
            init,
            payer = payer,
            space = 8 + std::mem::size_of::<IdentityRegistryState>() + 1000 // 1000 bytes for dynamic data
        )]
        pub registry: Account<'info, IdentityRegistryState>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct RegisterIdentity<'info> {
        #[account(mut)]
        pub payer: Signer<'info>,
        #[account(mut)]
        pub registry: Account<'info, IdentityRegistryState>,
        pub owner: Signer<'info>,
    }

    #[derive(Accounts)]
    pub struct UpdateIdentity<'info> {
        #[account(mut)]
        pub registry: Account<'info, IdentityRegistryState>,
        pub owner: Signer<'info>,
    }

    #[derive(Accounts)]
    pub struct RemoveIdentity<'info> {
        #[account(mut)]
        pub registry: Account<'info, IdentityRegistryState>,
        pub owner: Signer<'info>,
    }

    #[derive(Accounts)]
    pub struct GetIdentity<'info> {
        pub registry: Account<'info, IdentityRegistryState>,
    }

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.owner = ctx.accounts.payer.key();
        registry.next_index = 0;
        Ok(())
    }

    pub fn register_identity(
        ctx: Context<RegisterIdentity>,
        wallet: Pubkey,
        identity: Pubkey,
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        
        // Check if wallet is already registered
        require!(!registry.is_registered(&wallet), ErrorCode::WalletAlreadyRegistered);
        
        // Add to registered addresses
        registry.registered_addresses.push(wallet);
        registry.identity_map.push(IdentityEntry {
            wallet,
            identity,
        });
        registry.next_index += 1;
        
        msg!("Identity registered for wallet: {}", wallet);
        Ok(())
    }

    pub fn update_identity(
        ctx: Context<UpdateIdentity>,
        wallet: Pubkey,
        new_identity: Pubkey,
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        
        // Check if wallet is registered
        require!(registry.is_registered(&wallet), ErrorCode::WalletNotRegistered);
        
        // Update identity
        for entry in registry.identity_map.iter_mut() {
            if entry.wallet == wallet {
                entry.identity = new_identity;
                break;
            }
        }
        
        msg!("Identity updated for wallet: {}", wallet);
        Ok(())
    }

    pub fn remove_identity(
        ctx: Context<RemoveIdentity>,
        wallet: Pubkey,
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        
        // Check if wallet is registered
        require!(registry.is_registered(&wallet), ErrorCode::WalletNotRegistered);
        
        // Remove from registered addresses
        registry.registered_addresses.retain(|&addr| addr != wallet);
        
        // Remove from identity map
        registry.identity_map.retain(|entry| entry.wallet != wallet);
        
        msg!("Identity removed for wallet: {}", wallet);
        Ok(())
    }

    pub fn get_identity(ctx: Context<GetIdentity>, wallet: Pubkey) -> Result<Pubkey> {
        let registry = &ctx.accounts.registry;
        let entry = registry.identity_map.iter()
            .find(|e| e.wallet == wallet);
        Ok(entry.map(|e| e.identity).unwrap_or_default())
    }
}

#[account]
pub struct IdentityRegistryState {
    pub owner: Pubkey,
    pub next_index: u64,
    pub registered_addresses: Vec<Pubkey>,
    pub identity_map: Vec<IdentityEntry>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct IdentityEntry {
    pub wallet: Pubkey,
    pub identity: Pubkey,
}

impl IdentityRegistryState {
    pub fn is_registered(&self, wallet: &Pubkey) -> bool {
        self.registered_addresses.contains(wallet)
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Wallet already registered")]
    WalletAlreadyRegistered,
    #[msg("Wallet not registered")]
    WalletNotRegistered,
}
