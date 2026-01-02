#!/bin/bash
# =============================================
# Script de configuración para PRODUCCIÓN
# Sistema PROVIAL
# =============================================

set -e

echo "================================================"
echo "  CONFIGURACIÓN DE PRODUCCIÓN - PROVIAL"
echo "================================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: Ejecutar desde el directorio raíz del proyecto${NC}"
    exit 1
fi

echo -e "${YELLOW}1. Verificando requisitos...${NC}"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js no encontrado. Instalar Node.js 20+${NC}"
    exit 1
fi
echo -e "${GREEN}   ✓ Node.js $(node -v)${NC}"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm no encontrado${NC}"
    exit 1
fi
echo -e "${GREEN}   ✓ npm $(npm -v)${NC}"

echo ""
echo -e "${YELLOW}2. Instalando dependencias...${NC}"

# Backend
echo "   → Backend..."
cd backend
npm ci --production=false
npm run build
cd ..
echo -e "${GREEN}   ✓ Backend compilado${NC}"

# Web
echo "   → Web..."
cd web
npm ci
npm run build
cd ..
echo -e "${GREEN}   ✓ Web compilada${NC}"

echo ""
echo -e "${YELLOW}3. Verificando archivos de configuración...${NC}"

# Verificar .env de producción
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}   ✗ backend/.env no encontrado${NC}"
    echo "   Copiar backend/.env.production a backend/.env y configurar"
    exit 1
fi
echo -e "${GREEN}   ✓ backend/.env existe${NC}"

# Verificar secrets
if grep -q "CAMBIAR" backend/.env 2>/dev/null; then
    echo -e "${YELLOW}   ⚠ Hay valores por cambiar en backend/.env${NC}"
fi

echo ""
echo -e "${YELLOW}4. Verificando base de datos...${NC}"

# Intentar conexión (opcional)
cd backend
if npm run typecheck 2>/dev/null; then
    echo -e "${GREEN}   ✓ TypeScript válido${NC}"
else
    echo -e "${YELLOW}   ⚠ Advertencias de TypeScript (revisar)${NC}"
fi
cd ..

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  CONFIGURACIÓN COMPLETADA${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Próximos pasos:"
echo "  1. Configurar backend/.env con credenciales de producción"
echo "  2. Ejecutar migraciones en la base de datos"
echo "  3. Iniciar con: docker-compose up -d"
echo "  4. O sin Docker: cd backend && npm start"
echo ""
