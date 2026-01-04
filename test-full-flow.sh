#!/bin/bash

# Script de prueba de flujo completo BRIGADA
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMzLCJyb2wiOiJCUklHQURBIiwic2VkZSI6NywicHVlZGVfdmVyX3RvZGFzX3NlZGVzIjpmYWxzZSwiaWF0IjoxNzY3MDM3NjE3LCJleHAiOjE3NjcwODA4MTd9.dLnaPW4RVeXCwF3eiEPXvMqxlhrn7L6IVjm0OLDxCZE"
BASE_URL="http://localhost:3000/api"

echo "=================================================="
echo "PRUEBA FLUJO COMPLETO - BRIGADA"
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
curl -s -X POST "$BASE_URL/situaciones" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_situacion": "SALIDA_SEDE",
    "unidad_id": 341,
    "ruta_id": 70,
    "km": 0,
    "sentido": "OCCIDENTE",
    "latitud": 14.4058,
    "longitud": -90.7539,
    "kilometraje_unidad": 45000,
    "combustible_fraccion": "3/4",
    "descripcion": "Salida desde sede Palín"
  }'
echo ""

echo ""
echo "=== PRUEBA 3: CREAR SITUACION INCIDENTE ==="
curl -s -X POST "$BASE_URL/situaciones" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_situacion": "INCIDENTE",
    "unidad_id": 341,
    "ruta_id": 70,
    "km": 55.5,
    "sentido": "OCCIDENTE",
    "latitud": 14.4158,
    "longitud": -90.7839,
    "subtipo": "Colisión",
    "descripcion": "Colisión múltiple en km 55.5",
    "vehiculos": [
      {
        "tipo": "Sedan",
        "marca": "Toyota",
        "color": "Rojo",
        "placa": "P123ABC",
        "piloto_nombre": "Juan Pérez",
        "piloto_estado": "ILESO",
        "dano": "Moderado"
      },
      {
        "tipo": "Pick-up",
        "marca": "Nissan",
        "color": "Blanco",
        "placa": "M456DEF",
        "piloto_nombre": "María López",
        "piloto_estado": "HERIDO",
        "dano": "Severo"
      }
    ],
    "obstruccion": "PARCIAL",
    "autoridades": ["PNC", "PMT"],
    "unidades_socorro": ["Bomberos Voluntarios"]
  }'
echo ""

echo ""
echo "=== PRUEBA 4: CAMBIAR TIPO DE SITUACION (INCIDENTE -> ASISTENCIA) ==="
# Primero obtenemos la última situación creada
LAST_SITUACION=$(curl -s -X GET "$BASE_URL/situaciones" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "Última situación ID: $LAST_SITUACION"

if [ -n "$LAST_SITUACION" ]; then
  curl -s -X PATCH "$BASE_URL/situaciones/$LAST_SITUACION/cambiar-tipo" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "nuevo_tipo": "ASISTENCIA_VEHICULAR",
      "subtipo": "Desperfectos Mecánicos"
    }'
fi
echo ""

echo ""
echo "=== PRUEBA 5: CAMBIAR DE VUELTA (ASISTENCIA -> INCIDENTE) ==="
if [ -n "$LAST_SITUACION" ]; then
  curl -s -X PATCH "$BASE_URL/situaciones/$LAST_SITUACION/cambiar-tipo" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "nuevo_tipo": "INCIDENTE",
      "subtipo": "Colisión"
    }'
fi
echo ""

echo ""
echo "=== PRUEBA 6: CERRAR SITUACION ==="
if [ -n "$LAST_SITUACION" ]; then
  curl -s -X PATCH "$BASE_URL/situaciones/$LAST_SITUACION/cerrar" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "observaciones": "Situación atendida, vía liberada"
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
    "unidad_id": 341,
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
curl -s -X POST "$BASE_URL/ingresos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "unidad_id": 341,
    "km_final": 45120,
    "combustible_final": "1/4",
    "novedades": "Sin novedades",
    "latitud": 14.4058,
    "longitud": -90.7539
  }'
echo ""

echo ""
echo "=== PRUEBA 9: OBTENER MIS SITUACIONES HOY ==="
curl -s -X GET "$BASE_URL/situaciones/mi-unidad/hoy" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=================================================="
echo "FLUJO COMPLETO TERMINADO"
echo "=================================================="
