#!/bin/bash
# =============================================================================
# Solana RWA - Check Deployment Status
# =============================================================================
# Shows comprehensive status of all deployed programs and system health.
#
# Usage:
#   ./scripts/status.sh [environment]
#   ./scripts/status.sh localnet
#   ./scripts/status.sh devnet
#   ./scripts/status.sh --all  # Check all environments
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
CYAN='\033[0;36m'
NC='\033[0m'

INFO()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
SUCCESS() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
WARN()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
ERROR() { echo -e "${RED}[ERROR]${NC} $1"; }
SECTION() { echo -e "${CYAN}════════════════════════════════════════${NC}"; }

# Program IDs
declare -A PROGRAM_IDS=(
    ["solana_rwa"]="7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5"
    ["identity_registry"]="9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n1"
    ["compliance_aggregator"]="8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o3"
)

# RPC URLs
declare -A RPC_URLS=(
    ["localnet"]="http://127.0.0.1:8899"
    ["devnet"]="https://api.devnet.solana.com"
    ["mainnet"]="https://api.mainnet-beta.solana.com"
)

# Parse arguments
ENVIRONMENT="${1:-localnet}"
CHECK_ALL=false

case "$ENVIRONMENT" in
    --all|-a)
        CHECK_ALL=true
        ;;
    --help|-h)
        echo "Usage: $0 [ENVIRONMENT] [OPTIONS]"
        echo ""
        echo "Environments: localnet, devnet, mainnet"
        echo ""
        echo "Options:"
        echo "  --all, -a    Check all environments"
        echo "  --help, -h   Show this help"
        exit 0
        ;;
esac

# Show status for a single environment
show_env_status() {
    local env=$1
    local rpc="${RPC_URLS[$env]}"
    
    echo ""
    SECTION
    echo "  Environment: $env"
    echo "  RPC: $rpc"
    SECTION
    echo ""
    
    # Check connectivity
    INFO "Connectivity:"
    if curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"health"}' \
        "$rpc" > /dev/null 2>&1; then
        SUCCESS "  ✓ Connected"
    else
        local slot=$(solana block-height --url "$rpc" 2>/dev/null || echo "unreachable")
        if [ "$slot" != "unreachable" ]; then
            SUCCESS "  ✓ Connected (slot: $slot)"
        else
            ERROR "  ✗ Not connected"
            return 1
        fi
    fi
    
    # Check programs
    echo ""
    INFO "Programs:"
    local all_deployed=true
    
    for program_name in "${!PROGRAM_IDS[@]}"; do
        local program_id="${PROGRAM_IDS[$program_name]}"
        
        if solana account "$program_id" --url "$rpc" &>/dev/null 2>&1; then
            # Get program details
            local info=$(solana program show "$program_id" --url "$rpc" 2>/dev/null || echo "")
            local last_deployed=$(echo "$info" | grep -i "last deployed" | awk '{print $NF}' || echo "N/A")
            local upgrade_authority=$(echo "$info" | grep "Upgrade authority" | awk '{print $NF}' || echo "N/A")
            
            echo -e "  ${GREEN}✓${NC} $program_name"
            INFO "    Last deployed: $last_deployed"
            [ "$upgrade_authority" != "N/A" ] && INFO "    Upgrade auth:  $upgrade_authority"
        else
            echo -e "  ${RED}✗${NC} $program_name - NOT DEPLOYED"
            all_deployed=false
        fi
    done
    
    # Check local binaries
    echo ""
    INFO "Local Binaries:"
    local all_built=true
    
    for program_name in "${!PROGRAM_IDS[@]}"; do
        local so_file="target/deploy/${program_name}.so"
        if [ -f "$so_file" ]; then
            local size=$(stat -f%z "$so_file" 2>/dev/null || stat -c%s "$so_file" 2>/dev/null || echo "?")
            local hash=$(sha256sum "$so_file" 2>/dev/null | cut -c1-16 || echo "unknown")
            echo -e "  ${GREEN}✓${NC} $program_name.so ($size bytes, $hash...)"
        else
            echo -e "  ${YELLOW}✗${NC} $program_name.so - NOT FOUND"
            all_built=false
        fi
    done
    
    # Check state management
    echo ""
    INFO "State Management:"
    if [ -d ".surfpool/state" ]; then
        local state_count=$(find ".surfpool/state" -name "*.json" 2>/dev/null | wc -l)
        if [ "$state_count" -gt 0 ]; then
            local last_modified=$(ls -lt ".surfpool/state"/*.json 2>/dev/null | head -1 | awk '{print $6 " " $7 " " $8}' || echo "unknown")
            SUCCESS "  $state_count state file(s), last: $last_modified"
        else
            WARN "  State directory exists but empty"
        fi
    else
        WARN "  No state directory (.surfpool/state/)"
    fi
    
    # Check IDLs
    echo ""
    INFO "IDL Files:"
    local idl_ok=true
    
    for program_name in "${!PROGRAM_IDS[@]}"; do
        local idl_file="target/idl/${program_name}.json"
        if [ -f "$idl_file" ]; then
            if jq . "$idl_file" > /dev/null 2>&1; then
                echo -e "  ${GREEN}✓${NC} $program_name.idl.json (valid)"
            else
                echo -e "  ${RED}✗${NC} $program_name.idl.json (invalid JSON)"
                idl_ok=false
            fi
        else
            echo -e "  ${YELLOW}-${NC} $program_name.idl.json (not generated)"
        fi
    done
    
    # Summary
    echo ""
    if [ "$all_deployed" = true ] && [ "$all_built" = true ]; then
        SUCCESS "Status: HEALTHY"
    elif [ "$all_deployed" = true ]; then
        WARN "Status: PARTIAL (some binaries missing)"
    else
        ERROR "Status: UNHEALTHY (some programs not deployed)"
    fi
    
    return 0
}

# Main execution
main() {
    echo ""
    echo "============================================="
    echo "  Solana RWA - Deployment Status"
    echo "============================================="
    
    if [ "$CHECK_ALL" = true ]; then
        for env in localnet devnet mainnet; do
            show_env_status "$env" || true
        done
        
        echo ""
        SECTION
        echo "  All environments checked"
        SECTION
    else
        show_env_status "$ENVIRONMENT"
    fi
    
    echo ""
}

main "$@"
