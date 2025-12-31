# Decisiones de Arquitectura y Pendientes

**Ultima actualizacion:** 2025-12-12

> **IMPORTANTE:** Ver `docs/REQUERIMIENTOS_COMPLETOS.md` para el alcance total del sistema.
> Este documento registra decisiones tecnicas. El de requerimientos define hacia donde vamos.

---

## PENDIENTES DE EVALUACION

### 1. Eliminar tabla `salida_unidad` - Simplificar modelo de datos

**Fecha:** 2025-12-10
**Estado:** PENDIENTE - Requiere validacion con Operaciones
**Prioridad:** Media

#### Situacion Actual
Existe la tabla `salida_unidad` que actua como "contenedor" del dia de trabajo:
```
asignacion_unidad
    └── salida_unidad (¿redundante?)
            ├── situacion
            ├── situacion
            └── ingreso_sede
```

#### Propuesta de Simplificacion
Tratar la salida como una situacion mas (tipo `SALIDA_INICIAL`):
```
asignacion_unidad (contenedor del dia)
    ├── situacion (SALIDA_INICIAL) → km_inicial, combustible_inicial, hora
    ├── situacion (PATRULLAJE) → km, hora
    ├── situacion (INCIDENTE) → km, hora, datos...
    ├── situacion (INGRESO_SEDE) → km, combustible, motivo, hora
    └── situacion (FINALIZACION_JORNADA) → km_final, combustible_final, hora
```

#### Argumentos a favor de eliminar `salida_unidad`:
1. **Redundancia de datos:**
   - Tripulacion → ya esta en `tripulacion_turno` / `brigada_unidad`
   - Unidad → ya esta en `asignacion_unidad`
   - Fecha → ya esta en `turno.fecha`

2. **La salida PUEDE ser una situacion:** Si agregamos tipo `SALIDA_INICIAL` con campos `km_inicial`, `combustible_inicial`, funcionaria igual.

3. **El ingreso final ya guarda datos finales:** `km_ingreso`, `combustible_ingreso` en ingreso con motivo FINALIZACION_JORNADA.

4. **Multiples salidas en un dia:** No es problema, cada salida seria una situacion `SALIDA_INICIAL` separada.

#### Problema pendiente - REQUIERE VALIDACION CON OPERACIONES:
**Consultas historicas de rendimiento:** Si Operaciones necesita consultar datos como:
- "Todos los abastecimientos de combustible de la unidad en el ultimo anio"
- "Kilometraje promedio por salida"
- "Rendimiento de combustible por unidad"

Con el modelo simplificado, estos datos quedarian en `bitacora_historica` como texto/JSON, lo cual dificulta queries SQL directos.

**Posibles soluciones:**
1. Agregar columnas calculadas a tabla `unidad` (rendimiento_promedio, etc.)
2. Crear tabla de metricas separada que se actualice con cada evento relevante
3. Mantener `salida_unidad` solo para datos de rendimiento

#### Accion requerida:
- [ ] Consultar con Operaciones que reportes/calculos necesitan de datos historicos
- [ ] Definir si necesitan queries SQL directos o si reportes JSON son suficientes
- [ ] Tomar decision final sobre eliminar o mantener `salida_unidad`

---

## CAMBIOS REALIZADOS

### 2025-12-12 - Cambiar Tipo de Situación (INCIDENTE <-> ASISTENCIA_VEHICULAR)

**Problema resuelto:** Las brigadas a veces se equivocan al crear una situación como INCIDENTE cuando debería ser ASISTENCIA_VEHICULAR, o viceversa. Antes no podían cambiar el tipo después de crearla.

**Solución implementada:**

**Backend - Nuevo endpoint:**
- `PATCH /api/situaciones/:id/cambiar-tipo`
- Parámetros: `nuevo_tipo` ('INCIDENTE' | 'ASISTENCIA_VEHICULAR'), `motivo` (opcional)
- Validaciones: Solo permite cambio entre estos 2 tipos específicos
- Registra cambio en tabla `auditoria_cambios` (si existe)
- Protegido con middleware `canEditSituacion`

**Archivos modificados:**
- `backend/src/controllers/situacion.controller.ts` - Nueva función `cambiarTipoSituacion()`
- `backend/src/routes/situaciones.routes.ts` - Nueva ruta

**Mobile - UI en BitacoraScreen:**
- Botón "Cambiar a Asistencia/Incidente" visible en cards de situaciones tipo INCIDENTE o ASISTENCIA_VEHICULAR
- Modal de confirmación con campo opcional de motivo
- Actualiza lista automáticamente después del cambio

**Archivos modificados:**
- `mobile/src/store/situacionesStore.ts` - Nueva función `cambiarTipoSituacion()`
- `mobile/src/screens/brigada/BitacoraScreen.tsx` - Modal y botón de cambio de tipo

**Correcciones adicionales en esta sesión:**
- `backend/src/controllers/turno.controller.ts` - Eliminada variable no usada `turno`
- `backend/src/controllers/evento.controller.ts` - Prefijo `_` para parámetro no usado
- `backend/src/models/evento.model.ts` - Eliminado código duplicado y muerto
- `mobile/src/screens/brigada/BitacoraScreen.tsx` - Corregido `loadSituaciones` → `fetchMisSituacionesHoy`
- `mobile/src/screens/brigada/MiAsignacionScreen.tsx` - Agregado optional chaining a `tripulacion`

---

### 2025-12-12 - Sistema de Eventos Persistentes (Larga Duracion)

**Funcionalidad:** Gestion de eventos que duran multiples dias/turnos (derrumbes, obras, manifestaciones).

**Nueva tabla `evento_persistente`:**
- Tipos: DERRUMBE, OBRA, MANIFESTACION, ACCIDENTE_GRAVE, EVENTO_NATURAL, OTRO
- Estados: ACTIVO, FINALIZADO, CANCELADO
- Importancia: BAJA, MEDIA, ALTA, CRITICA
- Vinculacion con ruta y coordenadas

**Nueva columna en `situacion`:**
- `evento_persistente_id` - Vincula situaciones individuales a eventos mayores

**Archivos nuevos:**
- `backend/src/models/evento.model.ts` - Modelo con CRUD y asignacion de unidades
- `backend/src/controllers/evento.controller.ts` - Controller REST
- `backend/src/routes/evento.routes.ts` - Rutas `/api/eventos`
- `web/src/pages/EventosPage.tsx` - UI completa con modal de creacion y asignacion

**Migraciones:**
- `060_eventos_persistentes.sql` - Tabla y columna FK
- `061_update_view_situaciones_eventos.sql` - Actualiza vistas

**Endpoints:**
- `GET /api/eventos/activos` - Lista eventos activos con conteo de unidades
- `GET /api/eventos` - Historial paginado
- `POST /api/eventos` - Crear evento
- `PATCH /api/eventos/:id` - Actualizar evento
- `POST /api/eventos/:id/asignar` - Asignar unidad a evento (crea situacion vinculada)

---

### 2025-12-12 - Bitacora Web para COP/Operaciones

**Funcionalidad:** Vista web de bitacora por unidad para operadores.

**Archivo nuevo:** `web/src/pages/BitacoraPage.tsx`
- Timeline visual de situaciones
- Filtro por cantidad de registros (20/50/100)
- Informacion de ruta, km, estado, tripulacion
- Recarga manual

**Ruta:** `/bitacora/:unidadId`

---

### 2025-12-12 - Soporte para Unidades de Reaccion

**Funcionalidad:** Unidades sin ruta fija inicial que se asignan dinamicamente.

**Cambios:**
- Nueva columna `es_reaccion BOOLEAN` en `asignacion_unidad`
- `ruta_id` ahora es nullable (DROP NOT NULL)
- Vista `v_asignaciones_completas` actualizada con campo `es_reaccion`

**Migracion:** `052_add_es_reaccion.sql`

**Flujo:**
1. COP crea asignacion con `es_reaccion = true` y sin ruta
2. Brigada al iniciar salida DEBE seleccionar ruta inicial
3. Ruta se actualiza en asignacion_unidad

---

### 2025-12-12 - Modo Edicion en IncidenteScreen

**Funcionalidad:** Ahora los incidentes pueden ser editados desde la Bitacora.

**Cambios en IncidenteScreen.tsx:**
1. Agregado `useRoute` para recibir parametros `editMode`, `incidenteId`
2. Nuevo estado `loadingData` para mostrar carga al editar
3. En modo edicion:
   - Carga datos del incidente desde API `/incidentes/:id`
   - Mapea tipo_hecho_id a nombre legible
   - Carga vehiculos, gruas, ajustadores existentes
   - Mantiene coordenadas originales
   - Draft save deshabilitado en modo edicion
4. Submit diferenciado:
   - Modo creacion: `POST /incidentes`
   - Modo edicion: `PATCH /incidentes/:id`
5. GPS no se obtiene automaticamente en modo edicion

**Interfaz de ruta:**
```typescript
type IncidenteScreenRouteProp = RouteProp<{
    IncidenteScreen: {
        editMode?: boolean;
        incidenteId?: number;
        situacionId?: number;
    };
}, 'IncidenteScreen'>;
```

**Archivo:** `mobile/src/screens/brigada/IncidenteScreen.tsx`

---

### 2025-12-12 - Fix Crashes por Valores Undefined

**Problema:** App crasheaba sin logs al interactuar con formularios.
**Causa:** TextInput y Switch de React Native Paper no toleran `undefined` en value prop.
**Solucion:** Agregar `|| ''` a TextInputs y `|| false` a Switches.

**Documentacion completa:** Ver `docs/FIX_CRASHES_UNDEFINED_VALUES.md`

**Archivos afectados:**
- `mobile/src/components/VehiculoForm.tsx`
- `mobile/src/components/PlacaInput.tsx`
- `mobile/src/components/GruaForm.tsx`
- `mobile/src/components/AjustadorForm.tsx`
- `mobile/src/components/ObstruccionManager.tsx`
- `mobile/src/screens/brigada/IncidenteScreen.tsx`
- `mobile/src/screens/brigada/AsistenciaScreen.tsx`
- `mobile/src/screens/brigada/EmergenciaScreen.tsx`

---

### 2025-12-12 - Mejoras Web Dashboard y Asignaciones

**Dashboard:**
- Agregado boton de recarga manual con animacion de giro
- Muestra timestamp de ultima actualizacion
- Evita perder sesion al recargar pagina completa

**CrearAsignacionPage:**
- Agregado buscador de brigadas en modal de seleccion
- Filtra por nombre, chapa o telefono

---

### 2025-12-11 - Fix Situaciones y Ingresos Huerfanos

**Problema encontrado:** Despues de finalizar jornada, al crear nueva asignacion:
1. El card de "Finalizando Jornada" seguia apareciendo
2. La bitacora mostraba situaciones de la jornada anterior

**Causas raiz:**
1. La funcion `finalizar_jornada_completa()` NO cerraba los ingresos activos (no ponia `fecha_hora_salida`)
2. Las situaciones NO guardaban `salida_unidad_id`, solo `unidad_id`
3. El query de bitacora filtraba por `unidad_id + fecha`, no por `salida_unidad_id`
4. La vista `v_situaciones_completas` no tenia la columna `salida_unidad_id`
5. El store hacia refresh de ingresoActivo en paralelo con salidaActiva (race condition)

**Soluciones implementadas:**
1. **Funcion PostgreSQL `finalizar_jornada_completa()`:** Ahora cierra ingresos activos antes de finalizar
2. **Modelo `situacion.model.ts`:** Ahora guarda `salida_unidad_id` al crear situaciones
3. **Controller `situacion.controller.ts`:** Ahora recibe y pasa `salida_unidad_id`
4. **Funcion `getMiUnidadHoy()`:** Ahora filtra por `salida_unidad_id` si existe salida activa
5. **Vista `v_situaciones_completas`:** Agregada columna `salida_unidad_id` (migracion 048)
6. **authStore.ts - refreshIngresoActivo():** Ahora primero verifica si hay salidaActiva
7. **authStore.ts - refreshEstadoBrigada():** Ahora espera salidaActiva antes de refrescar ingresoActivo

**Archivos modificados:**
- `backend/src/models/situacion.model.ts` - Agregado salida_unidad_id al INSERT y getMiUnidadHoy
- `backend/src/controllers/situacion.controller.ts` - Agregado import SalidaModel, pasa salida_unidad_id
- `mobile/src/store/authStore.ts` - refreshIngresoActivo verifica salidaActiva, refreshEstadoBrigada espera salidaActiva
- Funcion PostgreSQL `finalizar_jornada_completa` - Cierra ingresos antes de finalizar

**Migraciones:**
- `048_fix_vista_situaciones_completas.sql` - Agrega salida_unidad_id a la vista
- `049_finalizar_jornada_elimina_datos.sql` - Al finalizar, elimina situaciones, ingresos y salida (despues del snapshot)
- `050_eliminar_trigger_primera_situacion.sql` - Elimina trigger que exigia SALIDA_SEDE como primera situacion (no aplica, salida va en salida_unidad)

**Flujo correcto de finalizar_jornada_completa():**
1. Cerrar ingresos activos
2. Marcar salida como FINALIZADA
3. Crear snapshot en bitacora_historica (con todos los datos)
4. Eliminar tripulacion_turno, asignacion_unidad, turno (tablas operacionales)
5. **NUEVO:** Eliminar situaciones de la salida
6. **NUEVO:** Eliminar ingresos de la salida
7. **NUEVO:** Eliminar la salida misma

**Datos corregidos manualmente:**
- Ingresos huerfanos cerrados
- Situaciones huerfanas eliminadas
- Salidas finalizadas eliminadas

### 2025-12-10 - Flujo de Finalizacion de Jornada (2 pasos)

**Problema resuelto:** El tipo de ingreso `FINALIZACION_JORNADA` finalizaba automaticamente la jornada.

**Solucion implementada:**
1. `FINALIZACION_JORNADA` es solo un MOTIVO de ingreso, NO finaliza automaticamente
2. La finalizacion REAL ocurre cuando el usuario pulsa boton "Finalizar Jornada" en Home
3. Fix en `ingreso.controller.ts`: `esIngresoFinal = es_ingreso_final === true` (solo flag explicito)

**Flujo correcto:**
| Paso | Accion Usuario | Backend | BD |
|------|----------------|---------|-----|
| 1 | IngresoSedeScreen → FINALIZACION_JORNADA | `registrar_ingreso_sede()` con es_ingreso_final=FALSE | INSERT ingreso_sede, unidad queda EN SEDE |
| 2 | BrigadaHomeScreen → Boton "Finalizar Jornada" | `POST /api/salidas/finalizar-jornada` | DELETE de turno, asignacion_unidad, tripulacion_turno + snapshot en bitacora_historica |

**Archivos modificados:**
- `backend/src/controllers/ingreso.controller.ts` - Fix logica esIngresoFinal
- `backend/src/controllers/salida.controller.ts` - Nueva funcion finalizarJornadaCompleta()
- `backend/src/models/salida.model.ts` - Nueva funcion finalizarJornadaCompleta()
- `backend/src/routes/salida.routes.ts` - Nueva ruta POST /api/salidas/finalizar-jornada
- `mobile/src/screens/brigada/BrigadaHomeScreen.tsx` - Card "En Sede" con botones correctos
- `mobile/src/screens/brigada/IngresoSedeScreen.tsx` - Motivos actualizados, UI mejorada

### 2025-12-10 - Correccion UI/UX Pantallas Brigada

**Cambios:**
1. **NuevaSituacionScreen:** Eliminado campo "descripcion", dejando solo "observaciones"
2. **BitacoraScreen:** Fix edicion de datos de salida (ahora carga datos actuales)
3. **Todas las pantallas:** Agregado margin inferior (paddingBottom: 80) para evitar botones del telefono
4. **NuevaSituacionScreen:** Agregado KeyboardAvoidingView para que teclado no tape inputs
5. **BrigadaHomeScreen:** Botones correctos cuando esta en sede con FINALIZACION_JORNADA:
   - Finalizar Jornada (rojo)
   - Ver Bitacora (azul)
   - Salir de Sede/Cancelar (gris)

### 2025-12-10 - Tablas de Bitacora Historica

**Nuevas estructuras:**
- Tabla `bitacora_historica` particionada por anio (2024, 2025, 2026)
- Funcion `crear_snapshot_bitacora()` - Crea snapshot JSON
- Funcion `finalizar_jornada_completa()` - Marca salida como FINALIZADA + snapshot + DELETE de tablas operacionales

**Migraciones:**
- 046_create_bitacora_historica.sql
- 047_finalizar_jornada_con_snapshot.sql

### 2025-12-10 - Constraint SENTIDO actualizado

**Cambio:** Agregados valores 'ORIENTE' y 'OCCIDENTE' al constraint de sentido en tabla situacion.

```sql
ALTER TABLE situacion DROP CONSTRAINT situacion_sentido_check;
ALTER TABLE situacion ADD CONSTRAINT situacion_sentido_check
CHECK (sentido IN ('NORTE', 'SUR', 'ESTE', 'OESTE', 'ORIENTE', 'OCCIDENTE', 'ASCENDENTE', 'DESCENDENTE', 'AMBOS'));
```

### 2025-12-10 - Precision de kilometraje aumentada

**Cambio:** Columnas de kilometraje aumentadas de NUMERIC(8,2) a NUMERIC(10,2) para soportar valores mayores.

**Tablas afectadas:**
- `ingreso_sede`: km_ingreso, km_salida_nueva
- `salida_unidad`: km_inicial, km_final, km_recorridos
- `bitacora_historica`: km_inicial, km_final, km_recorridos

---

## REFERENCIAS RAPIDAS

### Tablas Operacionales (se eliminan al finalizar jornada)
- `turno` - Planificacion diaria
- `asignacion_unidad` - Asignaciones de turnos
- `tripulacion_turno` - Tripulantes por asignacion

### Tablas de Registro (datos permanentes)
- `salida_unidad` - Salidas realizadas (PENDIENTE: evaluar eliminacion)
- `ingreso_sede` - Ingresos a sede
- `situacion` - Eventos durante salida

### Tablas Historicas
- `bitacora_historica` - Snapshots JSON por dia/unidad

### Usuario de prueba
- Chapa: 19109
- ID: 568
- Password: password123
- Unidad asignada: 030 (ID 406)

---

## NOTAS PARA FUTURAS SESIONES

1. **Siempre actualizar este documento** al hacer cambios significativos de arquitectura
2. **Consultar con Operaciones** antes de eliminar `salida_unidad`
3. **La tabla `salida_activa` es una VISTA**, no una tabla fisica
4. **El flujo de finalizacion es de 2 pasos**: ingreso FINALIZACION_JORNADA + boton Finalizar
