# Test de Rutas de Accidentologia - Railway Production
$baseUrl = "https://provial-production.up.railway.app/api"

Write-Host ""
Write-Host "========================================"
Write-Host "  TEST DE RUTAS ACCIDENTOLOGIA"
Write-Host "  URL: $baseUrl"
Write-Host "========================================"
Write-Host ""

# 1. Autenticacion
Write-Host "[1] Autenticando..."
try {
    $loginBody = '{"username":"operador1","password":"password123"}'
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.accessToken
    Write-Host "  OK - Token obtenido"
    $headers = @{ Authorization = "Bearer $token" }
} catch {
    Write-Host "  ERROR en login: $($_.Exception.Message)"
    try {
        $loginBody = '{"username":"admin","password":"admin123"}'
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
        $token = $loginResponse.accessToken
        Write-Host "  OK - Login con admin"
        $headers = @{ Authorization = "Bearer $token" }
    } catch {
        Write-Host "  FATAL: No se pudo autenticar"
        exit 1
    }
}

# 2. GET /accidentologia/tipos
Write-Host ""
Write-Host "[2] GET /accidentologia/tipos"
try {
    $tipos = Invoke-RestMethod -Uri "$baseUrl/accidentologia/tipos" -Method GET -Headers $headers
    Write-Host "  OK - Tipos accidente: $($tipos.tipos_accidente.Count)"
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)"
}

# 3. GET /accidentologia (listar)
Write-Host ""
Write-Host "[3] GET /accidentologia"
try {
    $hojas = Invoke-RestMethod -Uri "$baseUrl/accidentologia?limit=5" -Method GET -Headers $headers
    Write-Host "  OK - Hojas encontradas: $($hojas.Count)"
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)"
}

# 4. POST invalido (sin situacion_id)
Write-Host ""
Write-Host "[4] POST /accidentologia (datos invalidos)"
try {
    $invalidBody = '{"tipo_accidente":"COLISION_FRONTAL"}'
    $response = Invoke-RestMethod -Uri "$baseUrl/accidentologia" -Method POST -Body $invalidBody -ContentType "application/json" -Headers $headers
    Write-Host "  WARN - Deberia fallar pero no fallo"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 400) {
        Write-Host "  OK - Validacion correcta (400)"
    } else {
        Write-Host "  WARN - Status: $status"
    }
}

# 5. GET /accidentologia/estadisticas
Write-Host ""
Write-Host "[5] GET /accidentologia/estadisticas"
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/accidentologia/estadisticas" -Method GET -Headers $headers
    Write-Host "  OK - Total accidentes: $($stats.total_accidentes)"
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)"
}

# 6. GET /accidentologia/completo/999 (ID inexistente)
Write-Host ""
Write-Host "[6] GET /accidentologia/completo/999"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/accidentologia/completo/999" -Method GET -Headers $headers
    Write-Host "  WARN - Deberia retornar 404"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 404) {
        Write-Host "  OK - Retorna 404 correcto"
    } else {
        Write-Host "  Status: $status"
    }
}

# 7. GET /accidentologia/incidente/999
Write-Host ""
Write-Host "[7] GET /accidentologia/incidente/999"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/accidentologia/incidente/999" -Method GET -Headers $headers
    if ($null -eq $response) {
        Write-Host "  OK - Retorna null"
    } else {
        Write-Host "  Retorno: $response"
    }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)"
}

# 8. GET /accidentologia/999999
Write-Host ""
Write-Host "[8] GET /accidentologia/999999"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/accidentologia/999999" -Method GET -Headers $headers
    Write-Host "  WARN - Deberia retornar 404"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 404) {
        Write-Host "  OK - Retorna 404"
    } else {
        Write-Host "  Status: $status"
    }
}

# 9. Sin autenticacion
Write-Host ""
Write-Host "[9] GET /accidentologia (sin token)"
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/accidentologia" -Method GET
    Write-Host "  FAIL - No requiere auth!"
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 401 -or $status -eq 403) {
        Write-Host "  OK - Requiere auth ($status)"
    } else {
        Write-Host "  Status: $status"
    }
}

# 10. GET /situaciones
Write-Host ""
Write-Host "[10] GET /situaciones"
try {
    $situaciones = Invoke-RestMethod -Uri "$baseUrl/situaciones?tipo=INCIDENTE&limit=3" -Method GET -Headers $headers
    Write-Host "  OK - Situaciones: $($situaciones.situaciones.Count)"
    if ($situaciones.situaciones -and $situaciones.situaciones.Count -gt 0) {
        Write-Host "      Ejemplo ID: $($situaciones.situaciones[0].id)"
    }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "========================================"
Write-Host "  TESTS COMPLETADOS"
Write-Host "========================================"
