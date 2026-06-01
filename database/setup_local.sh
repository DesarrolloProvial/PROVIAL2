#!/bin/bash
# =============================================================
# ProVial — Montar base de datos local desde snapshot
# =============================================================
# Requisito: PostgreSQL instalado y corriendo localmente
#
# Uso:
#   bash database/setup_local.sh
#   bash database/setup_local.sh provial_local postgres
#
# Argumentos opcionales:
#   $1 = nombre de la base de datos  (default: provial_local)
#   $2 = usuario de PostgreSQL        (default: postgres)
# =============================================================

set -e

DB_NAME="${1:-provial_local}"
DB_USER="${2:-postgres}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SEED_FILE="$SCRIPT_DIR/seed.sql"

echo ""
echo "============================================="
echo "  PROVIAL — Configuración de BD local"
echo "============================================="
echo "  Base de datos : $DB_NAME"
echo "  Usuario       : $DB_USER"
echo "  Seed file     : $SEED_FILE"
echo ""

# Verificar que seed.sql existe
if [ ! -f "$SEED_FILE" ]; then
  echo "ERROR: No se encontró $SEED_FILE"
  echo "Asegúrate de estar en el directorio raíz del repositorio."
  exit 1
fi

# Crear la base de datos si no existe
echo "→ Verificando base de datos '$DB_NAME'..."
DB_EXISTS=$(psql -U "$DB_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")
if [ "$DB_EXISTS" != "1" ]; then
  echo "  Creando base de datos '$DB_NAME'..."
  psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
  echo "  ✓ Base de datos creada."
else
  echo "  ✓ Base de datos ya existe — se sobreescribirán los datos."
fi

# Restaurar snapshot
echo ""
echo "→ Restaurando datos desde seed.sql..."
echo "  (Esto puede tardar unos segundos...)"
psql -U "$DB_USER" -d "$DB_NAME" -f "$SEED_FILE" -q

echo ""
echo "============================================="
echo "  ✓ Base de datos lista"
echo "============================================="
echo ""
echo "  Configura el backend con esta cadena de conexión:"
echo ""
echo "  DATABASE_URL=postgresql://$DB_USER:TU_PASSWORD@localhost:5432/$DB_NAME"
echo ""
echo "  (Reemplaza TU_PASSWORD con la contraseña de tu usuario PostgreSQL)"
echo ""
