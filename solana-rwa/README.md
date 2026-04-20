# Solana RWA Token Platform

This project implements the RWA (Real World Assets) token platform on Solana using Rust and Anchor framework. It's a direct port of the ERC-3643 compliant token system from Ethereum to Solana, maintaining all the compliance and identity management features.

## Architecture Overview

The system consists of several key components:

1. **Token Program**: Implements the core ERC-3643 compliant token with identity verification and compliance modules
2. **Identity Registry Program**: Manages investor identities and links wallet addresses to identity contracts
3. **Compliance Aggregator Program**: Centralized management of compliance modules for multiple tokens
4. **Compliance Modules**: Individual modules implementing specific compliance rules:
   - MaxBalanceCompliance: Enforces maximum balance per wallet
   - MaxHoldersCompliance: Limits maximum number of token holders
   - TransferLockCompliance: Implements lock-up periods for transfers

## Key Features

- **Identity Verification**: Wallets must be registered and verified with valid claims
- **Compliance Enforcement**: Multiple compliance modules can be dynamically added/removed
- **Access Control**: Role-based access control for administrative functions
- **Token Management**: Minting, burning, and transfer operations with compliance checks
- **Flexible Compliance**: Compliance modules can be added or removed dynamically

## Project Structure

```
solana-rwa/
├── programs/
│   ├── solana-rwa/              # Main token program
│   ├── identity-registry/       # Identity registry program
│   ├── compliance-aggregator/   # Compliance aggregator program
│   └── compliance-modules/      # Individual compliance modules
├── tests/
├── Anchor.toml
└── DEPLOY_INSTRUCTIONS.md       # Deployment instructions
```

## Compliance Rules Implemented

1. **Maximum Balance per Wallet**: Each wallet can hold a maximum number of tokens
2. **Maximum Number of Holders**: Limit on the total number of token holders
3. **Transfer Lock Period**: Tokens are locked for a period after purchase

## IDL Consistency

The project maintains full consistency between Rust code and generated IDL files:
- All programs use proper Anchor annotations
- Functions, accounts, and error codes are properly defined
- Program IDs are consistent across all configurations
- Generated IDL files match the Rust implementation

## Deployment Instructions

The project is configured for deployment using Surfpool with the following program IDs:
- `solana_rwa`: 7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5
- `identity_registry`: 9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n1
- `compliance_aggregator`: 8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o3

### Deployment Process:
1. Build programs: `anchor build`
2. Deploy to localnet: `anchor deploy`
3. Run tests: `anchor test`

## Development Guidelines

- All programs follow Anchor framework conventions
- Use of `#[account]` for state management
- Proper error handling with custom error types
- Comprehensive testing with Anchor test framework
- Role-based access control using Anchor's built-in features

## Testing

The test suite verifies:
- Program initialization and basic functionality
- Token minting, burning, and transfer operations
- Identity registration and management
- Compliance module integration
- Access control mechanisms

## Surfpool Integration

The project is designed to work seamlessly with Surfpool for localnet deployment:
- Pre-configured for localnet cluster
- Wallet configuration ready for deployment
- All program IDs pre-defined for easy deployment