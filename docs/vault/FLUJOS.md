---
tags: [flujos, negocio, operaciones]
---

# Flujos de negocio — PROVIAL

## 1. Jornada de una brigada (flujo completo)

Cada brigada (unidad + tripulación) sigue este ciclo diario:

```
ASIGNACION_TURNO
      │
      ▼
[Brigada en móvil]
  Inspección 360  ──►  POST /inspeccion360  (inspeccion_360 con salida_id=null)
      │
      ▼
  Inicio de salida ──►  POST /salidas/iniciar
      │                   • iniciar_salida_unidad() → salida_unidad
      │                   • UPDATE inspeccion_360 SET salida_id (tx atómica)
      │                   • marca turno EN_CAMPO
      │
      ▼
  [En ruta — operaciones del día]
  ├── Registrar situación  ──►  POST /situaciones
  ├── Registrar actividad  ──►  POST /actividades
  ├── Cambiar ruta         ──►  POST /salidas/cambiar-ruta
  ├── Ingreso a sede       ──►  POST /ingresos/registrar (motivo != FINALIZACION_JORNADA)
  └── Combustible          ──►  POST /turnos/registrar-combustible
      │
      ▼
  Ingreso final        ──►  POST /ingresos/registrar (motivo = FINALIZACION_JORNADA)
      │                       • crea ingreso_sede con es_ingreso_final=false (aún)
      │
      ▼
  Finalizar jornada    ──►  POST /ingresos/finalizar-jornada
      │                       • valida ingreso activo tipo FINALIZACION_JORNADA
      │                       • valida sede (con confirmación si hay mismatch)
      │                       • db.tx: UPDATE ingreso + finalizar_jornada_completa()
      │                           └── finalizar_jornada_completa() cierra salida,
      │                               crea snapshot bitácora, limpia situacion_actual
      ▼
  [Brigada finalizada — no más acciones móvil]
```

### Override administrativo (COP)

COP puede finalizar una salida específica sin pasar por el flujo de ingreso:

```
POST /salidas/:id/finalizar   (solo COP, ADMIN, SUPER_ADMIN)
    └── finalizar_salida_unidad(salida_id, km, combustible, obs, user_id)
```

---

## 2. Ciclo de vida de una Situación

```
[Brigada en campo]
  POST /situaciones           → estado: ACTIVA
      │
      ├── Multimedia          → POST /multimedia (sube a Cloudinary)
      ├── Vehículos           → POST /situaciones/:id/vehiculos
      │     └── Upsert vehiculo/piloto por placa/licencia + junction situacion_vehiculo
      ├── Personas            → POST /situaciones/:id/personas
      └── Editar datos        → PATCH /situaciones/:id  (requiere canEditSituacion)
      │
      ▼
  Cerrar situación
  ├── [Brigada] PATCH /situaciones/:id  con fecha_hora_finalizacion
  └── [COP] mismo endpoint con permisos ampliados
      │
      └── Trigger DB actualiza situacion_actual de la unidad
```

### Flujo offline-first de creación de situación (móvil)

```
handleSubmit(formData)
  │
  ├── crearDraft({ tipo, unidad, salida, km, sentido, latitud, longitud })
  │     └── draft inicial sin municipio_id ni departamento_id
  │
  ├── actualizarDraft({ ...formData, departamento_id: Number|null, municipio_id: Number|null, ... })
  │     └── ⚠️ departamento_id y municipio_id deben castearse explícitamente a Number aquí
  │         Si formData.municipio_id llega como string o undefined, se pierde en useDraftSituacion
  │
  └── enviarDraft()
        └── payload final: toIntOrNull(draft.municipio_id)
```

**Campos con mapping backend↔móvil:**
- `material_via` (móvil) ↔ `tipo_pavimento` (backend): el payload de edición envía ambos; el transformador acepta cualquiera con fallback
- `departamento_id` / `municipio_id`: se castean a `Number` en `actualizarDraft` para evitar pérdida por tipo string
- En modo edición, el PATCH incluye `departamento_id`, `municipio_id`, `clima`, `carga_vehicular`, `tipo_pavimento`

**Transformador de edición (`transformarDatosParaFormulario`):**
- Lee campos planos primero, luego aplica fallbacks desde `data.tipo_pavimento` y desde `data.detalles.otros`
- `detalles.otros` puede contener: `material_via`, `tipo_pavimento`, `clima`, `carga_vehicular`, `departamento_id`, `municipio_id`
- **Multimedia**: debe preservar `infografia_numero`, `infografia_titulo` y `estado: 'SUBIDO'` al mapear. Sin estos campos `MultimediaWrapper` fusiona todo en infografía 1 y no clasifica items como históricos.

---

### Flujo de infografías multimedia

Las infografías son grupos numerados de fotos + video bajo una misma situación o actividad. Cada item en `situacion_multimedia` tiene `infografia_numero` (INT, default 1) e `infografia_titulo`.

**Path unificado (mayo 2026) — situaciones Y actividades:**

```
InfografiaManager
  │  emite MultimediaRef[] con { tipo, uri, infografia_numero, infografia_titulo, orden, duracion_segundos }
  ▼
multimediaSync.uploadInfografias({ entityType, entityId, mediaRefs, maxInfografias })
  │  filtra refs ya subidas (uri http / estado SUBIDO)
  │  respeta límite de infografías (maxInfografias)
  ▼
multimedia.service.uploadEntityPhoto/Video('situacion'|'actividad', id, ...)
  │  POST /multimedia/:entityType/:entityId/foto|video
  │  FormData: foto|video, latitud?, longitud?, infografia_numero, infografia_titulo, orden|duracion_segundos
  ▼
backend multimedia.controller
  │  multer → validación MIME → conteo infografías → limit check
  │  subirFotoAdapter / subirVideoAdapter
  ▼
STORAGE_TYPE=cloudinary → cloudinary.service.ts
STORAGE_TYPE=local      → storage.service.ts (filesystem local + sharp thumbnails)
  │
  ▼
situacion_multimedia (INSERT con estado: SUBIDO)
```

**Límites enforced (cliente + servidor)**:
- Situaciones: máx 10 infografías distintas (`infografia_numero`)
- Actividades: máx 3 infografías distintas

**UNIQUE indexes en `situacion_multimedia`** (migración 146):
- `uq_sm_situacion_inf_foto_orden` — sin duplicar orden de foto en misma infografía de situación
- `uq_sm_actividad_inf_foto_orden` — idem actividades
- `uq_sm_situacion_inf_video` — solo 1 video por infografía de situación
- `uq_sm_actividad_inf_video` — solo 1 video por infografía de actividad

**SituacionDinamicaScreen (HECHO_TRANSITO, ASISTENCIA_VEHICULAR, EMERGENCIA_VIAL)**:

```
MultimediaWrapper → FormBuilder
  Creación: useDraftSituacion.subirMultimedia → multimedia.service.uploadEntityPhoto/Video
           → POST /multimedia/situacion/:id/foto|video
  Edición:  subirMultimediaEdicion → multimedia.service.uploadEntityPhoto/Video
           → POST /multimedia/situacion/:id/foto|video
  ↳ ambos pasan infografiaMetadata = { infografia_numero, infografia_titulo }
  ↳ backend guarda con estado: SUBIDO
```

**Clasificación frontend (isHistorical):**
```typescript
// InfografiaManager.tsx
function isHistorical(inf: Infografia): boolean {
  if (inf.editable) return false;  // nueva sesión de usuario
  return inf.fotos.some(f => f.estado === 'SUBIDO') || (inf.video?.estado === 'SUBIDO' ?? false);
}
```
- Histórica → aparece en sección "Evidencia anterior" (solo lectura)
- No histórica (editable) → aparece como card de sesión con inputs

**Qué pantallas muestran `InfografiaManager`:**
- `NuevaSituacionScreen`: todos los tipos excepto los cuyo nombre contiene "baño" (check: `!nombreTipoSeleccionado.toLowerCase().includes('baño')`)
- `SituacionDinamicaScreen`: tipos que tengan un form config en `mobile/src/config/formularios/`: `HECHO_TRANSITO`, `ASISTENCIA_VEHICULAR`, `EMERGENCIA_VIAL`
- `NuevaSituacionScreen` (modo actividad): cuando `route.params.tipo === 'FORMULARIOS_ACTIVIDAD'`, se muestra `InfografiaManager` con máximo 3 infografías

**Regla título en `MultimediaWrapper.toGroupedInfografias`:**
El título se extrae del ref **antes** del skip del placeholder. Los placeholders (infografías vacías) solo aportan número y título; no agregan fotos ni video al grupo.

**`cloudinaryUpload.ts` — DEPRECADO**: Marcado con `@deprecated`. No usar. Toda subida va por `multimedia.service.uploadEntityPhoto/Video`.

---

### Situación persistente (derrumbe, obra, accidente multi-día)

Una situación normal puede promovida a persistente (campo `persistente = true`). Se asignan brigadas mediante la tabla `situacion_persistente_asignacion`.

```
PATCH /situaciones/:id  { persistente: true }
POST /situaciones-persistentes/:id/asignaciones  → situacion_persistente_asignacion
```

---

## 3. Flujo de Ingreso a sede (intermedio)

Para paradas en sede durante la jornada (combustible, comida, reunión):

```
POST /ingresos/registrar
  body: { motivo: 'COMBUSTIBLE' | 'COMIDA' | 'REUNION' | ... }
  → crea ingreso_sede con es_ingreso_final = false

[Brigada realiza su gestión en sede]

[Regresa a ruta — no hay endpoint de "salida de sede", el sistema lo gestiona al
 registrar la siguiente actividad/situación en ruta]
```

---

## 4. Inspección 360

Antes de iniciar salida, la brigada completa una inspección vehicular:

```
POST /inspeccion360
  body: { unidad_id, km_inicial, datos_inspeccion... }
  → crea inspeccion_360 con salida_id = null

POST /salidas/iniciar
  → tx atómica: iniciar_salida_unidad() + UPDATE inspeccion_360 SET salida_id
```

COP puede omitir la inspección usando inicio de emergencia:

```
POST /salidas/cop/iniciar-unidad   (COP, OPERACIONES, ADMIN)
  → inicia salida sin requerir inspeccion_360 previa
```

---

## 5. Gestión de turnos y asignaciones (Flujo Desacoplado — D-011)

```
[OPERACIONES — panel web /operaciones/crear-asignacion]
  POST /api/asignaciones    → crearAsignacionProgramada.controller
      │   body: { fecha_programada, tipo_asignacion, ruta_id, sentido,
      │           hora_salida, recorrido_inicio/fin_km, actividades_especificas,
      │           comandante_usuario_id, tripulacion[] }
      │
      ├── Busca turno existente (estado != CERRADO) para esa fecha + sede
      │     Si no existe → crea turno en estado PLANIFICADO
      │
      └── TurnoModel.crearAsignacionConTripulacion(turno_id, tipo, {..., unidad_id: null}, tripulacion[])
            • Verifica inactividad de cada tripulante (get_motivo_inactividad_actual)
            • Lanza INACTIVO:usuario_id:nombre si alguno está inactivo
            • INSERT asignacion_unidad con unidad_id = NULL
            • INSERT tripulacion_turno por cada tripulante

  tipo_asignacion permitidos: PATRULLA / GARITA
  ⚠️ PUESTO_CONTROL eliminado (2026-04-28)

[DASHBOARD OPERACIONES — /operaciones/dashboard-sedes]
  GET /api/asignaciones-avanzadas/por-sede?mostrarPendientes=true&incluirBorradores=true
      └── v_asignaciones_por_sede (todos LEFT JOINs — soporta unidad_id = NULL)
          + query tripulacion_turno si hay asignacionIds
          + query aviso_asignacion si hay asignacionIds   ← tabla creada en migración 142
      Asignaciones sin unidad aparecen como pendientes; no generan 500.

[TRANSPORTES — panel web /transportes/asignaciones]
  GET /api/transportes/asignaciones/pendientes
      └── Lista asignaciones PATRULLA con unidad_id IS NULL y turno no publicado
  GET /api/transportes/asignaciones/unidades-disponibles
      └── Unidades activas + disponible_transportes=true + sin unidad_reparacion activa
  PUT /api/transportes/asignaciones/:id/unidad
      └── db.tx con 3 validaciones:
          1. Asignación existe
          2. Unidad no está en taller / no disponible
          3. Unidad no tiene conflicto de fecha con otro turno activo/planificado
      → Inyecta unidad_id en asignacion_unidad

[PUBLICACIÓN — AsignacionAvanzadaModel.publicarTurno]
  POST /api/asignaciones-avanzadas/turno/:id/publicar
      └── Valida EMPTY_TURNO: aborta si el turno no tiene asignaciones
          Valida MISSING_UNITS: aborta si alguna asignacion PATRULLA tiene unidad_id IS NULL
          Turno nunca llega a brigadas sin vehículo (fail-closed)

[BRIGADA — app móvil]
  GET /api/turnos/mi-asignacion-hoy
      └── Devuelve turno_id, unidad_codigo, ruta, sede, estado del turno
```

### Estados de turno

| Estado | Significado |
|--------|-------------|
| `PLANIFICADO` | Creado por Operaciones, aún en borrador |
| `ACTIVO` | Publicado, brigadas lo pueden ver |
| `CERRADO` | Jornada finalizada — nunca aparece en vistas de pendientes |

---

## 6. Cambio de ruta

```
[Brigada móvil]
  POST /salidas/cambiar-ruta
    body: { nueva_ruta_id }
    → resolveContextoActivo(userId) para obtener salida_id
    → UPDATE salida_unidad SET ruta_id
    → INSERT salida_evento (auditoría)

[COP / OPERACIONES / ADMIN — web]
  POST /salidas/cambiar-ruta
    body: { nueva_ruta_id, unidad_id }  (param adicional para especificar unidad)
```

---

## 7. Publicación de notificaciones push

```
Backend emite evento Socket.io
    │
    └── [opcionalmente] Firebase Admin SDK → push notification al dispositivo
        └── Token FCM almacenado en tabla dispositivo_movil
```

---

## 8. Accidentología

```
[ACCIDENTOLOGIA — panel web]
  POST /accidentologia           → crea hoja de accidente
  POST /accidentologia/:id/vehiculos
  POST /accidentologia/:id/personas
  GET  /estadisticas/...         → consultas de análisis

[Import histórico]
  POST /admin/import-excel       → carga histórico desde Excel
```

---

## 9. Comunicación Social

```
[COMUNICACION_SOCIAL — panel web]
  GET  /comunicacion-social/plantillas
  POST /comunicacion-social/publicaciones
      └── Genera contenido a partir de situación + plantilla + datos
```

---

## 10. Gestión de acceso COP y delegaciones

```
[ADMIN_COP — panel web]
  POST /cop/acceso/delegaciones
    body: { usuario_id, permiso: 'GESTIONAR_ACCESO' }
    → Crea fila en delegacion_permiso_cop (activo=true)
    → El usuario COP receptor ya puede usar PATCH /cop/acceso/brigadas/:id/acceso

[COP con delegación activa]
  PATCH /cop/acceso/brigadas/:usuario_id/acceso
    body: { acceso_app_activo: false, motivo: '...' }
    → Middleware canGestionarAcceso verifica delegacion_permiso_cop
    → GrupoModel.toggleAccesoIndividual() — verifica jurisdicción de sede

[ADMIN_COP — revocar]
  DELETE /cop/acceso/delegaciones/:id
    → UPDATE delegacion_permiso_cop SET activo=false, revocado_en=NOW()
    → El usuario COP pierde el permiso inmediatamente en la próxima request
```

**Restricción**: Solo el `ADMIN_COP` permanente (sub-rol, no delegado) puede otorgar/revocar delegaciones. Un COP con delegación no puede sub-delegar.

---

## 11. Sincronización de catálogos al login

Al hacer login (y al cargar sesión existente), `authStore` llama en paralelo:

```
Promise.all([syncCatalogosAuxiliares(), syncGeografia()])
```

| Función | Endpoint | Guarda en SQLite |
|---------|----------|-----------------|
| `syncCatalogosAuxiliares()` | `GET /situaciones/auxiliares` | tipos_hecho, tipos_asistencia, tipos_emergencia, tipos_vehiculo, marcas, etnias, dispositivos, causas |
| `syncGeografia()` | `GET /geografia/departamentos` + `GET /geografia/municipios` | departamento, municipio |

**CatalogResolver** usa SQLite primero, con fallback a datos hardcodeados en `data/geografia.ts` si SQLite está vacío (primera ejecución offline o error de red).

⚠️ **Bug resuelto**: el catálogo hardcodeado usaba IDs `101, 102...` (esquema dept×100+índice) pero Railway usa IDs secuenciales `1–338`. El backend validaba `municipio_id` contra la tabla `municipio` y lo forzaba a `null` si no existía. Fix: sync desde API + caché SQLite con IDs reales. `loadAuth()` (reabrir app sin re-login) también debe llamar `syncGeografia()` — no solo el login.

---

## 12. Bitácora de jornada — filtro por salida_id (mig 147)

Los endpoints de "mi unidad hoy" filtran por jornada activa, no por fecha calendario. Esto permite que un turno nocturno que cruza la medianoche muestre todos sus registros como una sola jornada.

### Lógica de filtro

```
GET /situaciones/mi-unidad-hoy
GET /actividades/mi-unidad-hoy

  Controller
    │
    ├── SalidaModel.getSalidaActivaDeUnidad(unidad_id)
    │     └── Retorna salida_id si hay salida activa, null si no
    │
    ├── Si salida_id existe:
    │     └── WHERE salida_unidad_id = $salida_id    ← filtro por jornada
    │
    └── Si salida_id es null (sin jornada activa):
          └── WHERE DATE(created_at AT TIME ZONE 'America/Guatemala') = CURRENT_DATE  ← fallback por fecha
```

**Modelos involucrados:**
- `SituacionModel.getMiUnidadHoy(unidad_id, salida_id?)`
- `ActividadModel.getByUnidadHoy(unidad_id, salida_id?)`

**Regla**: Todo endpoint de "historial de jornada" debe usar `salida_unidad_id = X` como filtro primario. Ver [[DECISIONES#D-035]].

---

## 13. Edición de actividad activa (móvil)

La brigada puede editar una actividad ACTIVA directamente desde `BrigadaHomeScreen`.

```
BrigadaHomeScreen
  │  Botón "Editar actividad"  (visible si hay actividad activa en situacion_actual)
  │
  └── navigate('NuevaSituacionScreen', {
          modo: 'editar',
          tipo: 'FORMULARIOS_ACTIVIDAD',
          actividadId: id,
          datosExistentes: { ...actividad }
      })

NuevaSituacionScreen (modo edición)
  │
  ├── Pre-rellena clima, carga_vehicular, departamento_id, municipio_id desde datosExistentes
  ├── transformarDatosParaFormulario() mapea campos planos + JSONB datos
  │
  └── Al guardar:
        PATCH /actividades/:id
          body: { clima, carga_vehicular, departamento_id, municipio_id, datos, observaciones }
```

### Idempotencia en creación de actividades

Al crear una nueva actividad, el móvil genera un `codigo_actividad` determinista con `expo-crypto` (UUID v4). Si la request falla y se reintenta, el backend rechaza el duplicado por la restricción `UNIQUE(codigo_actividad)` y retorna el registro existente (no crea duplicado).

---

## Reglas de negocio críticas

- **Solo BRIGADA** puede iniciar su propia salida (`POST /salidas/iniciar`)
- **Solo BRIGADA** puede finalizar su jornada (`POST /ingresos/finalizar-jornada`)
- **Solo COP/ADMIN/SUPER_ADMIN** pueden cerrar una salida por override administrativo (`POST /salidas/:id/finalizar`)
- **SUPER_ADMIN** pasa siempre `authorize()` independientemente de los roles listados
- **Timezone**: todas las fechas se filtran con `AT TIME ZONE 'America/Guatemala'` (UTC-6)
- **Mismatch de sede**: si la brigada finaliza en sede diferente a la asignada, el sistema devuelve `{ requiere_confirmacion: true, advertencia: '...' }` y el cliente reenvía con `{ confirmar: true }`

---

Ver también: [[SCHEMA]], [[ARQUITECTURA]]
