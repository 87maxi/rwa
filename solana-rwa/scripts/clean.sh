#!/bin/bash
# =============================================================================
# Solana RWA - Clean Build Artifacts and State
# =============================================================================
# Removes build artifacts, deployment state, and temporary files.
#
# Usage:
#   ./scripts/clean.sh              # Clean everything
#   ./scripts/clean.sh --build      # Only clean build artifacts
#   ./scripts/clean.sh --state      # Only clean state files
#   ./scripts/clean.sh --idl        # Only clean IDL files
#   ./scripts/clean.sh --logs       # Only clean log files
#   ./scripts/clean.sh --all        # Clean everything (default)
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

# Parse arguments
CLEAN_BUILD=true
CLEAN_STATE=true
CLEAN_IDL=true
CLEAN_LOGS=true
CLEAN_TYPES=true

for arg in "$@"; do
    case $arg in
        --build)
            CLEAN_STATE=false; CLEAN_IDL=false; CLEAN_LOGS=false; CLEAN_TYPES=false
            ;;
        --state)
            CLEAN_BUILD=false; CLEAN_IDL=false; CLEAN_LOGS=false; CLEAN_TYPES=false
            ;;
        --idl)
            CLEAN_BUILD=false; CLEAN_STATE=false; CLEAN_LOGS=false; CLEAN_TYPES=false
            ;;
        --logs)
            CLEAN_BUILD=false; CLEAN_STATE=false; CLEAN_IDL=false; CLEAN_TYPES=false
            ;;
        --types)
            CLEAN_BUILD=false; CLEAN_STATE=false; CLEAN_IDL=false; CLEAN_LOGS=false
            ;;
        --all|--help|-h)
            # Clean everything (default)
            ;;
        *)
            echo "Usage: $0 [--build] [--state] [--idl] [--logs] [--types] [--all]"
            echo ""
            echo "Options:"
            echo "  --build    Clean build artifacts only"
            echo "  --state    Clean state files only"
            echo "  --idl      Clean IDL files only"
            echo "  --logs     Clean log files only"
            echo "  --types    Clean TypeScript types only"
            echo "  --all      Clean everything (default)"
            echo "  --help     Show this help"
            exit 0
            ;;
    esac
done

echo ""
echo "============================================="
echo "  Solana RWA - Clean"
echo "============================================="
echo ""

# Clean build artifacts
if [ "$CLEAN_BUILD" = true ]; then
    INFO "Cleaning build artifacts..."
    
    if [ -d "target/deploy" ]; then
        local count=$(find target/deploy -name "*.so" 2>/dev/null | wc -l)
        rm -rf target/deploy/*.so
        INFO "  Removed $count .so files from target/deploy/"
    fi
    
    if [ -d "target/sbf-sdf-solana" ]; then
        local count=$(find target/sbf-sdf-solana -name "*.so" 2>/dev/null | wc -l)
        rm -rf target/sbf-sdf-solana/*.so
        INFO "  Removed $count .so files from target/sbf-sdf-solana/"
    fi
    
    # Clean program-specific targets
    for program_dir in programs/*/; do
        if [ -d "$program_dir/target" ]; then
            rm -rf "$program_dir/target"
            INFO "  Cleaned $(basename "$program_dir")/target/"
        fi
    done
    
    SUCCESS "Build artifacts cleaned"
fi

# Clean state files
if [ "$CLEAN_STATE" = true ]; then
    INFO "Cleaning state files..."
    
    if [ -d ".surfpool/state" ]; then
        local count=$(find .surfpool/state -name "*.json" 2>/dev/null | wc -l)
        rm -rf .surfpool/state/*.json
        INFO "  Removed $count state files"
    fi
    
    SUCCESS "State files cleaned"
fi

# Clean IDL files
if [ "$CLEAN_IDL" = true ]; then
    INFO "Cleaning IDL files..."
    
    if [ -d "target/idl" ]; then
        local count=$(find target/idl -name "*.json" 2>/dev/null | wc -l)
        rm -rf target/idl/*.json
        INFO "  Removed $count IDL files"
    fi
    
    SUCCESS "IDL files cleaned"
fi

# Clean TypeScript types
if [ "$CLEAN_TYPES" = true ]; then
    INFO "Cleaning TypeScript types..."
    
    if [ -d "target/types" ]; then
        local count=$(find target/types -name "*.ts" 2>/dev/null | wc -l)
        rm -rf target/types/*.ts
        INFO "  Removed $type TypeScript type files"
    fi
    
    SUCCESS "TypeScript types cleaned"
fi

# Clean log files
if [ "$CLEAN_LOGS" = true ]; then
    INFO "Cleaning log files..."
    
    if [ -d ".surfpool/logs" ]; then
        local count=$(find .surfpool/logs -type f 2>/dev/null | wc -l)
        rm -rf .surfpool/logs/*
        INFO "  Removed $count log files"
    fi
    
    if [ -f ".surfpool/build.log" ]; then
        rm -f .surfpool/build.log
        INFO "  Removed build.log"
    fi
    
    if [ -f ".surfpool/pipeline.log" ]; then
        rm -f .surfpool/pipeline.log
        INFO "  Removed pipeline.log"
    fi
    
    SUCCESS "Log files cleaned"
fi

# Clean Anchor cache
if [ "$CLEAN_BUILD" = true ]; then
    INFO "Cleaning Anchor cache..."
    
    if [ -d ".anchor" ]; then
        rm -rf .anchor/cache/*
        rm -rf .anchor/program/*
        INFO "  Cleaned Anchor cache"
    fi
    
    SUCCESS "Anchor cache cleaned"
fi

echo ""
SUCCESS "Clean complete!"
echo ""
echo "Remaining directories:"
echo "  target/          - Build directory (binaries removed)"
echo "  .surfpool/       - Surfpool directory (state/logs removed)"
echo "  programs/*/      - Program source directories"
echo ""
