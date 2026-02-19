# Guia de Despliegue en Railway

## Paso 1: Crear cuenta en Railway

1. Ve a https://railway.app
2. Click en "Login" -> "Login with GitHub"
3. Autoriza Railway para acceder a tu GitHub

## Paso 2: Crear nuevo proyecto

1. Click en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Busca y selecciona el repositorio `PROVIAL`
4. Railway detectara automaticamente el proyecto

## Paso 3: Agregar PostgreSQL

1. En tu proyecto, click en "+ New"
2. Selecciona "Database" -> "Add PostgreSQL"
3. Espera a que se aprovisione (1-2 minutos)

## Paso 4: Agregar Redis

1. Click en "+ New"
2. Selecciona "Database" -> "Add Redis"
3. Espera a que se aprovisione

## Paso 5: Configurar variables de entorno

Click en el servicio del Backend (el recuadro que dice tu repo) y ve a "Variables". Agrega:

```
NODE_ENV=production
PORT=3000

# Estas se vinculan automaticamente si usas "Add Reference":
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Secrets - Generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<GENERA_UN_SECRET_SEGURO_DE_64_BYTES>
JWT_REFRESH_SECRET=<GENERA_UN_REFRESH_SECRET_SEGURO_DE_64_BYTES>
JWT_EXPIRES_IN=12h
JWT_REFRESH_EXPIRES_IN=7d

# CORS - Permite todas las conexiones para pruebas
CORS_ORIGIN=*
SOCKET_IO_CORS_ORIGIN=*

# Cloudinary (para fotos y videos)
# 1. Crea cuenta gratis en https://cloudinary.com
# 2. Ve a Dashboard y copia las credenciales
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
```

## Paso 6: Importar base de datos

1. En Railway, click en el servicio PostgreSQL
2. Ve a la pestana "Data"
3. Click en "Query" para abrir el editor SQL
4. Copia y pega el contenido de `database/backup/database_backup_limpio.sql`
5. Ejecuta el query

**IMPORTANTE:** Usa `database_backup_limpio.sql` que viene sin datos de prueba.

**Alternativa via CLI:**
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Vincular proyecto
railway link

# Importar BD (usar el backup limpio)
railway run psql $DATABASE_URL < database/backup/database_backup_limpio.sql
```

## Paso 7: Obtener URL del backend

1. Ve al servicio Backend en Railway
2. Click en "Settings" -> "Networking"
3. Click en "Generate Domain"
4. Tu URL sera algo como: `https://provial-production.up.railway.app`

## Paso 8: Probar el API

```bash
# Verificar que esta vivo
curl https://TU-URL.railway.app/api/health

# Probar login
curl -X POST https://TU-URL.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"TU_USUARIO","password":"TU_PASSWORD"}'
```

---

## Usuarios de prueba

| Username | Password | Rol |
|----------|----------|-----|
| 19109 | \<cambiar_password> | SUPER_ADMIN |
| admin | \<cambiar_password> | SUPER_ADMIN |
| operaciones | \<cambiar_password> | OPERACIONES |
| cop.admin | \<cambiar_password> | COP |
| 00001 | \<cambiar_password> | BRIGADA |

---

## Troubleshooting

### Error: "Database connection failed"
- Verifica que DATABASE_URL este correctamente vinculado
- En Variables, usa "Add Reference" para vincular Postgres.DATABASE_URL

### Error: "Redis connection failed"
- Verifica que REDIS_URL este correctamente vinculado
- Si no usas Redis, puedes comentar la conexion en el codigo

### Error: "Build failed"
- Revisa los logs de build en Railway
- Asegurate de que el repositorio tenga los ultimos cambios
