# Guía de Usuario - Solana RWA Token Platform

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Primeros Pasos](#primeros-pasos)
3. [Conectar Wallet](#conectar-wallet)
4. [Desplegar Token](#desplegar-token)
5. [Gestionar Tokens](#gestionar-tokens)
6. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

### ¿Qué es la Solana RWA Token Platform?

Esta plataforma permite crear y gestionar **tokens de activos del mundo real (RWA - Real World Assets)** en la blockchain de Solana, con cumplimiento normativo integrado (KYC/AML).

### Características Principales

- ✅ **Tokens Cumplidos**: Tokens con reglas de cumplimiento integradas
- ✅ **KYC/AML**: Verificación de identidad on-chain
- ✅ **Control de Acceso**: Sistema de agentes autorizados
- ✅ **Congelamiento**: Capacidad de congelar cuentas incumplidoras
- ✅ **Bajo Coste**: Transacciones en Solana por menos de $0.01
- ✅ **Rápido**: Confirmación en menos de 1 segundo

### Flujo de Trabajo

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. Conecta │ --> │  2. Despliega│ --> │  3. Gestiona │
│  tu Wallet  │     │  tu Token    │     │  tus Tokens  │
└─────────────┘     └──────────────┘     └──────────────┘
```

---

## Primeros Pasos

### Requisitos

1. **Wallet Solana**: Instala [Phantom](https://phantom.app/) o [Solflare](https://solflare.com/)
2. **Fondo en SOL**: Necesitas SOL para pagar las transacciones (usa devnet para pruebas gratuitas)
3. **Navegador Web**: Chrome, Firefox o Edge

### Paso 1: Instalar Wallet

1. Ve a [phantom.app](https://phantom.app/)
2. Instala la extensión de tu navegador
3. Sigue el asistente para crear tu wallet
4. **Importante**: Guarda tu frase semilla en un lugar seguro

### Paso 2: Obtener Devnet SOL

Para pruebas, necesitas SOL de prueba (devnet):

1. Ve a [Solana Faucet](https://faucet.solana.com/)
2. Selecciona "devnet"
3. Introduce tu dirección pública
4. Solicita SOL de prueba

### Paso 3: Abrir la Plataforma

1. Abre la aplicación en tu navegador
2. Verás la página principal con dos opciones:
   - **Deploy New Token**: Crear un nuevo token
   - **Manage Tokens**: Gestionar tokens existentes

---

## Conectar Wallet

### Cómo Conectar

1. Haz clic en el botón **"Connect Wallet"** en la esquina superior derecha
2. Selecciona tu wallet (Phantom, Solflare, etc.)
3. Acepta la conexión en tu wallet
4. Verás tu dirección abreviada y el estado de la red

### Indicadores de Estado

| Indicador | Significado |
|-----------|-------------|
| 🟢 Punto verde pulsante | Conectado a la red local |
| 🟡 Punto amarillo | Conectado a devnet |
| 🔴 Punto rojo | Desconectado |
| **Slot #12345** | Número de bloque actual en la blockchain |

### Redes Soportadas

- **Localnet**: Tu nodo Solana local (`localhost:8899`)
- **Devnet**: Red de pruebas de Solana
- **Mainnet**: Red principal de Solana

---

## Desplegar Token

### Acceder a la Página de Despliegue

1. Haz clic en **"Deploy New Token"** en la página principal
2. O navega directamente a `/deploy`

### Formulario de Configuración

#### Campos Obligatorios

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Token Name** | Nombre del token (máx. 32 caracteres) | `Real Estate Token` |
| **Symbol** | Símbolo del token (máx. 8 caracteres, mayúsculas) | `RET` |

#### Campos Opcionales

| Campo | Descripción | Valor por defecto |
|-------|-------------|-------------------|
| **Decimals** | Decimales del token (0-18) | `9` |
| **Initial Supply** | Suministro inicial post-despliegue | `0` (se puede hacer mint después) |
| **Mint Authority** | Dirección con permiso para hacer mint (dejar vacío = tu wallet) | `""` |
| **Freeze Authority** | Dirección con permiso para congelar (dejar vacío = tu wallet) | `""` |

### Proceso de Despliegue

1. **Rellena el formulario** con los datos de tu token
2. **Revisa el resumen** de despliegue
3. **Haz clic en "Deploy Token"**
4. **Confirma la transacción** en tu wallet
5. **Espera la confirmación** (~10-30 segundos)

### Resultado del Despliegue

Una vez completado, verás:

- ✅ Mensaje de éxito con el **hash de transacción**
- 🔘 Botón **"Manage Token"** para ir a la gestión
- 🔘 Botón **"Go Home"** para volver al inicio

### Ejemplo de Despliegue

```
Token Name:    Green Bond Token
Symbol:        GRNBD
Decimals:      9
Initial Supply: 1000000
Network:       Solana Localnet
```

---

## Gestionar Tokens

### Acceder a la Página de Gestión

1. Haz clic en **"Manage Tokens"** en la página principal
2. O navega directamente a `/manage`

### Panel de Información

En la parte superior verás:

- **Connected Wallet**: Tu dirección pública abreviada
- **SOL Balance**: Tu saldo actual de SOL

### Pestañas de Gestión

#### 1. Transfer Tokens

Transferir tokens a otra dirección:

1. Introduce la **dirección del destinatario** (dirección pública de Solana)
2. Introduce la **cantidad** a transferir
3. Haz clic en **"Transfer Tokens"**
4. Confirma en tu wallet

#### 2. Mint Tokens

Crear nuevos tokens (requiere permiso de mint):

1. Introduce la **dirección del destinatario**
2. Introduce la **cantidad** a crear
3. Haz clic en **"Mint Tokens"**
4. Confirma en tu wallet

> ⚠️ **Nota**: Solo los agentes autorizados pueden hacer mint

#### 3. Burn Tokens

Destruir tokens permanentemente:

1. Introduce la **dirección desde la que quemar**
2. Introduce la **cantidad** a quemar
3. Haz clic en **"Burn Tokens"**
4. Confirma en tu wallet

> ⚠️ **Nota**: Los tokens quemados se pierden permanentemente

#### 4. Freeze Account

Congelar/descongelar una cuenta:

1. Introduce la **dirección de la cuenta** a congelar
2. Haz clic en **"Toggle Freeze Status"**
3. Confirma en tu wallet

> ⚠️ **Nota**: Solo los agentes autorizados pueden congelar cuentas

#### 5. Manage Agents

Gestionar agentes autorizados:

1. Introduce la **dirección del agente** a añadir
2. Haz clic en **"Add Agent"**
3. Confirma en tu wallet

> 💡 **Agentes**: Son direcciones autorizadas para realizar operaciones en tu nombre

### Mensajes de Estado

| Mensaje | Significado |
|---------|-------------|
| ✅ "Transaction Submitted!" | Transacción enviada exitosamente |
| ⏳ "Processing..." | Transacción en proceso |
| ❌ Error message | La transacción falló (ver mensaje) |

---

## Preguntas Frecuentes

### ¿Qué es un token RWA?

Un token RWA (Real World Asset) representa un activo del mundo real (inmuebles, bonos, commodities) en la blockchain. Estos tokens incluyen reglas de cumplimiento normativo.

### ¿Cuánto cuesta desplegar un token?

En **localnet** (tu máquina local): Gratis
En **devnet**: ~0.001 SOL (gratuito con faucet)
En **mainnet**: ~0.01-0.1 SOL (varía según congestión)

### ¿Puedo modificar mi token después de desplegarlo?

No puedes cambiar el nombre o símbolo, pero puedes:
- Hacer mint de más tokens
- Transferir tokens
- Congelar/descongelar cuentas
- Añadir/remover agentes

### ¿Qué pasa si pierdo mi wallet?

Si pierdes tu wallet y no has guardado la clave privada, perderás el control sobre el token. Siempre guarda tu frase semilla en un lugar seguro.

### ¿Puedo usar esta plataforma en mainnet?

Sí, pero necesitas:
1. Configurar las variables de entorno con los Program IDs de mainnet
2. Tener SOL suficiente para las transacciones
3. Cumplir con todas las regulaciones aplicables

### ¿Cómo verifico una transacción?

Usa un explorador de bloques:
- **Localnet**: `http://localhost:8899` (si tienes UI local)
- **Devnet**: `https://explorer.solana.com/?cluster=devnet`
- **Mainnet**: `https://explorer.solana.com/`

Introduce el hash de transacción para ver los detalles.

---

## Soporte

Para problemas o preguntas:

1. Revisa el [README.md](../README.md) para documentación técnica
2. Revisa el [SOLANA_INTEGRATION_DOCUMENTATION.md](../SOLANA_INTEGRATION_DOCUMENTATION.md) para detalles de implementación
3. Abre un issue en el repositorio
