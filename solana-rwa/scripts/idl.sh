#!/bin/bash
# =============================================================================
# Solana RWA - IDL Management
# =============================================================================
# Extracts, compares, and manages Interface Description Languages (IDLs)
# for all Anchor programs.
#
# Usage:
#   ./scripts/idl.sh extract      # Extract all IDLs
#   ./scripts/idl.sh compare      # Compare IDLs with source
#   ./scripts/idl.sh ts           # Generate TypeScript types
#   ./scripts/idl.sh diff [prog]  # Show IDL diff
#   ./scripts/idl.sh list         # List all IDLs
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

# Programs
PROGRAMS=("solana-rwa" "identity-registry" "compliance-aggregator")
PROGRAM_DISPLAY_NAMES=("solana_rwa" "identity_registry" "compliance_aggregator")

# Check prerequisites
if ! command -v anchor &> /dev/null 2>&1; then
    ERROR "Anchor CLI is not installed."
    echo "Install with: cargo install anchor-cli --locked"
    exit 1
fi

# Extract IDLs
extract_idls() {
    echo ""
    echo "============================================="
    echo "  Extracting IDLs"
    echo "============================================="
    echo ""
    
    mkdir -p target/idl
    
    for i in "${!PROGRAMS[@]}"; do
        local program="${PROGRAMS[$i]}"
        local display="${PROGRAM_DISPLAY_NAMES[$i]}"
        local idl_file="target/idl/${display}.json"
        
        INFO "Extracting IDL for $display..."
        
        # Try anchor idl build first
        if anchor idl build -p "$program" -o "$idl_file" 2>/dev/null; then
            SUCCESS "✓ $display.idl.json"
        else
            # Fallback: try to parse from source
            WARN "anchor idl build failed for $program, trying parse..."
            
            local src_file="programs/$program/src/lib.rs"
            if [ -f "$src_file" ]; then
                anchor idl parse -f "$src_file" -o "$idl_file" 2>/dev/null && {
                    SUCCESS "✓ $display.idl.json (parsed)"
                } || {
                    ERROR "✗ $display - Could not extract IDL"
                }
            else
                ERROR "✗ $display - Source file not found"
            fi
        fi
    done
    
    echo ""
    SUCCESS "IDLs extracted to target/idl/"
    ls -la target/idl/*.json 2>/dev/null || true
}

# Compare IDLs
compare_idls() {
    echo ""
    echo "============================================="
    echo "  Comparing IDLs"
    echo "============================================="
    echo ""
    
    local idl_dir="target/idl"
    local backup_dir="target/idl/backup"
    
    mkdir -p "$backup_dir"
    
    for i in "${!PROGRAMS[@]}"; do
        local display="${PROGRAM_DISPLAY_NAMES[$i]}"
        local current="$idl_dir/${display}.json"
        local backup="$backup_dir/${display}.json"
        
        if [ -f "$current" ]; then
            if [ -f "$backup" ]; then
                if diff -q "$current" "$backup" > /dev/null 2>&1; then
                    SUCCESS "✓ $display - IDL unchanged"
                else
                    WARN "⚠ $display - IDL has changed"
                    echo "  Differences:"
                    diff "$backup" "$current" | head -20
                fi
            else
                INFO "  $display - No previous IDL to compare"
            fi
        fi
    done
    
    echo ""
}

# Generate TypeScript types
generate_ts_types() {
    echo ""
    echo "============================================="
    echo "  Generating TypeScript Types"
    echo "============================================="
    echo ""
    
    mkdir -p target/types
    
    for idl_file in target/idl/*.json; do
        if [ -f "$idl_file" ]; then
            local idl_name=$(basename "$idl_file" .json)
            local ts_file="target/types/${idl_name}.ts"
            
            INFO "Generating types for $idl_name..."
            
            if anchor idl ts -f "$idl_file" -o "$ts_file" 2>/dev/null; then
                SUCCESS "✓ ${idl_name}.ts"
            else
                ERROR "✗ $idl_name - Could not generate types"
            fi
        fi
    done
    
    echo ""
    SUCCESS "TypeScript types generated in target/types/"
    ls -la target/types/*.ts 2>/dev/null || true
}

# Show IDL diff
show_diff() {
    local program="${1:-}"
    
    if [ -n "$program" ]; then
        # Find matching IDL file
        for display in "${PROGRAM_DISPLAY_NAMES[@]}"; do
            if [[ "$display" == *"$program"* ]]; then
                local idl_file="target/idl/${display}.json"
                if [ -f "$idl_file" ]; then
                    echo ""
                    echo "IDL for $display:"
                    echo "=================="
                    jq . "$idl_file" 2>/dev/null || cat "$idl_file"
                else
                    ERROR "IDL file not found: $idl_file"
                fi
                return
            fi
        done
        ERROR "Program not found: $program"
    else
        # Show all IDLs
        for idl_file in target/idl/*.json; do
            if [ -f "$idl_file" ]; then
                local name=$(basename "$idl_file")
                echo ""
                echo "$name:"
                echo "$(printf '=%.0s' {1..40})"
                jq . "$idl_file" 2>/dev/null || cat "$idl_file"
                echo ""
            fi
        done
    fi
}

# List IDLs
list_idls() {
    echo ""
    echo "============================================="
    echo "  IDL Files"
    echo "============================================="
    echo ""
    
    local idl_dir="target/idl"
    
    if [ ! -d "$idl_dir" ]; then
        WARN "IDL directory not found: $idl_dir"
        echo "Run: ./scripts/idl.sh extract"
        return
    fi
    
    for idl_file in "$idl_dir"/*.json; do
        if [ -f "$idl_file" ]; then
            local name=$(basename "$idl_file")
            local size=$(stat -f%z "$idl_file" 2>/dev/null || stat -c%s "$idl_file" 2>/dev/null || echo "?")
            local modified=$(stat -f%Sm "$idl_file" 2>/dev/null || stat -c%y "$idl_file" 2>/dev/null || echo "?")
            
            # Extract version if available
            local version=$(jq -r '.version // "unknown"' "$idl_file" 2>/dev/null || echo "unknown")
            
            echo "  $name"
            INFO "    Size:    $size bytes"
            INFO "    Modified: $modified"
            INFO "    Version:  $version"
            echo ""
        fi
    done
}

# Show help
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  extract          Extract IDLs from all programs"
    echo "  compare          Compare IDLs with previous versions"
    echo "  ts               Generate TypeScript types from IDLs"
    echo "  diff [program]   Show IDL content (optionally for specific program)"
    echo "  list             List all IDL files"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 extract"
    echo "  $0 ts"
    echo "  $0 diff solana_rwa"
    echo "  $0 list"
}

# Main execution
COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
    extract)
        extract_idls
        ;;
    compare)
        compare_idls
        ;;
    ts)
        generate_ts_types
        ;;
    diff)
        show_diff "$@"
        ;;
    list)
        list_idls
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        ERROR "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
