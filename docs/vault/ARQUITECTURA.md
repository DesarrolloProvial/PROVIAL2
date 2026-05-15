---
tags: [arquitectura, infraestructura, stack]
---

# Arquitectura del Sistema PROVIAL

## Stack tecnológico

| Capa | Tecnología | Deploy |
|------|-----------|--------|
| Backend API | Express + TypeScript | Railway (auto-deploy en push a `main`) |
| Frontend Web | React + Vite + TailwindCSS | Vercel (auto-deploy en push a `main`) |
| Aplicación Móvil | React Native (Expo) | APK manual / Expo Go en desarrollo |
| Base de datos | PostgreSQL | Railway (misma instancia que el backend) |
| Caché / Pub-Sub | Redis (ioredis) | Railway |
| Almacenamiento multimedia | Cloudinary (Railway) / filesystem local (VM) | Ver D-032 |
| Push notifications | Firebase Admin SDK | SaaS externo |

---

## Infraestructura de despliegue

```
GitHub (rama main)
    │
    ├─► Railway  ──► Backend Express  ──► PostgreSQL (Railway)
    │                                 └─► Redis (Railway)
    │
    └─► Vercel   ──► Frontend React
```

- **URL producción backend**: `https://provial-production.up.railway.app`
- **Build Railway**: `cd backend && npm install && npm run build`
- **Start Railway**: `cd backend && npm start`
- **Health check**: `GET /api/health`
- **Restart policy**: ON_FAILURE, máx 3 reintentos

---

## Despliegue en VM institucional (Docker)

Para instalaciones institucionales sin acceso a Railway/Vercel, el stack completo corre en un solo servidor con `docker compose up -d --build`.

```
git clone ...
cp .env.example .env          # editar VM_HOST, DB_PASSWORD, JWT_SECRET
cp backend/.env.example backend/.env   # editar si se quieren valores distintos
(opcional) cp backup.bak backups/provial.backup
docker compose up -d --build
```

### Servicios del compose

| Servicio | Imagen | Función |
|----------|--------|---------|
| `postgres` | postgis/postgis:16-3.4-alpine | Base de datos (sin puerto expuesto al host) |
| `redis` | redis:7-alpine | Caché y pub-sub |
| `migrator` | postgis (one-shot) | Aplica migraciones pendientes con tracking table `_schema_migrations` |
| `backend` | node:20-alpine (multi-stage) | API Express; lee `backend/.env` + overrides del compose |
| `web` | nginx:alpine (multi-stage build) | React/Vite compilado con `VITE_API_URL=/api` |
| `nginx` | nginx:alpine | Entry point único en puerto 80 |
| `pgadmin` | dpage/pgadmin4 (profile:tools) | Solo con `--profile tools` |

### Variables de entorno raíz (`.env`)

| Variable | Descripción |
|----------|-------------|
| `VM_HOST` | IP o dominio del servidor (sin protocolo ni puerto) |
| `DB_USER` / `DB_PASSWORD` | Credenciales de Postgres |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Claves JWT (cambiar en producción) |

### Almacenamiento multimedia en VM

Con `STORAGE_TYPE=local` (inyectado automáticamente por el compose), los archivos se guardan en el volumen Docker `uploads_data` montado en `/app/uploads` del backend. Nginx los sirve directamente en `/uploads/` (sin pasar por el backend) desde el mismo volumen montado en `/uploads:ro`.

```
POST /api/multimedia/situaciones/:id/foto
    → backend → storage.service.ts → /app/uploads/fotos/<archivo>  (volumen)
GET /uploads/fotos/<archivo>
    → nginx → /uploads/fotos/<archivo>  (mismo volumen, solo lectura)
```

**`STORAGE_BASE_URL`** (ej: `http://192.168.1.100/uploads`) se inyecta en el backend para que las URLs devueltas en la API sean descargables por el cliente. Ver D-032.

### Migrator y backup

- Si existe `backups/provial.backup`: `docker/init-scripts/00_run_migrations.sh` lo restaura con `pg_restore` y pre-puebla `_schema_migrations` con todos los archivos de `backend/migrations/`. El migrator solo aplica las diferencias nuevas.
- Si no hay backup: el migrator aplica todas las migraciones del repo en orden (requiere que `backend/migrations/` tenga el esquema completo desde cero o que se añada `docker/init-scripts/000_base_schema.sql`).

### Rutas nginx (VM)

| Location | Destino |
|----------|---------|
| `/api/` | `backend:3000` (con rate limit) |
| `/api/auth/login` | `backend:3000` (rate limit más estricto) |
| `/socket.io/` | `backend:3000` (WebSocket upgrade) |
| `/uploads/` | volumen local (archivos estáticos, 30d cache) |
| `/` | `web:80` (React SPA) |

---

## Estructura del repositorio

```
proyectoProvialMovilWeb/
├── backend/
│   ├── src/
│   │   ├── config/          # env.ts, database.ts
│   │   ├── controllers/     # por dominio (common/, cop/, operaciones/, etc.)
│   │   ├── middlewares/     # auth.ts, deviceSecurity.ts, idempotency.ts
│   │   ├── models/          # consultas DB organizadas por entidad
│   │   ├── routes/          # por dominio (common/, cop/, operaciones/, etc.)
│   │   ├── services/        # socket.service.ts, notificaciones, etc.
│   │   ├── types/           # tipos TypeScript compartidos
│   │   └── utils/           # db.utils.ts (normalizeId, normalizeFloat, parseIndicador, checkCoordenadasGuatemala, buildObservacionEntry), jwt.ts, operaciones.utils.ts
│   └── migrations/          # NNN_nombre.sql — aplicar con psql a Railway
├── web/
│   └── src/
│       ├── components/      # componentes reutilizables
│       ├── hooks/           # useSocket.ts, useAuth, etc.
│       ├── pages/           # por dominio (cop/, operaciones/, admin/, etc.)
│       ├── services/        # clientes HTTP
│       ├── store/           # Zustand stores
│       └── types/
├── mobile/
│   └── src/
│       ├── screens/         # brigada/, situaciones/, auth/
│       ├── services/        # api.ts (axios), catalogSync.ts
│       ├── store/           # authStore.ts, situacionesStore.ts (Zustand)
│       └── constants/       # config.ts (API_URL)
└── docs/
    └── vault/               # Documentación Obsidian
        ├── SCHEMA.md        # Esquema completo de BD
        └── ARQUITECTURA.md  # Este archivo
```

---

## Backend — organización por dominio

Los controllers y routes siguen la misma jerarquía de dominios:

| Dominio | Ruta base | Descripción |
|---------|-----------|-------------|
| `common` | `/auth`, `/turnos`, `/ingresos`, `/salidas`, `/geografia`, `/sedes`, `/notificaciones`, `/reportes`, `/conflictos` | Compartido entre móvil y web — modelos: `TurnoModel`, `IngresoModel`, `SalidaModel` (8 métodos post-refactor abril 2026), `ConflictoModel`, `NotificacionModel`, `UsuarioModel` |
| `cop` | `/situaciones`, `/actividades`, `/ubicacion-brigadas`, `/capas-mapa`, `/situaciones-persistentes`, `/cop/acceso`, `/movimientos` | Centro de Operaciones — modelos: `SituacionModel`, `ActividadModel`, `SituacionPersistenteModel` (creado abril 2026), `UbicacionBrigadaModel` |
| `operaciones` | `/grupos`, `/brigadas`, `/asignaciones`, `/asignaciones-avanzadas`, `/reasignaciones`, `/operaciones` | Planificación y turnos |
| `admin` | `/admin`, `/roles`, `/auditoria`, `/dashboard`, `/dispositivos` | Administración del sistema — modelos: `AdministracionModel`, `AuditoriaModel`, `DispositivoModel`, `RolModel`, `PasswordResetModel`, `TestModel` |
| `transportes` | `/unidades`, `/inspeccion360`, `/reparaciones`, `/transportes/asignaciones`, `/transportes/reasignaciones` | Flota vehicular — modelos: `UnidadModel`, `ReparacionModel`, `Inspeccion360Model`, `AsignacionTransporteModel`, `ReasignacionTransporteModel` |
| `accidentologia` | `/accidentologia`, `/estadisticas`, `/intelligence` | Hojas de accidente y análisis — modelos: `AccidentologiaModel`, `IntelligenceModel` |
| `comunicacion` | `/comunicacion-social` | Publicaciones y plantillas |
| `mobile` | *(eliminado — ver D-014)* | El dominio mobile fue suprimido; la app usa `common/` para todo |

### Convención controller location

- **`common/`** — lógica compartida entre brigada móvil y COP web (e.g. `salida.controller`, `ingreso.controller`)
- **`cop/`** — lógica exclusiva del panel COP web
- **`operaciones/`** — lógica de planificación (solo web)

---

## Middlewares de autenticación

### `authenticate`
Verifica el JWT en el header `Authorization: Bearer <token>`. Si válido, adjunta `req.user: JWTPayload` con `{ userId, rol, sede }`. Rechaza con 401 si falta o expiró.

### `authorize(...roles)`
Verifica que `req.user.rol` esté en la lista de roles permitidos. **`SUPER_ADMIN` siempre pasa**, sin importar los roles especificados.

### Helpers compartidos — `utils/db.utils.ts`

| Función | Qué hace |
|---------|---------|
| `normalizeId(val)` | Convierte params/body a `number \| null`. Rechaza `0`, negativos, strings no numéricos. **Usar siempre en lugar de `parseInt` directo en controllers.** |
| `normalizeFloat(val)` | Igual que `normalizeId` pero acepta decimales. Para km, combustible, coordenadas. |
| `parseIndicador(val)` | Convierte `'LLENO'/'3/4'/'1/2'/'1/4'/'VACIO'` a decimal 0–1. |
| `checkCoordenadasGuatemala(lat, lon)` | Devuelve advertencia string si las coordenadas salen del bounding box de Guatemala. |
| `buildObservacionEntry(userId, obs, hora?)` | Construye la entrada JSON firmada para el timeline de observaciones (situacion/actividad). |

### Helper de JWT — `utils/jwt.ts`

`JWTPayload`: `{ userId, rol, sede?, puede_ver_todas_sedes?, sub_rol_cop_id?, sub_rol_cop_codigo? }`

- `sede` es `undefined` para SUPER_ADMIN y ADMIN globales — **nunca asumir que existe**.
- `puede_ver_todas_sedes` también puede ser `undefined`; usar `puedeVerTodasSedes(user)` local en cada controller para combinar ambas señales.
- Patrón correcto para filtro de sede: `const sedeId = puedeVerTodasSedes(user) ? undefined : user.sede;`

---

### `canEditSituacion`
Middleware específico para edición de situaciones. Permite si: rol es COP/OPERACIONES/ADMIN, o si el usuario es el creador, o si es miembro activo de la tripulación de la unidad.

### `deviceSecurity`
Valida que el dispositivo móvil esté registrado y autorizado en `dispositivo_autorizado`. Tres capas:
1. **Blacklist global** — bloquea por IP+UUID si supera el rate limit (120 req/min).
2. **Whitelist móvil** — exige `estado = 'APROBADO'` en `dispositivo_autorizado`; si no existe registra `PENDIENTE` y devuelve 403.
3. **Configuración dinámica** — `whitelist_movil_activa` en `configuracion_sistema` habilita/deshabilita el filtro sin redespliegue.

**Clave canónica `device_id`**: es el UUID del dispositivo (`X-Device-UUID`), no el IMEI. El IMEI real no es accesible en iOS/Android moderno. Ver D-019.

Headers que el cliente móvil envía:
- `X-App-Platform: "mobile"`
- `X-Device-UUID: <UUID estable>` — iOS Vendor ID o Android ID
- `X-Device-IMEI: <mismo UUID>` — mantenido por compatibilidad, valor igual al UUID
- `X-Device-Model: <modelo>` — enriquece el registro

### `canGestionarAcceso`
Middleware en `middlewares/copAcceso.ts`. Permite gestionar accesos de brigada si el usuario es:
1. `ADMIN` o `SUPER_ADMIN` (pasa siempre), o
2. `COP` con sub-rol permanente `ADMIN_COP`, o
3. `COP` con delegación activa en tabla `delegacion_permiso_cop` (`permiso = 'GESTIONAR_ACCESO'`).

Rechaza con 403 para cualquier otro caso.

### `isAdminCop`
Middleware en `middlewares/copAcceso.ts`. Solo permite `ADMIN_COP` real (no delegado) para otorgar/revocar delegaciones. Rechaza con 403 a COP con delegación ordinaria.

### `idempotency`
Previene duplicados en operaciones críticas (inicio de salida, creación de situaciones) usando una clave de idempotencia en headers.

---

## Roles del sistema

| Rol | Acceso principal |
|-----|-----------------|
| `BRIGADA` | App móvil — salidas, situaciones, ingresos propios |
| `COP` | Panel web COP — mapa, situaciones activas, bitácora |
| `OPERACIONES` | Panel web — gestión de grupos, asignaciones, turnos |
| `TRANSPORTES` | Gestión de unidades, inspecciones 360, reparaciones |
| `ADMIN` | Acceso amplio; administración general |
| `SUPER_ADMIN` | Acceso total sin restricciones de `authorize` |
| `ENCARGADO_NOMINAS` | Consulta de bitácora y salidas para nóminas |
| `MANDOS` | Consulta ejecutiva |
| `ACCIDENTOLOGIA` | Módulo de hojas de accidente |
| `COMUNICACION_SOCIAL` | Publicaciones y plantillas de comunicación |

---

## WebSocket (tiempo real)

El backend usa **Socket.io** montado sobre el mismo servidor HTTP. El frontend web se conecta mediante el hook `useSocket`.

### Rooms automáticos al conectar

| Room | Quiénes entran |
|------|---------------|
| `global` | Todos |
| `rol:<ROL>` | Por rol del JWT |
| `sede:<id>` | Por sede del JWT |
| `dashboard` | COP, ADMIN, OPERACIONES |
| `all-situaciones` | COP, ADMIN, OPERACIONES |
| `all-unidades` | COP, ADMIN, OPERACIONES |
| `situaciones:sede:<id>` | BRIGADA (solo su sede) |

### Eventos emitidos desde el backend

| Evento | Función emisora | Cuándo |
|--------|----------------|--------|
| `situacion:nueva` | `emitSituacionNueva()` | Al crear situación |
| `situacion:actualizada` | `emitSituacionActualizada()` | Al editar situación |
| `situacion:cerrada` | `emitSituacionCerrada()` | Al cerrar situación |
| `unidad:cambio_estado` | `emitUnidadCambioEstado()` | Al iniciar/finalizar salida |
| `resumen:update` | `emitResumenUpdate()` | Periódico / post-cambio |
| `actividad:nueva` | directo `emitToRoom()` | Al crear actividad |
| `actividad:actualizada` | directo | Al editar actividad |
| `actividad:cerrada` | directo | Al cerrar actividad |

### En el frontend web

El hook `useDashboardSocket(queryClient)` escucha los eventos e invalida las React Query caches relevantes (`situaciones-activas`, `resumen-unidades`, etc.) para refrescar la UI sin polling.

---

## Aplicación móvil — flujo de datos

```
AsyncStorage (clave 'token' para JWT, 'device_uuid' para el UUID)
        │
        ▼
api.ts (axios instance)
  ├── Interceptor de request: agrega Authorization + X-Device-UUID/IMEI/Model
  │     UUID: lee AsyncStorage 'device_uuid'; si no existe lo genera (iOS Vendor ID o Android ID)
  │     IMEI: igual al UUID (el IMEI real no es accesible — ver D-019)
  └── validateStatus: acepta 4xx (no lanza error en respuestas de negocio)
        │
        ▼
Backend Railway  ◄──► PostgreSQL
```

**Claves AsyncStorage del cliente móvil**:
| Clave | Valor | Quién la escribe |
|-------|-------|-----------------|
| `'token'` | JWT de sesión | `authStore.login()` |
| `'refreshToken'` | Refresh JWT | `authStore.login()` |
| `'user'` | JSON del usuario autenticado | `authStore.login()` |
| `'device_uuid'` | UUID estable del dispositivo | `api.ts` `getDeviceIds()` |

El `logout()` en `api.ts` elimina `['token', 'refreshToken', 'user']`. **No usar `'accessToken'`** — esa clave nunca existió en este proyecto.

### Regla crítica: toda petición HTTP móvil debe usar `api.ts`, nunca `fetch()` directo

El cliente axios en `mobile/src/services/api.ts` agrega automáticamente `X-App-Platform: mobile`, `X-Device-UUID`, `X-Device-IMEI` y `Authorization` en cada petición mediante un interceptor. El backend los exige vía `deviceSecurity` middleware.

**Usar `fetch()` directo omite esos headers → el backend devuelve 403 `MISSING_OR_INVALID_PLATFORM`.**

Archivos que deben importar `api` (no `fetch`):
- `hooks/useDraftSituacion.ts` — enviarDraft, reservarNumero, resolverConflicto*
- `services/multimedia.service.ts`
- Cualquier nuevo hook o servicio que haga peticiones al backend

Patrón correcto:
```typescript
import api from '../services/api';
const response = await api.post('/situaciones', payload, { headers: { 'Idempotency-Key': id } });
// response.status: número HTTP (4xx no lanza porque validateStatus: status < 500)
// response.data: body ya parseado (no .json())
```

### Catálogos offline

La app móvil descarga catálogos (tipos de situación, rutas, sedes, etc.) vía `catalogSync.ts` → `GET /situaciones/auxiliares` y los almacena en **expo-sqlite** (API síncrona v16+).

- `CatalogoStorage` — singleton con patrón `init()` → crear tablas → poblar
- Usados para formularios sin conexión y selects dinámicos

### Stores (Zustand)

| Store | Estado principal |
|-------|----------------|
| `authStore` | `token`, `user`, `isAuthenticated`, `salidaActiva`, `miSede` |
| `situacionesStore` | Estado local de formulario de nueva situación |

### Componentes UI móvil — sistema de temas y componentes nativos

**`react-native-paper` eliminado de todos los formularios de situación**. Todos los formularios (VehiculoForm, PersonaForm, AjustadorForm, GruaForm, VehiculoManager, AutoridadSocorroManager, SelectConOtro, CrossPlatformPicker) usan únicamente React Native nativo + `useTheme()`.

**Sistema de temas (`useTheme`)**:
```typescript
const { colors: c } = useTheme();
// Tokens: c.primary, c.border, c.surface, c.background
//         c.text.primary, c.text.secondary, c.text.disabled, c.text.inverse
//         c.danger, c.gray[200/400]
```
Regla: `StyleSheet` solo para geometría/layout. Colores siempre inline con `c.*`.

**Patrón accordion**:
```tsx
<TouchableOpacity onPress={() => setExpanded(!expanded)}>
  <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} />
</TouchableOpacity>
```

**Patrón chip-row** (selector múltiple):
```tsx
<TouchableOpacity style={[styles.chip, {
  backgroundColor: selected ? c.primary : c.surface,
  borderColor: selected ? c.primary : c.border,
}]}>
  <Text style={{ color: selected ? c.text.inverse : c.text.primary }}>{opcion}</Text>
  {selected && <MaterialCommunityIcons name="check" size={14} color={c.text.inverse} />}
</TouchableOpacity>
```

**Patrón radio nativo**:
```tsx
<View style={[styles.radioOuter, { borderColor: selected ? c.primary : c.border }]}>
  {selected && <View style={[styles.radioInner, { backgroundColor: c.primary }]} />}
</View>
```

**Alert.alert en acciones destructivas** — toda eliminación de entidad (vehículo, ajustador, grúa) usa el patrón:
```typescript
Alert.alert('Eliminar X', '¿Confirmar?', [
  { text: 'Cancelar', style: 'cancel' },
  { text: 'Eliminar', style: 'destructive', onPress: () => fn() },
]);
```
El alert se coloca en el *manager* (VehiculoManager, GruaManager), no en el formulario hijo, para evitar doble diálogo.

**`SelectConOtro.tsx`**: selector con opción "Otro" + TextInput nativo. El `androidWrapper` no tiene `overflow: 'hidden'`. Todos los `Picker.Item` llevan `color={c.text.primary}` explícito; el placeholder lleva `color={c.text.disabled}`. El Picker de iOS lleva `itemStyle={{ color: c.text.primary, fontSize: 18 }}`.

**`CrossPlatformPicker.tsx`**: mismas reglas de color que SelectConOtro. `dropdownIconColor={c.text.secondary}` en Android.

**`SelectField.tsx` (iOS)**: usa `Modal transparent + animationType="slide"`. Layout raíz `flex: 1, justifyContent: 'flex-end'`, overlay `position: 'absolute'` cubriendo pantalla completa. Mismas reglas de color de `Picker.Item`.

**Sistema de infografías multimedia (`InfografiaManager` + `MultimediaWrapper`):**

| Componente | Responsabilidad |
|---|---|
| `InfografiaManager.tsx` | UI: muestra históricas (solo lectura) + sesión actual (editable). Modal de captura via `MultimediaCaptureOffline`. |
| `MultimediaWrapper.tsx` | Adaptador bidireccional para `FormBuilder`: convierte `MultimediaRef[]` plano ↔ `Infografia[]` agrupado. Lo usan los form configs de HECHO_TRANSITO, ASISTENCIA_VEHICULAR, EMERGENCIA_VIAL. |

`InfografiaManager` recibe `Infografia[]` directamente (NuevaSituacionScreen). `MultimediaWrapper` hace la conversión cuando viene del FormBuilder.

**Regla crítica en `MultimediaWrapper.toGroupedInfografias`**: extraer `infografia_titulo` del ref **antes** del `return` del placeholder, o el título de una infografía vacía se pierde en cada re-render.

**`InfografiaManager.tsx`**: el Modal de captura usa `SafeAreaView` como contenedor raíz (notch/Dynamic Island). Botón "Listo" en la parte inferior además del "✕ Cerrar" en el header.

---

## Patrones de base de datos

Ver [[SCHEMA#Patrones de consulta importantes]] para:
- Timezone Guatemala (`AT TIME ZONE 'America/Guatemala'`)
- Named params pg-promise `$/param/`
- Funciones PG atómicas (`iniciar_salida_unidad`, `finalizar_jornada_completa`, etc.)
- Regla `db.none()` vs `db.one()` vs `db.any()`

---

## Convenciones de seguridad en controllers

Reglas aplicadas de forma sistemática en todos los controllers (refactor en curso, abril 2026):

| Regla | Correcto | Incorrecto |
|-------|----------|------------|
| IDs de entidad | `normalizeId(req.params.id)` + guard 400 | `parseInt(req.params.id)` |
| IDs numéricos no-entidad (días, límites) | `parseInt(val)` | `normalizeId` (demasiado estricto) |
| Usuario autenticado | `req.user!.userId` | `req.user?.userId` |
| Error 500 HTTP body | `{ error: 'Error interno del servidor' }` | `{ error: error.message }` |
| Tipo de catch | `catch (error)` | `catch (error: any)` |
| Logging de error | `console.error('fnName:', error)` | `console.error('Error fnName:', error.message)` |
| SQL en controller | Mover a Model si es simple; `db.tx` en controller solo si cruza dominios | Inline sql sin justificación |
| Funciones sin try-catch | Solo si todas las llamadas internas ya están cubiertas | Dejar `await model.X()` sin protección |

**Estado del refactor de seguridad (abril 2026)**:

| Controller | normalizeId | error genérico | catch tipado | SQL → model |
|------------|-------------|----------------|--------------|-------------|
| `common/salida.controller.ts` | ✅ | ✅ | ✅ | ✅ completo (0 SQL inline) |
| `cop/actividad.controller.ts` | ✅ | ✅ | ✅ | ✅ (`addObservacion` → model) |
| `cop/situacion.controller.ts` | ✅ | ✅ | ✅ | ✅ completo — 0 SQL inline; `createSituacion` → `SituacionModel.crearCompleta` (3C) |
| `cop/situacion.query.controller.ts` | ✅ | ✅ | ✅ | ✅ completo — import `db` eliminado (3A) |
| `cop/situacionPersistente.controller.ts` | ✅ | ✅ | ✅ | ✅ completo |
| `common/reportes.controller.ts` | ✅ | ✅ | ✅ | — (sin SQL inline) |
| `common/reportes.service.ts` | — | — | — | bug `db.query()→db.any()` ✅ |
| `transportes/inspeccion360.controller.ts` | ✅ | ✅ | ✅ | — (sin SQL inline) |
| `transportes/unidades.controller.ts` | ✅ | ✅ | ✅ | — |
| `transportes/asignacionTransporte.controller.ts` | ✅ | ✅ | ✅ | — |
| `transportes/reasignacionTransporte.controller.ts` | ✅ | ✅ | ✅ | — |
| `transportes/reparaciones.controller.ts` | ✅ | ✅ | ✅ | — |
| `operaciones/brigadas.controller.ts` | ✅ normalizeId en todos los :id params | ✅ | ✅ | — (SQL inline justificado) |
| `operaciones/grupo.controller.ts` | ✅ | ✅ | ✅ | — |
| `operaciones/asignacionAvanzada.controller.ts` | ✅ | ✅ | ✅ | — |
| `operaciones/operaciones.controller.ts` | ✅ | ✅ | ✅ | — (SQL inline justificado: analytics) |
| `admin/administracion.controller.ts` | ✅ | ✅ | ✅ | — |
| `admin/dashboard.controller.ts` | ✅ | ✅ | ✅ | — |
| `admin/importExcel.controller.ts` | ✅ | ✅ | ✅ | — |
| `comunicacion/comunicacionSocial.controller.ts` | ✅ | ✅ | ✅ | — |
| `common/cloudinary.controller.ts` | ✅ | ✅ | ✅ | — |
| `common/conflictos.controller.ts` | ✅ | ✅ | ✅ | — |
| `common/ingreso.controller.ts` | ✅ | ✅ | ✅ | — |
| `common/multimedia.controller.ts` | ✅ | ✅ | ✅ | — |
| `common/turno.controller.ts` | ✅ | ✅ | ✅ | — |
| `cop/acceso.controller.ts` | ✅ | ✅ | ✅ | — |
| `cop/situacionPersistente.controller.ts` | ✅ | ✅ | ✅ | — |

**Refactor de seguridad completado (abril 2026)**: 0 `catch (error: any)`, 0 `error.message` sin cast, 0 `parseInt` en IDs de entidad en todos los controllers del backend. Todos los dominios: COP, common, transportes, operaciones, admin, comunicacion.

---

## Flujo de petición típica (backend)

```
Request HTTP
    │
    ├── [rate limiting / helmet]
    ├── authenticate  → req.user
    ├── authorize('ROL1', 'ROL2')
    ├── [deviceSecurity — solo endpoints móvil críticos]
    ├── [idempotency — solo operaciones críticas]
    │
    ▼
Controller (controllers/<dominio>/<nombre>.controller.ts)
    ├── Lee req.params / req.body
    ├── Llama Model o SQL directo via db.*()
    │     └── Model: models/<dominio>/<entidad>.model.ts
    ├── Llama resolveContextoActivo(userId) si necesita salida/unidad activa
    └── Emite evento Socket si corresponde
    │
    ▼
Response JSON
```
