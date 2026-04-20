# Surfpool Deployment System - Complete Guide

## Table of Contents

1. [Overview](#overview)
2. [Runbook Organization](#runbook-organization)
3. [Multi-Environment Strategies](#multi-environment-strategies)
4. [Code Consistency Verification](#code-consistency-verification)
5. [Best Practices](#best-practices)
6. [Advanced Patterns](#advanced-patterns)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Surfpool brings **Infrastructure as Code (IaC)** to Solana development through the **txtx** domain-specific language (DSL). Runbooks define how programs are deployed, signed, and verified across different environments.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Surfnet** | Local Solana validator that can fork mainnet on-the-fly |
| **Runbook** | A `.tx` file defining deployment actions, signers, and variables |
| **Manifest** | `txtx.yml` file that indexes runbooks and defines environments |
| **Addon** | Plugin system (e.g., `svm` for Solana, `evm` for EVM chains) |
| **Signer** | Transaction signing method (secret key, web wallet, multisig) |
| **Action** | Operation to execute (deploy program, encode instruction, broadcast tx) |
| **State** | Cached execution state to avoid redundant deployments |

---

## Runbook Organization

### Directory Structure

```
solana-rwa/
├── txtx.yml                              # Manifest (entry point)
└── runbooks/
    └── deployment/                       # Runbook group
        ├── main.tx                       # Core deployment actions
        ├── signers.localnet.tx           # Signers for localnet
        ├── signers.devnet.tx             # Signers for devnet
        └── signers.mainnet.tx            # Signers for mainnet
```

### File Responsibilities

#### [`txtx.yml`](../txtx.yml) - Manifest

The manifest is the **single entry point** for Surfpool. It:

- Defines runbook locations and metadata
- Declares environments with their specific variables
- Configures state management
- Maps environment names to runtime inputs

```yaml
---
name: solana-rwa
id: solana-rwa
runbooks:
  - name: deployment
    description: Deploy all Solana RWA programs
    location: ./runbooks/deployment
    state:
      location: .surfpool/state
environments:
  localnet:
    network_id: localnet
    rpc_api_url: http://127.0.0.1:8899
    payer_keypair_json: ~/.config/solana/id.json
    authority_keypair_json: ~/.config/solana/id.json
  devnet:
    network_id: devnet
    rpc_api_url: https://api.devnet.solana.com
    payer_keypair_json: ~/.config/solana/id.json
    authority_keypair_json: ~/.config/solana/id.json
  mainnet:
    network_id: mainnet
    rpc_api_url: https://api.mainnet-beta.solana.com
```

#### [`main.tx`](../runbooks/deployment/main.tx) - Core Actions

The main runbook defines **what** gets deployed:

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

**Key elements:**
- `addon "svm"`: Configures the Solana SVM plugin with environment variables
- `action`: Defines a deployment operation
- `svm::deploy_program`: Built-in action for Anchor program deployment
- `input.*`: Values injected from `txtx.yml` environment config
- `signer.*`: References to signer definitions in separate files

#### `signers.*.tx` - Signer Configuration

Signer files define **who** signs the transactions. Each environment has its own file:

| File | Signer Type | Use Case |
|------|-------------|----------|
| `signers.localnet.tx` | `svm::secret_key` | Development (keypair file) |
| `signers.devnet.tx` | `svm::web_wallet` | Testing (browser-based signing) |
| `signers.mainnet.tx` | `svm::web_wallet` | Production (manual approval) |

```tx
// signers.localnet.tx
signer "payer" "svm::secret_key" {
    description = "Pays fees for program deployments"
    keypair_json = "~/.config/solana/id.json"
}

signer "authority" "svm::secret_key" {
    description = "Can upgrade programs and manage critical ops"
    keypair_json = "~/.config/solana/id.json"
}
```

### Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  surfpool run deployment --env localnet                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Load txtx.yml manifest                                      │
│     → Select "localnet" environment                               │
│     → Inject: rpc_api_url, network_id, keypair paths             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Load runbook from ./runbooks/deployment/                    │
│     → Parse main.tx (actions)                                    │
│     → Auto-load signers.localnet.tx (matching env prefix)        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Resolve dependencies & build execution graph                │
│     → All 3 deploy_program actions are independent               │
│     → Can execute in parallel                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Execute actions                                             │
│     → Build program from target/deploy/*.so                     │
│     → Encode deployment transaction                             │
│     → Sign with signer.payer + signer.authority                  │
│     → Broadcast to rpc_api_url                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Record state (if enabled)                                   │
│     → Hash of program binaries + runbook inputs                 │
│     → Stored in .surfpool/state/                                │
│     → Prevents redundant re-deployment                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Multi-Environment Strategies

### Strategy 1: Environment-Specific Signer Files (Current)

**Approach**: Separate `signers.<env>.tx` files per environment.

```
runbooks/deployment/
├── main.tx                    # Shared actions
├── signers.localnet.tx        # secret_key for dev
├── signers.devnet.tx          # web_wallet for testing
└── signers.mainnet.tx         # web_wallet/squads for prod
```

**How it works**: Surfpool auto-loads signer files matching the environment name. When you run `--env localnet`, it loads `signers.localnet.tx`.

**Pros**:
- Clean separation of concerns
- Different security models per environment
- Easy to audit which signer is used where

**Cons**:
- Must maintain multiple signer files
- Risk of forgetting to update all files

### Strategy 2: Environment Variables in Single Signer File

**Approach**: Use conditional logic based on `input.*` variables.

```tx
// signers.tx (single file)
signer "payer" "svm::secret_key" {
    description = "Pays fees for program deployments"
    
    // Switch signer type based on environment
    keypair_json = if input.environment == "mainnet" {
        input.mainnet_keypair_path
    } else {
        "~/.config/solana/id.json"
    }
}
```

**Pros**:
- Single source of truth for signer config
- Easier to maintain

**Cons**:
- Less explicit about security model per environment
- Can become complex with many environments

### Strategy 3: External Input Files

**Approach**: Use CLI inputs or external JSON files for sensitive data.

```bash
# Pass keypath via CLI
surfpool run deployment --env mainnet \
    --input mainnet_keypair_path=/secure/path/key.json \
    -u
```

```yaml
# txtx.yml
environments:
  mainnet:
    network_id: mainnet
    rpc_api_url: https://api.mainnet-beta.solana.com
    # Key path passed via CLI, never stored in repo
```

**Pros**:
- Sensitive data never in version control
- Works well with CI/CD secrets

**Cons**:
- Requires careful CLI management
- Must ensure inputs are always provided

### Strategy 4: Flows for Batch Deployment

**Approach**: Use `flow` blocks to deploy to multiple environments in one runbook.

```tx
flow "target_network" {
    rpc_api_url = "https://api.devnet.solana.com"
    network_id = "devnet"
}

addon "svm" {
    rpc_api_url = flow.rpc_api_url
    network_id = flow.network_id
}

action "deploy_solana_rwa" "svm::deploy_program" {
    program = svm::get_program_from_anchor_project("solana_rwa")
    authority = signer.authority
    payer = signer.payer
}
```

**Pros**:
- Single runbook executes across multiple targets
- Useful for parallel testing

**Cons**:
- Requires careful error handling
- Not ideal for production (manual approval needed)

### Recommended Strategy for This Project

**Use Strategy 1** (environment-specific signer files) combined with **Strategy 3** (CLI inputs for sensitive paths). This gives:

- Clear security boundaries per environment
- Auditability (each environment's signer is explicit)
- CI/CD compatibility (secrets via CLI/env vars)

---

## Code Consistency Verification

### Post-Deployment Verification

After deploying with Surfpool, verify consistency with these steps:

#### 1. Program ID Verification

```bash
# Check deployed program IDs match expected values
solana program list | grep -E "solana_rwa|identity_registry|compliance_aggregator"
```

Expected output:
```
Program Account                          Version  Program ID
7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5  ...      solana_rwa
9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n1  ...      identity_registry
8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o3  ...      compliance_aggregator
```

#### 2. Binary Hash Verification

```bash
# Get deployed program data hash
solana program show <PROGRAM_ID> --output json | jq '.data'

# Compare with local build
sha256sum target/deploy/solana_rwa.so
```

#### 3. IDL Consistency Check

```bash
# Extract IDL from deployed program
solana program show <PROGRAM_ID> --output json > deployed_idl.json

# Compare with local IDL
diff local_idl.json deployed_idl.json
```

#### 4. Automated Verification Script

Create a verification script:

```bash
#!/bin/bash
# verify-deployment.sh

PROGRAMS=(
    "solana_rwa:7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5"
    "identity_registry:9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n1"
    "compliance_aggregator:8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o3"
)

ERRORS=0

for entry in "${PROGRAMS[@]}"; do
    NAME="${entry%%:*}"
    EXPECTED_ID="${entry##*:}"
    
    # Check if program is deployed
    DEPLOYED_ID=$(solana program list | grep "$NAME" | awk '{print $1}')
    
    if [ "$DEPLOYED_ID" != "$EXPECTED_ID" ]; then
        echo "ERROR: $NAME mismatch! Expected: $EXPECTED_ID, Got: $DEPLOYED_ID"
        ERRORS=$((ERRORS + 1))
    else
        echo "OK: $NAME verified"
    fi
done

if [ $ERRORS -gt 0 ]; then
    echo "Verification FAILED with $ERRORS errors"
    exit 1
fi

echo "Verification PASSED"
```

### Pre-Deployment Checks

Add these checks before running deployments:

```bash
# 1. Ensure programs are built
if [ ! -f "target/deploy/solana_rwa.so" ]; then
    echo "ERROR: Programs not built. Run 'anchor build' first."
    exit 1
fi

# 2. Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "WARN: Uncommitted changes detected!"
    echo "Deploying from built artifacts, not from git HEAD."
    read -p "Continue anyway? (y/N): " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
fi

# 3. Verify Anchor.toml program order matches runbook
# (Important for dependency ordering)
```

### State Management for Consistency

The `state` configuration in `txtx.yml` prevents redundant deployments:

```yaml
runbooks:
  - name: deployment
    location: ./runbooks/deployment
    state:
      location: .surfpool/state
```

**How it works**:
1. First deployment: hashes program binaries + runbook inputs → stores in `.surfpool/state/`
2. Subsequent runs: compares current hashes with stored hashes
3. If unchanged: skips deployment with message "Runbook already executed, no changes detected"
4. If changed: re-deploys and updates state

**Benefits**:
- Prevents accidental re-deployments
- Ensures deployment history is trackable
- Speeds up local development cycles

---

## Best Practices

### 1. Environment Isolation

**Rule**: Never use the same signer type across all environments.

| Environment | Recommended Signer | Why |
|-------------|-------------------|-----|
| localnet | `svm::secret_key` | No security risk, fast iteration |
| devnet | `svm::web_wallet` or `svm::secret_key` | Balance of convenience and safety |
| mainnet | `svm::squads` (multisig) | Maximum security for production |

### 2. Signer Naming Convention

Always use consistent signer names across all environment files:

```tx
// GOOD: Consistent names
signer "payer" "svm::secret_key" { ... }
signer "authority" "svm::secret_key" { ... }

// BAD: Inconsistent names cause action resolution errors
signers.localnet.tx:  signer "deployer" ...
signers.devnet.tx:    signer "payer" ...
```

### 3. Program Deployment Order

Deploy programs in dependency order. If one program calls another, deploy the dependency first:

```tx
// main.tx - order matters if programs have cross-references

// 1. Deploy base programs first
action "deploy_compliance_aggregator" "svm::deploy_program" { ... }

// 2. Deploy dependent programs
action "deploy_identity_registry" "svm::deploy_program" { ... }

// 3. Deploy main program last
action "deploy_solana_rwa" "svm::deploy_program" { ... }
```

### 4. CI/CD Security

**Never** store private keys in repository or CI secrets as plaintext. Use:

```yaml
# GitHub Actions - use encrypted secrets
env:
  DEVNET_KEYPAIR: ${{ secrets.DEVNET_KEYPAIR }}

# Write to temp file with restricted permissions
run: |
  echo "$DEVNET_KEYPAIR" > /tmp/keypair.json
  chmod 600 /tmp/keypair.json
```

### 5. Documentation in Runbooks

Add header comments to every runbook file:

```tx
################################################################
# solana-rwa Deployment Runbook
# Version: 1.0.0
# Last Updated: 2025-01-15
# Author: Team
#
# Programs:
#   - solana_rwa: Main token program
#   - identity_registry: Identity management
#   - compliance_aggregator: Compliance enforcement
#
# Usage:
#   surfpool run deployment --env localnet -u
#   surfpool run deployment --env devnet
#   surfpool run deployment --env mainnet -u
################################################################
```

### 6. State Management

Always enable state management for production deployments:

```yaml
runbooks:
  - name: deployment
    state:
      location: .surfpool/state
```

**Exclude from git**:
```gitignore
# .gitignore
.surfpool/state/
```

### 7. Rollback Strategy

Maintain ability to rollback:

```tx
// Consider adding an upgrade action
action "upgrade_solana_rwa" "svm::upgrade_program" {
    description = "Upgrade solana_rwa program"
    program = svm::get_program_from_anchor_project("solana_rwa")
    authority = signer.authority
    payer = signer.payer
    program_id = <current_program_id>  // Must specify existing program
}
```

### 8. Testing Before Deployment

Always run the local test pipeline before deploying to remote environments:

```bash
# Full pipeline
./scripts/test-pipeline.sh

# Or step by step
surfpool start --ci --daemon
surfpool run deployment --env localnet -u
anchor test --provider.url http://127.0.0.1:8899
```

---

## Advanced Patterns

### Pattern 1: Conditional Deployment

Deploy only if the program is not already deployed:

```tx
variable "is_localnet" {
    value = input.network_id == "localnet"
}

action "deploy_solana_rwa" "svm::deploy_program" {
    // Only deploy on localnet or if program not found
    // (Surfpool state management handles this automatically)
    program = svm::get_program_from_anchor_project("solana_rwa")
    authority = signer.authority
    payer = signer.payer
}
```

### Pattern 2: Post-Deployment Initialization

Add initialization actions after deployment:

```tx
action "init_solana_rwa" "svm::process_instructions" {
    description = "Initialize solana_rwa program"
    program_id = svm::get_program_id("solana_rwa")
    instructions = [
        svm::compile_idl_instruction("initialize", {
            admin: signer.authority.address
        })
    ]
    signers = [signer.authority, signer.payer]
}

// This action depends on deploy_solana_rwa completing first
```

### Pattern 3: Multi-Program Coordination

For programs that need coordinated initialization:

```tx
// main.tx
action "deploy_all" "svm::batch_deploy" {
    description = "Deploy all programs atomically"
    programs = [
        svm::get_program_from_anchor_project("solana_rwa"),
        svm::get_program_from_anchor_project("identity_registry"),
        svm::get_program_from_anchor_project("compliance_aggregator")
    ]
    authority = signer.authority
    payer = signer.payer
}
```

### Pattern 4: Environment-Specific Configuration

Use variables for environment-specific settings:

```tx
// In txtx.yml
environments:
  localnet:
    max_tokens_per_mint: 1000000
    freeze_period_days: 0
  mainnet:
    max_tokens_per_mint: 1000000000
    freeze_period_days: 30

// In main.tx
action "initialize_token" "svm::process_instructions" {
    config = {
        max_tokens: input.max_tokens_per_mint
        freeze_days: input.freeze_period_days
    }
}
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `Runbook not found` | Wrong manifest path | Use `--manifest-file-path ./txtx.yml` |
| `Signer not found` | Signer name mismatch | Check `signer.*` names match in actions |
| `Program already deployed` | State management active | Use `--force` flag to re-deploy |
| `Connection refused` | Surfnet not running | Run `surfpool start` first |
| `Insufficient funds` | Payer wallet empty | Airdrop: `surfpool start -a <PUBKEY>` |
| `IDL mismatch` | Programs rebuilt after deploy | Rebuild with `anchor build` |

### Debug Commands

```bash
# Explain what a runbook will do (dry run)
surfpool run deployment --env localnet --explain

# List all available runbooks
surfpool ls

# View state status
cat .surfpool/state/*.json

# Check Surfnet health
curl -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"health"}' \
    http://127.0.0.1:8899

# Force re-deployment
surfpool run deployment --env localnet -u --force

# Run with verbose logging
surfpool run deployment --env localnet -u --log-level debug
```

### Log Locations

| Log Type | Location |
|----------|----------|
| Surfnet logs | `.surfpool/logs/` |
| Runbook logs | `.surfpool/logs/` |
| State data | `.surfpool/state/` |
| Pipeline logs | `.surfpool/pipeline.log` (when using test-pipeline.sh) |

---

## Quick Reference

### Command Cheat Sheet

```bash
# Installation
curl -sL https://run.surfpool.run/ | bash

# Local Development
surfpool start                              # Start Surfnet
surfpool start --watch                      # Auto-redeploy
surfpool run deployment --env localnet -u   # Deploy

# CI/CD
surfpool start --ci --daemon                # Headless mode
surfpool run deployment --env devnet -u     # Deploy devnet

# Inspection
surfpool ls                                 # List runbooks
surfpool run deployment --explain           # Dry run
surfpool run deployment --env localnet -u --force  # Force re-deploy

# UI Access
# Surfnet Dashboard: http://localhost:18488
# Studio Web UI:     http://localhost:18488
```

### File Summary

| File | Purpose | Modified |
|------|---------|----------|
| `txtx.yml` | Manifest: runbooks + environments | Yes |
| `runbooks/deployment/main.tx` | Deployment actions | No |
| `runbooks/deployment/signers.localnet.tx` | Localnet signers | No |
| `runbooks/deployment/signers.devnet.tx` | Devnet signers | No |
| `runbooks/deployment/signers.mainnet.tx` | Mainnet signers | No |
| `scripts/dev-setup.sh` | Local setup script | New |
| `scripts/test-pipeline.sh` | CI test pipeline | New |
| `.github/workflows/solana-deploy.yml` | GitHub Actions | New |
