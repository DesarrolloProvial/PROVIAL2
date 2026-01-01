#!/bin/bash
# Script para ejecutar todas las migraciones en orden
# Este script se ejecuta automáticamente cuando se inicia el contenedor de PostgreSQL

set -e

echo "=== Iniciando ejecución de migraciones PROVIAL ==="

# Obtener lista de migraciones ordenadas numéricamente
cd /migrations

# Ejecutar migraciones base primero (001-009)
for f in 00*.sql 01*.sql 02*.sql 03*.sql 04*.sql 05*.sql 06*.sql 07*.sql; do
    if [ -f "$f" ]; then
        echo "Ejecutando: $f"
        psql -U postgres -d provial_db -f "$f" 2>&1 || echo "Warning: $f ya aplicado o error"
    fi
done

echo "=== Migraciones completadas ==="
