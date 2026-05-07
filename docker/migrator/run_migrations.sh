#!/bin/sh
# run_migrations.sh — aplica migraciones pendientes con tracking table.
# Variables requeridas: PGHOST, PGUSER, PGPASSWORD, PGDATABASE
set -e

echo "=== ProVial Migrator ==="
echo "Host: $PGHOST | DB: $PGDATABASE | User: $PGUSER"

# Crear tabla de tracking si no existe
psql -c "
CREATE TABLE IF NOT EXISTS _schema_migrations (
    filename  TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"

echo "Scanning /migrations for pending SQL files..."

APPLIED=0
SKIPPED=0
FAILED=0

for filepath in $(ls /migrations/*.sql | sort -V); do
    filename=$(basename "$filepath")

    already=$(psql -t -c "SELECT COUNT(*) FROM _schema_migrations WHERE filename = '$filename';" | tr -d ' \n')

    if [ "$already" = "1" ]; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    echo "  → Applying: $filename"
    if psql -f "$filepath" > /dev/null 2>&1; then
        psql -c "INSERT INTO _schema_migrations (filename) VALUES ('$filename');" > /dev/null
        APPLIED=$((APPLIED + 1))
        echo "    ✓ OK"
    else
        echo "    ✗ FAILED — abortando"
        FAILED=$((FAILED + 1))
        # Mostrar el error real
        psql -f "$filepath" || true
        exit 1
    fi
done

echo ""
echo "=== Resultado: $APPLIED aplicadas, $SKIPPED ya aplicadas, $FAILED errores ==="
