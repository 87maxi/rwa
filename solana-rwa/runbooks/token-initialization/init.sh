#!/bin/bash
# =============================================================================
# Token Initialization Script
# Creates the TokenState account on devnet/mainnet
# =============================================================================

set -e

SOLANA_RWA_ID="${1:-}"
TOKEN_NAME="${2:-My Token}"
TOKEN_SYMBOL="${3:-MTK}"
TOKEN_DECIMALS="${4:-9}"

if [ -z "$SOLANA_RWA_ID" ]; then
    echo "ERROR: solana_rwa_program_id is required"
    echo "Usage: ./init.sh <solana_rwa_program_id> [token_name] [token_symbol] [decimals]"
    echo ""
    echo "Example:"
    echo "  ./init.sh 7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L \"Real World Asset\" \"RWA\" 9"
    exit 1
fi

echo "Initializing token..."
echo "Program ID: $SOLANA_RWA_ID"
echo "Token Name: $TOKEN_NAME"
echo "Token Symbol: $TOKEN_SYMBOL"
echo "Token Decimals: $TOKEN_DECIMALS"

# Create a new keypair for the token account
TOKEN_KEYPAIR="/tmp/token_state_keypair.json"

if [ ! -f "$TOKEN_KEYPAIR" ]; then
    echo "Creating new keypair for token state account..."
    solana-keygen new --no-passphrase --outfile "$TOKEN_KEYPAIR" --silent
fi

TOKEN_PUBKEY=$(solana-keygen pubkey "$TOKEN_KEYPAIR")
echo "Token state account public key: $TOKEN_PUBKEY"

# Airdrop if needed (localnet only)
if solana config get --url | grep -q "localhost"; then
    echo "Airdropping SOL for rent..."
    solana airdrop 2
fi

echo ""
echo "Token initialization transaction prepared."
echo "Account: $TOKEN_PUBKEY"
echo ""
echo "NOTE: The solana program invoke command cannot easily pass string arguments."
echo "For token initialization with custom name/symbol/decimals, use:"
echo ""
echo "  txtx run token-initialization --env localnet -u"
echo "  (with surfpool running)"
echo ""
echo "Or use the web interface to initialize the token with custom parameters."
