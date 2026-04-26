# Solana RWA Token Platform

This project implements the RWA (Real World Assets) token platform on Solana using Rust and Anchor framework. It's a direct port of the ERC-3643 compliant token system from Ethereum to Solana, maintaining all the compliance and identity management features.

## Architecture Overview

The system consists of several key components:

1. **Token Program**: Implements the core ERC-3643 compliant token with identity verification and compliance modules (PDA Architecture)
2. **Identity Registry Program**: Manages investor identities and links wallet addresses to identity contracts (PDA Architecture)
3. **Compliance Aggregator Program**: Centralized management of compliance modules for multiple tokens (PDA Architecture)
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
└── docs/                       # Project documentation
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

This project uses **Anchor** for program building and **Surfpool** with **txtx** (Infrastructure as Code) for initialization and operations. Program deployment uses `solana program deploy` with fixed keypairs that match the `declare_id!()` macros in each program.

### Why Fixed Keypairs?

Solana programs use the `declare_id!()` macro to embed a fixed program ID directly in the program bytecode at compile time. When deploying, the keypair used must match this ID, otherwise the validator rejects the deployment with a `DeclaredProgramIdMismatch` error.

This project solves this by:
1. Generating fixed keypairs one-time with `setup-keypairs.sh`
2. Updating `declare_id!()` in each program to match the generated keypairs
3. Updating `Anchor.toml` with the new program IDs
4. Deploying with `solana program deploy --program-id <keypair>`

### Quick Start - Local Development

```bash
cd solana-rwa

# ===== SETUP (ONE-TIME ONLY) =====

# 1. Start Surfpool localnet (auto-detects Anchor project)
surfpool start

# Dashboard available at: http://localhost:18488

# 2. Generate fixed keypairs for all programs
./scripts/setup-keypairs.sh

# This will:
#   - Generate keypairs in keys/ directory
#   - Update declare_id!() in each program to match
#   - Update Anchor.toml [programs.localnet] section

# 3. Build all programs (rebuild after setup-keypairs)
anchor build

# ===== DEPLOYMENT =====

# 4. Deploy programs using the deployment script
./deploy.sh

# This will:
#   - Verify keypairs exist
#   - Deploy each program using solana program deploy --program-id <keypair>
#   - Generate IDL files (anchor idl build)
#   - Show deployment summary with program IDs

# 5. Initialize programs using the initialization script
./init.sh

# This will run:
#   - txtx run compliance-initialization --env localnet
#   - txtx run identity-initialization --env localnet
#   - txtx run token-initialization --env localnet

# 6. Verify deployment
solana program list

# 7. Run tests
anchor test --provider.url http://127.0.0.1:8899
```

### Manual Deployment Steps

If you prefer to run commands manually:

```bash
# Build all programs
anchor build

# Deploy each program in dependency order using fixed keypairs
solana program deploy --program-id keys/compliance_aggregator.json target/deploy/compliance_aggregator.so
solana program deploy --program-id keys/identity_registry.json target/deploy/identity_registry.so
solana program deploy --program-id keys/solana_rwa.json target/deploy/solana_rwa.so

# Generate IDL files
anchor idl build -p compliance_aggregator -o idl_compliance_aggregator.json
anchor idl build -p identity_registry -o idl_identity_registry.json
anchor idl build -p solana_rwa -o idl_solana_rwa.json

# Initialize programs
txtx run compliance-initialization --env localnet
txtx run identity-initialization --env localnet
txtx run token-initialization --env localnet
```

### Deployment Script Options

```bash
./deploy.sh                    # Deploy to localnet
./deploy.sh devnet             # Deploy to devnet
./deploy.sh mainnet            # Deploy to mainnet
./deploy.sh --reset            # Reset validator and deploy to localnet
```

### Initialization Script Options

```bash
./init.sh                      # Initialize on localnet
./init.sh devnet               # Initialize on devnet
./init.sh mainnet              # Initialize on mainnet
```

### Watch Mode (Auto-redeploy)

```bash
# Automatically redeploys when .so files change
surfpool start --watch

# Then run deploy.sh after making changes
./deploy.sh
```

### CI Mode (For pipelines)

```bash
# Start in background, no UI, no profiling
surfpool start --ci --daemon

# Deploy and initialize
./deploy.sh
./init.sh

# Stop surfpool
pkill surfpool
```

### Deploy to Devnet

```bash
# Ensure your devnet wallet is configured at ~/.config/solana/devnet.json
# Then run:
./deploy.sh devnet
./init.sh devnet
```

### Deploy to Mainnet

```bash
# Ensure your mainnet wallet is configured at ~/.config/solana/mainnet.json
# Then run:
./deploy.sh mainnet
./init.sh mainnet
```

### Available txtx Commands

| Command | Description |
|---------|-------------|
| `surfpool start` | Start local Surfnet with TUI dashboard |
| `surfpool start --ci` | Start in CI mode (no UI) |
| `surfpool start --watch` | Start with auto-redeploy on .so changes |
| `surfpool run compliance-initialization --env localnet` | Initialize compliance aggregator |
| `surfpool run identity-initialization --env localnet` | Initialize identity registry |
| `surfpool run token-initialization --env localnet` | Initialize token |
| `surfpool run token-operations --env localnet` | Run token operations |
| `surfpool ls` | List all runbooks in manifest |
| `surfpool run <runbook> --explain` | Show execution plan |

### txtx Configuration

The initialization is configured through:

- **`txtx.yml`**: Main manifest defining runbooks and environment variables
- **`runbooks/compliance-initialization/main.tx`**: Initialize compliance aggregator PDA
- **`runbooks/identity-initialization/main.tx`**: Initialize identity registry PDA
- **`runbooks/token-initialization/main.tx`**: Initialize token state PDA

Each environment in `txtx.yml` provides variables accessible as `input.<name>` in the runbooks.

## Testing

The test suite verifies:
- Program initialization and basic functionality
- Token minting, burning, and transfer operations
- Identity registration and management
- Compliance module integration
- Access control mechanisms

## Program IDs (Localnet with Fixed Keypairs)

Program IDs are generated once by `scripts/setup-keypairs.sh` and are fixed for localnet development. These IDs match:
- The keypair files in `keys/` directory
- The `declare_id!()` macros in each program's source code
- The `[programs.localnet]` section in `Anchor.toml`
- The deployed program addresses on localnet

| Program | ID | Keypair File |
|---------|-----|--------------|
| compliance_aggregator | 7cURjJvyf3oe6JsuVxS9EiVHKNauiFj7Gao3THzZSnpb | `keys/compliance_aggregator.json` |
| identity_registry | 5SeHm9i7CcgHqF9UBYBtGbzqf3F3FWFETQF8AxfU2Rce | `keys/identity_registry.json` |
| solana_rwa | 2XuB3ngjvJkMTxB82eM9NszBUGNovjuJUs4mzdez7EEX | `keys/solana_rwa.json` |

> **Note:** If you need to regenerate keypairs (e.g., after deleting them), run `./scripts/setup-keypairs.sh` again. This will regenerate all keypairs and update all configuration files automatically.

## Keypair Management

### Keypair Directory Structure

```
keys/
├── compliance_aggregator.json  # Keypair for compliance-aggregator program
├── identity_registry.json      # Keypair for identity-registry program
├── solana_rwa.json             # Keypair for solana-rwa program
└── .program_ids.env            # Cached program IDs (for internal use)
```

### Regenerating Keypairs

If you delete the `keys/` directory or need fresh keypairs:

```bash
# 1. Run setup-keypairs.sh (generates keypairs + updates configs)
./scripts/setup-keypairs.sh

# 2. Rebuild programs (so bytecode matches new declare_id!())
anchor build

# 3. Deploy with new keypairs
./deploy.sh
```

## Development Guidelines

- All programs follow Anchor framework conventions
- Use of `#[account]` for state management
- Proper error handling with custom error types
- Comprehensive testing with Anchor test framework
- Role-based access control using Anchor's built-in features

## CI/CD

See `.github/workflows/solana-deploy.yml` for the automated deployment pipeline.
