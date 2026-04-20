#!/bin/bash
# =============================================================================
# Solana RWA - Local Test Pipeline
# =============================================================================
# This script runs a complete local test pipeline using Surfpool:
# 1. Starts Surfpool localnet in CI mode
# 2. Deploys programs via txtx runbook
# 3. Runs Anchor tests
# 4. Cleans up
#
# Usage:
#   chmod +x scripts/test-pipeline.sh
#   ./scripts/test-pipeline.sh
# =============================================================================

set -euo pipefail

SURFPOL_PORT=8899
SURFPOL_WS_PORT=8900
SURFPOL_PID_FILE=".surfpool/surfpool.pid"
LOG_FILE=".surfpool/pipeline.log"

INFO()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $1" | tee -a "$LOG_FILE"; }
SUCCESS() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" | tee -a "$LOG_FILE"; }
ERROR() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]   $1" | tee -a "$LOG_FILE"; }
CLEANUP() {
    INFO "Cleaning up..."
    if [ -f "$SURFPOL_PID_FILE" ]; then
        PID=$(cat "$SURFPOL_PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null || true
            sleep 2
            kill -9 "$PID" 2>/dev/null || true
            INFO "Surfpool process stopped (PID: $PID)"
        fi
        rm -f "$SURFPOL_PID_FILE"
    fi
    # Also kill any remaining surfpool processes
    pkill -f "surfpool" 2>/dev/null || true
}

# Ensure cleanup on exit
trap CLEANUP EXIT

# Create directories
mkdir -p .surfpool

INFO "========================================="
INFO "  Solana RWA - Local Test Pipeline"
INFO "========================================="

# Step 1: Build programs
INFO "Step 1: Building programs..."
if command -v anchor &> /dev/null; then
    anchor build 2>&1 | tee -a "$LOG_FILE"
    SUCCESS "Build complete"
else
    ERROR "Anchor CLI not found. Please install it first."
    exit 1
fi

# Step 2: Start Surfpool
INFO "Step 2: Starting Surfpool localnet..."

# Kill any existing surfpool processes
pkill -f "surfpool" 2>/dev/null || true
sleep 1

# Start Surfpool in daemon mode
surfpool start \
    --port "$SURFPOL_PORT" \
    --ws-port "$SURFPOL_WS_PORT" \
    --ci \
    --daemon \
    2>&1 | tee -a "$LOG_FILE" &

SURFPOL_PID=$!
echo "$SURFPOL_PID" > "$SURFPOL_PID_FILE"

INFO "Surfpool started with PID: $SURFPOL_PID"

# Wait for Surfpool to be ready
INFO "Waiting for Surfpool to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"health"}' \
        "http://127.0.0.1:$SURFPOL_PORT" &> /dev/null; then
        SUCCESS "Surfpool is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        ERROR "Surfpool failed to start within ${MAX_RETRIES} seconds"
        exit 1
    fi
    sleep 1
done

# Step 3: Deploy programs
INFO "Step 3: Deploying programs via txtx runbook..."

if [ -f "txtx.yml" ]; then
    surfpool run deployment \
        --env localnet \
        -u \
        --manifest-file-path ./txtx.yml \
        2>&1 | tee -a "$LOG_FILE"
    SUCCESS "Deployment complete"
else
    WARN "txtx.yml not found. Skipping txtx deployment."
    WARN "You may need to deploy manually with: anchor deploy"
fi

# Step 4: Run Anchor tests
INFO "Step 4: Running Anchor tests..."

if command -v anchor &> /dev/null; then
    anchor test --provider.url http://127.0.0.1:$SURFPOL_PORT 2>&1 | tee -a "$LOG_FILE"
    TEST_STATUS=$?
    
    if [ $TEST_STATUS -eq 0 ]; then
        SUCCESS "All tests passed!"
    else
        ERROR "Tests failed with exit code: $TEST_STATUS"
        exit $TEST_STATUS
    fi
else
    WARN "Anchor CLI not found. Skipping Anchor tests."
fi

# Step 5: Verify deployed programs
INFO "Step 5: Verifying deployed programs..."

if command -v solana &> /dev/null; then
    solana config set --url http://127.0.0.1:$SURFPOL_PORT 2>/dev/null || true
    INFO "Deployed programs:"
    solana program list 2>&1 | tee -a "$LOG_FILE"
fi

SUCCESS "========================================="
SUCCESS "  Pipeline Complete!"
SUCCESS "========================================="
INFO "Logs saved to: $LOG_FILE"
INFO "Dashboard was available at: http://localhost:18488 (during run)"
