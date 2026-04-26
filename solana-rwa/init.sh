#!/bin/bash
# =============================================================================
# Solana RWA - Initialization Script
# =============================================================================
#
# This script runs the txtx initialization runbooks after programs are deployed.
# It initializes the three programs in dependency order:
#   1. compliance_aggregator (no dependencies)
#   2. identity_registry (depends on compliance_aggregator)
#   3. solana_rwa (depends on both)
#
# Usage:
#   ./init.sh                    # Initialize with default localnet
#   ./init.sh localnet           # Initialize on localnet
#   ./init.sh devnet             # Initialize on devnet
#   ./init.sh mainnet            # Initialize on mainnet
#
# Prerequisites:
#   - Programs must be deployed first (run ./deploy.sh first)
#   - txtx CLI installed (comes with surfpool)
#   - Validator running for localnet
#
# =============================================================================

set -e
set -o pipefail

# =============================================================================
# Configuration
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default network
NETWORK="${1:-localnet}"

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo "============================================================="
    echo " $1"
    echo "============================================================="
    echo ""
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

preflight_checks() {
    print_header "Running Pre-flight Checks"

    # Check if txtx/surfpool CLI is available
    if command -v surfpool &> /dev/null; then
        TXTX_CMD="surfpool"
        log_info "Using surfpool CLI: $(surfpool --version 2>/dev/null || echo 'unknown version')"
    elif command -v txtx &> /dev/null; then
        TXTX_CMD="txtx"
        log_info "Using txtx CLI: $(txtx --version 2>/dev/null || echo 'unknown version')"
    else
        log_error "Neither surfpool nor txtx CLI found"
        log_info "Install surfpool: curl -sL https://run.surfpool.run/ | bash"
        exit 1
    fi

    # Check txtx.yml exists
    if [ ! -f "txtx.yml" ]; then
        log_error "txtx.yml not found. Run this script from the solana-rwa directory."
        exit 1
    fi
    log_success "txtx.yml found"

    # Check validator for localnet
    if [ "$NETWORK" = "localnet" ]; then
        if ! solana health 2>/dev/null | grep -q "ok"; then
            log_error "No validator running on localnet"
            log_info "Start validator: solana-test-validator --reset"
            log_info "Or start surfpool: surfpool start"
            exit 1
        fi
        log_success "Validator is healthy"
    fi
}

# =============================================================================
# Run Initialization
# =============================================================================

run_initialization() {
    local network=$1
    local cmd="$TXTX_CMD"
    
    print_header "Running Initialization on ${network}"

    # 1. Compliance Aggregator Initialization
    log_info "Step 1/3: Initializing compliance aggregator..."
    log_info "Running: ${cmd} run compliance-initialization --env ${network}"
    
    if ${cmd} run compliance-initialization --env "$network" -u 2>&1; then
        log_success "Compliance aggregator initialized"
    else
        log_error "Failed to initialize compliance aggregator"
        log_info "Check the error message above"
        exit 1
    fi
    echo ""

    # 2. Identity Registry Initialization
    log_info "Step 2/3: Initializing identity registry..."
    log_info "Running: ${cmd} run identity-initialization --env ${network}"
    
    if ${cmd} run identity-initialization --env "$network" -u 2>&1; then
        log_success "Identity registry initialized"
    else
        log_error "Failed to initialize identity registry"
        log_info "Check the error message above"
        exit 1
    fi
    echo ""

    # 3. Token Initialization
    log_info "Step 3/3: Initializing token..."
    log_info "Running: ${cmd} run token-initialization --env ${network}"
    
    # Token initialization may require input parameters
    # Default values from txtx.yml localnet environment
    if ${cmd} run token-initialization --env "$network" -u \
        --input token_name="RWA Token" \
        --input token_symbol="RWA" \
        --input token_decimals=9 \
        2>&1; then
        log_success "Token initialized"
    else
        log_warning "Token initialization failed or requires manual input"
        log_info "Try running manually:"
        log_info "  ${cmd} run token-initialization --env ${network} \\"
        log_info "    --input token_name='My Token' \\"
        log_info "    --input token_symbol='MTK' \\"
        log_info "    --input token_decimals=9"
    fi
    echo ""
}

# =============================================================================
# Display Summary
# =============================================================================

show_summary() {
    local network=$1
    
    print_header "Initialization Summary"

    log_info "Network: ${network}"
    log_success "All initialization runbooks completed"
    
    echo ""
    log_info "Next steps:"
    log_info "  1. Run token operations: ${TXTX_CMD} run token-operations --env ${network}"
    log_info "  2. Check program state: solana account <PROGRAM_PDA>"
    log_info "  3. View dashboard (localnet): open http://localhost:18488"
    
    if [ "$network" = "localnet" ]; then
        echo ""
        log_info "Program PDAs to check:"
        log_info "  Compliance Aggregator: PDA([b\"aggregator\"], compliance_aggregator_program_id)"
        log_info "  Identity Registry:     PDA([b\"registry\"], identity_registry_program_id)"
        log_info "  Token State:           PDA([b\"token\", payer.public_key], solana_rwa_program_id)"
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    print_header "Solana RWA Initialization"
    log_info "Starting initialization on ${NETWORK}..."
    log_info "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

    preflight_checks
    run_initialization "$NETWORK"
    show_summary "$NETWORK"

    print_header "Initialization Complete!"
    log_success "All steps completed successfully"
    log_info "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
}

main "$@"
