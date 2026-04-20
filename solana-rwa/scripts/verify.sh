#!/bin/bash
# =============================================================================
# Solana RWA - Verify Deployment Consistency
# =============================================================================
# Verifies that deployed programs match expected program IDs and binaries.
#
# Usage:
#   ./scripts/verify.sh [environment]
#   ./scripts/verify.sh localnet
#   ./scripts/verify.sh devnet
#   ./scripts/verify.sh mainnet
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

# Expected program IDs (from Anchor.toml / configuration)
declare -A PROGRAM_IDS=(
    ["solana_rwa"]="7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5"
    ["identity_registry"]="9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n1"
    ["compliance_aggregator"]="8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o3"
)

# RPC URLs per environment
declare -A RPC_URLS=(
    ["localnet"]="http://127.0.0.1:8899"
    ["devnet"]="https://api.devnet.solana.com"
    ["mainnet"]="https://api.mainnet-beta.solana.com"
)

# Check arguments
ENVIRONMENT="${1:-localnet}"

case "$ENVIRONMENT" in
    localnet|devnet|mainnet)
        ;;
    --help|-h)
        echo "Usage: $0 [ENVIRONMENT]"
        echo ""
        echo "Environments: localnet, devnet, mainnet"
        echo "Default: localnet"
        exit 0
        ;;
    *)
        ERROR "Invalid environment: $ENVIRONMENT"
        echo "Valid environments: localnet, devnet, mainnet"
        exit 1
        ;;
esac

RPC_URL="${RPC_URLS[$ENVIRONMENT]}"
ERRORS=0
WARNINGS=0

echo ""
echo "============================================="
echo "  Deployment Verification - $ENVIRONMENT"
echo "============================================="
echo ""
echo "RPC: $RPC_URL"
echo ""

# =============================================================================
# Check 1: Connectivity
# =============================================================================
INFO "Check 1: Connectivity to $ENVIRONMENT"

if ! curl -s -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"health"}' \
    "$RPC_URL" > /dev/null 2>&1; then
    # Try solana ping as fallback
    if solana ping --url "$RPC_URL" &>/dev/null; then
        SUCCESS "Connected to $ENVIRONMENT"
    else
        ERROR "Cannot connect to $RPC_URL"
        ERROR "Is the node running?"
        exit 1
    fi
else
    SUCCESS "Connected to $ENVIRONMENT"
fi

echo ""

# =============================================================================
# Check 2: Program Deployment Status
# =============================================================================
INFO "Check 2: Program Deployment Status"
echo ""

# Get deployed programs
DEPLOYED_PROGRAMS=$(solana program list --url "$RPC_URL" 2>/dev/null || echo "")

for program_name in "${!PROGRAM_IDS[@]}"; do
    expected_id="${PROGRAM_IDS[$program_name]}"
    
    # Check if program is deployed
    if echo "$DEPLOYED_PROGRAMS" | grep -q "$expected_id"; then
        # Get actual program info
        program_info=$(solana program show "$expected_id" --url "$RPC_URL" 2>/dev/null || echo "")
        
        # Extract last deployed slot
        last_slot=$(echo "$program_info" | grep -i "last deployed" | awk '{print $NF}' || echo "unknown")
        
        SUCCESS "✓ $program_name"
        INFO "  ID:      $expected_id"
        INFO "  Last:    $last_slot"
    else
        ERROR "✗ $program_name - NOT DEPLOYED (expected: $expected_id)"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# =============================================================================
# Check 3: Binary Hash Verification (localnet only)
# =============================================================================
if [ "$ENVIRONMENT" = "localnet" ]; then
    INFO "Check 3: Binary Hash Verification"
    echo ""
    
    for program_name in "${!PROGRAM_IDS[@]}"; do
        so_file="target/deploy/${program_name}.so"
        
        if [ -f "$so_file" ]; then
            local_hash=$(sha256sum "$so_file" | awk '{print $1}')
            INFO "  $program_name: $local_hash"
            
            # Note: On localnet with Surfpool, we can't directly compare
            # the on-chain hash without extracting program data
            # This is a local verification only
        else
            WARN "  $program_name: Binary not found at $so_file"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
    
    echo ""
fi

# =============================================================================
# Check 4: IDL Consistency
# =============================================================================
INFO "Check 4: IDL Consistency"
echo ""

idl_errors=0
for program_name in "${!PROGRAM_IDS[@]}"; do
    idl_file="target/idl/${program_name}.json"
    
    if [ -f "$idl_file" ]; then
        # Check if IDL is valid JSON
        if python3 -c "import json; json.load(open('$idl_file'))" 2>/dev/null || \
           jq . "$idl_file" > /dev/null 2>&1; then
            SUCCESS "  ✓ $program_name.idl.json (valid)"
        else
            ERROR "  ✗ $program_name.idl.json (invalid JSON)"
            idl_errors=$((idl_errors + 1))
        fi
    else
        WARN "  - $program_name.idl.json (not generated)"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo ""

# =============================================================================
# Check 5: State Management
# =============================================================================
INFO "Check 5: State Management"
echo ""

state_dir=".surfpool/state"
if [ -d "$state_dir" ]; then
    state_files=$(find "$state_dir" -name "*.json" 2>/dev/null | wc -l)
    if [ "$state_files" -gt 0 ]; then
        SUCCESS "  State directory exists with $state_files state file(s)"
        INFO "  Last state update:"
        ls -lt "$state_dir"/*.json 2>/dev/null | head -1 | awk '{print "    " $6 " " $7 " " $8 " " $9}'
    else
        WARN "  State directory exists but no state files found"
    fi
else
    WARN "  State directory not found at $state_dir"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# =============================================================================
# Check 6: Anchor.toml Consistency
# =============================================================================
INFO "Check 6: Anchor.toml Consistency"
echo ""

if [ -f "Anchor.toml" ]; then
    # Check if program IDs in Anchor.toml match expected
    anchor_toml_ok=true
    for program_name in "${!PROGRAM_IDS[@]}"; do
        expected_id="${PROGRAM_IDS[$program_name]}"
        # Extract from Anchor.toml (simplified check)
        actual_id=$(grep "$program_name" Anchor.toml 2>/dev/null | grep -oP '"\K[a-zA-Z0-9$]{43}' | head -1 || echo "")
        
        if [ -n "$actual_id" ] && [ "$actual_id" = "$expected_id" ]; then
            SUCCESS "  ✓ $program_name ID matches"
        elif [ -n "$actual_id" ]; then
            WARN "  ⚠ $program_name ID mismatch: Anchor.toml=$actual_id, Expected=$expected_id"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
else
    ERROR "  Anchor.toml not found!"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# =============================================================================
# Summary
# =============================================================================
echo "============================================="
echo "  Verification Summary"
echo "============================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    SUCCESS "All checks passed!"
elif [ $ERRORS -eq 0 ]; then
    WARN "Verification completed with $WARNINGS warning(s)"
    echo ""
    echo "Warnings do not prevent deployment but should be reviewed."
else
    ERROR "Verification failed with $ERRORS error(s) and $WARNINGS warning(s)"
    echo ""
    echo "Errors must be resolved before proceeding."
    exit 1
fi

echo ""
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"
echo ""
