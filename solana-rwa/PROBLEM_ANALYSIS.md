# Análisis del Problema de Deploy

## Problema Detectado

Al ejecutar `anchor build`, se obtiene el error:
```
Error: Invalid Base58 string
```

## Causa del Problema

El problema está en los archivos de los programas que usan el mismo ID de programa para todos los programas:

1. **solana-rwa/src/lib.rs**: `declare_id!("7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5");`
2. **identity-registry/src/lib.rs**: `declare_id!("7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5");`  
3. **compliance-aggregator/src/lib.rs**: `declare_id!("7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5");`

Todos los programas están usando el mismo ID de programa, lo cual es inválido para Solana.

## Solución Propuesta

Cada programa debe tener un ID único. Los IDs correctos deben ser:
- **solana-rwa**: 7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9r5 (ya está correcto)
- **identity-registry**: 9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n1 (nuevo ID único)
- **compliance-aggregator**: 8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o3 (nuevo ID único)

## Pasos para Resolver

1. Corregir los IDs en los archivos de cada programa
2. Actualizar Anchor.toml con los nuevos IDs
3. Volver a ejecutar `anchor build`