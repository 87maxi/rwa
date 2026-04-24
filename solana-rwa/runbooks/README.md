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

## Runbook Inventory

### 1. Deployment Runbook [`deployment/`](./deployment/)

**Purpose**: Deploy all three Solana programs to a target network.

**Execution Order**: FIRST (prerequisite for all other runbooks)

**Actions**:
1. Deploy `compliance_aggregator` program (no dependencies)
2. Deploy `identity_registry` program (depends on compliance_aggregator being deployed)
3. Deploy `solana_rwa` program (depends on both programs being deployed)

**Usage**:
```bash
# Localnet (Surfpool)
txtx run deployment --env localnet -u

# Devnet
txtx run deployment --env devnet -u

# Mainnet (use with caution!)
txtx run deployment --env mainnet -u
```

**Outputs**:
- `solana_rwa_program_id` - Program ID for solana_rwa
- `identity_registry_program_id` - Program ID for identity_registry
- `compliance_aggregator_program_id` - Program ID for compliance_aggregator

---

### 2. Compliance Aggregator Initialization [`compliance-initialization/`](./compliance-initialization/)

**Purpose**: Create the `ComplianceAggregatorState` account.

**Execution Order**: SECOND (after deployment, before identity initialization)

**Actions**:
1. Call `initialize` instruction on compliance_aggregator program
2. Creates the `ComplianceAggregatorState` PDA

**Required Inputs**:
- `compliance_aggregator_program_id` - From deployment output

**Usage**:
```bash
txtx run compliance-initialization --env localnet -u
```

**Outputs**:
- `compliance_aggregator_account_key` - The created account's public key

---

### 3. Identity Registry Initialization [`identity-initialization/`](./identity-initialization/)

**Purpose**: Create the `IdentityRegistryState` account.

**Execution Order**: THIRD (after deployment, after compliance initialization)

**Actions**:
1. Call `initialize` instruction on identity_registry program
2. Creates the `IdentityRegistryState` PDA

**Required Inputs**:
- `identity_registry_program_id` - From deployment output

**Usage**:
```bash
txtx run identity-initialization --env localnet -u
```

**Outputs**:
- `identity_registry_account_key` - The created account's public key

---

### 4. Token Initialization [`token-initialization/`](./token-initialization/)

**Purpose**: Create the `TokenState` account with token metadata.

**Execution Order**: FOURTH (after deployment, after all program initializations)

**Actions**:
1. Call `initialize` instruction on solana_rwa program
2. Creates the `TokenState` PDA with name, symbol, and decimals

**Required Inputs**:
- `solana_rwa_program_id` - From deployment output
- `token_name` - Token name (e.g., "Real World Asset Token")
- `token_symbol` - Token symbol (e.g., "RWAT")
- `token_decimals` - Decimal places (e.g., 9)

**Usage**:
```bash
txtx run token-initialization --env localnet -u \
  --input token_name="Real World Asset Token" \
  --input token_symbol="RWAT" \
  --input token_decimals=9
```

**Outputs**:
- `token_state_account_key` - The created TokenState account's public key

---

### 5. Token Operations [`token-operations/`](./token-operations/)

**Purpose**: Perform operations on an initialized token.

**Execution Order**: AFTER all initializations complete

**Available Actions**:
- `mint_tokens` - Create new tokens
- `transfer_tokens` - Transfer tokens between accounts
- `add_agent` - Add an authorized agent
- `remove_agent` - Remove an authorized agent
- `freeze_account` - Freeze a token account
- `unfreeze_account` - Unfreeze a token account

**Required Inputs**:
- `solana_rwa_program_id` - From deployment
- `token_state_account_key` - From token initialization

**Usage**:
```bash
txtx run token-operations --env localnet -u
```

---

### 6. Upgrade Runbook [`upgrade/`](./upgrade/)

**Purpose**: Upgrade deployed programs to new versions.

**Execution Order**: When you have a new program version

**Important**: Program upgrades preserve state (data persists).

**Actions**:
1. Upgrade `compliance_aggregator`
2. Upgrade `identity_registry`
3. Upgrade `solana_rwa`

**Usage**:
```bash
# Build new version first
anchor build

# Then upgrade
txtx run upgrade --env localnet -u
```

---

### 7. Surfnet Setup [`setup-surfnet/`](./setup-surfnet/)

**Purpose**: Configure local development environment.

**Execution Order**: BEFORE deployment (optional, for local development)

**Actions**:
1. Set up account balances (100 SOL for payer and authority)
2. Create USDC token accounts
3. Configure program authorities

**Usage**:
```bash
txtx run setup-surfnet --env localnet -u
```

---

## Complete Deployment Workflow

### Local Development (Surfpool)

```bash
# Step 1: Build all programs
cd solana-rwa
anchor build

# Step 2: Start Surfpool
surfpool up

# Step 3: Setup local environment (optional)
txtx run setup-surfnet --env localnet -u

# Step 4: Deploy programs
txtx run deployment --env localnet -u

# Step 5: Note the program IDs from output
# Example:
#   compliance_aggregator: 3nf1C8FuDP5SreRF6WZAiiRDpNS4LLbemZPefde5Mre3
#   identity_registry: 3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5
#   solana_rwa: 7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L

# Step 6: Initialize compliance aggregator
txtx run compliance-initialization --env localnet -u

# Step 7: Initialize identity registry
txtx run identity-initialization --env localnet -u

# Step 8: Initialize token (with metadata)
txtx run token-initialization --env localnet -u \
  --input token_name="Real World Asset Token" \
  --input token_symbol="RWAT" \
  --input token_decimals=9

# Step 9: Note the token state account key from output

# Step 10: Perform token operations
txtx run token-operations --env localnet -u
```

### Devnet/Mainnet Deployment

```bash
# Step 1: Build programs
anchor build

# Step 2: Deploy to devnet
txtx run deployment --env devnet -u

# Step 3: Update txtx.yml with program IDs from output

# Step 4: Initialize programs in order
txtx run compliance-initialization --env devnet -u
txtx run identity-initialization --env devnet -u
txtx run token-initialization --env devnet -u \
  --input token_name="..." --input token_symbol="..." --input token_decimals=9

# Step 5: Verify on Solana Explorer
```

---

## Signer Configuration

Signer files define which keypairs are used for transactions. They're located in each runbook directory:

| File | Purpose |
|------|---------|
| `signers.localnet.tx` | Local development (uses `~/.config/solana/id.json`) |
| `signers.devnet.tx` | Devnet deployment |
| `signers.mainnet.tx` | Mainnet deployment |

### Security Best Practices

1. **Localnet**: Use a development keypair
2. **Devnet**: Use a dedicated devnet keypair (NOT your mainnet key)
3. **Mainnet**: Use a hardware wallet or multi-sig setup

**Never commit private keys to version control!**

---

## Variable Management

### Input Variables

Input variables are defined in [`../txtx.yml`](../txtx.yml) and can be:
- Set directly in the file
- Overridden via CLI with `--input`
- Made editable at runtime with `-u` flag

### Example: Override Input via CLI

```bash
txtx run token-initialization --env localnet \
  --input token_name="Custom Token" \
  --input token_symbol="CTK" \
  --input solana_rwa_program_id="7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L"
```

---

## State Management

Runbooks that modify state (deployment, initialization) store their state in:

```
solana-rwa/.surfpool/state/
```

This directory contains:
- Transaction signatures
- Program IDs
- Account addresses
- Deployment history

**Never commit this directory to git!** It's environment-specific.

---

## Troubleshooting

### Error: "data not found"

**Cause**: Trying to call `process_instructions` before the account exists.

**Fix**: Run the initialization runbook first:
```bash
txtx run token-initialization --env localnet -u
```

### Error: "Program ID not found"

**Cause**: Program IDs are empty or incorrect.

**Fix**: Update `txtx.yml` with the program IDs from deployment output.

### Error: "Insufficient funds"

**Cause**: Payer account doesn't have enough SOL.

**Fix**: Run the setup-surfnet runbook or airdrop SOL:
```bash
solana airdrop 100
```

---

## File Structure

```
runbooks/
├── README.md                          # This file
├── deployment/
│   ├── main.tx                        # Program deployment actions
│   └── signers.localnet.tx           # Localnet signer config
│   ├── signers.devnet.tx             # Devnet signer config
│   └── signers.mainnet.tx            # Mainnet signer config
├── compliance-initialization/
│   └── main.tx                        # Compliance aggregator init
├── identity-initialization/
│   └── main.tx                        # Identity registry init
├── token-initialization/
│   └── main.tx                        # Token state init
├── token-operations/
│   └── main.tx                        # Token operations
├── upgrade/
│   └── main.tx                        # Program upgrades
└── setup-surfnet/
    └── main.tx                        # Local environment setup
```

---

## References

- [txtx Documentation](https://txtx docs) - Declarative IaC for Web3
- [Surfpool Documentation](https://surfpool docs) - Solana local development
- [Anchor Framework](https://www.anchor-lang.com/) - Solana development framework
- [Solana Program Library](https://github.com/solana-labs/solana-program-library) - Solana programs
