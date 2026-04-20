# Solana RWA - Complete Deployment System Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Runbook Organization](#runbook-organization)
3. [Multi-Environment Strategies](#multi-environment-strategies)
4. [Scripts System](#scripts-system)
5. [Code Consistency Verification](#code-consistency-verification)
6. [Best Practices](#best-practices)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

This project uses **Surfpool** with the **txtx** DSL for Infrastructure as Code (IaC) on Solana. The system provides:

- **Local Development**: Drop-in replacement for `solana-test-validator` with mainnet forking
- **Multi-Environment Deployment**: Consistent deployment across localnet, devnet, and mainnet
- **State Management**: Automatic detection of changes to avoid redundant deployments
- **Type-Safe Signers**: Different signing methods per environment (keypair, web wallet, multisig)

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Development Workflow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │  Cargo   │───▶│  Anchor  │───▶│   .so    │                  │
│  │  Build   │    │  Build   │    │ Binary   │                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
│                                       │                          │
│                                       ▼                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │  .env    │◀───│  Init    │◀───│  Deploy  │                  │
│  │  Files   │    │  Programs│    │  via     │                  │
│  └──────────┘    └──────────┘    │  txtx    │                  │
│                                   └──────────┘                  │
│                                         │                        │
│                    ┌────────────────────┼──────────────────┐    │
│                    ▼                    ▼                  ▼    │
│              ┌──────────┐      ┌──────────┐      ┌──────────┐ │
│              │ Localnet │      │  Devnet  │      │  Mainnet │ │
│              │ (Surfnet)│      │ (Testing)│      │(Prod)    │ │
│              └──────────┘      └──────────┘      └──────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Runbook Organization

### Directory Structure

```
solana-rwa/
├── txtx.yml                              # Manifest (entry point)
├── Anchor.toml                           # Anchor configuration
├── programs/
│   ├── solana-rwa/                       # Main token program
│   ├── identity-registry/                # Identity management
│   └── compliance-aggregator/            # Compliance enforcement
├── runbooks/
│   └── deployment/
│       ├── main.tx                       # Core deployment actions
│       ├── signers.localnet.tx           # Localnet signers
│       ├── signers.devnet.tx             # Devnet signers
│       └── signers.mainnet.tx            # Mainnet signers
├── scripts/
│   ├── build.sh                          # Build all programs
│   ├── deploy.sh                         # Deploy via txtx
│   ├── verify.sh                         # Verify deployment
│   ├── upgrade.sh                        # Upgrade programs
│   ├── init.sh                           # Post-deploy init
│   ├── status.sh                         # Check status
│   ├── clean.sh                          # Clean artifacts
│   ├── keys.sh                           # Key management
│   ├── idl.sh                            # IDL management
│   ├── env.sh                            # Environment switching
│   ├── dev-setup.sh                      # Dev environment setup
│   └── test-pipeline.sh                  # Test pipeline
└── docs/
    ├── DEPLOYMENT_SYSTEM.md              # This file
    └── SURFPOL_DEPLOYMENT_SYSTEM.md      # Detailed Surfpool guide
```

### File Responsibilities

#### [`txtx.yml`](../txtx.yml) - Manifest

The manifest is the **single entry point** for Surfpool. It defines:

- Runbook locations and metadata
- Environment configurations (localnet, devnet, mainnet)
- State management settings
- RPC URLs and keypair paths

```yaml
---
name: solana-rwa
id: solana-rwa
runbooks:
  - name: deployment
    description: Deploy all Solana RWA programs
    location: ./runbooks/deployment
    state:
      location: .surfpool/state    # Prevents redundant deployments
environments:
  localnet:
    network_id: localnet
    rpc_api_url: http://127.0.0.1:8899
    payer_keypair_json: ~/.config/solana/id.json
    authority_keypair_json: ~/.config/solana/id.json
  devnet:
    network_id: devnet
    rpc_api_url: https://api.devnet.solana.com
  mainnet:
    network_id: mainnet
    rpc_api_url: https://api.mainnet-beta.solana.com
```

#### [`main.tx`](../runbooks/deployment/main.tx) - Core Actions

Defines **what** gets deployed:

```tx
addon "svm" {
    rpc_api_url = input.rpc_api_url
    network_id = input.network_id
}

action "deploy_solana_rwa" "svm::deploy_program" {
    description = "Deploy solana_rwa program"
    program = svm::get_program_from_anchor_project("solana_rwa")
    authority = signer.authority
    payer = signer.payer
}
```

Each action:
- Calls `svm::deploy_program` to deploy an Anchor program
- Uses `svm::get_program_from_anchor_project()` to find the `.so` binary
- References signers for authority and payment

#### [`signers.*.tx`](../runbooks/deployment/) - Environment-Specific Signers

| File | Signer Type | Use Case |
|------|-------------|----------|
| `signers.localnet.tx` | `svm::secret_key` | Local development - direct keypair access |
| `signers.devnet.tx` | `svm::web_wallet` | Devnet testing - browser-based signing |
| `signers.mainnet.tx` | `svm::web_wallet` | Production - browser or multisig |

**Localnet Signers** (trusted environment):
```tx
signer "payer" "svm::secret_key" {
    keypair_json = "~/.config/solana/id.json"
}
```

**Devnet/Mainnet Signers** (untrusted environment):
```tx
signer "payer" "svm::web_wallet" {
    // Browser-based signing at runtime
    // expected_address = "..."  // Optional: enforce specific address
}
```

---

## Multi-Environment Strategies

### Strategy 1: Separate Signer Files (Current Approach)

Each environment has its own `signers.*.tx` file in the runbook directory.

**Pros:**
- Clear separation of concerns
- Environment-specific security models
- Easy to audit signing methods per environment
- Surfpool automatically selects the right file based on `--env` flag

**Cons:**
- Must maintain multiple signer files
- Risk of forgetting to update all files

**Usage:**
```bash
./scripts/deploy.sh localnet    # Uses signers.localnet.tx
./scripts/deploy.sh devnet      # Uses signers.devnet.tx
./scripts/deploy.sh mainnet     # Uses signers.mainnet.tx
```

### Strategy 2: Conditional Signers in Single File

Use conditional logic in a single signer file:

```tx
// signers.tx (single file approach)
@if ENV == "localnet"
signer "payer" "svm::secret_key" {
    keypair_json = "~/.config/solana/id.json"
}
@endif

@if ENV == "devnet" || ENV == "mainnet"
signer "payer" "svm::web_wallet" {
    expected_address = "..."
}
@endif
```

**Pros:**
- Single source of truth
- Easier to maintain consistency

**Cons:**
- Less clear separation
- Conditional syntax may be less intuitive

### Strategy 3: External Key Management

Use external key management for production:

```tx
signer "payer" "svm::squads" {
    multisig_pda = "..."
    threshold = 2
    members = ["key1", "key2", "key3"]
}
```

**Use Case:** Mainnet deployments requiring multisig approval

### Strategy 4: Environment Variables Override

Override environment variables at runtime:

```bash
# Override RPC URL
SURFPOL_RPC_URL=https://custom-rpc.com ./scripts/deploy.sh devnet

# Override keypair path
SURFPOL_KEYPAIR=/path/to/key.json ./scripts/deploy.sh localnet
```

### Environment Comparison

| Feature | Localnet | Devnet | Mainnet |
|---------|----------|--------|---------|
| RPC URL | `http://127.0.0.1:8899` | `https://api.devnet.solana.com` | `https://api.mainnet-beta.solana.com` |
| Signer Type | `secret_key` | `web_wallet` | `web_wallet` / `squads` |
| Cost | Free | Test SOL (free) | Real SOL |
| Speed | Fast | Medium | Slow |
| Immutability | None | None | Permanent |
| Use Case | Development | Integration Testing | Production |

---

## Scripts System

All scripts are located in `solana-rwa/scripts/` and are executable.

### Build System

#### [`build.sh`](../scripts/build.sh) - Build All Programs

Builds all Anchor programs and generates IDLs.

```bash
./scripts/build.sh              # Standard build
./scripts/build.sh --clean      # Clean before build
./scripts/build.sh --release    # Release build (optimized)
```

**What it does:**
1. Checks prerequisites (cargo, anchor-cli)
2. Optionally cleans build artifacts
3. Builds all programs in `programs/` directory
4. Generates IDL files in `target/idl/`
5. Creates TypeScript types in `target/types/`
6. Copies `.so` files to `target/deploy/`
7. Verifies build output

**Build Output:**
```
target/
├── deploy/
│   ├── solana_rwa.so           # Main token program
│   ├── identity_registry.so    # Identity program
│   └── compliance_aggregator.so # Compliance program
├── idl/
│   ├── solana_rwa.json         # Interface definitions
│   ├── identity_registry.json
│   └── compliance_aggregator.json
└── types/
    ├── solana_rwa.ts           # TypeScript client types
    ├── identity_registry.ts
    └── compliance_aggregator.ts
```

### Deployment Scripts

#### [`deploy.sh`](../scripts/deploy.sh) - Deploy via txtx

Deploys all programs using the txtx deployment runbook.

```bash
./scripts/deploy.sh localnet      # Deploy to localnet
./scripts/deploy.sh devnet        # Deploy to devnet
./scripts/deploy.sh mainnet       # Deploy to mainnet
./scripts/deploy.sh --explain     # Show deployment plan
./scripts/deploy.sh --browser     # Use browser UI
./scripts/deploy.sh localnet -f   # Force re-deploy
```

**Deployment Flow:**
1. Check prerequisites (surfpool CLI, txtx.yml)
2. Build programs automatically
3. Check Surfnet is running (for localnet)
4. Execute `surfpool run deployment --env <env>`
5. Post-deployment verification

**Options Explained:**
- `--explain`: Shows what would be deployed without executing
- `--browser`: Opens browser UI for supervised execution
- `-f`: Forces re-deployment even if code hasn't changed

#### [`upgrade.sh`](../scripts/upgrade.sh) - Upgrade Programs

Upgrades individual or all deployed programs.

```bash
./scripts/upgrade.sh solana_rwa localnet    # Upgrade single program
./scripts/upgrade.sh all devnet             # Upgrade all programs
./scripts/upgrade.sh --all mainnet          # Upgrade all (alternative syntax)
./scripts/upgrade.sh --dry-run localnet     # Show what would upgrade
```

**Requirements:**
- Program must be deployed with upgrade authority
- New binary must be built first

#### [`init.sh`](../scripts/init.sh) - Post-Deployment Initialization

Runs initialization steps after deployment.

```bash
./scripts/init.sh localnet        # Initialize localnet
./scripts/init.sh devnet          # Initialize devnet
./scripts/init.sh mainnet --admin <pubkey>  # Initialize with specific admin
```

**What it does:**
1. Verifies programs are deployed
2. Initializes compliance aggregator
3. Creates `.env` configuration files
4. Verifies program states

### Verification Scripts

#### [`verify.sh`](../scripts/verify.sh) - Verify Deployment

Verifies deployment consistency across 6 checks.

```bash
./scripts/verify.sh localnet      # Verify localnet
./scripts/verify.sh devnet        # Verify devnet
./scripts/verify.sh mainnet       # Verify mainnet
```

**Verification Checks:**
1. **Connectivity** - Can reach the RPC endpoint
2. **Program Status** - All programs are deployed
3. **Binary Hash** - Local .so matches deployed (localnet only)
4. **IDL Consistency** - IDLs match program interfaces
5. **State Management** - State files are valid
6. **Anchor.toml** - Configuration is consistent

#### [`status.sh`](../scripts/status.sh) - Check Status

Shows comprehensive deployment status.

```bash
./scripts/status.sh localnet      # Check localnet status
./scripts/status.sh devnet        # Check devnet status
./scripts/status.sh --all         # Check all environments
```

**Status Output:**
```
════════════════════════════════════════
  Environment: localnet
  RPC: http://127.0.0.1:8899
════════════════════════════════════════

[INFO] Connectivity:
[SUCCESS] ✓ Connected

[INFO] Programs:
[SUCCESS] ✓ solana_rwa (7gwNNSa...)
[SUCCESS] ✓ identity_registry (9w8e3r...)
[SUCCESS] ✓ compliance_aggregator (8sJ79x...)

[INFO] Local Binaries:
[SUCCESS] ✓ solana_rwa.so (12345 bytes)
[SUCCESS] ✓ identity_registry.so (23456 bytes)
[SUCCESS] ✓ compliance_aggregator.so (34567 bytes)

[INFO] State Files:
[SUCCESS] ✓ deployment state exists
```

### Maintenance Scripts

#### [`clean.sh`](../scripts/clean.sh) - Clean Artifacts

Removes build artifacts, state files, and logs.

```bash
./scripts/clean.sh                    # Clean everything
./scripts/clean.sh --build            # Only build artifacts
./scripts/clean.sh --state            # Only state files
./scripts/clean.sh --idl              # Only IDL files
./scripts/clean.sh --logs             # Only log files
./scripts/clean.sh --types            # Only TypeScript types
```

#### [`keys.sh`](../scripts/keys.sh) - Key Management

Manages Solana keypairs for different environments.

```bash
./scripts/keys.sh list              # List all keypairs
./scripts/keys.sh create devnet     # Create new devnet keypair
./scripts/keys.sh export mainnet    # Export mainnet public key
./scripts/keys.sh verify localnet   # Verify keypair
```

#### [`idl.sh`](../scripts/idl.sh) - IDL Management

Extracts, compares, and manages Interface Description Languages.

```bash
./scripts/idl.sh extract    # Extract all IDLs
./scripts/idl.sh compare    # Compare IDLs with source
./scripts/idl.sh ts         # Generate TypeScript types
./scripts/idl.sh diff       # Show IDL differences
./scripts/idl.sh list       # List all IDLs
```

#### [`env.sh`](../scripts/env.sh) - Environment Switching

Manages Solana CLI configuration for environment switching.

```bash
./scripts/env.sh list       # List all environments
./scripts/env.sh localnet   # Switch to localnet
./scripts/env.sh devnet     # Switch to devnet
./scripts/env.sh mainnet    # Switch to mainnet
./scripts/env.sh current    # Show current environment
```

### Development Scripts

#### [`dev-setup.sh`](../scripts/dev-setup.sh) - Development Setup

Complete development environment setup.

```bash
./scripts/dev-setup.sh      # Full setup
```

**What it does:**
1. Checks all prerequisites (cargo, anchor, surfpool, solana-cli)
2. Configures Solana CLI for localnet
3. Builds all programs
4. Creates `.env` file
5. Shows quick start guide

#### [`test-pipeline.sh`](../scripts/test-pipeline.sh) - Test Pipeline

Full CI test pipeline for local testing.

```bash
./scripts/test-pipeline.sh  # Run full test pipeline
```

**Pipeline Steps:**
1. Build all programs
2. Start Surfnet
3. Deploy programs
4. Run tests
5. Verify deployment
6. Clean up

---

## Code Consistency Verification

### Program ID Management

Program IDs are defined in multiple places and must be consistent:

| Location | Purpose |
|----------|---------|
| [`Anchor.toml`](../Anchor.toml) | Local development mapping |
| [`verify.sh`](../scripts/verify.sh) | Deployment verification |
| [`status.sh`](../scripts/status.sh) | Status display |
| `target/types/*.ts` | TypeScript client code |
| `.env` files | Runtime configuration |

### Consistency Checks

The [`verify.sh`](../scripts/verify.sh) script performs these checks:

1. **Binary Hash Verification** (localnet):
   ```bash
   # Hash of local .so file
   sha256sum target/deploy/solana_rwa.so
   
   # Compare with on-chain program data
   solana program show solana_rwa_program_id --dump | sha256sum
   ```

2. **IDL Consistency**:
   ```bash
   # Extract IDL from built program
   ./scripts/idl.sh extract
   
   # Compare with on-chain IDL
   solana account <program_id> --json | jq .data[0]
   ```

3. **State File Verification**:
   ```bash
   # Check state file exists and is valid
   cat .surfpool/state/deployment/state.json
   ```

### Program IDs

Current program IDs for reference:

| Program | Localnet ID |
|---------|-------------|
| `solana_rwa` | `7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5` |
| `identity_registry` | `9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n1` |
| `compliance_aggregator` | `8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o3` |

**Note:** These IDs change on each localnet deployment. For devnet/mainnet, use the actual deployed IDs.

---

## Best Practices

### 1. Environment Isolation

- **Never** use the same keypair for localnet and production
- Create separate keypairs per environment:
  ```bash
  ./scripts/keys.sh create devnet
  ./scripts/keys.sh create mainnet
  ```

### 2. Pre-Deployment Checklist

Before deploying to devnet or mainnet:

- [ ] All tests pass on localnet
- [ ] [`verify.sh`](../scripts/verify.sh) passes on localnet
- [ ] IDLs are extracted and reviewed
- [ ] Program IDs are documented
- [ ] Backup current state files
- [ ] Notify users of downtime

### 3. Deployment Order

Always deploy in this order:

1. `compliance_aggregator` (no dependencies)
2. `identity_registry` (depends on compliance)
3. `solana_rwa` (depends on both)

The [`main.tx`](../runbooks/deployment/main.tx) runbook handles this order automatically.

### 4. State Management

Surfpool tracks deployment state to avoid redundant deployments:

```
.surfpool/state/
└── deployment/
    └── state.json    # Tracks deployed program hashes
```

**When state is invalidated:**
- Program `.so` file changes
- Runbook inputs change
- `--force` flag is used

**To force re-deployment:**
```bash
./scripts/deploy.sh localnet --force
```

### 5. Security Considerations

**Localnet:**
- Use default keypair (`~/.config/solana/id.json`)
- No security concerns (local only)

**Devnet:**
- Use web wallet for signing
- Consider setting `expected_address` in signers
- Never commit private keys

**Mainnet:**
- Use multisig (squads) for authority
- Use hardware wallet for payer
- Require multiple approvals
- Audit all runbook changes

### 6. CI/CD Integration

Use the GitHub Actions workflow (`.github/workflows/solana-deploy.yml`):

- **Every push**: Run tests
- **Merge to main**: Auto-deploy to devnet
- **Manual trigger**: Deploy to mainnet

### 7. Documentation Updates

After deployment changes:

1. Update [`README.md`](../README.md) with new program IDs
2. Update this document with any workflow changes
3. Update `target/types/*.ts` if IDL changes
4. Commit all changes together

### 8. Rollback Procedure

If a deployment fails or causes issues:

1. **Identify the problem**:
   ```bash
   ./scripts/status.sh <env>
   ./scripts/verify.sh <env>
   ```

2. **Rollback to previous version**:
   ```bash
   # Get previous program ID from state
   cat .surfpool/state/deployment/state.json
   
   # Redeploy previous version
   ./scripts/deploy.sh <env> --force
   ```

3. **Verify rollback**:
   ```bash
   ./scripts/verify.sh <env>
   ```

---

## CI/CD Pipeline

### GitHub Actions Workflow

The project includes a GitHub Actions workflow for automated deployment:

**File:** [`.github/workflows/solana-deploy.yml`](../.github/workflows/solana-deploy.yml)

**Jobs:**

| Job | Trigger | Description |
|-----|---------|-------------|
| `test` | Every push/PR | Build and test |
| `deploy-devnet` | Push to main | Auto-deploy to devnet |
| `deploy-mainnet` | Manual (workflow_dispatch) | Deploy to mainnet |

### Local Pipeline Testing

Test the full pipeline locally:

```bash
./scripts/test-pipeline.sh
```

This simulates the CI/CD flow:
1. Build
2. Start Surfnet
3. Deploy
4. Test
5. Verify

---

## Troubleshooting

### Common Issues

#### 1. Surfnet Not Running

**Error:** `Surfnet localnet does not appear to be running`

**Solution:**
```bash
# Start Surfnet
surfpool start

# Or with browser UI
surfpool start --browser

# Check health
curl -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"health"}' \
    http://127.0.0.1:8899
```

#### 2. Build Failures

**Error:** `anchor build failed`

**Solution:**
```bash
# Check prerequisites
./scripts/dev-setup.sh

# Clean and rebuild
./scripts/clean.sh --build
./scripts/build.sh --clean

# Check for Rust/Anchor version issues
anchor --version
cargo --version
```

#### 3. Deployment Fails with Signature Error

**Error:** `Signature verification failed`

**Solution:**
```bash
# Verify keypair is valid
solana-keygen pubkey ~/.config/solana/id.json

# Check balance
solana balance --url http://127.0.0.1:8899

# For devnet/mainnet, ensure web wallet has funds
```

#### 4. Program Already Deployed

**Error:** `Program already exists`

**Solution:**
```bash
# Force re-deployment
./scripts/deploy.sh localnet --force

# Or upgrade the program
./scripts/upgrade.sh solana_rwa localnet
```

#### 5. IDL Mismatch

**Error:** `IDL does not match program`

**Solution:**
```bash
# Rebuild programs
./scripts/build.sh --clean

# Extract fresh IDLs
./scripts/idl.sh extract

# Compare with deployed
./scripts/idl.sh compare
```

#### 6. Environment Switching Issues

**Error:** `Cannot connect to RPC`

**Solution:**
```bash
# Check current environment
./scripts/env.sh current

# Switch environment
./scripts/env.sh devnet

# Verify connection
solana ping --url https://api.devnet.solana.com
```

### Debug Mode

Enable verbose output for debugging:

```bash
# Deploy with verbose output
surfpool run deployment --env localnet -v

# Check surfpool logs
surfpool logs

# View state file
cat .surfpool/state/deployment/state.json
```

### Getting Help

- **Surfpool Documentation:** https://docs.surfpool.run/
- **txtx DSL Reference:** https://docs.surfpool.run/iac/
- **Solana Docs:** https://docs.solana.com/
- **Anchor Framework:** https://www.anchor-lang.com/

---

## Quick Reference

### Command Cheat Sheet

| Task | Command |
|------|---------|
| Setup development environment | `./scripts/dev-setup.sh` |
| Build programs | `./scripts/build.sh` |
| Deploy to localnet | `./scripts/deploy.sh localnet` |
| Deploy to devnet | `./scripts/deploy.sh devnet` |
| Deploy to mainnet | `./scripts/deploy.sh mainnet` |
| Show deployment plan | `./scripts/deploy.sh --explain` |
| Verify deployment | `./scripts/verify.sh localnet` |
| Check status | `./scripts/status.sh --all` |
| Upgrade program | `./scripts/upgrade.sh solana_rwa localnet` |
| Extract IDLs | `./scripts/idl.sh extract` |
| Generate TypeScript types | `./scripts/idl.sh ts` |
| Clean everything | `./scripts/clean.sh` |
| Run test pipeline | `./scripts/test-pipeline.sh` |
| Switch to devnet | `./scripts/env.sh devnet` |
| List keypairs | `./scripts/keys.sh list` |

### File Locations

| Type | Location |
|------|----------|
| Manifest | `txtx.yml` |
| Runbooks | `runbooks/deployment/*.tx` |
| Programs | `programs/*/src/lib.rs` |
| Build Output | `target/deploy/*.so` |
| IDLs | `target/idl/*.json` |
| Types | `target/types/*.ts` |
| State | `.surfpool/state/*/state.json` |
| Scripts | `scripts/*.sh` |
| Config | `Anchor.toml`, `rust-toolchain.toml` |

---

*Last Updated: 2026-04-20*
