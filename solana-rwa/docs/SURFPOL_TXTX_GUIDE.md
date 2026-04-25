# Surfpool + TXTX Environment Management Guide

Complete guide to managing deployment environments using Surfpool (enhanced solana-test-validator) and TXTX (Infrastructure as Code DSL).

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Environment Types](#environment-types)
4. [Configuration Files](#configuration-files)
5. [Surfpool Management](#surfpool-management)
6. [TXTX State Management](#txtx-state-management)
7. [TXTX Input Files](#txtx-input-files)
8. [Deployment Workflows](#deployment-workflows)
9. [Quick Reference Commands](#quick-reference-commands)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## Overview

### What is Surfpool?

Surfpool is an enhanced `solana-test-validator` with mainnet forking capabilities. It provides:

- **Local Development**: Full local test validator with instant program deployment
- **Mainnet Forking**: Fork mainnet state for testing against real contracts
- **Instant Deployment**: Auto-load programs on validator startup via configuration
- **Dashboard**: Web-based monitoring at `http://localhost:5173`

### What is TXTX?

TXTX is an Infrastructure as Code DSL for Solana. It enables:

- **Declarative Deployments**: Define programs, accounts, and instructions in `.tx` files
- **State Management**: Persistent state across deployments via JSON files
- **Environment Overrides**: Different inputs per environment (localnet, devnet, mainnet)
- **Auto Signers**: Automatic signer loading based on environment

### The Complete Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     rwa.config.yaml                         │
│              (Unified Configuration)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ localnet │  │  devnet  │  │ mainnet  │
    └─────┬────┘  └─────┬────┘  └─────┬────┘
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Surfpool │  │ RPC URL  │  │ RPC URL  │
    └─────┬────┘  └──────────┘  └──────────┘
          │
          ▼
    ┌──────────┐     ┌─────────────────────────┐
    │ Solana   │────▶│ TXTX Runbooks           │
    │ Validator│     │ (Infrastructure as Code)│
    └──────────┘     └─────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ State (.tx)  │
                  │ Files        │
                  └──────────────┘
```

---

## Environment Types

### Localnet (Development)

**Purpose**: Fast iteration during development

**Characteristics**:
- Runs locally via Surfpool
- Instant program deployment (no fees)
- Resettable ledger (each run starts fresh)
- Auto-loading of programs configured in `rwa.config.yaml`

**RPC URL**: `http://127.0.0.1:8899`
**WebSocket**: `ws://127.0.0.1:8900`
**Signer Strategy**: `secret_key` (local keypair)

### Devnet (Staging)

**Purpose**: Pre-production testing with real network conditions

**Characteristics**:
- Remote Solana devnet RPC
- Requires SOL for fees (faucet available)
- Browser wallet signing required
- Persistent program deployments

**RPC URL**: `https://api.devnet.solana.com`
**Signer Strategy**: `browser` (Phantom/Solflare)

### Mainnet (Production)

**Purpose**: Production deployment

**Characteristics**:
- Remote Solana mainnet RPC
- Requires significant SOL for fees
- Browser wallet signing required
- Careful deployment planning needed

**RPC URL**: `https://api.mainnet-beta.solana.com`
**Signer Strategy**: `squads` (Multisig via Squads)

---

## Configuration Files

### Main Configuration: `rwa.config.yaml`

The single source of truth for all deployment settings:

```yaml
project:
  name: solana-rwa
  version: 1.0.0
  description: Real World Assets tokenization platform on Solana

networks:
  localnet:
    rpc_url: http://127.0.0.1:8899
    websocket_url: ws://127.0.0.1:8900
    keypair: ~/.config/solana/id.json
    surfpool:
      enabled: true
      auto_start: true
      auto_restart: true
      instant_deployment: true        # Auto-deploy programs on startup
      dashboard_port: 5173
      log_level: info
      test_ledger_reset: true
      reset_leadger_sleep: 1000
    txtx:
      enabled: true
      state_location: .surfpool/state  # Where TXTX state is stored
      signer_strategy: squads           # Will be overridden to secret_key for localnet

  devnet:
    rpc_url: https://api.devnet.solana.com
    websocket_url: wss://api.devnet.solana.com
    keypair: ~/.config/solana/devnet.json
    surfpool:
      enabled: false
      auto_start: false
      instant_deployment: false
    txtx:
      enabled: true
      state_location: .surfpool/state
      signer_strategy: browser

  mainnet:
    rpc_url: https://api.mainnet-beta.solana.com
    websocket_url: wss://api.mainnet-beta.solana.com
    keypair: ~/.config/solana/mainnet.json
    surfpool:
      enabled: false
      auto_start: false
      instant_deployment: false
    txtx:
      enabled: true
      state_location: .surfpool/state
      signer_strategy: squads

programs:
  localnet:
    compliance_aggregator: HY4TWkEY3AkxJrie7kFzRfgX8HAp33Bp6rbJTGBoQDbq
    identity_registry: vAoitJwFDr25fYuFJPkoqwBZYBMaKH9iWFwitJbLkUZT
    solana_rwa: 6vRjMaaEvFW2q9EjyVE3UPrBgg1KMjbXV2orVuXFKiya
  devnet:
    compliance_aggregator: ''          # Set after deployment
    identity_registry: ''
    solana_rwa: ''
  mainnet:
    compliance_aggregator: ''          # Set after deployment
    identity_registry: ''
    solana_rwa: ''
```

### Anchor Configuration: `Anchor.toml`

Used by Anchor CLI for program builds and IDL generation:

```toml
[toolchain]
package_manager = "yarn"

[features]
resolution = true
skip-lint = false

[programs.localnet]
solana_rwa = "6vRjMaaEvFW2q9EjyVE3UPrBgg1KMjbXV2orVuXFKiya"
identity_registry = "vAoitJwFDr25fYuFJPkoqwBZYBMaKH9iWFwitJbLkUZT"
compliance_aggregator = "HY4TWkEY3AkxJrie7kFzRfgX8HAp33Bp6rbJTGBoQDbq"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 \"tests/**/*.ts\""
```

### Frontend Configuration: `web/src/config/solana.ts`

Used by the Next.js frontend to connect to Solana:

```typescript
export const PROGRAM_IDS = {
  localnet: {
    solanaRwa: "6vRjMaaEvFW2q9EjyVE3UPrBgg1KMjbXV2orVuXFKiya",
    identityRegistry: "vAoitJwFDr25fYuFJPkoqwBZYBMaKH9iWFwitJbLkUZT",
    complianceAggregator: "HY4TWkEY3AkxJrie7kFzRfgX8HAp33Bp6rbJTGBoQDbq",
  },
  devnet: {
    solanaRwa: process.env.NEXT_PUBLIC_SOLANA_RWA_DEVNET_PROGRAM_ID || '',
    identityRegistry: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_DEVNET_PROGRAM_ID || '',
    complianceAggregator: process.env.NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_DEVNET_PROGRAM_ID || '',
  },
  mainnet: {
    solanaRwa: process.env.NEXT_PUBLIC_SOLANA_RWA_MAINNET_PROGRAM_ID || '',
    identityRegistry: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_MAINNET_PROGRAM_ID || '',
    complianceAggregator: process.env.NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_MAINNET_PROGRAM_ID || '',
  },
} as const;
```

---

## Surfpool Management

### Starting Surfpool

**Via CLI (recommended):**
```bash
./bin/rwa start local
```

This will:
1. Check if Surfpool is already running
2. If not, start Surfpool with localnet configuration
3. Enable instant deployment mode
4. Auto-load all configured programs

**Manual start:**
```bash
# Start Surfpool directly
surfpool start --network localnet

# Or use solana-test-validator directly
solana-test-validator --reset --quiet
```

### Checking Surfpool Status

```bash
# Check if Surfpool is running
./bin/rwa status

# Check cluster health
solana cluster-version

# Check RPC endpoint
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  http://127.0.0.1:8899
```

### Surfpool Dashboard

Access the web dashboard at:
```
http://localhost:5173
```

The dashboard provides:
- RPC endpoint status
- Transaction history
- Program deployment status
- Ledger information

### Instant Deployment

When `instant_deployment: true` is set in `rwa.config.yaml`, Surfpool will:

1. Auto-detect programs listed in the config
2. Deploy them automatically when the validator starts
3. Make them immediately available for testing

This eliminates the need to manually deploy programs after each validator restart.

### Restarting Surfpool

```bash
# Restart Surfpool (resets ledger)
./bin/rwa restart local

# Restart with fresh ledger
surfpool restart --reset
```

---

## TXTX State Management

### State Location

TXTX state is stored in the location specified by `networks.<env>.txtx.state_location`:

```yaml
networks:
  localnet:
    txtx:
      state_location: .surfpool/state
```

This creates a `.surfpool/state/` directory containing:

```
.surfpool/state/
├── state.json              # Main TXTX state
├── accounts/               # Account data snapshots
│   ├── token-state.json
│   ├── identity-registry.json
│   └── compliance-aggregator.json
└── programs/               # Program deployment state
    ├── deployment.json
    └── addresses.json
```

### State Lifecycle

1. **Creation**: State is created on first TXTX run
2. **Persistence**: State persists across validator restarts (if using same ledger)
3. **Invalidation**: State is invalidated when:
   - Validator ledger is reset (`--reset` flag)
   - Programs are recompiled with new IDs
   - Manual state deletion

### State Invalid Scenarios

| Scenario | State Valid? | Action |
|----------|-------------|--------|
| Fresh validator start | ✅ Valid | No action needed |
| Validator reset (`--reset`) | ❌ Invalid | Re-run initialization runbooks |
| Program redeploy | ❌ Invalid | Update addresses in state |
| Config change | ✅ Valid | No action needed |
| Manual state delete | ❌ Invalid | Start from scratch |

---

## TXTX Input Files

### Purpose

TXTX runbooks use input files to provide environment-specific values. This allows the same `.tx` file to work across localnet, devnet, and mainnet.

### Input File Format

Create input files as YAML:

```yaml
# config/localnet-input.yaml
rpc_api_url: http://127.0.0.1:8899
websocket_url: ws://127.0.0.1:8900

signers:
  admin:
    secret_key: "~/.config/solana/id.json"
  
  agent1:
    secret_key: "~/.config/solana/agent1.json"

token:
  name: "RWA Token"
  symbol: "RWA"
  decimals: 9
  mint_amount: 1000000

identities:
  - wallet: "~/.config/solana/agent1.json"
    name: "Agent 1"
    type: "individual"
  
  - wallet: "~/.config/solana/agent2.json"
    name: "Agent 2"
    type: "organization"

compliance:
  modules:
    - kyc: true
    - accreditation: true
    - transfer_lock: true
```

### Running TXTX with Input

```bash
# Run with input file
txx run runbooks/token-initialization/main.tx \
  --input config/localnet-input.yaml

# Run with specific environment override
txx run runbooks/token-initialization/main.tx \
  --input config/localnet-input.yaml \
  --input.rpc_api_url http://custom:8899
```

### Required Input Variables

Each runbook requires specific input variables:

**Token Initialization** (`runbooks/token-initialization/main.tx`):
- `rpc_api_url` - Solana RPC endpoint
- `signers.admin` - Admin signer (has mint authority)
- `token.name` - Token name
- `token.symbol` - Token symbol
- `token.decimals` - Token decimals
- `token.mint_amount` - Initial mint amount

**Identity Initialization** (`runbooks/identity-initialization/main.tx`):
- `rpc_api_url` - Solana RPC endpoint
- `signers.admin` - Admin signer
- `identities[]` - Array of identity entries

**Compliance Initialization** (`runbooks/compliance-initialization/main.tx`):
- `rpc_api_url` - Solana RPC endpoint
- `signers.admin` - Admin signer
- `compliance.modules` - Array of compliance modules

---

## Deployment Workflows

### Full Deployment Pipeline

```bash
# 1. Start Surfpool (if not already running)
./bin/rwa start local

# 2. Build programs
./bin/rwa build

# 3. Deploy programs (builds + deploys + syncs config)
./bin/rwa deploy local

# 4. Initialize programs via TXTX (manual step)
txx run runbooks/token-initialization/main.tx \
  --input config/localnet-input.yaml

# 5. Verify deployment
./bin/rwa verify local
```

### Quick Deploy (Development)

```bash
# Single command: build + deploy + sync
./bin/rwa deploy local
```

### Deploy Only Programs (Skip Initialization)

```bash
# Build and deploy, but don't run TXTX
./bin/rwa deploy local 2>&1 | head -n 100
```

### Re-deploy After Code Changes

```bash
# 1. Rebuild programs
./bin/rwa build

# 2. Reset Surfpool (optional, for clean state)
./bin/rwa restart local

# 3. Redeploy (instant deployment handles this)
# Programs are auto-loaded via instant_deployment

# 4. Re-initialize if ledger was reset
txx run runbooks/token-initialization/main.tx \
  --input config/localnet-input.yaml
```

### Deploy to Devnet

```bash
# Deploy to devnet (requires browser wallet)
./bin/rwa deploy devnet

# Initialize devnet programs
txx run runbooks/token-initialization/main.tx \
  --input config/devnet-input.yaml
```

### Deploy to Mainnet

```bash
# Deploy to mainnet (requires squads multisig)
./bin/rwa deploy mainnet

# Initialize mainnet programs
txx run runbooks/token-initialization/main.tx \
  --input config/mainnet-input.yaml
```

---

## Quick Reference Commands

### CLI Tool (`./bin/rwa`)

| Command | Description |
|---------|-------------|
| `./bin/rwa start local` | Start Surfpool localnet |
| `./bin/rwa stop local` | Stop Surfpool |
| `./bin/rwa restart local` | Restart Surfpool (reset ledger) |
| `./bin/rwa status` | Check Surfpool status |
| `./bin/rwa build` | Build all Solana programs |
| `./bin/rwa deploy local` | Full deployment pipeline (build + deploy + sync) |
| `./bin/rwa deploy devnet` | Deploy to devnet |
| `./bin/rwa deploy mainnet` | Deploy to mainnet |
| `./bin/rwa verify local` | Verify deployed programs |
| `./bin/rwa init local` | Run TXTX initialization |
| `./bin/rwa clean` | Clean build artifacts |

### TXTX Commands

| Command | Description |
|---------|-------------|
| `txx run runbooks/<name>.tx` | Run a TXTX runbook |
| `txx run runbooks/<name>.tx --input config/<env>.yaml` | Run with input file |
| `txx run runbooks/<name>.tx --state .surfpool/state` | Specify state location |
| `txx state` | Show current TXTX state |

### Solana CLI Commands

| Command | Description |
|---------|-------------|
| `solana cluster-version` | Check cluster version |
| `solana balance` | Check wallet balance |
| `solana airdrop 1` | Request 1 SOL airdrop (localnet) |
| `solana program show <PROGRAM_ID>` | Show program details |
| `solana program deploy <SO_FILE>` | Deploy a program |

---

## Troubleshooting

### Error: "unable to resolve expression 'input.rpc_api_url'"

**Cause**: TXTX runbook requires `rpc_api_url` in input file.

**Solution**: Provide input file:
```bash
txx run runbooks/token-initialization/main.tx \
  --input config/localnet-input.yaml
```

### Error: "Invalid Base58 string" during Anchor build

**Cause**: Anchor.toml has invalid program ID (often after corruption).

**Solution**: Restore Anchor.toml:
```bash
git checkout HEAD -- solana-rwa/Anchor.toml
```

### Error: "DeclaredProgramIdMismatch"

**Cause**: Program deployed with different ID than in Anchor.toml.

**Solution**: Use `solana program deploy` directly (bypasses Anchor.toml check). The deployment script handles this automatically.

### Error: "Surfpool is not running"

**Solution**: Start Surfpool:
```bash
./bin/rwa start local
```

### Programs Not Found After Deploy

**Cause**: Instant deployment may take a few seconds after validator starts.

**Solution**: Wait a few seconds and verify:
```bash
solana program show <PROGRAM_ID>
```

### Frontend Shows Wrong Program IDs

**Cause**: Frontend config (`web/src/config/solana.ts`) is out of sync.

**Solution**: Re-run deployment which syncs all configs:
```bash
./bin/rwa deploy local
```

### State Mismatch After Reset

**Cause**: Validator ledger was reset, but TXTX state file still has old program addresses.

**Solution**: Delete state and re-initialize:
```bash
rm -rf .surfpool/state
txx run runbooks/token-initialization/main.tx \
  --input config/localnet-input.yaml
```

---

## FAQ

### Q: Do I need to manually deploy programs when instant_deployment is enabled?

**A**: No. When `instant_deployment: true`, Surfpool automatically deploys all configured programs on startup. The program binaries are loaded from the build output.

### Q: Why do I need to run TXTX initialization manually?

**A**: TXTX initialization requires input files with sensitive data (signer paths, token parameters). These should be provided explicitly for security and flexibility. The CLI tool handles program deployment automatically, but initialization is left manual to avoid accidental misconfiguration.

### Q: How do I switch between environments?

**A**: Use the `--env` flag or modify `rwa.config.yaml`:
```bash
# For TXTX, specify environment
txx run runbooks/token-initialization/main.tx \
  --env localnet \
  --input config/localnet-input.yaml

# For CLI, specify environment
./bin/rwa deploy devnet
```

### Q: Can I use mainnet forking?

**A**: Yes. Configure Surfpool with mainnet fork URL:
```yaml
networks:
  mainnet-fork:
    rpc_url: https://api.mainnet-beta.solana.com
    surfpool:
      mainnet_fork: true
      fork_block: latest
```

### Q: How do I persist state across restarts?

**A**: Don't use `--reset` flag when starting Surfpool:
```bash
# Keeps ledger and state
surfpool start

# Resets ledger and state
surfpool start --reset
```

### Q: What happens when I recompile programs?

**A**: New binaries are generated with potentially new program IDs. You need to redeploy:
```bash
./bin/rwa build
./bin/rwa deploy local  # Syncs new IDs to all configs
```

---

*Generated: 2024-04-24*
*Version: 1.0.0*
*Project: Solana RWA Tokenization Platform*
