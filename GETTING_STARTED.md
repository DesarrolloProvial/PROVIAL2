# 🚀 Guía de Inicio Rápido - Sistema Provial

## Pre-requisitos

✅ Node.js 20+ instalado
✅ Docker Desktop instalado y corriendo
✅ Git Bash o PowerShell (Windows)

---

## Paso 1: Levantar Servicios con Docker

```bash
# Desde la raíz del proyecto
cd C:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb

# Iniciar PostgreSQL + Redis
docker-compose up -d

# Verificar que estén corriendo
docker ps
```

Deberías ver:
- `provial_postgres` en puerto 5432
- `provial_redis` en puerto 6379

---

## Paso 2: Ejecutar Migraciones de Base de Datos

### Opción A: PowerShell (Windows - Recomendado)

```powershell
# Asegurarte de tener psql en el PATH
# Si no tienes psql instalado, descárgalo de: https://www.postgresql.org/download/windows/

cd migrations

# Ejecutar cada migración en orden
Get-ChildItem -Filter "0*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Ejecutando: $($_.Name)" -ForegroundColor Green
    Get-Content $_.FullName | docker exec -i provial_postgres psql -U postgres -d provial_db
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $($_.Name) completado" -ForegroundColor Green
    } else {
        Write-Host "✗ Error en $($_.Name)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nMigraciones completadas exitosamente!" -ForegroundColor Cyan
```

### Opción B: Una por una (si la anterior falla)

```powershell
docker exec -i provial_postgres psql -U postgres -d provial_db < 001_create_extensions.sql
docker exec -i provial_postgres psql -U postgres -d provial_db < 002_create_base_tables.sql
docker exec -i provial_postgres psql -U postgres -d provial_db < 003_create_catalog_tables.sql
docker exec -i provial_postgres psql -U postgres -d provial_db < 004_create_incidents_tables.sql
docker exec -i provial_postgres psql -U postgres -d provial_db < 005_create_activities_tables.sql
docker exec -i provial_postgres psql -U postgres -d provial_db < 006_create_audit_tables.sql
docker exec -i provial_postgres psql -U postgres -d provial_db < 007_create_triggers_functions.sql
docker exec -i provial_postgres psql -U postgres -d provial_db < 008_create_views.sql
docker exec -i provial_postgres psql -U postgres -d provial_db < 009_create_seed_data.sql
docker exec -i provial_postgres psql -U postgres -d provial_db < 010_create_turnos_asignaciones.sql
docker exec -i provial_postgres psql -U postgres -d provial_db < 011_seed_turnos_ejemplo.sql
```

### Verificar migraciones

```bash
docker exec -it provial_postgres psql -U postgres -d provial_db

# Dentro de psql:
\dt        # Ver tablas
\dv        # Ver vistas

# Ver datos de ejemplo
SELECT * FROM rol;
SELECT * FROM usuario;
SELECT * FROM v_turnos_completos;

# Salir
\q
```

---

## Paso 3: Instalar Dependencias del Backend

```bash
cd backend
npm install
```

---

## Paso 4: Configurar Variables de Entorno

```bash
# En backend/
cp .env.example .env
```

Editar `backend/.env` si es necesario (por defecto ya está configurado para desarrollo local).

---

## Paso 5: Iniciar el Backend

```bash
# Desde backend/
npm run dev
```

Deberías ver:
```
✅ Conexión a PostgreSQL exitosa
✅ Redis listo para recibir comandos

🚀 ========================================
🚀  Servidor iniciado en puerto 3000
🚀  Ambiente: development
🚀  API: http://localhost:3000/api
🚀  Health: http://localhost:3000/health
🚀 ========================================
```

---

## Paso 6: Probar la API

### 6.1 Health Check

```bash
curl http://localhost:3000/health
```

Deberías ver:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-26T...",
  "services": {
    "database": "up",
    "redis": "up"
  }
}
```

### 6.2 Test de Login

**Usuarios disponibles** (de datos de ejemplo):

| Username | Password | Rol |
|----------|----------|-----|
| admin | \<ver env de desarrollo> | ADMIN |
| cop01 | \<ver env de desarrollo> | COP |
| brigada01 | \<ver env de desarrollo> | BRIGADA |
| operaciones01 | \<ver env de desarrollo> | OPERACIONES |

**Hacer login:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"brigada01\", \"password\": \"password123\"}"
```

**Respuesta exitosa:**
```json
{
  "message": "Login exitoso",
  "user": {
    "id": 4,
    "username": "brigada01",
    "nombre": "Carlos Ramírez - Brigada",
    "rol": "BRIGADA",
    "sede": "Sede Central"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 6.3 Obtener Información del Usuario Autenticado

```bash
# Guardar el accessToken de la respuesta anterior
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta:**
```json
{
  "id": 4,
  "username": "brigada01",
  "nombre": "Carlos Ramírez - Brigada",
  "email": null,
  "telefono": null,
  "rol": "BRIGADA",
  "sede": "Sede Central",
  "ultimo_acceso": "2025-01-26T..."
}
```

---

## Paso 7: Ver Datos en la Base de Datos

### Opción A: psql (línea de comandos)

```bash
docker exec -it provial_postgres psql -U postgres -d provial_db
```

**Consultas útiles:**

```sql
-- Ver turnos de hoy con asignaciones
SELECT * FROM v_turnos_completos WHERE fecha = CURRENT_DATE;

-- Ver mi asignación de hoy (como brigada01, usuario_id = 4)
SELECT * FROM v_mi_asignacion_hoy WHERE usuario_id = 4;

-- Ver incidentes de ejemplo
SELECT * FROM v_incidentes_completos ORDER BY created_at DESC;

-- Ver estado actual de unidades
SELECT * FROM v_estado_actual_unidades;

-- Ver reportes horarios
SELECT * FROM reporte_horario ORDER BY created_at DESC;
```

### Opción B: pgAdmin (interfaz gráfica)

1. Abrir http://localhost:5050
2. Login: `admin@provial.local` / `admin`
3. Agregar servidor:
   - Name: Provial DB
   - Host: provial_postgres
   - Port: 5432
   - Database: provial_db
   - Username: postgres
   - Password: postgres

---

## Troubleshooting

### Error: "Cannot connect to Docker"

```bash
# Verificar que Docker Desktop esté corriendo
docker --version
docker ps
```

### Error: "Puerto 5432 ya está en uso"

Tienes PostgreSQL local corriendo. Opciones:
1. Detener PostgreSQL local
2. Cambiar puerto en `docker-compose.yml`:
   ```yaml
   ports:
     - "5433:5432"  # Cambiar a 5433
   ```
   Y actualizar `backend/.env`:
   ```
   DB_PORT=5433
   ```

### Error: "Module not found"

```bash
# En backend/
rm -rf node_modules package-lock.json
npm install
```

### Base de datos con datos viejos

```bash
# Reiniciar completamente
docker-compose down -v
docker-compose up -d

# Volver a ejecutar migraciones
# (ver Paso 2)
```

---

## Próximos Pasos

✅ Backend funcionando con autenticación
✅ Base de datos con datos de ejemplo
🔲 Implementar endpoints de incidentes
🔲 Implementar endpoints de turnos
🔲 Implementar WebSockets para tiempo real
🔲 Crear app móvil para brigadas
🔲 Crear panel web para COP

Ver documentación completa en:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura del sistema
- [FLUJOS_OPERATIVOS.md](./FLUJOS_OPERATIVOS.md) - Flujos operativos completos
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) - Diseño de base de datos

---

**¿Problemas?** Revisa los logs:
```bash
# Backend
npm run dev   # Ver logs en tiempo real

# Docker
docker-compose logs -f postgres
docker-compose logs -f redis
```
