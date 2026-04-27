// =============================================================================
// PROGRAM IDs FOR CROSS-PROGRAM CALLS
// =============================================================================
//
// This module provides program IDs for cross-program invocation (CPI)
// between the three Solana RWA programs:
//   1. solana_rwa (token program) - this program
//   2. identity_registry - manages identity verification
//   3. compliance_aggregator - handles compliance modules
//
// IMPORTANT: These IDs must match the values in:
//   - Anchor.toml [programs.localnet] section
//   - web/src/config/solana.ts PROGRAM_IDS.localnet
//   - txtx.yml environments.localnet section
//
// Rust Basics for Python/Go/PHP/Perl Developers:
// -----------------------------------------------
//
// 1. CONSTANTS (pub const):
//    - Like Python's module-level variables, but with type checking
//    - pub = public (accessible from other modules)
//    - const = cannot be changed after compilation (like Python's constants by convention)
//    - Example: const MAX_SIZE: u32 = 1000;
//
// 2. STRSLICE (&str):
//    - Like Python's str, but borrowed (doesn't own the data)
//    - &str = "a view into a string slice"
//    - Analogy: Python's slice object vs the actual string
//
// 3. FUNCTIONS:
//    - pub fn = public function (like def in Python, but with visibility)
//    - -> Pubkey = return type (like -> int in Python type hints)
//    - Analogy: def get_id() -> PublicKey: in Python
//
// 4. PUBKEY::FROM_STR:
//    - Parses a Base58 string into a Solana Pubkey (32-byte array)
//    - Returns Result<Pubkey, ParseError> (like Go's error handling)
//    - The ? operator unwraps Ok, returns Err on failure
//    - Analogy: Like int("123") in Python, but with explicit error handling
//
// 5. UNWRAP():
//    - Extracts the value from Ok() or panics if Err()
//    - DANGER: Like Python's assert, but panics instead of raising
//    - SAFE in this case because we're using hardcoded valid Base58 strings
//    - Alternative: .unwrap_or_default() or .expect("message")
//
// BASE58 ENCODING:
// - Solana addresses use Base58 (not hex like Ethereum)
// - Base58 removes confusing characters: 0, O, I, l
// - Like Python's base64 encoding, but for blockchain addresses
// - Example: "3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5" is a Base58 string

use anchor_lang::prelude::*;
use std::str::FromStr;  // Required for Pubkey::from_str()
// Rust explanation: FromStr is a trait that defines how to parse a string into a type
// Like Python's: int("123") or float("3.14")
// In Rust: "123".parse::<i32>() or Pubkey::from_str("abc...")

// =============================================================================
// LOCALNET PROGRAM IDs (Development)
// =============================================================================
// These IDs are generated when you run: anchor keys list
// They MUST match Anchor.toml [programs.localnet] section exactly
//
// How to generate new IDs (like creating new contract addresses in Solidity):
//   1. Run: anchor keys list
//   2. Copy the output for each program
//   3. Update both Anchor.toml AND this file
//
// IMPORTANT: These IDs are ONLY for local development
// Production (devnet/mainnet) uses different IDs per deployment

/// Solana RWA Token Program ID (localnet development)
/// This is the address of the solana_rwa program on localnet
/// Like a deployed smart contract's address, but for local testing
pub const SOLANA_RWA_PROGRAM_ID: &str = "6XDDBdZm8pqamteHWRHS2A8Ka4Pb6BkN5nCpWxWCzVpe";

/// Identity Registry Program ID (localnet development)
/// This is the address of the identity_registry program on localnet
/// Like a deployed smart contract's address, but for local testing
pub const IDENTITY_REGISTRY_PROGRAM_ID: &str = "6ULwDvPcDHFVET7oi172RSvE51oGmLC8PajxfnzVH5fc";

/// Compliance Aggregator Program ID (localnet development)
/// This is the address of the compliance_aggregator program on localnet
pub const COMPLIANCE_AGGREGATOR_PROGRAM_ID: &str = "9EbDbR12nkLx2t7iYDJCgvJrELM1cDKqLQHgVWG3vzY7";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
// These functions convert string IDs to Pubkey objects
// Used when the program needs to call another program

/// Get the Solana RWA program ID as a Pubkey
pub fn get_solana_rwa_program_id_local() -> Pubkey {
    Pubkey::from_str(SOLANA_RWA_PROGRAM_ID).unwrap()
}

/// Get the Identity Registry program ID as a Pubkey
pub fn get_identity_registry_program_id() -> Pubkey {
    Pubkey::from_str(IDENTITY_REGISTRY_PROGRAM_ID).unwrap()
}

/// Get the Compliance Aggregator program ID as a Pubkey
pub fn get_compliance_aggregator_program_id() -> Pubkey {
    Pubkey::from_str(COMPLIANCE_AGGREGATOR_PROGRAM_ID).unwrap()
}

// =============================================================================
// SELF-PROGRAM ID
// =============================================================================
/// Get this program's (solana_rwa) ID as a Pubkey
/// Used when making CPIs to other programs from this program
pub fn get_solana_rwa_program_id() -> Pubkey {
    // id() is an Anchor-generated function from declare_id!()
    // Returns the program's own public key
    // Analogy: Like self.address in Solidity
    super::id()
}

// =============================================================================
// CROSS-PROGRAM INVOCATION (CPI) HELPERS
// =============================================================================
// These macros/functions help with calling other programs
// Similar to how Solidity uses interface contracts to call other contracts

/// Macro to create a CPI context for calling identity_registry program
///
/// Rust explanation:
/// - Macro = code that generates code (like Python's decorators, but more powerful)
/// - anchor_lang::system_program::transfer() = creates a system program instruction
/// - Analogy: Like creating a function call to another smart contract in Solidity
///
/// Usage example (in instruction handlers):
///   let cx = CPIContext::new(identity_registry_program, ctx_accounts);
///   identity_registry::instructions::some_instruction(cx, args);
#[macro_export]
macro_rules! cpi_identity_registry {
    ($context:expr) => {
        anchor_lang::context::CpiContext::new(
            $crate::ids::get_identity_registry_program_id(),
            $context,
        )
    };
}

/// Macro to create a CPI context for calling compliance_aggregator program
#[macro_export]
macro_rules! cpi_compliance_aggregator {
    ($context:expr) => {
        anchor_lang::context::CpiContext::new(
            $crate::ids::get_compliance_aggregator_program_id(),
            $context,
        )
    };
}

// =============================================================================
// TESTING
// =============================================================================
// Unit tests to verify program IDs are valid Base58 strings
// and match expected formats

#[cfg(test)]
mod tests {
    use super::*;

    /// Test that program IDs are valid Base58 strings
    /// Like Python's: def test_valid_base58(): assert is_base58(id)
    #[test]
    fn test_identity_registry_program_id_is_valid() {
        // Pubkey::from_str() will panic if the string is invalid Base58
        let result = Pubkey::from_str(IDENTITY_REGISTRY_PROGRAM_ID);
        assert!(result.is_ok(), "Identity registry program ID must be valid Base58");
    }

    /// Test that compliance aggregator program ID is valid
    #[test]
    fn test_compliance_aggregator_program_id_is_valid() {
        let result = Pubkey::from_str(COMPLIANCE_AGGREGATOR_PROGRAM_ID);
        assert!(result.is_ok(), "Compliance aggregator program ID must be valid Base58");
    }

    /// Test that helper functions return valid Pubkeys
    #[test]
    fn test_helper_functions_return_valid_pubkeys() {
        let rwa_id = get_solana_rwa_program_id_local();
        let identity_id = get_identity_registry_program_id();
        let compliance_id = get_compliance_aggregator_program_id();

        // All Pubkeys should be different (not zero addresses)
        assert_ne!(rwa_id, Pubkey::default());
        assert_ne!(identity_id, Pubkey::default());
        assert_ne!(compliance_id, Pubkey::default());

        // All Pubkeys should be different from each other
        assert_ne!(rwa_id, identity_id);
        assert_ne!(rwa_id, compliance_id);
        assert_ne!(identity_id, compliance_id);
    }

    /// Test that program IDs are correct length (32 bytes when decoded)
    #[test]
    fn test_program_ids_correct_length() {
        let rwa_pubkey = get_solana_rwa_program_id_local();
        let identity_pubkey = get_identity_registry_program_id();
        let compliance_pubkey = get_compliance_aggregator_program_id();

        // Pubkeys are always 32 bytes (like Ethereum addresses are 20 bytes)
        assert_eq!(rwa_pubkey.to_bytes().len(), 32);
        assert_eq!(identity_pubkey.to_bytes().len(), 32);
        assert_eq!(compliance_pubkey.to_bytes().len(), 32);
    }
}
