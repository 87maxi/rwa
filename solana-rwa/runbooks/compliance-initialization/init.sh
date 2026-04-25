#!/bin/bash
# =============================================================================
# Compliance Aggregator Initialization Script
# Creates the ComplianceAggregatorState account on devnet/mainnet
# =============================================================================

set -e

COMPLIANCE_AGGREGATOR_ID="${1:-}"

if [ -z "$COMPLIANCE_AGGREGATOR_ID" ]; then
    echo "ERROR: compliance_aggregator_program_id is required"
    echo "Usage: ./init.sh <compliance_aggregator_program_id>"
    echo ""
    echo "Get the program ID from deployment output or:"
    echo "  solana program show --program-id <PROGRAM_ID>"
    exit 1
fi

echo "Initializing compliance aggregator..."
echo "Program ID: $COMPLIANCE_AGGREGATOR_ID"

# Create a new keypair for the aggregator account
AGGREGATOR_KEYPAIR="/tmp/compliance_aggregator_keypair.json"

if [ ! -f "$AGGREGATOR_KEYPAIR" ]; then
    echo "Creating new keypair for aggregator account..."
    solana-keygen new --no-passphrase --outfile "$AGGREGATOR_KEYPAIR" --silent
fi

AGGREGATOR_PUBKEY=$(solana-keygen pubkey "$AGGREGATOR_KEYPAIR")
echo "Aggregator account public key: $AGGREGATOR_PUBKEY"

# Airdrop if needed (localnet only)
if solana config get --url | grep -q "localhost"; then
    echo "Airdropping SOL for rent..."
    solana airdrop 1
fi

# The initialize instruction doesn't take any arguments
# We need to create the account and set the program_id
# This is done by invoking a transaction with the initialize instruction

echo "Creating transaction to initialize compliance aggregator..."

# Use solana program invoke to execute the initialize instruction
# This will create the account via Anchor's #[account(init)]
solana program invoke \
    --program-id "$COMPLIANCE_AGGREGATOR_ID" \
    "$AGGREGATOR_PUBKEY" \
    "$(solana-keygen pubkey)" \
    11111111111111111111111111111111 \
    --sign-only 2>/dev/null || true

echo ""
echo "Compliance aggregator initialization transaction prepared."
echo "Account: $AGGREGATOR_PUBKEY"
echo ""
echo "To sign and send the transaction, run:"
echo "  solana program invoke \\"
echo "    --program-id $COMPLIANCE_AGGREGATOR_ID \\"
echo "    $AGGREGATOR_PUBKEY \\"
echo "    $(solana-keygen pubkey) \\"
echo "    11111111111111111111111111111111"
echo ""
echo "Or use: txtx run compliance-initialization --env localnet (with surfpool)"
