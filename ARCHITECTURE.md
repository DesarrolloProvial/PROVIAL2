# Arquitectura del Sistema Provial Integral

## Visión General

Sistema centralizado de gestión de incidentes viales que integra operaciones de campo, centro de operaciones, análisis y reportería en una plataforma única.

### Objetivos Arquitectónicos

1. **Tiempo Real**: Información actualizada en <30 segundos
2. **Alta Disponibilidad**: 99.5% uptime para operaciones críticas
3. **Escalabilidad**: Soportar 86 unidades simultáneas + crecimiento futuro
4. **Offline-First Mobile**: Brigadas pueden trabajar sin conexión
5. **Auditoría Completa**: Trazabilidad de todas las operaciones

---

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIOS                                 │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Brigadas │  │   COP    │  │  Mandos  │  │  Público │       │
│  │  (App)   │  │  (Web)   │  │  (Web)   │  │  (Web)   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼─────────────┼─────────────┼─────────────┼──────────────┘
        │             │             │             │
        │         ┌───┴─────────────┴─────────────┘
        │         │
        │    ┌────▼────────────────────────────────────────────┐
        │    │           NGINX (Reverse Proxy)                 │
        │    │  - HTTPS/TLS                                    │
        │    │  - Load Balancing                               │
        │    │  - Rate Limiting                                │
        │    └────┬──────────────────────────┬─────────────────┘
        │         │                          │
        │    ┌────▼──────────────┐      ┌────▼─────────────────┐
        │    │   Static Files     │      │   WebSocket Server   │
        │    │   (React SPA)      │      │   (Socket.io)        │
        │    └────────────────────┘      └────┬─────────────────┘
        │                                     │
        │    ┌─────────────────────────────────▼────────────────┐
        └────►          BACKEND API (Node.js + Express)         │
             │  - RESTful API                                   │
             │  - JWT Authentication                            │
             │  - Business Logic                                │
             │  - File Uploads                                  │
             └─┬──────────────────────┬────────────────┬────────┘
               │                      │                │
          ┌────▼────────┐      ┌──────▼──────┐  ┌─────▼──────┐
          │ PostgreSQL  │      │    Redis    │  │ File Store │
          │  - Datos    │      │  - Cache    │  │  (Local/S3)│
          │  - Geo      │      │  - Pub/Sub  │  └────────────┘
          └─────────────┘      │  - Sessions │
                               └─────────────┘
```

---

## Componentes Principales

### 1. Frontend - App Móvil (React Native + Expo)

**Responsabilidad**: Interfaz para brigadas en campo

**Tecnologías**:
- React Native (Expo SDK 54+)
- TypeScript
- Zustand (estado local)
- AsyncStorage (persistencia offline)
- Expo Router (navegación)

**Funcionalidades**:
- CRUD de incidentes
- Captura de ubicación GPS
- Toma de fotos
- Generación de reportes WhatsApp
- Sincronización offline

**Flujo Offline**:
```
1. Usuario sin conexión crea incidente
2. Guardar en AsyncStorage con flag pending_sync
3. Al reconectar: intentar POST automáticamente
4. Si falla: mostrar error, permitir retry manual
```

### 2. Frontend - Panel Web (React + Vite)

**Responsabilidad**: Interfaz para COP, Operaciones, Accidentología, Mandos

**Tecnologías**:
- React 18
- TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- React Query (data fetching)
- Zustand (estado global)
- Socket.io-client (tiempo real)
- Leaflet (mapas)

**Módulos**:

#### Módulo COP
- Dashboard de incidentes en tiempo real
- Gestión de actividades de unidades
- Tablero PROVIAL INFORMA
- Radar para atención de llamadas
- Gestión de reportes públicos

#### Módulo Operaciones
- Reportes diarios de actividades
- Filtros por unidad/fecha
- Exportación a PDF/Excel

#### Módulo Accidentología
- Vista de incidentes con datos técnicos
- Generación de hojas de accidentología
- Análisis estadístico

#### Módulo Mandos
- Dashboard ejecutivo
- Métricas clave
- Reportes de no atendidos
- Estadísticas por ruta/tipo/sede

### 3. Backend API (Node.js + Express)

**Responsabilidad**: Lógica de negocio, autenticación, acceso a datos

**Estructura**:

```
backend/src/
├── config/           # Configuración (DB, Redis, etc.)
├── controllers/      # Controladores HTTP
├── middlewares/      # Auth, validación, error handling
├── models/           # Modelos de datos (queries)
├── routes/           # Definición de rutas
├── services/         # Lógica de negocio
│   ├── auth.service.ts
│   ├── incidente.service.ts
│   ├── reporte.service.ts
│   ├── socket.service.ts
│   └── ...
├── types/            # TypeScript types
├── utils/            # Utilidades
├── validators/       # Validadores Zod
└── index.ts          # Entry point
```

**Capas**:

```
Request → Middleware → Controller → Service → Model → Database
          (Auth,        (HTTP        (Business  (Queries)
           Validation)   handling)    logic)
```

**Endpoints Principales**:

```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

GET    /api/catalogos/*
GET    /api/incidentes
POST   /api/incidentes
GET    /api/incidentes/:id
PATCH  /api/incidentes/:id
DELETE /api/incidentes/:id

GET    /api/actividades
POST   /api/actividades
PATCH  /api/actividades/:id

GET    /api/reportes/actividades-diarias
GET    /api/reportes/accidentologia/:id
GET    /api/reportes/estadisticas

GET    /api/publico/incidentes
POST   /api/publico/reportar-incidente
```

### 4. WebSocket Server (Socket.io)

**Responsabilidad**: Comunicación en tiempo real

**Eventos**:

```typescript
// Server → Clients
'incidente:nuevo'            // Nuevo incidente creado
'incidente:actualizado'      // Incidente modificado
'incidente:cerrado'          // Incidente finalizado
'unidad:cambio_estado'       // Unidad cambió actividad
'actividad:nueva'            // Nueva actividad registrada
'reporte_publico:nuevo'      // Nuevo reporte ciudadano

// Client → Server
'subscribe:incidentes'       // Suscribirse a updates
'subscribe:unidades'         // Suscribirse a estado de unidades
'unsubscribe:*'              // Desuscribirse
```

**Rooms por Rol**:
```
- rol:COP              // Solo operadores COP
- rol:BRIGADA          // Solo brigadas
- rol:MANDOS           // Solo mandos
- sede:SEDE-CENTRAL    // Por sede
```

**Autenticación**:
```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const user = verifyJWT(token);
  socket.data.user = user;
  socket.join(`rol:${user.rol}`);
  socket.join(`sede:${user.sede}`);
  next();
});
```

### 5. Base de Datos (PostgreSQL 16)

**Responsabilidad**: Almacenamiento persistente

**Características**:
- PostgreSQL 16 con extensiones:
  - uuid-ossp (UUIDs)
  - pg_trgm (búsquedas fuzzy)
  - PostGIS (geo, opcional)

**Modelo de Datos**: Ver [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)

**Estrategia de Índices**:
- Índices B-tree para FK y búsquedas frecuentes
- Índices parciales para consultas específicas (ej: incidentes activos)
- Índices únicos para constraints de negocio

**Vistas Materializadas**:
- `mv_estadisticas_diarias`: Refresh nightly
- `mv_no_atendidos_por_motivo`: Refresh nightly

### 6. Caché (Redis 7)

**Responsabilidad**: Caché, sesiones, pub/sub

**Usos**:

1. **Caché de Queries**:
   ```
   Key: catalog:rutas
   TTL: 1 hora
   ```

2. **Sesiones JWT**:
   ```
   Key: session:{user_id}:{token_id}
   TTL: 7 días (refresh token)
   ```

3. **Pub/Sub para WebSockets**:
   ```
   Channel: incidente:updates
   → Broadcast a todos los servers
   ```

4. **Estado de Unidades**:
   ```
   Key: unidad:estado:{unidad_id}
   TTL: 5 minutos
   ```

---

## Flujos Críticos

### Flujo 1: Creación de Incidente desde App Móvil

```
1. Brigada llena formulario inicial
2. App hace POST /api/incidentes
3. Backend:
   a. Valida datos (Zod)
   b. Verifica auth (JWT)
   c. Inserta en BD (transaction)
   d. Emite event a Socket.io: 'incidente:nuevo'
   e. Invalida cache de incidentes activos
   f. Retorna incidente creado con ID
4. Socket.io:
   a. Broadcast a room 'rol:COP'
   b. Broadcast a room 'sede:{sede_id}'
5. Panel COP:
   a. Recibe evento via WebSocket
   b. React Query invalida y refetch
   c. UI actualiza automáticamente
   d. Notificación toast: "Nuevo incidente en CA-9 km 52"
```

**Tiempo total objetivo**: <5 segundos

### Flujo 2: Cambio de Estado de Unidad

```
1. COP cambia estado de unidad en panel web
2. Web hace POST /api/actividades
   Body: {
     unidad_id: 1,
     tipo_actividad_id: 2,  // "Accidente Vial"
     incidente_id: 123,
     ruta_id: 3,
     km: 52.5,
     hora_inicio: "2025-01-26T14:30:00Z"
   }
3. Backend:
   a. Trigger DB: Cierra actividad anterior (UPDATE hora_fin)
   b. Inserta nueva actividad
   c. Emite 'unidad:cambio_estado'
   d. Actualiza cache Redis: unidad:estado:1
4. Todos los paneles COP ven cambio en <2 seg
```

### Flujo 3: Reporte Público Ciudadano

```
1. Usuario público abre web
2. Clic "Reportar incidente"
3. Completa form + ubicación en mapa
4. POST /api/publico/reportar-incidente (sin auth)
5. Backend:
   a. Valida datos + rate limit por IP
   b. Crea incidente con origen='USUARIO_PUBLICO', estado='REPORTADO_PUBLICO'
   c. Emite 'reporte_publico:nuevo'
6. Panel COP:
   a. Notificación visual
   b. Aparece en sección "Reportes Ciudadanos Pendientes"
7. COP revisa y:
   - Confirmar → crea incidente formal, asigna unidad
   - Rechazar → marca como falsa alarma
   - No atender → selecciona motivo
```

---

## Seguridad

### Autenticación y Autorización

**Esquema JWT**:
```typescript
AccessToken:
  - Payload: { userId, rol, sede }
  - Expires: 15 min
  - Almacenado: localStorage (web) / SecureStore (mobile)

RefreshToken:
  - Payload: { userId, tokenId }
  - Expires: 7 días
  - Almacenado: Redis + localStorage/SecureStore
  - Usado para renovar AccessToken
```

**Middleware de Autorización**:
```typescript
const authorize = (allowedRoles: string[]) => {
  return (req, res, next) => {
    const user = req.user; // De middleware auth
    if (!allowedRoles.includes(user.rol)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// Uso:
router.get('/incidentes', auth, authorize(['COP', 'BRIGADA', 'MANDOS']), ...);
```

### Protecciones

1. **HTTPS Only**: Certificados Let's Encrypt
2. **CORS**: Whitelist de orígenes permitidos
3. **Rate Limiting**:
   - API general: 100 req/15min
   - Login: 5 intentos/15min
   - API pública: 20 req/15min
4. **Helmet.js**: Headers de seguridad
5. **Input Validation**: Zod en todos los endpoints
6. **SQL Injection**: Prepared statements (pg-promise)
7. **XSS**: Sanitización de inputs en frontend
8. **CSRF**: No necesario (API stateless con JWT)

### Auditoría

**Log de Auditoría**:
```sql
INSERT INTO auditoria_log (
  usuario_id, accion, tabla_afectada, registro_id,
  datos_anteriores, datos_nuevos, ip_address
) VALUES (...);
```

**Triggers**: Auto-log en tabla `incidente`

---

## Escalabilidad

### Escalado Horizontal

**Backend Stateless**:
```
Load Balancer (Nginx)
       │
   ┌───┴───────┬──────────┬──────────┐
   │           │          │          │
Backend-1  Backend-2  Backend-3  Backend-N
   │           │          │          │
   └───┬───────┴──────────┴──────────┘
       │
  Redis (Pub/Sub)
```

**WebSockets con Redis Adapter**:
```typescript
const io = new Server(httpServer, {
  adapter: createAdapter(redisClient)
});
```

Permite que múltiples instancias de backend compartan conexiones WebSocket.

### Optimizaciones de Performance

1. **Database**:
   - Índices estratégicos (ver DATABASE_DESIGN.md)
   - Connection pooling (max 20 connections)
   - Query timeout: 30s
   - Vistas materializadas para reportes

2. **Cache Strategy**:
   ```
   Catálogos → Cache 1 hora (raramente cambian)
   Incidentes activos → Cache 30 seg (con invalidación)
   Estado de unidades → Cache 1 min
   ```

3. **API Response**:
   - Paginación: max 100 items
   - Compresión gzip
   - ETag para recursos estáticos

4. **Frontend**:
   - Code splitting por rutas
   - Lazy loading de componentes
   - React Query con stale-while-revalidate
   - Debouncing de búsquedas

---

## Monitoreo y Observabilidad

### Logs

**Niveles**:
- `error`: Errores críticos
- `warn`: Warnings
- `info`: Operaciones importantes
- `debug`: Debug (solo dev)

**Formato**:
```json
{
  "timestamp": "2025-01-26T14:30:00.123Z",
  "level": "info",
  "message": "Incidente creado",
  "metadata": {
    "userId": 5,
    "incidenteId": 1234,
    "ip": "192.168.1.10"
  }
}
```

**Destino**:
- Desarrollo: Console
- Producción: Archivos rotatorios + syslog

### Health Checks

```typescript
GET /health
{
  "status": "healthy",
  "timestamp": "2025-01-26T14:30:00Z",
  "services": {
    "database": "up",
    "redis": "up"
  }
}
```

### Métricas (futuro)

- Requests/segundo
- Latencia promedio
- Tasa de errores
- Conexiones WebSocket activas
- Cache hit ratio

---

## Despliegue

### Desarrollo

```bash
# Levantar servicios
docker-compose up -d

# Ejecutar migraciones
cd migrations && ./run_migrations.sh

# Backend
cd backend && npm run dev

# Web
cd web && npm run dev

# Mobile
cd mobile && npm run start
```

### Producción (VPS)

**Stack**:
- Ubuntu 22.04 LTS
- Docker + Docker Compose
- Nginx (reverse proxy + HTTPS)
- Certbot (Let's Encrypt)

**Arquitectura**:
```
Internet
   │
   ▼
Nginx (HTTPS :443)
   │
   ├─► /           → React SPA (static files)
   ├─► /api/*      → Backend :3000
   └─► /socket.io  → WebSockets :3000
```

**Docker Compose Prod**:
```yaml
services:
  postgres:
    # ... configuración con secrets
  redis:
    # ... configuración
  backend:
    image: provial-backend:latest
    replicas: 2  # Escalado horizontal
  nginx:
    # ... reverse proxy
```

**Backups**:
```bash
# Cron diario: PostgreSQL dump
0 2 * * * pg_dump > backup_$(date +\%Y\%m\%d).sql && s3 upload ...
```

---

## Próximos Pasos

### Fase 1 (Actual): Backend Core
- [ ] Setup Express + TypeScript
- [ ] Autenticación JWT
- [ ] CRUD catálogos
- [ ] CRUD incidentes
- [ ] WebSockets base

### Fase 2: App Móvil
- [ ] Setup React Native
- [ ] Login
- [ ] CRUD incidentes
- [ ] Offline mode

### Fase 3+: Ver README.md

---

### Flujo 4: Inicio de Salida y Unidades de Reacción

```
1. Brigada inicia sesión y selecciona su asignación.
2. Si es "Unidad de Reacción" (sin ruta fija):
   a. App obliga a seleccionar ruta inicial (Pick-up list).
   b. Usuario selecciona ruta y confirma.
3. App hace POST /api/salidas/iniciar
   Body: { 
     unidad_id: 1, 
     ruta_inicial_id: 5, // Requerido si es reacción
     km_inicial: 10000 
   }
4. Backend:
   a. Crea registro en salida_unidad.
   b. Si es reacción: actualiza asignacion_unidad con la ruta seleccionada.
   c. Marca unidad como "EN_SALIDA".
5. COP:
   a. Filtro de mapa se actualiza (unidad aparece visible).
   b. Bitacora disponible.
```

---

**Versión**: 1.1
**Última actualización**: 2025-12-12
**Autor**: Equipo Provial
