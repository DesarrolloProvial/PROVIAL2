#!/bin/bash

# Script de pruebas de API desde perspectiva BRIGADA
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMzLCJyb2wiOiJCUklHQURBIiwic2VkZSI6NywicHVlZGVfdmVyX3RvZGFzX3NlZGVzIjpmYWxzZSwiaWF0IjoxNzY3MDM3NjE3LCJleHAiOjE3NjcwODA4MTd9.dLnaPW4RVeXCwF3eiEPXvMqxlhrn7L6IVjm0OLDxCZE"
BASE_URL="http://localhost:3000/api"

echo "=================================================="
echo "PRUEBAS DE API - ROL BRIGADA"
echo "Usuario: Laj Tecu Juan Antonio (ID: 33)"
echo "Sede: 7 (Palín Escuintla)"
echo "=================================================="

echo ""
echo "=== 1. Mi asignación (GET /api/asignaciones/mi-asignacion) ==="
curl -s -X GET "$BASE_URL/asignaciones/mi-asignacion" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 2. Mi asignación de hoy (GET /api/turnos/mi-asignacion-hoy) ==="
curl -s -X GET "$BASE_URL/turnos/mi-asignacion-hoy" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 3. Mi salida activa (GET /api/salidas/mi-salida-activa) ==="
curl -s -X GET "$BASE_URL/salidas/mi-salida-activa" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 4. Mis situaciones (GET /api/situaciones) ==="
curl -s -X GET "$BASE_URL/situaciones" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 5. Mis situaciones de hoy (GET /api/situaciones/mis-situaciones-hoy) ==="
curl -s -X GET "$BASE_URL/situaciones/mis-situaciones-hoy" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 6. Rutas disponibles (GET /api/operaciones/rutas) ==="
curl -s -X GET "$BASE_URL/operaciones/rutas" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 7. Mi perfil (GET /api/auth/me) ==="
curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=================================================="
echo "PRUEBAS COMPLETADAS"
echo "=================================================="
