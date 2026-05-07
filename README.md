# ProVial — Sistema de Gestión de Brigadas Viales

Sistema operativo para brigadas de carreteras de Guatemala.  
Stack: Express + TypeScript (backend), React + Vite (web), React Native + Expo (móvil).

---

## Modalidades de despliegue

| Modalidad | Cuándo usarla |
|-----------|--------------|
| [VM Docker](#modalidad-1--vm-docker-instalación-institucional) | Servidor institucional sin internet, instalación completa |
| [Desarrollo local](#modalidad-2--desarrollo-local) | Desarrollar y probar cambios |
| [Railway / Vercel](#modalidad-3--producción-railwayvercel) | Producción actual en la nube |

---

## Nota importante: la base de datos

El repositorio incluye `docker/schema/000_base_schema.sql` — un dump completo del esquema (sin datos) generado desde Railway. Esto permite montar la VM desde cero sin necesidad de un backup.

El init-script elige automáticamente qué usar, en este orden de prioridad:

| Qué existe | Qué hace al iniciar |
|-----------|---------------------|
| `backups/provial.backup` | Restaura BD completa con datos históricos |
| `docker/schema/000_base_schema.sql` | Crea el esquema vacío (tablas, funciones, índices) |
| Nada | BD vacía; el migrator aplica las migraciones del repo |

En los dos primeros casos, el migrator detecta que el esquema ya está aplicado y solo instala migraciones nuevas.

---

## Modalidad 1 — VM Docker (instalación institucional)

Un solo servidor, todo en Docker, acceso en el puerto 80.

### Requisitos

- Docker Engine 24+ y Docker Compose v2
- Puerto 80 disponible en el servidor

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Yorfad/PROVIAL.git
cd PROVIAL

# 2. Configurar variables de entorno
cp .env.example .env
```

Editar `.env` — como mínimo cambiar estos valores:

```env
VM_HOST=192.168.1.100       # IP o dominio del servidor (sin http://)
DB_PASSWORD=contraseña_segura
JWT_SECRET=clave_larga_y_aleatoria_minimo_32_caracteres
JWT_REFRESH_SECRET=otra_clave_larga_y_aleatoria
```

```bash
# 3. El backend/.env NO necesita edición para VM
#    El compose sobreescribe automáticamente DB_HOST, REDIS_HOST, STORAGE_TYPE, etc.
cp backend/.env.example backend/.env

# 4. (Opcional) Restaurar con datos históricos reales
#    Sin este paso el sistema levanta con el esquema vacío (tablas listas, sin registros)
mkdir -p backups
cp /ruta/al/backup.bak backups/provial.backup

# 5. Levantar todo
docker compose up -d --build
```

El sistema queda disponible en `http://<VM_HOST>`.

### URLs disponibles

| URL | Qué sirve |
|-----|-----------|
| `http://<VM_HOST>/` | Panel web (COP, operaciones, admin) |
| `http://<VM_HOST>/api/` | API REST |
| `http://<VM_HOST>/uploads/` | Fotos y videos subidos por las brigadas |
| `http://<VM_HOST>:5050` | pgAdmin (solo con `--profile tools`) |

```bash
# pgAdmin (administración visual de la BD)
docker compose --profile tools up -d pgadmin
# Acceder en http://<VM_HOST>:5050
# Email: admin@provial.local  /  Password: el DB_PASSWORD del .env
```

### Comandos útiles en VM

```bash
# Estado de los servicios
docker compose ps

# Logs en tiempo real
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs migrator        # ver si las migraciones corrieron bien

# Reiniciar backend sin reconstruir
docker compose restart backend

# Actualizar a la última versión
git pull origin main
docker compose up -d --build backend web

# Espacio usado por archivos subidos
docker exec provial_backend du -sh /app/uploads

# Detener todo (los datos en volúmenes se conservan)
docker compose down

# PELIGRO: detener y borrar todos los datos
docker compose down -v
```

### Backup de los archivos subidos (fotos/videos)

```bash
docker run --rm \
  -v uploads_data:/data \
  -v $(pwd)/backups:/out \
  alpine tar czf /out/uploads_$(date +%Y%m%d).tar.gz /data
```

---

## Modalidad 2 — Desarrollo local

Backend y web corren directamente con Node; solo PostgreSQL y Redis en Docker.

### Requisitos

- Node.js 20+
- Docker (para PostgreSQL y Redis)

### 1. Infraestructura (BD y Redis)

```bash
docker compose up -d postgres redis
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Los valores por defecto (localhost:5432, localhost:6379) ya funcionan

npm install
npm run dev
# API en http://localhost:3000
```

Variables mínimas en `backend/.env` para desarrollo:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/provial_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret
JWT_REFRESH_SECRET=dev-refresh-secret
CORS_ORIGIN=http://localhost:5173,http://localhost:8081
STORAGE_TYPE=local
STORAGE_BASE_URL=http://localhost:3000/uploads
```

### 3. Web

```bash
cd web
npm install

# Crear archivo de entorno local (no se versiona)
echo "VITE_API_URL=http://localhost:3000/api" > .env.local
echo "VITE_SOCKET_URL=http://localhost:3000" >> .env.local

npm run dev
# Web en http://localhost:5173
```

### 4. Aplicación móvil

```bash
cd mobile
npm install

# Editar mobile/src/constants/config.ts
# Cambiar API_URL a la IP de tu PC en la red local (no localhost)
# Ejemplo: export const API_URL = 'http://192.168.1.50:3000/api';

npx expo start
```

> `localhost` no funciona desde un teléfono físico. Usar la IP de la PC en la red local.

---

## Modalidad 3 — Producción Railway/Vercel

El deploy ocurre automáticamente al hacer `git push origin main`.

| Servicio | Plataforma |
|----------|-----------|
| Backend API | Railway (auto-deploy) |
| Frontend web | Vercel (auto-deploy) |
| Base de datos | PostgreSQL en Railway |
| Redis | Railway |
| Multimedia | Cloudinary (configurado en variables de Railway) |

Las migraciones en producción se aplican manualmente:

```bash
psql <DATABASE_URL_RAILWAY> -f backend/migrations/<NNN>_nombre.sql
```

---

## Estructura del repositorio

```
proyectoProvialMovilWeb/
├── backend/
│   ├── src/
│   │   ├── controllers/     # por dominio: common/, cop/, operaciones/, etc.
│   │   ├── models/          # queries DB por entidad
│   │   ├── routes/          # rutas por dominio
│   │   ├── services/        # cloudinary.service, storage.service, socket, etc.
│   │   ├── middlewares/     # auth, deviceSecurity, idempotency
│   │   └── utils/           # normalizeId, buildObservacionEntry, etc.
│   ├── migrations/          # migraciones 126-145 (las anteriores requieren backup)
│   ├── Dockerfile
│   └── .env.example
├── web/
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf           # SPA config del contenedor web
├── mobile/
│   └── src/
│       ├── screens/
│       ├── components/
│       ├── services/        # api.ts (axios con headers de dispositivo)
│       ├── store/           # Zustand: authStore, situacionesStore
│       └── constants/       # config.ts con API_URL
├── nginx/
│   └── nginx.conf           # Reverse proxy principal (puerto 80)
├── docker/
│   ├── migrator/
│   │   └── run_migrations.sh   # corre migraciones con tracking table
│   └── init-scripts/
│       └── 00_run_migrations.sh  # restaura backup si existe
├── backups/
│   └── .gitkeep             # colocar provial.backup aquí
├── docker-compose.yml       # stack completo para VM
├── .env.example             # variables del compose (VM_HOST, DB_PASSWORD, etc.)
└── README.md
```

---

## Lo que NO incluye el repo

| Qué | Por qué no está |
|-----|----------------|
| `backend/.env` | Credenciales de producción |
| `backend/uploads/` | Archivos subidos por usuarios |
| `backups/provial.backup` | Datos reales — pedir al administrador |
| `docs/vault/` | Documentación interna con IPs y contexto sensible |
| `mobile/src/constants/config.ts` | URL del backend, varía por máquina |
| `backups/provial.backup` | Datos reales — pedir al administrador si se necesitan |
