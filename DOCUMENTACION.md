# 📚 DOCUMENTACIÓN COMPLETA - Sistema PROVIAL

**Última actualización**: 9 de Enero, 2026  
**Versión**: 2.1.0  
**Estado**: ✅ Producción

---

## 📋 Índice

1. [Resumen del Sistema](#resumen-del-sistema)
2. [App Móvil - Pantallas](#app-móvil---pantallas)
3. [Panel Web - Páginas](#panel-web---páginas)
4. [API Backend - Rutas](#api-backend---rutas)
5. [Base de Datos - Tablas](#base-de-datos---tablas)
6. [Migraciones](#migraciones)
7. [Problemas Conocidos](#problemas-conocidos)
8. [Tareas Pendientes](#tareas-pendientes)

---

## Resumen del Sistema

PROVIAL es un sistema integral para la gestión de patrullaje vial en Guatemala, compuesto por:

| Componente | Tecnología | Descripción |
|------------|------------|-------------|
| **Mobile** | React Native (Expo) | App para brigadas de campo |
| **Web** | React + TypeScript | Panel administrativo |
| **Backend** | Node.js + Express | API REST |
| **Database** | PostgreSQL | Base de datos |
| **Deploy** | Railway | Producción en la nube |

### Roles del Sistema

| ID | Rol | Usuarios | Acceso |
|----|-----|----------|--------|
| 1 | ADMIN | 1 | Panel web completo |
| 2 | COP | 2 | Centro de Operaciones - universal |
| 3 | BRIGADA | 552 | App móvil únicamente |
| 4 | OPERACIONES | 2 | Gestión de asignaciones |
| 5 | ACCIDENTOLOGIA | 2 | Análisis de accidentes |
| 6 | MANDOS | 2 | Supervisión |
| 9 | ENCARGADO_NOMINAS | 2 | Liberación de asignaciones |
| 10 | SUPER_ADMIN | 1 | Acceso total |
| 11 | COMUNICACION_SOCIAL | 1 | Gestión de comunicados |

---

## App Móvil - Pantallas

### 📁 `mobile/src/screens/brigada/` (23 pantallas)

| Pantalla | Estado | Descripción |
|----------|--------|-------------|
| `BrigadaHomeScreen.tsx` | ✅ Funcional | Pantalla principal del brigada con resumen de asignación |
| `MiAsignacionScreen.tsx` | ✅ Funcional | Vista detallada de asignación actual |
| `IniciarSalidaScreen.tsx` | ✅ Funcional | Iniciar salida desde sede |
| `SalidaSedeScreen.tsx` | ✅ Funcional | Registro de salida de sede |
| `SalidaDeSedeScreen.tsx` | ✅ Funcional | Proceso de salida física |
| `IngresoSedeScreen.tsx` | ✅ Funcional | Registro de ingreso a sede |
| `FinalizarDiaScreen.tsx` | ✅ Funcional | Finalización de jornada laboral |
| `BitacoraScreen.tsx` | ✅ Funcional | Bitácora del día con situaciones |
| `NuevaSituacionScreen.tsx` | ✅ Funcional | Selector de tipo de situación |
| `IncidenteScreen.tsx` | ✅ Funcional | Registro de incidentes viales |
| `AsistenciaScreen.tsx` | ✅ Funcional | Registro de asistencias viales |
| `EmergenciaScreen.tsx` | ✅ Funcional | Registro de emergencias |
| `RelevoScreen.tsx` | ✅ Funcional | Registro de relevos entre unidades |
| `RegistroCombustibleScreen.tsx` | ✅ Funcional | Registro de cargas de combustible |
| `Inspeccion360Screen.tsx` | ✅ Funcional | Inspección completa de unidad |
| `AprobarInspeccion360Screen.tsx` | ✅ Funcional | Aprobación de inspecciones |
| `AprobacionesPendientesScreen.tsx` | ✅ Funcional | Lista de aprobaciones pendientes |
| `AutorizarSalidaScreen.tsx` | ✅ Funcional | Autorización de salidas |
| `SolicitarSalidaAsignacionScreen.tsx` | ✅ Funcional | Solicitud de salida con asignación |
| `EditarSalidaScreen.tsx` | ✅ Funcional | Edición de datos de salida |
| `EditarIngresoScreen.tsx` | ✅ Funcional | Edición de datos de ingreso |
| `VehiculoHistorialScreen.tsx` | ✅ Funcional | Historial de vehículo por placa |
| `ConfiguracionPruebasScreen.tsx` | ✅ Funcional | Configuración modo pruebas |

### 📁 `mobile/src/screens/auth/` (2 pantallas)

| Pantalla | Estado | Descripción |
|----------|--------|-------------|
| `LoginScreen.tsx` | ✅ Funcional | Pantalla de inicio de sesión |
| `ResetPasswordScreen.tsx` | ✅ Funcional | Restablecimiento de contraseña |

### 📁 `mobile/src/screens/cop/` (1 pantalla)

| Pantalla | Estado | Descripción |
|----------|--------|-------------|
| `COPHomeScreen.tsx` | ✅ Funcional | Dashboard del COP |

---

## Panel Web - Páginas

### 📁 `web/src/pages/` (24 páginas)

| Página | Estado | Rol Requerido | Descripción |
|--------|--------|---------------|-------------|
| `LoginPage.tsx` | ✅ Funcional | Público | Inicio de sesión |
| `DashboardPage.tsx` | ✅ Funcional | COP/ADMIN | Dashboard principal |
| `DashboardEjecutivoPage.tsx` | ✅ Funcional | MANDOS/ADMIN | Dashboard ejecutivo |
| `DashboardSedesPage.tsx` | ✅ Funcional | ADMIN | Dashboard por sedes |
| `OperacionesPage.tsx` | ✅ Funcional | OPERACIONES | Gestión operativa |
| `CrearAsignacionPage.tsx` | ✅ Funcional | OPERACIONES | Creación de asignaciones |
| `GeneradorTurnosPage.tsx` | ✅ Funcional | OPERACIONES | Generador de turnos |
| `BrigadasPage.tsx` | ✅ Funcional | OPERACIONES | Lista de brigadas |
| `GestionBrigadasPage.tsx` | ✅ Funcional | OPERACIONES/ADMIN | Gestión de brigadas |
| `UnidadesPage.tsx` | ✅ Funcional | OPERACIONES | Lista de unidades |
| `GestionUnidadesPage.tsx` | ✅ Funcional | OPERACIONES/ADMIN | Gestión de unidades |
| `MovimientosBrigadasPage.tsx` | ✅ Funcional | OPERACIONES | Movimientos de brigadas |
| `COPMapaPage.tsx` | ✅ Funcional | COP | Mapa en tiempo real |
| `COPSituacionesPage.tsx` | ✅ Funcional | COP | Situaciones activas |
| `BitacoraPage.tsx` | ✅ Funcional | COP/OPERACIONES | Bitácora histórica |
| `EventosPage.tsx` | ✅ Funcional | OPERACIONES | Gestión de eventos |
| `SituacionesFijasPage.tsx` | ✅ Funcional | OPERACIONES | Situaciones fijas |
| `SituacionesPersistentesPage.tsx` | ✅ Funcional | OPERACIONES | Situaciones persistentes |
| `GaleriaMultimediaPage.tsx` | ✅ Funcional | COP/OPERACIONES | Galería de multimedia |
| `ConfiguracionSedesPage.tsx` | ✅ Funcional | ADMIN | Configuración de sedes |
| `ControlAccesoPage.tsx` | ✅ Funcional | OPERACIONES | Control de acceso |
| `AdminHubPage.tsx` | ✅ Funcional | ADMIN | Hub administrativo |
| `AdminPanelPage.tsx` | ✅ Funcional | ADMIN | Panel de administración |
| `SuperAdminPage.tsx` | ✅ Funcional | SUPER_ADMIN | Super administración |

---

## API Backend - Rutas

### 📁 `backend/src/routes/` (37 archivos)

#### Autenticación
| Archivo | Prefijo | Endpoints Principales |
|---------|---------|----------------------|
| `auth.routes.ts` | `/api/auth` | `POST /login`, `POST /refresh`, `POST /logout` |
| `passwordReset.routes.ts` | `/api/password-reset` | `POST /request`, `POST /reset` |

#### Brigadas y Asignaciones
| Archivo | Prefijo | Endpoints Principales |
|---------|---------|----------------------|
| `asignaciones.ts` | `/api/asignaciones` | `POST /`, `GET /`, `GET /:id`, `PUT /:id/cancelar` |
| `asignacionAvanzada.routes.ts` | `/api/asignaciones-avanzadas` | Sistema avanzado de asignaciones |
| `turno.routes.ts` | `/api/turnos` | `GET /mi-asignacion-hoy` ⭐ (endpoint canónico) |
| `brigadas.routes.ts` | `/api/brigadas` | CRUD de brigadas |
| `generador-turnos.routes.ts` | `/api/generador-turnos` | Generación automática |

#### Salidas e Ingresos
| Archivo | Prefijo | Endpoints Principales |
|---------|---------|----------------------|
| `salida.routes.ts` | `/api/salidas` | `POST /iniciar`, `POST /:id/finalizar`, `GET /mi-salida-activa` |
| `ingreso.routes.ts` | `/api/ingresos` | `POST /registrar`, `POST /:id/salir` |
| `solicitudesSalida.ts` | `/api/solicitudes-salida` | Solicitudes de salida |

#### Situaciones
| Archivo | Prefijo | Endpoints Principales |
|---------|---------|----------------------|
| `situaciones.routes.ts` | `/api/situaciones` | CRUD de situaciones |
| `situacionPersistente.routes.ts` | `/api/situaciones-persistentes` | Situaciones persistentes |
| `incidente.routes.ts` | `/api/incidentes` | Registro de incidentes |
| `evento.routes.ts` | `/api/eventos` | Gestión de eventos |

#### Administración
| Archivo | Prefijo | Endpoints Principales |
|---------|---------|----------------------|
| `administracion.routes.ts` | `/api/administracion` | CRUD usuarios/roles |
| `sede.routes.ts` | `/api/sedes` | CRUD de sedes |
| `reasignacion.routes.ts` | `/api/reasignaciones` | Reasignaciones temporales |
| `unidades.routes.ts` | `/api/unidades` | CRUD de unidades |
| `roles.routes.ts` | `/api/roles` | Gestión de roles |

#### Operaciones
| Archivo | Prefijo | Endpoints Principales |
|---------|---------|----------------------|
| `operaciones.routes.ts` | `/api/operaciones` | Dashboard operativo |
| `dashboard.routes.ts` | `/api/dashboard` | Estadísticas |
| `reportes.routes.ts` | `/api/reportes` | Generación de reportes |

#### Sistemas Especiales
| Archivo | Prefijo | Endpoints Principales |
|---------|---------|----------------------|
| `grupos.routes.ts` | `/api/grupos` | Gestión de grupos G1/G2 |
| `movimientos.routes.ts` | `/api/movimientos` | Movimientos de personal |
| `inspeccion360.routes.ts` | `/api/inspeccion360` | Inspecciones de unidad |
| `aprobaciones.routes.ts` | `/api/aprobaciones` | Sistema de aprobaciones |
| `alertas.routes.ts` | `/api/alertas` | Sistema de alertas |
| `notificaciones.routes.ts` | `/api/notificaciones` | Push notifications |
| `multimedia.routes.ts` | `/api/multimedia` | Gestión de archivos |

#### Análisis
| Archivo | Prefijo | Endpoints Principales |
|---------|---------|----------------------|
| `intelligence.routes.ts` | `/api/intelligence` | Análisis de datos |
| `accidentologia.routes.ts` | `/api/accidentologia` | Análisis de accidentes |
| `auditoria.routes.ts` | `/api/auditoria` | Logs de auditoría |

#### Geografía
| Archivo | Prefijo | Endpoints Principales |
|---------|---------|----------------------|
| `geografia.routes.ts` | `/api/geografia` | Rutas, departamentos |
| `ubicacionBrigada.routes.ts` | `/api/ubicacion-brigada` | GPS tracking |

#### Otros
| Archivo | Prefijo | Endpoints Principales |
|---------|---------|----------------------|
| `comunicacionSocial.routes.ts` | `/api/comunicacion-social` | Comunicados |
| `testMode.routes.ts` | `/api/test-mode` | Modo pruebas |

---

## Base de Datos - Tablas

### Tablas Principales

#### Sistema Core
| Tabla | Descripción | Campos Clave |
|-------|-------------|--------------|
| `usuario` | Usuarios del sistema | id, username, password_hash, rol_id, sede_id, chapa |
| `rol` | Roles disponibles | id, nombre |
| `sede` | Sedes de PROVIAL | id, codigo, nombre, es_sede_central |
| `unidad` | Vehículos/unidades | id, codigo, tipo_unidad, placa, sede_id |
| `ruta` | Rutas de carretera | id, codigo, nombre, km_inicio, km_fin |

#### Sistema de Asignaciones
| Tabla | Descripción | Campos Clave |
|-------|-------------|--------------|
| `turno` | Turnos programados | id, fecha, fecha_fin, estado, creado_por, sede_id |
| `asignacion_unidad` | Asignación de unidad a turno | id, turno_id, unidad_id, ruta_id, estado_nomina |
| `tripulacion_turno` | Tripulantes de asignación | id, asignacion_id, usuario_id, rol_tripulacion, es_comandante |

#### Sistema de Salidas
| Tabla | Descripción | Campos Clave |
|-------|-------------|--------------|
| `salida_unidad` | Salidas activas | id, unidad_id, fecha_hora_salida, estado, km_salida |
| `ingreso_sede` | Ingresos a sede | id, salida_unidad_id, tipo_ingreso, es_ingreso_final |
| `brigada_unidad` | Asignaciones permanentes | brigada_id, unidad_id, rol, activo |

#### Sistema de Situaciones
| Tabla | Descripción | Campos Clave |
|-------|-------------|--------------|
| `situacion` | Registro de situaciones | id, tipo, salida_unidad_id, latitud, longitud |
| `situacion_multimedia` | Archivos adjuntos | id, situacion_id, tipo, url |
| `situacion_persistente` | Eventos persistentes | id, tipo, fecha_inicio, fecha_fin_estimada |
| `evento` | Eventos programados | id, nombre, fecha_inicio, fecha_fin |

#### Sistema de Incidentes
| Tabla | Descripción | Campos Clave |
|-------|-------------|--------------|
| `vehiculo` | Master de vehículos | id, placa, marca, linea, color |
| `piloto` | Master de pilotos | id, licencia, nombre, dpi |
| `incidente_vehiculo` | Relación incidente-vehículo | incidente_id, vehiculo_id |
| `grua` | Grúas registradas | id, empresa, telefono |
| `aseguradora` | Aseguradoras | id, nombre, telefono |

#### Sistema de Grupos
| Tabla | Descripción | Campos Clave |
|-------|-------------|--------------|
| `calendario_grupo` | Estado de grupos G1/G2 | id, grupo, fecha, estado |
| `movimiento_brigada` | Movimientos de personal | id, brigada_id, tipo, fecha |

#### Sistema Administrativo
| Tabla | Descripción | Campos Clave |
|-------|-------------|--------------|
| `auditoria_log` | Logs de auditoría | id, usuario_id, accion, tabla_afectada |
| `notificacion` | Notificaciones push | id, usuario_id, titulo, leida |
| `alerta` | Alertas del sistema | id, tipo, severidad, mensaje |
| `reasignacion_sede` | Reasignaciones temporales | id, usuario_id, sede_destino_id |

### Vistas Principales

| Vista | Descripción | Uso Principal |
|-------|-------------|---------------|
| `v_mi_asignacion_hoy` | Asignación del día para brigada | App móvil |
| `v_asignaciones_completas` | Vista completa de asignaciones | Panel web |
| `v_asignaciones_pendientes` | Asignaciones sin liberar | Operaciones |
| `v_mi_salida_activa` | Salida activa del brigada | App móvil |
| `v_unidades_en_salida` | Unidades actualmente en calle | COP |
| `v_situaciones_completas` | Situaciones con detalles | Bitácora |
| `v_turnos_completos` | Turnos con tripulación | Operaciones |

---

## Migraciones

### Migraciones Principales (80 totales)

| Rango | Descripción |
|-------|-------------|
| 001-009 | Schema base, catálogos, triggers |
| 010-011 | Sistema de turnos y asignaciones |
| 014-018 | Situaciones, grupos, rutas |
| 019-021 | Sistema de asignaciones permanentes y sedes |
| 022-030 | Normalización de datos, inteligencia |
| 035-045 | Fixes de vistas, sistema avanzado |
| 046-052 | Bitácora histórica, eventos, reacciones |
| 060-069 | Eventos persistentes, fixes varios |
| 070-079 | Movimientos, obstrucciones, inspección 360, alertas |
| **080** | ⭐ es_comandante, tripulación en vista |

### Migración Más Reciente

**080_add_comandante_tripulacion_view.sql**
- Agrega `es_comandante` a `v_mi_asignacion_hoy`
- Agrega array `tripulacion` completo
- Agrega `estado_nomina` para filtrado

---

## 🧪 Pruebas y Verificación

### Usuarios de Prueba

**Contraseña universal para pruebas:** `provial123`

| Rol | Usuario | Acceso | Pruebas |
|-----|---------|--------|---------|
| SUPER_ADMIN | `19109` o `admin` | Web completo | Todo el sistema |
| ADMIN | `operaciones` | Panel admin | Gestión usuarios/unidades |
| COP | `cop.admin` | Mapa COP | Situaciones en tiempo real |
| ENCARGADO_NOMINAS | Por buscar en BD | Operaciones | Crear/liberar asignaciones |
| OPERACIONES | `operaciones` | Operaciones | Consultas y reportes |
| BRIGADA | `00001` (ejemplo) | App móvil | Flujo de brigada |

### Flujo de Prueba - App Móvil (Brigada)

```
1. Login con usuario brigada (ej: 00001)
   └── Debe mostrar pantalla de asignación

2. Si tiene asignación LIBERADA:
   └── Ver MiAsignacionScreen con datos completos
   └── Verificar: unidad, ruta, tripulación, es_comandante

3. Iniciar salida:
   └── IniciarSalidaScreen → SalidaSedeScreen
   └── Registrar km inicial, combustible

4. Crear situación:
   └── NuevaSituacionScreen → IncidenteScreen/AsistenciaScreen/EmergenciaScreen
   └── Verificar que guarda con coordenadas GPS

5. Finalizar día:
   └── FinalizarDiaScreen
   └── Registrar km final, combustible final
```

### Flujo de Prueba - Panel Web (Operaciones)

```
1. Login como operaciones
   └── Debe redirigir a /operaciones

2. Crear asignación:
   └── CrearAsignacionPage
   └── Seleccionar unidad, fecha, ruta, tripulación
   └── Verificar que se crea con estado_nomina = 'BORRADOR'

3. Liberar asignación:
   └── Cambiar estado_nomina a 'LIBERADA'
   └── Verificar en app móvil que brigada la ve
```

### Queries de Verificación SQL

```sql
-- ========================================
-- VERIFICAR ASIGNACIONES
-- ========================================

-- Ver asignaciones activas
SELECT au.id, t.fecha, t.estado, au.unidad_id, au.estado_nomina,
       u.codigo as unidad
FROM asignacion_unidad au
JOIN turno t ON au.turno_id = t.id
JOIN unidad u ON au.unidad_id = u.id
WHERE t.estado IN ('PLANIFICADO', 'ACTIVO')
AND t.fecha >= CURRENT_DATE
ORDER BY t.fecha;

-- Ver tripulación de una asignación
SELECT tt.usuario_id, usr.nombre_completo, usr.chapa, 
       tt.rol_tripulacion, tt.es_comandante
FROM tripulacion_turno tt
JOIN usuario usr ON tt.usuario_id = usr.id
WHERE tt.asignacion_id = 46;  -- Cambiar ID

-- Probar vista para usuario específico
SELECT * FROM v_mi_asignacion_hoy 
WHERE usuario_id = 20  -- Cambiar ID
AND estado_nomina = 'LIBERADA';

-- ========================================
-- VERIFICAR SALIDAS
-- ========================================

-- Ver salidas activas
SELECT su.id, su.unidad_id, u.codigo, 
       su.fecha_hora_salida, su.estado, su.km_salida
FROM salida_unidad su
JOIN unidad u ON su.unidad_id = u.id
WHERE su.estado = 'EN_SALIDA';

-- Ver salida activa de un brigada
SELECT * FROM v_mi_salida_activa WHERE brigada_id = 20;

-- ========================================
-- VERIFICAR SITUACIONES
-- ========================================

-- Ver situaciones de hoy
SELECT s.id, s.tipo, s.descripcion, s.latitud, s.longitud,
       s.created_at, u.codigo as unidad
FROM situacion s
JOIN salida_unidad su ON s.salida_unidad_id = su.id
JOIN unidad u ON su.unidad_id = u.id
WHERE s.created_at >= CURRENT_DATE
ORDER BY s.created_at DESC;

-- ========================================
-- VERIFICAR USUARIOS Y ROLES
-- ========================================

-- Ver usuarios por rol
SELECT r.nombre as rol, COUNT(*) as cantidad
FROM usuario u
JOIN rol r ON u.rol_id = r.id
GROUP BY r.nombre
ORDER BY cantidad DESC;

-- Buscar usuario específico
SELECT id, username, nombre_completo, chapa, rol_id, sede_id, activo
FROM usuario
WHERE username = '19109' OR chapa = '19109';

-- ========================================
-- VERIFICAR ESTADO DE TABLAS
-- ========================================

-- Conteo de registros principales
SELECT 'usuarios' as tabla, COUNT(*) FROM usuario
UNION ALL
SELECT 'unidades', COUNT(*) FROM unidad
UNION ALL
SELECT 'turnos', COUNT(*) FROM turno
UNION ALL
SELECT 'asignaciones', COUNT(*) FROM asignacion_unidad
UNION ALL
SELECT 'tripulaciones', COUNT(*) FROM tripulacion_turno
UNION ALL
SELECT 'salidas', COUNT(*) FROM salida_unidad
UNION ALL
SELECT 'situaciones', COUNT(*) FROM situacion;
```

### Verificación de Endpoints (cURL/Postman)

```bash
# Login
curl -X POST https://provial-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"19109","password":"provial123"}'

# Obtener mi asignación (con token)
curl -X GET https://provial-production.up.railway.app/api/turnos/mi-asignacion-hoy \
  -H "Authorization: Bearer {TOKEN}"

# Crear asignación (Operaciones)
curl -X POST https://provial-production.up.railway.app/api/asignaciones \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "unidad_id": 378,
    "fecha_programada": "2026-01-10",
    "comandante_usuario_id": 20,
    "tripulacion": [
      {"usuario_id": 20, "rol_tripulacion": "PILOTO"}
    ]
  }'
```

### Checklist de Verificación

#### App Móvil
- [ ] Login funciona con brigada
- [ ] Muestra "Sin Asignación" si no hay asignación LIBERADA
- [ ] Muestra asignación con datos completos cuando existe
- [ ] es_comandante se muestra correctamente
- [ ] Tripulación completa visible
- [ ] GPS funciona en situaciones
- [ ] Fotos se suben correctamente

#### Panel Web
- [ ] Login redirige según rol
- [ ] Crear asignación funciona
- [ ] Liberar asignación cambia estado_nomina
- [ ] Dashboard muestra estadísticas
- [ ] Mapa COP carga situaciones

#### Base de Datos
- [ ] Migración 080 ejecutada (es_comandante en vista)
- [ ] Índices creados
- [ ] Vistas funcionan correctamente

---

## Problemas Conocidos

### 🔴 Críticos
*Ninguno actualmente*

### 🟡 Moderados
| Problema | Descripción | Workaround |
|----------|-------------|------------|
| Logs extensos | Muchos console.log en producción | Limpiar logs de debug |

### 🟢 Menores
| Problema | Descripción | Prioridad |
|----------|-------------|-----------|
| 404 en ultima-asignacion | Endpoint legacy genera logs | Baja |

---

## Tareas Pendientes

### 🔴 Alta Prioridad
| Tarea | Estimación |
|-------|------------|
| Limpiar logs de debug | 1h |

### 🟡 Media Prioridad
| Tarea | Estimación |
|-------|------------|
| Sistema de reportes Excel/PDF | 8h |
| Notificaciones push Firebase | 8h |
| Modo offline con sync | 16h |

### 🟢 Baja Prioridad
| Tarea | Estimación |
|-------|------------|
| Tests unitarios | 24h |
| Documentación Swagger | 8h |

---

## Contacto y Soporte

- **Deploy**: Railway (provial-production.up.railway.app)
- **Base de datos**: PostgreSQL en Railway

---

**Generado**: 9 de Enero, 2026
