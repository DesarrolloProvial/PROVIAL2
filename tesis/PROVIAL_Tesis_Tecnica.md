# Sistema Integral de Gestión de Operaciones Viales — PROVIAL
## Documento Técnico para Tesis

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Contexto y Justificación](#2-contexto-y-justificación)
3. [Arquitectura General del Sistema](#3-arquitectura-general-del-sistema)
4. [Tecnologías Utilizadas](#4-tecnologías-utilizadas)
5. [Módulo Backend — API REST](#5-módulo-backend--api-rest)
6. [Módulo Web — Panel de Control](#6-módulo-web--panel-de-control)
7. [Módulo Móvil — App de Campo](#7-módulo-móvil--app-de-campo)
8. [Base de Datos](#8-base-de-datos)
9. [Seguridad y Autenticación](#9-seguridad-y-autenticación)
10. [Comunicación en Tiempo Real](#10-comunicación-en-tiempo-real)
11. [Arquitectura Offline-First](#11-arquitectura-offline-first)
12. [Módulos de Negocio](#12-módulos-de-negocio)
13. [Infraestructura y Despliegue](#13-infraestructura-y-despliegue)
14. [Patrones de Diseño Aplicados](#14-patrones-de-diseño-aplicados)
15. [Flujos Principales del Sistema](#15-flujos-principales-del-sistema)
16. [Métricas y Análisis de Datos](#16-métricas-y-análisis-de-datos)
17. [Conclusiones Técnicas](#17-conclusiones-técnicas)

---

## 1. Resumen Ejecutivo

PROVIAL es un sistema integral de gestión de operaciones viales desarrollado para Guatemala. Su objetivo es digitalizar y centralizar el registro, seguimiento y análisis de incidentes de tránsito, operaciones de patrullaje, mantenimiento de flotilla y administración de brigadas de campo.

El sistema está compuesto por tres aplicaciones interconectadas:

- **API REST con WebSockets** (Node.js + Express + TypeScript)
- **Panel Web** para supervisión y operaciones (React + TypeScript)
- **Aplicación Móvil** para brigadas de campo (React Native + Expo)

Los datos se almacenan en **PostgreSQL 16** con soporte geoespacial (PostGIS), y se utiliza **Redis** para gestión de sesiones y mensajería en tiempo real mediante **Socket.io**.

La aplicación móvil implementa un patrón **Offline-First** con sincronización eventual, permitiendo a los brigadistas reportar incidentes sin conexión a internet y sincronizar cuando la conectividad se restaura.

---

## 2. Contexto y Justificación

### 2.1 Problema Identificado

Las operaciones viales en Guatemala históricamente se han gestionado mediante procesos manuales: reportes en papel, comunicación por radio y registros físicos. Este enfoque presenta múltiples problemas:

- **Demora en la respuesta**: Sin información centralizada, el Centro de Operaciones (COP) no conoce la ubicación o estado de las unidades en tiempo real.
- **Pérdida de información**: Los reportes físicos se deterioran, se pierden o son difíciles de consultar históricamente.
- **Falta de trazabilidad**: No existe un registro completo del ciclo de vida de un incidente (apertura, atención, cierre, seguimiento).
- **Imposibilidad de análisis**: Sin datos digitalizados, no es posible generar estadísticas de accidentología, tendencias de combustible o rendimiento por sede.
- **Conectividad limitada en campo**: Las brigadas operan en carreteras con cobertura celular irregular.

### 2.2 Solución Propuesta

PROVIAL digitaliza el ciclo completo de operaciones:

1. El **brigadista** inicia su turno desde la app móvil, reporta situaciones y actividades en campo.
2. El **COP** monitorea en tiempo real desde el mapa web, coordina recursos y gestiona situaciones persistentes.
3. El área de **Operaciones** programa turnos, asigna brigadas y aprueba salidas.
4. El área de **Transportes** gestiona combustible, reparaciones e inspecciones de flotilla.
5. **Mandos** consultan dashboards ejecutivos con KPIs agregados.

---

## 3. Arquitectura General del Sistema

### 3.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTES                               │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  App Móvil   │    │  Panel Web   │    │  Navegador    │  │
│  │ React Native │    │    React     │    │  (cualquier)  │  │
│  │   + Expo     │    │  + Vite      │    │               │  │
│  └──────┬───────┘    └──────┬───────┘    └───────┬───────┘  │
└─────────┼──────────────────┼────────────────────┼───────────┘
          │ HTTPS + WS       │ HTTPS + WS          │ HTTPS
          ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    NGINX (Reverse Proxy)                     │
│                 SSL Termination · Port 80/443                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API (Node.js + Express)                 │
│                                                             │
│   ┌─────────────┐   ┌───────────────┐   ┌───────────────┐   │
│   │  REST API   │   │  Socket.io    │   │  Middleware   │   │
│   │ 43 rutas    │   │ Tiempo Real   │   │  JWT · Roles  │   │
│   └──────┬──────┘   └──────┬────────┘   └───────────────┘   │
└──────────┼────────────────┼─────────────────────────────────┘
           │                │
     ┌─────┴──────┐   ┌─────┴──────┐
     │ PostgreSQL │   │   Redis    │
     │     16     │   │     7      │
     │  PostGIS   │   │  Sesiones  │
     │ 128 migr.  │   │  Pub/Sub   │
     └────────────┘   └────────────┘
           │
     ┌─────┴──────────────────────────┐
     │       Servicios Externos       │
     │  Cloudinary · Firebase FCM     │
     └────────────────────────────────┘
```

### 3.2 Patrón Monorepo

El proyecto utiliza un **monorepo** con tres paquetes independientes:

```
proyectoProvialMovilWeb/
├── backend/          # API Node.js (Railway)
├── web/              # SPA React (Vercel)
├── mobile/           # App Expo (EAS Build → Play Store)
├── shared/           # Tipos TypeScript compartidos
├── docker-compose.yml            # Entorno de desarrollo
├── docker-compose.production.yml # Entorno de producción
└── nginx/            # Configuración del proxy reverso
```

**Ventajas del monorepo**:
- Tipos TypeScript compartidos entre frontend y backend en `shared/`
- Un solo repositorio git para todo el ciclo de vida del sistema
- Consistencia de versiones entre paquetes

---

## 4. Tecnologías Utilizadas

### 4.1 Stack Tecnológico Completo

| Capa | Tecnología | Versión | Justificación |
|------|-----------|---------|---------------|
| **Runtime Backend** | Node.js | LTS 20+ | Ecosistema JS/TS, event-loop no bloqueante |
| **Framework API** | Express.js | 4.21.2 | Minimalista, extensible, amplia adopción |
| **Lenguaje** | TypeScript | 5.9.2 | Tipado estático, reducción de errores en runtime |
| **Base de datos** | PostgreSQL 16 | 16 + PostGIS | Relacional con soporte geoespacial |
| **ORM/Query** | pg-promise | 12.0.3 | SQL nativo con parametrización segura |
| **Cache/Sesiones** | Redis | 7 | Almacenamiento en memoria, pub/sub |
| **WebSockets** | Socket.io | 4.8.1 | Abstracción WebSocket con fallback polling |
| **Autenticación** | JWT + bcryptjs | 9.0.2 / 2.4.3 | Stateless auth con refresh tokens |
| **Validación** | Zod | 3.24.1 | Schema validation con tipado inferido |
| **PDF** | PDFKit | 0.17.2 | Generación de reportes en servidor |
| **Excel** | ExcelJS | 4.4.0 | Exportación de datos tabulares |
| **Imágenes** | Sharp | 0.34.5 | Redimensionado y optimización en servidor |
| **Almacenamiento** | Cloudinary | 1.41.3 | CDN para multimedia de incidentes |
| **Notificaciones** | Firebase Admin | 13.6.0 | Push notifications a dispositivos móviles |
| **Geoespacial** | @turf/turf | 7.2.0 | Cálculos geométricos (distancias, polígonos) |
| **Framework Web** | React | 19.2.0 | Librería UI declarativa y reactiva |
| **Build Web** | Vite | 7.2.4 | Bundler moderno con HMR instantáneo |
| **Routing Web** | React Router | 7.9.6 | Navegación SPA con rutas protegidas |
| **Estado Global** | Zustand | 5.0.8 | Store minimalista sin boilerplate |
| **Datos Servidor** | TanStack Query | 5.90.11 | Cache, refetch, optimistic updates |
| **Mapas** | Leaflet + react-leaflet | 1.9.4 / 5.0.0 | Mapas interactivos con OpenStreetMap |
| **Gráficas** | Recharts | 3.7.0 | Dashboards con SVG nativo en React |
| **Formularios** | react-hook-form | 7.71.1 | Manejo eficiente con validación |
| **CSS** | Tailwind CSS | 3.4.18 | Utility-first, dark mode, diseño responsivo |
| **Mobile Framework** | React Native | 0.81.5 | Una base de código para iOS y Android |
| **Mobile Platform** | Expo SDK | 54.0.33 | Acceso a APIs nativas simplificado |
| **SQLite Local** | expo-sqlite | 16.0.10 | Base de datos local para offline-first |
| **GPS** | expo-location | — | Coordenadas para georeferenciación |
| **Cámara** | expo-camera | — | Captura de fotos en campo |
| **Proxy** | Nginx | Latest | Reverse proxy, SSL, archivos estáticos |
| **Contenedores** | Docker + Compose | 24+ | Entorno reproducible local y producción |

### 4.2 Justificación de Decisiones de Diseño

#### ¿Por qué TypeScript en todo el stack?
TypeScript permite detectar errores en tiempo de compilación en lugar de en producción. Con un sistema que maneja datos críticos de emergencias, la robustez tipada reduce incidentes por errores de tipo (por ejemplo, pasar `string` donde se espera `number` en coordenadas GPS).

#### ¿Por qué PostgreSQL sobre otras opciones?
- **PostGIS**: Soporte nativo de tipos geoespaciales (`POINT`, `GEOMETRY`) para almacenar coordenadas de incidentes y calcular distancias.
- **JSONB**: Columnas semiestructuradas (`datos` en `actividad`, `tripulacion` en `salida_unidad`) para datos variables por tipo de situación.
- **Triggers y Vistas**: La tabla `situacion_actual` se mantiene actualizada automáticamente mediante triggers, permitiendo consultas O(1) sobre el estado actual de cada unidad.

#### ¿Por qué Redis?
- Refresh tokens con expiración automática (TTL de 7 días).
- Caché de endpoints frecuentes para reducir carga en PostgreSQL.
- Pub/Sub como bus de eventos entre procesos de Node.js en caso de escalamiento horizontal.

#### ¿Por qué Socket.io sobre WebSockets nativos?
Socket.io provee:
- Reconexión automática con backoff exponencial.
- Fallback a HTTP long-polling cuando WebSockets no están disponibles.
- Rooms (salas) para mensajería dirigida por rol/sede sin lógica personalizada.
- Soporte nativo para clústeres con adaptadores Redis.

---

## 5. Módulo Backend — API REST

### 5.1 Estructura de Directorios

```
backend/src/
├── config/
│   ├── database.ts       # Conexión pg-promise (LOCAL o DATABASE_URL)
│   ├── env.ts            # Validación de variables de entorno
│   └── redis.ts          # Cliente IORedis
├── controllers/          # 40 controladores (lógica de negocio)
├── models/               # 30 modelos (queries SQL encapsuladas)
├── routes/               # 43 archivos de rutas + index.ts
├── middlewares/
│   ├── auth.ts           # authenticate() y authorize()
│   ├── subRolCop.ts      # Restricciones de sub-rol COP
│   └── idempotency.ts    # Prevención de duplicados
├── services/
│   ├── socket.service.ts         # Socket.io y eventos
│   ├── pushNotification.service.ts # Firebase FCM
│   ├── reportes.service.ts       # Generación PDF
│   ├── dashboard.service.ts      # Métricas agregadas
│   └── alertas.service.ts        # Evaluación de reglas de alerta
└── utils/
    ├── jwt.ts            # Generación y verificación de tokens
    └── validators.ts     # Esquemas de validación Zod
```

### 5.2 Convención de Modelos

Los modelos en PROVIAL no son clases ORM sino **objetos exportados con métodos async** que encapsulan queries SQL:

```typescript
// Patrón aplicado en todos los modelos
export const SituacionModel = {
  async getById(id: number): Promise<Situacion | null> {
    return db.oneOrNone(
      `SELECT s.*, u.codigo AS unidad_codigo
       FROM situacion s
       JOIN unidad u ON s.unidad_id = u.id
       WHERE s.id = $1`,
      [id]
    );
  },

  async create(data: CrearSituacionDTO): Promise<Situacion> {
    return db.one(
      `INSERT INTO situacion (tipo_situacion, km, latitud, longitud, ...)
       VALUES ($/tipo_situacion/, $/km/, $/latitud/, $/longitud/, ...)
       RETURNING *`,
      data  // pg-promise named params con $/nombre/
    );
  },

  async getUltimaPorUnidad(unidadId: number) {
    // Consulta a tabla de cache O(1)
    return db.oneOrNone(
      `SELECT sa.*, cts.icono, cts.color, cts.nombre
       FROM situacion_actual sa
       LEFT JOIN catalogo_tipo_situacion cts ON sa.tipo_situacion_id = cts.id
       WHERE sa.unidad_id = $1`,
      [unidadId]
    );
  }
};
```

### 5.3 Rutas Registradas

```typescript
// backend/src/routes/index.ts — rutas principales
app.use('/api/auth',                authRoutes);
app.use('/api/situaciones',         situacionesRoutes);
app.use('/api/actividades',         actividadesRoutes);
app.use('/api/salidas',             salidaRoutes);
app.use('/api/ingresos',            ingresoRoutes);
app.use('/api/turnos',              turnosRoutes);
app.use('/api/brigadas',            brigadasRoutes);
app.use('/api/unidades',            unidadesRoutes);
app.use('/api/ubicacion-brigadas',  ubicacionRoutes);
app.use('/api/operaciones',         operacionesRoutes);
app.use('/api/inteligencia',        intelligenceRoutes);
app.use('/api/generador-turnos',    generadorTurnosRoutes);
app.use('/api/asignaciones',        asignacionesRoutes);
app.use('/api/reparaciones',        reparacionesRoutes);
app.use('/api/multimedia',          multimediaRoutes);
app.use('/api/notificaciones',      notificacionesRoutes);
app.use('/api/reportes',            reportesRoutes);
app.use('/api/dashboard',           dashboardRoutes);
app.use('/api/alertas',             alertasRoutes);
app.use('/api/accidentologia',      accidentologiaRoutes);
app.use('/api/comunicacion-social', comunicacionRoutes);
app.use('/api/estadisticas',        estadisticasRoutes);
app.use('/api/capas-mapa',          capasMapaRoutes);
app.use('/api/dispositivos',        dispositivosRoutes);
app.use('/api/cloudinary',          cloudinaryRoutes);
app.use('/api/drafts',              draftsRoutes);
app.use('/api/admin',               adminRoutes);
```

### 5.4 Middleware de Autenticación

```typescript
// middlewares/auth.ts
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  const payload = verifyAccessToken(token);
  if (!payload) return res.status(401).json({ error: 'Token inválido' });

  req.user = payload; // { userId, rol, sedeId, subRolCop }
  next();
};

export const authorize = (...roles: string[]) => {
  return (req, res, next) => {
    if (req.user.rol === 'SUPER_ADMIN') return next(); // bypass total
    if (!roles.includes(req.user.rol))
      return res.status(403).json({ error: 'Sin permisos' });
    next();
  };
};
```

### 5.5 Middleware de Idempotencia

Previene duplicados cuando el cliente reintenta una petición (por pérdida de conexión):

```typescript
// middlewares/idempotency.ts
export const idempotencyCheck = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) return next();

  const cached = await db.oneOrNone(
    `SELECT response_json, response_status FROM idempotency_keys
     WHERE key = $1 AND expires_at > NOW()`,
    [key]
  );

  if (cached) {
    // Retornar respuesta guardada sin re-ejecutar
    return res.status(cached.response_status).json(cached.response_json);
  }

  // Interceptar la respuesta para cachearla
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    db.none(
      `INSERT INTO idempotency_keys (key, response_status, response_json, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')`,
      [key, res.statusCode, JSON.stringify(data)]
    ).catch(console.error);
    return originalJson(data);
  };
  next();
};
```

---

## 6. Módulo Web — Panel de Control

### 6.1 Arquitectura de la SPA

```
web/src/
├── App.tsx              # Router con rutas protegidas por rol
├── pages/               # 20+ páginas organizadas por módulo
│   ├── COPMapaPage.tsx
│   ├── COPBitacoraPage.tsx
│   ├── transportes/
│   │   ├── CombustiblePage.tsx
│   │   ├── FlotaAnalyticsPage.tsx
│   │   └── Inspecciones360Page.tsx
│   └── ...
├── components/
│   ├── forms/           # Modales y formularios dinámicos
│   └── ...
├── services/
│   ├── api.ts           # Instancia Axios + interceptores JWT
│   └── *.service.ts     # Servicios por dominio
├── store/
│   ├── authStore.ts     # Zustand: JWT, usuario, rol
│   └── themeStore.ts    # Zustand: modo oscuro/claro
└── hooks/
    └── useSocket.ts     # Hook para WebSocket del COP
```

### 6.2 Gestión de Estado

**Zustand** para estado global (autenticación y tema):

```typescript
// store/authStore.ts
interface AuthState {
  token: string | null;
  user: { id: number; nombre: string; rol: string; sedeId: number } | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'provial-auth' } // Persistido en localStorage
  )
);
```

**TanStack Query** para estado del servidor:

```typescript
// Datos en tiempo real con invalidación automática
const { data: resumenUnidades = [] } = useQuery({
  queryKey: ['resumen-unidades'],
  queryFn: () => situacionesAPI.getResumenUnidades(),
  refetchInterval: socketConnected ? false : 30000, // Polling si no hay WS
  staleTime: 10_000,
});

const crearSituacionMutation = useMutation({
  mutationFn: (data) => situacionesAPI.crear(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resumen-unidades'] });
  },
});
```

### 6.3 Módulo COP — Centro de Operaciones

El mapa del COP es el componente más complejo del panel web. Integra:

- **Mapa Leaflet** con tiles de OpenStreetMap
- **Marcadores SVG dinámicos** por estado de unidad (color e icono del catálogo)
- **Popups** con detalle de situación, fotos y bitácora
- **Sidebar colapsable** con lista de unidades y estadísticas en vivo
- **Mapa de calor** de incidentes históricos (leaflet.heat)
- **Capas de POIs** personalizables por el operador
- **Buscador geográfico** via Nominatim (OpenStreetMap geocoding)
- **Coordenadas de clic** para georreferenciación manual

```typescript
// Iconos SVG generados dinámicamente según estado
const createCustomIcon = (color: string, emoji: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="46">
      <path fill="${color}" d="M16 1C7.7 1 1 7.7 1 16c0 10.5 15 29 15 29s15-18.5 15-29"/>
      <circle cx="16" cy="16" r="10" fill="#fff" fill-opacity="0.9"/>
      <text x="16" y="21" text-anchor="middle" font-size="13">${emoji}</text>
    </svg>`;
  return new Icon({ iconUrl: `data:image/svg+xml,${encodeURIComponent(svg)}` });
};
// Color = color del tipo de situación (del catálogo)
// Emoji = icono MDI mapeado a emoji Unicode
```

### 6.4 Módulo de Analytics (Transportes)

`FlotaAnalyticsPage.tsx` implementa dashboards con Recharts:

```typescript
// Gráfica de barras: Top 10 unidades por turnos
<BarChart data={estadisticas.slice(0, 10)}>
  <XAxis dataKey="unidad_codigo" />
  <YAxis />
  <Bar dataKey="turnos_ultimo_mes" fill="#3B82F6" />
</BarChart>

// Gráfica de área: Tendencia de combustible (30 días)
<AreaChart data={tendenciaCombustible}>
  <defs>
    <linearGradient id="grad">
      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
    </linearGradient>
  </defs>
  <Area type="monotone" dataKey="promedio_combustible" fill="url(#grad)" />
</AreaChart>
```

### 6.5 Formularios Dinámicos

Los formularios se renderizan según el tipo de situación seleccionado:

```typescript
function DynamicFormFields({ formularioTipo, control, errors }) {
  switch (formularioTipo) {
    case 'INCIDENTE':          return <IncidenteFields control={control} />;
    case 'ASISTENCIA_VEHICULAR': return <AsistenciaFields control={control} />;
    case 'EMERGENCIA':         return <EmergenciaFields control={control} />;
    case 'ACTIVIDAD':
    case 'NOVEDAD':            return <ActividadFields control={control} />;
    default:                   return null;
  }
}
```

---

## 7. Módulo Móvil — App de Campo

### 7.1 Arquitectura de Navegación

```typescript
// AppNavigator.tsx — Navegación basada en rol
function AppNavigator() {
  const { user } = useAuthStore();
  if (!user) return <AuthStack />;
  switch (user.rol) {
    case 'BRIGADA': return <BrigadaDrawer />;
    case 'COP':     return <COPStack />;
    default:        return <AdminStack />;
  }
}

// BrigadaDrawer — Pantallas del brigadista
const BrigadaDrawer = () => (
  <Drawer.Navigator>
    <Drawer.Screen name="Home"           component={BrigadaHomeScreen} />
    <Drawer.Screen name="NuevaSituacion" component={NuevaSituacionScreen} />
    <Drawer.Screen name="Bitacora"       component={BitacoraScreen} />
    <Drawer.Screen name="Combustible"    component={RegistroCombustibleScreen} />
    <Drawer.Screen name="Inspeccion360"  component={Inspeccion360Screen} />
    <Drawer.Screen name="Relevo"         component={RelevoScreen} />
  </Drawer.Navigator>
);
```

### 7.2 Pantallas Principales

#### BrigadaHomeScreen
- Estado actual de la unidad asignada (en patrullaje / en sede)
- Botón principal contextual: "Iniciar Salida" o "Reportar Situación" según estado
- Última actividad registrada e indicadores de combustible y kilómetros

#### NuevaSituacionScreen
- Selector de tipo de situación desde catálogo local (SQLite)
- Formulario dinámico según tipo seleccionado
- Captura de fotos para todas las situaciones excepto "baño"
- GPS automático al abrir la pantalla
- Soporte offline: guarda como draft local si no hay conexión

#### IniciarSalidaScreen
- Registro de combustible inicial (fracción: LLENO, 3/4, 1/2, 1/4, VACÍO)
- Registro de kilómetros iniciales
- Confirmación de tripulación (PILOTO, COPILOTO, ACOMPAÑANTE)
- Selección de ruta asignada

#### Inspeccion360Screen
- Lista de verificación de 30+ puntos de inspección vehicular
- Registro fotográfico por punto de falla
- Firma digital del inspector (`react-native-signature-canvas`)
- Generación de reporte PDF

### 7.3 Store Móvil (Zustand)

```typescript
interface AuthState {
  token: string | null;
  user: Usuario | null;
  asignacionActual: AsignacionActual | null;  // Unidad + rol asignado hoy
  salidaActiva: SalidaActiva | null;          // Salida en curso
  ingresoActivo: IngresoActivo | null;        // Retorno a sede en curso
  miSede: MiSede | null;                      // Sede base del brigadista
}

interface AsignacionActual {
  asignacion_id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  mi_rol: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE';
  sede_id: number;
}

interface SalidaActiva {
  salida_id: number;
  fecha_hora_salida: string;
  km_inicial: number;
  combustible_inicial: number;
  ruta_inicial_id: number | null;
}
```

### 7.4 Almacenamiento Local (expo-sqlite)

```typescript
// CatalogoStorage — Singleton para catálogos offline
class CatalogoStorage {
  async init() {
    this.db = await SQLite.openDatabaseAsync('provial.db');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS tipos_situacion (
        id INTEGER PRIMARY KEY,
        nombre TEXT NOT NULL,
        categoria TEXT NOT NULL,
        icono TEXT,
        color TEXT,
        formulario_tipo TEXT
      );
      CREATE TABLE IF NOT EXISTS situation_drafts (
        id TEXT PRIMARY KEY,             -- UUID local
        payload TEXT NOT NULL,           -- JSON del formulario
        estado TEXT DEFAULT 'PENDIENTE', -- PENDIENTE/SINCRONIZADO/ERROR
        created_at TEXT,
        intentos INTEGER DEFAULT 0
      );
    `);
  }

  async syncCatalogos(token: string) {
    const data = await fetch('/api/situaciones/auxiliares', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());

    await this.db.runAsync('BEGIN TRANSACTION');
    for (const tipo of data.tipos) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO tipos_situacion VALUES (?,?,?,?,?,?)`,
        [tipo.id, tipo.nombre, tipo.categoria, tipo.icono, tipo.color, tipo.formulario_tipo]
      );
    }
    await this.db.runAsync('COMMIT');
  }
}
```

---

## 8. Base de Datos

### 8.1 Modelo Entidad-Relación (Principales)

```
USUARIO ──────── BRIGADA_UNIDAD ──────── UNIDAD
   │                                        │
   │                                    SALIDA_UNIDAD
   │                                        │
   └──── SITUACION ──────────────────────────┘
              │
              ├── SITUACION_VEHICULO ── VEHICULO
              │         │
              │    PERSONA_ACCIDENTE
              │
              ├── SITUACION_MULTIMEDIA
              ├── SITUACION_CAUSA ── CAUSA_HECHO_TRANSITO
              └── SITUACION_VEHICULO_DISPOSITIVO

SITUACION_ACTUAL (cache) ──────────── UNIDAD (1:1)
ACTIVIDAD ─────────────────────────── SALIDA_UNIDAD
```

### 8.2 Tabla `situacion` — Estructura

La tabla más crítica del sistema, con ~65 columnas:

```sql
CREATE TABLE situacion (
  -- Identificadores
  id                    SERIAL PRIMARY KEY,
  draft_uuid            UUID UNIQUE,
  salida_unidad_id      INTEGER REFERENCES salida_unidad(id),
  unidad_id             INTEGER REFERENCES unidad(id),
  tipo_situacion_id     INTEGER REFERENCES catalogo_tipo_situacion(id),
  tipo_situacion        VARCHAR(50),

  -- Ubicación geográfica
  latitud               DECIMAL(10, 7),
  longitud              DECIMAL(10, 7),
  ruta_id               INTEGER REFERENCES ruta(id),
  km                    DECIMAL(8, 2),
  sentido               VARCHAR(20),
  departamento_id       INTEGER REFERENCES departamento(id),
  municipio_id          INTEGER REFERENCES municipio(id),

  -- Estado
  estado                VARCHAR(20) DEFAULT 'ACTIVA', -- ACTIVA, CERRADA, CANCELADA

  -- Condiciones del entorno
  clima                 VARCHAR(50),
  visibilidad           VARCHAR(50),
  carga_vehicular       VARCHAR(50),
  iluminacion           VARCHAR(50),
  senalizacion          VARCHAR(50),

  -- Condiciones de la vía
  via_estado            VARCHAR(50),
  via_topografia        VARCHAR(50),
  via_geometria         VARCHAR(50),
  tipo_pavimento        VARCHAR(50),

  -- Víctimas
  fallecidos            INTEGER DEFAULT 0,
  heridos               INTEGER DEFAULT 0,
  heridos_leves         INTEGER DEFAULT 0,
  heridos_graves        INTEGER DEFAULT 0,
  ilesos                INTEGER DEFAULT 0,
  trasladados           INTEGER DEFAULT 0,
  fugados               INTEGER DEFAULT 0,

  -- Datos de acuerdo y resolución
  acuerdo_involucrados  BOOLEAN,
  acuerdo_detalle       TEXT,
  obstruccion_data      JSONB,

  -- Auditoría
  observaciones         TEXT,
  cerrado_by            INTEGER REFERENCES usuario(id),
  cerrado_at            TIMESTAMPTZ,
  created_by            INTEGER REFERENCES usuario(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.3 Tabla `situacion_actual` — Cache O(1)

Optimización crítica: mantiene una fila por unidad con su estado actual, evitando consultas costosas sobre millones de registros históricos.

```sql
CREATE TABLE situacion_actual (
  unidad_id           INTEGER PRIMARY KEY REFERENCES unidad(id),
  situacion_id        INTEGER REFERENCES situacion(id),
  actividad_id        INTEGER REFERENCES actividad(id),
  tipo_registro       VARCHAR(20),    -- 'SITUACION' o 'ACTIVIDAD'
  tipo_situacion      VARCHAR(50),
  estado              VARCHAR(20),
  latitud             DECIMAL(10, 7),
  longitud            DECIMAL(10, 7),
  km                  DECIMAL(8, 2),
  sentido             VARCHAR(20),
  ruta_codigo         VARCHAR(20),
  icono               VARCHAR(50),    -- Del catálogo
  color               VARCHAR(7),     -- Hex color del catálogo
  nombre_tipo         VARCHAR(100),
  sa_updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

**Trigger que mantiene el cache actualizado automáticamente**:

```sql
CREATE OR REPLACE FUNCTION fn_actualizar_situacion_actual_actividad()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO situacion_actual (unidad_id, actividad_id, tipo_registro, ...)
  VALUES (NEW.unidad_id, NEW.id, 'ACTIVIDAD', ...)
  ON CONFLICT (unidad_id) DO UPDATE SET
    actividad_id  = EXCLUDED.actividad_id,
    tipo_registro = 'ACTIVIDAD',
    sa_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_situacion_actual_actividad
AFTER INSERT OR UPDATE ON actividad
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_situacion_actual_actividad();
```

### 8.4 Tabla `actividad` — Operaciones con JSONB

```sql
CREATE TABLE actividad (
  id                  SERIAL PRIMARY KEY,
  codigo_actividad    VARCHAR(50) UNIQUE,  -- ID determinístico para deduplicación
  tipo_actividad_id   INTEGER REFERENCES catalogo_tipo_situacion(id),
  unidad_id           INTEGER REFERENCES unidad(id),
  salida_unidad_id    INTEGER REFERENCES salida_unidad(id),
  creado_por          INTEGER REFERENCES usuario(id),
  ruta_id             INTEGER REFERENCES ruta(id),
  latitud             DECIMAL(10, 7),
  longitud            DECIMAL(10, 7),
  km                  DECIMAL(8, 2),
  sentido             VARCHAR(20),
  estado              VARCHAR(20) DEFAULT 'ACTIVA',
  observaciones       TEXT,
  datos               JSONB,              -- Datos variables por tipo
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  closed_at           TIMESTAMPTZ
);
```

El campo `datos` JSONB permite almacenar información específica por tipo sin alterar el esquema:

```json
// Actividad tipo OPERATIVO (conteo vehicular)
{ "vehiculos_livianos": 245, "motocicletas": 87, "camiones": 34 }

// Actividad tipo VELOCIDAD
{ "velocidad_maxima": 95, "promedio": 72, "infractores": 3 }
```

### 8.5 Sistema de Migraciones (128 archivos)

```
001_create_extensions.sql       → PostGIS, UUID generation
002_create_usuario.sql          → Tabla de usuarios y roles
...
029_offline_drafts.sql          → Sistema offline-first (drafts, idempotency)
...
108_unify_catalogo.sql          → Unificación de catálogos en una sola tabla
115_dispositivo_seguridad.sql   → Dispositivos de seguridad vehicular
116_causa_hecho_transito.sql    → Catálogo de causas de accidentes
121_actividad_table.sql         → Tabla de actividades operativas
123_municipios_fix.sql          → Corrección de tildes en municipios GT
125_combustible_niveles.sql     → Niveles de combustible estandarizados
127_v_estadisticas_unidades.sql → Vista de estadísticas por unidad
128_unidad_reparacion.sql       → Tabla de reparaciones de flota
```

---

## 9. Seguridad y Autenticación

### 9.1 Flujo JWT con Refresh Tokens

```
Cliente                    Backend                      Redis
  │                           │                           │
  │── POST /api/auth/login ──►│                           │
  │   { username, password }  │                           │
  │                           │ bcrypt.compare()          │
  │                           │ generateAccessToken()     │ (24h)
  │                           │ generateRefreshToken()    │ (7d)
  │                           │ SETEX refreshToken 7d ───►│
  │◄── { accessToken,         │                           │
  │      refreshToken, user } │                           │
  │                           │                           │
  │── Peticiones con ─────────►                           │
  │   Authorization: Bearer   │ verifyAccessToken()       │
  │   <accessToken>           │ (valida firma JWT local)  │
  │◄── respuesta ─────────────│                           │
  │                           │                           │
  │── POST /api/auth/refresh ─►                           │
  │   { refreshToken }        │ GET refreshToken ────────►│
  │                           │◄─────────────────────────│
  │◄── { accessToken nuevo } ─│                           │
```

### 9.2 Roles del Sistema

| Rol | Web | Móvil | Descripción |
|-----|-----|-------|-------------|
| `SUPER_ADMIN` | Todo | No | Administración total |
| `ADMIN` | Todo | No | Gestión operativa completa |
| `COP` | Panel COP | No | Monitoreo y coordinación en tiempo real |
| `OPERACIONES` | Módulo operaciones | No | Turnos, brigadas, salidas |
| `TRANSPORTES` | Módulo transportes | No | Flotilla, combustible, mantenimiento |
| `MANDOS` | Dashboard ejecutivo | No | Solo lectura analítica |
| `ACCIDENTOLOGIA` | Módulo accidentología | No | Investigación de accidentes |
| `COMUNICACION_SOCIAL` | Módulo comunicación | No | Gestión de medios |
| `BRIGADA` | No | Sí | Reportes de campo |
| `ENCARGADO_SEDE` | Operaciones sede | No | Gestión de sede específica |

### 9.3 Sub-roles COP Granulares

```sql
CREATE TABLE sub_rol_cop (
  id                          SERIAL PRIMARY KEY,
  codigo                      VARCHAR(50) UNIQUE,
  nombre                      VARCHAR(100),
  puede_crear_persistentes    BOOLEAN DEFAULT FALSE,
  puede_cerrar_persistentes   BOOLEAN DEFAULT FALSE,
  puede_promover_situaciones  BOOLEAN DEFAULT FALSE,
  puede_asignar_unidades      BOOLEAN DEFAULT FALSE,
  solo_lectura                BOOLEAN DEFAULT FALSE
);
-- Ejemplos: COORDINADOR, DESPACHADOR, SUPERVISOR, CONSULTA
```

### 9.4 Autorización de Dispositivos Móviles

Control opcional para restringir qué dispositivos pueden acceder a la app:

```sql
CREATE TABLE dispositivo_autorizado (
  device_id    VARCHAR(200) UNIQUE,   -- UUID del dispositivo
  device_model VARCHAR(100),
  device_os    VARCHAR(20),
  app_version  VARCHAR(20),
  estado       VARCHAR(20) DEFAULT 'PENDIENTE', -- ACTIVO, BLOQUEADO, PENDIENTE
  usuario_id   INTEGER REFERENCES usuario(id)
);
```

Activado con la variable de entorno `DEVICE_AUTH_ENABLED=true`.

---

## 10. Comunicación en Tiempo Real

### 10.1 Arquitectura Socket.io

```typescript
// services/socket.service.ts
export const initializeSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: { origin: FRONTEND_URL },
    transports: ['websocket', 'polling'] // fallback automático
  });

  // Autenticación en el handshake WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const payload = verifyAccessToken(token);
    if (!payload) return next(new Error('No autorizado'));
    socket.data.user = payload;
    next();
  });

  io.on('connection', (socket) => {
    const { rol, sedeId } = socket.data.user;
    socket.join('dashboard');
    if (sedeId) socket.join(`sede:${sedeId}`);
    if (rol === 'COP') socket.join('cop');
  });

  return io;
};
```

### 10.2 Eventos del Sistema

| Evento | Dirección | Descripción |
|--------|----------|-------------|
| `incidente:nuevo` | Server→Client | Nueva situación creada |
| `incidente:actualizado` | Server→Client | Situación modificada |
| `incidente:cerrado` | Server→Client | Situación cerrada |
| `unidad:cambio_estado` | Server→Client | Salida/retorno de unidad |
| `actividad:nueva` | Server→Client | Nueva actividad iniciada |
| `dashboard:actualizar` | Server→Client | Métricas actualizadas |

### 10.3 Cliente WebSocket (Web)

```typescript
// hooks/useSocket.ts
export const useDashboardSocket = (queryClient: QueryClient) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const socket = io(API_URL, {
      auth: { token: useAuthStore.getState().token },
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('unidad:cambio_estado', () => {
      queryClient.invalidateQueries({ queryKey: ['resumen-unidades'] });
      setLastUpdate(new Date());
    });

    socket.on('incidente:nuevo', () => {
      queryClient.invalidateQueries({ queryKey: ['situaciones'] });
    });

    return () => socket.disconnect();
  }, [queryClient]);

  return { isConnected, lastUpdate };
};
```

---

## 11. Arquitectura Offline-First

### 11.1 Problema de Conectividad en Campo

Las brigadas operan en carreteras de Guatemala donde la cobertura celular es irregular. El sistema debe funcionar sin conexión y sincronizar cuando hay red disponible.

### 11.2 Flujo de Sincronización

```
MÓVIL (SQLite)                    BACKEND (PostgreSQL + Redis)
      │                                   │
      │ [SIN CONEXIÓN]                    │
      │                                   │
      │ 1. Usuario crea situación         │
      │ 2. Genera UUID (draft_id)         │
      │ 3. Guarda payload JSON en SQLite  │
      │ 4. estado = 'PENDIENTE'           │
      │                                   │
      │ [RECUPERA CONEXIÓN]               │
      │                                   │
      │── POST /api/drafts ──────────────►│
      │   Idempotency-Key: <draft_id>     │ 1. Verifica idempotency_key
      │   Body: { payload, draft_uuid }   │ 2. Si ya existe → retorna cacheado
      │                                   │ 3. Si no → procesa:
      │                                   │    INSERT INTO situacion
      │                                   │    INSERT INTO situacion_multimedia
      │                                   │    UPSERT vehiculo, piloto
      │                                   │    INSERT INTO idempotency_keys
      │◄── { success, situacion_id } ─────│
      │                                   │
      │ UPDATE situation_drafts           │
      │ SET estado = 'SINCRONIZADO'       │
```

### 11.3 Deduplicación con IDs Determinísticos

Para actividades, el `codigo_actividad` determinístico previene duplicados sin depender de la red:

```typescript
const codigoActividad = `ACT-${unidad_id}-${tipo_id}-${Math.floor(Date.now() / 60000)}`;

await db.oneOrNone(
  `INSERT INTO actividad (codigo_actividad, ...)
   VALUES ($1, ...)
   ON CONFLICT (codigo_actividad) DO NOTHING
   RETURNING *`,
  [codigoActividad, ...]
);
```

### 11.4 Snapshot de Tripulación (JSONB)

Al registrar una salida, la tripulación completa se guarda como snapshot:

```json
// salida_unidad.tripulacion — estado exacto al momento de salir
[
  { "brigada_id": 45, "nombre": "Carlos López", "rol": "PILOTO", "chapa": "1234" },
  { "brigada_id": 67, "nombre": "Ana García", "rol": "COPILOTO", "chapa": "5678" }
]
```

Esto preserva la información forense de quién estaba en cada unidad en cada momento, aunque las asignaciones cambien posteriormente.

---

## 12. Módulos de Negocio

### 12.1 Ciclo de Vida de una Unidad (Día Tipo)

```
06:00 AM — Brigadista inicia turno
    → App: IniciarSalidaScreen
    → POST /api/salidas/iniciar { km_inicial, combustible, tripulacion }
    → INSERT salida_unidad (estado=EN_SALIDA)
    → Socket: emit 'unidad:cambio_estado'

Durante el día — Brigadista reporta
    → POST /api/situaciones/crear
    → POST /api/actividades/crear
    → UPSERT situacion_actual (trigger automático)
    → Socket: emit 'incidente:nuevo' / 'actividad:nueva'

06:00 PM — Brigadista regresa a sede
    → App: IngresoSedeScreen
    → POST /api/ingresos { km_ingreso, combustible_ingreso }
    → INSERT ingreso_sede

    → App: FinalizarDiaScreen
    → PUT /api/salidas/:id/finalizar { km_final, combustible_final }
    → UPDATE salida_unidad (estado=FINALIZADA)
    → UPDATE situacion_actual (limpiar estado)
```

### 12.2 Gestión de Situaciones Persistentes

Situaciones que permanecen activas por días o semanas (deslizamientos, puentes dañados, obras):

- Solo el sub-rol `COORDINADOR` o `DESPACHADOR` con `puede_crear_persistentes=true` puede crearlas
- Aparecen en el mapa COP con icono de alerta roja hasta que el coordinador las cierre
- Se vinculan a unidades asignadas a cubrir esa zona

### 12.3 Módulo Transportes

**Control de Combustible**:
```
Cada cambio genera un nuevo registro (no se sobreescribe el anterior)
Tipos: AJUSTE (Transportes), INICIAL / RECARGA / FINAL (Brigadas)
Niveles: LLENO (1.0), 3/4 (0.75), 1/2 (0.5), 1/4 (0.25), VACÍO (0.0)
```

**Reparaciones de Flota**:
```sql
CREATE TABLE unidad_reparacion (
  id            SERIAL PRIMARY KEY,
  unidad_id     INTEGER REFERENCES unidad(id),
  motivo        VARCHAR(200) NOT NULL,
  fecha_inicio  DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin     DATE,
  estado        VARCHAR(20) DEFAULT 'EN_REPARACION',
              -- EN_REPARACION, COMPLETADA, CANCELADA
  registrado_por INTEGER REFERENCES usuario(id)
);
-- Una unidad solo puede tener UNA reparación activa simultánea
```

### 12.4 Generador Automático de Turnos

```typescript
POST /api/generador-turnos/generar
{
  sede_id: 1,
  fecha_inicio: '2024-11-01',
  dias: 7,
  respetar_grupos: true,
  incluir_fines_semana: true
}
// Algoritmo:
// 1. Obtener brigadas disponibles de la sede
// 2. Obtener unidades activas
// 3. Aplicar restricciones (grupos, roles, días de descanso)
// 4. Generar asignaciones para N días
```

### 12.5 Accidentología

Módulo de investigación formal de accidentes siguiendo el formato oficial guatemalteco:

```typescript
POST /api/accidentologia
{
  situacion_id: 123,
  tipo_via: 'NACIONAL',
  velocidad_permitida: 80,
  velocidad_estimada_involucrados: [95, 70],
  factores_contribuyentes: ['EXCESO_VELOCIDAD', 'ESTADO_VIA'],
  tipo_colision: 'FRONTAL_LATERAL',
  testigos: [{ nombre, dpi, telefono }],
  circunstancias: 'Descripción de la investigación...'
}
```

---

## 13. Infraestructura y Despliegue

### 13.1 Entorno de Desarrollo (Docker Compose)

```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: provial_db
      LANG: es_GT.UTF-8      # Soporte de caracteres españoles
    ports: ["5433:5432"]

  redis:
    image: redis:7-alpine
    command: >
      redis-server
        --maxmemory 256mb
        --maxmemory-policy allkeys-lru
        --appendonly yes      # Persistencia AOF

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    ports: ["3000:3000"]
```

### 13.2 Topología de Producción

```
Internet
   │
   ▼
┌──────────────────────────────────────┐
│              Railway.app             │
│                                      │
│  ┌─────────────┐  ┌────────────────┐ │
│  │Backend Node │  │ PostgreSQL 16  │ │
│  │+ Socket.io  │  │  (Railway DB)  │ │
│  └─────────────┘  └────────────────┘ │
│  ┌─────────────┐                     │
│  │   Redis 7   │                     │
│  │(Railway DB) │                     │
│  └─────────────┘                     │
└──────────────────────────────────────┘
         │
         ▼
┌────────────────────────┐     ┌────────────────────┐
│        Vercel          │     │   Cloudinary CDN   │
│  Panel Web (React SPA) │     │  Fotos incidentes  │
└────────────────────────┘     └────────────────────┘
         │
         ▼
┌────────────────────────┐
│    Firebase Cloud      │
│    Messaging (FCM)     │
│  Push notifications    │
└────────────────────────┘
```

### 13.3 Variables de Entorno de Producción

```bash
DATABASE_URL=postgresql://user:pass@host:5432/provial_db
REDIS_URL=redis://default:pass@host:6379
JWT_SECRET=<256-bit-random-string>
CLOUDINARY_CLOUD_NAME=provial
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
FIREBASE_PROJECT_ID=provial-gt
FIREBASE_PRIVATE_KEY=<private-key>
DEVICE_AUTH_ENABLED=true
NODE_ENV=production
PORT=3000
```

---

## 14. Patrones de Diseño Aplicados

### 14.1 Repository Pattern

Los modelos encapsulan todo el acceso a datos. Los controladores nunca escriben SQL directamente, siempre llaman métodos del modelo. Esto facilita el testing y el mantenimiento.

### 14.2 Cache-Aside (situacion_actual)

La tabla `situacion_actual` actúa como caché a nivel de base de datos. El COP consulta el estado de todas las unidades en O(1) sin necesidad de MAX(created_at) sobre millones de registros. Los triggers mantienen el caché consistente automáticamente.

### 14.3 Idempotency Pattern

Cada petición crítica puede incluir un `Idempotency-Key`. El backend guarda la respuesta por 24 horas. Si el cliente reintenta la misma operación, obtiene la respuesta original sin duplicar el efecto en la base de datos.

### 14.4 Snapshot Pattern

La tripulación se guarda como snapshot JSONB al momento de la salida. Esto preserva el estado histórico exacto aunque las asignaciones cambien posteriormente.

### 14.5 Upsert Pattern (vehículos y pilotos)

```sql
-- Vehículos y pilotos se reutilizan entre incidentes
INSERT INTO vehiculo (placa, marca, modelo)
VALUES ($1, $2, $3)
ON CONFLICT (placa) DO UPDATE SET
  marca = EXCLUDED.marca,
  updated_at = NOW()
RETURNING id;
```

### 14.6 Event-Driven Updates

Cada mutación importante emite un evento Socket.io. Los clientes web actualizan su estado reactivamente invalidando el caché de TanStack Query, sin necesidad de polling continuo.

### 14.7 Offline-First con Cola Local

La app móvil funciona con una cola de drafts en SQLite con reintentos automáticos. Ningún reporte se pierde aunque el brigadista esté sin conexión durante horas.

---

## 15. Flujos Principales del Sistema

### 15.1 Reportar un Hecho de Tránsito (Brigada → COP)

```
1. Brigadista detecta accidente
2. Abre NuevaSituacionScreen → selecciona "Hecho de Tránsito"
3. GPS captura coordenadas automáticamente
4. Llena formulario dinámico:
   - Número de vehículos involucrados
   - Víctimas (heridos, fallecidos, ilesos)
   - Condiciones de la vía y entorno
5. Captura fotos de la escena
6. Presiona "Reportar"

   [Con conexión]
   POST /api/situaciones/crear (Idempotency-Key: <uuid>)
   → INSERT INTO situacion
   → UPSERT situacion_actual (trigger)
   → emit('incidente:nuevo')
   → COP actualiza mapa en tiempo real
   → Notificación push al supervisor

   [Sin conexión]
   → Guarda draft en SQLite
   → Al recuperar conexión → POST /api/drafts
   → Mismo resultado
```

### 15.2 Monitoreo desde COP

```
1. Operador abre COPMapaPage
2. WebSocket conecta → sala 'cop'
3. Mapa muestra todas las unidades con marcadores de color por sede
4. Recibe 'incidente:nuevo' → marcador rojo en mapa
5. Clic en marcador → popup: estado, fotos, tripulación, bitácora
6. Para situación persistente:
   - Crea registro con importancia ALTA/CRITICA
   - Aparece en mapa con alerta permanente
   - Solo COORDINADOR puede cerrarla
```

### 15.3 Cierre de Turno

```
1. Brigadista abre FinalizarDiaScreen
2. Ingresa km_final y combustible_final
3. Agrega observaciones del día
4. Sistema calcula km recorridos automáticamente
5. PUT /api/salidas/:id/finalizar
   → UPDATE salida_unidad (estado=FINALIZADA)
   → UPDATE situacion_actual (limpiar)
   → Socket: emit('unidad:cambio_estado')
6. COP ve la unidad como inactiva en el mapa
```

---

## 16. Métricas y Análisis de Datos

### 16.1 Dashboard Ejecutivo (MANDOS)

```json
GET /api/dashboard/ejecutivo
{
  "incidentes_semana": {
    "total": 47,
    "por_tipo": { "INCIDENTE": 12, "ASISTENCIA_VEHICULAR": 28, "EMERGENCIA": 7 }
  },
  "unidades_activas": 23,
  "km_patrullados_mes": 45820,
  "tiempo_respuesta_promedio_min": 8.3,
  "sedes_con_mas_incidentes": [
    { "sede": "Central", "count": 18 },
    { "sede": "Palín", "count": 14 }
  ]
}
```

### 16.2 Analytics de Flotilla

```json
GET /api/operaciones/estadisticas-unidades
{
  "estadisticas_unidades": [
    {
      "unidad_codigo": "GUA-001",
      "turnos_ultimo_mes": 22,
      "km_ultimo_mes": 3840,
      "promedio_combustible": 0.68,
      "en_reparacion": false
    }
  ]
}

GET /api/operaciones/combustible/tendencia?dias=30
[
  { "fecha": "2024-11-01", "promedio_combustible": 0.72, "num_registros": 18 },
  { "fecha": "2024-11-02", "promedio_combustible": 0.65, "num_registros": 21 }
]
```

### 16.3 Vista de Estadísticas (PostgreSQL)

```sql
CREATE VIEW v_estadisticas_unidades AS
SELECT
  u.id AS unidad_id,
  u.codigo AS unidad_codigo,
  u.tipo_unidad,
  u.sede_id,
  COUNT(DISTINCT su.id) FILTER (
    WHERE su.fecha_hora_salida >= CURRENT_DATE - INTERVAL '30 days'
  ) AS turnos_ultimo_mes,
  COALESCE(SUM(su.km_recorridos) FILTER (
    WHERE su.fecha_hora_salida >= CURRENT_DATE - INTERVAL '30 days'
  ), 0) AS km_ultimo_mes,
  AVG(cr.combustible_nuevo) FILTER (
    WHERE cr.created_at >= CURRENT_DATE - INTERVAL '7 days'
  ) AS promedio_combustible_semana
FROM unidad u
LEFT JOIN salida_unidad su ON u.id = su.unidad_id AND su.estado = 'FINALIZADA'
LEFT JOIN combustible_registro cr ON u.id = cr.unidad_id
GROUP BY u.id, u.codigo, u.tipo_unidad, u.sede_id;
```

### 16.4 Mapa de Calor de Incidentes

```typescript
// GET /api/situaciones/heatmap?dias=30
// Retorna puntos para visualización en leaflet.heat
{ "points": [ [14.6432, -90.5089, 0.8], [14.6201, -90.4950, 1.0] ] }

// HeatmapLayer.tsx
function HeatmapLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
    }).addTo(map);
    return () => map.removeLayer(layer);
  }, [points, map]);
  return null;
}
```

---

## 17. Conclusiones Técnicas

### 17.1 Innovaciones Técnicas Principales

**1. Offline-First con cola local persistente**
La arquitectura de drafts en SQLite garantiza continuidad operativa en zonas sin cobertura. Este es el problema más crítico en las carreteras de Guatemala, y se resuelve con una cola local + idempotencia en el servidor, lo que garantiza que ningún reporte se duplica ni se pierde.

**2. Caché O(1) mediante tabla con trigger**
La tabla `situacion_actual` mantenida por triggers PostgreSQL permite que el COP consulte el estado de todas las unidades de la flota con una sola query de una fila por unidad, independientemente de que haya millones de registros históricos en la tabla `situacion`.

**3. Formularios 100% configurables desde base de datos**
El catálogo `catalogo_tipo_situacion` con campo `formulario_tipo` permite agregar nuevos tipos de situación sin modificar código de frontend ni mobile. Solo se necesita un nuevo registro en la base de datos y el formulario aparece dinámicamente en ambas plataformas.

**4. Idempotencia garantizada**
El sistema de `idempotency_keys` elimina duplicados aunque el cliente reintente la misma petición múltiples veces, crítico para un sistema de emergencias donde un incidente duplicado puede causar despliegue erróneo de recursos.

**5. Snapshot de tripulación para trazabilidad forense**
Al capturar la tripulación como JSONB al inicio de cada salida, el sistema preserva exactamente quién estaba en cada unidad en cada momento, con valor probatorio en caso de investigaciones o litigios.

### 17.2 Decisiones de Arquitectura

| Decisión | Alternativa | Justificación |
|----------|-------------|---------------|
| pg-promise (SQL nativo) | Prisma / TypeORM | Control total de queries, sin overhead de ORM, optimización manual |
| Zustand sobre Redux | Redux Toolkit | Menos boilerplate, API simple, suficiente para el caso de uso |
| TanStack Query | SWR / Apollo | Cache automático y sincronización sin boilerplate manual |
| expo-sqlite sobre AsyncStorage | MongoDB Realm | Estructura relacional para catálogos con relaciones complejas |
| Socket.io sobre SSE | Server-Sent Events | Bidireccional, rooms nativas, mejor para casos de uso complejos |
| Monorepo sobre multi-repo | Repositorios separados | Tipos compartidos, un solo CI/CD, consistencia de versiones |

### 17.3 Escalabilidad del Sistema

El sistema está diseñado para escalar en dos etapas:

**Escalamiento vertical** (primera etapa): Mayor capacidad de CPU/RAM en Railway para el backend Node.js y PostgreSQL.

**Escalamiento horizontal** (segunda etapa):
- Socket.io con adaptador Redis permite múltiples instancias de Node.js compartiendo eventos WebSocket.
- PostgreSQL con réplicas de lectura para queries analíticas.
- Separación de responsabilidades: frontend en Vercel CDN global, backend en Railway, base de datos managed.

### 17.4 Resumen de Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Migraciones de base de datos | 128 |
| Tablas principales | ~45 |
| Controladores backend | 40 |
| Modelos backend | 30 |
| Grupos de rutas API | 43 |
| Páginas web | 20+ |
| Pantallas móviles | 17+ |
| Roles de usuario | 11 |
| Sub-roles COP | 4 |
| Versión React | 19.2.0 |
| Versión React Native | 0.81.5 / Expo SDK 54 |
| Versión Node.js | LTS 20+ |
| Versión PostgreSQL | 16 + PostGIS |
| Versión Redis | 7 |

---

*Documento técnico generado el 11 de marzo de 2026.*
*Sistema PROVIAL — República de Guatemala.*
