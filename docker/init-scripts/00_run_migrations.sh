#!/bin/bash
# Se ejecuta UNA SOLA VEZ cuando el volumen de postgres está vacío (initdb).
#
# Prioridad:
#   1. backups/provial.backup  → restaurar BD completa con datos
#   2. /schema/000_base_schema.sql → crear esquema sin datos (para VM nueva sin backup)
#   3. Sin nada              → BD vacía; el migrator aplica todo desde cero
#
# En los casos 1 y 2, se pre-registran todas las migraciones en _schema_migrations
# para que el servicio migrator solo aplique las diferencias nuevas.

set -e

BACKUP_FILE="/backups/provial.backup"
SCHEMA_FILE="/schema/000_base_schema.sql"

_pre_register_migrations() {
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
        CREATE TABLE IF NOT EXISTS _schema_migrations (
            filename   TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    "
    for f in /migrations/*.sql; do
        fname=$(basename "$f")
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
            "INSERT INTO _schema_migrations (filename) VALUES ('$fname') ON CONFLICT DO NOTHING;" > /dev/null
    done
    echo "=== Pre-registro completo. El migrator solo aplicará migraciones nuevas. ==="
}

if [ -f "$BACKUP_FILE" ]; then
    echo "=== Backup encontrado — restaurando $BACKUP_FILE ==="

    if file "$BACKUP_FILE" | grep -q "PostgreSQL custom database dump"; then
        pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges "$BACKUP_FILE" || true
    else
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$BACKUP_FILE" || true
    fi

    echo "=== Backup restaurado. Pre-registrando migraciones... ==="
    _pre_register_migrations

elif [ -f "$SCHEMA_FILE" ]; then
    echo "=== Sin backup — aplicando esquema base desde $SCHEMA_FILE ==="
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SCHEMA_FILE" || true

    echo "=== Esquema aplicado. Pre-registrando migraciones... ==="
    _pre_register_migrations

else
    echo "=== Sin backup ni esquema base — BD limpia. El migrator aplicará todas las migraciones desde cero. ==="
fi
