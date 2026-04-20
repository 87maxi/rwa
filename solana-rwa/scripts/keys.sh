#!/bin/bash
# =============================================================================
# Solana RWA - Key Management
# =============================================================================
# Manages Solana keypairs for different environments.
# Creates, exports, and verifies keypairs.
#
# Usage:
#   ./scripts/keys.sh list          # List all keypairs
#   ./scripts/keys.sh create env    # Create new keypair for environment
#   ./scripts/keys.sh export env    # Export public key
#   ./scripts/keys.sh verify env    # Verify keypair matches public key
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INFO()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
SUCCESS() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
WARN()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
ERROR() { echo -e "${RED}[ERROR]${NC} $1"; }

# Default keypair location
DEFAULT_KEYPAIR="$HOME/.config/solana/id.json"

# Environment keypair paths
declare -A KEYPAIR_PATHS=(
    ["localnet"]="$HOME/.config/solana/id.json"
    ["devnet"]="$HOME/.config/solana/id.json"
    ["mainnet"]="$HOME/.config/solana/mainnet.json"
)

# Check if solana CLI is available
if ! command -v solana &> /dev/null; then
    ERROR "solana CLI is not installed."
    echo "Install from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# List keypairs
list_keys() {
    echo ""
    echo "============================================="
    echo "  Solana Keypairs"
    echo "============================================="
    echo ""
    
    for env in localnet devnet mainnet; do
        local path="${KEYPAIR_PATHS[$env]}"
        
        if [ -f "$path" ]; then
            local pubkey=$(solana-keygen pubkey "$path" 2>/dev/null || echo "unknown")
            local balance=$(solana balance "$pubkey" --url "https://api.$env.solana.com" 2>/dev/null || echo "N/A")
            
            echo -e "  ${GREEN}✓${NC} $env"
            INFO "    Path:    $path"
            INFO "    Pubkey:  $pubkey"
            INFO "    Balance: $balance SOL"
        else
            echo -e "  ${RED}✗${NC} $env - Keyfile not found at $path"
        fi
        echo ""
    done
}

# Create new keypair
create_key() {
    local env="${1:-devnet}"
    local path="${KEYPAIR_PATHS[$env]}"
    
    # Ensure directory exists
    mkdir -p "$(dirname "$path")"
    
    if [ -f "$path" ]; then
        WARN "Keypair already exists at $path"
        read -p "Overwrite? (y/N): " confirm
        [[ "$confirm" =~ ^[Yy]$ ]] || {
            INFO "Aborted"
            exit 0
        }
    fi
    
    INFO "Creating new keypair for $env..."
    solana-keygen new --outfile "$path" --no-passphrase
    
    local pubkey=$(solana-keygen pubkey "$path" 2>/dev/null)
    SUCCESS "Keypair created:"
    echo ""
    echo "  Environment: $env"
    echo "  Path:        $path"
    echo "  Public Key:  $pubkey"
    echo ""
    WARN "Save your public key! You'll need it to receive SOL."
    WARN "Keep your private key secure - never share it!"
}

# Export public key
export_key() {
    local env="${1:-localnet}"
    local path="${KEYPAIR_PATHS[$env]}"
    
    if [ ! -f "$path" ]; then
        ERROR "Keypair not found at $path"
        exit 1
    fi
    
    local pubkey=$(solana-keygen pubkey "$path" 2>/dev/null)
    echo "$pubkey"
}

# Verify keypair
verify_key() {
    local env="${1:-localnet}"
    local path="${KEYPAIR_PATHS[$env]}"
    
    if [ ! -f "$path" ]; then
        ERROR "Keypair not found at $path"
        exit 1
    fi
    
    INFO "Verifying keypair for $env..."
    
    # Try to derive public key
    local pubkey=$(solana-keygen pubkey "$path" 2>/dev/null)
    if [ -n "$pubkey" ]; then
        SUCCESS "Keypair is valid"
        INFO "  Public Key: $pubkey"
        
        # Check balance
        local balance=$(solana balance "$pubkey" 2>/dev/null || echo "0")
        INFO "  Balance: $balance SOL (localnet)"
    else
        ERROR "Keypair is invalid or corrupted"
        exit 1
    fi
}

# Show help
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  list              List all keypairs and their public keys"
    echo "  create [env]      Create a new keypair (env: localnet, devnet, mainnet)"
    echo "  export [env]      Export public key for environment"
    echo "  verify [env]      Verify keypair validity"
    echo "  help              Show this help message"
    echo ""
    echo "Environments:"
    echo "  localnet  $HOME/.config/solana/id.json"
    echo "  devnet    $HOME/.config/solana/id.json"
    echo "  mainnet   $HOME/.config/solana/mainnet.json"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 create devnet"
    echo "  $0 export mainnet"
    echo "  $0 verify localnet"
}

# Main execution
COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
    list)
        list_keys
        ;;
    create)
        create_key "$1"
        ;;
    export)
        export_key "$1"
        ;;
    verify)
        verify_key "$1"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        ERROR "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
