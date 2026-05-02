#!/bin/bash
# =============================================================================
# Solana RWA - Deployment Script
# =============================================================================
#
# Script para despliegue de programas Solana RWA.
# La inicialización de PDAs se maneja mediante runbooks de txtx.
#
# Usage:
#   ./deploy.sh [build|deploy|verify|status|reset] [network]
#
# Subcomandos:
#   build    - Compilar programas con anchor build
#   deploy   - Desplegar programas con solana program deploy
#   verify   - Verificar consistencia de program IDs
#   status   - Mostrar estado del despliegue
#   reset    - Reiniciar validator con estado limpio (localnet only)
#
# Networks:
#   localnet   - Desarrollo local con surfpool (default)
#   devnet     - Red de pruebas de Solana
#   mainnet    - Red principal de Solana
#
# Ejemplos:
#   ./deploy.sh deploy localnet    # Deploy a localnet
#   ./deploy.sh deploy devnet      # Deploy a devnet
#   ./deploy.sh verify localnet    # Verificar consistencia
#   txtx run compliance-initialization --env localnet  # Init compliance
#   txtx run identity-initialization --env localnet    # Init identity
#   txtx run token-initialization --env localnet       # Init token
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
SUBCOMMAND="${1:-deploy}"
NETWORK="${2:-localnet}"

# Program configuration (anchor generates binaries with snake_case names)
PROGRAM_NAMES=("compliance_aggregator" "identity_registry" "solana_rwa")
PROGRAMS=("${PROGRAM_NAMES[@]}")

# Directories
KEYS_DIR="keys"
ANCHOR_TOML="Anchor.toml"

# =============================================================================
# Helper Functions
# =============================================================================

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

print_header() {
    echo ""
    echo "============================================================="
    echo " $1"
    echo "============================================================="
}

usage() {
    cat <<EOF
Solana RWA - Deployment Script

Usage: ./deploy.sh [subcommand] [network]

Subcommands:
  build      Compile programs with anchor build
  deploy     Deploy programs with solana program deploy
  verify     Verify program ID consistency
  status     Show deployment status
  reset      Restart validator with clean state (localnet only)

Networks:
  localnet   Local development with surfpool (default)
  devnet     Solana testnet
  mainnet    Solana mainnet

Examples:
  ./deploy.sh deploy localnet          # Deploy to localnet
  ./deploy.sh deploy devnet            # Deploy to devnet
  ./deploy.sh verify localnet          # Verify consistency
  ./deploy.sh status localnet          # Show status
  ./deploy.sh reset localnet           # Reset validator

After deployment, initialize PDAs with txtx:
  txtx run compliance-initialization --env localnet
  txtx run identity-initialization --env localnet
  txtx run token-initialization --env localnet
EOF
}

# =============================================================================
# Helper: Check Validator Running
# =============================================================================

check_validator_running() {
    # Check surfpool process
    if ps aux | grep -v grep | grep -q "surfpool"; then
        return 0
    fi

    # Check RPC endpoint
    if curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' \
        http://localhost:8899 2>/dev/null | grep -qE '"result":[0-9]+'; then
        return 0
    fi

    # Check solana CLI
    if solana -u localhost slot 2>/dev/null | grep -qE '^[0-9]+'; then
        return 0
    fi

    return 1
}

# =============================================================================
# Subcommand: build
# =============================================================================

cmd_build() {
    print_header "Building Programs"
    
    log_info "Running: anchor build"
    if anchor build 2>&1; then
        log_success "Build completed successfully"
        
        for program in "${PROGRAM_NAMES[@]}"; do
            if [ -f "target/deploy/${program}.so" ]; then
                local size
                size=$(du -h "target/deploy/${program}.so" | cut -f1)
                log_success "  ${program}.so (${size})"
            else
                log_warning "  ${program}.so: Not found"
            fi
        done
    else
        log_error "Build failed"
        exit 1
    fi
}

# =============================================================================
# Subcommand: deploy
# =============================================================================

cmd_deploy() {
    print_header "Deploying Programs to ${NETWORK}"
    
    # Check validator for localnet
    if [ "$NETWORK" = "localnet" ] || [ "$NETWORK" = "localhost" ]; then
        if ! check_validator_running; then
            log_error "No validator running on ${NETWORK}"
            log_info "Start: surfpool start"
            exit 1
        fi
    fi
    
    for i in "${!PROGRAMS[@]}"; do
        local program="${PROGRAMS[$i]}"
        local program_name="${PROGRAM_NAMES[$i]}"
        local program_file="target/deploy/${program}.so"
        local keypair_file="$KEYS_DIR/${program}.json"
        
        print_header "Deploying: ${program_name}"
        
        if [ ! -f "$keypair_file" ]; then
            log_error "Keypair not found: $keypair_file"
            log_info "Generate with: solana-keygen new --no-passphrase --outfile $keypair_file"
            exit 1
        fi
        
        if [ ! -f "$program_file" ]; then
            log_error "Program binary not found: $program_file"
            log_info "Run: ./deploy.sh build first"
            exit 1
        fi
        
        local expected_id
        expected_id=$(solana-keygen pubkey "$keypair_file" 2>/dev/null)
        log_info "Expected Program ID: ${expected_id}"
        log_info "Keypair: ${keypair_file}"
        log_info "Binary: ${program_file}"
        
        # Build solana deploy command with network-specific flags
        local solana_args=("--program-id" "$keypair_file" "$program_file")
        
        if [ "$NETWORK" = "devnet" ]; then
            solana_args+=("--url" "devnet")
        elif [ "$NETWORK" = "mainnet" ]; then
            solana_args+=("--url" "mainnet-beta")
        elif [ "$NETWORK" = "localnet" ] || [ "$NETWORK" = "localhost" ]; then
            solana_args+=("--url" "localhost")
        fi
        
        log_info "Running: solana program deploy ${solana_args[*]}"
        
        # Deploy with retry logic for blockhash errors
        local deploy_output=""
        local deploy_exit=1
        local max_retries=3
        local retry=0
        
        while [ $retry -lt $max_retries ] && [ $deploy_exit -ne 0 ]; do
            deploy_output=$(solana program deploy "${solana_args[@]}" 2>&1)
            deploy_exit=$?
            
            if [ $deploy_exit -ne 0 ]; then
                if echo "$deploy_output" | grep -q "Blockhash not found\|blockhash not found"; then
                    log_warning "Blockhash error, retrying... ($((retry + 1))/$max_retries)"
                    sleep 3
                    retry=$((retry + 1))
                    if [ "$NETWORK" = "localnet" ] || [ "$NETWORK" = "localhost" ]; then
                        if ! check_validator_running; then
                            log_error "Validator stopped responding"
                            break
                        fi
                    fi
                else
                    break
                fi
            fi
        done
        
        if [ $deploy_exit -ne 0 ]; then
            echo "$deploy_output" | tail -10
            log_error "Failed to deploy ${program_name} after $max_retries attempts"
            exit 1
        fi
        
        # Extract and verify program ID
        local deployed_id
        deployed_id=$(echo "$deploy_output" | grep "Program Id:" | tail -1 | awk '{print $NF}')
        
        if [ "$deployed_id" = "$expected_id" ]; then
            log_success "${program_name} deployed successfully (ID: ${deployed_id})"
        else
            log_error "Program ID mismatch! Expected: ${expected_id}, Got: ${deployed_id}"
            exit 1
        fi
        
        # Brief delay between deployments
        if [ $i -lt $((${#PROGRAMS[@]} - 1)) ]; then
            log_info "Waiting 3 seconds before next deployment..."
            sleep 3
        fi
    done
    
    # Generate IDLs
    print_header "Generating IDL Files"
    for program in "${PROGRAM_NAMES[@]}"; do
        log_info "Generating IDL for ${program}..."
        if anchor idl build -p "$program" -o "idl_${program}.json" 2>/dev/null; then
            log_success "  idl_${program}.json generated"
        else
            log_warning "  Could not generate IDL for ${program}"
        fi
    done
    
    # Show summary
    print_header "Deployment Summary"
    log_info "Network: ${NETWORK}"
    echo ""
    log_info "Programs deployed:"
    for program in "${PROGRAM_NAMES[@]}"; do
        if [ -f "$KEYS_DIR/${program}.json" ]; then
            local pubkey
            pubkey=$(solana-keygen pubkey "$KEYS_DIR/${program}.json" 2>/dev/null || echo "unknown")
            log_success "  ${program}: ${pubkey}"
        fi
    done
    
    echo ""
    log_info "Next steps:"
    log_info "  1. Initialize programs with txtx:"
    log_info "     txtx run compliance-initialization --env ${NETWORK}"
    log_info "     txtx run identity-initialization --env ${NETWORK}"
    log_info "     txtx run token-initialization --env ${NETWORK}"
    log_info "  2. Verify deployment:  ./deploy.sh verify ${NETWORK}"
}

# =============================================================================
# Subcommand: verify
# =============================================================================

cmd_verify() {
    print_header "Verifying Deployment Consistency"
    
    local errors=0
    
    # Check Anchor.toml exists
    if [ ! -f "$ANCHOR_TOML" ]; then
        log_error "$ANCHOR_TOML not found"
        ((errors++))
    fi
    
    # Extract program IDs from Anchor.toml
    log_info "Checking program IDs consistency..."
    for program in "${PROGRAM_NAMES[@]}"; do
        local id
        id=$(grep -A1 "\[${program}\]" "$ANCHOR_TOML" 2>/dev/null | grep -oE '"[a-zA-Z0-9]{44}"' | tr -d '"' || echo "")
        if [ -z "$id" ]; then
            id=$(grep "${program} = " "$ANCHOR_TOML" 2>/dev/null | grep -oE '"[a-zA-Z0-9]{44}"' | tr -d '"' || echo "")
        fi
        
        if [ -z "$id" ]; then
            log_warning "  ${program}: ID not found in Anchor.toml"
        else
            log_success "  ${program}: ${id}"
        fi
    done
    
    # Check keypair consistency
    log_info "Checking keypair consistency..."
    for program in "${PROGRAM_NAMES[@]}"; do
        local keypair_file="$KEYS_DIR/${program}.json"
        
        if [ -f "$keypair_file" ]; then
            local pubkey
            pubkey=$(solana-keygen pubkey "$keypair_file" 2>/dev/null || echo "ERROR")
            if [ "$pubkey" = "ERROR" ]; then
                log_error "  ${program}: Failed to read keypair"
                ((errors++))
            else
                log_success "  ${program}: ${pubkey}"
            fi
        else
            log_warning "  ${program}: Keypair not found ($keypair_file)"
        fi
    done
    
    # Check IDL files
    log_info "Checking IDL files..."
    for program in "${PROGRAM_NAMES[@]}"; do
        local idl_file="idl_${program}.json"
        if [ -f "$idl_file" ]; then
            local idl_address
            idl_address=$(grep '"address"' "$idl_file" 2>/dev/null | head -1 | grep -oE '"[a-zA-Z0-9]{44}"' | tr -d '"' || echo "")
            if [ -n "$idl_address" ]; then
                log_success "  ${program}: IDL address = ${idl_address}"
            else
                log_warning "  ${program}: Could not read IDL address"
            fi
        else
            log_warning "  ${program}: IDL file not found ($idl_file)"
        fi
    done
    
    echo ""
    if [ $errors -gt 0 ]; then
        log_error "Verification completed with ${errors} error(s)"
        return 1
    else
        log_success "Verification completed - all checks passed"
        return 0
    fi
}

# =============================================================================
# Subcommand: status
# =============================================================================

cmd_status() {
    print_header "Deployment Status"
    
    # Check tools
    log_info "Installed tools:"
    for cmd in anchor solana surfpool txtx; do
        if command -v "$cmd" &>/dev/null; then
            local version
            version=$("$cmd" --version 2>/dev/null | head -1 || echo "unknown")
            log_success "  ${cmd}: ${version}"
        else
            log_warning "  ${cmd}: not installed"
        fi
    done
    
    # Check keypairs
    echo ""
    log_info "Keypairs:"
    for program in "${PROGRAM_NAMES[@]}"; do
        if [ -f "$KEYS_DIR/${program}.json" ]; then
            local pubkey
            pubkey=$(solana-keygen pubkey "$KEYS_DIR/${program}.json" 2>/dev/null || echo "unknown")
            log_success "  ${program}: ${pubkey}"
        else
            log_warning "  ${program}: not found"
        fi
    done
    
    # Check built programs
    echo ""
    log_info "Built programs:"
    for program in "${PROGRAM_NAMES[@]}"; do
        if [ -f "target/deploy/${program}.so" ]; then
            local size
            size=$(du -h "target/deploy/${program}.so" | cut -f1)
            log_success "  ${program}.so (${size})"
        else
            log_warning "  ${program}.so: not built"
        fi
    done
    
    # Check IDLs
    echo ""
    log_info "IDL files:"
    for program in "${PROGRAM_NAMES[@]}"; do
        if [ -f "idl_${program}.json" ]; then
            log_success "  idl_${program}.json"
        else
            log_warning "  idl_${program}.json: not found"
        fi
    done
    
    # Check validator
    echo ""
    log_info "Validator status:"
    if check_validator_running; then
        log_success "  Validator is running"
    else
        log_warning "  No validator running"
    fi
}

# =============================================================================
# Subcommand: reset (restart validator with clean state)
# =============================================================================

cmd_reset() {
    print_header "Resetting Localnet Validator"
    
    if [ "$NETWORK" != "localnet" ] && [ "$NETWORK" != "localhost" ]; then
        log_error "Reset is only available for localnet"
        exit 1
    fi
    
    # Stop any running validator
    log_info "Stopping any running validator..."
    pkill -f surfpool 2>/dev/null || true
    pkill -f solana-test-validator 2>/dev/null || true
    sleep 3
    
    # Clean test ledger
    if [ -d ".surfpool/test-ledger" ]; then
        log_info "Cleaning test ledger..."
        rm -rf .surfpool/test-ledger
    fi
    
    # Start fresh validator
    log_info "Starting fresh validator with --reset..."
    surfpool start --ci --daemon 2>/dev/null || {
        log_warning "surfpool start --ci failed, trying solana-test-validator..."
        solana-test-validator --reset --quiet 2>/dev/null &
    }
    
    log_info "Waiting 15 seconds for validator to initialize..."
    sleep 15
    
    if check_validator_running; then
        log_success "Validator restarted successfully"
        log_info "Now run: ./deploy.sh deploy localnet"
    else
        log_error "Validator failed to start"
        exit 1
    fi
}

# =============================================================================
# Main Entry Point
# =============================================================================

main() {
    # Handle --help
    if [ "$SUBCOMMAND" = "--help" ] || [ "$SUBCOMMAND" = "-h" ]; then
        usage
    fi
    
    # Validate subcommand
    valid_commands=("build" "deploy" "verify" "status" "reset" "--help" "-h")
    local valid=false
    for cmd in "${valid_commands[@]}"; do
        if [ "$SUBCOMMAND" = "$cmd" ]; then
            valid=true
            break
        fi
    done
    
    if [ "$valid" = false ]; then
        log_error "Unknown subcommand: $SUBCOMMAND"
        echo ""
        usage
    fi
    
    # Validate network
    valid_networks=("localnet" "localhost" "devnet" "mainnet")
    local valid_net=false
    for net in "${valid_networks[@]}"; do
        if [ "$NETWORK" = "$net" ]; then
            valid_net=true
            break
        fi
    done
    
    if [ "$valid_net" = false ]; then
        log_error "Unknown network: $NETWORK"
        echo ""
        usage
    fi
    
    # Execute subcommand
    case "$SUBCOMMAND" in
        build)  cmd_build ;;
        deploy) cmd_deploy ;;
        verify) cmd_verify ;;
        status) cmd_status ;;
        reset)  cmd_reset ;;
    esac
}

main "$@"
