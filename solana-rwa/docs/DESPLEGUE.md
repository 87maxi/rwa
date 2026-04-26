# Guía de Despliegue - Solana RWA

## Resumen

Esta guía describe el workflow de deployment para el proyecto Solana RWA. El sistema utiliza **Anchor** para el deployment de programas y **txtx/surfpool** para la inicialización y operaciones.

## ¿Por qué dos herramientas?

### Anchor para Deployment

Anchor maneja correctamente el deployment de programas porque:

1. **Consistency keypair/IDL**: Los program IDs definidos en `declare_id!()` macros son usados consistentemente entre el código, la IDL, y el deployment
2. **Program upgrades**: Cuando se hace upgrade de un programa en Solana, el program ID se mantiene (solo se actualiza el bytecode)
3. **Herramienta establecida**: Anchor es la herramienta estándar para desarrollo con Solana

### txtx/surfpool para Inicialización

txtx es ideal para:

1. **Runbooks de inicialización**: Crear PDA state accounts para cada programa
2. **Operaciones de token**: Minting, burning, transfers, etc.
3. **Automatización**: Workflows reproducibles con DSL específico

## Error Común: Keypair Mismatch

### Síntoma

```
error: program keypair does not match program pubkey found in IDL:
  keypair pubkey: '6NsNsKQEtE7MmPZk4XseRRj9JPAwpmy2ChLbAEMfdgzn'
  IDL pubkey: 'AmFr5NUWU3E4neLzKHe2pkX5yTochgFTUHtwMB7aDszK'
```

### Causa

`svm::deploy_program` en txtx/surfpool genera un keypair aleatorio en cada ejecución, pero la IDL tiene un pubkey fijo definido por `declare_id!()`.

### Solución

Usar `anchor deploy` para el deployment de programas. Anchor usa los program IDs de `declare_id!()` consistentemente.

## Requisitos Previos

### Herramientas

1. **Rust & Cargo**: https://rustup.rs/
2. **Anchor CLI**: `cargo install anchor-cli`
3. **Solana CLI**: https://docs.solana.com/cli/install-solana-cli-tools
4. **Surfpool CLI**: `curl -sL https://run.surfpool.run/ | bash`

### Configuración

```bash
# Configurar keypair por defecto
solana config set --keypair ~/.config/solana/id.json

# Verificar instalación
anchor --version
solana --version
surfpool --version
```

## Workflow de Deployment Local

### Método Recomendado: Scripts Automáticos

```bash
cd solana-rwa

# 1. Iniciar Surfpool localnet
surfpool start

# Dashboard disponible en: http://localhost:18488

# 2. Deploy programas
./deploy.sh

# 3. Inicializar programas
./init.sh

# 4. Verificar deployment
solana program list

# 5. Ejecutar tests
anchor test --provider.url http://127.0.0.1:8899
```

### Método Manual

```bash
cd solana-rwa

# 1. Iniciar validator
solana-test-validator --reset

# 2. Build programas
anchor build

# 3. Deploy cada programa en orden de dependencia
anchor deploy --program-name compliance_aggregator
anchor deploy --program-name identity_registry
anchor deploy --program-name solana_rwa

# 4. Generar IDLs
anchor idl build -p compliance_aggregator -o idl_compliance_aggregator.json
anchor idl build -p identity_registry -o idl_identity_registry.json
anchor idl build -p solana_rwa -o idl_solana_rwa.json

# 5. Inicializar programas
txtx run compliance-initialization --env localnet
txtx run identity-initialization --env localnet
txtx run token-initialization --env localnet
```

## Opciones de Deployment

### Script deploy.sh

```bash
./deploy.sh                    # Deploy a localnet
./deploy.sh devnet             # Deploy a devnet
./deploy.sh mainnet            # Deploy a mainnet
./deploy.sh --reset            # Reset validator y deploy a localnet
```

### Script init.sh

```bash
./init.sh                      # Inicializar en localnet
./init.sh devnet               # Inicializar en devnet
./init.sh mainnet              # Inicializar en mainnet
```

## Orden de Dependencia

Los programas deben ser deployados e inicializados en el siguiente orden:

```
1. compliance_aggregator (sin dependencias)
   ↓
2. identity_registry (depende de compliance_aggregator)
   ↓
3. solana_rwa (depende de ambos)
```

## Program IDs

### Localnet (Desarrollo)

| Programa | Program ID |
|----------|------------|
| compliance_aggregator | `AmFr5NUWU3E4neLzKHe2pkX5yTochgFTUHtwMB7aDszK` |
| identity_registry | `48szCrY5scr6MbqdTDJe8X8NAWejkRaiTe4VEyCGRTu9` |
| solana_rwa | `EwAUDz8ZVXqJQqYYcd8ZEPSGpx2HvG61PweDThK5vrQt` |

### Devnet/Mainnet

Los program IDs para devnet/mainnet se generan en el primer deployment y se mantienen en upgrades posteriores. Actualizar los archivos de configuración después del deployment:

- `Anchor.toml`
- `programs/*/src/ids.rs`
- `txtx.yml` (sección environments)
- `web/src/config/solana.ts`
- IDL files

## Verificación Post-Deployment

### Verificar Programas Deployados

```bash
# List all programs
solana program list

# Buscar los program IDs específicos
solana program list | grep -E "AmFr5NU|48szCr|EwAUDz"
```

### Verificar State Accounts

```bash
# Compliance Aggregator PDA
# PDA derivation: seeds = [b"aggregator"], program_id = compliance_aggregator_program_id

# Identity Registry PDA
# PDA derivation: seeds = [b"registry"], program_id = identity_registry_program_id

# Token State PDA
# PDA derivation: seeds = [b"token", payer.public_key], program_id = solana_rwa_program_id
```

### Verificar con Anchor Tests

```bash
anchor test --provider.url http://127.0.0.1:8899
```

## Program Upgrades

Para actualizar un programa deployado:

```bash
# 1. Hacer cambios en el código
# 2. Build
anchor build

# 3. Deploy con mismo program ID (anchor preserva el program ID)
anchor deploy --program-name <program_name>

# 4. Verificar que el program ID no cambió
solana program list | grep <program_id>
```

**Importante**: El program ID se mantiene en upgrades. Solo el bytecode (BPF program) se actualiza.

## Troubleshooting

### Error: "No validator running"

```
AccountNotFound: pubkey=...: error sending request for url (http://127.0.0.1:8899/)
```

**Solución**: Iniciar el validator primero:
```bash
solana-test-validator --reset
# O
surfpool start
```

### Error: "Program not found"

```
Error: Program not found
```

**Solución**: Verificar que el programa fue deployado:
```bash
solana program list | grep <program_id>
```

### Error: "IDL file not found"

```
invalid anchor idl location ./target/idl/...
```

**Solución**: Generar IDLs:
```bash
anchor idl build -p <program_name> -o idl_<program_name>.json
```

### Error: "Keypair not found"

```
Wallet file not found: ~/.config/solana/devnet.json
```

**Solución**: Configurar wallet para la red correspondiente:
```bash
# Devnet
solana config set --url https://api.devnet.solana.com
solana config set --keypair ~/.config/solana/devnet.json

# Mainnet
solana config set --url https://api.mainnet-beta.solana.com
solana config set --keypair ~/.config/solana/mainnet.json
```

## CI/CD Integration

### Ejemplo de Pipeline

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: |
          cargo install anchor-cli
          sh -c "$(curl -sSfL https://release.solana.com/release/stable/install)"
          
      - name: Build
        run: |
          cd solana-rwa
          anchor build
          
      - name: Test
        run: |
          solana-test-validator --reset &
          sleep 15
          anchor test
          
      - name: Deploy
        run: |
          ./deploy.sh devnet
        env:
          SOLANA_KEYPAIR_PATH: ${{ secrets.SOLANA_KEYPAIR_PATH }}
```

## Referencias

- [Anchor Documentation](https://book.anchor-lang.com/)
- [Solana CLI Documentation](https://docs.solana.com/cli)
- [Surfpool Documentation](https://docs.surfpool.run/)
- [TXTX Documentation](https://txtx.dev/)

## Glosario

| Término | Descripción |
|---------|-------------|
| **PDA** | Program Derived Address - Dirección derivada del programa |
| **IDL** | Interface Description Language - Interfaz del programa |
| **CPI** | Cross-Program Invocation - Llamada entre programas |
| **BPF** | Berkeley Packet Filter - Formato de programas en Solana |
| **Validator** | Nodo que valida transacciones en la red |
| **Surfpool** | Reemplazo mejorado de solana-test-validator |
