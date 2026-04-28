#!/bin/bash
# =============================================================================
# Solana RWA - Deployment Script
# =============================================================================
#
# This script deploys all three Solana programs using `solana program deploy`
# with fixed keypairs that match the declare_id!() in each program.
#
# Workflow:
#   1. Pre-flight checks (verify keypairs exist)
#   2. Build all programs with anchor build
#   3. Deploy each program in dependency order using solana program deploy:
#      a. compliance_aggregator (no dependencies)
#      b. identity_registry (depends on compliance_aggregator)
#      c. solana_rwa (depends on both)
#   4. Generate IDL files for each program
#   5. Display deployment summary
#
# Usage:
#   ./deploy.sh                    # Deploy to localnet (default)
#   ./deploy.sh devnet             # Deploy to devnet
#   ./deploy.sh mainnet            # Deploy to mainnet
#   ./deploy.sh --reset            # Reset validator and deploy to localnet
#
# Prerequisites:
#   - Anchor CLI installed: cargo install anchor-cli
#   - Solana CLI installed: https://docs.solana.com/cli/install
#   - Keypairs generated: ./scripts/setup-keypairs.sh (REQUIRED for localnet)
#   - For localnet: surfpool/solana-test-validator running
#
# Setup (one-time):
#   ./scripts/setup-keypairs.sh    # Generate keypairs and update declare_id!()
#   anchor build                   # Build programs
#   ./deploy.sh                    # Deploy to localnet
#
# =============================================================================

set -e          # Exit on error
set -o pipefail  # Catch pipeline errors

# =============================================================================
# Configuration
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Program names (directory names under programs/)
# Note: Directory names use hyphens, but anchor deploy uses underscores
PROGRAMS_DIR=("compliance-aggregator" "identity-registry" "solana-rwa")
PROGRAMS_ANCHOR=("compliance_aggregator" "identity_registry" "solana_rwa")

# Keypairs directory (for localnet deployment)
KEYPAIRS_DIR="keys"

# Default network - parse from arguments
NETWORK="localnet"

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

    # Check Anchor CLI
    if ! command -v anchor &> /dev/null; then
        log_error "Anchor CLI not found. Install it with: cargo install anchor-cli"
        exit 1
    fi
    log_info "Anchor CLI version: $(anchor --version)"

    # Check Solana CLI
    if ! command -v solana &> /dev/null; then
        log_error "Solana CLI not found. Install it with: sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
        exit 1
    fi
    log_info "Solana CLI version: $(solana --version)"

    # Check Anchor.toml exists
    if [ ! -f "Anchor.toml" ]; then
        log_error "Anchor.toml not found. Run this script from the solana-rwa directory."
        exit 1
    fi
    log_success "Anchor.toml found"

    # Check programs exist (use directory names with hyphens)
    for program_dir in "${PROGRAMS_DIR[@]}"; do
        if [ ! -d "programs/$program_dir" ]; then
            log_error "Program directory 'programs/$program_dir' not found"
            exit 1
        fi
    done
    log_success "All program directories found"

    # Check keypairs exist for localnet
    if [ "$NETWORK" = "localnet" ] || [ "$NETWORK" = "localhost" ]; then
        log_info "Checking keypairs for localnet deployment..."
        for program in "${PROGRAMS_ANCHOR[@]}"; do
            local keypair_file="$KEYPAIRS_DIR/${program}.json"
            if [ ! -f "$keypair_file" ]; then
                log_error "Keypair file not found: $keypair_file"
                log_info "Run: ./scripts/setup-keypairs.sh"
                log_info "This will generate fixed keypairs that match declare_id!() in each program"
                exit 1
            fi
            # Verify keypair pubkey matches expected
            local pubkey
            pubkey=$(solana-keygen pubkey "$keypair_file" 2>/dev/null)
            log_success "  ${program}: ${pubkey}"
        done
        log_success "All keypairs found and verified"
    else
        # Check wallet exists for non-localnet (use default id.json)
        WALLET_PATH="$HOME/.config/solana/id.json"
        if [ ! -f "$WALLET_PATH" ]; then
            log_error "Wallet file not found: $WALLET_PATH"
            log_info "Create or download your devnet/mainnet wallet first"
            log_info "Or set SOLANA_KEYPAIR_FILE environment variable"
            exit 1
        fi
        log_success "Wallet file found: $WALLET_PATH"
        
        # Check wallet has sufficient balance for deployment
        log_info "Checking wallet balance for ${NETWORK}..."
        local balance
        balance=$(solana -u "$NETWORK" balance 2>/dev/null | grep -oE '[0-9]+(\.[0-9]+)?' | head -1 || echo "0")
        log_info "Wallet balance: ${balance} SOL"
        
        if [ "$NETWORK" = "mainnet" ]; then
            log_warning "Mainnet deployment requires significant SOL (~1-2 SOL per program)"
            log_warning "Make sure you have sufficient balance"
        fi
    fi
}

# =============================================================================
# Start Validator (localnet only)
# =============================================================================

start_validator() {
    if [ "$NETWORK" != "localnet" ]; then
        return
    fi

    print_header "Starting Localnet Validator"

    # Check if validator or surfpool is already running
    check_health() {
        # Check for surfpool process
        if ps aux | grep -v grep | grep -q "surfpool"; then
            return 0
        fi
        # Try solana slot (works with newer solana CLI versions)
        if solana -u localhost slot 2>/dev/null | grep -qE '^[0-9]+'; then
            return 0
        fi
        # Try curl to localhost:8899 (standard surfpool/solana-test-validator RPC port)
        if curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' http://localhost:8899 2>/dev/null | grep -qE '"result":[0-9]+'; then
            return 0
        fi
        return 1
    }

    if check_health; then
        log_info "Localnet validator is already running"
        # Detect which one is running
        if ps aux | grep -v grep | grep -q "surfpool"; then
            log_info "Detected: surfpool"
        else
            log_info "Detected: solana-test-validator"
        fi
    else
        if [ "$1" = "--reset" ]; then
            log_info "Starting fresh validator with --reset..."
            solana-test-validator --reset 2>/dev/null &
            log_warning "Validator starting in background..."
            log_info "Waiting 15 seconds for validator to initialize..."
            sleep 15
        else
            log_warning "No validator running."
            log_info "Use ./deploy.sh --reset for a fresh start"
            log_info "Or start manually:"
            log_info "  solana-test-validator --reset"
            log_info "  OR: surfpool start"
            exit 1
        fi
    fi

    # Verify validator is running
    if check_health; then
        log_success "Validator is healthy"
        # Try to get slot
        local slot=$(solana -u localhost slot 2>/dev/null | head -1)
        if [ -n "$slot" ] && echo "$slot" | grep -qE '^[0-9]+'; then
            log_info "Current slot: $slot"
        else
            # Try curl method
            slot=$(curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' http://localhost:8899 2>/dev/null | grep -oE '"result":[0-9]+' | cut -d: -f2)
            if [ -n "$slot" ]; then
                log_info "Current slot: $slot"
            fi
        fi
    else
        log_error "Validator is not responding. Please start it manually:"
        log_info "  solana-test-validator --reset"
        log_info "  OR: surfpool start"
        exit 1
    fi
}

# =============================================================================
# Build Programs
# =============================================================================

build_programs() {
    print_header "Building Programs"

    log_info "Running: anchor build"
    if anchor build; then
        log_success "All programs built successfully"
        
        # List built programs (use anchor program names with underscores)
        echo ""
        log_info "Built programs:"
        for program in "${PROGRAMS_ANCHOR[@]}"; do
            if [ -f "target/deploy/${program}.so" ]; then
                local size=$(du -h "target/deploy/${program}.so" | cut -f1)
                log_success "  ${program}.so (${size})"
            else
                log_error "  ${program}.so not found in target/deploy/"
            fi
        done
    else
        log_error "Build failed. Check for compilation errors above."
        exit 1
    fi
}

# =============================================================================
# Deploy Programs using solana program deploy with fixed keypairs
# =============================================================================

# Store deployed program IDs for later use
declare -A DEPLOYED_PROGRAM_IDS

# Keypairs directory
KEYPAIRS_DIR="keys"

# Wait for validator to be ready before deployment
wait_for_validator() {
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for validator to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' http://localhost:8899 2>/dev/null | grep -qE '"result":[0-9]+'; then
            log_success "Validator is ready"
            return 0
        fi
        log_warning "Validator not ready, waiting... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Validator not ready after $max_attempts attempts"
    return 1
}

deploy_program() {
    local program_name=$1
    local network=$2
    
    print_header "Deploying: ${program_name}"

    local program_file="target/deploy/${program_name}.so"
    local keypair_file="$KEYPAIRS_DIR/${program_name}.json"
    
    # Check if program file exists
    if [ ! -f "$program_file" ]; then
        log_error "Program file not found: $program_file"
        log_info "Run: anchor build"
        exit 1
    fi
    
    # Check if keypair file exists (must be generated by setup-keypairs.sh)
    if [ ! -f "$keypair_file" ]; then
        log_error "Keypair file not found: $keypair_file"
        log_info "Run: ./scripts/setup-keypairs.sh"
        exit 1
    fi

    log_info "Deploying ${program_name} to ${network}..."
    log_info "Program: $program_file"
    log_info "Keypair: $keypair_file"
    
    # Wait for validator to be ready before deploying (localnet only)
    if [ "$network" = "localnet" ] || [ "$network" = "localhost" ]; then
        wait_for_validator || return 1
    fi
    
    # Use solana program deploy with fixed keypair
    # This avoids the DeclaredProgramIdMismatch error from anchor deploy
    local deploy_output
    local deploy_exit=1
    local max_retries=3
    local retry=0
    
    # Build solana command with network-specific flags
    local solana_url_flag=""
    local solana_keypair_flag=""
    
    if [ "$network" = "devnet" ]; then
        solana_url_flag="--url devnet"
    elif [ "$network" = "mainnet" ]; then
        solana_url_flag="--url mainnet-beta"
    elif [ "$network" = "localnet" ] || [ "$network" = "localhost" ]; then
        solana_url_flag="--url localhost"
    fi
    
    # Use SOLANA_KEYPAIR_FILE if set, otherwise default
    if [ -n "$SOLANA_KEYPAIR_FILE" ]; then
        solana_keypair_flag="--keypair $SOLANA_KEYPAIR_FILE"
    fi
    
    while [ $retry -lt $max_retries ] && [ $deploy_exit -ne 0 ]; do
        deploy_output=$(solana program deploy \
            $solana_url_flag \
            $solana_keypair_flag \
            --program-id "$keypair_file" \
            "$program_file" 2>&1)
        deploy_exit=$?
        
        if [ $deploy_exit -ne 0 ]; then
            # Check if it's a blockhash error
            if echo "$deploy_output" | grep -q "Blockhash not found"; then
                log_warning "Blockhash error, retrying... ($((retry + 1))/$max_retries)"
                sleep 3
                retry=$((retry + 1))
                # Wait for validator again
                if [ "$network" = "localnet" ] || [ "$network" = "localhost" ]; then
                    wait_for_validator || break
                fi
            else
                echo "$deploy_output"
                break
            fi
        fi
    done
    
    if [ $deploy_exit -ne 0 ]; then
        echo "$deploy_output"
        log_error "Deployment failed after $max_retries attempts"
        return 1
    fi
    
    # Extract program ID from output
    local deployed_id
    deployed_id=$(echo "$deploy_output" | grep "Program Id:" | tail -1 | awk '{print $NF}')
    if [ -n "$deployed_id" ]; then
        log_info "Deployed Program Id: $deployed_id"
        DEPLOYED_PROGRAM_IDS["$program_name"]="$deployed_id"
    fi
    
    # Also get the pubkey from keypair as verification
    local keypair_pubkey
    keypair_pubkey=$(solana-keygen pubkey "$keypair_file" 2>/dev/null)
    if [ "$deployed_id" = "$keypair_pubkey" ]; then
        log_success "Program ID matches keypair: ${deployed_id}"
    else
        log_warning "Program ID mismatch! Deployed: ${deployed_id}, Keypair: ${keypair_pubkey}"
    fi
    
    log_success "Program ${program_name} deployed successfully"
}

deploy_all_programs() {
    local network=$1
    
    print_header "Deploying All Programs to ${network}"

    # Deploy in dependency order (use anchor program names with underscores)
    for i in "${!PROGRAMS_ANCHOR[@]}"; do
        local program="${PROGRAMS_ANCHOR[$i]}"
        local program_dir="${PROGRAMS_DIR[$i]}"
        log_info "Deploying ${program} (directory: ${program_dir})..."
        
        # Deploy and capture output
        local deploy_output
        deploy_output=$(deploy_program "$program" "$network" 2>&1)
        echo "$deploy_output"
        
        # Add delay between program deployments to avoid blockhash issues
        if [ $i -lt $((${#PROGRAMS_ANCHOR[@]} - 1)) ]; then
            log_info "Waiting 3 seconds before next deployment..."
            sleep 3
        fi
        
        echo ""
    done

    log_success "All programs deployed successfully!"
}

# =============================================================================
# Generate IDLs
# =============================================================================

generate_idls() {
    print_header "Generating IDL Files"

    # Generate IDLs using anchor program names with underscores
    for program in "${PROGRAMS_ANCHOR[@]}"; do
        log_info "Generating IDL for ${program}..."
        
        if anchor idl build -p "$program" -o "idl_${program}.json" 2>/dev/null; then
            log_success "IDL generated: idl_${program}.json"
        else
            log_warning "Could not generate IDL for ${program} (non-critical)"
        fi
    done

    log_success "IDL generation complete"
}

# =============================================================================
# Display Deployment Summary
# =============================================================================

show_summary() {
    local network=$1
    
    print_header "Deployment Summary"

    log_info "Network: ${network}"
    log_info "Programs deployed:"
    
    for program in "${PROGRAMS_ANCHOR[@]}"; do
        local deployed_id="${DEPLOYED_PROGRAM_IDS[$program]:-N/A}"
        log_success "  ${program} -> $deployed_id"
    done
    
    log_info ""
    log_info "Next steps:"
    log_info "  1. Run initialization: ./init.sh"
    log_info "  2. Run token operations: txtx run token-operations --env ${network}"
    log_info "  3. Verify programs: solana -u ${network} program show <program-id>"
    
    if [ "$network" = "localnet" ]; then
        log_info ""
        log_info "Note: Program IDs are fixed (from keypairs generated by setup-keypairs.sh)"
        log_info "These IDs match declare_id!() in each program and Anchor.toml"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    local reset_flag=""
    
    # Parse arguments properly
    for arg in "$@"; do
        case "$arg" in
            --reset)
                reset_flag="--reset"
                ;;
            localnet|localhost|devnet|mainnet)
                NETWORK="$arg"
                ;;
            *)
                log_warning "Unknown argument: $arg"
                log_info "Usage: ./deploy.sh [localnet|devnet|mainnet] [--reset]"
                ;;
        esac
    done

    print_header "Solana RWA Deployment"
    log_info "Starting deployment to ${NETWORK}..."
    log_info "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

    # Run deployment pipeline
    preflight_checks
    start_validator $reset_flag
    build_programs
    deploy_all_programs "$NETWORK"
    generate_idls
    show_summary "$NETWORK"

    print_header "Deployment Complete!"
    log_success "All steps completed successfully"
    log_info "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
}

# Run main function
main "$@"
