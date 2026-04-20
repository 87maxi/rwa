#!/bin/bash
# =============================================================================
# Solana RWA - Build All Programs
# =============================================================================
# Builds all Anchor programs and generates IDLs.
#
# Usage:
#   ./scripts/build.sh
#   ./scripts/build.sh --clean    # Clean before build
#   ./scripts/build.sh --release  # Release build
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

# Parse arguments
CLEAN_BUILD=false
RELEASE_BUILD=false

for arg in "$@"; do
    case $arg in
        --clean)
            CLEAN_BUILD=true
            ;;
        --release)
            RELEASE_BUILD=true
            ;;
        --help|-h)
            echo "Usage: $0 [--clean] [--release] [--help]"
            echo ""
            echo "Options:"
            echo "  --clean    Clean build artifacts before building"
            echo "  --release  Build in release mode (slower, optimized)"
            echo "  --help     Show this help message"
            exit 0
            ;;
        *)
            ERROR "Unknown argument: $arg"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check prerequisites
check_prerequisites() {
    local missing=0
    
    if ! command -v cargo &> /dev/null; then
        ERROR "cargo is not installed. Install from: https://rustup.rs/"
        missing=1
    fi
    
    if ! command -v anchor &> /dev/null 2>&1; then
        WARN "anchor-cli not found. Using cargo build directly."
        WARN "Install with: cargo install anchor-cli --locked"
    fi
    
    return $missing
}

# Clean build artifacts
clean_build() {
    INFO "Cleaning build artifacts..."
    
    # Clean Anchor targets
    if [ -d "target" ]; then
        rm -rf target/deploy/*.so
        rm -rf target/idl/*.json
        rm -rf target/types/*
        INFO "Cleaned Anchor target directory"
    fi
    
    # Clean program-specific targets
    for program_dir in programs/*/; do
        if [ -d "$program_dir/target" ]; then
            rm -rf "$program_dir/target"
        fi
    done
    
    SUCCESS "Build artifacts cleaned"
}

# Build programs with cargo
cargo_build() {
    local build_type="debug"
    [ "$RELEASE_BUILD" = true ] && build_type="release"
    
    INFO "Building programs with cargo ($build_type)..."
    
    # Build all programs
    cargo build --sbf --target sbf-sdf-$build_type 2>/dev/null || \
    cargo build --sbf --target sbf-sdf-$build_type -p solana-rwa -p identity-registry -p compliance-aggregator 2>/dev/null || \
    cargo build --sbf 2>/dev/null || {
        # Fallback: build each program individually
        INFO "Building each program individually..."
        for program_dir in programs/*/; do
            local program_name=$(basename "$program_dir")
            INFO "Building $program_name..."
            (cd "$program_dir" && cargo build --sbf --target sbf-sdf-$build_type 2>/dev/null || \
             cargo build --release --target sbf-sdf-$build_type 2>/dev/null || true)
        done
    }
    
    SUCCESS "Cargo build complete"
}

# Build with Anchor
anchor_build() {
    if ! command -v anchor &> /dev/null 2>&1; then
        WARN "Anchor CLI not available, skipping Anchor build"
        return 0
    fi
    
    INFO "Building programs with Anchor..."
    anchor build 2>&1 | tee .surfpool/build.log || {
        ERROR "Anchor build failed. Check .surfpool/build.log for details"
        return 1
    }
    
    SUCCESS "Anchor build complete"
}

# Copy binaries to deploy directory
copy_binaries() {
    INFO "Copying binaries to target/deploy/..."
    mkdir -p target/deploy
    
    # Copy .so files from program targets
    for program_dir in programs/*/; do
        local program_name=$(basename "$program_dir")
        local so_file="target/sbf-sdf-solana/sbf-sdf-$program_name.so"
        local release_so_file="target/release/$program_name.so"
        
        if [ -f "$so_file" ]; then
            cp "$so_file" "target/deploy/${program_name}.so"
            SUCCESS "Copied $program_name.so"
        elif [ -f "$release_so_file" ]; then
            cp "$release_so_file" "target/deploy/${program_name}.so"
            SUCCESS "Copied $program_name.so (from release)"
        fi
    done
    
    # Also try Anchor's deploy directory
    if [ -d "target/deploy-anchor" ]; then
        for so_file in target/deploy-anchor/*.so; do
            if [ -f "$so_file" ]; then
                local basename=$(basename "$so_file")
                cp "$so_file" "target/deploy/$basename"
                SUCCESS "Copied $basename from Anchor deploy"
            fi
        done
    fi
    
    SUCCESS "Binaries copied to target/deploy/"
}

# Generate IDLs
generate_idls() {
    if ! command -v anchor &> /dev/null 2>&1; then
        WARN "Anchor CLI not available, skipping IDL generation"
        return 0
    fi
    
    INFO "Generating IDLs..."
    mkdir -p target/idl
    
    for program_dir in programs/*/; do
        local program_name=$(basename "$program_dir")
        local idl_file="target/idl/${program_name}.json"
        
        INFO "Generating IDL for $program_name..."
        anchor idl parse -f "$program_dir/src/lib.rs" -o "$idl_file" 2>/dev/null || {
            # Try anchor idl build
            anchor idl build -p "$program_name" -o "$idl_file" 2>/dev/null || {
                WARN "Could not generate IDL for $program_name"
            }
        }
    done
    
    SUCCESS "IDLs generated in target/idl/"
}

# Generate TypeScript types
generate_types() {
    if ! command -v anchor &> /dev/null 2>&1; then
        WARN "Anchor CLI not available, skipping TypeScript type generation"
        return 0
    fi
    
    INFO "Generating TypeScript types..."
    mkdir -p target/types
    
    for idl_file in target/idl/*.json; do
        if [ -f "$idl_file" ]; then
            local idl_name=$(basename "$idl_file" .json)
            anchor idl ts -f "$idl_file" -o "target/types/${idl_name}.ts" 2>/dev/null || true
        fi
    done
    
    SUCCESS "TypeScript types generated in target/types/"
}

# Verify build output
verify_build() {
    INFO "Verifying build output..."
    
    local deploy_dir="target/deploy"
    local expected_programs=("solana_rwa.so" "identity_registry.so" "compliance_aggregator.so")
    local found=0
    local missing=0
    
    for program in "${expected_programs[@]}"; do
        if [ -f "$deploy_dir/$program" ]; then
            local size=$(stat -f%z "$deploy_dir/$program" 2>/dev/null || stat -c%s "$deploy_dir/$program" 2>/dev/null || echo "unknown")
            SUCCESS "Found: $program ($size bytes)"
            found=$((found + 1))
        else
            WARN "Missing: $program"
            missing=$((missing + 1))
        fi
    done
    
    if [ $missing -gt 0 ]; then
        WARN "Build verification: $missing program(s) missing from $deploy_dir/"
        return 1
    fi
    
    SUCCESS "Build verification: All $found programs found"
}

# Main execution
main() {
    echo ""
    echo "============================================="
    echo "  Solana RWA - Build Programs"
    echo "============================================="
    echo ""
    
    mkdir -p .surfpool
    
    check_prerequisites
    
    if [ "$CLEAN_BUILD" = true ]; then
        clean_build
    fi
    
    # Try Anchor build first, fall back to cargo
    if command -v anchor &> /dev/null 2>&1; then
        anchor_build
    else
        cargo_build
    fi
    
    copy_binaries
    
    if command -v anchor &> /dev/null 2>&1; then
        generate_idls
        generate_types
    fi
    
    verify_build
    
    echo ""
    SUCCESS "Build complete!"
    echo ""
    echo "Deployed binaries: target/deploy/"
    ls -la target/deploy/ 2>/dev/null || true
    echo ""
}

main "$@"
