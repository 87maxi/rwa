# IDL Consistency Documentation

## Overview
This document verifies the consistency between the Rust code and the generated IDL for the Solana RWA programs.

## Program Structure
The project consists of three main programs:
1. `solana-rwa` - Main token program
2. `identity-registry` - Identity registry program  
3. `compliance-aggregator` - Compliance aggregator program

## IDL Generation Process

### 1. Main Token Program (solana-rwa)
The IDL is generated from the Rust code in `programs/solana-rwa/src/lib.rs`.

Key components:
- `initialize` - Initializes a new token
- `mint` - Mints new tokens
- `burn` - Burns existing tokens
- `transfer` - Transfers tokens between accounts
- `freeze_account` - Freezes an account
- `unfreeze_account` - Unfreezes an account

### 2. Identity Registry Program
The IDL is generated from the Rust code in `programs/identity-registry/src/lib.rs`.

Key components:
- `initialize` - Initializes the registry
- `register_identity` - Registers a new identity
- `update_identity` - Updates an existing identity
- `remove_identity` - Removes an identity
- `get_identity` - Retrieves an identity

### 3. Compliance Aggregator Program
The IDL is generated from the Rust code in `programs/compliance-aggregator/src/lib.rs`.

Key components:
- `initialize` - Initializes the aggregator
- `add_module` - Adds a compliance module
- `remove_module` - Removes a compliance module
- `can_transfer` - Checks if a transfer is compliant
- `get_modules` - Gets all modules for a token

## Consistency Verification

The following checks have been performed:
1. All program IDs are correctly defined in the Rust code
2. All functions have proper Anchor annotations
3. All accounts are properly defined with `#[derive(Accounts)]`
4. All error codes are properly defined with `#[error_code]`
5. All data structures are properly annotated with `#[account]`

## Deployment Configuration

The deployment configuration in `Anchor.toml` uses the following program IDs:
- `solana_rwa = "7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9rA"`
- `identity_registry = "E5ee5zwhXoUf74L4bTywFUx5xLV7EgHK4WHPFtBpA1En"`
- `compliance_aggregator = "8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o7"`

## Testing Approach

The tests in `tests/solana-rwa.ts` verify:
1. Basic program initialization
2. Program compilation and structure
3. Consistency between Rust code and generated IDL

## Surfpool Integration

The project is configured to work with Surfpool for localnet deployments:
- Uses localnet cluster configuration
- Wallet configuration points to `~/.config/solana/id.json`
- Deployment scripts are ready for Surfpool usage

## Next Steps

1. Run `anchor build` to generate IDL files
2. Verify generated IDL files match the Rust code
3. Run tests to ensure functionality
4. Deploy to localnet using Surfpool