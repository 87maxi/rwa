# Arquitectura del Sistema - Solana RWA Token Platform

## 📋 Tabla de Contenidos

1. [Resumen del Sistema](#resumen-del-sistema)
2. [Arquitectura General](#arquitectura-general)
3. [Diagramas UML](#diagramas-uml)
4. [Smart Contracts](#smart-contracts)
5. [Frontend](#frontend)
6. [Flujos de Datos](#flujos-de-datos)
7. [Estructura de Directorios](#estructura-de-directorios)

---

## Resumen del Sistema

La **Solana RWA Token Platform** es una plataforma completa para la tokenización de activos del mundo real (RWA) en la blockchain de Solana. Combina smart contracts escritos en Rust con Anchor, y una interfaz web moderna con Next.js.

### Componentes Principales

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Smart Contracts** | Rust + Anchor | Lógica de negocio on-chain |
| **Frontend** | Next.js 14 + React 19 | Interfaz de usuario |
| **Wallet** | Solana Wallet Adapter | Conexión de wallets |
| **State Management** | React Hooks + React Query | Gestión de estado |
| **Styling** | TailwindCSS v4 | Estilos y diseño |

---

## Arquitectura General

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Next.js Frontend (Web)                     │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐  │  │
│  │  │   Home Page │ │ Deploy Page │ │    Manage Page          │  │  │
│  │  │  (Landing)  │ │  (Token)    │ │  (Transfer/Mint/Burn)   │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              Shared Components                          │  │  │
│  │  │  WalletConnect │ NetworkStatus │ NotificationContainer │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              Hooks Layer                                │  │  │
│  │  │  useTokenActions │ useTokenState │ useSolanaConnection  │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ RPC HTTP
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SOLANA BLOCKCHAIN                             │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    System Program                              │  │
│  │              (Account Creation, Transfers)                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              ▲                                      │
│                              │                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Custom RWA Programs (Rust/Anchor)                 │  │
│  │                                                               │  │
│  │  ┌────────────────┐  ┌───────────────┐  ┌────────────────┐   │  │
│  │  │  solana-rwa    │  │identity-registry│ │compliance-     │   │  │
│  │  │  (Main Token)  │  │               │  │aggregator     │   │  │
│  │  └────────────────┘  └───────────────┘  └────────────────┘   │  │
│  │       │                        │                      │        │  │
│  │       └────────────────────────┴──────────────────────┘        │  │
│  │                            │                                    │  │
│  └────────────────────────────┼────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Diagramas UML

### 1. Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Solana RWA Platform                             │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      Frontend (Next.js)                        │  │
│  │                                                               │  │
│  │  ┌────────────────┐    ┌────────────────┐                    │  │
│  │  │  App Router    │───▶│  Pages         │                    │  │
│  │  │                │    │                │                    │  │
│  │  │  - layout.tsx  │    │  - /           │                    │  │
│  │  │  - page.tsx    │    │  - /deploy     │                    │  │
│  │  └────────────────┘    │  - /manage     │                    │  │
│  │                        └────────────────┘                    │  │
│  │                                                               │  │
│  │  ┌────────────────┐    ┌────────────────┐                    │  │
│  │  │  Components    │───▶│  Shared        │                    │  │
│  │  │                │    │  - WalletConnect│                   │  │
│  │  │  - WalletConnect│   │  - NetworkStatus│                   │  │
│  │  │  - NetworkStatus│   │  - Notifications│                   │  │
│  │  └────────────────┘    └────────────────┘                    │  │
│  │                                                               │  │
│  │  ┌────────────────┐    ┌────────────────┐                    │  │
│  │  │  Hooks         │───▶│  Custom Hooks  │                    │  │
│  │  │                │    │                │                    │  │
│  │  │  - useTokenActions  │  - useTokenState  │                  │  │
│  │  │  - useSolanaConnection│ - useWalletBalance│                │  │
│  │  └────────────────┘    └────────────────┘                    │  │
│  │                                                               │  │
│  │  ┌────────────────┐    ┌────────────────┐                    │  │
│  │  │  Provider      │───▶│  SolanaProvider │                   │  │
│  │  │                │    │  - QueryClient  │                   │  │
│  │  │                │    │  - Connection   │                   │  │
│  │  │                │    │  - Wallets      │                   │  │
│  │  └────────────────┘    └────────────────┘                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              │ Anchor Client                        │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  Anchor Client (TypeScript)                    │  │
│  │                                                               │  │
│  │  - buildInitializeInstruction()                               │  │
│  │  - buildMintInstruction()                                     │  │
│  │  - buildBurnInstruction()                                     │  │
│  │  - buildTransferInstruction()                                 │  │
│  │  - buildFreezeInstruction()                                   │  │
│  │  - executeLegacyTransaction()                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Solana RPC
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Solana Blockchain                               │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Programs (Rust/Anchor)                      │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              solana-rwa (Main Program)                  │  │  │
│  │  │                                                         │  │  │
│  │  │  Accounts:                                            │  │  │
│  │  │  - TokenState (main account)                          │  │  │
│  │  │                                                         │  │  │
│  │  │  Instructions:                                        │  │  │
│  │  │  - initialize()    - Register new token               │  │  │
│  │  │  - mint()        - Create new tokens                  │  │  │
│  │  │  - burn()        - Destroy tokens                     │  │  │
│  │  │  - transfer()    - Transfer between accounts          │  │  │
│  │  │  - freeze_account()  - Freeze account                 │  │  │
│  │  │  - unfreeze_account()  - Unfreeze account             │  │  │
│  │  │  - add_agent()   - Add authorized agent               │  │  │
│  │  │  - remove_agent()  - Remove agent                     │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │          identity-registry (Support)                    │  │  │
│  │  │                                                         │  │  │
│  │  │  Accounts:                                            │  │  │
│  │  │  - IdentityRegistryState                               │  │  │
│  │  │                                                         │  │  │
│  │  │  Instructions:                                        │  │  │
│  │  │  - initialize()    - Register registry                │  │  │
│  │  │  - register_identity() - Register identity            │  │  │
│  │  │  - update_identity()   - Update identity              │  │  │
│  │  │  - remove_identity()   - Remove identity              │  │  │
│  │  │  - get_identity()    - Query identity                 │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │      compliance-aggregator (Support)                    │  │  │
│  │  │                                                         │  │  │
│  │  │  Accounts:                                            │  │  │
│  │  │  - ComplianceAggregatorState                           │  │  │
│  │  │                                                         │  │  │
│  │  │  Instructions:                                        │  │  │
│  │  │  - initialize()    - Register aggregator              │  │  │
│  │  │  - add_module()    - Add compliance module            │  │  │
│  │  │  - remove_module() - Remove compliance module         │  │  │
│  │  │  - can_transfer()  - Check compliance                 │  │  │
│  │  │  - get_modules()   - Query modules                    │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Diagrama de Clases - Frontend

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND CLASSES                               │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    SolanaProvider                              │  │
│  │  (React Context Provider)                                     │  │
│  │                                                               │  │
│  │  + network: NetworkType                                       │  │
│  │  + endpoint: string                                           │  │
│  │  + wallets: WalletAdapter[]                                   │  │
│  │                                                               │  │
│  │  + SolanaProvider(props)                                      │  │
│  │  + render(): JSX                                              │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                      │
│              ┌──────────────┼──────────────┐                       │
│              ▼              ▼              ▼                       │
│  ┌────────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ QueryClient    │ │ Connection   │ │ WalletProvider│            │
│  │ Provider       │ │ Provider     │ │ Provider     │            │
│  └────────────────┘ └──────────────┘ └──────────────┘            │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    useWallet                                   │  │
│  │  (Wallet Adapter Hook)                                        │  │
│  │                                                               │  │
│  │  + connected: boolean                                         │  │
│  │  + publicKey: PublicKey | null                                │  │
│  │  + connect(): Promise<void>                                   │  │
│  │  + disconnect(): Promise<void>                                │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                      │
│              ┌──────────────┼──────────────┐                       │
│              ▼              ▼              ▼                       │
│  ┌────────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ useTokenActions│ │useTokenState │ │useSolana     │            │
│  │                │ │              │ │Connection     │            │
│  │ +initialize()  │ +balances     │ +connection    │            │
│  │ +mint()        │ +frozen       │ +networkType   │            │
│  │ +burn()        │ +totalSupply  │ +shortAddress  │            │
│  │ +transfer()    │ +agents       │                │            │
│  │ +freeze()      │ +compliance   │                │            │
│  │ +addAgent()    │                │                │            │
│  │ +removeAgent() │                │                │            │
│  └────────────────┘ └──────────────┘ └──────────────┘            │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Page Components                             │  │
│  │                                                               │  │
│  │  Home (page.tsx) ──▶ DeployPage (page.tsx)                    │  │
│  │       │                                                        │  │
│  │       └──────────────────────────▶ ManagePage (page.tsx)       │  │
│  │                                                               │  │
│  │  Shared Components:                                           │  │
│  │  - WalletConnect                                              │  │
│  │  - NetworkStatus                                              │  │
│  │  - NotificationContainer                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Diagrama de Secuencia - Desplegar Token

```
User          Browser         Frontend         Anchor Client       Solana RPC        Smart Contract
  │              │                │                  │                  │                  │
  │──Click "Deploy Token"──▶   │                  │                  │                  │
  │              │                │                  │                  │                  │
  │              │──Fill Form──▶  │                  │                  │                  │
  │              │                │                  │                  │                  │
  │              │──Click Submit──│                  │                  │                  │
  │              │                │──validate()─────▶│                  │                  │
  │              │                │                  │                  │                  │
  │              │                │──buildInstruction()                 │                  │
  │              │                │                  │──▶buildInitializeInstruction()      │
  │              │                │                  │                  │                  │
  │              │                │                  │──create Transaction                  │
  │              │                │                  │                  │                  │
  │              │◀──Request Sign──│                  │                  │                  │
  │              │◀──Wallet Modal──│                  │                  │                  │
  │              │                  │                  │                  │                  │
  │──Confirm in Wallet              │                  │                  │                  │
  │              │                  │                  │                  │                  │
  │              │──signTransaction()                 │                  │                  │
  │              │                │                  │                  │                  │
  │              │                │                  │──sendTransaction()                  │
  │              │                │                  │                  │──▶[Transaction]   │
  │              │                │                  │                  │                  │──▶execute()
  │              │                │                  │                  │                  │                  │
  │              │                │                  │                  │◀──Result          │
  │              │                │                  │◀──signature      │                  │
  │              │                │                  │                  │                  │
  │              │◀──Show Success──│                  │                  │                  │
  │              │                │                  │                  │                  │
  │    ✓ Token Deployed          │                  │                  │                  │
```

### 4. Diagrama de Secuencia - Transfer Tokens

```
User          Browser         Frontend         Anchor Client       Solana RPC        Smart Contract
  │              │                │                  │                  │                  │
  │──Enter Recipient & Amount──▶│                  │                  │                  │
  │              │                │                  │                  │                  │
  │──Click "Transfer"───▶       │                  │                  │                  │
  │              │                │                  │                  │                  │
  │              │                │──validateAddresses()                │                  │
  │              │                │                  │                  │                  │
  │              │                │──buildTransferInstruction()        │                  │
  │              │                │                  │                  │                  │
  │              │                │──create Transaction                  │                  │
  │              │                │                  │                  │                  │
  │              │◀──Request Sign──│                  │                  │                  │
  │              │──Confirm in Wallet                 │                  │                  │
  │              │                  │                  │                  │                  │
  │              │──signTransaction()                 │                  │                  │
  │              │                │                  │                  │                  │
  │              │                │                  │──sendTransaction()                  │
  │              │                │                  │                  │──▶[Transaction]   │
  │              │                │                  │                  │                  │──▶transfer()
  │              │                │                  │                  │                  │                  │
  │              │                │                  │                  │◀──Update Balances  │
  │              │                │                  │◀──signature      │                  │
  │              │                │                  │                  │                  │
  │              │◀──Show Success──│                  │                  │                  │
  │              │                │                  │                  │                  │
  │    ✓ Tokens Transferred      │                  │                  │                  │
```

### 5. Diagrama de Secuencia - Gestión de Agentes

```
User          Browser         Frontend         Anchor Client       Solana RPC        Smart Contract
  │              │                │                  │                  │                  │
  │──Enter Agent Address──▶     │                  │                  │                  │
  │              │                │                  │                  │                  │
  │──Click "Add Agent"───▶      │                  │                  │                  │
  │              │                │                  │                  │                  │
  │              │                │──validateAgent() │                  │                  │
  │              │                │                  │                  │                  │
  │              │                │──buildAddAgentInstruction()        │                  │
  │              │                │                  │                  │                  │
  │              │◀──Request Sign──│                  │                  │                  │
  │              │──Confirm in Wallet                 │                  │                  │
  │              │                  │                  │                  │                  │
  │              │                │                  │──sendTransaction()                  │
  │              │                │                  │                  │──▶[Transaction]   │
  │              │                │                  │                  │                  │──▶add_agent()
  │              │                │                  │                  │                  │                  │
  │              │                │                  │                  │◀──Update Agents    │
  │              │                │                  │◀──signature      │                  │
  │              │                │                  │                  │                  │
  │              │◀──Show Success──│                  │                  │                  │
  │              │                │                  │                  │                  │
  │    ✓ Agent Added               │                  │                  │                  │
```

---

## Smart Contracts

### 1. Programa Principal (solana-rwa)

**Ubicación**: `solana-rwa/programs/solana-rwa/src/lib.rs`

**Program ID (Localnet)**: `7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L`

#### Cuentas (State)

```
┌───────────────────────────────────────────────────────────────┐
│                    TokenState Account                         │
├───────────────────────────────────────────────────────────────┤
│  owner: Pubkey                    - Owner del token           │
│  name: String                     - Nombre del token          │
│  symbol: String                   - Símbolo del token         │
│  decimals: u8                     - Decimales (0-18)         │
│  total_supply: u64                - Suministro total          │
│  next_index: u64                  - Siguiente índice          │
│  balances: Vec<BalanceEntry>      - Balances de cuentas       │
│  frozen_accounts: Vec<FrozenEntry>- Cuentas congeladas        │
│  agents: Vec<Pubkey>              - Agentes autorizados       │
│  compliance_modules: Vec<Pubkey>  - Módulos de cumplimiento  │
└───────────────────────────────────────────────────────────────┘
```

#### BalanceEntry

```
┌───────────────────────────────────────────────────────────────┐
│                    BalanceEntry                               │
├───────────────────────────────────────────────────────────────┤
│  key: Pubkey                    - Dirección de la cuenta      │
│  value: u64                     - Balance                     │
└───────────────────────────────────────────────────────────────┘
```

#### FrozenEntry

```
┌───────────────────────────────────────────────────────────────┐
│                    FrozenEntry                                │
├───────────────────────────────────────────────────────────────┤
│  key: Pubkey                    - Dirección de la cuenta      │
│  frozen: bool                   - Estado de congelación       │
└───────────────────────────────────────────────────────────────┘
```

#### Instrucciones (Actions)

| Instrucción | Parámetros | Descripción |
|-------------|------------|-------------|
| `initialize` | name, symbol, decimals | Inicializar nuevo token |
| `mint` | to, amount | Crear nuevos tokens |
| `burn` | from, amount | Destruir tokens |
| `transfer` | from, to, amount | Transferir entre cuentas |
| `freeze_account` | account | Congelar cuenta |
| `unfreeze_account` | account | Descongelar cuenta |
| `add_agent` | agent | Añadir agente autorizado |
| `remove_agent` | agent | Remover agente autorizado |

### 2. Registro de Identidades (identity-registry)

**Ubicación**: `solana-rwa/programs/identity-registry/src/lib.rs`

**Program ID (Localnet)**: `3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5`

#### Cuentas

```
┌───────────────────────────────────────────────────────────────┐
│                IdentityRegistryState                          │
├───────────────────────────────────────────────────────────────┤
│  owner: Pubkey                    - Owner del registry        │
│  next_index: u64                  - Siguiente índice          │
│  registered_addresses: Vec<Pubkey>- Direcciones registradas   │
│  identity_map: Vec<IdentityEntry> - Mapa wallet→identity      │
└───────────────────────────────────────────────────────────────┘
```

### 3. Agregador de Cumplimiento (compliance-aggregator)

**Ubicación**: `solana-rwa/programs/compliance-aggregator/src/lib.rs`

**Program ID (Localnet)**: `EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT`

#### Cuentas

```
┌───────────────────────────────────────────────────────────────┐
│              ComplianceAggregatorState                        │
├───────────────────────────────────────────────────────────────┤
│  owner: Pubkey                    - Owner del aggregator      │
│  next_index: u64                  - Siguiente índice          │
│  token_modules: Vec<TokenModuleEntry>- Módulos por token      │
└───────────────────────────────────────────────────────────────┘
```

---

## Frontend

### Tecnologías

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Next.js | 14 | Framework React |
| React | 19 | UI Library |
| TypeScript | 5.x | Type Safety |
| TailwindCSS | v4 | Styling |
| @solana/web3.js | Latest | Solana SDK |
| @solana/wallet-adapter | Latest | Wallet Connection |
| @tanstack/react-query | Latest | Data Fetching |
| Anchor Framework | - | Solana Smart Contracts |

### Estructura de Hooks

```
┌───────────────────────────────────────────────────────────────┐
│                      Hooks Layer                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  useSolanaConnection                                        │
│  ├── connection: Connection                                 │
│  ├── networkType: NetworkType                               │
│  ├── networkLabel: string                                   │
│  └── shortAddress: string                                   │
│                                                               │
│  useWalletBalance                                           │
│  ├── balance: number                                        │
│  ├── loading: boolean                                       │
│  └── error: string | null                                   │
│                                                               │
│  useTokenState                                              │
│  ├── balances: Map<Pubkey, BalanceEntry>                    │
│  ├── frozen: Map<Pubkey, boolean>                           │
│  ├── totalSupply: bigint                                    │
│  ├── agents: Pubkey[]                                       │
│  └── compliance: Pubkey[]                                   │
│                                                               │
│  useTokenActions                                            │
│  ├── initializeToken()                                      │
│  ├── mintTokens()                                           │
│  ├── burnTokens()                                           │
│  ├── transferTokens()                                       │
│  ├── freezeAccount()                                        │
│  ├── unfreezeAccount()                                      │
│  ├── addAgent()                                             │
│  └── removeAgent()                                          │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Flujos de Datos

### Flujo de Despliegue de Token

```
User Input
    │
    ▼
Form Data (name, symbol, decimals)
    │
    ▼
validateInputs()
    │
    ▼
buildInitializeInstruction()
    │
    │  Keys: [tokenState, owner, systemProgram]
    │  Data: [discriminator, name, symbol, decimals]
    │
    ▼
new Transaction()
    │
    ▼
signTransaction() [Wallet]
    │
    ▼
sendTransaction() [RPC]
    │
    ▼
on-chain: initialize()
    │
    ▼
TokenState Account Created
```

### Flujo de Lectura de Estado

```
Component Mount
    │
    ▼
useTokenState Hook
    │
    ▼
fetchTokenState()
    │
    │  1. getAccountInfo(tokenAccount)
    │  2. Deserialize TokenState
    │  3. Extract balances, frozen, agents
    │
    ▼
React State Update
    │
    ▼
Component Re-render with Data
```

---

## Estructura de Directorios

```
rwa/
├── sc/                              # Ethereum Smart Contracts (Legacy)
│   ├── src/                         # Solidity contracts
│   ├── test/                        # Foundry tests
│   └── script/                      # Deployment scripts
│
├── solana-rwa/                      # Solana Smart Contracts (Anchor)
│   ├── programs/                    # Rust programs
│   │   ├── solana-rwa/              # Main token program
│   │   │   ├── src/lib.rs           # Program logic
│   │   │   └── Cargo.toml           # Dependencies
│   │   ├── identity-registry/       # Identity management
│   │   └── compliance-aggregator/   # Compliance rules
│   ├── tests/                       # Integration tests
│   ├── Anchor.toml                  # Anchor config
│   ├── Cargo.toml                   # Workspace config
│   └── tsconfig.json                # TypeScript config
│
├── web/                             # Next.js Frontend
│   ├── src/
│   │   ├── app/                     # App Router
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── page.tsx             # Home page
│   │   │   ├── deploy/              # Deploy page
│   │   │   └── manage/              # Manage page
│   │   ├── components/              # React components
│   │   │   ├── WalletConnect.tsx    # Wallet connection
│   │   │   ├── NetworkStatus.tsx    # Network indicator
│   │   │   └── NotificationContainer.tsx
│   │   ├── hooks/                   # Custom hooks
│   │   │   ├── useTokenActions.ts   # Token operations
│   │   │   ├── useTokenState.ts     # Token state
│   │   │   ├── useSolanaConnection.ts
│   │   │   └── useWalletBalance.ts
│   │   ├── providers/               # React providers
│   │   │   └── SolanaProvider.tsx   # Solana context
│   │   ├── anchor/                  # Anchor client
│   │   │   └── client.ts            # Instruction builders
│   │   ├── config/                  # Configuration
│   │   │   └── solana.ts            # Network config
│   │   ├── utils/                   # Utilities
│   │   │   └── solana.ts            # Solana helpers
│   │   └── app/globals.css          # Global styles
│   ├── package.json                 # Dependencies
│   └── tsconfig.json                # TypeScript config
│
├── docs/                            # Documentation
│   ├── USUARIO_GUIDE.md             # User guide
│   ├── ARQUITECTURA.md              # This file
│   └── DESPLIEGUE.md                # Deployment guide
│
└── README.md                        # Project overview
```

---

## Resumen

Esta arquitectura proporciona:

1. **Separación de responsabilidades**: Smart contracts en Solana, UI en Next.js
2. **Modularidad**: Hooks reutilizables, componentes compartidos
3. **Seguridad**: Validación de direcciones, manejo de errores
4. **Escalabilidad**: Soporte para múltiples redes (localnet, devnet, mainnet)
5. **UX moderna**: TailwindCSS, animaciones, glassmorphism
