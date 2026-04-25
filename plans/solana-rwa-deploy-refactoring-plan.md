# Solana RWA - Deploy Refactoring Plan

> **Fecha:** 2026-04-24
> **Versión:** 1.0
> **Proyecto:** Solana RWA Token Platform
> **Estado:** Propuesta de Refactorización

---

## Tabla de Contenidos

1. [Análisis Profundo del Estado Actual](#análisis-profundo-del-estado-actual)
2. [Problemas Identificados](#problemas-identificados)
3. [Nueva Arquitectura Propuesta](#nueva-arquitectura-propuesta)
4. [Nueva Estructura de Directorios](#nueva-estructura-de-directorios)
5. [Plan de Migración Paso a Paso](#plan-de-migración-paso-a-paso)
6. [Configuraciones Estándar](#configuraciones-estándar)
7. [Workflow de Deploy Local con Surfpool](#workflow-de-deploy-local-con-surfpool)
8. [Gestión de Program IDs](#gestión-de-program-ids)
9. [Testing y Verificación](#testing-y-verificación)
10. [Cronograma Estimado](#cronograma-estimado)

---

## Análisis Profundo del Estado Actual

### Inventario Actual

```
solana-rwa/                          # Raíz del proyecto Solana
├── Anchor.toml                      # ✅ Bien estructurado
├── Cargo.toml                       # ✅ Workspace básico
├── txtx.yml                         # ⚠️ 341 líneas, mezcla config + metadata
├── scripts/                         # ⚠️ 10 scripts, duplicación de lógica
│   ├── build.sh
│   ├── clean.sh
│   ├── deploy.sh                    # 299 líneas, complejo
│   ├── dev-setup.sh                 # 178 líneas
│   ├── env.sh
│   ├── idl.sh
│   ├── init.sh                      # 228 líneas
│   ├── keys.sh
│   ├── status.sh
│   ├── test-pipeline.sh
│   ├── upgrade.sh
│   └── verify.sh
├── programs/                        # ✅ 3 programas Anchor
│   ├── solana-rwa/
│   ├── identity-registry/
│   └── compliance-aggregator/
├── runbooks/                        # ⚠️ TXTX DSL, estructura irregular
│   ├── README.md
│   ├── compliance-initialization/
│   │   ├── init.sh                  # ⚠️ Duplicado con scripts/init.sh
│   │   └── main.tx
│   ├── deployment/
│   │   ├── main.tx
│   │   └── signers.{localnet,devnet,mainnet}.tx
│   ├── identity-initialization/
│   │   ├── init.sh                  # ⚠️ Duplicado
│   │   └── main.tx
│   ├── setup-surfnet/
│   │   └── setup-surfnet.tx
│   ├── token-initialization/
│   │   ├── init.sh                  # ⚠️ Duplicado
│   │   └── main.tx
│   ├── token-operations/
│   │   └── token-operations.tx
│   └── upgrade/
│       └── upgrade.tx
├── tests/                           # ✅ Tests Anchor + TS
├── docs/                            # ⚠️ 4 documentos, mucha info duplicada
│   ├── DEPLOYMENT_SYSTEM.md
│   ├── SECURITY_ANALYSIS.md
│   ├── SURFPOL_DEPLOYMENT_SYSTEM.md
│   └── SURFPOL_TXTX_DEEP_ANALYSIS.md  # 1256 líneas
├── migrations/
│   └── deploy.ts
├── .surfpool/                       # State directory
├── deploy_output.log                # ⚠️ Artefacto de build
├── deploy_simple.sh                 # ⚠️ Script alternativo no integrado
└── [varios .md de análisis]         # ⚠️ REPORTES sin accionables
```

### Dependencias del Stack

```
┌───────────────────────────────────────────────────────────────┐
│                     Stack Tecnológico                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Desarrollo:                                                  │
│  ├── Rust + Cargo              (compilador)                  │
│  ├── Anchor Framework          (programas)                   │
│  ├── Solana CLI                (interacción red)             │
│  ├── Surfpool CLI              (test-validator mejorado)     │
│  └── TXTX CLI                  (IaC deployment)              │
│                                                               │
│  Frontend:                                                    │
│  ├── Next.js                   (app web)                     │
│  ├── @solana/web3.js           (interacción Solana)          │
│  └── custom Anchor client      (web/src/anchor/client.ts)    │
│                                                               │
│  Testing:                                                     │
│  ├── Chai + Mocha              (tests TS)                    │
│  └── Anchor integration tests  (tests Rust/TS)               │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Problemas Identificados

### CRÍTICOS

| # | Problema | Impacto | Archivo(s) Afectado(s) |
|---|----------|---------|------------------------|
| C1 | **12 scripts bash dispersos** | Dificulta onboarding, duplicación de lógica | `scripts/*.sh` |
| C2 | **txtx.yml mezcla config y documentación** | 341 líneas con 40%+ siendo docs | `txtx.yml` |
| C3 | **init.sh duplicado en cada runbook + scripts/** | Código repetido, inconsistencia | `runbooks/*/init.sh` vs `scripts/init.sh` |
| C4 | **Documentación duplicada y fragmentada** | 4+ docs hablan de lo mismo | `docs/*.md` |
| C5 | **Program IDs en 6+ lugares sin fuente única** | Inconsistencias frecuentes | `Anchor.toml`, `ids.rs`, `txtx.yml`, `solana.ts`, runbooks |

### ALTOS

| # | Problema | Impacto |
|---|----------|---------|
| H1 | **Sin unificación de workflow** | 3 formas diferentes de deploy (scripts bash, surfpool run, txtx run) |
| H2 | **Estado Surfpool no versionado, no documentado** | `.surfpool/state/` inconsistente |
| H3 | **Signers dispersos en 3 archivos por runbook** | `signers.localnet.tx`, `signers.devnet.tx`, etc. |
| H4 | **Sin pipeline CI/CD** | Deploy manual propenso a errores |

### MEDIOS

| # | Problema | Impacto |
|---|----------|---------|
| M1 | **Artefactos de build en repo** | `deploy_output.log`, reports de análisis |
| M2 | **Falta de .gitignore completo** | Archivos temporales podrían ser committeados |
| M3 | **Múltiples documentos de análisis sin acción** | `ANALYSIS_REPORT.md`, `COMPREHENSIVE_ANALYSIS_REPORT.md`, etc. |

---

## Nueva Arquitectura Propuesta

### Principios de Diseño

1. **Single Source of Truth**: Cada configuración vive en UN solo lugar
2. **Unificado Workflow**: Un comando → todo el flujo de vida del proyecto
3. **Separation of Concerns**: Config ≠ Código ≠ Documentación
4. **Convention over Configuration**: Defaults razonables, overrides explícitos
5. **Local-First Development**: Surfpool como ambiente primario
6. **Progressive Disclosure**: Simple por defecto, potente cuando se necesita

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Nueva Arquitectura de Deploy                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    rwa-cli (Single Entry Point)                  │    │
│  │                  ~/.local/bin/rwa-cli o ./bin/rwa                │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                                                                 │    │
│  │  rwa build          → Compila todos los programas               │    │
│  │  rwa test           → Ejecuta todos los tests                   │    │
│  │  rwa deploy local   → Deploy completo a surfpool/surfnet        │    │
│  │  rwa deploy devnet  → Deploy a devnet con web wallet            │    │
│  │  rwa deploy main    → Deploy a mainnet con multisig             │    │
│  │  rwa init           → Inicializa programas post-deploy           │    │
│  │  rwa upgrade        → Upgrade de programas existentes            │    │
│  │  rwa status         → Estado de programas en red                 │    │
│  │  rwa idl            → Genera/extrae IDLs                        │    │
│  │  rwa clean          → Limpia artefactos de build                 │    │
│  └────────────┬────────────────────────────────────────────────────┘    │
│               │                                                         │
│               ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Configuración Centralizada                     │    │
│  │                     rwa.config.yaml                              │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                                                                 │    │
│  │  - Program IDs (fuente única para todos los subsistemas)         │    │
│  │  - Network endpoints                                            │    │
│  │  - Signer configuration                                         │    │
│  │  - Token parameters                                              │    │
│  │  - Environment overrides                                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   Surfpool / TXTX Integration                     │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                                                                 │    │
│  │  rwa-cli orquestra:                                             │    │
│  │  ├── surfpool start/stop (runtime)                              │    │
│  │  ├── surfpool run (execution)                                  │    │
│  │  └── txtx validate (config check)                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Nueva Estructura de Directorios

### Propuesta

```
solana-rwa/
├── Anchor.toml                          # Anchor config (sin cambios mayores)
├── Cargo.toml                           # Workspace config
├── rust-toolchain.toml                  # Versión de Rust
├── rwa.config.yaml                      # 🆕 CONFIGURACIÓN ÚNICA (fuente de verdad)
├── rwa-cli                              # 🆕 CLI unificado (bash script)
├── .gitignore                           # ✅ Gitignore completo
├── .env.example                         # 🆕 Template de variables de ambiente
│
├── programs/                            # Programas Anchor (sin cambios)
│   ├── solana-rwa/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   ├── identity-registry/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   └── compliance-aggregator/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs
│
├── bin/                                 # 🆕 Scripts ejecutables (reemplaza scripts/)
│   └── rwa                              # CLI principal (reemplaza todos los *.sh)
│
├── config/                              # 🆕 Configuraciones por ambiente
│   ├── default.yaml                     # Valores por defecto globales
│   ├── localnet.yaml                    # Configuración localnet
│   ├── devnet.yaml                      # Configuración devnet
│   └── mainnet.yaml                     # Configuración mainnet
│
├── deploy/                              # 🆕 Todo lo relacionado con deployment
│   ├── runbooks/                        # TXTX runbooks (limpiados)
│   │   ├── deployment/
│   │   │   ├── main.tx                  # Deploy de programas
│   │   │   └── signers.localnet.tx      # Signers solo para localnet
│   │   ├── initialization/
│   │   │   ├── main.tx                  # Init de todos los programas
│   │   │   └── signers.localnet.tx
│   │   ├── operations/
│   │   │   └── main.tx                  # Token operations
│   │   └── upgrade/
│   │       └── main.tx                  # Upgrade de programas
│   ├── state/                           # .surfpool/state (versionado mínimo)
│   │   └── .gitignore                   # No versionar contenido
│   └── scripts/                         # Scripts de helper para runbooks
│       ├── extract-program-ids.sh       # Extrae program IDs post-deploy
│       └── validate-deployment.sh       # Valida deployment exitoso
│
├── tests/                               # Tests (organizados)
│   ├── unit/                            # Tests unitarios
│   │   ├── solana-rwa.test.ts
│   │   ├── identity-registry.test.ts
│   │   └── compliance-aggregator.test.ts
│   ├── integration/                     # Tests de integración
│   │   ├── frontend-integration.test.ts
│   │   └── cross-program.test.ts
│   └── security/                        # Tests de seguridad
│       ├── solana-rwa-security.test.ts
│       ├── identity-registry-security.test.ts
│       └── compliance-aggregator-security.test.ts
│
├── idl/                                 # 🆕 IDLs generados (source of truth)
│   ├── solana-rwa.json
│   ├── identity-registry.json
│   └── compliance-aggregator.json
│
├── types/                               # 🆕 TypeScript types generados
│   ├── solana-rwa.ts
│   ├── identity-registry.ts
│   └── compliance-aggregator.ts
│
├── docs/                                # 🔄 Documentación reorganizada
│   ├── README.md                        # Inicio rápido
│   ├── GETTING_STARTED.md               # Setup del ambiente
│   ├── DEPLOYMENT.md                    # Guía de deployment
│   ├── ARCHITECTURE.md                  # Arquitectura del sistema
│   ├── API.md                           # API de los programas
│   └── SECURITY.md                      # Notas de seguridad
│
├── web/                                 # Frontend (sin cambios estructurales)
│   ├── src/anchor/client.ts
│   └── src/config/solana.ts
│
├── migrations/                          # Migrations (sin cambios)
│   └── deploy.ts
│
└── target/                              # Artefactos de build (.gitignore)
    ├── deploy/
    ├── idl/
    ├── types/
    └── release/
```

### Cambios Clave

| Antes | Después | Razón |
|-------|---------|-------|
| `scripts/*.sh` (12 archivos) | `bin/rwa` (1 CLI unificado) | Single entry point |
| `runbooks/*/{init.sh,main.tx}` | `deploy/runbooks/` (solo `.tx`) | Eliminar duplicación |
| `txtx.yml` (341 líneas) | `rwa.config.yaml` (100 líneas) | Separar config de docs |
| `docs/` (4 docs duplicados) | `docs/` (5 docs enfocados) | Separation of concerns |
| Program IDs en 6+ lugares | `rwa.config.yaml` + `Anchor.toml` | Single source of truth |
| `runbooks/deployment/signers.*.tx` | `deploy/runbooks/*/signers.*.tx` | Agrupado por runbook |

---

## Configuraciones Estándar

### rwa.config.yaml (Fuente Única de Verdad)

```yaml
# =============================================================================
# Solana RWA - Configuration
# Single source of truth for all program IDs, network endpoints, and settings
# =============================================================================

project:
  name: solana-rwa
  version: 1.0.0

# =============================================================================
# Network Configuration
# =============================================================================
networks:
  localnet:
    rpc_url: http://127.0.0.1:8899
    websocket_url: ws://127.0.0.1:8900
    dashboard_url: http://localhost:18488
    wallet_path: ~/.config/solana/id.json
    surfpool:
      enabled: true
      auto_start: true
      instant_deployment: true

  devnet:
    rpc_url: https://api.devnet.solana.com
    websocket_url: wss://api.devnet.solana.com
    explorer_url: https://explorer.solana.com/?cluster=devnet
    wallet_type: web_wallet

  mainnet:
    rpc_url: https://api.mainnet-beta.solana.com
    websocket_url: wss://api.mainnet-beta.solana.com
    explorer_url: https://explorer.solana.com/?cluster=mainnet
    wallet_type: multisig

# =============================================================================
# Program IDs (Single Source of Truth)
# =============================================================================
programs:
  # Localnet - Generated by Anchor, stored here after first deploy
  localnet:
    solana_rwa: "7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L"
    identity_registry: "3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5"
    compliance_aggregator: "3nf1C8FuDP5SreRF6WZAiiRDpNS4LLbemZPefde5Mre3"

  # Devnet - POPULATED AFTER DEPLOYMENT
  devnet:
    solana_rwa: ""
    identity_registry: ""
    compliance_aggregator: ""

  # Mainnet - POPULATED AFTER DEPLOYMENT
  mainnet:
    solana_rwa: ""
    identity_registry: ""
    compliance_aggregator: ""

# =============================================================================
# Token Configuration
# =============================================================================
token:
  name: "RWA Token"
  symbol: "RWA"
  decimals: 9

# =============================================================================
# Dependency Order
# =============================================================================
deployment:
  order:
    - compliance_aggregator
    - identity_registry
    - solana_rwa

# =============================================================================
# Signers
# =============================================================================
signers:
  localnet:
    payer:
      type: secret_key
      path: ~/.config/solana/id.json
    authority:
      type: secret_key
      path: ~/.config/solana/id.json
  devnet:
    payer:
      type: web_wallet
    authority:
      type: web_wallet
  mainnet:
    payer:
      type: multisig
      threshold: 2
    authority:
      type: multisig
      threshold: 3
```

### Config por Ambiente (Overlays)

```yaml
# config/localnet.yaml
# Overrides para localnet
network: localnet

surfpool:
  auto_start: true
  instant_deployment: true
  airdrop_amount: 100  # SOL

initialization:
  usdc_amount: 1000
  clone_token_program: true
```

```yaml
# config/devnet.yaml
# Overrides para devnet
network: devnet

signer:
  type: web_wallet
  require_confirmation: true

deployment:
  require_tests_pass: true
  require_validation: true
```

---

## CLI Unificado: `bin/rwa`

### Interface del CLI

```bash
#!/usr/bin/env bash
# =============================================================================
# Solana RWA CLI - Single entry point for all operations
# =============================================================================

set -euo pipefail

VERSION="1.0.0"
CONFIG_FILE="rwa.config.yaml"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

# =============================================================================
# Helper Functions
# =============================================================================

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

usage() {
    cat <<EOF
Solana RWA CLI v${VERSION}

Usage: rwa <command> [environment] [options]

Commands:
  Setup
    setup             Install all dependencies
    config <env>      Show configuration for environment

  Build & Test
    build             Compile all programs
    test              Run all tests
    test <program>    Run tests for specific program

  Deploy
    deploy local      Deploy to local surfpool (full pipeline)
    deploy devnet     Deploy to devnet
    deploy mainnet    Deploy to mainnet
    deploy --only-build  Only compile, skip deploy
    deploy --only-init   Only initialize, skip deploy

  Init & Operations
    init              Initialize deployed programs
    upgrade <program> Upgrade a specific program
    mint <amount>     Mint tokens (localnet)
    add-agent <pub>   Add agent (localnet)

  Status & Info
    status            Show program status on network
    idl               Generate or show IDLs
    programs          List deployed programs

  Utilities
    clean             Remove build artifacts
    validate          Validate configuration
    help              Show this help

Examples:
    rwa setup                    # Install dependencies
    rwa build                    # Compile programs
    rwa deploy local             # Full local deployment
    rwa status local             # Check deployment status
    rwa clean                    # Clean build artifacts
EOF
}

# =============================================================================
# Commands
# =============================================================================

cmd_setup() {
    log_info "Setting up Solana RWA development environment..."
    
    # Check prerequisites
    for cmd in rustc cargo solana anchor surfpool node; do
        if command -v "$cmd" &>/dev/null; then
            log_ok "$cmd found: $(command -v "$cmd")"
        else
            log_warn "$cmd not found. Install it first."
        fi
    done
    
    # Install JS dependencies
    if [ -f "web/package.json" ]; then
        log_info "Installing web dependencies..."
        cd web && npm install && cd ..
    fi
    
    # Build programs
    cmd_build
    
    log_ok "Setup complete!"
}

cmd_build() {
    log_info "Building Solana RWA programs..."
    anchor build || { log_error "Build failed"; exit 1; }
    log_ok "Build complete!"
}

cmd_test() {
    local program="${1:-}"
    
    if [ -n "$program" ]; then
        log_info "Running tests for $program..."
        anchor test --localnet -- --grep "$program"
    else
        log_info "Running all tests..."
        anchor test --localnet
    fi
}

cmd_deploy() {
    local env="${1:-local}"
    local only_build=false
    local only_init=false
    
    # Parse flags
    shift || true
    while [[ $# -gt 0 ]]; do
        case $1 in
            --only-build) only_build=true; shift ;;
            --only-init) only_init=true; shift ;;
            *) shift ;;
        esac
    done
    
    case "$env" in
        local|localnet)
            _deploy_localnet "$only_build" "$only_init"
            ;;
        devnet)
            _deploy_devnet
            ;;
        mainnet|main)
            _deploy_mainnet
            ;;
        *)
            log_error "Invalid environment: $env"
            echo "Valid: local, devnet, mainnet"
            exit 1
            ;;
    esac
}

_deploy_localnet() {
    local only_build="$1"
    local only_init="$2"
    
    log_info "=== Deploying to Localnet (Surfpool) ==="
    
    # Step 1: Build
    if [ "$only_build" = false ]; then
        cmd_build
        
        # Step 2: Start Surfpool
        log_info "Starting Surfpool..."
        surfpool start --detach || { log_error "Failed to start Surfpool"; exit 1; }
        
        # Wait for validator to be ready
        log_info "Waiting for validator..."
        sleep 5
        
        # Step 3: Setup Surfnet
        log_info "Setting up Surfnet (airdrop, token accounts)..."
        surfpool run setup-surfnet --env localnet -u --force
        
        # Step 4: Deploy programs
        log_info "Deploying programs..."
        surfpool run deployment --env localnet -u --force
        
        # Step 5: Extract program IDs
        log_info "Extracting program IDs..."
        ./deploy/scripts/extract-program-ids.sh localnet rwa.config.yaml
        
        # Step 6: Initialize programs
        if [ "$only_init" = false ]; then
            log_info "Initializing programs..."
            surfpool run compliance-initialization --env localnet -u
            surfpool run identity-initialization --env localnet -u
            surfpool run token-initialization --env localnet -u
        fi
        
        # Step 7: Sync config files
        log_info "Syncing configuration files..."
        _sync_program_ids localnet
        
        log_ok "Localnet deployment complete!"
    else
        cmd_build
        log_ok "Build only complete!"
    fi
}

_deploy_devnet() {
    log_info "=== Deploying to Devnet ==="
    log_warn "This will cost SOL. Ensure you have devnet tokens."
    
    # Build
    cmd_build
    
    # Validate
    log_info "Validating configuration..."
    txtx validate || { log_error "Validation failed"; exit 1; }
    
    # Deploy
    log_info "Deploying programs (expect browser prompts for signing)..."
    txtx run deployment --env devnet -u
    
    # Extract and sync
    log_info "Extracting program IDs..."
    ./deploy/scripts/extract-program-ids.sh devnet rwa.config.yaml
    
    # Initialize
    log_info "Initializing programs..."
    txtx run compliance-initialization --env devnet -u
    txtx run identity-initialization --env devnet -u
    txtx run token-initialization --env devnet -u
    
    # Sync all config files
    _sync_program_ids devnet
    
    log_ok "Devnet deployment complete!"
}

_deploy_mainnet() {
    log_info "=== Deploying to Mainnet ==="
    log_warn "PRODUCTION DEPLOYMENT. Ensure audit is complete."
    
    # Pre-deployment checks
    if ! command -v anchor &>/dev/null; then
        log_error "Anchor required for mainnet deployment"
        exit 1
    fi
    
    cmd_build
    cmd_test  # Require all tests pass
    
    log_info "Deploying programs (expect browser/hardware wallet prompts)..."
    txtx run deployment --env mainnet -u
    
    # Extract and sync
    ./deploy/scripts/extract-program-ids.sh mainnet rwa.config.yaml
    _sync_program_ids mainnet
    
    log_ok "Mainnet deployment complete!"
}

cmd_init() {
    local env="${1:-local}"
    
    log_info "Initializing programs on $env..."
    
    case "$env" in
        local|localnet)
            surfpool run compliance-initialization --env localnet -u
            surfpool run identity-initialization --env localnet -u
            surfpool run token-initialization --env localnet -u
            ;;
        devnet|mainnet)
            txtx run compliance-initialization --env "$env" -u
            txtx run identity-initialization --env "$env" -u
            txtx run token-initialization --env "$env" -u
            ;;
    esac
    
    log_ok "Initialization complete!"
}

cmd_upgrade() {
    local program="${1:-}"
    local env="${2:-local}"
    
    if [ -z "$program" ]; then
        log_error "Specify program to upgrade: compliance_aggregator | identity_registry | solana_rwa"
        exit 1
    fi
    
    log_info "Upgrading $program on $env..."
    
    # Build first
    cmd_build
    
    case "$env" in
        local|localnet)
            surfpool run upgrade --env localnet -u --force
            ;;
        devnet|mainnet)
            txtx run upgrade --env "$env" -u
            ;;
    esac
    
    log_ok "Upgrade complete!"
}

cmd_status() {
    local env="${1:-local}"
    
    case "$env" in
        local|localnet)
            local rpc="http://127.0.0.1:8899"
            ;;
        devnet)
            local rpc="https://api.devnet.solana.com"
            ;;
        mainnet|main)
            local rpc="https://api.mainnet-beta.solana.com"
            ;;
        *)
            log_error "Invalid environment: $env"
            exit 1
            ;;
    esac
    
    log_info "Checking programs on $env ($rpc)..."
    
    # Read program IDs from config
    local solana_id identity_id compliance_id
    # Parse from rwa.config.yaml (simplified)
    
    log_ok "Status check complete. See Solana Explorer for details."
}

cmd_idl() {
    log_info "Generating IDLs..."
    anchor idl parse -f programs/solana-rwa/src/lib.rs -o idl/solana-rwa.json 2>/dev/null || true
    anchor idl parse -f programs/identity-registry/src/lib.rs -o idl/identity-registry.json 2>/dev/null || true
    anchor idl parse -f programs/compliance-aggregator/src/lib.rs -o idl/compliance-aggregator.json 2>/dev/null || true
    log_ok "IDLs generated in idl/"
}

cmd_clean() {
    log_info "Cleaning build artifacts..."
    anchor clean 2>/dev/null || true
    rm -rf target/
    rm -rf node_modules/ web/node_modules/
    rm -rf .surfpool/state/ .surfpool/logs/
    rm -f *.log
    log_ok "Clean complete!"
}

cmd_validate() {
    log_info "Validating configuration..."
    txtx validate || { log_error "Validation failed"; exit 1; }
    log_ok "Configuration valid!"
}

# =============================================================================
# Config Sync Helpers
# =============================================================================

_sync_program_ids() {
    local env="$1"
    # This function reads program IDs from deploy output and updates:
    # 1. rwa.config.yaml
    # 2. Anchor.toml
    # 3. web/src/config/solana.ts
    # 4. programs/*/src/ids.rs
    log_info "Syncing program IDs for $env to all config files..."
}

# =============================================================================
# Main Entry Point
# =============================================================================

case "${1:-help}" in
    setup) shift; cmd_setup "$@" ;;
    build) shift; cmd_build "$@" ;;
    test) shift; cmd_test "$@" ;;
    deploy) shift; cmd_deploy "$@" ;;
    init) shift; cmd_init "$@" ;;
    upgrade) shift; cmd_upgrade "$@" ;;
    status) shift; cmd_status "$@" ;;
    idl) shift; cmd_idl "$@" ;;
    clean) shift; cmd_clean "$@" ;;
    validate) shift; cmd_validate "$@" ;;
    help|--help|-h) usage ;;
    *) usage ;;
esac
```

---

## Workflow de Deploy Local con Surfpool

### Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  Complete Localnet Deployment Workflow                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 1: rwa setup                                                      │
│       │                                                                  │
│       ├─ Check prerequisites (rust, cargo, solana, anchor, surfpool)    │
│       ├─ Install npm dependencies                                       │
│       └─ Build all programs                                             │
│                                                                         │
│  Step 2: rwa deploy local                                               │
│       │                                                                  │
│       ├─ Build programs (anchor build)                                  │
│       ├─ Start surfpool (solana-test-validator)                         │
│       ├─ Wait for validator ready                                       │
│       ├─ Run setup-surfnet (airdrop, token accounts)                    │
│       ├─ Run deployment (deploy 3 programs)                             │
│       ├─ Extract program IDs from deploy output                         │
│       ├─ Sync program IDs to all config files                           │
│       ├─ Run compliance-initialization                                   │
│       ├─ Run identity-initialization                                    │
│       └─ Run token-initialization                                       │
│                                                                         │
│  Step 3: rwa status local                                               │
│       │                                                                  │
│       └─ Show all deployed programs and their status                    │
│                                                                         │
│  Step 4: rwa test                                                       │
│       │                                                                  │
│       └─ Run all tests against running localnet                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Comandos Rápidos

| Acción | Comando |
|--------|---------|
| Setup completo | `rwa setup` |
| Build solo | `rwa build` |
| Deploy local completo | `rwa deploy local` |
| Deploy sin init | `rwa deploy local --only-build` |
| Init solo | `rwa init` |
| Tests | `rwa test` |
| Status | `rwa status local` |
| Upgrade | `rwa upgrade solana_rwa local` |
| Limpiar | `rwa clean` |
| Validar | `rwa validate` |

---

## Gestión de Program IDs

### Problemática Actual

Los program IDs existen en:
1. `Anchor.toml` → `[programs.localnet]`
2. `programs/solana-rwa/src/ids.rs` → Constants
3. `txtx.yml` → Environment variables
4. `runbooks/deployment/main.tx` → Variables
5. `web/src/config/solana.ts` → PROGRAM_IDS constant
6. `programs/compliance-aggregator/src/lib.rs` → declare_id!()
7. `programs/identity-registry/src/lib.rs` → declare_id!()

### Nueva Gestión

**Fuente Única: `rwa.config.yaml`**

```yaml
programs:
  localnet:
    solana_rwa: "7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L"
    identity_registry: "3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5"
    compliance_aggregator: "3nf1C8FuDP5SreRF6WZAiiRDpNS4LLbemZPefde5Mre3"
```

**Flujo de Sync:**

```
1. Primera vez (Anchor genera):
   anchor build
   → Anchor.toml genera IDs
   
2. Sync automático (post-deploy):
   rwa deploy local
   → _sync_program_ids lee Anchor.toml
   → Actualiza: rwa.config.yaml, web/src/config/solana.ts, ids.rs
   
3. Verificación:
   rwa validate
   → Compara IDs en todos los archivos
   → Reporta discrepancias
```

---

## Testing y Verificación

### Pipeline de Testing

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Testing Pipeline                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  rwa test (default)                                                     │
│       │                                                                  │
│       ├─ Phase 1: Unit Tests                                            │
│       │   └─ cargo test --lib (Rust unit tests)                        │
│       │                                                                  │
│       ├─ Phase 2: Integration Tests                                     │
│       │   └─ anchor test (Anchor integration tests)                    │
│       │                                                                  │
│       ├─ Phase 3: Frontend Integration                                  │
│       │   └─ yarn test (TypeScript tests)                              │
│       │                                                                  │
│       └─ Phase 4: Security Tests                                        │
│           └─ anchor test -- --grep security                             │
│                                                                         │
│  rwa test solana-rwa (specific program)                                 │
│       └─ anchor test -- --grep "solana-rwa"                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Cronograma Estimado

### Fase 0: Preparación (Día 1)

| Tarea | Duración |
|-------|----------|
| Crear `rwa.config.yaml` | 1 hora |
| Crear `bin/rwa` CLI | 2 horas |
| Crear `.gitignore` | 30 min |
| Crear `config/*.yaml` overlays | 1 hora |

### Fase 1: Limpieza (Día 2)

| Tarea | Duración |
|-------|----------|
| Migrar runbooks a `deploy/runbooks/` | 2 horas |
| Eliminar scripts duplicados de `scripts/` | 1 hora |
| Eliminar `runbooks/*/init.sh` | 30 min |
| Limpiar docs duplicados | 1 hora |
| Eliminar reports de análisis innecesarios | 30 min |

### Fase 2: Integración (Día 3)

| Tarea | Duración |
|-------|----------|
| Integrar `bin/rwa` con surfpool/txtx | 3 horas |
| Implementar `_sync_program_ids` | 2 horas |
| Actualizar web/src/config/solana.ts auto | 1 hora |

### Fase 3: Testing (Día 4)

| Tarea | Duración |
|-------|----------|
| Tests end-to-end del nuevo workflow | 2 horas |
| Verificar deploy local completo | 1 hora |
| Verificar sync de program IDs | 1 hora |

### Fase 4: Documentación (Día 5)

| Tarea | Duración |
|-------|----------|
| Escribir `docs/GETTING_STARTED.md` | 2 horas |
| Escribir `docs/DEPLOYMENT.md` | 2 horas |
| Escribir `docs/README.md` | 1 hora |
| Actualizar docs de arquitectura | 1 hora |

---

## Diagrama de Migración

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Migration Strategy                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Current State                                  New State               │
│  ─────────────                                  ───────────               │
│                                                                         │
│  scripts/*.sh (12 files)       ──▶  bin/rwa (1 file)                   │
│  txtx.yml (341 lines)          ──▶  rwa.config.yaml (100 lines)         │
│  runbooks/*                    ──▶  deploy/runbooks/*                   │
│  Program IDs in 6+ places      ──▶  rwa.config.yaml (source of truth)   │
│  docs/*.md (fragmented)        ──▶  docs/*.md (focused)                 │
│  Manual config sync            ──▶  bin/rwa auto-sync                   │
│                                                                         │
│  Migration is REVERSIBLE:                                               │
│  - Git history preserved                                                │
│  - Old files can be restored via git checkout                           │
│  - New files are additive initially                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Resumen de Beneficios

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Archivos de scripts | 12 | 1 (bin/rwa) | -92% |
| Líneas en txtx.yml | 341 | ~100 (rwa.config.yaml) | -71% |
| Lugares con program IDs | 6+ | 1 (rwa.config.yaml) | -83% |
| Documentación duplicada | 4+ docs | 5 docs enfocados | Claridad |
| Comandos para deploy | 3+ métodos | 1 comando | Simplificado |
| Onboarding time | ~2 horas | ~15 minutos | -87% |

---

## Próximos Pasos

1. **Revisar esta propuesta** con el equipo
2. **Aprobar o ajustar** la estructura propuesta
3. **Switch a Code mode** para implementación
4. **Implementar fase por fase** con testing en cada paso
5. **Documentar** el nuevo workflow
