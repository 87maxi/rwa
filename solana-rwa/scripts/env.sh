#!/bin/bash
# =============================================================================
# Solana RWA - Environment Switching Helper
# =============================================================================
# Manages Solana CLI configuration for different environments.
# Switches RPC URL and wallet configuration.
#
# Usage:
#   ./scripts/env.sh list         # List all environments
#   ./scripts/env.sh localnet     # Switch to localnet
#   ./scripts/env.sh devnet       # Switch to devnet
#   ./scripts/env.sh mainnet      # Switch to mainnet
#   ./scripts/env.sh current      # Show current environment
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

# Environment configuration
declare -A ENV_RPC_URLS=(
    ["localnet"]="http://127.0.0.1:8899"
    ["devnet"]="https://api.devnet.solana.com"
    ["mainnet"]="https://api.mainnet-beta.solana.com"
)

declare -A ENV_DESCRIPTIONS=(
    ["localnet"]="Local Surfnet (development)"
    ["devnet"]="Solana Devnet (testing)"
    ["mainnet"]="Solana Mainnet (production)"
)

# Current environment file
ENV_FILE=".solana-env"

# Check if solana CLI is available
if ! command -v solana &> /dev/null; then
    ERROR "solana CLI is not installed."
    echo "Install from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Get current environment
get_current_env() {
    if [ -f "$ENV_FILE" ]; then
        cat "$ENV_FILE"
    else
        echo "not set"
    fi
}

# List environments
list_envs() {
    echo ""
    echo "============================================="
    echo "  Solana Environments"
    echo "============================================="
    echo ""
    
    local current=$(get_current_env)
    
    for env in localnet devnet mainnet; do
        local rpc="${ENV_RPC_URLS[$env]}"
        local desc="${ENV_DESCRIPTIONS[$env]}"
        
        if [ "$env" = "$current" ]; then
            echo -e "  ${GREEN}★${GREEN} $env (current)"
        else
            echo -e "  ○ $env"
        fi
        INFO "    Description: $desc"
        INFO "    RPC:         $rpc"
        echo ""
    done
}

# Switch environment
switch_env() {
    local env="${1:-}"
    
    if [ -z "$env" ]; then
        ERROR "No environment specified"
        echo "Available environments: localnet, devnet, mainnet"
        exit 1
    fi
    
    # Validate environment
    if [ -z "${ENV_RPC_URLS[$env]+x}" ]; then
        ERROR "Unknown environment: $env"
        echo "Available environments: localnet, devnet, mainnet"
        exit 1
    fi
    
    local rpc="${ENV_RPC_URLS[$env]}"
    local desc="${ENV_DESCRIPTIONS[$env]}"
    
    # Save current environment
    echo "$env" > "$ENV_FILE"
    
    # Update Solana CLI config
    solana config set --url "$rpc" 2>/dev/null
    
    SUCCESS "Switched to $env"
    echo ""
    echo "  Environment: $env"
    echo "  Description: $desc"
    echo "  RPC:         $rpc"
    echo ""
    echo "  To deploy using Surfpool:"
    echo "    ./scripts/deploy.sh $env"
    echo ""
}

# Show current environment
show_current() {
    local current=$(get_current_env)
    
    echo ""
    echo "============================================="
    echo "  Current Environment"
    echo "============================================="
    echo ""
    
    if [ "$current" = "not set" ]; then
        WARN "No environment configured"
        echo "Use: ./scripts/env.sh <environment>"
    else
        local rpc="${ENV_RPC_URLS[$current]}"
        local desc="${ENV_DESCRIPTIONS[$current]}"
        
        echo -e "  ${GREEN}★${NC} $current"
        INFO "  Description: $desc"
        INFO "  RPC:         $rpc"
        echo ""
        
        # Show wallet
        local wallet=$(solana config get --keypair 2>/dev/null | grep "Config File" | awk '{print $NF}' || echo "~/.config/solana/id.json")
        INFO "  Wallet:      $wallet"
        
        # Show pubkey
        if [ -f "$wallet" ]; then
            local pubkey=$(solana-keygen pubkey "$wallet" 2>/dev/null || echo "unknown")
            INFO "  Pubkey:      $pubkey"
        fi
    fi
    
    echo ""
}

# Show help
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  list            List all environments"
    echo "  localnet        Switch to localnet"
    echo "  devnet          Switch to devnet"
    echo "  mainnet         Switch to mainnet"
    echo "  current         Show current environment"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 localnet"
    echo "  $0 current"
}

# Main execution
COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
    list)
        list_envs
        ;;
    localnet|devnet|mainnet)
        switch_env "$COMMAND"
        ;;
    current)
        show_current
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
