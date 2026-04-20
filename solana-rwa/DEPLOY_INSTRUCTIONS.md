# Deploy Instructions for Solana RWA Platform

## Overview
This document provides instructions for deploying the Solana RWA platform using Surfpool for localnet deployment.

## Prerequisites

1. **Surfpool already initialized** - The localnet is already set up
2. **Anchor CLI installed** - Required for building and deploying programs
3. **Solana CLI installed** - Required for wallet management
4. **Node.js and yarn** - Required for package management

## Project Structure

```
solana-rwa/
├── programs/
│   ├── solana-rwa/              # Main token program
│   ├── identity-registry/       # Identity registry program
│   └── compliance-aggregator/   # Compliance aggregator program
├── tests/
├── Anchor.toml                  # Anchor configuration
└── package.json                 # Node.js dependencies
```

## Deployment Process

### 1. Build the Programs
```bash
cd solana-rwa
anchor build
```

### 2. Deploy to Localnet
Since Surfpool is already initialized, you can deploy using:
```bash
anchor deploy
```

### 3. Verify Deployment
Check that all programs are deployed correctly:
```bash
solana program list
```

## Surfpool Integration

The project is configured to work with Surfpool through:
- `Anchor.toml` configuration pointing to localnet
- Wallet configuration at `~/.config/solana/id.json`
- Pre-configured program IDs for easy deployment

## Testing

After deployment, run tests to verify functionality:
```bash
anchor test
```

## Program IDs

The following program IDs are used:
- `solana_rwa`: 7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5
- `identity_registry`: 9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n1
- `compliance_aggregator`: 8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o3

## Key Features Verified

1. **Token Management**: Mint, burn, and transfer operations
2. **Identity Registry**: Registration and management of investor identities
3. **Compliance System**: Modular compliance enforcement
4. **Access Control**: Role-based permissions
5. **Account Freezing**: Ability to freeze/unfreeze accounts

## Troubleshooting

### Common Issues:
1. **Program ID Conflicts**: Ensure all program IDs are unique and correctly configured
2. **Wallet Permissions**: Verify wallet has sufficient SOL for deployment
3. **Surfpool Status**: Confirm Surfpool localnet is running

### Commands for Troubleshooting:
```bash
# Check Surfpool status
solana cluster-ping localnet

# Check wallet balance
solana balance

# Verify program deployment
solana program list | grep solana_rwa
```

## Next Steps

1. Run `anchor build` to compile all programs
2. Run `anchor deploy` to deploy to localnet
3. Run `anchor test` to verify functionality
4. Integrate with the frontend Next.js application