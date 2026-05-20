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
ROOT_DIR="$(dirname "$0")/.."
SEED_FILE="$ROOT_DIR/database/seed.sql"

mkdir -p "$ROOT_DIR/database"

echo "==========================================="
echo "  DUMP BD PROVIAL — $TIMESTAMP"
echo "==========================================="

echo ""
echo "→ Exportando esquema + datos a database/seed.sql ..."
pg_dump \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  "$DB_URL" \
  > "$SEED_FILE"

SIZE=$(du -sh "$SEED_FILE" | cut -f1)
echo "✓ Snapshot guardado: database/seed.sql ($SIZE)"

echo ""
echo "==========================================="
echo "  Commitear el snapshot:"
echo "  git add database/seed.sql"
echo "  git commit -m \"chore(db): actualizar snapshot BD\""
echo "  git push origin main"
echo ""
echo "  Para restaurar en BD local:"
echo "  psql \$LOCAL_DB_URL < database/seed.sql"
echo "==========================================="
