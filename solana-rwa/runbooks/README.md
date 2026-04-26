# Solana RWA - Runbooks Documentation

## Overview

This directory contains all **txtx runbooks** for the Solana RWA Token Platform. Runbooks are declarative infrastructure-as-code files that automate deployment, initialization, and operations of Solana programs.

### What are Runbooks?

Runbooks are `.tx` files that use **HCL (HashiCorp Configuration Language)** syntax to define:
- **Program deployments** (compile and deploy Anchor programs)
- **Account initialization** (create PDA accounts with specific structures)
- **Instruction execution** (call program instructions with context)
- **Signer configuration** (manage keypairs for transactions)

Think of runbooks as **Terraform for Web3** - they version-control your deployment process.

---

## Quick Start

### Localnet (Surfpool) - Single Command Deployment

```bash
# Everything in one command: deploy + initialize all programs
surfpool run deployment --env localnet -u
```

### Devnet/Mainnet

```bash
# Everything in one command: deploy + initialize all programs
txtx run deployment --env devnet -u
```

### Token Operations (after deployment)

```bash
surfpool run token-operations --env localnet -u
```

### Upgrade Programs (when you have new code)

```bash
surfpool run upgrade --env localnet -u
```

---

## Runbook Inventory

### 1. Unified Deployment [`deployment/`](./deployment/)

**Purpose**: Deploy AND initialize all three Solana programs in a single runbook.

**Execution Order**: FIRST (prerequisite for all other runbooks)

**Phases**:
1. **Phase 1**: Deploy `compliance_aggregator` program (no dependencies)
2. **Phase 2**: Deploy `identity_registry` program (depends on compliance_aggregator)
3. **Phase 3**: Deploy `solana_rwa` program (depends on both)
4. **Phase 4**: Initialize `ComplianceAggregatorState` PDA
5. **Phase 5**: Initialize `IdentityRegistryState` PDA
6. **Phase 6**: Initialize `TokenState` PDA with metadata

**Usage**:
```bash
# Localnet (Surfpool)
surfpool run deployment --env localnet -u

# Devnet
txtx run deployment --env devnet -u

# Mainnet (use with caution!)
txtx run deployment --env mainnet -u

# With custom token parameters
txtx run deployment --env devnet \
    --input token_name="My Token" \
    --input token_symbol="MTK" \
    --input token_decimals=9 \
    -u
```

**Outputs**:
- `solana_rwa_program_id` - Program ID for solana_rwa
- `identity_registry_program_id` - Program ID for identity_registry
- `compliance_aggregator_program_id` - Program ID for compliance_aggregator

---

### 2. Token Operations [`token-operations/`](./token-operations/)

**Purpose**: Perform token operations after deployment.

**Execution Order**: AFTER deployment

**Actions**:
- Mint tokens to recipient wallet
- Transfer tokens between accounts
- Add/remove authorized agents
- Freeze/unfreeze token accounts

**Usage**:
```bash
# Basic operations (uses default values from txtx.yml)
surfpool run token-operations --env localnet -u

# With custom inputs
surfpool run token-operations --env localnet \
    --input recipient_wallet=<PUBKEY> \
    --input mint_amount=1000 \
    -u
```

**Required Inputs**:
- `solana_rwa_program_id` - From deployment output
- `token_state_account` - From deployment output

---

### 3. Upgrade [`upgrade/`](./upgrade/)

**Purpose**: Upgrade deployed programs to new versions while preserving state.

**Execution Order**: AFTER you have built new program binaries

**Important**: Program upgrades on Solana keep the same program ID - only the code is updated.

**Actions**:
1. Upgrade `compliance_aggregator` program
2. Upgrade `identity_registry` program
3. Upgrade `solana_rwa` program

**Usage**:
```bash
# Build first
anchor build

# Then upgrade
surfpool run upgrade --env localnet -u
```

---

### 4. Surfnet Setup [`setup-surfnet/`](./setup-surfnet/)

**Purpose**: Configure the local development environment.

**Execution Order**: BEFORE deployment (optional, for local development)

**Actions**:
- Set up account balances
- Create token accounts
- Configure program authorities
- Clone mainnet programs (for fork testing)

**Usage**:
```bash
surfpool run setup-surfnet --env localnet -u
```

---

## File Structure

```
runbooks/
├── deployment/
│   └── main.tx              # Unified deploy + initialize
├── token-operations/
│   └── main.tx              # Token operations (mint, transfer, etc.)
├── upgrade/
│   └── main.tx              # Program upgrades
└── setup-surfnet/
    └── main.tx              # Local environment setup
```

All runbooks now use `main.tx` as the standard filename for consistency.

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Workflow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Build Programs                                           │
│     └─ anchor build                                          │
│                                                              │
│  2. Start Surfpool (localnet)                                │
│     └─ surfpool start                                        │
│                                                              │
│  3. Deploy + Initialize (UNIFIED)                            │
│     └─ surfpool run deployment --env localnet -u             │
│        ├─ Phase 1: Deploy compliance_aggregator              │
│        ├─ Phase 2: Deploy identity_registry                  │
│        ├─ Phase 3: Deploy solana_rwa                         │
│        ├─ Phase 4: Init compliance_aggregator                │
│        ├─ Phase 5: Init identity_registry                    │
│        └─ Phase 6: Init token state                          │
│                                                              │
│  4. Verify                                                   │
│     └─ solana program list                                   │
│                                                              │
│  5. Operations (optional)                                    │
│     └─ surfpool run token-operations --env localnet -u       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Configuration

All environment-specific configuration is in [`../txtx.yml`](../txtx.yml).

### Localnet (Surfpool)
- Uses local Surfpool node
- Program IDs are assigned at deployment time
- Airdrop available for testing

### Devnet/Mainnet
- Uses public Solana networks
- Program IDs must be captured after deployment
- Requires real SOL for fees

---

## Troubleshooting

### "data not found" errors
- Make sure you're using the unified deployment runbook
- The old separate initialization runbooks have been removed

### Program ID mismatches
- Check `../txtx.yml` for correct program IDs
- After deployment, update program IDs in your configuration

### Build failures
- Run `anchor build` manually to see detailed errors
- Check `.surfpool/build.log` for build output
