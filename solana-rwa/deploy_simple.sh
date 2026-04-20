#!/bin/bash
echo 'Iniciando despliegue del sistema RWA en Solana...'
echo 'Verificando estado del entorno...'
anchor --version 2>/dev/null || echo 'Anchor no disponible'
echo 'Configuración de Anchor:'
cat Anchor.toml | grep -E '^[a-zA-Z]' | head -10
echo ''
echo 'Intentando despliegue directo...'
anchor deploy 2>&1 | head -20

