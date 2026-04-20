#!/bin/bash
# =============================================================================
# Solana RWA - Development Setup Script
# =============================================================================
# This script sets up the local development environment for the Solana RWA
# project using Surfpool for localnet simulation.
#
# Usage:
#   chmod +x scripts/dev-setup.sh
#   ./scripts/dev-setup.sh
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

INFO()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
SUCCESS() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
WARN()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
ERROR() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Prerequisites Check
# =============================================================================

check_command() {
    if ! command -v "$1" &> /dev/null; then
        ERROR "'$1' is not installed. Please install it first."
        return 1
    fi
    SUCCESS "'$1' found: $(command -v "$1")"
    return 0
}

echo ""
echo "============================================="
echo "  Solana RWA - Development Environment Setup"
echo "============================================="
echo ""

# Check Rust
INFO "Checking Rust..."
if check_command rustc && check_command cargo; then
    RUST_VERSION=$(rustc --version)
    SUCCESS "Rust version: $RUST_VERSION"
else
    ERROR "Rust is required. Install from: https://rustup.rs/"
    exit 1
fi

# Check Anchor
INFO "Checking Anchor CLI..."
if check_command anchor; then
    ANCHOR_VERSION=$(anchor --version 2>/dev/null || echo "unknown")
    SUCCESS "Anchor version: $ANCHOR_VERSION"
else
    WARN "Anchor CLI not found. Install with: cargo install anchor-cli"
fi

# Check Solana CLI
INFO "Checking Solana CLI..."
if check_command solana; then
    SOLANA_VERSION=$(solana --version 2>/dev/null || echo "unknown")
    SUCCESS "Solana version: $SOLANA_VERSION"
else
    WARN "Solana CLI not found. Install from: https://docs.solana.com/cli/install-solana-cli-tools"
fi

# Check Surfpool
INFO "Checking Surfpool CLI..."
if check_command surfpool; then
    SURFPOL_VERSION=$(surfpool --version 2>/dev/null || echo "unknown")
    SUCCESS "Surfpool version: $SURFPOL_VERSION"
else
    WARN "Surfpool not found. Install with: curl -sL https://run.surfpool.run/ | bash"
fi

# Check Node.js
INFO "Checking Node.js..."
if check_command node; then
    NODE_VERSION=$(node --version)
    SUCCESS "Node.js version: $NODE_VERSION"
else
    WARN "Node.js not found. Required for some tooling."
fi

echo ""

# =============================================================================
# Solana Configuration
# =============================================================================

INFO "Setting up Solana configuration..."

KEYPAIR_PATH="$HOME/.config/solana/id.json"

if [ ! -f "$KEYPAIR_PATH" ]; then
    WARN "Keypair not found at $KEYPAIR_PATH"
    read -p "  Would you like to create a new keypair? (y/N): " CREATE_KEYPAIR
    if [[ "$CREATE_KEYPAIR" =~ ^[Yy]$ ]]; then
        solana-keygen new --no-passphrase --outfile "$KEYPAIR_PATH"
        SUCCESS "New keypair created at $KEYPAIR_PATH"
    else
        WARN "Skipping keypair creation. Make sure you have a keypair configured."
    fi
else
    PUBKEY=$(solana-keygen pubkey "$KEYPAIR_PATH" 2>/dev/null || echo "unknown")
    SUCCESS "Keypair found: $PUBKEY"
fi

# Set default cluster to localnet
solana config set --url http://127.0.0.1:8899 2>/dev/null || true
SUCCESS "Solana config set to localnet (http://127.0.0.1:8899)"

echo ""

# =============================================================================
# Project Build
# =============================================================================

INFO "Building Anchor programs..."

if [ ! -f "Anchor.toml" ]; then
    ERROR "Anchor.toml not found. Are you in the correct directory?"
    exit 1
fi

if check_command anchor; then
    anchor build
    SUCCESS "All programs built successfully"
else
    WARN "Anchor not installed. Skipping build."
fi

echo ""

# =============================================================================
# Surfpool Directory Setup
# =============================================================================

INFO "Setting up Surfpool directories..."

mkdir -p .surfpool/state
mkdir -p .surfpool/logs
SUCCESS "Surfpool directories created"

echo ""

# =============================================================================
# Summary
# =============================================================================

echo "============================================="
echo "  Setup Complete!"
echo "============================================="
echo ""
echo "Next steps:"
echo ""
echo "  1. Start localnet:"
echo "     surfpool start"
echo ""
echo "  2. Deploy programs:"
echo "     surfpool run deployment --env localnet -u"
echo ""
echo "  3. Run tests:"
echo "     anchor test --provider.url http://127.0.0.1:8899"
echo ""
echo "  4. Or use watch mode for auto-redeploy:"
echo "     surfpool start --watch"
echo ""
echo "Dashboard: http://localhost:18488"
echo ""
