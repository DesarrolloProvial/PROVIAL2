# =============================================================
# ProVial — Montar base de datos local desde snapshot (Windows)
# =============================================================
# Requisito: PostgreSQL instalado y en el PATH
#
# Uso desde PowerShell:
#   .\database\setup_local.ps1
#   .\database\setup_local.ps1 -DbName provial_local -DbUser postgres
# =============================================================

param(
    [string]$DbName = "provial_local",
    [string]$DbUser = "postgres"
)

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$SeedFile   = Join-Path $ScriptDir "seed.sql"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  PROVIAL — Configuracion de BD local"        -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Base de datos : $DbName"
Write-Host "  Usuario       : $DbUser"
Write-Host "  Seed file     : $SeedFile"
Write-Host ""

# Verificar que seed.sql existe
if (-not (Test-Path $SeedFile)) {
    Write-Host "ERROR: No se encontro $SeedFile" -ForegroundColor Red
    Write-Host "Asegurate de correr este script desde el directorio raiz del repositorio."
    exit 1
}

# Verificar que psql esta disponible
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: psql no encontrado en el PATH." -ForegroundColor Red
    Write-Host "Instala PostgreSQL y asegurate de que bin/ este en el PATH."
    exit 1
}

# Crear la base de datos si no existe
Write-Host "-> Verificando base de datos '$DbName'..." -ForegroundColor Yellow
$dbExists = psql -U $DbUser -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'" 2>$null
if ($dbExists -ne "1") {
    Write-Host "   Creando base de datos '$DbName'..."
    psql -U $DbUser -c "CREATE DATABASE $DbName;" 2>$null
    Write-Host "   OK - Base de datos creada." -ForegroundColor Green
} else {
    Write-Host "   OK - Base de datos ya existe, se sobreescribiran los datos." -ForegroundColor Green
}

# Restaurar snapshot
Write-Host ""
Write-Host "-> Restaurando datos desde seed.sql..." -ForegroundColor Yellow
Write-Host "   (Esto puede tardar unos segundos...)"
psql -U $DbUser -d $DbName -f $SeedFile -q

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  OK Base de datos lista"                     -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Configura el backend con esta cadena de conexion:"
Write-Host ""
Write-Host "  DATABASE_URL=postgresql://${DbUser}:TU_PASSWORD@localhost:5432/$DbName" -ForegroundColor Cyan
Write-Host ""
Write-Host "  (Reemplaza TU_PASSWORD con la contrasena de tu usuario PostgreSQL)"
Write-Host ""
