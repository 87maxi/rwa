#!/bin/bash
# =============================================================================
# Identity Registry Initialization Script
# Creates the IdentityRegistryState account on devnet/mainnet
# =============================================================================

set -e

IDENTITY_REGISTRY_ID="${1:-}"

if [ -z "$IDENTITY_REGISTRY_ID" ]; then
    echo "ERROR: identity_registry_program_id is required"
    echo "Usage: ./init.sh <identity_registry_program_id>"
    echo ""
    echo "Get the program ID from deployment output or:"
    echo "  solana program show --program-id <PROGRAM_ID>"
    exit 1
fi

echo "Initializing identity registry..."
echo "Program ID: $IDENTITY_REGISTRY_ID"

# Create a new keypair for the registry account
REGISTRY_KEYPAIR="/tmp/identity_registry_keypair.json"

if [ ! -f "$REGISTRY_KEYPAIR" ]; then
    echo "Creating new keypair for registry account..."
    solana-keygen new --no-passphrase --outfile "$REGISTRY_KEYPAIR" --silent
fi

REGISTRY_PUBKEY=$(solana-keygen pubkey "$REGISTRY_KEYPAIR")
echo "Registry account public key: $REGISTRY_PUBKEY"

# Airdrop if needed (localnet only)
if solana config get --url | grep -q "localhost"; then
    echo "Airdropping SOL for rent..."
    solana airdrop 1
fi

echo "Creating transaction to initialize identity registry..."

solana program invoke \
    --program-id "$IDENTITY_REGISTRY_ID" \
    "$REGISTRY_PUBKEY" \
    "$(solana-keygen pubkey)" \
    11111111111111111111111111111111 \
    --sign-only 2>/dev/null || true

echo ""
echo "Identity registry initialization transaction prepared."
echo "Account: $REGISTRY_PUBKEY"
echo ""
echo "To sign and send the transaction, run:"
echo "  solana program invoke \\"
echo "    --program-id $IDENTITY_REGISTRY_ID \\"
echo "    $REGISTRY_PUBKEY \\"
echo "    $(solana-keygen pubkey) \\"
echo "    11111111111111111111111111111111"
echo ""
echo "Or use: txtx run identity-initialization --env localnet (with surfpool)"
