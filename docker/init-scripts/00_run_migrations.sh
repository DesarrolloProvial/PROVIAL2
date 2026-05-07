#!/bin/bash
# Se ejecuta UNA SOLA VEZ cuando el volumen de postgres está vacío (initdb).
# Si existe /backups/provial.backup: restaura la BD y pre-registra todas las
# migraciones como ya aplicadas, para que el servicio migrator solo aplique
# diferencias en vez de re-correr todo.
# Si no hay backup: deja la BD vacía y el migrator corre desde cero.

set -e

BACKUP_FILE="/backups/provial.backup"

if [ -f "$BACKUP_FILE" ]; then
    echo "=== Backup encontrado — restaurando $BACKUP_FILE ==="

    if file "$BACKUP_FILE" | grep -q "PostgreSQL custom database dump"; then
        pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges "$BACKUP_FILE" || true
    else
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$BACKUP_FILE" || true
    fi

    echo "=== Backup restaurado. Pre-registrando migraciones como aplicadas... ==="

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
else
    echo "=== Sin backup — BD limpia. El migrator aplicará todas las migraciones. ==="
fi
