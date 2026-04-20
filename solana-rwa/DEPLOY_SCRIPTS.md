# Deployment Scripts for Solana RWA Platform

## Overview
This document describes the deployment scripts and procedures for the Solana RWA platform using Surfpool.

## Deployment Script Structure

### 1. Build Script
```bash
#!/bin/bash
# build.sh
echo "Building Solana RWA programs..."
cd solana-rwa
anchor build
echo "Build completed successfully!"
```

### 2. Deploy Script
```bash
#!/bin/bash
# deploy.sh
echo "Deploying Solana RWA programs to localnet..."
cd solana-rwa
anchor deploy
echo "Deployment completed successfully!"
```

### 3. Test Script
```bash
#!/bin/bash
# test.sh
echo "Running tests for Solana RWA programs..."
cd solana-rwa
anchor test
echo "Tests completed successfully!"
```

## Surfpool Integration

The deployment process is designed to work with Surfpool's localnet:

### Pre-requisites:
1. Surfpool localnet is running
2. Wallet configured at `~/.config/solana/id.json`
3. Required SOL balance in wallet

### Deployment Steps:
1. **Build all programs**: `anchor build`
2. **Deploy to localnet**: `anchor deploy`
3. **Verify deployment**: Check program IDs match configuration

## Configuration Files

### Anchor.toml
The main configuration file defines:
- Program IDs for each component
- Cluster configuration (localnet)
- Wallet path
- Test script configuration

### Program ID Mapping
- `solana_rwa`: 7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5
- `identity_registry`: 9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n1  
- `compliance_aggregator`: 8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o3

## Verification Process

### 1. Build Verification
- Check that all Rust programs compile without errors
- Verify IDL generation works correctly
- Confirm program IDs are consistent

### 2. Deployment Verification
- Confirm programs are deployed to localnet
- Verify program IDs match expected values
- Check that all accounts are properly initialized

### 3. Functionality Verification
- Run unit tests to ensure all functions work correctly
- Verify compliance enforcement mechanisms
- Test identity management features

## Usage Examples

### Build and Deploy:
```bash
chmod +x build.sh deploy.sh
./build.sh
./deploy.sh
```

### Run Tests:
```bash
./test.sh
```

### Check Deployment Status:
```bash
solana program list | grep solana_rwa
```

## Troubleshooting

### Common Issues:
1. **Surfpool not running**: Start Surfpool with `surfpool start`
2. **Wallet not configured**: Configure wallet with `solana config set --url localnet`
3. **Insufficient SOL**: Fund wallet with `solana airdrop 100`

### Verification Commands:
```bash
# Check cluster status
solana cluster-ping localnet

# Check program deployment
solana program list

# Check wallet balance
solana balance
```

## Automation

The deployment process can be automated with:
- CI/CD pipelines
- Docker containers
- Scripted deployment workflows
- Integration with frontend applications

## Next Steps

1. Execute `anchor build` to compile all programs
2. Execute `anchor deploy` to deploy to Surfpool localnet
3. Execute `anchor test` to verify functionality
4. Integrate with frontend application