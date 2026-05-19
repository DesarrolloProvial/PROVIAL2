#!/bin/bash
# =============================================================
# dump_bd.sh — Volcado completo de BD Railway (esquema + datos)
# =============================================================
# Uso:
#   DATABASE_URL="postgresql://usuario:pass@host:port/db" bash scripts/dump_bd.sh
#
# Si DATABASE_URL no está seteado en el entorno, usa el valor hardcodeado
# de FALLBACK_URL (solo para uso local — nunca commitear con credenciales).
# =============================================================

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL no está definido."
  echo "Uso: DATABASE_URL=\"postgresql://...\" bash scripts/dump_bd.sh"
  exit 1
fi
DB_URL="$DATABASE_URL"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTDIR="$(dirname "$0")/dumps"
OUTFILE="$OUTDIR/provial_full_${TIMESTAMP}.sql"
SCHEMA_FILE="$OUTDIR/provial_schema_${TIMESTAMP}.sql"

mkdir -p "$OUTDIR"

echo "==========================================="
echo "  DUMP BD PROVIAL — $TIMESTAMP"
echo "==========================================="

# --- Volcado completo (esquema + datos) ---
echo ""
echo "→ Exportando esquema + datos..."
pg_dump \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  "$DB_URL" \
  > "$OUTFILE"

SIZE=$(du -sh "$OUTFILE" | cut -f1)
echo "✓ Full dump: $OUTFILE ($SIZE)"

# --- Volcado solo esquema (DDL) ---
echo ""
echo "→ Exportando solo esquema (DDL)..."
pg_dump \
  --no-owner \
  --no-acl \
  --schema-only \
  --clean \
  --if-exists \
  "$DB_URL" \
  > "$SCHEMA_FILE"

SCHEMA_SIZE=$(du -sh "$SCHEMA_FILE" | cut -f1)
echo "✓ Schema dump: $SCHEMA_FILE ($SCHEMA_SIZE)"

echo ""
echo "==========================================="
echo "  Para restaurar en otra BD:"
echo "  psql \$TARGET_URL < $OUTFILE"
echo "==========================================="
