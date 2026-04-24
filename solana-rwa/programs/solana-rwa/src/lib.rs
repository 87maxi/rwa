// =============================================================================
// SOLANA RWA TOKEN PROGRAM
// =============================================================================
//
// RUST BASICS FOR PYTHON/GO/PHP/PERL DEVELOPERS:
// -----------------------------------------------
//
// Rust is a systems programming language that focuses on safety and performance.
// Key concepts you need to know:
//
// 1. OWNERSHIP & BORROWING:
//    - Every value in Rust has exactly ONE owner (like Python's reference counting)
//    - When you pass a value to a function, ownership moves (like Python assignment)
//    - To read without taking ownership, use references: &my_value (immutable borrow)
//    - To modify without taking ownership, use: &mut my_value (mutable borrow)
//    - Analogy: Think of &T as Python's "pass by reference" and &mut T as "mutable reference"
//
// 2. LIFETIMES ('info):
//    - Lifetimes ensure references are valid as long as needed
//    - 'info is a lifetime parameter - it tells Rust "this reference lives as long as
//      the Solana account context"
//    - Analogy: Like Python's garbage collection, but done at compile time
//
// 3. OPTIONS:
//    - Option<T> is like Python's "T | None" or Go's "*T" (pointer)
//    - Some(value) = there is a value (like not None in Python)
//    - None = there is no value (like None in Python, nil in Go)
//    - You "unwrap" an Option to get the value: option.unwrap() == value
//    - SAFE: option.unwrap_or(default) == value if Some, else default
//
// 4. RESULTS:
//    - Result<T, E> is like Go's error handling but with values
//    - Ok(value) = success (like returning nil error in Go)
//    - Err(error) = failure (like returning error in Go)
//    - The `?` operator: `maybe_value?` = if Err, return Err; if Ok, unwrap
//
// 5. CLOSURES (anonymous functions):
//    - |x| x + 1  is like Python's: lambda x: x + 1
//    - |x, y| x + y  is like Python's: lambda x, y: x + y
//    - In Rust, closures can capture variables from their environment
//
// 6. ITERATORS:
//    - .iter() returns an iterator over references (&T)
//    - .iter_mut() returns an iterator over mutable references (&mut T)
//    - .map(f) applies function f to each element (like Python's map())
//    - .filter(pred) keeps elements where pred(element) is true
//    - .find(pred) returns the FIRST element where pred(element) is true (returns Option)
//    - .collect() gathers iterator results into a collection (Vec, HashMap, etc.)
//    - .unwrap_or(default) provides a fallback if Option is None
//
// 7. MACROS:
//    - require!(condition, error) = panic with error if condition is false
//      Like: assert(condition, error_message) in Python/Go
//    - msg!("format {}", value) = log a message (like print() or log())
//    - Macros are like Python decorators or Go's preprocessor, but more powerful
//
// 8. ENUMS (enumerations):
//    - Rust enums are like Python's Union types or Go's interfaces
//    - They can carry data: enum Color { Red, Green, Blue } (like Go)
//    - Or with data: enum Result<T,E> { Ok(T), Err(E) } (like Rust's Result)
//
// 9. STRUCTS (structures):
//    - Like Python dataclasses, Go structs, or PHP classes without methods
//    - pub fields = public (accessible from other modules)
//    - Without pub = private (only accessible within this module)
//
// 10. TRAIT IMPLEMENTATIONS:
//     - Traits are like Python protocols, Go interfaces, or PHP interfaces
//     - #[derive(...)] auto-generates common trait implementations
//     - Clone = can copy with .clone() (like __copy__ in Python)
//     - AnchorSerialize/AnchorDeserialize = can be serialized for Solana storage
//
// ANCHOR FRAMEWORK:
// -----------------
// Anchor is a framework for developing Solana programs, similar to how
// Django/FastAPI are frameworks for Python, or Gin/Echo for Go.
//
// Key Anchor concepts:
// - #[program] = marks the module containing instruction handlers
// - #[derive(Accounts)] = generates account validation code (like Pydantic models)
// - Context<T> = provides access to all accounts for instruction T
// - Account<'info, T> = a typed account that must be of type T
// - Signer<'info> = an account that signed this transaction
// - #[account] = marks a struct as a Solana account (on-chain storage)
// - #[error_code] = defines custom error codes for the program
//
// PROGRAM STRUCTURE:
// ------------------
// 1. declare_id!() = the program's public key (like contract address in Solidity)
// 2. #[program] module = all instruction handlers (like smart contract functions)
// 3. Account structs = which accounts each instruction needs
// 4. Handler functions = the actual logic (like function handlers in Python)
// 5. Data structs = on-chain storage (like database models)
// 6. Helper functions = utility code (like Python utility functions)
// 7. Error codes = custom errors (like Python exceptions)

use anchor_lang::prelude::*;  // Import all Anchor essentials (like "from django.conf import *"

// Module for cross-program invocation (CPI) program IDs
// Like importing contract addresses for calling other smart contracts
pub mod ids;

// declare_id!() sets the program's public key on the blockchain.
// This is like deploying a smart contract and getting its address.
// In production, you'd generate this with: anchor keys list
// NOTE: This ID must match Anchor.toml [programs.localnet] section
// If they mismatch, you'll get "DeclaredProgramIdMismatch" error
declare_id!("7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L");

// #[program] is an Anchor attribute macro that marks this module as containing
// all the instruction handlers (entry points) for this smart contract.
// Think of it like the @app.route() decorators in Flask/FastAPI, but for Solana.
#[program]
pub mod solana_rwa {
    use super::*;  // Import everything from parent module (the helpers, structs, errors)

    // =================================================================
    // CONSTANTS
    // =================================================================

    /// Maximum supply cap for the token (1 billion tokens with 9 decimals)
    /// MAX_SUPPLY = 1,000,000,000 * 10^9 = 1,000,000,000,000,000,000
    pub const MAX_SUPPLY: u64 = 1_000_000_000_000_000_000u64;

    // =================================================================
    // ACCOUNT VALIDATION STRUCTURES
    // =================================================================
    //
    // These structs define WHICH accounts are needed for each instruction,
    // and WHAT ROLE each account plays. Anchor generates validation code
    // based on the attributes (#[account(...)]).
    //
    // This is similar to FastAPI's dependency injection or Go's handler signatures,
    // but declarative. Instead of writing "if account != expected, return error",
    // you just declare what you need and Anchor validates it.

    /// Initialize instruction - creates a new token state account
    ///
    /// Accounts needed:
    /// - payer: Who pays for the rent (must sign the transaction)
    /// - token: The new account to create (will store all token data)
    /// - system_program: Solana's system program (required for account creation)
    ///
    /// Rust explanation:
    /// - <'info> is a LIFETIME parameter. It tells Rust that these references
    ///   live as long as the Solana transaction context. Think of it like
    ///   Python's type hints: it doesn't change behavior, but documents intent.
    /// - #[account(mut)] means this account will be modified (like &mut in Python)
    /// - #[account(init)] tells Anchor to create this account if it doesn't exist
    /// - space = 8 + size_of::<T>() + extra: how much storage to allocate
    ///   The 8 is for Anchor's discriminator (like a function selector in Solidity)
    #[derive(Accounts)]  // Anchor macro that generates account validation code
    pub struct Initialize<'info> {
        /// Who pays the rent for creating the account (must be a signer)
        #[account(mut)]  // This account will be modified (lamports deducted for rent)
        pub payer: Signer<'info>,  // Signer<'info> = an account that signed this tx

        /// The new account to create (stores all token state)
        #[account(
            init,              // Create this account if it doesn't exist
            payer = payer,     // The payer pays for the rent (like paying gas in Ethereum)
            space = 8 + std::mem::size_of::<TokenState>() + 1000
            // space calculation:
            //   8          = Anchor's discriminator (4 bytes for function selector + 4 padding)
            //   size_of    = size of TokenState struct in bytes
            //   + 1000     = extra space for dynamic data (Vecs grow here)
            // Analogy: Like pre-allocating memory in Go's make() or Python's list pre-allocation
        )]
        pub token: Account<'info, TokenState>,  // Typed account: must be TokenState type

        /// Solana's system program (required for account creation)
        pub system_program: Program<'info, System>,  // Program<'info, T> = a program account
    }

    /// Mint instruction - creates new tokens
    ///
    /// Accounts needed:
    /// - token: The token state account (will be modified)
    /// - agent: Who is minting (must sign)
    ///
    /// Note: No payer here because we're not creating new accounts,
    /// just modifying existing ones (which doesn't require extra rent)
    #[derive(Accounts)]
    pub struct Mint<'info> {
        /// Token state account (will be modified - new tokens added)
        #[account(mut)]
        pub token: Account<'info, TokenState>,

        /// Agent performing the mint (must be authorized - see is_agent check in handler)
        pub agent: Signer<'info>,
    }

    /// Burn instruction - destroys tokens
    #[derive(Accounts)]
    pub struct Burn<'info> {
        /// Token state account (will be modified - tokens removed)
        #[account(mut)]
        pub token: Account<'info, TokenState>,

        /// Agent performing the burn
        pub agent: Signer<'info>,
    }

    /// Transfer instruction - moves tokens between accounts
    ///
    /// Accounts needed:
    /// - token: The token state account (will be modified)
    /// - from: Who sends tokens (must sign - proves ownership)
    /// - to: Who receives tokens (does NOT need to sign - you don't need
    ///       permission to receive tokens, like email)
    ///
    /// Rust explanation:
    /// - AccountInfo<'info> = untyped account access. We use this for 'to' because
    ///   we don't need to deserialize it as a specific type. It's like using
    ///   `Any` in Go or `object` in Python when you don't need type safety.
    /// - The /// CHECK: comment is REQUIRED by Anchor when using AccountInfo.
    ///   It's a reminder that we're doing manual validation (in update_balance).
    #[derive(Accounts)]
    pub struct Transfer<'info> {
        /// Token state account (balances will be modified)
        #[account(mut)]
        pub token: Account<'info, TokenState>,

        /// Sender: must sign to prove they own the tokens being transferred
        pub from: Signer<'info>,

        /// Receiver: destination wallet (does NOT need to sign or be an existing account)
        /// CHECK: Safe because we only use the pubkey value, not the account itself.
        /// The transfer logic validates that the destination pubkey is well-formed (32 bytes),
        /// and balances are tracked in TokenState.balances, not on the destination account.
        pub to: AccountInfo<'info>,
    }

    /// Agent management instruction - add or remove agents
    ///
    /// We combine add and remove into one struct because they need the same accounts.
    /// This is like having one route handler with different methods (POST/DELETE) in REST APIs.
    #[derive(Accounts)]
    pub struct AddRemoveAgent<'info> {
        /// Token state account (agents list will be modified)
        #[account(mut)]
        pub token: Account<'info, TokenState>,

        /// Must be the token owner (validated in the handler with require!())
        #[account(mut)]  // marked mut because Anchor tracks all account changes
        pub payer: Signer<'info>,
    }

    /// GetSupplyInfo instruction - query current supply information (read-only)
    #[derive(Accounts)]
    pub struct GetSupplyInfo<'info> {
        /// Token state account (read-only, no modification)
        pub token: Account<'info, TokenState>,
    }

    /// TransferOwner instruction - transfers the token ownership (mint authority)
    ///
    /// Accounts needed:
    /// - token: The token state account (will be modified - owner changes)
    /// - current_owner: The current owner (must sign to authorize transfer)
    #[derive(Accounts)]
    pub struct TransferOwner<'info> {
        /// Token state account (owner field will be modified)
        #[account(mut)]
        pub token: Account<'info, TokenState>,

        /// Current owner (must sign to authorize the transfer)
        pub current_owner: Signer<'info>,
    }

    /// FreezeAccount instruction - freezes a specific account (prevents transfers)
    ///
    /// This is an independent context for freeze operations (FIX for HIGH-02).
    /// Previously reused Transfer context which was incorrect.
    ///
    /// Accounts needed:
    /// - token: The token state account (will be modified - frozen_accounts updated)
    /// - authority: The agent performing the freeze (must sign)
    #[derive(Accounts)]
    pub struct FreezeAccount<'info> {
        /// Token state account (frozen_accounts list will be modified)
        #[account(mut)]
        pub token: Account<'info, TokenState>,

        /// Authority performing the freeze (must be an agent - validated in handler)
        pub authority: Signer<'info>,
    }

    /// UnfreezeAccount instruction - unfreezes a specific account
    ///
    /// This is an independent context for unfreeze operations (FIX for HIGH-02).
    ///
    /// Accounts needed:
    /// - token: The token state account (will be modified - frozen_accounts updated)
    /// - authority: The agent performing the unfreeze (must sign)
    #[derive(Accounts)]
    pub struct UnfreezeAccount<'info> {
        /// Token state account (frozen_accounts list will be modified)
        #[account(mut)]
        pub token: Account<'info, TokenState>,

        /// Authority performing the unfreeze (must be an agent - validated in handler)
        pub authority: Signer<'info>,
    }

    /// TransferFreezeAuthority instruction - transfers the freeze authority to a new account
    ///
    /// MEDIUM-05 FIX: This allows separating freeze authority from mint authority/owner.
    /// By default, freeze_authority = owner, but this instruction allows transferring it.
    ///
    /// Accounts needed:
    /// - token: The token state account (will be modified - freeze_authority changes)
    /// - current_freeze_authority: The current freeze authority (must sign to authorize transfer)
    #[derive(Accounts)]
    pub struct TransferFreezeAuthority<'info> {
        /// Token state account (freeze_authority field will be modified)
        #[account(mut)]
        pub token: Account<'info, TokenState>,

        /// Current freeze authority (must sign to authorize the transfer)
        pub current_freeze_authority: Signer<'info>,
    }

    // =================================================================
    // INSTRUCTION HANDLERS (like function handlers in Python/Go)
    // =================================================================
    //
    // Each function is an "instruction" - a callable entry point of the smart contract.
    // When a user sends a transaction, they specify which instruction to call.
    //
    // Function signature pattern:
    //   pub fn handler(ctx: Context<InstructionType>, args...) -> Result<()>
    //
    // - ctx: Context<Initialize> gives you access to all accounts in the struct
    //   ctx.accounts.token = the TokenState account
    //   ctx.accounts.payer = the payer account
    //   Analogy: Like self in Python classes, but explicit about which accounts
    //
    // - args: Additional parameters (name, symbol, amount, etc.)
    //   These come from the transaction data (like function arguments)
    //
    // - Result<()>: Returns Ok(()) on success or Err(error) on failure
    //   () = empty tuple in Rust, like void in Go or None in Python
    //   Result<T, E> = either Ok(T) or Err(E), like Go's (T, error)

    /// Initialize a new token
    ///
    /// This is the "constructor" of our smart contract - called once to set up.
    ///
    /// Parameters:
    /// - name: Token name (e.g., "My Token") - like a class __init__ parameter
    /// - symbol: Token ticker (e.g., "MTK")
    /// - decimals: Number of decimal places (e.g., 9 = 1 token = 1,000,000,000 units)
    ///   Analogy: Like Ethereum's ERC20 decimals, or Go's struct initialization
    ///
    /// Rust explanation:
    /// - String in Anchor = validated UTF-8 string with length limit (~1000 chars)
    ///   Like Python's str, but with serialization constraints
    /// - u8 = unsigned 8-bit integer (0 to 255), like uint8 in Go
    /// - token.owner = ctx.accounts.payer.key() = get the public key of payer
    ///   .key() returns Pubkey (32 bytes), like .address in Solidity
    pub fn initialize(ctx: Context<Initialize>, name: String, symbol: String, decimals: u8) -> Result<()> {
        // Get mutable reference to the token account
        // &mut means we can modify it (like &mut in Python: "I need to change this")
        let token = &mut ctx.accounts.token;

        // LOG FIRST: We log before moving name/symbol into token
        // msg!() is a macro that logs a message on-chain
        // Like print() in Python or fmt.Println() in Go, but stored on blockchain
        // NOTE: We must log BEFORE the assignments below because:
        //   name and symbol are "moved" into token.name/token.symbol
        //   After moving, we can't read them again (Rust ownership rules)
        //   This is like Python, but Python copies strings implicitly
        //   In Rust, String is "owned" data - moving it transfers ownership
        msg!("Token initialized: {} ({}) with {} decimals", name, symbol, decimals);

        // Set initial values - like initializing a Python dataclass or Go struct
        // After these assignments, name and symbol are "owned" by token
        // We can't use name/symbol variables anymore (ownership transferred)
        token.owner = ctx.accounts.payer.key();  // Owner is whoever paid to create this
        token.freeze_authority = ctx.accounts.payer.key(); // MEDIUM-05: Default freeze_authority = owner
        token.name = name;                         // Token name (e.g., "Real World Asset")
        token.symbol = symbol;                     // Token symbol (e.g., "RWA")
        token.decimals = decimals;                 // Decimal places (e.g., 9)
        token.total_supply = 0;                    // No tokens exist yet
        token.next_index = 0;                      // Index counter for future use

        // Ok(()) means "success, no value to return"
        // () is the "unit" type in Rust, like void in Go or None in Python
        Ok(())
    }

    /// Mint new tokens (create them from nothing)
    ///
    /// This increases total_supply and adds tokens to the recipient's balance.
    ///
    /// Parameters:
    /// - to: Public key of the recipient wallet
    /// - amount: Number of tokens to mint (in smallest units, considering decimals)
    ///
    /// Rust explanation:
    /// - u64 = unsigned 64-bit integer (0 to ~18 quintillion)
    ///   Like uint64 in Go, int in Python (but with fixed size)
    /// - require!() is a macro that checks a condition and returns error if false
    ///   Like assert() in Python, but returns a custom error instead of panicking
    /// - token.is_agent() = calls the is_agent method on TokenState (defined later)
    ///   Like calling a method on self in Python: self.is_agent()
    pub fn mint(ctx: Context<Mint>, to: Pubkey, amount: u64) -> Result<()> {
        // Get mutable reference to token state
        let token = &mut ctx.accounts.token;

        // SECURITY CHECK: Verify the caller is an authorized agent
        // require!(condition, error_code) = if condition is false, return error_code
        // token.is_agent(&ctx.accounts.agent.key()) checks if agent's pubkey is in agents list
        // Analogy: Like @require_role("admin") decorator in Python Flask
        require!(token.is_agent(&ctx.accounts.agent.key()), ErrorCode::Unauthorized);

        // HIGH-03 FIX: Reject zero-amount mints explicitly
        require!(amount > 0, ErrorCode::InvalidAmount);

        // HIGH-04 FIX: Check max supply cap before minting
        let new_supply = token.total_supply.checked_add(amount)
            .ok_or(ErrorCode::SupplyOverflow)?;
        require!(new_supply <= MAX_SUPPLY, ErrorCode::SupplyExceeded);

        // INCREMENT TOTAL SUPPLY
        token.total_supply = new_supply;

        // UPDATE RECIPIENT BALANCE
        // update_balance() is a helper function (defined below)
        // Parameters:
        //   &mut token.balances = mutable reference to the balances Vec
        //   to = wallet address to update
        //   amount = how much to add
        //   true = "add" mode (false would mean "subtract")
        // Analogy: Like balances[to] = balances.get(to, 0) + amount in Python dict
        update_balance(&mut token.balances, to, amount, true);

        // Emit TokensMinted event with amount and new total supply
        emit!(TokensMintedEvent {
            to,
            amount,
            total_supply: new_supply,
            minted_by: ctx.accounts.agent.key(),
        });

        // Log the minting action
        msg!("Minted {} tokens to {}. New total supply: {}", amount, to, new_supply);

        Ok(())
    }

    /// Burn tokens (destroy them permanently)
    ///
    /// This decreases total_supply and removes tokens from the sender's balance.
    /// Burning is the opposite of minting - it reduces the total supply.
    ///
    /// Parameters:
    /// - from: Public key of the sender's wallet (whose tokens to burn)
    /// - amount: Number of tokens to burn
    ///
    /// Rust explanation:
    /// - get_balance() is a helper function that looks up a balance
    ///   Like dict.get(key, default) in Python
    /// - require!(balance >= amount, ...) = ensure sender has enough tokens
    ///   Like checking if balance >= amount before processing in Python
    pub fn burn(ctx: Context<Burn>, from: Pubkey, amount: u64) -> Result<()> {
        let token = &mut ctx.accounts.token;

        // SECURITY CHECK: Verify the caller is an authorized agent
        require!(token.is_agent(&ctx.accounts.agent.key()), ErrorCode::Unauthorized);

        // CHECK BALANCE: Get current balance of the sender
        // get_balance() returns 0 if the address has no balance entry
        // This is like: balances.get(from, 0) in Python
        let balance = get_balance(&token.balances, &from);

        // SECURITY CHECK: Ensure sender has enough tokens to burn
        // If balance < amount, return InsufficientBalance error
        require!(balance >= amount, ErrorCode::InsufficientBalance);

        // DECREMENT TOTAL SUPPLY
        // Use saturating_sub to prevent underflow (caps at 0 instead of panicking)
        // The require!() check above ensures amount <= balance, but we also protect total_supply
        token.total_supply = token.total_supply.saturating_sub(amount);

        // UPDATE SENDER BALANCE
        // update_balance(..., false) means "subtract" mode
        // Inside update_balance, it uses .saturating_sub() which prevents underflow
        // saturating_sub(x) = if result < 0, return 0 instead of wrapping
        // Analogy: max(0, balance - amount) in Python
        update_balance(&mut token.balances, from, amount, false);

        msg!("Burned {} tokens from {}", amount, from);
        Ok(())
    }

    /// Transfer tokens from one account to another
    ///
    /// This moves tokens without changing total_supply (unlike mint/burn).
    ///
    /// Parameters:
    /// - from: Sender's wallet (must sign to prove ownership)
    /// - to: Recipient's wallet
    /// - amount: Number of tokens to transfer
    ///
    /// Rust explanation:
    /// - The transfer happens in TWO steps: subtract from sender, add to recipient
    /// - This is atomic: either both succeed or the whole transaction fails
    /// - Solana programs are atomic by default (like database transactions)
    pub fn transfer(ctx: Context<Transfer>, from: Pubkey, to: Pubkey, amount: u64) -> Result<()> {
        let token = &mut ctx.accounts.token;

        // HIGH-03 FIX: Reject zero-amount transfers explicitly
        require!(amount > 0, ErrorCode::InvalidAmount);

        // SECURITY CHECK: Verify sender has enough balance
        let sender_balance = get_balance(&token.balances, &from);
        require!(sender_balance >= amount, ErrorCode::InsufficientBalance);

        // SECURITY CHECK: Verify sender is not frozen
        require!(!token.is_frozen(&from), ErrorCode::AccountFrozen);

        // SECURITY CHECK: Verify recipient is not frozen
        require!(!token.is_frozen(&to), ErrorCode::AccountFrozen);

        // COMPLIANCE CHECK: If compliance modules are configured, verify transfer is allowed
        if !token.compliance_modules.is_empty() {
            // TODO: In production, CPI to compliance-aggregator to verify each module
            // For now, log the compliance check
            msg!("Compliance modules configured: {} modules, verifying transfer from {} to {} amount {}",
                 token.compliance_modules.len(), from, to, amount);
        }

        // PERFORM TRANSFER
        // Step 1: Subtract from sender (false = subtract mode)
        update_balance(&mut token.balances, from, amount, false);

        // Step 2: Add to recipient (true = add mode)
        update_balance(&mut token.balances, to, amount, true);

        msg!("Transferred {} tokens from {} to {}", amount, from, to);
        Ok(())
    }

    /// Freeze an account (prevent it from transferring tokens)
    ///
    /// Frozen accounts cannot send tokens (but can receive).
    /// This is like a "freeze order" in traditional finance.
    ///
    /// Parameters:
    /// - account: The wallet address to freeze
    ///
    /// HIGH-02 FIX: Now uses independent FreezeAccount context instead of Transfer context.
    /// Only the mint authority (agent) can freeze accounts.
    pub fn freeze_account(ctx: Context<FreezeAccount>, account: Pubkey) -> Result<()> {
        let token = &mut ctx.accounts.token;

        // MEDIUM-05: SECURITY CHECK: Only freeze_authority can freeze accounts
        require!(token.freeze_authority == ctx.accounts.authority.key(), ErrorCode::NotFreezeAuthority);

        // Freeze the target account
        // set_frozen() is a helper that adds/updates the frozen entry
        set_frozen(&mut token.frozen_accounts, account, true);

        // Emit AccountFrozen event
        emit!(AccountFrozenEvent {
            account,
            frozen_by: ctx.accounts.authority.key(),
        });

        msg!("Account {} frozen by {}", account, ctx.accounts.authority.key());
        Ok(())
    }

    /// Unfreeze an account (allow it to transfer tokens again)
    ///
    /// Parameters:
    /// - account: The wallet address to unfreeze
    ///
    /// HIGH-02 FIX: Now uses independent UnfreezeAccount context instead of Transfer context.
    pub fn unfreeze_account(ctx: Context<UnfreezeAccount>, account: Pubkey) -> Result<()> {
        let token = &mut ctx.accounts.token;

        // MEDIUM-05: SECURITY CHECK: Only freeze_authority can unfreeze accounts
        require!(token.freeze_authority == ctx.accounts.authority.key(), ErrorCode::NotFreezeAuthority);

        // Unfreeze the target account
        // set_frozen(..., false) removes or marks as not frozen
        set_frozen(&mut token.frozen_accounts, account, false);

        // Emit AccountUnfrozen event
        emit!(AccountUnfrozenEvent {
            account,
            unfrozen_by: ctx.accounts.authority.key(),
        });

        msg!("Account {} unfrozen by {}", account, ctx.accounts.authority.key());
        Ok(())
    }

    /// TransferOwner instruction handler - transfers the token ownership (mint authority)
    ///
    /// HIGH-01 FIX: New instruction to allow transferring the owner authority.
    /// This is critical for recovery if the owner private key is compromised.
    ///
    /// Parameters:
    /// - new_owner: The public key of the new owner
    ///
    /// Security:
    /// - Current owner must sign to authorize the transfer
    /// - After transfer, the new owner has full control (mint, burn, freeze, add/remove agents)
    pub fn transfer_owner(ctx: Context<TransferOwner>, new_owner: Pubkey) -> Result<()> {
        let token = &mut ctx.accounts.token;

        // SECURITY CHECK: Only current owner can initiate owner transfer
        require!(token.owner == ctx.accounts.current_owner.key(), ErrorCode::Unauthorized);

        // SECURITY CHECK: New owner must be different from current owner
        require!(token.owner != new_owner, ErrorCode::SameOwner);

        // Store old owner for event emission
        let old_owner = token.owner;

        // Transfer ownership
        token.owner = new_owner;

        // Emit OwnerTransferred event
        emit!(OwnerTransferredEvent {
            old_owner,
            new_owner,
            transferred_by: ctx.accounts.current_owner.key(),
        });

        msg!("Token ownership transferred from {} to {}", old_owner, new_owner);
        Ok(())
    }

    /// TransferFreezeAuthority instruction handler - transfers freeze authority to a new account
    ///
    /// MEDIUM-05 FIX: This allows separating freeze authority from mint authority/owner.
    /// By default, freeze_authority = owner, but this instruction allows transferring it
    /// to a different account for better security separation of duties.
    ///
    /// Parameters:
    /// - new_freeze_authority: The public key of the new freeze authority
    ///
    /// Security:
    /// - Current freeze authority must sign to authorize the transfer
    /// - After transfer, only the new freeze authority can freeze/unfreeze accounts
    pub fn transfer_freeze_authority(
        ctx: Context<TransferFreezeAuthority>,
        new_freeze_authority: Pubkey,
    ) -> Result<()> {
        let token = &mut ctx.accounts.token;

        // SECURITY CHECK: Only current freeze authority can initiate transfer
        require!(
            token.freeze_authority == ctx.accounts.current_freeze_authority.key(),
            ErrorCode::NotFreezeAuthority
        );

        // SECURITY CHECK: New freeze authority must be different
        require!(
            token.freeze_authority != new_freeze_authority,
            ErrorCode::SameFreezeAuthority
        );

        // Store old freeze authority for event emission
        let old_freeze_authority = token.freeze_authority;

        // Transfer freeze authority
        token.freeze_authority = new_freeze_authority;

        // Emit FreezeAuthorityTransferred event
        emit!(FreezeAuthorityTransferredEvent {
            old_freeze_authority,
            new_freeze_authority,
            transferred_by: ctx.accounts.current_freeze_authority.key(),
        });

        msg!(
            "Freeze authority transferred from {} to {}",
            old_freeze_authority,
            new_freeze_authority
        );
        Ok(())
    }

    /// GetSupplyInfo query function - returns current supply information
    ///
    /// HIGH-04 FIX: New query function to get supply details.
    /// Returns current supply, max supply, and remaining supply.
    ///
    /// Parameters:
    /// - token: The token state account to query (read-only)
    ///
    /// Returns: Struct with current_supply, max_supply, and remaining_supply
    pub fn get_supply_info(ctx: Context<GetSupplyInfo>) -> Result<SupplyInfo> {
        let token = &ctx.accounts.token;
        
        let current_supply = token.total_supply;
        let remaining_supply = MAX_SUPPLY.checked_sub(current_supply)
            .ok_or(ErrorCode::SupplyOverflow)?;

        Ok(SupplyInfo {
            current_supply,
            max_supply: MAX_SUPPLY,
            remaining_supply,
        })
    }

    /// Add an agent to the token
    ///
    /// Agents can mint, burn, freeze, and unfreeze.
    /// Only the token OWNER can add agents (security check inside).
    ///
    /// Parameters:
    /// - agent: The public key of the new agent
    ///
    /// Rust explanation:
    /// - token.agents.push(agent) adds to the Vec (dynamic array)
    ///   Like list.append() in Python or append() in Go
    /// - Vec in Rust is like a dynamically-sized array
    ///   - Push: O(1) amortized (like Python list.append)
    ///   - Access by index: O(1) (like Python list[i])
    ///   - Search: O(n) (like x in list in Python)
    pub fn add_agent(ctx: Context<AddRemoveAgent>, agent: Pubkey) -> Result<()> {
        let token = &mut ctx.accounts.token;

        // SECURITY CHECK: Only the token owner can add agents
        // token.owner == ctx.accounts.payer.key() compares pubkeys
        // == on Pubkey compares the 32-byte arrays
        require!(token.owner == ctx.accounts.payer.key(), ErrorCode::Unauthorized);

        // SECURITY CHECK: Prevent duplicate agent entries
        require!(!token.is_agent(&agent), ErrorCode::DuplicateAgent);

        // Add agent to the list
        token.agents.push(agent);

        msg!("Agent added: {}", agent);
        Ok(())
    }

    /// Remove an agent from the token
    ///
    /// Only the token OWNER can remove agents.
    ///
    /// Parameters:
    /// - agent: The public key of the agent to remove
    ///
    /// Rust explanation:
    /// - .retain(|&a| a != agent) keeps only elements that DON'T match
    ///   This is like Python's: agents = [a for a in agents if a != agent]
    ///   Or Go's: filtered = append(filter, x) where x != agent
    /// - |&a| is a closure: |parameters| expression
    ///   &a = pattern matching to dereference (we get Pubkey, not &Pubkey)
    pub fn remove_agent(ctx: Context<AddRemoveAgent>, agent: Pubkey) -> Result<()> {
        let token = &mut ctx.accounts.token;

        // SECURITY CHECK: Only the token owner can remove agents
        require!(token.owner == ctx.accounts.payer.key(), ErrorCode::Unauthorized);

        // Remove agent from the list (keep all that don't match)
        token.agents.retain(|&a| a != agent);

        msg!("Agent removed: {}", agent);
        Ok(())
    }
}

// =================================================================
// DATA STRUCTURES FOR QUERIES
// =================================================================

/// SupplyInfo - returned by get_supply_info query
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SupplyInfo {
    pub current_supply: u64,    // Current total supply
    pub max_supply: u64,        // Maximum allowed supply (MAX_SUPPLY constant)
    pub remaining_supply: u64,  // How much more can be minted
}

// =================================================================
// HELPER FUNCTIONS
// =================================================================
//
// These are utility functions that manage the Vec-based data structures.
// They're outside the #[program] module because they're not instructions
// - they're internal helpers (like private functions in Python or unexported in Go).

/// Get the balance for a specific wallet address
///
/// Parameters:
/// - balances: Reference to the Vec<BalanceEntry> (like &list in Python)
/// - key: Reference to the Pubkey we're looking up (like a dict key)
///
/// Returns: u64 balance (0 if not found)
///
/// Rust explanation:
/// - &Vec<T> = immutable reference to a Vec (we can read but not modify)
///   Like passing a list to a Python function (can't modify the original)
/// - &Pubkey = immutable reference to a Pubkey (32-byte array)
/// - .iter() = creates an iterator over references (&BalanceEntry)
///   Like iterating over a list in Python: for entry in balances:
/// - .find(|e| e.key == *key) = find first element where condition is true
///   Returns Option<&BalanceEntry> (like returning None in Python if not found)
/// - .map(|e| e.value) = transform each element to its value field
///   Like: [e.value for e in entries] in Python list comprehension
/// - .unwrap_or(0) = if None, return 0 instead of error
///   Like: result if result is not None else 0 in Python
fn get_balance(balances: &Vec<BalanceEntry>, key: &Pubkey) -> u64 {
    balances.iter()  // Create iterator over all BalanceEntry references
        .find(|e| e.key == *key)  // Find first entry where key matches
        // *key dereferences the Pubkey reference to get the value for comparison
        // In Rust, &Pubkey == Pubkey doesn't work directly, need to dereference
        .map(|e| e.value)  // Extract the value field from the found entry
        .unwrap_or(0)  // If not found (None), return 0
}

/// Update the balance for a specific wallet address
///
/// This function handles both adding and subtracting from balances.
/// It also creates new balance entries if the address doesn't exist yet.
///
/// Parameters:
/// - balances: Mutable reference to Vec<BalanceEntry> (we can modify)
/// - key: The wallet address to update
/// - amount: How much to add or subtract
/// - add: true = add amount, false = subtract amount
///
/// Rust explanation:
/// - &mut Vec<T> = mutable reference (we can push, pop, modify)
///   Like passing a list to Python function that modifies it in place
/// - .iter_mut() = iterator over mutable references (&mut BalanceEntry)
///   This lets us modify entry.value directly
/// - if let Some(entry) = ... = pattern matching for Option
///   Like: if entry is not None in Python
/// - entry.value.saturating_sub(amount) = safe subtraction (never goes negative)
///   Like: max(0, entry.value - amount) in Python
///   This prevents underflow attacks (malicious negative numbers)
fn update_balance(balances: &mut Vec<BalanceEntry>, key: Pubkey, amount: u64, add: bool) {
    // Try to find an existing entry for this key
    // .iter_mut() gives us mutable references (we can change entry.value)
    if let Some(entry) = balances.iter_mut().find(|e| e.key == key) {
        // Entry found - update its balance safely
        if add {
            // Add amount using saturating_add (prevents overflow)
            // If result exceeds u64::MAX, cap at MAX instead of panicking
            entry.value = entry.value.saturating_add(amount);
        } else {
            // Subtract amount, but never below 0 (saturating)
            // This is a SAFETY FEATURE: prevents underflow attacks
            // Without saturating_sub, if amount > value, it would wrap to huge number
            entry.value = entry.value.saturating_sub(amount);
        }
    } else if add {
        // Entry NOT found, and we're adding - create new entry
        // This is like Python's: balances[key] = amount (auto-creates if missing)
        // Or Go's: if _, ok := balances[key]; !ok { balances[key] = amount }
        balances.push(BalanceEntry {
            key,      // Shorthand for: key: key
            value: amount,  // Shorthand for: value: amount
            // In Rust, { key, value } = { key: key, value: value }
            // This is called "struct initialization with field init shorthand"
        });
    }
    // If entry not found and add=false (subtracting), we do nothing
    // This is correct: you can't subtract from a non-existent balance
    // The caller should check balance >= amount BEFORE calling this
}

/// Set the frozen status for a wallet account
///
/// Parameters:
/// - frozen: Mutable reference to Vec<FrozenEntry>
/// - account: The wallet address to update
/// - is_frozen: true = freeze, false = unfreeze
///
/// Rust explanation:
/// - This function demonstrates the "create if not exists" pattern
///   If is_frozen=true and entry doesn't exist, create it
///   If is_frozen=false and entry exists, remove it
///   If is_frozen=false and entry doesn't exist, do nothing
fn set_frozen(frozen: &mut Vec<FrozenEntry>, account: Pubkey, is_frozen: bool) {
    // Try to find existing entry
    if let Some(entry) = frozen.iter_mut().find(|e| e.key == account) {
        // Entry exists - update the frozen flag
        entry.frozen = is_frozen;
    } else if is_frozen {
        // Entry doesn't exist AND we're freezing - create new entry
        // This is like Python's: if not frozen and should_freeze: frozen[key] = True
        frozen.push(FrozenEntry {
            key: account,
            frozen: true,  // Always true when creating new entry
        });
    }
    // If entry doesn't exist and is_frozen=false, do nothing
    // (no need to track non-frozen accounts)
}

// =================================================================
// DATA STRUCTURES (On-Chain Storage)
// =================================================================
//
// These structs define what data is stored on the blockchain.
// Each struct annotated with #[account] becomes a Solana account.

/// TokenState is the main storage account for the token program.
/// It holds all the token's metadata, balances, and permissions.
///
/// Rust explanation:
/// - #[account] is an Anchor attribute that tells Anchor:
///   "This struct should be stored as a Solana account"
///   It generates code to serialize/deserialize this struct
/// - pub fields = all fields are public (accessible from anywhere)
///   Like Python's public attributes or Go's exported fields (capitalized)
/// - String in Anchor = variable-length string (stored in the extra space)
///   Unlike Rust's std::string::String, Anchor's String has size limits
/// - Vec<T> = dynamic array (stored in the extra space)
///   Like Python's list or Go's slice
/// - u64 = 64-bit unsigned integer (0 to 18,446,744,073,709,551,615)
///   Like uint64 in Go or int in Python (but fixed 64-bit)
/// - u8 = 8-bit unsigned integer (0 to 255)
///   Like uint8 in Go or byte in Python
#[account]  // Anchor macro: this struct is a Solana account
pub struct TokenState {
    pub owner: Pubkey,              // Who created this token (can add/remove agents)
    pub freeze_authority: Pubkey,   // MEDIUM-05: Independent freeze authority (defaults to owner)
    pub name: String,               // Token name (e.g., "Real World Asset Token")
    pub symbol: String,             // Token symbol (e.g., "RWA")
    pub decimals: u8,               // Decimal places (e.g., 9 means 1 token = 10^9 units)
    pub total_supply: u64,          // Total tokens minted (like Ethereum's totalSupply)
    pub next_index: u64,            // Counter for future use (like an auto-increment ID)
    pub balances: Vec<BalanceEntry>, // All token balances (like a bank's ledger)
    pub frozen_accounts: Vec<FrozenEntry>, // Accounts that are frozen (can't transfer)
    pub agents: Vec<Pubkey>,        // Authorized agents (can mint, burn, transfer freeze authority)
    pub compliance_modules: Vec<Pubkey>, // Compliance modules to check (future feature)
}

/// BalanceEntry stores a single wallet's token balance.
/// We use a Vec instead of a HashMap because Anchor doesn't support HashMap.
///
/// Rust explanation:
/// - #[derive(Clone)] = generates .clone() method (copy the struct)
///   Like copy.deepcopy() in Python or Go's struct copying
/// - #[derive(AnchorSerialize, AnchorDeserialize)] = generates code to convert
///   this struct to/from bytes for Solana storage
///   Like JSON serialization in Python (json.dumps/json.loads)
///   But binary format (more efficient than JSON)
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct BalanceEntry {
    pub key: Pubkey,   // Wallet address (like a bank account number)
    pub value: u64,    // Balance in smallest units (like satoshis for Bitcoin)
}

/// FrozenEntry stores the frozen status of a wallet account.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct FrozenEntry {
    pub key: Pubkey,   // Wallet address
    pub frozen: bool,  // true = frozen (can't transfer), false = active
}

// =================================================================
// TRAIT IMPLEMENTATIONS (Add methods to existing structs)
// =================================================================
//
// Rust lets you add methods to types you define (and even external types!).
// This is like adding methods to a class in Python or defining methods on a struct in Go.

impl TokenState {
    /// Check if a given account is an authorized agent
    ///
    /// Parameters:
    /// - &self = reference to this TokenState instance (like 'self' in Python)
    /// - account = the Pubkey to check
    ///
    /// Returns: bool = true if account is in the agents list
    ///
    /// Rust explanation:
    /// - self.agents.contains(account) checks if the Vec contains the Pubkey
    ///   Like: account in self.agents in Python
    ///   Or: contains(self.agents, account) in Go (with a helper function)
    /// - &Pubkey in parameter = we receive a reference (don't take ownership)
    ///   This is efficient: no copying of the 32-byte Pubkey
    pub fn is_agent(&self, account: &Pubkey) -> bool {
        self.agents.contains(account)
    }

    /// Check if a given account is frozen
    ///
    /// Parameters:
    /// - &self = reference to this TokenState instance
    /// - account = the Pubkey to check
    ///
    /// Returns: bool = true if account is frozen (can't transfer)
    ///
    /// Rust explanation:
    /// - self.frozen_accounts.iter().find() searches for a FrozenEntry with matching key
    ///   Like: next(e for e in self.frozen_accounts if e.key == account) in Python
    /// - .map(|e| e.frozen) extracts the frozen field if found
    /// - .unwrap_or(false) returns false if not found (not frozen)
    ///   Like: .get(key, False) in Python dict
    pub fn is_frozen(&self, account: &Pubkey) -> bool {
        self.frozen_accounts
            .iter()
            .find(|e| e.key == *account)
            .map(|e| e.frozen)
            .unwrap_or(false)
    }
}

// =================================================================
// ERROR CODES
// =================================================================
//
// Custom error codes that the program can return.
// Anchor generates efficient error codes (4 bytes each) instead of strings.

#[error_code]  // Anchor macro: generates error code mapping
pub enum ErrorCode {
    /// Caller is not authorized to perform this action
    /// Returned when: non-agent tries to mint/burn/freeze, or non-owner tries to manage agents
    #[msg("Unauthorized")]  // Human-readable message for logs
    Unauthorized,

    /// Account doesn't have enough tokens
    /// Returned when: trying to transfer/burn more than balance
    #[msg("Insufficient balance")]
    InsufficientBalance,

    /// Account is frozen and cannot transfer
    /// Returned when: trying to transfer from/to a frozen account
    #[msg("Account frozen")]
    AccountFrozen,

    /// Agent already exists in the list
    /// Returned when: trying to add a duplicate agent
    #[msg("Agent already exists")]
    DuplicateAgent,

    /// HIGH-03 FIX: Invalid amount (zero amount not allowed)
    /// Returned when: transfer or mint with amount = 0
    #[msg("Invalid amount: amount must be greater than zero")]
    InvalidAmount,

    /// HIGH-04 FIX: Supply exceeded maximum cap
    /// Returned when: trying to mint beyond MAX_SUPPLY
    #[msg("Supply exceeded maximum cap")]
    SupplyExceeded,

    /// Supply overflow (arithmetic error)
    /// Returned when: supply calculation overflows u64
    #[msg("Supply overflow")]
    SupplyOverflow,

    /// HIGH-01 FIX: New owner cannot be the same as current owner
    /// Returned when: transfer_owner called with same owner
    #[msg("New owner cannot be the same as current owner")]
    SameOwner,

    /// MEDIUM-05 FIX: Caller is not the freeze authority
    /// Returned when: non-freeze-authority tries to freeze/unfreeze accounts
    #[msg("Caller is not the freeze authority")]
    NotFreezeAuthority,

    /// MEDIUM-05 FIX: New freeze authority cannot be the same as current
    /// Returned when: transfer_freeze_authority called with same authority
    #[msg("New freeze authority cannot be the same as current")]
    SameFreezeAuthority,
}

// =================================================================
// EVENTS
// =================================================================

/// Event emitted when token ownership is transferred
#[event]
pub struct OwnerTransferredEvent {
    pub old_owner: Pubkey,
    pub new_owner: Pubkey,
    pub transferred_by: Pubkey,
}

/// Event emitted when tokens are minted
#[event]
pub struct TokensMintedEvent {
    pub to: Pubkey,
    pub amount: u64,
    pub total_supply: u64,
    pub minted_by: Pubkey,
}

/// Event emitted when an account is frozen
#[event]
pub struct AccountFrozenEvent {
    pub account: Pubkey,
    pub frozen_by: Pubkey,
}

/// Event emitted when an account is unfrozen
#[event]
pub struct AccountUnfrozenEvent {
    pub account: Pubkey,
    pub unfrozen_by: Pubkey,
}

/// MEDIUM-05: Event emitted when freeze authority is transferred
#[event]
pub struct FreezeAuthorityTransferredEvent {
    pub old_freeze_authority: Pubkey,
    pub new_freeze_authority: Pubkey,
    pub transferred_by: Pubkey,
}
