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

Las infografías son grupos numerados de fotos + video bajo una misma situación. Cada item en `situacion_multimedia` tiene `infografia_numero` (INT, default 1) e `infografia_titulo`.

**Dos paths de subida — deben enviarse con `infografia_numero` en ambos:**

```
Path A — NuevaSituacionScreen (PATRULLAJE, OTROS, etc.)
  InfografiaManager  →  multimediaSync.ts  →  Cloudinary (móvil)
  → POST /multimedia/situacion/:id/batch  (guardarReferenciasCloudinary)
  ↳ guarda con infografia_numero + infografia_titulo + estado: SUBIDO

Path B — SituacionDinamicaScreen (HECHO_TRANSITO, ASISTENCIA_VEHICULAR, EMERGENCIA_VIAL)
  MultimediaWrapper → FormBuilder
  Creación: useDraftSituacion.subirMultimedia → multimedia.service.ts
           → POST /multimedia/situacion/:id/foto|video
  Edición:  subirMultimediaEdicion → multimedia.service.ts
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

**Qué tipos de situación muestran `InfografiaManager`:**
- `NuevaSituacionScreen`: todos los tipos excepto los cuyo nombre contiene "baño" (check: `!nombreTipoSeleccionado.toLowerCase().includes('baño')`)
- `SituacionDinamicaScreen`: tipos que tengan un form config en `mobile/src/config/formularios/`: `HECHO_TRANSITO`, `ASISTENCIA_VEHICULAR`, `EMERGENCIA_VIAL`
- `NuevaSituacionScreen` (modo actividad): cuando `route.params.tipo === 'FORMULARIOS_ACTIVIDAD'`, se muestra `InfografiaManager` con máximo 3 infografías

---

### Flujo multimedia de actividades (Path C)

Las actividades (`tipo_actividad_categoria = 'FORMULARIOS_ACTIVIDAD'`) usan `InfografiaManager` dentro de `NuevaSituacionScreen`. Máximo 3 infografías por actividad.

```
NuevaSituacionScreen (modo actividad)
  InfografiaManager  →  multimediaSync.uploadActividadMultimedia
    │
    ├── getSignedUploadParams(draftUuid=`actividad_${id}`, folder=`provial/actividades/${id}`)
    │     publicId: `actividad_${id}_I${inf}_${tipo}_${orden}`
    ├── uploadToCloudinary (directo, sin pasar por uploadMultimedia)
    └── POST /multimedia/actividad/:id/batch  (guardarReferenciasCloudinaryActividad)
          ↳ guarda en actividad_multimedia con infografia_numero + estado: SUBIDO
```

**Diferencia clave respecto a situaciones**: `uploadMultimedia` no se usa porque asume
`situacionId.split('-')[3]` para folder/tags, patrón válido solo para draftUUIDs de situación.
Para actividades se llama `getSignedUploadParams` + `uploadToCloudinary` directamente con
`folder = provial/actividades/:id` y `draftUuid = actividad_:id`.

**Regla título en `MultimediaWrapper.toGroupedInfografias`:**
El título se extrae del ref **antes** del skip del placeholder. Los placeholders (infografías vacías) solo aportan número y título; no agregan fotos ni video al grupo.

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

## Reglas de negocio críticas

- **Solo BRIGADA** puede iniciar su propia salida (`POST /salidas/iniciar`)
- **Solo BRIGADA** puede finalizar su jornada (`POST /ingresos/finalizar-jornada`)
- **Solo COP/ADMIN/SUPER_ADMIN** pueden cerrar una salida por override administrativo (`POST /salidas/:id/finalizar`)
- **SUPER_ADMIN** pasa siempre `authorize()` independientemente de los roles listados
- **Timezone**: todas las fechas se filtran con `AT TIME ZONE 'America/Guatemala'` (UTC-6)
- **Mismatch de sede**: si la brigada finaliza en sede diferente a la asignada, el sistema devuelve `{ requiere_confirmacion: true, advertencia: '...' }` y el cliente reenvía con `{ confirmar: true }`

---

Ver también: [[SCHEMA]], [[ARQUITECTURA]]
