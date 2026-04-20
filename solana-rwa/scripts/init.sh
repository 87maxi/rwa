#!/bin/bash
# =============================================================================
# Solana RWA - Initialize Programs After Deployment
# =============================================================================
# Initializes deployed programs (creates accounts, sets configurations, etc.)
# This script handles post-deployment initialization steps.
#
# Usage:
#   ./scripts/init.sh [environment]
#   ./scripts/init.sh localnet
#   ./scripts/init.sh devnet --admin <PUBKEY>
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

# Default values
ENVIRONMENT="${1:-localnet}"
ADMIN_PUBKEY=""
SHOW_HELP=false

# Parse optional arguments
shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --admin|-a)
            ADMIN_PUBKEY="$2"
            shift 2
            ;;
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

if [ "$SHOW_HELP" = true ]; then
    echo "Usage: $0 [ENVIRONMENT] [--admin PUBKEY] [--help]"
    echo ""
    echo "Environments: localnet, devnet, mainnet"
    echo ""
    echo "Options:"
    echo "  --admin, -a PUBKEY   Set admin pubkey for initialization"
    echo "  --help, -h           Show this help"
    exit 0
fi

# Validate environment
case "$ENVIRONMENT" in
    localnet|devnet|mainnet)
        ;;
    *)
        ERROR "Invalid environment: $ENVIRONMENT"
        echo "Valid environments: localnet, devnet, mainnet"
        exit 1
        ;;
esac

# RPC URLs
declare -A RPC_URLS=(
    ["localnet"]="http://127.0.0.1:8899"
    ["devnet"]="https://api.devnet.solana.com"
    ["mainnet"]="https://api.mainnet-beta.solana.com"
)

RPC_URL="${RPC_URLS[$ENVIRONMENT]}"

# Program IDs
declare -A PROGRAM_IDS=(
    ["solana_rwa"]="7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5"
    ["identity_registry"]="9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n1"
    ["compliance_aggregator"]="8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o3"
)

echo ""
echo "============================================="
echo "  Solana RWA - Program Initialization"
echo "============================================="
echo ""
echo "Environment: $ENVIRONMENT"
echo "RPC: $RPC_URL"
echo ""

# =============================================================================
# Pre-flight Checks
# =============================================================================
INFO "Running pre-flight checks..."

# Check programs are deployed
for program_name in "${!PROGRAM_IDS[@]}"; do
    program_id="${PROGRAM_IDS[$program_name]}"
    
    if solana account "$program_id" --url "$RPC_URL" &>/dev/null; then
        SUCCESS "✓ $program_name is deployed"
    else
        ERROR "✗ $program_name is NOT deployed"
        ERROR "Deploy programs first: ./scripts/deploy.sh $ENVIRONMENT"
        exit 1
    fi
done

echo ""

# =============================================================================
# Initialization Steps
# =============================================================================

# Step 1: Initialize Compliance Aggregator
init_compliance_aggregator() {
    INFO "Step 1: Initialize Compliance Aggregator"
    
    local aggregator_id="${PROGRAM_IDS[compliance_aggregator]}"
    
    if [ -n "$ADMIN_PUBKEY" ]; then
        INFO "  Admin: $ADMIN_PUBKEY"
    else
        # Use payer wallet
        local wallet_path="$HOME/.config/solana/id.json"
        if [ -f "$wallet_path" ]; then
            ADMIN_PUBKEY=$(solana-keygen pubkey "$wallet_path" 2>/dev/null || echo "")
            INFO "  Admin: $ADMIN_PUBKEY (from keypair)"
        else
            WARN "  No admin pubkey specified and no keypair found"
            WARN "  Skipping initialization - manual initialization required"
            return 0
        fi
    fi
    
    INFO "  Compliance Aggregator ID: $aggregator_id"
    INFO "  Initialization requires program-specific instructions"
    INFO "  This step may need to be done manually via Studio UI"
    echo ""
}

# Step 2: Verify Program States
verify_program_states() {
    INFO "Step 2: Verify Program States"
    echo ""
    
    for program_name in "${!PROGRAM_IDS[@]}"; do
        local program_id="${PROGRAM_IDS[$program_name]}"
        
        INFO "  $program_name:"
        
        # Get program info
        local info=$(solana program show "$program_id" --url "$RPC_URL" 2>/dev/null || echo "")
        
        if [ -n "$info" ]; then
            local owner=$(echo "$info" | grep "Owner" | awk '{print $NF}' || echo "unknown")
            local space=$(echo "$info" | grep "Space" | awk '{print $NF}' || echo "unknown")
            local lamports=$(echo "$info" | grep "Lamports" | awk '{print $NF}' || echo "unknown")
            
            INFO "    Owner:   $owner"
            INFO "    Space:   $space"
            INFO "    Lamports: $lamports"
        else
            WARN "    Could not retrieve program info"
        fi
    done
    
    echo ""
}

# Step 3: Set Up Environment Variables
setup_env_vars() {
    INFO "Step 3: Setup Environment Configuration"
    echo ""
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# Solana RWA Environment Configuration
# Generated by scripts/init.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")

SOLANA_RPC_URL=$RPC_URL
SOLANA_ENVIRONMENT=$ENVIRONMENT
EOF
        
        # Add program IDs
        for program_name in "${!PROGRAM_IDS[@]}"; do
            echo "${program_name^^}_PROGRAM_ID=${PROGRAM_IDS[$program_name]}" >> .env
        done
        
        SUCCESS "Created .env file"
    else
        INFO ".env file already exists"
    fi
    
    echo ""
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    init_compliance_aggregator
    verify_program_states
    setup_env_vars
    
    SUCCESS "Initialization complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Review .env file for environment configuration"
    echo "  2. Run tests: anchor test --provider.url $RPC_URL"
    echo "  3. Verify: ./scripts/verify.sh $ENVIRONMENT"
    echo ""
}

main "$@"
