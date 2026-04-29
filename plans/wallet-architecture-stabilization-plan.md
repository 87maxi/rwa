# Plan de Estabilización de Arquitectura de Wallet

## 1. Resumen Ejecutivo

Este plan aborda la estabilización de la implementación de wallet en la dapp Solana RWA, con foco en:

1. **Agnosticismo del browser y extensión**: Aislar la implementación de wallet de dependencias específicas
2. **Capa de abstracción (Provider)**: Crear una capa de seguridad que centralice la comunicación
3. **Verificación mediante console.log**: Logging detallado de transacciones y comunicaciones con la red
4. **Consistencia con redes Solana**: Evitar inconsistencias con `window.ethereum` inyectado por browsers
5. **Dependencias conflictivas**: Actualizar o reemplazar librerías problemáticas

---

## 2. Análisis de Arquitectura Actual

### 2.1 Estructura de Capas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js)                             │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Capa de UI                                                       │  │
│  │  ├── WalletConnect.tsx - Botón de conexión/desconexión           │  │
│  │  ├── WalletDebugPanel.tsx - Panel de diagnóstico                  │  │
│  │  └── NetworkStatus.tsx - Indicador de red                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                  │                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Capa de Hooks                                                    │  │
│  │  ├── useWalletManager.ts - Gestión de conexión wallet             │  │
│  │  ├── useSolanaTransaction.ts - Ejecución de transacciones         │  │
│  │  ├── useSolanaConnection.ts - Estado de conexión                  │  │
│  │  ├── useTokenActions.ts - Acciones del token (1552 líneas!!)     │  │
│  │  ├── useTokenState.ts - Estado del token                          │  │
│  │  ├── useComplianceActions.ts - Acciones de compliance             │  │
│  │  └── useIdentityActions.ts - Acciones de identidad                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                  │                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Capa de Providers                                                │  │
│  │  └── SolanaProvider.tsx - Proveedores Solana                      │  │
│  │      ├── QueryClientProvider                                      │  │
│  │      ├── ConnectionProvider                                       │  │
│  │      ├── WalletProvider                                           │  │
│  │      └── WalletModalProvider                                      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                  │                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Capa de Anchor SDK                                               │  │
│  │  ├── client.ts - Re-exporta módulos especializados                │  │
│  │  ├── solana-rwa.ts - Instrucciones del programa principal         │  │
│  │  ├── compliance.ts - Instrucciones de compliance                  │  │
│  │  ├── identity.ts - Instrucciones de identidad                     │  │
│  │  ├── pdas.ts - Derivación de PDAs                                 │  │
│  │  ├── parsers.ts - Parseo de datos de cuentas                      │  │
│  │  └── discriminators.ts - Discriminadores de instrucciones         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                  │                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Capa de Configuración                                            │  │
│  │  └── solana.ts - Program IDs, URLs de red, configuración          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Dependencias Actuales

| Paquete | Versión | Estado | Problema |
|---------|---------|--------|----------|
| `@solana/wallet-adapter-base` | ^0.9.27 | Legacy v0.x | Estable pero sin updates mayores |
| `@solana/wallet-adapter-react` | ^0.15.39 | Legacy v0.x | Estable |
| `@solana/wallet-adapter-react-ui` | ^0.9.39 | Legacy v0.x | Estable |
| `@solana/wallet-adapter-wallets` | ^0.19.38 | Legacy v0.x | **Conflictivo** - adapters manuales |
| `@solana/wallet-standard-wallet-adapter-react` | ^1.1.4 | Moderno v1.x | Correcto |
| `@solana/web3.js` | ^1.98.4 | Actualizado | Correcto |
| `@coral-xyz/anchor` | ^0.32.1 | Actualizado | Correcto |

### 2.3 Problemas Identificados

#### Problema Crítico 1: Monolito `useTokenActions.ts`
- **1552 líneas** en un solo hook
- Contiene lógica de: token, compliance, identidad, y transacciones
- Duplica lógica de `signAndSend` que ya existe en `useSolanaTransaction.ts`
- Viola el principio de responsabilidad única

#### Problema Crítico 2: Duplicación de `signAndSend`
- Existe en [`useSolanaTransaction.ts`](web/src/hooks/useSolanaTransaction.ts:56)
- Se duplica en [`useTokenActions.ts`](web/src/hooks/useTokenActions.ts:127)
- Código casi idéntico con manejo de errores repetido

#### Problema Crítico 3: Sin capa de abstracción Wallet Provider
- Los hooks acceden directamente a `useWallet()` y `useConnection()`
- No hay interfaz unificada para operaciones de wallet
- Difícil testear y mockear

#### Problema Moderado 1: Conflictos `window.ethereum`
- Backpack inyecta `window.ethereum` (wallet EVM/Solana multi-chain)
- Aunque se removió `CoinbaseWalletAdapter`, otras wallets pueden causar conflictos
- No hay mecanismo de aislamiento del objeto global

#### Problema Moderado 2: Logging inconsistente
- Algunos hooks tienen `console.log`, otros no
- No hay patrón unificado de logging
- Falta logging de datos enviados/recibidos en transacciones

#### Problema Menor 1: Múltiples puntos de acceso a `window`
- [`WalletDebugPanel.tsx`](web/src/components/WalletDebugPanel.tsx:72) accede a `(window as any).__SOLANA_WALLET_STANDARD_PROVIDERS__`
- [`WalletDebugPanel.tsx`](web/src/components/WalletDebugPanel.tsx:78) accede a `(window as any).solana`
- No hay encapsulación

---

## 3. Arquitectura Propuesta: Wallet Provider Abstraction Layer

### 3.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Wallet Abstraction Layer                           │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  WalletContext (Nuevo Provider)                                   │  │
│  │                                                                   │  │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │  │
│  │  │ WalletConnector │  │ TransactionManager│  │ NetworkMonitor  │  │  │
│  │  │                 │  │                  │  │                 │  │  │
│  │  │ - connect()     │  │ - signAndSend()  │  │ - detectNetwork │  │  │
│  │  │ - disconnect()  │  │ - buildTx()      │  │ - monitorStatus │  │  │
│  │  │ - selectWallet  │  │ - confirmTx()    │  │ - getEndpoint   │  │  │
│  │  │ - getStatus()   │  │ - logTransaction │  │ - switchNetwork │  │  │
│  │  └─────────────────┘  └──────────────────┘  └─────────────────┘  │  │
│  │                                                                   │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │  WalletLogger (Centralizado)                                 │ │  │
│  │  │                                                              │ │  │
│  │  │  - logConnection()   - Estados de conexión                   │ │  │
│  │  │  - logTransaction()  - Datos enviados/recibidos              │ │  │
│  │  │  - logNetwork()      - Comunicaciones con RPC                │ │  │
│  │  │  - logError()        - Errores con contexto                  │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                  │                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Wallet Adapter Bridge (Aislamiento del browser)                  │  │
│  │                                                                   │  │
│  │  ┌──────────────────┐    ┌──────────────────┐                    │  │
│  │  │ SolanaAdapter    │    │ EthereumShield   │                    │  │
│  │  │                  │    │                  │                    │  │
│  │  │ - Detecta wallets│    │ - Protege        │                    │  │
│  │  │   Solana nativas │    │   window.ethereum│                    │  │
│  │  │ - Usa Wallet     │    │ - Previene       │                    │  │
│  │  │   Standard       │    │   conflictos     │                    │  │
│  │  │ - Fallback legacy│    │ - Log inyecciones│                    │  │
│  │  └──────────────────┘    └──────────────────┘                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Interfaz del Wallet Provider

```typescript
// Interfaz principal del Wallet Provider
interface WalletProviderInterface {
  // Conexión
  connect(walletName?: string): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  selectWallet(walletName: string): boolean;
  
  // Estado
  status: WalletStatus;
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  currentWallet: WalletAdapter | null;
  availableWallets: WalletInfo[];
  
  // Transacciones
  signAndSend(transaction: Transaction): Promise<TransactionResult>;
  signTransaction(transaction: Transaction): Promise<SignedTransaction>;
  
  // Red
  network: NetworkType;
  endpoint: string;
  connection: Connection;
  
  // Logging
  logger: WalletLogger;
}

// Estados de la wallet
type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Resultado de conexión
interface ConnectionResult {
  success: boolean;
  publicKey: PublicKey | null;
  wallet: string | null;
  error: string | null;
}

// Resultado de transacción
interface TransactionResult {
  signature: string;
  blockhash: string;
  blockHeight: number;
  commitment: Commitment;
  logs: string[];
}

// Logger centralizado
interface WalletLogger {
  logConnection(event: ConnectionEvent): void;
  logTransaction(event: TransactionEvent): void;
  logNetwork(event: NetworkEvent): void;
  logError(event: ErrorEvent): void;
  setLevel(level: LogLevel): void;
}
```

---

## 4. Plan de Implementación

### Fase 1: Creación de Wallet Abstraction Layer

#### Tarea 1.1: Crear `WalletLogger` centralizado
**Archivo**: `web/src/wallet/logger.ts`

```typescript
// Estructura del logger
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'wallet' | 'transaction' | 'network' | 'error';
  message: string;
  data?: Record<string, any>;
}

class WalletLogger {
  private entries: LogEntry[] = [];
  private maxEntries = 1000;
  private enabled: boolean;
  
  constructor(options?: LoggerOptions) {
    this.enabled = options?.enabled ?? true;
  }
  
  logConnection(event: ConnectionEvent): void {
    this.log('info', 'wallet', event.message, {
      wallet: event.wallet,
      status: event.status,
      publicKey: event.publicKey?.toString(),
    });
  }
  
  logTransaction(event: TransactionEvent): void {
    this.log('info', 'transaction', event.message, {
      signature: event.signature,
      instructions: event.instructions?.length,
      accounts: event.accounts,
      data: event.data, // Datos serializados enviados
      response: event.response, // Respuesta recibida
    });
  }
  
  logNetwork(event: NetworkEvent): void {
    this.log('debug', 'network', event.message, {
      endpoint: event.endpoint,
      method: event.method,
      request: event.request,
      response: event.response,
    });
  }
  
  getEntries(): LogEntry[] {
    return this.entries;
  }
  
  exportLogs(): string {
    return JSON.stringify(this.entries, null, 2);
  }
}
```

**Output esperado en console.log**:
```
[2026-04-28T10:30:00.000Z] [INFO] [wallet] Connecting to Phantom
  ├─ wallet: Phantom
  ├─ status: connecting
  └─ publicKey: null

[2026-04-28T10:30:01.000Z] [INFO] [wallet] Connected successfully
  ├─ wallet: Phantom
  ├─ status: connected
  └─ publicKey: Abc123...Xyz789

[2026-04-28T10:30:05.000Z] [INFO] [transaction] Signing transaction
  ├─ instructions: 2
  ├─ accounts: ["Abc123...", "Def456..."]
  ├─ data: "010000..."
  └─ programId: 6XDDBd...zVpe

[2026-04-28T10:30:06.000Z] [INFO] [transaction] Transaction sent
  ├─ signature: Sig123...
  ├─ blockhash: Block456...
  └─ blockHeight: 123456789

[2026-04-28T10:30:07.000Z] [INFO] [transaction] Transaction confirmed
  ├─ signature: Sig123...
  ├─ commitment: confirmed
  └─ logs: ["Program log: ..."]
```

#### Tarea 1.2: Crear `EthereumShield` para aislamiento
**Archivo**: `web/src/wallet/ethereum-shield.ts`

```typescript
/**
 * EthereumShield - Aísla la aplicación de conflictos con window.ethereum
 * 
 * Problema: Múltiples extensiones de browser intentan sobrescribir window.ethereum
 * Solución: Crear una capa que detecta y previene conflictos
 */
class EthereumShield {
  private originalEthereum: any = null;
  private injectedProviders: string[] = [];
  
  constructor() {
    this.initialize();
  }
  
  private initialize(): void {
    if (typeof window === 'undefined') return;
    
    // Guardar referencia original si existe
    this.originalEthereum = (window as any).ethereum;
    
    // Detectar providers EIP-6963
    this.detectEIP6963Providers();
    
    // Monitorear cambios en window.ethereum
    this.monitorEthereumChanges();
    
    console.log('[EthereumShield] Initialized', {
      hasEthereum: !!this.originalEthereum,
      providers: this.injectedProviders,
    });
  }
  
  private detectEIP6963Providers(): void {
    // EIP-6963 permite múltiples wallets sin conflictos
    const detail = (window as any).__SOLANA_WALLET_STANDARD_PROVIDERS__;
    if (detail) {
      this.injectedProviders.push('Wallet Standard Providers');
    }
  }
  
  private monitorEthereumChanges(): void {
    // Usar MutationObserver para detectar cambios
    // Log cada vez que window.ethereum es modificado
  }
  
  public getConflictStatus(): ConflictStatus {
    return {
      hasConflict: this.detectConflict(),
      providers: this.injectedProviders,
      recommendation: this.getRecommendation(),
    };
  }
}
```

#### Tarea 1.3: Crear `WalletContext` Provider
**Archivo**: `web/src/wallet/WalletProvider.tsx`

```typescript
interface WalletContextType {
  // Estado
  status: WalletStatus;
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  currentWallet: string | null;
  availableWallets: WalletInfo[];
  
  // Acciones
  connect: (walletName?: string) => Promise<ConnectionResult>;
  disconnect: () => Promise<void>;
  selectWallet: (walletName: string) => boolean;
  
  // Transacciones
  signAndSend: (tx: Transaction) => Promise<TransactionResult>;
  
  // Red
  network: NetworkType;
  endpoint: string;
  connection: Connection;
  
  // Logger
  logger: WalletLogger;
  
  // Ethereum Shield
  ethereumShield: EthereumShield;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const logger = useMemo(() => new WalletLogger(), []);
  const ethereumShield = useMemo(() => new EthereumShield(), []);
  
  // ... implementación
  
  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return context;
}
```

### Fase 2: Refactorización de Hooks

#### Tarea 2.1: Simplificar `useWalletManager.ts`
- Eliminar duplicación con el nuevo `WalletContext`
- Usar `useWalletContext()` como fuente única de verdad
- Reducir de ~200 líneas a ~50 líneas

#### Tarea 2.2: Unificar `signAndSend` en `TransactionManager`
- Eliminar duplicación en `useTokenActions.ts`
- Centralizar en `WalletContext.signAndSend()`
- Agregar logging automático de todas las transacciones

#### Tarea 2.3: Dividir `useTokenActions.ts`
Dividir el monolito de 1552 líneas en hooks especializados:

| Hook | Responsabilidad | Líneas estimadas |
|------|----------------|------------------|
| `useTokenOperations.ts` | Mint, Burn, Transfer, Freeze | ~300 |
| `useComplianceOperations.ts` | Compliance modules, checks | ~250 |
| `useIdentityOperations.ts` | Register, Update, Remove | ~200 |
| `useAgentOperations.ts` | Add/Remove agents, Transfer owner | ~150 |
| `useSupplyQuery.ts` | Query supply info | ~100 |

### Fase 3: Integración y Testing

#### Tarea 3.1: Actualizar `SolanaProvider.tsx`
- Envolver con el nuevo `WalletProvider`
- Mantener compatibilidad con hooks existentes

#### Tarea 3.2: Actualizar componentes de UI
- `WalletConnect.tsx` usar `useWalletContext()`
- `WalletDebugPanel.tsx` integrar `WalletLogger`

#### Tarea 3.3: Verificar consistencia Solana/Ethereum
- Probar con múltiples extensiones instaladas
- Verificar que `window.ethereum` no cause conflictos
- Validar logging de transacciones

---

## 5. Migración de Dependencias

### 5.1 Evaluación de `@solana/wallet-adapter-wallets`

**Estado actual**: Se usa solo para `LedgerWalletAdapter` y `TrezorWalletAdapter`
**Recomendación**: Mantener por ahora, pero preparar migración

### 5.2 Evaluación de `@solana/wallet-standard-wallet-adapter-react`

**Estado actual**: Correctamente implementado
**Recomendación**: Mantener y expandir uso

### 5.3 Dependencias a agregar

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `@solana/wallet-standard` | ^1.1.0 | Soporte Wallet Standard nativo |
| `@wallet-standard/base` | ^1.1.0 | Tipos base Wallet Standard |
| `@wallet-standard/features` | ^1.1.0 | Features Wallet Standard |

---

## 6. Checklist de Implementación

### Fase 1: Wallet Abstraction Layer
- [ ] Crear `web/src/wallet/logger.ts` - WalletLogger centralizado
- [ ] Crear `web/src/wallet/ethereum-shield.ts` - Aislamiento window.ethereum
- [ ] Crear `web/src/wallet/WalletProvider.tsx` - Context provider unificado
- [ ] Crear `web/src/wallet/types.ts` - Tipos e interfaces
- [ ] Crear `web/src/wallet/index.ts` - Re-exports

### Fase 2: Refactorización
- [ ] Simplificar `useWalletManager.ts` para usar `useWalletContext()`
- [ ] Unificar `signAndSend` en `TransactionManager`
- [ ] Dividir `useTokenActions.ts` en hooks especializados
- [ ] Actualizar `useSolanaTransaction.ts` para usar el logger

### Fase 3: Integración
- [ ] Actualizar `SolanaProvider.tsx` con `WalletProvider`
- [ ] Actualizar `WalletConnect.tsx` para usar `useWalletContext()`
- [ ] Mejorar `WalletDebugPanel.tsx` con logs del WalletLogger
- [ ] Actualizar `layout.tsx` con nuevo provider

### Fase 4: Verificación
- [ ] Verificar `console.log` de transacciones
- [ ] Verificar aislamiento `window.ethereum`
- [ ] Test con Phantom, Solflare, Backpack
- [ ] Verificar build sin errores
- [ ] Verificar lint sin warnings

---

## 7. Diagrama de Flujo de Transacciones

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Flujo de Transacción                             │
│                                                                     │
│  Usuario                    WalletContext              Blockchain   │
│   │                            │                              │     │
│   │  1. Iniciar acción         │                              │     │
│   ├───────────────────────────▶│                              │     │
│   │                            │  2. Log: buildTransaction    │     │
│   │                            ├─────────────────────────────▶│     │
│   │                            │  3. getLatestBlockhash()     │     │
│   │                            │                              │     │
│   │                            │  4. Log: transactionData     │     │
│   │                            │  (instrucciones, accounts,   │     │
│   │                            │   datos serializados)        │     │
│   │                            │                              │     │
│   │  5. Aprobar en wallet      │  6. signTransaction()       │     │
│   │◀───────────────────────────┤                              │     │
│   │                            │  7. Log: signedTransaction   │     │
│   │                            │                              │     │
│   │                            │  8. sendRawTransaction()     │     │
│   │                            ├─────────────────────────────▶│     │
│   │                            │  9. Log: transactionSent     │     │
│   │                            │     (signature, blockhash)   │     │
│   │                            │                              │     │
│   │                            │ 10. confirmTransaction()     │     │
│   │                            ├─────────────────────────────▶│     │
│   │                            │ 11. Log: transactionConfirmed│     │
│   │                            │     (commitment, logs)       │     │
│   │                            │                              │     │
│   │ 12. Resultado              │                              │     │
│   │◀───────────────────────────┤                              │     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Formato de Logging Estándar

Todos los logs seguirán este formato:

```
[TIMESTAMP] [LEVEL] [CATEGORY] MESSAGE
├─ key1: value1
├─ key2: value2
└─ keyN: valueN
```

### Categorías:
| Categoría | Descripción | Nivel |
|-----------|-------------|-------|
| `wallet` | Estados de conexión/desconexión | info |
| `transaction` | Ciclo de vida de transacciones | info |
| `network` | Comunicaciones RPC | debug |
| `error` | Errores con contexto | error |
| `ethereum` | Eventos window.ethereum | warn |

### Ejemplo completo:
```
[2026-04-28T10:30:00.000Z] [INFO] [wallet] Connecting to Phantom
├─ wallet: Phantom
├─ status: connecting
└─ publicKey: null

[2026-04-28T10:30:01.000Z] [INFO] [wallet] Connected successfully
├─ wallet: Phantom
├─ status: connected
└─ publicKey: Abc123...Xyz789

[2026-04-28T10:30:05.000Z] [INFO] [transaction] Building transaction
├─ programId: 6XDDBd...zVpe
├─ instructions: 2
├─ accounts: ["Abc123...", "Def456..."]
└─ data: "010000..."

[2026-04-28T10:30:06.000Z] [DEBUG] [network] RPC Request
├─ endpoint: http://localhost:8899
├─ method: getLatestBlockhash
└─ params: ["confirmed"]

[2026-04-28T10:30:06.500Z] [DEBUG] [network] RPC Response
├─ method: getLatestBlockhash
├─ blockhash: Block456...
└─ lastValidBlockHeight: 123456789

[2026-04-28T10:30:07.000Z] [INFO] [transaction] Transaction sent
├─ signature: Sig123...
├─ blockhash: Block456...
└─ blockHeight: 123456789

[2026-04-28T10:30:08.000Z] [INFO] [transaction] Transaction confirmed
├─ signature: Sig123...
├─ commitment: confirmed
└─ logs: ["Program log: Instruction: Mint"]

[2026-04-28T10:30:10.000Z] [WARN] [ethereum] window.ethereum override detected
├─ provider: Backpack
├─ originalProvider: Phantom
└─ action: Shielded
```

---

## 9. Criterios de Éxito

1. **Aislamiento completo**: La dapp funciona independientemente de `window.ethereum`
2. **Logging verificable**: Todas las transacciones son visibles en `console.log`
3. **Arquitectura limpia**: Hooks especializados con < 300 líneas cada uno
4. **Provider unificado**: Un solo punto de acceso para operaciones de wallet
5. **Sin duplicación**: `signAndSend` implementado una sola vez
6. **Compatibilidad**: Funciona con Phantom, Solflare, Ledger, Trezor, y Backpack
7. **Build limpio**: 0 errores, 0 warnings

---

## 10. Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Breaking changes en hooks existentes | Alta | Medio | Mantener exports legacy con deprecation warnings |
| Regresión en funcionalidad | Media | Alto | Tests manuales exhaustivos antes de merge |
| Conflictos con wallets no soportadas | Baja | Bajo | Fallback graceful con mensajes claros |
| Performance overhead del logger | Baja | Bajo | Logger desactivable en producción |

---

## 11. Orden de Ejecución Recomendado

1. **Fase 1.1-1.3**: Crear Wallet Abstraction Layer (fundamento)
2. **Fase 2.1-2.3**: Refactorizar hooks (depende de Fase 1)
3. **Fase 3.1-3.3**: Integrar con UI (depende de Fase 2)
4. **Fase 4**: Verificación y testing (depende de Fase 3)

Cada fase debe ser completada y verificada antes de proceder a la siguiente.
