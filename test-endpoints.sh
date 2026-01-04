#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEzLCJyb2wiOiJTVVBFUl9BRE1JTiIsInB1ZWRlX3Zlcl90b2Rhc19zZWRlcyI6ZmFsc2UsImlhdCI6MTc2NzI1NTc4NywiZXhwIjoxNzY3Mjk4OTg3fQ.H6vcmkkcW7fc8c5cUYmLjQjmkruzPTOapSLKtcug1Ok"
BASE="http://localhost:3000/api"

# Counters
PASSED=0
FAILED=0
TOTAL=0

test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local expected_code=${4:-200}

    TOTAL=$((TOTAL + 1))

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE$url" -H "Authorization: Bearer $TOKEN")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE$url" -H "Authorization: Bearer $TOKEN")
    fi

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "$expected_code" ] || [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo "[PASS] $name ($http_code)"
        PASSED=$((PASSED + 1))
    else
        echo "[FAIL] $name - Expected $expected_code, got $http_code"
        echo "       Response: $(echo "$body" | head -c 100)"
        FAILED=$((FAILED + 1))
    fi
}

echo "=================================================="
echo "PRUEBAS COMPLETAS DE TODOS LOS ENDPOINTS"
echo "=================================================="

echo ""
echo "=== MODULO: AUTH ==="
test_endpoint "auth/me" "/auth/me"

echo ""
echo "=== MODULO: ACCIDENTOLOGIA ==="
test_endpoint "accidentologia/tipos" "/accidentologia/tipos"
test_endpoint "accidentologia/estadisticas" "/accidentologia/estadisticas"
test_endpoint "accidentologia (list)" "/accidentologia"

echo ""
echo "=== MODULO: COMUNICACION SOCIAL ==="
test_endpoint "plantillas" "/comunicacion-social/plantillas"
test_endpoint "plantillas/variables" "/comunicacion-social/plantillas/variables"
test_endpoint "publicaciones" "/comunicacion-social/publicaciones"

echo ""
echo "=== MODULO: NOTIFICACIONES ==="
test_endpoint "notificaciones" "/notificaciones"
test_endpoint "notificaciones/conteo" "/notificaciones/conteo"

echo ""
echo "=== MODULO: ALERTAS ==="
test_endpoint "alertas/tipos" "/alertas/tipos"
test_endpoint "alertas/configuracion" "/alertas/configuracion"
test_endpoint "alertas/activas" "/alertas/activas"
test_endpoint "alertas/historial" "/alertas/historial"

echo ""
echo "=== MODULO: DASHBOARD ==="
test_endpoint "dashboard/estadisticas" "/dashboard/estadisticas"
test_endpoint "dashboard/actividad-reciente" "/dashboard/actividad-reciente"
test_endpoint "dashboard/metricas-sede" "/dashboard/metricas-sede"

echo ""
echo "=== MODULO: REPORTES ==="
test_endpoint "reportes/tipos" "/reportes/tipos"

echo ""
echo "=== MODULO: INSPECCION 360 ==="
test_endpoint "inspeccion360/plantillas" "/inspeccion360/plantillas"

echo ""
echo "=== MODULO: APROBACIONES ==="
test_endpoint "aprobaciones/pendientes" "/aprobaciones/pendientes"
test_endpoint "aprobaciones/historial" "/aprobaciones/historial"

echo ""
echo "=== MODULO: GEOGRAFIA ==="
test_endpoint "geografia/departamentos" "/geografia/departamentos"
test_endpoint "geografia/municipios" "/geografia/municipios"

echo ""
echo "=== MODULO: SEDES ==="
test_endpoint "sedes" "/sedes"

echo ""
echo "=== MODULO: BRIGADAS ==="
test_endpoint "brigadas" "/brigadas"

echo ""
echo "=== MODULO: UNIDADES ==="
test_endpoint "unidades" "/unidades"
test_endpoint "unidades/activas" "/unidades/activas"

echo ""
echo "=== MODULO: SITUACIONES ==="
test_endpoint "situaciones" "/situaciones"
test_endpoint "situaciones/activas" "/situaciones/activas"
test_endpoint "situaciones/tipos" "/situaciones/tipos"

echo ""
echo "=== MODULO: ADMIN ==="
test_endpoint "admin/estadisticas" "/admin/estadisticas"
test_endpoint "admin/usuarios" "/admin/usuarios"
test_endpoint "admin/grupos" "/admin/grupos"
test_endpoint "admin/auditoria" "/admin/auditoria"

echo ""
echo "=================================================="
echo "RESULTADOS FINALES"
echo "=================================================="
echo "PASSED: $PASSED"
echo "FAILED: $FAILED"
echo "TOTAL:  $TOTAL"
echo "=================================================="
