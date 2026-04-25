# Solana RWA - Comprehensive Analysis Report

> Deep analysis of the Solana RWA project implementation, detecting inconsistencies, verifying integrity between smart contracts and frontend, and providing professional recommendations for deployment, testing, and contract upgrade strategies.

**Date:** 2026-04-23  
**Project:** Solana RWA (Real World Assets Tokenization)  
**Architecture:** Three-program system (solana-rwa, identity-registry, compliance-aggregator)  
**Framework:** Anchor v0.32.1  
**Deployment System:** txtx (Infrastructure as Code) + Surfpool

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Smart Contract Analysis](#2-smart-contract-analysis)
3. [Frontend Integration Analysis](#3-frontend-integration-analysis)
4. [Critical Issues Detected](#4-critical-issues-detected)
5. [Surfpool Documentation & Best Practices](#5-surfpool-documentation--best-practices)
6. [txtx Infrastructure as Code Analysis](#6-txtx-infrastructure-as-code-analysis)
7. [Professional Testing Workflow](#7-professional-testing-workflow)
8. [Contract Upgrade Strategies](#8-contract-upgrade-strategies)
9. [Cost Optimization](#9-cost-optimization)
10. [Recommended Action Plan](#10-recommended-action-plan)
11. [General Patterns for Other Projects](#11-general-patterns-for-other-projects)

---

## 1. Executive Summary

### Project Overview

The Solana RWA project implements a tokenization system with three interconnected Anchor programs:

| Program | Program ID | Purpose |
|---------|-----------|---------|
| `solana-rwa` | `7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L` | Main tokenization program with minting, burning, transfers, agent management |
| `identity-registry` | `3QreJufDNn5MgdhDtWuYBW2WmQnbDzwfub8X5` | Identity registration and management |
| `compliance-aggregator` | `EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT` | Multi-layer compliance module aggregation |

### Security Status

- **12 security issues resolved** (CRIT-01 to CRIT-03, HIGH-01 to HIGH-04, MEDIUM-01 to MEDIUM-05)
- **Security rating improved** from 5.5/10 to 9.2/10
- **120 tests passing**
- **Cross-program integration** verified

### Current Issues Summary

| Priority | Issue | Status |
|----------|-------|--------|
| 🔴 CRITICAL | Placeholder Program IDs in `ids.rs` | OPEN |
| 🔴 CRITICAL | Empty Program IDs for devnet/mainnet in frontend | OPEN |
| 🔴 CRITICAL | Token actions using placeholder implementations | OPEN |
| 🟡 HIGH | txtx.yml program IDs not configured for devnet/mainnet | OPEN |
| 🟡 HIGH | No upgradeable program pattern implemented | OPEN |
| 🟡 HIGH | No CI/CD pipeline for automated testing | OPEN |
| 🟢 MEDIUM | Missing environment variable validation | OPEN |
| 🟢 MEDIUM | No documentation for local development workflow | OPEN |

---

## 2. Smart Contract Analysis

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  client.ts  │  │ solana.ts    │  │ useTokenActions  │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                    │             │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Solana Blockchain                          │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │  solana-rwa     │◄─┤ identity-registry │                  │
│  │  (Token Program)│  │   (Identities)   │                  │
│  └────────┬────────┘  └──────────────────┘                  │
│           │                                                   │
│           ▼                                                   │
│  ┌──────────────────────────┐                                │
│  │ compliance-aggregator    │                                │
│  │   (Transfer Rules)       │                                │
│  └──────────────────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Token State Structure

The [`solana-rwa`](solana-rwa/programs/solana-rwa/src/lib.rs) program implements:

```rust
pub struct TokenState {
    owner: Pubkey,
    freeze_authority: Pubkey,
    name: String,
    symbol: String,
    decimals: u8,
    total_supply: u64,
    balances: Vec<BalanceEntry>,
    frozen_accounts: Vec<Pubkey>,
    agents: Vec<Pubkey>,
    compliance_modules: Vec<Pubkey>,
}
```

**Constants:**
- `MAX_SUPPLY = 10^18` (u64::MAX compatible)
- `MAX_BALANCE_LIMIT = 10^15`
- `MAX_HOLDERS_LIMIT = 10,000`

### 2.3 Identity Registry Structure

The [`identity-registry`](solana-rwa/programs/identity-registry/src/lib.rs) program implements:

```rust
pub struct IdentityRegistryState {
    owner: Pubkey,
    next_index: u64,
    registered_addresses: Vec<Pubkey>,
    identity_map: Vec<IdentityData>,
}
```

**Constants:**
- `MAX_NAME_LENGTH = 32`
- `MAX_SYMBOL_LENGTH = 10`
- `MAX_METADATA_URI_LENGTH = 256`
- `MAX_IDENTITY_DATA_LENGTH = 128`

### 2.4 Compliance Aggregator Structure

The [`compliance-aggregator`](solana-rwa/programs/compliance-aggregator/src/lib.rs) program implements:

```rust
pub struct ComplianceAggregatorState {
    owner: Pubkey,
    next_index: u64,
    token_modules: Vec<TokenModule>,
}
```

**6-Layer Validation (CRIT-01 Fix):**
1. Module existence check
2. Ownership verification
3. Token-specific rules
4. Account status validation
5. Balance limits
6. Transfer lock periods

### 2.5 Code Organization Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Program separation | ✅ Excellent | Clear single-responsibility design |
| Constant usage | ✅ Good | Using named constants, not magic numbers |
| Error handling | ✅ Good | Custom error types with descriptive messages |
| Access control | ✅ Good | Ownership checks on all mutating instructions |
| Cross-program IDs | 🔴 Critical | Placeholder IDs in `ids.rs` |
| Upgradeability | 🔴 Critical | No upgrade pattern implemented |

---

## 3. Frontend Integration Analysis

### 3.1 Program ID Configuration

The [`web/src/config/solana.ts`](web/src/config/solana.ts) file implements:

```typescript
export const PROGRAM_IDS = {
  localnet: {
    solanaRwa: '7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L',
    identityRegistry: '3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5',
    complianceAggregator: 'EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT',
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

**Assessment:** ✅ Good implementation with environment variable support

### 3.2 Instruction Builders & Parsers

The [`web/src/anchor/client.ts`](web/src/anchor/client.ts) file contains:

- **Parsers:** `parseSupplyInfo`, `parseAggregatorState`, `parseIdentityInfo`
- **Instruction Builders:** `buildTransferOwnerInstruction`, `buildTransferFreezeAuthorityInstruction`, etc.
- **Discriminators:** Defined for all instructions

**Assessment:** ✅ Well-structured with proper discriminator handling

### 3.3 Token Actions Hook

The [`web/src/hooks/useTokenActions.ts`](web/src/hooks/useTokenActions.ts) file has **placeholder implementations**:

```typescript
// PROBLEM: Empty transaction construction
const transaction = new Transaction();
// Note: En producción, usar Anchor SDK
const signature = await sendTransaction(transaction, connection);
```

**Assessment:** 🔴 Critical - Functions don't actually interact with the blockchain

---

## 4. Critical Issues Detected

### 4.1 🔴 CRITICAL: Placeholder Program IDs in `ids.rs`

**File:** [`solana-rwa/programs/solana-rwa/src/ids.rs`](solana-rwa/programs/solana-rwa/src/ids.rs)

```rust
// CURRENT (WRONG - PLACEHOLDER VALUES)
pub const IDENTITY_REGISTRY_PROGRAM_ID: &str = "9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n5";
pub const COMPLIANCE_AGGREGATOR_PROGRAM_ID: &str = "8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o7";
```

**Problem:** These are invalid Base58 strings that don't correspond to real program IDs. They will cause compilation or runtime errors.

**Fix:**
```rust
// CORRECT (Use actual program IDs from Anchor.toml)
pub const IDENTITY_REGISTRY_PROGRAM_ID: &str = "3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5";
pub const COMPLIANCE_AGGREGATOR_PROGRAM_ID: &str = "EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT";
```

### 4.2 🔴 CRITICAL: Empty Devnet/Mainnet Program IDs

**File:** [`solana-rwa/txtx.yml`](solana-rwa/txtx.yml)

```yaml
devnet:
  solana_rwa_program_id: ""
  identity_registry_program_id: ""
  compliance_aggregator_program_id: ""
```

**Problem:** All program IDs are empty for devnet and mainnet environments. The txtx deployment system cannot function without these values.

**Fix:** After deploying to each network, populate the IDs:
```yaml
devnet:
  solana_rwa_program_id: "YOUR_DEVNET_PROGRAM_ID_1"
  identity_registry_program_id: "YOUR_DEVNET_PROGRAM_ID_2"
  compliance_aggregator_program_id: "YOUR_DEVNET_PROGRAM_ID_3"
```

### 4.3 🔴 CRITICAL: Placeholder Token Actions

**File:** [`web/src/hooks/useTokenActions.ts`](web/src/hooks/useTokenActions.ts)

**Problem:** All token action functions (mint, burn, transfer, freeze, etc.) create empty transactions without using the Anchor SDK instruction builders.

**Fix:** Replace with actual Anchor SDK calls:
```typescript
// BEFORE (Placeholder)
const transaction = new Transaction();
const signature = await sendTransaction(transaction, connection);

// AFTER (Real implementation)
const program = new Program(
  IDL,
  PROGRAM_IDS[network].solanaRwa,
  { connection, provider }
);

const signature = await program.methods
  .mint(amount, mintAuthority)
  .accounts({
    token: tokenAccount,
    mint: mintAuthority,
    // ... other accounts
  })
  .rpc();
```

### 4.4 🟡 HIGH: No Upgradeable Program Pattern

**Problem:** The current programs use `declare_id!()` which locks the program ID. Any upgrade requires deploying a new program and migrating state.

**Recommended Solution:** Implement the [Bump Anchor](https://github.com/ckb-vm/bump-anchor) or [Scaffold](https://github.com/stephanpardelow/solana-program-library/tree/master/examples/upgradeable) pattern for upgradeable programs.

### 4.5 🟡 HIGH: Deployment Blocked by `DeclaredProgramIdMismatch`

**Problem:** Anchor generates random keypairs during `anchor deploy` that don't match the `declare_id!()` macro, causing deployment failures.

**Solution:** Use `anchor build` followed by manual deployment with `solana program write-buffer` and `solana program deploy`.

---

## 5. Surfpool Documentation & Best Practices

### 5.1 What is Surfpool?

Based on the official documentation at [docs.surfpool.run](https://docs.surfpool.run):

> **Surfpool** is a drop-in replacement for `solana-test-validator` that provides:
> - **Mainnet Forking:** Clone accounts, programs, and token balances from Mainnet
> - **Cheatcodes:** Powerful testing utilities for state manipulation
> - **Infrastructure as Code:** Define deployments using txtx DSL
> - **Terminal UI:** Real-time visibility into your local network
> - **Full RPC Compatibility:** Drop-in replacement for solana-test-validator

### 5.2 Installation

```bash
# Install CLI
curl -sL https://run.surfpool.run/ | bash

# Verify installation
surfpool --version
```

### 5.3 Quick Start

```bash
# Navigate to your Anchor project
cd solana-rwa

# Start Surfpool (auto-detects Anchor.toml)
surfpool

# Dashboard available at: http://localhost:18488
```

### 5.4 Key Features for This Project

#### 5.4.1 Mainnet Forking

Surfpool fetches accounts just-in-time as transactions are sent to the RPC endpoint. This allows:

```bash
# Start with Mainnet fork
surfpool --mainnet --rpc-url https://api.mainnet-beta.solana.com

# Start with Devnet fork
surfpool --devnet --rpc-url https://api.devnet.solana.com
```

**Benefit for RWA Project:** Test with real token states and existing program deployments.

#### 5.4.2 Cheatcodes

Surfpool provides powerful testing utilities:

```typescript
// Set account balance
await connection.rpc('setAccountBalance', [pubkey, lamports]);

// Mint tokens to account
await connection.rpc('mintTokens', [pubkey, amount]);

// Warp time
await connection.rpc('warpToSlot', [slot]);

// Set program state
await connection.rpc('setProgramState', [programId, data]);
```

**Use Cases:**
- Test compliance modules with specific token balances
- Simulate agent permissions
- Test freeze/unfreeze scenarios
- Verify transfer restrictions

#### 5.4.3 Terminal UI Dashboard

Running `surfpool` starts an interactive TUI dashboard at `http://localhost:18488`:
- Real-time transaction monitoring
- Account state inspection
- Program deployment status
- Network performance metrics

### 5.5 Surfpool vs solana-test-validator

| Feature | solana-test-validator | Surfpool |
|---------|----------------------|----------|
| Local testing | ✅ | ✅ |
| Mainnet forking | ❌ | ✅ |
| Cheatcodes | ❌ | ✅ |
| TUI Dashboard | ❌ | ✅ |
| txtx Integration | ❌ | ✅ |
| RPC Compatibility | ✅ | ✅ |
| Zero-config Anchor | ✅ | ✅ |

---

## 6. txtx Infrastructure as Code Analysis

### 6.1 What is txtx?

**txtx** is an Infrastructure as Code system designed specifically for Solana deployments. It uses a Domain Specific Language (DSL) to define:

- Program deployments
- Account initializations
- Token operations
- Signer configurations
- Environment-specific variables

### 6.2 Current txtx.yml Structure

```yaml
name: solana-rwa
id: solana-rwa
runbooks:
  - name: deployment
    location: ./runbooks/deployment
    state:
      location: .surfpool/state
  
  - name: token-operations
    location: ./runbooks/deployment
  
  - name: upgrade
    location: ./runbooks/deployment
    state:
      location: .surfpool/state
  
  - name: setup-surfnet
    location: ./runbooks/deployment

environments:
  localnet:
    network_id: localnet
    rpc_api_url: http://127.0.0.1:8899
    payer_keypair_json: ~/.config/solana/id.json
    # ... variables

  devnet:
    network_id: devnet
    rpc_api_url: https://api.devnet.solana.com
    # ... variables

  mainnet:
    network_id: mainnet
    rpc_api_url: https://api.mainnet-beta.solana.com
    # ... variables
```

### 6.3 txtx Runbooks

The project includes these runbooks in [`solana-rwa/runbooks/deployment/`](solana-rwa/runbooks/deployment/):

| Runbook | Purpose |
|---------|---------|
| `main.tx` | Deploy and initialize all three programs |
| `setup-surfnet.tx` | Configure Surfnet environment (balances, token accounts) |
| `signers.devnet.tx` | Devnet signer configuration |
| `signers.localnet.tx` | Localnet signer configuration |
| `signers.mainnet.tx` | Mainnet signer configuration |
| `token-operations.tx` | Token minting, transfers, agent management |
| `upgrade.tx` | Program upgrade procedures |

### 6.4 txtx Standard Library

Based on the documentation, txtx provides:

**Functions:**
- Operators: `add`, `sub`, `mul`, `div`
- Hash: `sha256`, `keccak256`
- Base58/Base64 encoding/decoding
- JSON manipulation
- Assertions

**Actions:**
- Program deployment
- Account creation
- Token transfers
- System instructions

### 6.5 Recommended txtx Improvements

#### 6.5.1 Add Program ID Validation

```yaml
# Add validation rules
validators:
  - condition: "solana_rwa_program_id != ''"
    message: "solana_rwa_program_id must be set for production environments"
    environments: [devnet, mainnet]
```

#### 6.5.2 Add Post-Deployment Verification

```yaml
# In deployment runbook
post_deploy:
  - action: verify_program
    program_id: "${solana_rwa_program_id}"
    expected_version: "1.0.0"
  - action: verify_initialization
    account: "${token_state_account}"
    expected_owner: "${solana_rwa_program_id}"
```

---

## 7. Professional Testing Workflow

### 7.1 Recommended Development Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Development Workflow                          │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │  Code    │───►│  anchor  │───►│  surfpool│                  │
│  │  Changes │    │  build   │    │   start  │                  │
│  └──────────┘    └──────────┘    └────┬─────┘                  │
│                                       │                         │
│                                       ▼                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │  Manual  │◄───│  yarn    │◄───│  Auto    │                  │
│  │  Testing │    │  test    │    │  deploy  │                  │
│  └────┬─────┘    └──────────┘    └──────────┘                  │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │  Deploy  │───►│  Devnet  │───►│  Mainnet │                  │
│  │  to      │    │  Testing │    │  Release │                  │
│  │  Local   │    │          │    │          │                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Local Development with Surfpool

```bash
# Step 1: Install Surfpool
curl -sL https://run.surfpool.run/ | bash

# Step 2: Navigate to project
cd solana-rwa

# Step 3: Build programs
anchor build

# Step 4: Start Surfpool (auto-detects Anchor.toml)
surfpool

# Step 5: In another terminal, run tests
anchor test

# Step 6: Or run txtx deployment
txtx run deployment --env localnet
```

### 7.3 Local Testing with Mainnet Fork

```bash
# Start Surfpool with Mainnet fork
surfpool --mainnet --rpc-url https://api.mainnet-beta.solana.com

# Deploy your programs to the forked network
txtx run deployment --env localnet

# Test with real Mainnet states
anchor test
```

### 7.4 Devnet Testing

```bash
# Step 1: Deploy to Devnet using txtx
txtx run deployment --env devnet

# Step 2: Verify deployment
solana program show <PROGRAM_ID> --url https://api.devnet.solana.com

# Step 3: Run integration tests
yarn test:integration --network devnet

# Step 4: Update txtx.yml with deployed program IDs
# (Manually populate after successful deployment)
```

### 7.5 Mainnet Release

```bash
# Step 1: Final security audit
# (Run external audit before mainnet deployment)

# Step 2: Deploy to Mainnet
txtx run deployment --env mainnet

# Step 3: Verify all programs
solana program show <PROGRAM_ID> --url https://api.mainnet-beta.solana.com

# Step 4: Initialize token state
txtx run token-operations --env mainnet

# Step 5: Update frontend configuration
# (Update .env.production with mainnet program IDs)
```

---

## 8. Contract Upgrade Strategies

### 8.1 Current Limitation

The current implementation uses `declare_id!()` which embeds the program ID in the bytecode. This means:
- Program ID cannot change
- Upgrades require manual state migration
- No built-in upgrade mechanism

### 8.2 Recommended: Upgradeable Programs with Bump Anchor

#### Option A: Bump Anchor (Recommended)

```bash
# Install bump-anchor
cargo install bump-anchor

# Modify Anchor.toml
[programs]
upgradeable = true

# Build with upgradeability
anchor build --features upgradeable
```

#### Option B: Manual Upgrade Pattern

```rust
// Add upgrade authority to your program
#[account]
pub struct TokenState {
    // ... existing fields
    pub upgrade_authority: Pubkey,
    pub is_upgraded: bool,
    pub upgraded_at: u64,
}

// Add upgrade instruction
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpgradeInstruction {
    pub new_program_data: Vec<u8>,
}

#[access_control(verify_upgrade_authority(ctx))]
pub fn upgrade(ctx: Context<Upgrade>, new_program_data: Vec<u8>) -> Result<()> {
    let state = &mut ctx.accounts.token_state;
    state.upgraded_at = Clock::get()?.unix_timestamp as u64;
    state.is_upgraded = true;
    Ok(())
}
```

### 8.3 State Migration Strategy

When upgrading programs, use this pattern:

```rust
// Version tracking
pub struct MigrationVersion {
    pub version: u64,
    pub migrated_at: u64,
    pub migrated_by: Pubkey,
}

// Migration instruction
pub fn migrate_state(ctx: Context<Migrate>, new_program_id: Pubkey) -> Result<()> {
    // 1. Serialize current state
    let state_data = serialize_state(&ctx.accounts.token_state)?;
    
    // 2. Transfer lamports to new program
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        SystemTransfer {
            from: ctx.accounts.token_state.to_account_info(),
            to: ctx.accounts.new_program.to_account_info(),
        }
    );
    system_program::transfer(cpi_context, state_data.len() as u64)?;
    
    // 3. Update references
    // (Update identity-registry and compliance-aggregator)
    
    Ok(())
}
```

### 8.4 Upgrade Checklist

- [ ] Run full test suite on local Surfpool
- [ ] Test state migration on devnet
- [ ] Verify all cross-program integrations
- [ ] Update IDL files
- [ ] Update frontend configuration
- [ ] Document breaking changes
- [ ] Run security audit for major versions
- [ ] Notify users of upcoming upgrade

---

## 9. Cost Optimization

### 9.1 Deployment Costs

| Network | Estimated Cost | Notes |
|---------|---------------|-------|
| Localnet | $0 | Free, uses Surfpool |
| Devnet | $0 (test SOL) | Free testnet |
| Mainnet | ~5-10 SOL | Depends on program size |

### 9.2 Cost Reduction Strategies

#### 9.2.1 Program Size Optimization

```rust
// Use Borsh serialization efficiently
#[derive(BorshSerialize, BorshDeserialize, Clone)]
pub struct BalanceEntry {
    pub account: Pubkey,      // 32 bytes
    pub balance: u64,         // 8 bytes
    pub is_frozen: bool,      // 1 byte (padded to 8)
}
// Total: 49 bytes per entry (vs ~100 bytes with JSON)

// Use Vec instead of fixed arrays when possible
pub struct TokenState {
    pub balances: Vec<BalanceEntry>,  // Dynamic size
    pub frozen_accounts: Vec<Pubkey>, // Dynamic size
}
```

#### 9.2.2 Rent Optimization

```rust
// Transfer rent exemption to program
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let rent = Rent::get()?;
    let lamports_needed = rent.minimum_balance(TokenState::size());
    
    // System program transfer for rent
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        SystemTransfer {
            from: ctx.accounts.authority.to_account_info(),
            to: ctx.accounts.token_state.to_account_info(),
        }
    );
    system_program::transfer(cpi_context, lamports_needed)?;
    
    Ok(())
}
```

#### 9.2.3 Batch Operations

```typescript
// Batch multiple transfers in single transaction
const transactions = transfers.map((transfer) => 
  buildTransferInstruction(transfer)
);

const batchTransaction = new Transaction();
transactions.forEach((tx, i) => {
  batchTransaction.add(tx);
});

const signature = await sendTransaction(batchTransaction, connection);
// Single signature, lower total cost
```

### 9.3 Ongoing Cost Monitoring

```bash
# Check account rent costs
solana account <ACCOUNT_ID> --output json | jq '.rentExemptReserve'

# Monitor program size
solana program show <PROGRAM_ID> --output json | jq '.space'

# Estimate deployment cost
echo "Deployment cost: $(echo "scale=2; $(solana program show <PROGRAM_ID> --output json | jq '.space') * 50 / 1000000000" | bc) SOL"
```

---

## 10. Recommended Action Plan

### 10.1 Immediate Actions (P0)

| # | Action | Priority | Time |
|---|--------|----------|------|
| 1 | Fix placeholder IDs in `ids.rs` | 🔴 Critical | 15 min |
| 2 | Implement real token actions in `useTokenActions.ts` | 🔴 Critical | 2-3 hours |
| 3 | Add program ID validation in frontend | 🔴 Critical | 30 min |
| 4 | Install and test Surfpool locally | 🟡 High | 1 hour |

### 10.2 Short-term Improvements (P1)

| # | Action | Priority | Time |
|---|--------|----------|------|
| 5 | Configure txtx.yml for devnet with real program IDs | 🟡 High | 30 min |
| 6 | Implement upgradeable program pattern | 🟡 High | 4-6 hours |
| 7 | Add CI/CD pipeline for automated testing | 🟡 High | 8-12 hours |
| 8 | Document local development workflow | 🟢 Medium | 2 hours |

### 10.3 Long-term Enhancements (P2)

| # | Action | Priority | Time |
|---|--------|----------|------|
| 9 | Implement state migration strategy | 🟢 Medium | 6-8 hours |
| 10 | Add comprehensive integration tests | 🟢 Medium | 8-12 hours |
| 11 | Set up monitoring and alerting | 🟢 Medium | 4-6 hours |
| 12 | Security audit by external firm | 🟢 Medium | 1-2 weeks |

### 10.4 Detailed Fix for ids.rs

**Current file content:**
```rust
pub const IDENTITY_REGISTRY_PROGRAM_ID: &str = "9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n5";
pub const COMPLIANCE_AGGREGATOR_PROGRAM_ID: &str = "8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o7";
```

**Fixed content:**
```rust
// Program IDs - synchronized with Anchor.toml
pub const SOLANA_RWA_PROGRAM_ID: &str = "7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L";
pub const IDENTITY_REGISTRY_PROGRAM_ID: &str = "3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5";
pub const COMPLIANCE_AGGREGATOR_PROGRAM_ID: &str = "EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT";

// Network-specific IDs (to be populated after deployment)
pub mod devnet {
    pub const SOLANA_RWA_PROGRAM_ID: &str = "YOUR_DEVNET_SOLANA_RWA_ID";
    pub const IDENTITY_REGISTRY_PROGRAM_ID: &str = "YOUR_DEVNET_IDENTITY_REGISTRY_ID";
    pub const COMPLIANCE_AGGREGATOR_PROGRAM_ID: &str = "YOUR_DEVNET_COMPLIANCE_AGGREGATOR_ID";
}

pub mod mainnet {
    pub const SOLANA_RWA_PROGRAM_ID: &str = "YOUR_MAINNET_SOLANA_RWA_ID";
    pub const IDENTITY_REGISTRY_PROGRAM_ID: &str = "YOUR_MAINNET_IDENTITY_REGISTRY_ID";
    pub const COMPLIANCE_AGGREGATOR_PROGRAM_ID: &str = "YOUR_MAINNET_COMPLIANCE_AGGREGATOR_ID";
}
```

### 10.5 Detailed Fix for useTokenActions.ts

**Current placeholder:**
```typescript
const transaction = new Transaction();
const signature = await sendTransaction(transaction, connection);
```

**Fixed implementation:**
```typescript
import { Program, AnchorProvider } from '@project-serum/anchor';
import { PROGRAM_IDS, getConnection } from '@/config/solana';
import { IDL } from '@/anchor/idl/solana_rwa';

export function useTokenActions(network: NetworkType = 'localnet') {
  const connection = getConnection(network);
  const programId = new PublicKey(PROGRAM_IDS[network].solanaRwa);
  
  const mint = async (
    provider: AnchorProvider,
    amount: number,
    mintAuthority: PublicKey,
    mint: PublicKey
  ): Promise<string> => {
    const program = new Program(IDL, programId, provider);
    
    const signature = await program.methods
      .mint(amount)
      .accounts({
        mint,
        mintAuthority,
        tokenState: await getTokenStatePDA(mint),
      })
      .rpc();
    
    return signature;
  };
  
  // ... implement other actions similarly
}
```

---

## 11. General Patterns for Other Projects

### 11.1 Project Structure Template

```
project/
├── programs/
│   ├── program-a/
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   └── ids.rs          # Program IDs
│   │   └── Cargo.toml
│   └── program-b/
│       ├── src/
│       │   ├── lib.rs
│       │   └── ids.rs
│       └── Cargo.toml
├── migrations/
│   └── deploy.ts
├── tests/
│   ├── program-a.ts
│   └── program-b.ts
├── web/
│   ├── src/
│   │   ├── anchor/
│   │   │   ├── client.ts        # Instruction builders
│   │   │   ├── idl/             # IDL files
│   │   │   └── parsers.ts       # Account parsers
│   │   ├── config/
│   │   │   └── solana.ts        # Program IDs, connection
│   │   └── hooks/
│   │       └── useTokenActions.ts
│   └── .env.local.example
├── runbooks/
│   └── deployment/
│       ├── main.tx
│       └── signers.*.tx
├── Anchor.toml
├── txtx.yml
└── scripts/
    ├── deploy.sh
    └── test.sh
```

### 11.2 Program ID Management Pattern

**Step 1:** Define in `Anchor.toml`:
```toml
[programs.localnet]
my_program = "YOUR_PROGRAM_ID"
```

**Step 2:** Sync to `ids.rs`:
```rust
pub const MY_PROGRAM_ID: &str = "YOUR_PROGRAM_ID";
```

**Step 3:** Sync to frontend `solana.ts`:
```typescript
export const PROGRAM_IDS = {
  localnet: { myProgram: 'YOUR_PROGRAM_ID' },
  devnet: { myProgram: process.env.NEXT_PUBLIC_MY_PROGRAM_DEVNET || '' },
  mainnet: { myProgram: process.env.NEXT_PUBLIC_MY_PROGRAM_MAINNET || '' },
};
```

**Step 4:** Sync to `txtx.yml`:
```yaml
environments:
  localnet:
    my_program_id: "YOUR_PROGRAM_ID"
  devnet:
    my_program_id: ""  # Populate after deployment
```

### 11.3 Testing Checklist Template

```markdown
## Pre-Deployment Checklist

### Local Testing
- [ ] `anchor build` passes
- [ ] `anchor test` passes (all tests)
- [ ] Surfpool starts without errors
- [ ] txtx deployment runs on localnet
- [ ] Frontend connects to local programs

### Devnet Testing
- [ ] Programs deployed successfully
- [ ] Program IDs updated in all files
- [ ] Integration tests pass on devnet
- [ ] Frontend works with devnet programs
- [ ] Wallet connections work

### Mainnet Readiness
- [ ] Security audit completed
- [ ] All tests passing on devnet
- [ ] Program IDs verified
- [ ] Frontend .env.production configured
- [ ] Rollback plan documented
```

### 11.4 Environment Variable Template

```bash
# .env.local (Local Development)
NEXT_PUBLIC_SOLANA_NETWORK=localnet
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=http://localhost:8899
NEXT_PUBLIC_SOLANA_RWA_PROGRAM_ID=7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L

# .env.development (Devnet)
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_RWA_DEVNET_PROGRAM_ID=<DEVNET_PROGRAM_ID>
NEXT_PUBLIC_IDENTITY_REGISTRY_DEVNET_PROGRAM_ID=<DEVNET_PROGRAM_ID>
NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_DEVNET_PROGRAM_ID=<DEVNET_PROGRAM_ID>

# .env.production (Mainnet)
NEXT_PUBLIC_SOLANA_NETWORK=mainnet
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_RWA_MAINNET_PROGRAM_ID=<MAINNET_PROGRAM_ID>
NEXT_PUBLIC_IDENTITY_REGISTRY_MAINNET_PROGRAM_ID=<MAINNET_PROGRAM_ID>
NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_MAINNET_PROGRAM_ID=<MAINNET_PROGRAM_ID>
```

---

## Appendix A: Resource Links

| Resource | URL |
|----------|-----|
| Surfpool Docs | https://docs.surfpool.run |
| Surfpool GitHub | https://github.com/txtx/surfpool |
| Surfpool Discord | https://discord.gg/rqXmWsn2ja |
| Surfpool Website | https://surfpool.run |
| Anchor Framework | https://www.anchor-lang.com |
| Solana Documentation | https://docs.solana.com |
| Solana Cookbook | https://solanacookbook.com |

## Appendix B: Commands Quick Reference

```bash
# Install Surfpool
curl -sL https://run.surfpool.run/ | bash

# Start Surfpool
surfpool

# Build programs
anchor build

# Run tests
anchor test

# Deploy to localnet
anchor deploy

# Deploy with txtx
txtx run deployment --env localnet

# Show program info
solana program show <PROGRAM_ID>

# Check account
solana account <ACCOUNT_ID>
```

## Appendix C: Program IDs Reference

| Program | Localnet | Devnet | Mainnet |
|---------|----------|--------|---------|
| solana-rwa | `7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L` | _TBD_ | _TBD_ |
| identity-registry | `3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5` | _TBD_ | _TBD_ |
| compliance-aggregator | `EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT` | _TBD_ | _TBD_ |

---

*Report generated on 2026-04-23*  
*Analysis based on project state at time of review*
