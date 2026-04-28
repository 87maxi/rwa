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
    if [ "$NETWORK" = "localnet" ] || [ "$NETWORK" = "localhost" ]; then
        # Multi-method health check (works with surfpool and solana-test-validator)
        local validator_healthy=false
        
        # Method 1: Check surfpool process
        if ps aux | grep -v grep | grep -q "surfpool"; then
            validator_healthy=true
            log_info "Detected: surfpool running"
        fi
        
        # Method 2: Check solana-test-validator process
        if ps aux | grep -v grep | grep -q "solana-test-validator"; then
            validator_healthy=true
            log_info "Detected: solana-test-validator running"
        fi
        
        # Method 3: Try RPC getSlot
        if curl -s -X POST -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' \
            http://localhost:8899 2>/dev/null | grep -qE '"result":[0-9]+'; then
            validator_healthy=true
            log_info "Detected: RPC responding on localhost:8899"
        fi
        
        # Method 4: Try solana slot
        if solana -u localhost slot 2>/dev/null | grep -qE '^[0-9]+$'; then
            validator_healthy=true
            log_info "Detected: solana CLI responding"
        fi
        
        if ! $validator_healthy; then
            log_error "No validator running on localnet"
            log_info "Start validator: solana-test-validator --reset"
            log_info "Or start surfpool: surfpool start"
            exit 1
        fi
        log_success "Validator is healthy"
    elif [ "$NETWORK" = "devnet" ] || [ "$NETWORK" = "mainnet" ]; then
        # Check network connectivity for non-localnet
        local rpc_url="http://127.0.0.1:8899"
        if [ "$NETWORK" = "devnet" ]; then
            rpc_url="https://api.devnet.solana.com"
        elif [ "$NETWORK" = "mainnet" ]; then
            rpc_url="https://api.mainnet-beta.solana.com"
        fi
        
        log_info "Checking connectivity to ${NETWORK}..."
        if curl -s --max-time 10 -X POST -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' \
            "$rpc_url" 2>/dev/null | grep -qE '"result":[0-9]+'; then
            log_success "Connected to ${NETWORK}"
        else
            log_warning "Could not reach ${NETWORK} RPC endpoint"
            log_info "Continuing anyway - txtx will handle connection"
        fi
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
    
    if ${cmd} run compliance-initialization --env "$network" 2>&1; then
        log_success "Compliance aggregator initialized"
    else
        log_error "Failed to initialize compliance aggregator"
        log_info "Check the error message above"
        log_info "You can retry: ${cmd} run compliance-initialization --env ${network}"
        exit 1
    fi
    echo ""

    # 2. Identity Registry Initialization
    log_info "Step 2/3: Initializing identity registry..."
    log_info "Running: ${cmd} run identity-initialization --env ${network}"
    
    if ${cmd} run identity-initialization --env "$network" 2>&1; then
        log_success "Identity registry initialized"
    else
        log_error "Failed to initialize identity registry"
        log_info "Check the error message above"
        log_info "You can retry: ${cmd} run identity-initialization --env ${network}"
        exit 1
    fi
    echo ""

    # 3. Token Initialization
    log_info "Step 3/3: Initializing token..."
    log_info "Running: ${cmd} run token-initialization --env ${network}"
    
    # Get token parameters from environment or use defaults
    local token_name="${TOKEN_NAME:-RWA Token}"
    local token_symbol="${TOKEN_SYMBOL:-RWA}"
    local token_decimals="${TOKEN_DECIMALS:-9}"
    
    log_info "Token parameters: name='${token_name}', symbol='${token_symbol}', decimals=${token_decimals}"
    
    if ${cmd} run token-initialization --env "$network" \
        --input token_name="$token_name" \
        --input token_symbol="$token_symbol" \
        --input token_decimals="$token_decimals" \
        2>&1; then
        log_success "Token initialized"
    else
        log_warning "Token initialization failed or requires manual input"
        log_info "Try running manually:"
        log_info "  ${cmd} run token-initialization --env ${network} \\"
        log_info "    --input token_name='${token_name}' \\"
        log_info "    --input token_symbol='${token_symbol}' \\"
        log_info "    --input token_decimals=${token_decimals}"
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
    
    if [ "$network" = "localnet" ] || [ "$network" = "localhost" ]; then
        log_info "  3. View dashboard: open http://localhost:18488"
        echo ""
        log_info "Program PDAs to check:"
        log_info "  Compliance Aggregator: PDA([b\"aggregator\"], 9EbDbR12nkLx2t7iYDJCgvJrELM1cDKqLQHgVWG3vzY7)"
        log_info "  Identity Registry:     PDA([b\"registry\"], 6ULwDvPcDHFVET7oi172RSvE51oGmLC8PajxfnzVH5fc)"
        log_info "  Token State:           PDA([b\"token\", payer.public_key], 6XDDBdZm8pqamteHWRHS2A8Ka4Pb6BkN5nCpWxWCzVpe)"
    elif [ "$network" = "devnet" ]; then
        log_info "  3. View on explorer: https://explorer.solana.com/?cluster=devnet"
    elif [ "$network" = "mainnet" ]; then
        log_info "  3. View on explorer: https://explorer.solana.com/"
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
    
    log_info "Using CLI: ${TXTX_CMD}"
    log_info "CLI version: $(${TXTX_CMD} --version 2>/dev/null || echo 'unknown')"

    run_initialization "$NETWORK"
    show_summary "$NETWORK"

    print_header "Initialization Complete!"
    log_success "All steps completed successfully"
    log_info "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
}

main "$@"
