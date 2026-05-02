# Solana RWA Token Platform

Real World Assets (RWA) tokenization platform on Solana using Anchor framework.

## Architecture

Three Anchor programs:
- `compliance-aggregator` - Compliance modules aggregation
- `identity-registry` - Identity management and verification
- `solana-rwa` - Main token program with minting, freezing, and transfer compliance

## Quick Start

### Prerequisites

- Anchor CLI: `cargo install --git https://github.com/project-serum/anchor anchor-cli --locked`
- Solana CLI: `sh -c "$(curl -sSfL https://release.solana.com/v3.1.11/install)"`
- Surfpool: `cargo install surfpool --locked`
- Txtx CLI: `cargo install txtx-cli --locked`

### Deployment Workflow

#### 1. Build Programs

```bash
cd solana-rwa
./deploy.sh build localnet
```

#### 2. Deploy Programs

```bash
# Localnet (Surfpool)
./deploy.sh deploy localnet

# Devnet
./deploy.sh deploy devnet

# Mainnet
./deploy.sh deploy mainnet
```

#### 3. Initialize PDAs with Txtx

After deployment, initialize the program state accounts (PDAs):

```bash
# Localnet
txtx run compliance-initialization --env localnet
txtx run identity-initialization --env localnet
txtx run token-initialization --env localnet
```

## Commands

### Deploy Script (`deploy.sh`)

| Command | Description |
|---------|-------------|
| `./deploy.sh build [network]` | Compile programs with anchor build |
| `./deploy.sh deploy [network]` | Deploy programs with solana program deploy |
| `./deploy.sh verify [network]` | Verify program ID consistency |
| `./deploy.sh status [network]` | Show deployment status |
| `./deploy.sh reset localnet` | Restart validator with clean state |

### Txtx Runbooks

| Runbook | Description |
|---------|-------------|
| `txtx run compliance-initialization --env <env>` | Initialize compliance aggregator state |
| `txtx run identity-initialization --env <env>` | Initialize identity registry state |
| `txtx run token-initialization --env <env>` | Initialize token state with metadata |

## Configuration

### Environment Setup

Program IDs are configured in `txtx.yml` under `environments.<network>`:

```yaml
environments:
  localnet:
    compliance_aggregator_program_id: "7cURjJvyf3oe6JsuVxS9EiVHKNauiFj7Gao3THzZSnpb"
    identity_registry_program_id: "5SeHm9i7CcgHqF9UBYBtGbzqf3F3FWFETQF8AxfU2Rce"
    solana_rwa_program_id: "2XuB3ngjvJkMTxB82eM9NszBUGNovjuJUs4mzdez7EEX"
```

### Keypairs

Keypairs are stored in the `keys/` directory:
- `keys/compliance_aggregator.json`
- `keys/identity_registry.json`
- `keys/solana_rwa.json`

Generate new keypairs:
```bash
solana-keygen new --no-passphrase --outfile keys/compliance_aggregator.json
```

## Verification

Verify deployment consistency:
```bash
./deploy.sh verify localnet
```

This checks:
- Program IDs in Anchor.toml match keypairs
- Program IDs in IDL files match Anchor.toml
- All programs are built and deployed

## Project Structure

```
solana-rwa/
├── programs/
│   ├── compliance-aggregator/
│   ├── identity-registry/
│   └── solana-rwa/
├── runbooks/
│   ├── compliance-initialization/
│   ├── identity-initialization/
│   └── token-initialization/
├── keys/
│   ├── compliance_aggregator.json
│   ├── identity_registry.json
│   └── solana_rwa.json
├── deploy.sh
├── txtx.yml
└── Anchor.toml
```

## Troubleshooting

### "account already in use" error

The PDA already exists. Reset the validator:
```bash
./deploy.sh reset localnet
./deploy.sh deploy localnet
txtx run compliance-initialization --env localnet
```

### Program ID mismatch

Ensure Anchor.toml [programs.localnet] matches the keypair public keys:
```bash
solana-keygen pubkey keys/compliance_aggregator.json
```

### Validator not running

Start surfpool:
```bash
surfpool start --ci --daemon
```

## Documentation

- [Deployment System](docs/DEPLOYMENT_SYSTEM.md)
- [Surfpool Deployment](docs/SURFPOL_DEPLOYMENT_SYSTEM.md)
- [Deployment Errors](docs/DEPLOYMENT_ERRORS.md)
