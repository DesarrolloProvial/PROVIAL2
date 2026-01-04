#!/bin/bash

# Script de prueba de flujo completo BRIGADA - V3 (flujo correcto)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMzLCJyb2wiOiJCUklHQURBIiwic2VkZSI6NywicHVlZGVfdmVyX3RvZGFzX3NlZGVzIjpmYWxzZSwiaWF0IjoxNzY3MDM3NjE3LCJleHAiOjE3NjcwODA4MTd9.dLnaPW4RVeXCwF3eiEPXvMqxlhrn7L6IVjm0OLDxCZE"
BASE_URL="http://localhost:3000/api"

echo "=================================================="
echo "PRUEBA FLUJO COMPLETO V3 - BRIGADA (FLUJO CORRECTO)"
echo "Usuario: Laj Tecu Juan Antonio (ID: 33)"
echo "Unidad: 1109 (ID: 341)"
echo "=================================================="

echo ""
echo "=== PRUEBA 1: VERIFICAR ASIGNACION ==="
curl -s -X GET "$BASE_URL/turnos/mi-asignacion-hoy" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== PRUEBA 2: INICIAR SALIDA ==="
curl -s -X POST "$BASE_URL/salidas/iniciar" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ruta_id": 70,
    "km_inicial": 45000,
    "combustible_inicial": "3/4",
    "latitud": 14.4058,
    "longitud": -90.7539,
    "observaciones": "Salida desde sede Palin"
  }'
echo ""

echo ""
echo "=== PRUEBA 3: VERIFICAR SALIDA ACTIVA ==="
curl -s -X GET "$BASE_URL/salidas/mi-salida-activa" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== PRUEBA 4: CREAR SITUACION INCIDENTE ==="
curl -s -X POST "$BASE_URL/situaciones" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_situacion": "INCIDENTE",
    "ruta_id": 70,
    "km": 55.5,
    "sentido": "OCCIDENTE",
    "latitud": 14.4158,
    "longitud": -90.7839,
    "subtipo": "Colision",
    "descripcion": "Colision multiple en km 55.5"
  }'
echo ""

echo ""
echo "=== PRUEBA 5: CAMBIAR TIPO DE SITUACION (INCIDENTE -> ASISTENCIA) ==="
SITUACIONES=$(curl -s -X GET "$BASE_URL/situaciones?estado=ACTIVA" \
  -H "Authorization: Bearer $TOKEN")
echo "Situaciones activas: $SITUACIONES"

LAST_ID=$(echo "$SITUACIONES" | grep -o '"id":"[0-9]*"' | head -1 | grep -o '[0-9]*')
echo "ID a cambiar: $LAST_ID"

if [ -n "$LAST_ID" ]; then
  echo "Cambiando tipo..."
  curl -s -X PATCH "$BASE_URL/situaciones/$LAST_ID/cambiar-tipo" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "nuevo_tipo": "ASISTENCIA_VEHICULAR",
      "subtipo": "Desperfectos Mecanicos"
    }'
fi
echo ""

echo ""
echo "=== PRUEBA 6: CERRAR SITUACION ==="
if [ -n "$LAST_ID" ]; then
  curl -s -X PATCH "$BASE_URL/situaciones/$LAST_ID/cerrar" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "observaciones": "Situacion atendida, via liberada"
    }'
fi
echo ""

echo ""
echo "=== PRUEBA 7: CREAR PATRULLAJE ==="
curl -s -X POST "$BASE_URL/situaciones" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_situacion": "PATRULLAJE",
    "ruta_id": 70,
    "km": 60,
    "sentido": "OCCIDENTE",
    "latitud": 14.4258,
    "longitud": -90.8039,
    "descripcion": "Continuando patrullaje"
  }'
echo ""

echo ""
echo "=== PRUEBA 8: REGISTRAR INGRESO A SEDE ==="
curl -s -X POST "$BASE_URL/ingresos/registrar" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_ingreso": "INGRESO_SEDE",
    "sede_id": 7,
    "km_final": 45120,
    "combustible_final": "1/4",
    "novedades": "Sin novedades",
    "latitud": 14.4058,
    "longitud": -90.7539
  }'
echo ""

echo ""
echo "=== PRUEBA 8B: REGISTRAR INGRESO A SEDE (con sede_id) ==="
curl -s -X POST "$BASE_URL/ingresos/registrar" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_ingreso": "SEDE",
    "sede_id": 7,
    "km": 45120,
    "combustible": "1/4",
    "observaciones": "Sin novedades",
    "latitud": 14.4058,
    "longitud": -90.7539
  }'
echo ""

echo ""
echo "=== PRUEBA 9: EDITAR INGRESO ==="
# Obtener ID del ingreso activo
INGRESO=$(curl -s -X GET "$BASE_URL/ingresos/mi-ingreso-activo" \
  -H "Authorization: Bearer $TOKEN")
echo "Mi ingreso activo: $INGRESO"
INGRESO_ID=$(echo "$INGRESO" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -n "$INGRESO_ID" ]; then
  echo "Editando ingreso ID: $INGRESO_ID"
  curl -s -X PATCH "$BASE_URL/ingresos/$INGRESO_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "km_final": 45125,
      "combustible_final": "1/8",
      "observaciones": "Corregido km final"
    }'
fi
echo ""

echo ""
echo "=== PRUEBA 10: OBTENER MIS SITUACIONES HOY ==="
curl -s -X GET "$BASE_URL/situaciones/mi-unidad/hoy" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=================================================="
echo "FLUJO COMPLETO V3 TERMINADO"
echo "=================================================="
