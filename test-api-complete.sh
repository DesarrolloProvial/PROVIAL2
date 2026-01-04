#!/bin/bash

# Script completo de pruebas de API PROVIAL
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMzLCJyb2wiOiJCUklHQURBIiwic2VkZSI6NywicHVlZGVfdmVyX3RvZGFzX3NlZGVzIjpmYWxzZSwiaWF0IjoxNzY3MDM3NjE3LCJleHAiOjE3NjcwODA4MTd9.dLnaPW4RVeXCwF3eiEPXvMqxlhrn7L6IVjm0OLDxCZE"
BASE_URL="http://localhost:3000/api"

echo "=================================================="
echo "PRUEBAS COMPLETAS DE API - PROVIAL"
echo "Usuario: Laj Tecu Juan Antonio (ID: 33) - BRIGADA"
echo "Sede: 7 (Palín Escuintla)"
echo "=================================================="

echo ""
echo "=== 1. Mi perfil (GET /api/auth/me) ==="
curl -s -X GET "$BASE_URL/auth/me" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 2. Mi asignación hoy (GET /api/turnos/mi-asignacion-hoy) ==="
curl -s -X GET "$BASE_URL/turnos/mi-asignacion-hoy" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 3. Mi salida activa (GET /api/salidas/mi-salida-activa) ==="
curl -s -X GET "$BASE_URL/salidas/mi-salida-activa" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 4. Rutas de patrullaje (GET /api/geografia/rutas) ==="
curl -s -X GET "$BASE_URL/geografia/rutas" -H "Authorization: Bearer $TOKEN" | head -c 500
echo ""

echo ""
echo "=== 5. Departamentos (GET /api/geografia/departamentos) ==="
curl -s -X GET "$BASE_URL/geografia/departamentos" -H "Authorization: Bearer $TOKEN" | head -c 500
echo ""

echo ""
echo "=== 6. Situaciones de mi unidad hoy (GET /api/situaciones/mi-unidad/hoy) ==="
curl -s -X GET "$BASE_URL/situaciones/mi-unidad/hoy" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 7. Mis situaciones (GET /api/situaciones) ==="
curl -s -X GET "$BASE_URL/situaciones" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=================================================="
echo "PRUEBAS COMPLETADAS"
echo "=================================================="
