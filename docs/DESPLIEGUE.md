# Guía de Despliegue Local - Solana RWA Token Platform

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Instalación de Dependencias](#instalación-de-dependencias)
3. [Configuración del Entorno](#configuración-del-entorno)
4. [Despliegue del Smart Contract](#despliegue-del-smart-contract)
5. [Despliegue del Frontend](#despliegue-del-frontend)
6. [Verificación](#verificación)
7. [Tests](#tests)
8. [Comandos Útiles](#comandos-útiles)
9. [Solución de Problemas](#solución-de-problemas)

---

## Prerrequisitos

### Sistema Operativo

- **Linux** (Ubuntu 20.04+ recomendado)
- **macOS** (10.15+)
- **Windows** (WSL2 requerido)

### Software Requerido

| Software | Versión | Propósito | Instalación |
|----------|---------|-----------|-------------|
| **Rust** | latest | Compilar smart contracts | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **Cargo** | latest | Gestor de paquetes Rust | Viene con Rust |
| **Solana CLI** | latest | Interactuar con Solana | `sh -c "$(curl -sSfL https://release.solana.com/v1.18.18/install)"` |
| **Anchor CLI** | 0.30.x | Framework para smart contracts | `cargo install --git https://github.com/coral-xyz/anchor avm --locked` |
| **Node.js** | 18+ | Ejecutar frontend | `nvm install 18` |
| **npm** | 9+ | Gestor de paquetes frontend | Viene con Node.js |
| **Git** | latest | Control de versiones | `sudo apt install git` |

### Verificar Instalación

```bash
# Verificar Rust
rustc --version
cargo --version

# Verificar Solana
solana --version

# Verificar Anchor
avm --version

# Verificar Node.js
node --version
npm --version
```

---

## Instalación de Dependencias

### Paso 1: Clonar el Repositorio

```bash
# Clonar el repositorio
git clone <repository-url>
cd rwa

# Inicializar submódulos (si existen)
git submodule init
git submodule update
```

### Paso 2: Instalar Solana Tool Suite

```bash
# Instalar Solana CLI (si no está instalado)
sh -c "$(curl -sSfL https://release.solana.com/v1.18.18/install)"

# Reiniciar el shell o ejecutar:
export PATH="$HOME/.local/share/solana/install/active_solana/bin:$PATH"

# Verificar instalación
solana --version
```

### Paso 3: Instalar Anchor Framework

```bash
# Instalar avm (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm --locked

# Instalar Anchor CLI 0.30.x
avm install 0.30.1
avm use 0.30.1

# Verificar instalación
anchor --version
```

### Paso 4: Instalar Dependencias del Frontend

```bash
# Navegar al directorio web
cd web

# Instalar dependencias
npm install

# Volver al directorio raíz
cd ..
```

### Paso 5: Instalar Dependencias del Smart Contract

```bash
# Navegar al directorio solana-rwa
cd solana-rwa

# Instalar dependencias de Node (para tests TS)
npm install

# Compilar programas Rust
anchor build
```

---

## Configuración del Entorno

### Paso 1: Configurar Variables de Entorno

```bash
# Navegar al directorio web
cd web

# Crear archivo .env.local
cp .env.local.example .env.local
```

### Paso 2: Editar `.env.local`

```bash
# Abrir el archivo con tu editor favorito
nano .env.local
# o
code .env.local
```

**Contenido de `.env.local`:**

```env
# Solana Network Configuration
NEXT_PUBLIC_SOLANA_NETWORK=localnet
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=http://localhost:8899

# Program IDs (Localnet - defaults from Anchor.toml)
NEXT_PUBLIC_SOLANA_RWA_PROGRAM_ID=7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L
NEXT_PUBLIC_IDENTITY_REGISTRY_PROGRAM_ID=3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5
NEXT_PUBLIC_COMPLIANCE_AGGREGATOR_PROGRAM_ID=EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT

# Development
NEXT_PUBLIC_ENABLE_DEBUG=true
```

### Paso 3: Verificar Configuración

```bash
# Verificar que el archivo existe
ls -la .env.local

# Verificar contenido
cat .env.local
```

---

## Despliegue del Smart Contract

### Paso 1: Iniciar Nodo Local de Solana

```bash
# Desde el directorio solana-rwa
cd solana-rwa

# Opcional: Reiniciar el cluster local (borra todos los datos)
solana-test-validator --reset

# O iniciar sin reset (preserva estado)
solana-test-validator
```

**Esto iniciará:**
- Nodo RPC en `http://localhost:8899`
- WebSocket en `ws://localhost:8899`
- Cluster con 8 validators + faucet
- Program IDs pre-configurados

### Paso 2: Configurar Wallet de Despliegue

```bash
# Verificar wallet por defecto
cat ~/.config/solana/id.json

# O usar una wallet específica
solana config set --keypair /path/to/your/keypair.json
```

### Paso 3: Generar IDLs (Optional)

```bash
# Desde el directorio solana-rwa
anchor build

# Esto generará:
# - target/idl/*.json
# - target/types/*.ts
```

### Paso 4: Desplegar Smart Contracts

#### Opción A: Usando Anchor (Recomendado)

```bash
# Desde el directorio solana-rwa
cd solana-rwa

# Deploy a localnet
anchor deploy

# Verificar despliegue
anchor run deploy
```

#### Opción B: Script de Despliegue Personalizado

```bash
# Desde el directorio solana-rwa
cd solana-rwa

# Hacer ejecutable el script
chmod +x deploy_simple.sh

# Ejecutar despliegue
./deploy_simple.sh
```

### Paso 5: Verificar Despliegue

```bash
# Verificar que los programas están deployados
solana program show 7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L

# Verificar todas las cuentas del programa
solana account 7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L --output json
```

---

## Despliegue del Frontend

### Paso 1: Desarrollo Local

```bash
# Desde el directorio web
cd web

# Iniciar servidor de desarrollo
npm run dev
```

**Esto abrirá:**
- Frontend en `http://localhost:3000`
- Hot reload habilitado
- API routes en `http://localhost:3000/api/*`

### Paso 2: Verificar Frontend

1. Abrir navegador en `http://localhost:3000`
2. Verificar que la página principal carga
3. Conectar wallet (Phantom/Solflare)
4. Verificar que el NetworkStatus muestra "localnet"

### Paso 3: Build de Producción

```bash
# Desde el directorio web
cd web

# Crear build optimizado
npm run build

# Iniciar servidor de producción
npm start
```

**Build de producción:**
- Servidor en `http://localhost:3000`
- Código minificado
- Assets optimizados
- Tree-shaking habilitado

---

## Verificación

### Verificación Completa del Sistema

```bash
# 1. Verificar nodo Solana
solana ping --url http://localhost:8899

# 2. Verificar programas deployados
solana program show 7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L
solana program show 3QreJufDNn5MgdhDtWuYBW2WmQnbDzwf9zLTxXkub8X5
solana program show EPjdwvyJ8XQfXZvoLufER1trT78Kx7ujYWEKbgvKunzT

# 3. Verificar frontend
curl -I http://localhost:3000

# 4. Verificar TypeScript
cd web && npm run build
```

### Verificación de Funcionalidad

1. **Conectar Wallet**
   - Abrir `http://localhost:3000`
   - Click en "Connect Wallet"
   - Seleccionar Phantom/Solflare
   - Verificar dirección mostrada

2. **Desplegar Token**
   - Navegar a `/deploy`
   - Rellenar formulario
   - Click en "Deploy Token"
   - Confirmar en wallet
   - Verificar mensaje de éxito

3. **Gestionar Token**
   - Navegar a `/manage`
   - Verificar balance SOL
   - Probar pestañas (Transfer, Mint, Burn, etc.)

---

## Tests

### Tests del Smart Contract (Rust)

```bash
# Desde el directorio solana-rwa
cd solana-rwa

# Iniciar test validator
solana-test-validator --reset

# Ejecutar tests de Anchor
anchor test

# O usar yarn
yarn test
```

### Tests de Integración (TypeScript)

```bash
# Desde el directorio solana-rwa
cd solana-rwa

# Ejecutar tests TypeScript
yarn run ts-mocha -p ./tsconfig.json -t 1000000 "tests/**/*.ts"
```

### Tests del Frontend

```bash
# Desde el directorio web
cd web

# Ejecutar tests (si están configurados)
npm test
```

---

## Comandos Útiles

### Solana CLI

```bash
# Configurar cluster
solana config set --url http://localhost:8899

# Verificar balance
solana balance

# Enviar transacción de prueba
solana airdrop 100  # (a la wallet por defecto en localnet)

# Verificar última transacción
solana confirm -v <signature>

# Ver cuenta específica
solana account <address>

# Reiniciar cluster
solana-test-validator --reset
```

### Anchor CLI

```bash
# Crear nuevo programa
anchor init <program-name>

# Build programa
anchor build

# Deploy programa
anchor deploy

# Ejecutar tests
anchor test

# Generar IDL
anchor build --idl target/idl/<program-name>.json

# Generar TypeScript client
anchor build --typescript
```

### Next.js

```bash
# Desarrollo
npm run dev

# Build producción
npm run build

# Iniciar producción
npm start

# Lint
npm run lint

# Format
npm run format
```

---

## Solución de Problemas

### Problema: "solana-command not found"

```bash
# Solución: Agregar al PATH
echo 'export PATH="$HOME/.local/share/solana/install/active_solana/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Problema: "anchor: command not found"

```bash
# Solución: Instalar Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.30.1
avm use 0.30.1
```

### Problema: "Module not found: @solana/web3.js"

```bash
# Solución: Instalar dependencias del frontend
cd web
npm install
```

### Problema: "Connection refused to localhost:8899"

```bash
# Solución: Iniciar test validator
solana-test-validator --reset
```

### Problema: "Wallet connection failed"

```bash
# Solución: Verificar configuración del wallet
# 1. Asegurarse de que Phantom/Solflare está instalado
# 2. Verificar que está conectado a la red correcta
# 3. Para localnet, configurar manualmente la URL en Phantom:
#    Settings → Developer → Custom RPC → http://localhost:8899
```

### Problema: "Program ID not found"

```bash
# Solución: Verificar Anchor.toml
cat solana-rwa/Anchor.toml

# Verificar .env.local
cat web/.env.local

# Asegurarse de que los Program IDs coinciden
```

### Problema: "Insufficient funds"

```bash
# Solución: Solicitar airdrop en localnet
solana airdrop 100
```

### Problema: "Build fails with TypeScript errors"

```bash
# Solución: Verificar versiones
node --version  # Debe ser 18+
npm --version   # Debe ser 9+

# Limpiar y reinstalar
cd web
rm -rf node_modules package-lock.json
npm install

# Verificar TypeScript
npx tsc --noEmit
```

---

## Flujo de Trabajo Recomendado

### Desarrollo Diario

```bash
# 1. Iniciar terminal 1 - Test Validator
solana-test-validator

# 2. Iniciar terminal 2 - Frontend
cd web
npm run dev

# 3. Desarrollar y probar
#    - Abrir http://localhost:3000
#    - Probar funcionalidad
#    - Verificar consola del navegador
```

### Desplegar Cambios en Smart Contract

```bash
# 1. Modificar código Rust en solana-rwa/programs/
# 2. Compilar
cd solana-rwa
anchor build

# 3. Deploy
anchor deploy

# 4. Ejecutar tests
anchor test

# 5. Reiniciar frontend si es necesario
#    (en terminal del frontend)
```

### Preparar para Producción

```bash
# 1. Actualizar .env.production con Program IDs de mainnet
# 2. Build
cd web
npm run build

# 3. Verificar build
npm start

# 4. Desplegar en servidor (Vercel, Netlify, etc.)
```

---

## Resumen de Pasos Rápidos

```bash
# 1. Instalar dependencias del sistema
# (ver sección Prerrequisitos)

# 2. Clonar y configurar
git clone <repo>
cd rwa/solana-rwa
anchor build
cd ../web
npm install

# 3. Configurar entorno
cp .env.local.example .env.local

# 4. Iniciar todo
# Terminal 1:
solana-test-validator
# Terminal 2:
cd solana-rwa && anchor deploy
# Terminal 3:
cd web && npm run dev

# 5. Abrir navegador
# http://localhost:3000
```
