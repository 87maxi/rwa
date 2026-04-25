# Surfpool + TXTX Deep Analysis: Complete Deployment Workflow

> **Fecha de creación:** 2026-04-23  
> **Versión:** 1.0  
> **Proyecto:** Solana RWA Token Platform  
> **Estado:** Análisis Profundo

---

## Tabla de Contenidos

1. [Executive Summary](#executive-summary)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Flujo Completo de Deployment](#flujo-completo-de-deployment)
4. [Análisis de txtx.yml - Manifest](#analisis-de-txtxyml---manifest)
5. [Análisis de Runbooks](#analisis-de-runbooks)
6. [Análisis de Signers](#analisis-de-signers)
7. [State Management](#state-management)
8. [Tabla Comparativa: Localnet vs Devnet vs Mainnet](#tabla-comparativa-localnet-vs-devnet-vs-mainnet)
9. [Checklist de Deployment Paso a Paso](#checklist-de-deployment-paso-a-paso)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Referencia Rápida de Comandos](#referencia-rapida-de-comandos)
12. [Patrones Avanzados y Gotchas](#patrones-avanzados-y-gotchas)

---

## Executive Summary

Este proyecto utiliza **Surfpool** (solana-test-validator mejorado) junto con **TXTX** (Infrastructure as Code) para automatizar el deployment de tres programas Solana en un pipeline declarativo. El sistema soporta tres ambientes (localnet, devnet, mainnet) con modelos de seguridad diferenciados.

### Los Tres Programas

```
┌──────────────────────────────────────────────────────────────┐
│                    Dependency Graph                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   compliance_aggregator  (sin dependencias)                  │
│          ▲                                                  │
│          │                                                    │
│   identity_registry      (depende de compliance)             │
│          ▲                                                  │
│          │                                                    │
│   solana_rwa             (depende de ambos)                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| Runtime | Surfpool | solana-test-validator mejorado con mainnet forking |
| IaC | TXTX DSL | Declarative deployment automation |
| Framework | Anchor | Solana program development |
| Lenguaje | Rust | Programas Solana |
| State | .surfpool/state/ | Caché de deployment para evitar redundancia |

---

## Arquitectura del Sistema

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Development Workflow                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Cargo      │────▶│   Anchor     │────▶│    .so       │                │
│  │   Build      │     │   Build      │     │  Binaries    │                │
│  └──────────────┘     └──────────────┘     └──────┬───────┘                │
│                                                   │                          │
│                                                   ▼                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │  .env Files  │◀────│  Init        │◀────│  Deploy      │                │
│  │  Config      │     │  Programs    │     │  via TXTX    │                │
│  └──────────────┘     └──────────────┘     └──────┬───────┘                │
│                                                   │                          │
│                    ┌──────────────────────────────┼──────────────────┐       │
│                    ▼                              ▼                  ▼       │
│              ┌──────────────┐          ┌──────────────┐    ┌──────────────┐  │
│              │   Localnet   │          │    Devnet    │    │   Mainnet    │  │
│              │  (Surfpool)  │          │ (Testing)    │    │  (Production)│  │
│              └──────────────┘          └──────────────┘    └──────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos TXTX

```
┌─────────────────────────────────────────────────────────────────┐
│                    TXTX Execution Flow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  txtx.yml (Manifest)                                             │
│       │                                                          │
│       ├──► environments.localnet.rpc_api_url ──┐                │
│       ├──► environments.localnet.keypair ──────┼──► addon "svm" │
│       └──► runbooks[].location ────────────────┘                │
│                                                                  │
│       │                                                          │
│       ▼                                                          │
│  surfpool run <runbook> --env <environment>                      │
│       │                                                          │
│       ├──► Auto-load signers.<env>.tx                            │
│       │                                                          │
│       ├──► Parse main.tx (actions)                               │
│       │                                                          │
│       ├──► Resolve inputs (CLI --input or txtx.yml defaults)     │
│       │                                                          │
│       ├──► Check .surfpool/state/ (skip if unchanged)            │
│       │                                                          │
│       └──► Execute actions in order                              │
│              │                                                   │
│              ├──► svm::deploy_program  (build + deploy .so)      │
│              ├──► svm::process_instructions (call program logic) │
│              └──► svm::setup_surfnet (local cheatcodes)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cómo Interactúan los Componentes

1. **Surfpool** es el runtime que ejecuta los runbooks. Es un `solana-test-validator` mejorado que:
   - Corre un validator local en `http://127.0.0.1:8899`
   - Soporta mainnet forking (fork mainnet on-the-fly)
   - Proporciona cheatcodes para desarrollo (`instant_surfnet_deployment`)
   - Tiene dashboard web en `http://localhost:18488`

2. **txtx.yml** es el manifest que:
   - Define los runbooks disponibles y sus ubicaciones
   - Configura los environments (localnet, devnet, mainnet)
   - Establece state management en `.surfpool/state/`
   - Mapea variables de ambiente a inputs de runbooks

3. **Runbooks (.tx files)** son archivos declarativos que:
   - Definen acciones (`svm::deploy_program`, `svm::process_instructions`, `svm::setup_surfnet`)
   - Configuran signers (`svm::secret_key`, `svm::web_wallet`)
   - Usan variables editables en runtime (`editable = true`)
   - Producen outputs que pueden ser capturados

4. **Signers** definen quién firma las transacciones:
   - Localnet: `svm::secret_key` (keypair file directo)
   - Devnet: `svm::web_wallet` (firma browser-based)
   - Mainnet: `svm::web_wallet` o `svm::squads` (multisig)

---

## Flujo Completo de Deployment

### Flujo Localnet (Desarrollo)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Localnet Deployment Flow                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: surfpool start                                                      │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  - Inicia solana-test-validator mejorado                         │
│  │  - RPC en http://127.0.0.1:8899                                 │
│  │  - Dashboard en http://localhost:18488                           │
│  │  - Airdrop automático al payer                                   │
│  └─────────────────────────────────────────────────────────────────┘        │
│       │                                                                      │
│       ▼                                                                      │
│  Step 2: surfpool run setup-surfnet --env localnet -u                        │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  - Payer balance: 100 SOL                                        │
│  │  - USDC token account: 1000 USDC                                 │
│  │  - Program authorities set                                       │
│  │  - SPL Token program cloned                                      │
│  └─────────────────────────────────────────────────────────────────┘        │
│       │                                                                      │
│       ▼                                                                      │
│  Step 3: surfpool run deployment --env localnet -u                           │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  PHASE 1: Deploy Programs (instant_surfnet_deployment = true)    │
│  │                                                                  │
│  │  1. compliance_aggregator → program_id_1                         │
│  │  2. identity_registry → program_id_2                             │
│  │  3. solana_rwa → program_id_3                                    │
│  │                                                                  │
│  │  instant_surfnet_deployment = true:                              │
│  │  - Escribe program data directamente a cuenta (cheatcode)        │
│  │  - No usa transacciones tradicionales                           │
│  │  - Mucho más rápido que deploy normal                           │
│  │  - SOLO funciona en localnet/surfpool                           │
│  └─────────────────────────────────────────────────────────────────┘        │
│       │                                                                      │
│       ▼                                                                      │
│  Step 4: surfpool run compliance-initialization --env localnet -u            │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  - Crea ComplianceAggregatorState PDA                           │
│  │  - public_key = signer.authority.public_key                     │
│  └─────────────────────────────────────────────────────────────────┘        │
│       │                                                                      │
│       ▼                                                                      │
│  Step 5: surfpool run identity-initialization --env localnet -u              │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  - Crea IdentityRegistryState PDA                                │
│  │  - public_key = signer.authority.public_key                     │
│  └─────────────────────────────────────────────────────────────────┘        │
│       │                                                                      │
│       ▼                                                                      │
│  Step 6: surfpool run token-initialization --env localnet -u                 │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  - Crea TokenState PDA                                           │
│  │  - public_key = signer.authority.public_key                     │
│  │  - token_name, token_symbol, token_decimals                     │
│  └─────────────────────────────────────────────────────────────────┘        │
│       │                                                                      │
│       ▼                                                                      │
│  Step 7: surfpool run token-operations --env localnet -u                     │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  - mint_tokens, transfer_tokens, add_agent, freeze_account, etc │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flujo Devnet/Mainnet (Producción)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Devnet/Mainnet Deployment Flow                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: anchor build                                                        │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  - Compila programas a .so binaries                              │
│  │  - Genera IDLs en target/idl/                                    │
│  │  - Genera TypeScript types en target/types/                      │
│  └─────────────────────────────────────────────────────────────────┘        │
│       │                                                                      │
│       ▼                                                                      │
│  Step 2: txtx run deployment --env devnet                                    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  PHASE 1: Deploy Programs (instant_surfnet_deployment = false) │        │
│  │                                                                  │        │
│  │  - Usa transacciones Solana tradicionales                       │
│  │  - Web wallet pide firma en browser                             │
│  │  - Cada programa recibe un program ID único                     │
│  │  - instant_surfnet_deployment = true se ignora en remote        │
│  └─────────────────────────────────────────────────────────────────┘        │
│       │                                                                      │
│       ▼                                                                      │
│  Step 3: Capturar program IDs del output                                     │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  compliance_aggregator: <program_id_1>                           │
│  │  identity_registry: <program_id_2>                               │
│  │  solana_rwa: <program_id_3>                                      │
│  └─────────────────────────────────────────────────────────────────┘        │
│       │                                                                      │
│       ▼                                                                      │
│  Step 4: Actualizar txtx.yml con program IDs                                 │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  Editar devnet section en txtx.yml:                              │
│  │    solana_rwa_program_id: "<program_id_3>"                       │
│  │    identity_registry_program_id: "<program_id_2>"                │
│  │    compliance_aggregator_program_id: "<program_id_1>"            │
│  └─────────────────────────────────────────────────────────────────┘        │
│       │                                                                      │
│       ▼                                                                      │
│  Step 5: txtx run compliance-initialization --env devnet -u                  │
│       │                                                                      │
│       ▼                                                                      │
│  Step 6: txtx run identity-initialization --env devnet -u                    │
│       │                                                                      │
│       ▼                                                                      │
│  Step 7: txtx run token-initialization --env devnet -u                       │
│       │                                                                      │
│       ▼                                                                      │
│  Step 8: txtx run token-operations --env devnet -u                           │
│       │                                                                      │
│       ▼                                                                      │
│  Step 9: Verificar en Solana Explorer                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Análisis de txtx.yml - Manifest

### Estructura Completa

```yaml
┌─────────────────────────────────────────────────────────────────┐
│                      txtx.yml Structure                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  name: solana-rwa                                                │
│  id: solana-rwa                                                  │
│                                                                  │
│  runbooks:                                                       │
│  ├── deployment          → ./runbooks/deployment                │
│  │   └── state: .surfpool/state                                 │
│  ├── token-operations    → ./runbooks/token-operations          │
│  ├── upgrade             → ./runbooks/upgrade                   │
│  │   └── state: .surfpool/state                                 │
│  ├── compliance-initialization → ./runbooks/compliance-init     │
│  ├── identity-initialization     → ./runbooks/identity-init     │
│  ├── token-initialization      → ./runbooks/token-init          │
│  └── setup-surfnet       → ./runbooks/setup-surfnet             │
│                                                                  │
│  environments:                                                   │
│  ├── localnet:                                                  │
│  │   ├── network_id: localnet                                   │
│  │   ├── rpc_api_url: http://127.0.0.1:8899                    │
│  │   ├── payer_keypair_json: ~/.config/solana/id.json          │
│  │   ├── authority_keypair_json: ~/.config/solana/id.json      │
│  │   ├── token_name: "RWA Token"                                │
│  │   ├── token_symbol: "RWA"                                    │
│  │   ├── token_decimals: 9                                      │
│  │   ├── agent_pubkey: ""                                       │
│  │   ├── solana_rwa_program_id: ""                              │
│  │   ├── identity_registry_program_id: ""                       │
│  │   ├── compliance_aggregator_program_id: ""                   │
│  │   ├── token_program_id: ""                                   │
│  │   └── token_state_account: ""                                │
│  ├── devnet: (misma estructura que localnet)                    │
│  │   └── rpc_api_url: https://api.devnet.solana.com             │
│  └── mainnet: (misma estructura que localnet)                   │
│       └── rpc_api_url: https://api.mainnet-beta.solana.com       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Variables Editables vs Fijas

| Variable | Tipo | Editable | Propósito |
|----------|------|----------|-----------|
| `rpc_api_url` | Fija (env) | No | Endpoint RPC del network |
| `network_id` | Fija (env) | No | Identificador del network |
| `keypair_json` | Fija (env) | No | Path al keypair |
| `token_name` | Input | Sí | Nombre del token |
| `token_symbol` | Input | Sí | Símbolo del token |
| `token_decimals` | Input | Sí | Decimales del token |
| `solana_rwa_program_id` | Post-deploy | Sí | Program ID post-deployment |
| `token_state_account` | Post-init | Sí | Account key post-inicialización |

### State Management

```yaml
runbooks:
  - name: deployment
    state:
      location: .surfpool/state
```

**Cómo funciona:**
1. **Primera ejecución:** Hash de program binaries + runbook inputs → almacenado en `.surfpool/state/`
2. **Ejecuciones subsiguientes:** Compara hashes actuales con almacenados
3. **Si no cambió:** Skip deployment con mensaje "Runbook already executed, no changes detected"
4. **Si cambió:** Re-deploy y actualiza state

**Beneficios:**
- Previene re-deployments accidentales
- Historial de deployment trackeable
- Ciclos de desarrollo local más rápidos

**Archivos generados:**
```
.surfpool/state/
└── deployment/
    └── state.json    # Hash de programas + inputs
```

---

## Análisis de Runbooks

### 1. Deployment Runbook ([`runbooks/deployment/main.tx`](../runbooks/deployment/main.tx))

**Propósito:** Deploy los tres programas Solana en orden de dependencia.

**Estructura:**
```tx
addon "svm" {
    rpc_api_url = input.rpc_api_url    # Desde txtx.yml environment
    network_id = input.network_id
}

action "deploy_compliance_aggregator" "svm::deploy_program" {
    program = svm::get_program_from_anchor_project("compliance_aggregator")
    authority = signer.authority
    payer = signer.payer
    instant_surfnet_deployment = true   # Cheatcode: solo localnet
}

action "deploy_identity_registry" "svm::deploy_program" {
    program = svm::get_program_from_anchor_project("identity_registry")
    authority = signer.authority
    payer = signer.payer
    instant_surfnet_deployment = true
}

action "deploy_solana_rwa" "svm::deploy_program" {
    program = svm::get_program_from_anchor_project("solana_rwa")
    authority = signer.authority
    payer = signer.payer
    instant_surfnet_deployment = true
}
```

**Patrones Clave:**
- `svm::get_program_from_anchor_project("name")`: Busca el `.so` en `target/deploy/<name>.so`
- `instant_surfnet_deployment = true`: Cheatcode que escribe program data directamente a cuenta (no usa transacciones). SOLO funciona en localnet.
- Los outputs (`output "deployment_summary"`) muestran los program IDs generados

**Orden de Deployment:**
1. `compliance_aggregator` - Sin dependencias, base layer
2. `identity_registry` - Depende de compliance_aggregator
3. `solana_rwa` - Depende de ambos

### 2. Token Initialization ([`runbooks/token-initialization/main.tx`](../runbooks/token-initialization/main.tx))

**Propósito:** Crear la cuenta `TokenState` con metadata del token.

**Diferencia clave por ambiente:**
```
┌─────────────────────────────────────────────────────────────────┐
│              Token Init: Localnet vs Remote                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Localnet (surfpool):                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Usa svm::setup_surfnet (cheatcode)                     │    │
│  │  - Crea cuenta directamente                              │
│  │  - No necesita transacción                               │
│  │  - instant_surfnet_deployment = true                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Devnet/Mainnet:                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Usa svm::process_instructions                          │    │
│  │  - Construye instrucción Anchor "initialize"            │    │
│  │  - Requiere transacción firmada                          │
│  │  - Crea TokenState PDA con name, symbol, decimals       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Account Derivation:**
```tx
token {
    public_key = signer.authority.public_key   # PDA derivada de authority
    signer = true
    writable = true
}
```

**Nota:** La cuenta se crea con `public_key = signer.authority.public_key`, no como PDA con seeds. Esto es un patrón simple donde la authority es también la cuenta de estado.

### 3. Identity Initialization ([`runbooks/identity-initialization/main.tx`](../runbooks/identity-initialization/main.tx))

**Propósito:** Crear la cuenta `IdentityRegistryState`.

**Patrón idéntico al token initialization:**
```tx
action "initialize_identity_registry" "svm::process_instructions" {
    instruction {
        program_id = variable.identity_registry_id
        instruction_name = "initialize"
        instruction_args = []   # No args para initialize

        registry {
            public_key = signer.authority.public_key
            signer = true
            writable = true
        }

        system_program {
            public_key = "11111111111111111111111111111111"
        }
    }
    signers = [signer.payer, signer.authority]
}
```

### 4. Compliance Initialization ([`runbooks/compliance-initialization/main.tx`](../runbooks/compliance-initialization/main.tx))

**Propósito:** Crear la cuenta `ComplianceAggregatorState`.

**Patrón idéntico a identity initialization:**
```tx
action "initialize_compliance_aggregator" "svm::process_instructions" {
    instruction {
        program_id = variable.compliance_aggregator_id
        instruction_name = "initialize"
        instruction_args = []

        aggregator {
            public_key = signer.authority.public_key
            signer = true
            writable = true
        }

        system_program {
            public_key = "11111111111111111111111111111111"
        }
    }
    signers = [signer.payer, signer.authority]
}
```

### 5. Token Operations ([`runbooks/token-operations/token-operations.tx`](../runbooks/token-operations/token-operations.tx))

**Propósito:** Operaciones post-deployment sobre tokens inicializados.

**Acciones disponibles:**
| Acción | Instruction | Args | Signers |
|--------|-------------|------|---------|
| `mint_tokens` | `mint` | `[recipient_wallet, amount]` | `[payer]` |
| `transfer_tokens` | `transfer` | `[from, to, amount]` | `[payer]` |
| `add_agent` | `add_agent` | `[new_agent_pubkey]` | `[payer]` |
| `remove_agent` | `remove_agent` | `[agent_to_remove_pubkey]` | `[payer]` |
| `freeze_account` | `freeze_account` | `[account_to_freeze]` | `[payer, authority]` |
| `unfreeze_account` | `unfreeze_account` | `[account_to_unfreeze]` | `[payer, authority]` |

**Account Context en Operations:**
```tx
action "mint_tokens" "svm::process_instructions" {
    instruction {
        program_id = variable.solana_rwa_id
        instruction_name = "mint"
        instruction_args = [variable.recipient_wallet, variable.mint_amount]

        token_state {
            public_key = variable.token_state_account_key
        }

        agent {
            public_key = signer.payer.public_key
        }
    }
    signers = [signer.payer]
}
```

### 6. Upgrade Runbook ([`runbooks/upgrade/upgrade.tx`](../runbooks/upgrade/upgrade.tx))

**Propósito:** Upgrade de programas deployed sin cambiar program ID.

**Patrón:**
```tx
action "upgrade_compliance_aggregator" "svm::deploy_program" {
    program = svm::get_program_from_anchor_project("compliance_aggregator")
    authority = signer.authority
    payer = signer.payer
    # NO instant_surfnet_deployment en upgrade
}
```

**Importante:**
- El program ID se mantiene IGUAL
- Solo el código del programa se actualiza
- El state data persiste
- La authority debe firmar la upgrade transaction

### 7. Setup Surfnet ([`runbooks/setup-surfnet/setup-surfnet.tx`](../runbooks/setup-surfnet/setup-surfnet.tx))

**Propósito:** Configurar ambiente local para testing.

**Acciones:**
```tx
action "setup_payer_balance" "svm::setup_surfnet" {
    set_account {
        public_key = signer.payer.public_key
        lamports = svm::sol_to_lamports(100)   # 100 SOL
    }
}

action "setup_usdc_token_account" "svm::setup_surfnet" {
    set_token_account {
        public_key = signer.payer.public_key
        token = "usdc"
        amount = 1000000000   # 1000 USDC (6 decimals)
        state = "initialized"
    }
}

action "set_program_authorities" "svm::setup_surfnet" {
    set_program_authority {
        program_id = input.solana_rwa_program_id
        authority = signer.authority.public_key
    }
    # ... same for identity_registry and compliance_aggregator
}

action "clone_token_program" "svm::setup_surfnet" {
    clone_program_account {
        source_program_id = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        destination_program_id = input.token_program_id
    }
}
```

---

## Análisis de Signers

### Estrategia por Ambiente

```
┌─────────────────────────────────────────────────────────────────┐
│                  Signer Strategy by Environment                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Localnet (Development):                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  signer "payer" "svm::secret_key" {                      │    │
│  │      keypair_json = "~/.config/solana/id.json"          │    │
│  │  }                                                       │    │
│  │                                                          │    │
│  │  - Keypair file directo                                  │    │
│  │  - Sin interacción humana                                │    │
│  │  - Ideal para desarrollo rápido                           │    │
│  │  - Sin riesgos (ambiente local)                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Devnet (Testing):                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  signer "payer" "svm::web_wallet" {                      │    │
│  │      // expected_address = "..."  // Opcional           │    │
│  │  }                                                       │    │
│  │                                                          │    │
│  │  - Firma browser-based                                   │    │
│  │  - Requiere interacción humana                           │    │
│  │  - Balance de conveniencia/seguridad                     │    │
│  │  - Test SOL (gratis)                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Mainnet (Production):                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  signer "payer" "svm::web_wallet" {                      │    │
│  │      // expected_address = "..."                        │    │
│  │  }                                                       │    │
│  │                                                          │    │
│  │  signer "authority" "svm::web_wallet" {                  │    │
│  │      // Para mainnet, considerar squads multisig:       │    │
│  │      // signer "authority" "svm::squads" {              │    │
│  │      //     multisig_pda = "..."                        │    │
│  │      //     threshold = 2                               │    │
│  │      //     members = ["key1", "key2", "key3"]          │    │
│  │      // }                                               │    │
│  │  }                                                       │    │
│  │                                                          │    │
│  │  - Máxima seguridad                                      │    │
│  │  - Hardware wallet recomendado                           │    │
│  │  - Multisig (squads) para authority                      │    │
│  │  - Real SOL (costoso)                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Auto-Loading de Signers

Cuando ejecutas `surfpool run deployment --env localnet`:

```
surfpool run deployment --env localnet
       │
       ▼
Busca archivos en ./runbooks/deployment/:
       │
       ├── main.tx          ← Acciones principales
       ├── signers.localnet.tx  ← Auto-loaded (matching env prefix)
       └── signers.devnet.tx      ← Ignorado
```

**Regla:** Surfpool auto-carga `signers.<env>.tx` donde `<env>` matching el `--env` flag.

### Nomenclatura de Signers

**CRITICAL:** Los nombres de signers deben ser consistentes entre todos los archivos:

```tx
// signers.localnet.tx
signer "payer" "svm::secret_key" { ... }
signer "authority" "svm::secret_key" { ... }

// signers.devnet.tx
signer "payer" "svm::web_wallet" { ... }
signer "authority" "svm::web_wallet" { ... }

// signers.mainnet.tx
signer "payer" "svm::web_wallet" { ... }
signer "authority" "svm::web_wallet" { ... }
```

Si los nombres no coinciden, obtendrás errores de "Signer not found".

---

## State Management

### Estructura de Estado

```
.surfpool/state/
└── deployment/
    └── state.json    # Hash de programas + inputs
```

### Ciclo de Vida del State

```
┌─────────────────────────────────────────────────────────────────┐
│                    State Management Cycle                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Primera ejecución:                                           │
│     ┌──────────────────────────────────────────────────────┐    │
│     │  - Hash(program binaries) + hash(runbook inputs)     │    │
│     │  - Almacenar en .surfpool/state/deployment/state.json│    │
│     │  - Ejecutar deployment                               │    │
│     └──────────────────────────────────────────────────────┘    │
│                                                                  │
│  2. Ejecución subsiguiente:                                      │
│     ┌──────────────────────────────────────────────────────┐    │
│     │  - Comparar hash actual vs almacenado                │    │
│     │  - Si iguales: SKIP deployment                       │    │
│     │  - Si diferentes: RE-DEPLOY y actualizar state       │    │
│     └──────────────────────────────────────────────────────┘    │
│                                                                  │
│  3. Force re-deployment:                                         │
│     ┌──────────────────────────────────────────────────────┐    │
│     │  - surfpool run deployment --env localnet --force    │    │
│     │  - Ignora state cache                                │    │
│     │  - Re-deploy siempre                                 │    │
│     └──────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cuándo el State se Invalida

| Condición | Acción |
|-----------|--------|
| Program `.so` file cambia | Re-deploy |
| Runbook inputs cambian | Re-deploy |
| Flag `--force` usado | Re-deploy |
| State file eliminado | Re-deploy |

---

## Tabla Comparativa: Localnet vs Devnet vs Mainnet

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Environment Comparison                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┬──────────────┬──────────────┬─────────────────┐       │
│  │   Feature       │   Localnet   │    Devnet    │    Mainnet      │       │
│  ├─────────────────┼──────────────┼──────────────┼─────────────────┤       │
│  │ RPC URL         │ 127.0.0.1:8899│ devnet.solana│ mainnet-beta.sol│       │
│  │ Signer Type     │ secret_key   │ web_wallet   │ web_wallet/squads│       │
│  │ Cost            │ Free         │ Free (test)  │ Real SOL (~$)  │       │
│  │ Speed           │ Fast         │ Medium       │ Slow           │       │
│  │ Immutability    │ None         │ None         │ Permanent      │       │
│  │ instant_surfnet │ true (works) │ ignored      │ ignored        │       │
│  │ Key Location    │ ~/.config/   │ Browser      │ HW Wallet      │       │
│  │ Use Case        │ Development  │ Testing      │ Production     │       │
│  │ Upgrade         │ Anytime      │ Anytime      │ Careful!       │       │
│  │ Rollback        │ Easy         │ Easy         │ Hard           │       │
│  └─────────────────┴──────────────┴──────────────┴─────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Diferencias Técnicas Detalladas

| Aspecto | Localnet | Devnet | Mainnet |
|---------|----------|--------|---------|
| **Deploy Method** | `svm::setup_surfnet` (cheatcode) | `svm::deploy_program` (tx) | `svm::deploy_program` (tx) |
| **instant_surfnet** | `true` - escribe data directo | Ignorado | Ignorado |
| **Signer Type** | `svm::secret_key` | `svm::web_wallet` | `svm::web_wallet` / `svm::squads` |
| **Key Format** | `keypair_json` file | Browser extension | Hardware wallet / multisig |
| **Program Fee** | 0 SOL | ~0.01 SOL c/u | ~1-2 SOL c/u |
| **State Persistence** | Ephemeral (reinicia) | Persistent | Permanent |
| **Upgrade Authority** | Cualquier key | Upgrade authority | Upgrade authority (crítico) |
| **Tx Confirmation** | Instantánea | ~15s | ~15-60s |
| **Dashboard** | localhost:18488 | Solana Explorer | Solana Explorer |

---

## Checklist de Deployment Paso a Paso

### Localnet Deployment Checklist

```
┌─────────────────────────────────────────────────────────────────┐
│              Localnet Deployment Checklist                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Pre-Deployment:                                                 │
│  [ ] 1. Prerequisites instalados (cargo, anchor, surfpool)      │
│  [ ] 2. Programas compilados: `anchor build`                    │
│  [ ] 3. Surfnet corriendo: `surfpool start`                     │
│  [ ] 4. Health check: `curl -X POST -d '{"jsonrpc":"2.0","id":1,"method":"health"}' http://127.0.0.1:8899` │
│  [ ] 5. Keypair existe: `ls ~/.config/solana/id.json`           │
│                                                                  │
│  Deployment:                                                     │
│  [ ] 6. Setup surfnet: `surfpool run setup-surfnet --env localnet -u` │
│  [ ] 7. Deploy programs: `surfpool run deployment --env localnet -u` │
│  [ ] 8. Capturar program IDs del output                        │
│  [ ] 9. Verificar en dashboard: `http://localhost:18488`         │
│                                                                  │
│  Initialization:                                                 │
│  [ ] 10. Compliance init: `surfpool run compliance-initialization --env localnet -u` │
│  [ ] 11. Identity init: `surfpool run identity-initialization --env localnet -u` │
│  [ ] 12. Token init: `surfpool run token-initialization --env localnet -u` │
│  [ ] 13. Capturar token_state_account del output                │
│                                                                  │
│  Post-Deployment:                                                │
│  [ ] 14. Token operations: `surfpool run token-operations --env localnet -u` │
│  [ ] 15. Actualizar txtx.yml con program IDs                    │
│  [ ] 16. Actualizar Anchor.toml si es necesario                 │
│  [ ] 17. Actualizar web/src/config/solana.ts PROGRAM_IDS        │
│  [ ] 18. Verificar consistencia: `txtx validate`                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Devnet/Mainnet Deployment Checklist

```
┌─────────────────────────────────────────────────────────────────┐
│              Devnet/Mainnet Deployment Checklist                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Pre-Deployment:                                                 │
│  [ ] 1. Todos los tests pasan en localnet                       │
│  [ ] 2. `verify.sh` pasa en localnet                            │
│  [ ] 3. IDLs extraídos y revisados                               │
│  [ ] 4. Program IDs documentados                                 │
│  [ ] 5. Backup de txtx.yml                                      │
│  [ ] 6. Programas compilados: `anchor build`                    │
│  [ ] 7. Keypair del environment configurado                      │
│  [ ] 8. (Mainnet) Código auditado por security team             │
│  [ ] 9. (Mainnet) Upgrade authority configurado                  │
│  [ ] 10. (Mainnet) Emergency pause mechanism en place           │
│                                                                  │
│  Deployment:                                                     │
│  [ ] 11. Deploy: `txtx run deployment --env <env> -u`           │
│  [ ] 12. Firmar transacciones en browser (web wallet)           │
│  [ ] 13. Capturar program IDs del output                       │
│  [ ] 14. Verificar en Solana Explorer                           │
│                                                                  │
│  Post-Deployment:                                                │
│  [ ] 15. Actualizar txtx.yml con program IDs                    │
│  [ ] 16. `txtx validate`                                        │
│  [ ] 17. Compliance init: `txtx run compliance-initialization --env <env> -u` │
│  [ ] 18. Identity init: `txtx run identity-initialization --env <env> -u` │
│  [ ] 19. Token init: `txtx run token-initialization --env <env> -u` │
│  [ ] 20. Token operations: `txtx run token-operations --env <env> -u` │
│  [ ] 21. Actualizar web/src/config/solana.ts PROGRAM_IDS        │
│  [ ] 22. Notificar usuarios de deployment                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting Guide

### Errores Comunes y Soluciones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Common Errors & Solutions                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Error: "Runbook not found"                                                  │
│  ├─ Cause: Wrong manifest path                                               │
│  └─ Solution: Use --manifest-file-path ./txtx.yml                           │
│                                                                              │
│  Error: "Signer not found"                                                   │
│  ├─ Cause: Signer name mismatch between files                                │
│  └─ Solution: Check signer.* names match in actions and signers files       │
│                                                                              │
│  Error: "Program already deployed"                                           │
│  ├─ Cause: State management active, no changes detected                      │
│  └─ Solution: Use --force flag to re-deploy                                 │
│                                                                              │
│  Error: "Connection refused"                                                 │
│  ├─ Cause: Surfnet not running                                               │
│  └─ Solution: Run `surfpool start` first                                    │
│                                                                              │
│  Error: "Insufficient funds"                                                 │
│  ├─ Cause: Payer wallet empty                                                │
│  └─ Solution: Run setup-surfnet or airdrop: `solana airdrop 100`            │
│                                                                              │
│  Error: "IDL mismatch"                                                       │
│  ├─ Cause: Programs rebuilt after deploy                                     │
│  └─ Solution: Rebuild with `anchor build`                                   │
│                                                                              │
│  Error: "DeclaredProgramIdMismatch"                                          │
│  ├─ Cause: Anchor.toml [programs.localnet] doesn't match ids.rs              │
│  └─ Solution: Ensure Anchor.toml program IDs match ids.rs constants         │
│                                                                              │
│  Error: "Invalid program ID"                                                 │
│  ├─ Cause: Program ID not valid Base58 or not 32 bytes                       │
│  └─ Solution: Verify program ID format (32-44 chars, valid Base58)          │
│                                                                              │
│  Error: "data not found"                                                     │
│  ├─ Cause: Trying process_instructions before account exists                 │
│  └─ Solution: Run initialization runbook first                              │
│                                                                              │
│  Error: "Program ID not found"                                               │
│  ├─ Cause: Program IDs are empty or incorrect in txtx.yml                    │
│  └─ Solution: Update txtx.yml with program IDs from deployment output       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Debug Commands

```bash
# Dry run - show what would be deployed without executing
surfpool run deployment --env localnet --explain

# List all available runbooks
surfpool ls

# View state status
cat .surfpool/state/*.json

# Check Surfnet health
curl -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"health"}' \
    http://127.0.0.1:8899

# Force re-deployment
surfpool run deployment --env localnet -u --force

# Run with verbose logging
surfpool run deployment --env localnet -u --log-level debug

# Check program status
solana program show <PROGRAM_ID>

# Get program data hash
solana program show <PROGRAM_ID> --output json | jq '.data'
```

### Log Locations

| Log Type | Location |
|----------|----------|
| Surfnet logs | `.surfpool/logs/` |
| Runbook logs | `.surfpool/logs/` |
| State data | `.surfpool/state/` |
| Pipeline logs | `.surfpool/pipeline.log` |

---

## Referencia Rápida de Comandos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Command Quick Reference                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Installation                                                                │
│  ──────────────                                                              │
│  curl -sL https://run.surfpool.run/ | bash                                   │
│                                                                              │
│  Local Development                                                           │
│  ──────────────────                                                          │
│  surfpool start                              # Start Surfnet                │
│  surfpool start --watch                      # Auto-redeploy                 │
│  surfpool start --ci --daemon                # Headless mode                 │
│  surfpool run deployment --env localnet -u   # Deploy                        │
│  surfpool run setup-surfnet --env localnet -u  # Setup local env             │
│  surfpool run compliance-initialization --env localnet -u                    │
│  surfpool run identity-initialization --env localnet -u                      │
│  surfpool run token-initialization --env localnet -u                         │
│  surfpool run token-operations --env localnet -u                             │
│  surfpool run upgrade --env localnet -u                                      │
│                                                                              │
│  Remote Deployment                                                           │
│  ─────────────────────                                                       │
│  txtx run deployment --env devnet -u         # Deploy devnet                 │
│  txtx run deployment --env mainnet -u        # Deploy mainnet                │
│  txtx run compliance-initialization --env devnet -u                          │
│  txtx run identity-initialization --env devnet -u                            │
│  txtx run token-initialization --env devnet -u                               │
│  txtx run token-operations --env devnet -u                                   │
│  txtx run upgrade --env devnet -u                                            │
│                                                                              │
│  Inspection                                                                  │
│  ──────────────                                                              │
│  surfpool ls                                 # List runbooks                │
│  surfpool run deployment --explain           # Dry run                       │
│  cat .surfpool/state/*.json                  # View state                    │
│  surfpool logs                               # View logs                     │
│                                                                              │
│  Maintenance                                                                 │
│  ───────────────                                                             │
│  surfpool run deployment --env localnet -u --force  # Force re-deploy        │
│  anchor build                              # Build programs                  │
│  ./scripts/clean.sh                        # Clean artifacts                 │
│  ./scripts/verify.sh localnet              # Verify deployment               │
│  ./scripts/status.sh --all                 # Check all environments          │
│                                                                              │
│  UI Access                                                                   │
│  ────────────                                                                │
│  Surfnet Dashboard: http://localhost:18488                                   │
│  Studio Web UI:     http://localhost:18488                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Patrones Avanzados y Gotchas

### Patrón 1: `instant_surfnet_deployment = true`

```tx
action "deploy_compliance_aggregator" "svm::deploy_program" {
    program = svm::get_program_from_anchor_project("compliance_aggregator")
    authority = signer.authority
    payer = signer.payer
    instant_surfnet_deployment = true   # CHEATCODE
}
```

**Qué hace:**
- En **localnet**: Escribe program data directamente a la cuenta (sin transacciones)
- En **devnet/mainnet**: El flag se ignora, usa transacciones normales

**Cuándo usar:**
- Siempre en localnet para deployment rápido
- Nunca depende de este flag para comportamiento en production

**Gotcha:**
> Si `instant_surfnet_deployment = true` y intentas deploy en devnet, el deployment funciona pero usa transacciones normales. No hay error.

### Patrón 2: `svm::deploy_program` vs `svm::process_instructions`

```
┌─────────────────────────────────────────────────────────────────┐
│         svm::deploy_program vs svm::process_instructions         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  svm::deploy_program:                                            │
│  ├─ Propósito: Deploy un programa Solana (.so binary)           │
│  ├─ Usa: Anchor program compilation                             │
│  ├─ Resultado: Nuevo program ID generado                        │
│  ├─ Signers: authority + payer                                  │
│  └─ Output: program_id, signatures                              │
│                                                                  │
│  svm::process_instructions:                                      │
│  ├─ Propósito: Llamar instrucciones de un programa deployed     │
│  ├─ Usa: Instruction encoding con program_id específico         │
│  ├─ Resultado: Modifica cuentas on-chain                        │
│  ├─ Signers: Definidos por instrucción                          │
│  └─ Output: signature                                           │
│                                                                  │
│  svm::setup_surfnet:                                             │
│  ├─ Propósito: Cheatcodes para desarrollo local                 │
│  ├─ Usa: Direct account manipulation                            │
│  ├─ Resultado: Cuentas creadas/modificadas sin tx               │
│  ├─ Signers: No requiere signatures                             │
│  └─ Output: None                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Patrón 3: Account Derivation Simple

```tx
// Patrón usado en este proyecto:
token {
    public_key = signer.authority.public_key   # Directa, no PDA con seeds
    signer = true
    writable = true
}

// Patrón PDA con seeds (no usado actualmente, pero común en Solana):
// token {
//     public_key = svm::find_pda(
//         seeds = ["token_state", signer.authority.public_key],
//         program_id = variable.solana_rwa_id
//     )
// }
```

**Nota:** Este proyecto usa account derivation simple (authority.public_key directamente), no PDAs con seeds. Esto es más simple pero menos flexible para casos donde necesitas accounts determinísticas.

### Patrón 4: Variable Editable en Runtime

```tx
variable "token_name" {
    description = "Token name (e.g., \"Real World Asset Token\")"
    value = ""
    editable = true   # Permite editar con -u flag
}
```

**Cómo usar:**
```bash
# Con flag -u, surfpool abre editor para editar variables
surfpool run token-initialization --env localnet -u

# Con --input, override específico
surfpool run token-initialization --env localnet \
    --input token_name="My Custom Token" \
    --input token_symbol="MCT"
```

### Patrón 5: Dependency Ordering

```
compliance_aggregator (sin dependencias)
       │
       ▼
identity_registry (depende de compliance)
       │
       ▼
solana_rwa (depende de ambos)
```

**Regla:** Los programas se deployan en orden de dependencia. Si el programa A llama al programa B, B debe ser deployado primero.

### Gotchas Importantes

1. **Program ID Consistency:**
   > Los program IDs deben ser consistentes entre: `Anchor.toml`, `ids.rs`, `txtx.yml`, y `web/src/config/solana.ts`. Si no coinciden, obtendrás errores de conexión.

2. **State Management en Git:**
   > `.surfpool/state/` debe estar en `.gitignore`. Nunca commitear state files.

3. **Signer Naming:**
   > Los nombres de signers deben ser idénticos en todos los archivos `signers.*.tx`. Si `signers.localnet.tx` tiene `signer "payer"` y `signers.devnet.tx` tiene `signer "deployer"`, obtendrás errores.

4. **instant_surfnet_deployment:**
   > Solo funciona en localnet. En devnet/mainnet, el flag se ignora y se usan transacciones normales.

5. **Program Upgrade:**
   > El program ID se mantiene igual durante upgrade. Solo el código se actualiza. El state data persiste.

6. **Backup antes de Deploy:**
   > Siempre haz backup de `txtx.yml` antes de deploy a devnet/mainnet, ya que los program IDs cambian.

7. **Token Program ID:**
   > `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` es el SPL Token program ID estándar en TODAS las redes Solana. No cambia.

---

## Appendix A: Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Complete Deployment Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Developer                                                                   │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────────────┐                                                        │
│  │  anchor build    │  Compila Rust → .so binaries                          │
│  └────────┬─────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────┐                                                        │
│  │  target/deploy/  │  .so files + IDLs + TypeScript types                  │
│  └────────┬─────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    TXTX Execution Engine                         │        │
│  │                                                                  │        │
│  │  txtx.yml (Manifest)                                             │        │
│  │       │                                                          │        │
│  │       ├──► Load environment config                               │        │
│  │       ├──► Load signer config (signers.<env>.tx)                 │        │
│  │       ├──► Resolve variables (editable + inputs)                 │        │
│  │       ├──► Check state cache (.surfpool/state/)                  │        │
│  │       └──► Execute actions                                       │        │
│  │                │                                                 │        │
│  │                ├──► svm::deploy_program  → Deploy .so to chain   │        │
│  │                ├──► svm::process_instructions → Call program     │        │
│  │                └──► svm::setup_surfnet → Local cheatcodes        │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    Target Network                                │        │
│  │                                                                  │        │
│  │  Localnet: surfpool (solana-test-validator)                     │        │
│  │  Devnet:   devnet.solana.com                                    │        │
│  │  Mainnet:  mainnet-beta.solana.com                               │        │
│  │                                                                  │        │
│  │  Programs Deployed:                                              │        │
│  │  1. compliance_aggregator → program_id_1                        │        │
│  │  2. identity_registry → program_id_2                            │        │
│  │  3. solana_rwa → program_id_3                                   │        │
│  │                                                                  │        │
│  │  Accounts Created:                                               │        │
│  │  1. ComplianceAggregatorState                                   │        │
│  │  2. IdentityRegistryState                                       │        │
│  │  3. TokenState                                                  │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Appendix B: Referencias

| Recurso | URL |
|---------|-----|
| Surfpool Docs | https://docs.surfpool.run/ |
| TXTX DSL Reference | https://docs.surfpool.run/iac/ |
| Solana Docs | https://docs.solana.com/ |
| Anchor Framework | https://www.anchor-lang.com/ |
| Solana Program Library | https://github.com/solana-labs/solana-program-library |

---

*Documento creado: 2026-04-23*  
*Última actualización: 2026-04-23*  
*Autor: Architect Mode Analysis*
