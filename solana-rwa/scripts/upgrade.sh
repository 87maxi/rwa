#!/bin/bash
# =============================================================================
# Solana RWA - Upgrade Deployed Programs
# =============================================================================
# Upgrades deployed programs using Surfpool txtx runbooks.
# IMPORTANT: Program upgrades require the program to be initialized with
# an upgrade authority. This script assumes programs are deployable.
#
# Usage:
#   ./scripts/upgrade.sh <program_name> [environment]
#   ./scripts/upgrade.sh solana_rwa localnet
#   ./scripts/upgrade.sh all devnet
#   ./scripts/upgrade.sh --all mainnet
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

# Available programs
AVAILABLE_PROGRAMS=("solana_rwa" "identity_registry" "compliance_aggregator")

# Parse arguments
PROGRAM="${1:-all}"
ENVIRONMENT="${2:-localnet}"
FORCE_FLAG=""
DRY_RUN=false

case "$PROGRAM" in
    --all|-a)
        PROGRAM="all"
        shift
        ENVIRONMENT="${1:-localnet}"
        ;;
    --dry-run|-d)
        DRY_RUN=true
        PROGRAM="${2:-all}"
        ENVIRONMENT="${3:-localnet}"
        ;;
    --help|-h)
        echo "Usage: $0 [PROGRAM] [ENVIRONMENT] [OPTIONS]"
        echo ""
        echo "Programs:"
        echo "  solana_rwa              Main token program"
        echo "  identity_registry       Identity management program"
        echo "  compliance_aggregator   Compliance enforcement program"
        echo "  all                     Upgrade all programs (default)"
        echo ""
        echo "Environments:"
        echo "  localnet   Deploy to local Surfnet"
        echo "  devnet     Deploy to Solana devnet"
        echo "  mainnet    Deploy to Solana mainnet"
        echo ""
        echo "Options:"
        echo "  --all, -a        Upgrade all programs"
        echo "  --dry-run, -d    Show what would be upgraded"
        echo "  --force, -f      Force upgrade"
        echo "  --help, -h       Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 solana_rwa localnet"
        echo "  $0 all devnet"
        echo "  $0 --all mainnet"
        exit 0
        ;;
    -f|--force)
        FORCE_FLAG="--force"
        shift
        PROGRAM="${1:-all}"
        ENVIRONMENT="${2:-localnet}"
        ;;
esac

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

# Check prerequisites
if ! command -v surfpool &> /dev/null; then
    ERROR "surfpool CLI is not installed."
    echo "Install with: curl -sL https://run.surfpool.run/ | bash"
    exit 1
fi

# Determine which programs to upgrade
get_programs_to_upgrade() {
    if [ "$PROGRAM" = "all" ]; then
        echo "${AVAILABLE_PROGRAMS[@]}"
    else
        # Validate program name
        local found=false
        for p in "${AVAILABLE_PROGRAMS[@]}"; do
            if [ "$p" = "$PROGRAM" ]; then
                found=true
                echo "$PROGRAM"
                break
            fi
        done
        if [ "$found" = false ]; then
            ERROR "Unknown program: $PROGRAM"
            echo "Available programs: ${AVAILABLE_PROGRAMS[*]}"
            exit 1
        fi
    fi
}

# Show upgrade plan
show_plan() {
    local programs_to_upgrade=("$@")
    
    echo ""
    echo "============================================="
    echo "  Upgrade Plan"
    echo "============================================="
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Programs to upgrade:"
    
    for program in "${programs_to_upgrade[@]}"; do
        so_file="target/deploy/${program}.so"
        if [ -f "$so_file" ]; then
            local size=$(stat -f%z "$so_file" 2>/dev/null || stat -c%s "$so_file" 2>/dev/null || echo "unknown")
            echo "  - $program ($size bytes)"
        else
            WARN "  - $program (binary not found at $so_file)"
        fi
    done
    echo ""
}

# Perform upgrade
upgrade_program() {
    local program=$1
    
    INFO "Upgrading $program on $ENVIRONMENT..."
    
    # Check if binary exists
    local so_file="target/deploy/${program}.so"
    if [ ! -f "$so_file" ]; then
        WARN "Binary not found: $so_file"
        INFO "Building $program..."
        
        if command -v anchor &> /dev/null; then
            (cd "$PROJECT_DIR" && anchor build --programs-local "$program" 2>/dev/null || true)
        else
            ERROR "Cannot build $program. Install Anchor CLI or build manually."
            return 1
        fi
        
        if [ ! -f "$so_file" ]; then
            ERROR "Build failed for $program"
            return 1
        fi
    fi
    
    if [ "$DRY_RUN" = true ]; then
        INFO "  [DRY RUN] Would upgrade $program"
        return 0
    fi
    
    # For upgrade, we need to re-run the deployment
    # This will use the updated binary
    local cmd="surfpool run deployment \
        --env $ENVIRONMENT \
        --manifest-file-path ./txtx.yml"
    
    [ -n "$FORCE_FLAG" ] && cmd="$cmd $FORCE_FLAG"
    cmd="$cmd -u"
    
    INFO "  Running: $cmd"
    eval $cmd
    
    return $?
}

# Main execution
main() {
    echo ""
    echo "============================================="
    echo "  Solana RWA - Program Upgrade"
    echo "============================================="
    echo ""
    
    local programs_to_upgrade=($(get_programs_to_upgrade))
    
    if [ ${#programs_to_upgrade[@]} -eq 0 ]; then
        ERROR "No programs to upgrade"
        exit 1
    fi
    
    # Show plan if dry run
    if [ "$DRY_RUN" = true ]; then
        show_plan "${programs_to_upgrade[@]}"
        exit 0
    fi
    
    # Build first
    INFO "Building programs..."
    if [ -f "scripts/build.sh" ]; then
        ./scripts/build.sh || {
            ERROR "Build failed. Cannot upgrade."
            exit 1
        }
    elif command -v anchor &> /dev/null; then
        anchor build || {
            ERROR "Anchor build failed. Cannot upgrade."
            exit 1
        }
    fi
    
    # Check Surfnet for localnet
    if [ "$ENVIRONMENT" = "localnet" ]; then
        if ! curl -s -X POST -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","id":1,"method":"health"}' \
            http://127.0.0.1:8899 > /dev/null 2>&1; then
            ERROR "Surfnet localnet is not running."
            echo "Start it with: surfpool start"
            exit 1
        fi
    fi
    
    # Upgrade each program
    local success_count=0
    local fail_count=0
    
    for program in "${programs_to_upgrade[@]}"; do
        echo ""
        if upgrade_program "$program"; then
            SUCCESS "✓ $program upgraded successfully"
            success_count=$((success_count + 1))
        else
            ERROR "✗ $program upgrade failed"
            fail_count=$((fail_count + 1))
        fi
    done
    
    echo ""
    echo "============================================="
    echo "  Upgrade Summary"
    echo "============================================="
    echo ""
    echo "  Success: $success_count"
    echo "  Failed:  $fail_count"
    echo ""
    
    if [ $fail_count -gt 0 ]; then
        ERROR "Some upgrades failed"
        exit 1
    fi
    
    SUCCESS "All upgrades completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Verify: ./scripts/verify.sh $ENVIRONMENT"
    echo "  2. Test: anchor test --provider.url <rpc_url>"
    echo ""
}

main "$@"
