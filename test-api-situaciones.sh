#!/bin/bash

# Script de pruebas de API de situaciones
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMzLCJyb2wiOiJCUklHQURBIiwic2VkZSI6NywicHVlZGVfdmVyX3RvZGFzX3NlZGVzIjpmYWxzZSwiaWF0IjoxNzY3MDM3NjE3LCJleHAiOjE3NjcwODA4MTd9.dLnaPW4RVeXCwF3eiEPXvMqxlhrn7L6IVjm0OLDxCZE"
BASE_URL="http://localhost:3000/api"

echo "=================================================="
echo "PRUEBAS DE API DE SITUACIONES - PROVIAL"
echo "=================================================="

echo ""
echo "=== PRUEBA 1: GET /api/brigadas/mi-asignacion ==="
curl -s -X GET "$BASE_URL/brigadas/mi-asignacion" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
echo ""

echo ""
echo "=== PRUEBA 2: GET /api/brigadas/mi-salida-activa ==="
curl -s -X GET "$BASE_URL/brigadas/mi-salida-activa" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
echo ""

echo ""
echo "=== PRUEBA 3: GET /api/situaciones ==="
curl -s -X GET "$BASE_URL/situaciones" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
echo ""

echo ""
echo "=== PRUEBA 4: GET /api/rutas ==="
curl -s -X GET "$BASE_URL/rutas" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
echo ""

echo ""
echo "=== PRUEBA 5: GET /api/unidades ==="
curl -s -X GET "$BASE_URL/unidades" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | head -c 500
echo ""

echo ""
echo "=== PRUEBA 6: Crear situación PATRULLAJE sin salida activa ==="
curl -s -X POST "$BASE_URL/situaciones" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_situacion": "PATRULLAJE",
    "unidad_id": 1,
    "ruta_id": 1,
    "km": 50,
    "sentido": "NORTE",
    "latitud": 14.5,
    "longitud": -90.5
  }'
echo ""

echo ""
echo "=== PRUEBA 7: Crear situación INCIDENTE con vehículos ==="
curl -s -X POST "$BASE_URL/situaciones" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_situacion": "INCIDENTE",
    "unidad_id": 1,
    "ruta_id": 1,
    "km": 55,
    "sentido": "SUR",
    "latitud": 14.5,
    "longitud": -90.5,
    "subtipo": "Colisión",
    "vehiculos": [
      {
        "tipo": "Sedan",
        "marca": "Toyota",
        "color": "Rojo",
        "placa": "P123ABC",
        "piloto_estado": "ILESO"
      }
    ],
    "obstruccion": "PARCIAL"
  }'
echo ""

echo ""
echo "=== PRUEBA 8: Listar situaciones después de crear ==="
curl -s -X GET "$BASE_URL/situaciones" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
echo ""

echo ""
echo "=================================================="
echo "PRUEBAS COMPLETADAS"
echo "=================================================="
