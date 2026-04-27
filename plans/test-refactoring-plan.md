# Plan de Reorganización de Tests para Smart Contracts

## Contexto Actual

Los 3 smart contracts tienen todos sus tests embebidos dentro de `lib.rs` en un bloque `#[cfg(test)] mod tests { ... }`, lo que hace difícil la lectura y mantenimiento.

### Estado Actual

| Smart Contract | Líneas totales | Líneas de tests | Tests count | % tests |
|---|---|---|---|---|
| [`solana-rwa/src/lib.rs`](solana-rwa/programs/solana-rwa/src/lib.rs) | 1027 | ~338 (691-1027) | 22 tests | 33% |
| [`identity-registry/src/lib.rs`](solana-rwa/programs/identity-registry/src/lib.rs) | 671 | ~228 (443-671) | 17 tests | 34% |
| [`compliance-aggregator/src/lib.rs`](solana-rwa/programs/compliance-aggregator/src/lib.rs) | 803 | ~203 (599-803) | 17 tests | 25% |

---

## Arquitectura Propuesta

### Estructura de Directorios

```
solana-rwa/programs/
├── solana-rwa/
│   ├── src/
│   │   ├── lib.rs              ← Solo lógica de negocio (instrucciones, estructuras, eventos)
│   │   ├── constants.rs        ← Constantes globales (MAX_SUPPLY, etc.)
│   │   ├── states/
│   │   │   ├── mod.rs          ← Re-exports de todos los states
│   │   │   ├── token_state.rs  ← TokenState struct + impl
│   │   │   ├── balance.rs      ← BalanceAccount struct + impl
│   │   │   ├── frozen.rs       ← FrozenAccount struct + impl
│   │   │   ├── agent.rs        ← AgentAccount struct + impl
│   │   │   └── supply_info.rs  ← SupplyInfo struct + impl
│   │   ├── events/
│   │   │   ├── mod.rs          ← Re-exports de todos los events
│   │   │   ├── owner_transfer.rs
│   │   │   ├── minting.rs
│   │   │   ├── freezing.rs
│   │   │   └── agent_events.rs
│   │   ├── errors/
│   │   │   ├── mod.rs          ← Re-exports de todos los error codes
│   │   │   └── token_errors.rs
│   │   ├── pdas/
│   │   │   ├── mod.rs          ← Re-exports de todas las funciones PDA
│   │   │   └── mod.rs          ← derive_balance_pda, derive_frozen_pda, derive_agent_pda, derive_token_state_pda
│   │   └── tests/
│   │       ├── mod.rs          ← Re-exports y runner de todos los tests
│   │       ├── states/
│   │       │   ├── mod.rs
│   │       │   ├── token_state.rs
│   │       │   ├── balance.rs
│   │       │   ├── frozen.rs
│   │       │   ├── agent.rs
│   │       │   └── supply_info.rs
│   │       ├── pdas/
│   │       │   ├── mod.rs
│   │       │   └── derivations.rs
│   │       ├── errors/
│   │       │   ├── mod.rs
│   │       │   └── error_codes.rs
│   │       ├── events/
│   │       │   ├── mod.rs
│   │       │   └── event_structs.rs
│   │       └── edge_cases/
│   │           ├── mod.rs
│   │           └── overflow.rs
│   └── tests/                  ← Tests integration (ya existentes)
├── identity-registry/
│   └── src/
│       ├── lib.rs              ← Solo instrucciones + #[program]
│       ├── constants.rs        ← MAX_NAME_LENGTH, MAX_SYMBOL_LENGTH, etc.
│       ├── states/
│       │   ├── mod.rs
│       │   └── registry_state.rs
│       ├── accounts/
│       │   ├── mod.rs
│       │   └── identity_account.rs
│       ├── events/
│       │   ├── mod.rs
│       │   ├── registration.rs
│       │   ├── update.rs
│       │   └── removal.rs
│       ├── errors/
│       │   ├── mod.rs
│       │   └── identity_errors.rs
│       ├── pdas/
│       │   ├── mod.rs
│       │   └── derivations.rs
│       └── tests/
│           ├── mod.rs
│           ├── constants/
│           │   ├── mod.rs
│           │   └── length_limits.rs
│           ├── states/
│           │   ├── mod.rs
│           │   └── registry_state.rs
│           ├── accounts/
│           │   ├── mod.rs
│           │   └── identity_account.rs
│           ├── pdas/
│           │   ├── mod.rs
│           │   └── derivations.rs
│           ├── errors/
│           │   ├── mod.rs
│           │   └── error_codes.rs
│           └── events/
│               ├── mod.rs
│               └── event_structs.rs
└── compliance-aggregator/
    └── src/
        ├── lib.rs              ← Solo instrucciones + #[program]
        ├── states/
        │   ├── mod.rs
        │   └── aggregator_state.rs
        ├── accounts/
        │   ├── mod.rs
        │   └── token_compliance.rs
        ├── events/
        │   ├── mod.rs
        │   ├── module_events.rs
        │   └── transfer_check.rs
        ├── errors/
        │   ├── mod.rs
        │   └── compliance_errors.rs
        ├── pdas/
        │   ├── mod.rs
        │   └── derivations.rs
        └── tests/
            ├── mod.rs
            ├── states/
            │   ├── mod.rs
            │   └── aggregator_state.rs
            ├── accounts/
            │   ├── mod.rs
            │   └── token_compliance.rs
            ├── pdas/
            │   ├── mod.rs
            │   └── derivations.rs
            ├── errors/
            │   ├── mod.rs
            │   └── error_codes.rs
            ├── events/
            │   ├── mod.rs
            │   └── event_structs.rs
            └── transfer_checks/
                ├── mod.rs
                └── check_results.rs
```

---

## Organización de Tests por Categoría

### Categorías de Tests

Cada smart contract tendrá los siguientes tipos de tests organizados:

| Categoría | Qué prueba | Ejemplos |
|---|---|---|
| **states/** | Estructuras de datos on-chain | Creación, campos, valores por defecto |
| **accounts/** | Cuentas PDA específicas | BalanceAccount, IdentityAccount, TokenCompliance |
| **pdas/** | Derivación de direcciones | Determinismo, unicidad, seeds |
| **errors/** | Error codes | Todos los códigos definidos |
| **events/** | Event structs | Campos, tipos, valores |
| **edge_cases/** | Casos borde | Overflow, zero, límites |
| **constants/** | Constantes | Valores esperados |

---

## Ejemplo de Estructura de Archivo de Test

### `solana-rwa/tests/states/token_state.rs`

```rust
use solana_rwa::states::token_state::TokenState;
use anchor_lang::prelude::Pubkey;

#[test]
fn test_token_state_default_creation() {
    let dummy_pubkey = Pubkey::default();
    let state = TokenState {
        owner: dummy_pubkey,
        freeze_authority: dummy_pubkey,
        name: "Test Token".to_string(),
        symbol: "TT".to_string(),
        decimals: 9,
        total_supply: 0,
        next_index: 0,
        bump: 255,
    };

    assert_eq!(state.name, "Test Token");
    assert_eq!(state.symbol, "TT");
    assert_eq!(state.decimals, 9);
    assert_eq!(state.total_supply, 0);
    assert_eq!(state.bump, 255);
}
```

### `solana-rwa/tests/pdas/derivations.rs`

```rust
use solana_rwa::{states::token_state::TokenState, pdas::*};
use anchor_lang::prelude::Pubkey;

#[test]
fn test_pda_balance_derivation() {
    let token = Pubkey::new_unique();
    let wallet = Pubkey::new_unique();
    let (pda, _bump) = derive_balance_pda(&token, &wallet);

    assert_ne!(pda, Pubkey::default());
}

#[test]
fn test_pda_unique_for_different_wallets() {
    let token = Pubkey::new_unique();
    let wallet1 = Pubkey::new_unique();
    let wallet2 = Pubkey::new_unique();

    let pda1 = derive_balance_pda(&token, &wallet1).0;
    let pda2 = derive_balance_pda(&token, &wallet2).0;

    assert_ne!(pda1, pda2);
}
```

### `solana-rwa/tests/mod.rs`

```rust
mod states;
mod accounts;
mod pdas;
mod errors;
mod events;
mod edge_cases;

// Re-export para que `cargo test` encuentre todos los tests
pub use states::*;
pub use accounts::*;
pub use pdas::*;
pub use errors::*;
pub use events::*;
pub use edge_cases::*;
```

---

## lib.rs Limpio (Ejemplo: solana-rwa)

### Antes (~1027 líneas)

```rust
// Constants
// declare_id!()
// #[program] mod conformance_program { ... }
// Account structs (#[derive(Accounts)])
// Data structs ([#account])
// Error codes
// Events
// Helper functions (PDA derivation)
// #[cfg(test)] mod tests { ... } ← 338 líneas de tests
```

### Después (~689 líneas)

```rust
// =============================================================================
// IMPORTS
// =============================================================================

// =============================================================================
// CONSTANTS
// =============================================================================
pub const MAX_SUPPLY: u64 = 1_000_000_000_000_000_000u64;

// =============================================================================
// PROGRAM DECLARATION
// =============================================================================
declare_id!("EwAUDz8ZVXqJQqYYcd8ZEPSGpx2HvG61PweDThK5vrQt");

// =============================================================================
// INSTRUCTION HANDLERS
// =============================================================================
#[program]
pub mod solana_rwa {
    use super::*;
    
    // Initialize handler
    // Mint handler
    // Burn handler
    // Transfer handler
    // Freeze handler
    // Unfreeze handler
    // Transfer owner handler
    // Transfer freeze authority handler
    // Add agent handler
    // Remove agent handler
}

// =============================================================================
// ACCOUNT VALIDATION STRUCTURES (#[derive(Accounts)])
// =============================================================================
pub struct Initialize<'info> { ... }
pub struct Mint<'info> { ... }
// ... etc

// =============================================================================
// ON-CHAIN DATA STRUCTURES ([#account])
// =============================================================================
#[account]
pub struct TokenState { ... }

#[account]
pub struct BalanceAccount { ... }

// ... etc

// =============================================================================
// ERROR CODES
// =============================================================================
#[error_code]
pub enum ErrorCode { ... }

// =============================================================================
// EVENTS
// =============================================================================
#[event]
pub struct OwnerTransferredEvent { ... }

// ... etc

// =============================================================================
// PDA HELPER FUNCTIONS
// =============================================================================
pub fn derive_balance_pda(token: &Pubkey, wallet: &Pubkey) -> (Pubkey, u8) { ... }
pub fn derive_frozen_pda(token: &Pubkey, wallet: &Pubkey) -> (Pubkey, u8) { ... }
pub fn derive_agent_pda(token: &Pubkey, agent: &Pubkey) -> (Pubkey, u8) { ... }
```

---

## Plan de Ejecución

### Fase 1: solana-rwa (Token Program)

1. Crear estructura de directorios `solana-rwa/src/tests/`
2. Extraer tests de `lib.rs` a archivos categorizados
3. Crear `mod.rs` en `tests/` para orquestar tests
4. Limpiar `lib.rs` removiendo bloque `#[cfg(test)]`
5. Verificar `cargo test` pasa

### Fase 2: identity-registry

1. Crear estructura de directorios `identity-registry/src/tests/`
2. Extraer tests de `lib.rs` a archivos categorizados
3. Crear `mod.rs` en `tests/`
4. Limpiar `lib.rs`
5. Verificar `cargo test` pasa

### Fase 3: compliance-aggregator

1. Crear estructura de directorios `compliance-aggregator/src/tests/`
2. Extraer tests de `lib.rs` a archivos categorizados
3. Crear `mod.rs` en `tests/`
4. Limpiar `lib.rs`
5. Verificar `cargo test` pasa

---

## Beneficios

| Aspecto | Antes | Después |
|---|---|---|
| **lib.rs tamaño** | ~1000 líneas | ~400-500 líneas |
| **Encontrar test** | Buscar manualmente en bloque gigante | Navegar a carpeta específica |
| **Colaboración** | Merge conflicts en lib.rs | Archivos separados, menos conflictos |
| **Cobertura** | Difícil ver qué está testeado | Carpetas muestran qué categorías existen |
| **Legibilidad** | 33% del archivo son tests | Focus en lógica de negocio |
