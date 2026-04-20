#!/bin/bash

echo "=== Verificación de Estructura del Proyecto ==="

echo "1. Verificando archivos de IDL..."
if [ -d "target/idl" ]; then
    echo "✅ Directorio target/idl existe"
    ls -la target/idl/
else
    echo "❌ Directorio target/idl no existe"
fi

echo ""
echo "2. Verificando archivos de programas..."
if [ -d "programs/solana-rwa" ]; then
    echo "✅ Directorio programs/solana-rwa existe"
    echo "   Archivos en el directorio:"
    ls -la programs/solana-rwa/
fi

if [ -d "programs/identity-registry" ]; then
    echo "✅ Directorio programs/identity-registry existe"
    echo "   Archivos en el directorio:"
    ls -la programs/identity-registry/
fi

if [ -d "programs/compliance-aggregator" ]; then
    echo "✅ Directorio programs/compliance-aggregator existe"
    echo "   Archivos en el directorio:"
    ls -la programs/compliance-aggregator/
fi

echo ""
echo "3. Verificando archivos de configuración..."
if [ -f "Anchor.toml" ]; then
    echo "✅ Archivo Anchor.toml existe"
    echo "   Contenido relevante:"
    grep -E "(solana_rwa|identity_registry|compliance_aggregator)" Anchor.toml
fi

echo ""
echo "4. Verificando IDs de programas..."
echo "   ID solana-rwa:"
grep "declare_id" programs/solana-rwa/src/lib.rs
echo "   ID identity-registry:"
grep "declare_id" programs/identity-registry/src/lib.rs
echo "   ID compliance-aggregator:"
grep "declare_id" programs/compliance-aggregator/src/lib.rs

echo ""
echo "=== Verificación completada ==="