#!/bin/bash
# =============================================================================
# Solana RWA - Deploy Programs via Surfpool txtx Runbooks
# =============================================================================
# Deploys all programs using the txtx deployment runbook.
# Supports localnet, devnet, and mainnet environments.
#
# Usage:
#   ./scripts/deploy.sh localnet      # Deploy to localnet
#   ./scripts/deploy.sh devnet        # Deploy to devnet
#   ./scripts/deploy.sh mainnet       # Deploy to mainnet
#   ./scripts/deploy.sh localnet -f   # Force re-deploy
#   ./scripts/deploy.sh --explain     # Show deployment plan
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

# Check arguments
ENVIRONMENT="${1:-}"
FORCE_FLAG=""
EXPLAIN_MODE=false
BROWSER_MODE=false

case "$ENVIRONMENT" in
    localnet|devnet|mainnet)
        ;;
    --explain|-e)
        EXPLAIN_MODE=true
        ENVIRONMENT=""
        ;;
    --browser|-b)
        BROWSER_MODE=true
        ENVIRONMENT=""
        ;;
    --help|-h| "")
        echo "Usage: $0 [ENVIRONMENT] [OPTIONS]"
        echo ""
        echo "Environments:"
        echo "  localnet   Deploy to local Surfnet (default for development)"
        echo "  devnet     Deploy to Solana devnet"
        echo "  mainnet    Deploy to Solana mainnet"
        echo ""
        echo "Options:"
        echo "  --explain, -e    Show deployment plan without executing"
        echo "  --browser, -b    Use browser UI for supervised execution"
        echo "  --force, -f      Force re-deployment even if unchanged"
        echo "  --help, -h       Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 localnet              # Deploy to localnet (unsupervised)"
        echo "  $0 devnet                # Deploy to devnet (unsupervised)"
        echo "  $0 mainnet --browser     # Deploy to mainnet with browser approval"
        echo "  $0 localnet -f           # Force re-deploy to localnet"
        echo "  $0 --explain             # Show what would be deployed"
        exit 0
        ;;
    -f|--force)
        FORCE_FLAG="--force"
        ENVIRONMENT=""
        shift
        ENVIRONMENT="${1:-localnet}"
        ;;
    *)
        ERROR "Unknown environment: $ENVIRONMENT"
        echo "Use '$0 --help' for usage information"
        exit 1
        ;;
esac

# Default to localnet if no environment specified
[ -z "$ENVIRONMENT" ] && ENVIRONMENT="localnet"

# Validate environment
case "$ENVIRONMENT" in
    localnet|devnet|mainnet)
        ;;
    *)
        ERROR "Invalid environment: $ENVIRONMENT"
        echo "Valid environments: localnet, devnet, mainnet"
        exit 1
        ;;
esac

# Check prerequisites
if ! command -v surfpool &> /dev/null; then
    ERROR "surfpool CLI is not installed."
    echo "Install with: curl -sL https://run.surfpool.run/ | bash"
    exit 1
fi

if [ ! -f "txtx.yml" ]; then
    ERROR "txtx.yml manifest not found in $PROJECT_DIR"
    exit 1
fi

# Build programs before deploying
build_before_deploy() {
    INFO "Building programs before deployment..."
    
    if [ -f "scripts/build.sh" ]; then
        ./scripts/build.sh || {
            ERROR "Build failed. Cannot deploy."
            exit 1
        }
    elif command -v anchor &> /dev/null; then
        anchor build || {
            ERROR "Anchor build failed. Cannot deploy."
            exit 1
        }
    else
        WARN "No build system found. Assuming binaries are up to date."
    fi
}

# Check if Surfnet is running (for localnet)
check_surfnet_running() {
    if [ "$ENVIRONMENT" = "localnet" ]; then
        if ! curl -s -X POST -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","id":1,"method":"health"}' \
            http://127.0.0.1:8899 > /dev/null 2>&1; then
            WARN "Surfnet localnet does not appear to be running."
            echo ""
            echo "To start Surfnet, run:"
            echo "  surfpool start"
            echo ""
            read -p "Start Surfnet now? (y/N): " start_surfnet
            if [[ "$start_surfnet" =~ ^[Yy]$ ]]; then
                surfpool start --daemon &
                sleep 5
                INFO "Waiting for Surfnet to be ready..."
                for i in {1..30}; do
                    if curl -s -X POST -H "Content-Type: application/json" \
                        -d '{"jsonrpc":"2.0","id":1,"method":"health"}' \
                        http://127.0.0.1:8899 > /dev/null 2>&1; then
                        SUCCESS "Surfnet is ready!"
                        break
                    fi
                    sleep 1
                done
            else
                ERROR "Surfnet is required for localnet deployment."
                exit 1
            fi
        else
            SUCCESS "Surfnet localnet is running"
        fi
    fi
}

# Show deployment plan
show_plan() {
    echo ""
    echo "============================================="
    echo "  Deployment Plan"
    echo "============================================="
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Manifest:    txtx.yml"
    echo "Runbook:     deployment"
    echo ""
    echo "Programs to deploy:"
    echo "  - solana_rwa"
    echo "  - identity_registry"
    echo "  - compliance_aggregator"
    echo ""
    echo "Signers:"
    case "$ENVIRONMENT" in
        localnet)
            echo "  - payer:     svm::secret_key (~/.config/solana/id.json)"
            echo "  - authority: svm::secret_key (~/.config/solana/id.json)"
            ;;
        devnet)
            echo "  - payer:     svm::web_wallet (browser-based)"
            echo "  - authority: svm::web_wallet (browser-based)"
            ;;
        mainnet)
            echo "  - payer:     svm::web_wallet (browser-based)"
            echo "  - authority: svm::web_wallet (browser-based)"
            echo "  NOTE: Consider using squads multisig for mainnet"
            ;;
    esac
    echo ""
    echo "RPC URL:"
    case "$ENVIRONMENT" in
        localnet) echo "  http://127.0.0.1:8899" ;;
        devnet)   echo "  https://api.devnet.solana.com" ;;
        mainnet)  echo "  https://api.mainnet-beta.solana.com" ;;
    esac
    echo ""
}

# Execute deployment
execute_deployment() {
    INFO "Starting deployment to $ENVIRONMENT..."
    echo ""
    
    # Build command
    local cmd="surfpool run deployment \
        --env $ENVIRONMENT \
        --manifest-file-path ./txtx.yml"
    
    # Add force flag if specified
    [ -n "$FORCE_FLAG" ] && cmd="$cmd $FORCE_FLAG"
    
    # Add explain flag if in explain mode
    [ "$EXPLAIN_MODE" = true ] && cmd="$cmd --explain"
    
    # Add browser mode if specified
    if [ "$BROWSER_MODE" = true ]; then
        cmd="$cmd"  # Default is browser mode
    else
        cmd="$cmd -u"  # Unsupervised mode
    fi
    
    INFO "Running: $cmd"
    echo ""
    
    # Execute
    eval $cmd
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        SUCCESS "Deployment to $ENVIRONMENT completed successfully!"
    else
        ERROR "Deployment to $ENVIRONMENT failed with exit code $exit_code"
        exit $exit_code
    fi
}

# Post-deployment verification
post_deployment_check() {
    if [ "$ENVIRONMENT" = "localnet" ]; then
        INFO "Running post-deployment verification..."
        
        # Check if programs are deployed
        local deployed=$(solana program list 2>/dev/null | grep -c -E "solana_rwa|identity_registry|compliance_aggregator" || echo "0")
        
        if [ "$deployed" -gt 0 ]; then
            SUCCESS "Found $deployed deployed RWA programs"
        else
            WARN "No RWA programs found in program list"
        fi
    fi
}

# Main execution
main() {
    echo ""
    echo "============================================="
    echo "  Solana RWA - Deploy Programs"
    echo "============================================="
    echo ""
    
    if [ "$EXPLAIN_MODE" = true ]; then
        show_plan
        exit 0
    fi
    
    # Build first
    build_before_deploy
    
    # Check Surfnet for localnet
    check_surfnet_running
    
    # Execute deployment
    execute_deployment
    
    # Post-deployment check
    post_deployment_check
    
    echo ""
    SUCCESS "Deployment process complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Verify deployment: ./scripts/verify.sh $ENVIRONMENT"
    echo "  2. Run tests: anchor test --provider.url <rpc_url>"
    echo "  3. Check dashboard: http://localhost:18488 (localnet)"
    echo ""
}

main "$@"
