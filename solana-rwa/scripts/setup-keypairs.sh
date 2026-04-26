#!/bin/bash
# =============================================================================
# Solana RWA - Setup Fixed Keypairs for Deployment
# =============================================================================
#
# Este script genera keypairs fijos para cada programa y actualiza:
# 1. declare_id!() en cada programa
# 2. Anchor.toml con los nuevos program IDs
# 3. Crea los keypair files en keys/
#
# Usage:
#   ./scripts/setup-keypairs.sh
#
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Program configuration
declare -A PROGRAMS
PROGRAMS=(
    ["compliance_aggregator"]="programs/compliance-aggregator/src/lib.rs"
    ["identity_registry"]="programs/identity-registry/src/lib.rs"
    ["solana_rwa"]="programs/solana-rwa/src/lib.rs"
)

KEYS_DIR="keys"
ANCHOR_TOML="Anchor.toml"

# =============================================================================
# Step 1: Generate keypairs
# =============================================================================
generate_keypairs() {
    print_header "Generating Keypairs"

    mkdir -p "$KEYS_DIR"

    for program in "${!PROGRAMS[@]}"; do
        local keypair_file="$KEYS_DIR/${program}.json"
        
        log_info "Generating keypair for ${program}..."
        if solana-keygen new --no-passphrase --outfile "$keypair_file" --force 2>/dev/null; then
            local pubkey
            pubkey=$(solana-keygen pubkey "$keypair_file" 2>/dev/null)
            log_success "${program}: ${pubkey}"
            echo "${program}=${pubkey}" >> "${KEYS_DIR}/.program_ids.env"
        else
            log_error "Failed to generate keypair for ${program}"
            exit 1
        fi
    done

    log_success "All keypairs generated in ${KEYS_DIR}/"
}

# =============================================================================
# Step 2: Update declare_id!() in each program
# =============================================================================
update_declare_id() {
    print_header "Updating declare_id!() in Programs"

    # Load program IDs
    if [ ! -f "${KEYS_DIR}/.program_ids.env" ]; then
        log_error "Program IDs file not found. Run generate_keypairs first."
        exit 1
    fi

    source "${KEYS_DIR}/.program_ids.env"

    for program in "${!PROGRAMS[@]}"; do
        local source_file="${PROGRAMS[$program]}"
        local pubkey="${PROGRAMS[$program]}"
        
        # Get pubkey from keypair file
        local keypair_file="$KEYS_DIR/${program}.json"
        pubkey=$(solana-keygen pubkey "$keypair_file" 2>/dev/null)
        
        log_info "Updating ${source_file}..."
        
        # Check if declare_id! exists
        if grep -q "declare_id!" "$source_file"; then
            # Replace the declare_id! macro
            sed -i "s/declare_id!(\"[^\"]*\")/declare_id!(\"${pubkey}\")/" "$source_file"
            log_success "Updated declare_id! to: ${pubkey}"
        else
            log_warning "declare_id! not found in ${source_file}"
        fi
    done

    log_success "All declare_id!() macros updated"
}

# =============================================================================
# Step 3: Update Anchor.toml
# =============================================================================
update_anchor_toml() {
    print_header "Updating Anchor.toml"

    if [ ! -f "$ANCHOR_TOML" ]; then
        log_error "Anchor.toml not found"
        exit 1
    fi

    # Build new [programs.localnet] section
    local new_section="[programs.localnet]"
    
    for program in "${!PROGRAMS[@]}"; do
        local keypair_file="$KEYS_DIR/${program}.json"
        local pubkey
        pubkey=$(solana-keygen pubkey "$keypair_file" 2>/dev/null)
        new_section="${new_section}\n${program} = \"${pubkey}\""
    done

    # Replace the [programs.localnet] section using a temp file
    local temp_file=$(mktemp)
    local in_section=false
    local section_replaced=false
    
    while IFS= read -r line; do
        if [[ "$line" == "[programs.localnet]" ]]; then
            # Write new section
            echo -e "$new_section" >> "$temp_file"
            in_section=true
            section_replaced=true
            # Skip old section lines until empty line or next section
            continue
        elif $in_section && [[ "$line" == "["* ]] || ($in_section && [[ -z "$line" ]]); then
            in_section=false
            # Don't skip this line, let it be processed normally
        fi
        
        if ! $in_section; then
            echo "$line" >> "$temp_file"
        fi
    done < "$ANCHOR_TOML"
    
    # If section was not found, append it
    if ! $section_replaced; then
        echo "" >> "$temp_file"
        echo -e "$new_section" >> "$temp_file"
    fi
    
    mv "$temp_file" "$ANCHOR_TOML"
    log_success "Anchor.toml [programs.localnet] section updated"
}

# =============================================================================
# Main
# =============================================================================
main() {
    print_header "Solana RWA - Keypair Setup"

    # Check prerequisites
    if ! command -v solana-keygen &> /dev/null; then
        log_error "solana-keygen not found. Install Solana CLI."
        exit 1
    fi

    if ! command -v anchor &> /dev/null; then
        log_error "anchor not found. Install Anchor CLI."
        exit 1
    fi

    # Clean up any previous runs
    rm -f "${KEYS_DIR}/.program_ids.env"

    # Step 1: Generate keypairs
    generate_keypairs

    # Step 2: Update declare_id!() in programs
    update_declare_id

    # Step 3: Update Anchor.toml
    update_anchor_toml

    # Summary
    print_header "Setup Complete"
    log_info "Next steps:"
    log_info "  1. Review changes: git diff"
    log_info "  2. Build: anchor build"
    log_info "  3. Deploy: ./deploy.sh"
    
    echo ""
    log_info "Generated keypair files:"
    ls -la "$KEYS_DIR"/*.json 2>/dev/null | while read line; do echo "  $line"; done
    
    echo ""
    log_info "Program IDs:"
    source "${KEYS_DIR}/.program_ids.env"
    for program in "${!PROGRAMS[@]}"; do
        local keypair_file="$KEYS_DIR/${program}.json"
        local pubkey
        pubkey=$(solana-keygen pubkey "$keypair_file" 2>/dev/null)
        echo "  ${program}: ${pubkey}"
    done
}

# Helper function
print_header() {
    echo ""
    echo "============================================================="
    echo " $1"
    echo "============================================================="
    echo ""
}

# Run main
main "$@"
