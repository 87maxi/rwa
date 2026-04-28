# Guía de Usuario - Solana RWA Token Platform

## Tabla de Contenidos
1. [Inicio Rápido](#inicio-rápido)
2. [Página de Deploy](#página-de-deploy)
3. [Página de Manage](#página-de-manage)
   - [Transfer Tokens](#transfer-tokens)
   - [Mint Tokens](#mint-tokens)
   - [Burn Tokens](#burn-tokens)
   - [Freeze Account](#freeze-account)
   - [Agents](#agents)
   - [Transfer Owner](#transfer-owner)
   - [Transfer Freeze Authority](#transfer-freeze-authority)
   - [Supply Info](#supply-info)
   - [Compliance](#compliance)
   - [Identity](#identity)
4. [Solución de Problemas](#solución-de-problemas)

---

## Inicio Rápido

### Requisitos
- **Wallet Solana**: Backpack, Phantom, Brave Wallet, MetaMask, Ledger o Trezor
- **Red**: Localnet (desarrollo) o Devnet
- **SOL Balance**: Necesario para pagar fees de transacción

### Primeros Pasos
1. Abre la aplicación en `http://localhost:3000`
2. Conecta tu wallet haciendo clic en **"Connect Wallet"**
3. Selecciona tu wallet preferida (Backpack recomendado para localnet)
4. Una vez conectado, navega a **Deploy Token** o **Manage Tokens**

---

## Página de Deploy

**URL:** `/deploy`

La página de deploy te permite crear un nuevo token de seguridad compliant en Solana.

### Campos del Formulario

| Campo | Descripción | Requerido |
|-------|-------------|-----------|
| **Token Name** | Nombre completo del token (ej: "My Security Token") | Sí |
| **Symbol** | Símbolo corto del token (ej: "MST"), máximo 10 caracteres | Sí |
| **Decimals** | Número de decimales (0-18, recomendado: 9) | No (default: 9) |
| **Initial Supply** | Supply inicial (se puede mintear después) | No (default: 0) |
| **Mint Authority** | Dirección que puede mintear tokens (vacío = tu wallet) | No |
| **Freeze Authority** | Dirección que puede congelar cuentas (vacío = tu wallet) | No |

### Proceso de Deploy
1. Completa los campos requeridos (Name y Symbol)
2. Revisa el **Deployment Summary** en la parte inferior
3. Haz clic en **"Deploy Token"**
4. Acepta la transacción en tu wallet
5. Espera la confirmación

### Mensajes de Error Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Token already initialized at..." | Token ya existe para esta wallet | Usa otra wallet o resetea el localnet |
| "Wallet not connected" | Wallet desconectada | Conecta tu wallet primero |
| "Insufficient funds" | Sin SOL para fees | Añade SOL a tu wallet |

---

## Página de Manage

**URL:** `/manage`

La página de manage es el panel de control para gestionar tu token. Se organiza en **10 pestañas** con diferentes operaciones.

### Vista General

Al entrar verás:
- **Connected Wallet**: Tu dirección de wallet (abreviada)
- **SOL Balance**: Tu balance de SOL en tiempo real
- **Barra de pestañas**: Navegación entre las 10 operaciones

---

### Transfer Tokens

**Envía tokens a otra dirección Solana.**

**Campos:**
- **Recipient Address**: Dirección Solana del destinatario
- **Amount**: Cantidad de tokens a enviar

**Pasos:**
1. Ingresa la dirección del destinatario
2. Ingresa la cantidad de tokens
3. Haz clic en **"Transfer Tokens"**
4. Acepta la transacción en tu wallet

---

### Mint Tokens

**Crea nuevos tokens y envíalos a un destinatario.**

**Campos:**
- **Recipient Address**: Dirección que recibirá los tokens nuevos
- **Amount to Mint**: Cantidad de tokens a crear

**Pasos:**
1. Ingresa la dirección receptora
2. Ingresa la cantidad a mintear
3. Haz clic en **"Mint Tokens"**
4. Acepta la transacción

> **Nota:** Solo la Mint Authority puede mintear tokens.

---

### Burn Tokens

**Destruye tokens desde tu cuenta.**

**Campos:**
- **Amount**: Cantidad de tokens a destruir

**Pasos:**
1. Ingresa la cantidad a quemar
2. Haz clic en **"Burn Tokens"**
3. Acepta la transacción

> **Nota:** Los tokens quemados se reducen permanentemente del supply.

---

### Freeze Account

**Congela o descongela una cuenta de token.**

**Campos:**
- **Account to Freeze**: Dirección de la cuenta de token a congelar

**Pasos:**
1. Ingresa la dirección de la cuenta
2. Haz clic en **"Toggle Freeze Status"**
3. Acepta la transacción

> **Nota:** Solo la Freeze Authority puede congelar cuentas. Una cuenta congelada no puede transferir tokens.

---

### Agents

**Agrega agentes autorizados para operar con el token.**

**Campos:**
- **Agent Address**: Dirección del agente a autorizar

**Pasos:**
1. Ingresa la dirección del agente
2. Haz clic en **"Add Agent"**
3. Acepta la transacción

> **Nota:** Los agentes pueden realizar operaciones en nombre del owner.

---

### Transfer Owner

**Transfiere la propiedad del token a otra dirección.**

**Campos:**
- **New Owner Address**: Dirección del nuevo propietario

**Pasos:**
1. Ingresa la dirección del nuevo owner
2. Haz clic en **"Transfer Ownership"**
3. Acepta la transacción

> **⚠️ ADVERTENCIA:** Esta acción es irreversible. El nuevo owner tendrá control total del token.

---

### Transfer Freeze Authority

**Transfiere la autoridad de congelación a otra dirección.**

**Campos:**
- **New Freeze Authority Address**: Dirección de la nueva autoridad

**Pasos:**
1. Ingresa la dirección de la nueva autoridad
2. Haz clic en **"Transfer Freeze Authority"**
3. Acepta la transacción

> **Nota:** La Freeze Authority puede congelar/descongelar cuentas de token.

---

### Supply Info

**Visualiza información del supply del token.**

**Botón:** **"Load Supply Info"**

**Información mostrada:**
- **Current Supply**: Supply actual de tokens
- **Max Supply**: Supply máximo permitido
- **Decimals**: Número de decimales del token

**Pasos:**
1. Haz clic en **"Load Supply Info"**
2. La información se cargará automáticamente

---

### Compliance

**Gestiona el sistema de compliance del token.**

#### Initialize Compliance Aggregator
**Campos:**
- **Aggregator Account**: Dirección del aggregator (opcional)

**Pasos:**
1. Ingresa la dirección del aggregator (o deja vacío para PDA)
2. Haz clic en **"Initialize Compliance Aggregator"**
3. Acepta la transacción

#### Add Compliance Module
**Campos:**
- **Aggregator Account**: Dirección del aggregator
- **Token Program ID**: ID del programa del token
- **Module Program ID**: ID del módulo de compliance

**Pasos:**
1. Ingresa las direcciones requeridas
2. Haz clic en **"Add Compliance Module"**
3. Acepta la transacción

#### Get Aggregator State
**Campos:**
- **Aggregator Account**: Dirección del aggregator

**Pasos:**
1. Ingresa la dirección del aggregator
2. Haz clic en **"Get Aggregator State"**
3. El estado se mostrará en pantalla

---

### Identity

**Gestiona el registro de identidad del token.**

#### Initialize Identity Registry
**Campos:**
- **Registry Account**: Dirección del registry (opcional)

**Pasos:**
1. Ingresa la dirección del registry (o deja vacío para PDA)
2. Haz clic en **"Initialize Identity Registry"**
3. Acepta la transacción

#### Register Identity
**Campos:**
- **Registry Account**: Dirección del registry
- **Identity Data**: Datos de identidad

**Pasos:**
1. Ingresa los datos requeridos
2. Haz clic en **"Register Identity"**
3. Acepta la transacción

#### Register Identity with Metadata
**Campos:**
- **Registry Account**: Dirección del registry
- **Identity Name**: Nombre de la identidad
- **Identity Symbol**: Símbolo de la identidad
- **Identity Data**: Datos de identidad
- **Metadata URI**: URI de metadatos

**Pasos:**
1. Completa todos los campos
2. Haz clic en **"Register Identity with Metadata"**
3. Acepta la transacción

#### Get Identity
**Campos:**
- **Registry Account**: Dirección del registry

**Pasos:**
1. Ingresa la dirección del registry
2. Haz clic en **"Get Identity"**
3. La información de identidad se mostrará en pantalla

---

## Solución de Problemas

### Wallet no se conecta
1. Verifica que la wallet está instalada y desbloqueada
2. Recarga la página (Ctrl+Shift+R)
3. Intenta con otra wallet (Backpack recomendado)

### Transacción fallida
1. Verifica que tienes suficiente SOL para fees
2. Asegúrate de estar en la red correcta (localnet/devnet)
3. Revisa el mensaje de error en la interfaz

### "Token already initialized"
- El token ya existe para esta wallet
- Opciones:
  - Usa la página `/manage` para gestionar el token existente
  - Usa otra wallet para crear un nuevo token
  - Resetea el localnet: `pkill -f surfpool && rm -rf solana-rwa/.surfpool/*.db && surfpool start --no-deploy && bash deploy.sh`

### Transacción se queda en "Processing..."
1. Verifica que aceptaste la transacción en tu wallet
2. Espera hasta 30 segundos
3. Si persiste, recarga la página

### No veo mi token en /manage
1. Asegúrate de usar la **misma wallet** que usaste para deployar
2. El PDA se deriva de tu wallet: `[Buffer.from("token"), walletPublicKey]`
3. Verifica que el deploy fue exitoso (revisa la firma de transacción)

---

## Referencia Rápida

### Operaciones por Rol

| Rol | Operaciones Disponibles |
|-----|------------------------|
| **Owner** | Transfer, Mint, Burn, Freeze, Add Agent, Transfer Owner, Transfer Freeze Auth |
| **Agent** | Transfer (desde cuenta del owner) |
| **Freeze Authority** | Freeze/Unfreeze accounts |
| **Mint Authority** | Mint tokens |
| **Cualquier usuario** | Supply Info, Compliance, Identity |

### Límites del Sistema

- **Decimales**: 0-18 (recomendado: 9)
- **Símbolo**: Máximo 10 caracteres
- **Token por wallet**: 1 (el PDA es único por wallet)
- **Agentes**: Sin límite máximo

### Comandos de Desarrollo

```bash
# Iniciar localnet
cd solana-rwa && surfpool start --no-deploy

# Deploy programas
cd solana-rwa && bash deploy.sh

# Resetear localnet completo
pkill -f surfpool
rm -rf solana-rwa/.surfpool/*.db solana-rwa/.surfpool/*.sqlite*
cd solana-rwa && surfpool start --no-deploy
bash deploy.sh

# Iniciar frontend
cd web && npm run dev
```
