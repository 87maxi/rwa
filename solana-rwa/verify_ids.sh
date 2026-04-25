#!/bin/bash
# =============================================================================
# Program ID Consistency Verification Script
# =============================================================================
#
# This script verifies that program IDs are consistent across all configuration
# files in the Solana RWA project.
#
# Usage:
#   chmod +x verify_ids.sh
#   ./verify_ids.sh                    # Verify localnet IDs
#   ./verify_ids.sh --all              # Verify all environments
#   ./verify_ids.sh --help             # Show help
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
#   2 - Invalid arguments

# =============================================================================
# CONFIGURATION
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_NAME=$(basename "$0")
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

# Check if a string is a valid Solana address (Base58, 32-44 chars)
is_valid_base58() {
    local address="$1"
    
    # Must not be empty
    [ -z "$address" ] && return 1
    
    # Must not be a placeholder/empty string
    case "$address" in
        '""'|"''"|empty|NONE|"") return 1 ;;
    esac
    
    # Must be 32-44 characters (Base58 encoded 32 bytes)
    local len=${#address}
    if [ "$len" -lt 32 ] || [ "$len" -gt 44 ]; then
        return 1
    fi
    
    # Must contain only Base58 characters (no 0, O, I, l)
    local cleaned
    cleaned=$(echo "$address" | tr -d '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')
    if [ -n "$cleaned" ]; then
        return 1
    fi
    
    return 0
}

# Extract program ID from Anchor.toml for localnet
extract_anchor_localnet_id() {
    local program_key="$1"
    local anchor_file="$SCRIPT_DIR/Anchor.toml"
    
    [ ! -f "$anchor_file" ] && echo "FILE_NOT_FOUND" && return
    
    # Use grep and sed to extract the value
    local in_section=false
    while IFS= read -r line; do
        case "$line" in
            "[programs.localnet]")
                in_section=true
                continue
                ;;
            "\["*)
                if $in_section; then
                    break
                fi
                ;;
        esac
        
        if $in_section; then
            # Match: solana_rwa = "value"
            case "$line" in
                "${program_key} ="*)
                    echo "$line" | sed 's/.*= *"\([^"]*\)".*/\1/'
                    return
                    ;;
            esac
        fi
    done < "$anchor_file"
    
    echo "NOT_FOUND"
}

# Extract program ID from ids.rs
extract_ids_rs_id() {
    local program_type="$1"
    local ids_file="$SCRIPT_DIR/programs/solana-rwa/src/ids.rs"
    
    [ ! -f "$ids_file" ] && echo "FILE_NOT_FOUND" && return
    
    local const_name=""
    case "$program_type" in
        identity_registry)
            const_name="IDENTITY_REGISTRY_PROGRAM_ID"
            ;;
        compliance_aggregator)
            const_name="COMPLIANCE_AGGREGATOR_PROGRAM_ID"
            ;;
        *)
            echo "NOT_FOUND"
            return
            ;;
    esac
    
    # Extract using grep and sed
    local line
    line=$(grep "$const_name" "$ids_file" | grep '= *"' | head -1)
    
    if [ -n "$line" ]; then
        echo "$line" | sed 's/.*= *"\([^"]*\)".*/\1/'
    else
        echo "NOT_FOUND"
    fi
}

# Extract program ID from web/src/config/solana.ts
# Note: web/ is at project root, not inside solana-rwa/
extract_ts_localnet_id() {
    local program_key="$1"
    local config_file="$SCRIPT_DIR/../web/src/config/solana.ts"
    
    [ ! -f "$config_file" ] && echo "FILE_NOT_FOUND" && return
    
    # Use awk to extract from localnet section
    local found
    found=$(awk '
        /localnet:[[:space:]]*\{/ { in_section=1; next }
        in_section && /\}/ { exit }
        in_section && /'"$program_key"'/ {
            gsub(/.*:[[:space:]]*'"'"'/, "")
            gsub(/'"'"'.*/, "")
            gsub(/.*:[[:space:]]*"/, "")
            gsub(/".*/, "")
            print
            exit
        }
    ' "$config_file")
    
    if [ -n "$found" ]; then
        echo "$found"
    else
        echo "NOT_FOUND"
    fi
}

# Extract program ID from txtx.yml
extract_txtx_id() {
    local program_var="$1"
    local network="$2"
    local txtx_file="$SCRIPT_DIR/txtx.yml"
    
    [ ! -f "$txtx_file" ] && echo "FILE_NOT_FOUND" && return
    
    # Use awk to extract from environment section
    local found
    found=$(awk -v env="$network" -v var="$program_var" '
        BEGIN { in_env=0 }
        $0 == env ":" { in_env=1; next }
        in_env && /^[a-z]/ { exit }
        in_env && $0 ~ var {
            gsub(/.*:[[:space:]]*"/, "")
            gsub(/".*/, "")
            print
            exit
        }
    ' "$txtx_file")
    
    echo "$found"
}

# =============================================================================
# MAIN VERIFICATION LOGIC
# =============================================================================

verify_localnet() {
    local errors=0
    
    print_header "LOCALNET Program ID Verification"
    
    # Get IDs from each source
    local anchor_solana_rwa anchor_identity anchor_compliance
    anchor_solana_rwa=$(extract_anchor_localnet_id "solana_rwa")
    anchor_identity=$(extract_anchor_localnet_id "identity_registry")
    anchor_compliance=$(extract_anchor_localnet_id "compliance_aggregator")
    
    local ids_identity ids_compliance
    ids_identity=$(extract_ids_rs_id "identity_registry")
    ids_compliance=$(extract_ids_rs_id "compliance_aggregator")
    
    local ts_solana_rwa ts_identity ts_compliance
    ts_solana_rwa=$(extract_ts_localnet_id "solanaRwa")
    ts_identity=$(extract_ts_localnet_id "identityRegistry")
    ts_compliance=$(extract_ts_localnet_id "complianceAggregator")
    
    # Display Anchor.toml IDs
    echo -e "${YELLOW}Anchor.toml [programs.localnet]:${NC}"
    echo "  solana_rwa:          $anchor_solana_rwa"
    echo "  identity_registry:   $anchor_identity"
    echo "  compliance_aggregator: $anchor_compliance"
    echo ""
    
    # Display ids.rs IDs
    echo -e "${YELLOW}ids.rs constants:${NC}"
    echo "  IDENTITY_REGISTRY:   $ids_identity"
    echo "  COMPLIANCE_AGGREGATOR: $ids_compliance"
    echo ""
    
    # Display TypeScript IDs
    echo -e "${YELLOW}web/src/config/solana.ts (localnet):${NC}"
    echo "  solanaRwa:           $ts_solana_rwa"
    echo "  identityRegistry:    $ts_identity"
    echo "  complianceAggregator: $ts_compliance"
    echo ""
    
    # Validation checks
    echo -e "${YELLOW}Validation Results:${NC}"
    echo ""
    
    # Check 1: Anchor.toml IDs are valid
    if is_valid_base58 "$anchor_solana_rwa"; then
        print_success "Anchor.toml: solana_rwa is valid Base58"
    else
        print_error "Anchor.toml: solana_rwa is invalid or not found: $anchor_solana_rwa"
        ((errors++))
    fi
    
    if is_valid_base58 "$anchor_identity"; then
        print_success "Anchor.toml: identity_registry is valid Base58"
    else
        print_error "Anchor.toml: identity_registry is invalid or not found: $anchor_identity"
        ((errors++))
    fi
    
    if is_valid_base58 "$anchor_compliance"; then
        print_success "Anchor.toml: compliance_aggregator is valid Base58"
    else
        print_error "Anchor.toml: compliance_aggregator is invalid or not found: $anchor_compliance"
        ((errors++))
    fi
    
    # Check 2: ids.rs IDs are valid and match Anchor.toml
    if is_valid_base58 "$ids_identity"; then
        print_success "ids.rs: IDENTITY_REGISTRY_PROGRAM_ID is valid Base58"
        if [ "$ids_identity" = "$anchor_identity" ]; then
            print_success "ids.rs matches Anchor.toml for identity_registry"
        else
            print_error "MISMATCH: ids.rs=$ids_identity vs Anchor.toml=$anchor_identity"
            ((errors++))
        fi
    else
        print_warning "ids.rs: IDENTITY_REGISTRY_PROGRAM_ID not found or invalid: $ids_identity"
    fi
    
    if is_valid_base58 "$ids_compliance"; then
        print_success "ids.rs: COMPLIANCE_AGGREGATOR_PROGRAM_ID is valid Base58"
        if [ "$ids_compliance" = "$anchor_compliance" ]; then
            print_success "ids.rs matches Anchor.toml for compliance_aggregator"
        else
            print_error "MISMATCH: ids.rs=$ids_compliance vs Anchor.toml=$anchor_compliance"
            ((errors++))
        fi
    else
        print_warning "ids.rs: COMPLIANCE_AGGREGATOR_PROGRAM_ID not found or invalid: $ids_compliance"
    fi
    
    # Check 3: TypeScript IDs are valid and match Anchor.toml
    if is_valid_base58 "$ts_solana_rwa"; then
        print_success "solana.ts: solanaRwa is valid Base58"
        if [ "$ts_solana_rwa" = "$anchor_solana_rwa" ]; then
            print_success "solana.ts matches Anchor.toml for solana_rwa"
        else
            print_error "MISMATCH: solana.ts=$ts_solana_rwa vs Anchor.toml=$anchor_solana_rwa"
            ((errors++))
        fi
    else
        print_warning "solana.ts: solanaRwa not found or invalid: $ts_solana_rwa"
    fi
    
    if is_valid_base58 "$ts_identity"; then
        print_success "solana.ts: identityRegistry is valid Base58"
        if [ "$ts_identity" = "$anchor_identity" ]; then
            print_success "solana.ts matches Anchor.toml for identity_registry"
        else
            print_error "MISMATCH: solana.ts=$ts_identity vs Anchor.toml=$anchor_identity"
            ((errors++))
        fi
    else
        print_warning "solana.ts: identityRegistry not found or invalid: $ts_identity"
    fi
    
    if is_valid_base58 "$ts_compliance"; then
        print_success "solana.ts: complianceAggregator is valid Base58"
        if [ "$ts_compliance" = "$anchor_compliance" ]; then
            print_success "solana.ts matches Anchor.toml for compliance_aggregator"
        else
            print_error "MISMATCH: solana.ts=$ts_compliance vs Anchor.toml=$anchor_compliance"
            ((errors++))
        fi
    else
        print_warning "solana.ts: complianceAggregator not found or invalid: $ts_compliance"
    fi
    
    # Check 4: All IDs are unique
    local all_ids=("$anchor_solana_rwa" "$anchor_identity" "$anchor_compliance")
    local unique_ids
    unique_ids=$(printf "%s\n" "${all_ids[@]}" | sort -u)
    local count_all=${#all_ids[@]}
    local count_unique
    count_unique=$(echo "$unique_ids" | wc -l)
    
    if [ "$count_unique" -eq "$count_all" ]; then
        print_success "All program IDs are unique"
    else
        print_error "Duplicate program IDs detected!"
        ((errors++))
    fi
    
    # Summary
    echo ""
    if [ $errors -eq 0 ]; then
        print_success "LOCALNET verification PASSED - All IDs are consistent!"
    else
        print_error "LOCALNET verification FAILED - $errors error(s) found"
    fi
    
    return $errors
}

verify_txtx() {
    local errors=0
    
    print_header "TXTX.YML Configuration Check"
    
    local txtx_file="$SCRIPT_DIR/txtx.yml"
    
    if [ ! -f "$txtx_file" ]; then
        print_error "txtx.yml not found"
        return 1
    fi
    
    print_success "txtx.yml exists"
    
    # Check that documentation/comments are present
    if grep -q "Program ID" "$txtx_file"; then
        print_success "txtx.yml contains program ID documentation"
    else
        print_warning "txtx.yml missing program ID documentation"
    fi
    
    # Check that environments are defined
    for env in localnet devnet mainnet; do
        if grep -q "^[[:space:]]*${env}:" "$txtx_file"; then
            print_success "Environment '$env' is defined"
        else
            print_error "Environment '$env' is NOT defined"
            ((errors++))
        fi
    done
    
    # Check program ID variables exist
    for var in solana_rwa_program_id identity_registry_program_id compliance_aggregator_program_id; do
        if grep -q "$var" "$txtx_file"; then
            print_success "Variable '$var' is defined"
        else
            print_error "Variable '$var' is NOT defined"
            ((errors++))
        fi
    done
    
    echo ""
    if [ $errors -eq 0 ]; then
        print_success "TXTX.YML configuration check PASSED"
    else
        print_error "TXTX.YML configuration check FAILED - $errors error(s)"
    fi
    
    return $errors
}

verify_build() {
    print_header "Build Verification"
    
    echo "Running cargo check..."
    local output
    output=$(cd "$SCRIPT_DIR" && cargo check 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        print_success "Rust compilation successful (cargo check passed)"
    else
        print_error "Rust compilation failed"
        echo "$output" | grep "^error" | head -5
        return 1
    fi
    
    # Run unit tests for ids module
    echo ""
    echo "Running ids.rs unit tests..."
    local test_output
    test_output=$(cd "$SCRIPT_DIR" && cargo test --package solana-rwa ids:: 2>&1)
    local test_exit=$?
    
    if [ $test_exit -eq 0 ]; then
        local passed
        passed=$(echo "$test_output" | grep -o '[0-9]* passed' | head -1 | grep -o '[0-9]*')
        if [ -n "$passed" ]; then
            print_success "ids.rs unit tests passed ($passed tests)"
        else
            print_success "ids.rs unit tests passed"
        fi
    else
        print_error "ids.rs unit tests failed"
        echo "$test_output" | grep "^test" | head -5
        return 1
    fi
    
    return 0
}

# =============================================================================
# USAGE / HELP
# =============================================================================

print_usage() {
    echo "Usage: $SCRIPT_NAME [OPTIONS]"
    echo ""
    echo "Program ID Consistency Verification Tool"
    echo ""
    echo "Options:"
    echo "  --all, -a          Verify all configurations (localnet + txtx + build)"
    echo "  --build, -b        Also run build verification (cargo check + tests)"
    echo "  --txtx             Only verify txtx.yml configuration"
    echo "  --help, -h         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $SCRIPT_NAME                    # Verify localnet IDs only"
    echo "  $SCRIPT_NAME --all              # Verify everything"
    echo "  $SCRIPT_NAME --build            # Verify localnet + run build checks"
    echo "  $SCRIPT_NAME --help             # Show this help"
}

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

main() {
    local verify_all=false
    local run_build=false
    local run_txtx=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --all|-a)
                verify_all=true
                run_txtx=true
                run_build=true
                shift
                ;;
            --build|-b)
                run_build=true
                shift
                ;;
            --txtx)
                run_txtx=true
                shift
                ;;
            --help|-h)
                print_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo ""
                print_usage
                exit 2
                ;;
        esac
    done
    
    # Default: verify localnet only
    if [ $verify_all = false ] && [ $run_txtx = false ]; then
        run_txtx=true
    fi
    
    local total_errors=0
    
    # Run localnet verification
    verify_localnet
    total_errors=$((total_errors + $?))
    
    # Run txtx verification
    if [ $run_txtx = true ]; then
        verify_txtx
        total_errors=$((total_errors + $?))
    fi
    
    # Run build verification
    if [ $run_build = true ]; then
        verify_build
        total_errors=$((total_errors + $?))
    fi
    
    # Final summary
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    if [ $total_errors -eq 0 ]; then
        echo -e "${GREEN}  ALL VERIFICATIONS PASSED${NC}"
        echo -e "${BLUE}============================================================${NC}"
        exit 0
    else
        echo -e "${RED}  VERIFICATION FAILED: $total_errors error(s) found${NC}"
        echo -e "${BLUE}============================================================${NC}"
        exit 1
    fi
}

main "$@"
