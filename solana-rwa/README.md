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
├── txtx.yml                     # Surfpool IaC manifest
├── runbooks/                    # txtx deployment runbooks
│   └── deployment/
│       ├── main.tx              # Deployment actions
│       ├── signers.localnet.tx  # Localnet signers
│       ├── signers.devnet.tx    # Devnet signers
│       └── signers.mainnet.tx   # Mainnet signers
└── DEPLOY_INSTRUCTIONS.md       # Legacy deployment instructions
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

## Development Setup

### Prerequisites

1. **Rust & Cargo**: https://rustup.rs/
2. **Anchor CLI**: `cargo install anchor-cli`
3. **Solana CLI**: https://docs.solana.com/cli/install-solana-cli-tools
4. **Surfpool CLI**: See below

### Install Surfpool

Surfpool is a drop-in replacement for `solana-test-validator` with enhanced features for local development:

```bash
# Install Surfpool CLI
curl -sL https://run.surfpool.run/ | bash

# Verify installation
surfpool --version
```

### Configure Solana CLI

```bash
# Set default keypair path
solana config set --keypair ~/.config/solana/id.json
```

## Surfpool & txtx Deployment

This project uses **Surfpool** with **txtx** (Infrastructure as Code) for reproducible deployments across all environments.

### Quick Start - Local Development

```bash
cd solana-rwa

# 1. Build programs
anchor build

# 2. Start Surfpool localnet (auto-detects Anchor project)
surfpool start

# Dashboard available at: http://localhost:18488

# 3. Deploy programs using txtx runbook
surfpool run deployment --env localnet -u

# 4. Verify deployment
solana program list

# 5. Run tests
anchor test --provider.url http://127.0.0.1:8899
```

### Watch Mode (Auto-redeploy)

```bash
# Automatically redeploys when .so files change
surfpool start --watch
```

### CI Mode (For pipelines)

```bash
# Start in background, no UI, no profiling
surfpool start --ci --daemon

# Run deployment
surfpool run deployment --env localnet -u

# Stop surfpool
pkill surfpool
```

### Deploy to Devnet

```bash
# Ensure signers.devnet.tx is configured
# Then run:
surfpool run deployment --env devnet -u

# Or with web UI supervision (opens browser at http://127.0.0.1:8488)
surfpool run deployment --env devnet
```

### Deploy to Mainnet

```bash
# Ensure signers.mainnet.tx is configured with your wallet/multisig
# Then run:
surfpool run deployment --env mainnet -u
```

### Available Commands

| Command | Description |
|---------|-------------|
| `surfpool start` | Start local Surfnet with TUI dashboard |
| `surfpool start --ci` | Start in CI mode (no UI) |
| `surfpool start --watch` | Start with auto-redeploy on .so changes |
| `surfpool run deployment --env localnet -u` | Deploy runbook unsupervised |
| `surfpool run deployment --env devnet` | Deploy with web UI supervision |
| `surfpool ls` | List all runbooks in manifest |
| `surfpool run deployment --explain` | Show execution plan |

### txtx Configuration

The deployment is configured through:

- **`txtx.yml`**: Main manifest defining runbooks and environment variables
- **`runbooks/deployment/main.tx`**: Actions to deploy each program
- **`runbooks/deployment/signers.*.tx`**: Signer configuration per environment

Each environment in `txtx.yml` provides variables accessible as `input.<name>` in the runbooks.

## Testing

The test suite verifies:
- Program initialization and basic functionality
- Token minting, burning, and transfer operations
- Identity registration and management
- Compliance module integration
- Access control mechanisms

## Program IDs

| Program | ID |
|---------|-----|
| solana_rwa | 7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5 |
| identity_registry | 9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n1 |
| compliance_aggregator | 8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o3 |

## Development Guidelines

- All programs follow Anchor framework conventions
- Use of `#[account]` for state management
- Proper error handling with custom error types
- Comprehensive testing with Anchor test framework
- Role-based access control using Anchor's built-in features

## CI/CD

See `.github/workflows/solana-deploy.yml` for the automated deployment pipeline.
