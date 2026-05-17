# Esquema de Base de Datos — PROVIAL

> Fuente de verdad: PostgreSQL en Railway  
> Conexión: `maglev.proxy.rlwy.net:31911/railway`  
> Actualizado: 2026-04-29

---

## Índice por dominio

- [[#Usuarios y Acceso]]
- [[#Organización]]
- [[#Operacional (Core)]]
- [[#Situaciones — Detalle]]
- [[#Transportes]]
- [[#Notificaciones]]
- [[#Auditoría y Bitácora]]
- [[#Catálogos]]
- [[#Vistas principales]]
- [[#Funciones clave]]

---

## Usuarios y Acceso

### `usuario`
Tabla central de usuarios. Reemplazó a `brigada` (migración 129).

| Columna                 | Tipo            | Notas                                         |
| ----------------------- | --------------- | --------------------------------------------- |
| id                      | integer PK      |                                               |
| chapa                   | varchar         | Identificador único de brigada (ej. "BR-001") |
| nombre_completo         | varchar(150)    |                                               |
| email                   | varchar         | Único                                         |
| password_hash           | varchar         | bcrypt                                        |
| rol                     | varchar         | Rol principal (string, redundante con rol_id) |
| rol_id                  | integer FK→rol  |                                               |
| sede_id                 | integer FK→sede | Sede base del usuario                         |
| activo                  | boolean         |                                               |
| created_at / updated_at | timestamptz     |                                               |

**Roles válidos:** `BRIGADA`, `OPERACIONES`, `COP`, `TRANSPORTES`, `ADMIN`, `SUPER_ADMIN`, `ENCARGADO_NOMINAS`, `MANDOS`, `ACCIDENTOLOGIA`, `COMUNICACION_SOCIAL`

### `rol` / `rol_permiso` / `permiso`
Sistema de permisos granular por módulo.

```
rol (id, nombre, descripcion, permisos jsonb)
  └── rol_permiso (rol_id FK, permiso_id FK)
        └── permiso (id, nombre, modulo)
```

### `control_acceso_app`
Controla qué usuarios pueden usar la app móvil. Tabla de whitelist.

### `dispositivo_autorizado` / `dispositivo_blacklist`
Control de dispositivos móviles. La clave canónica `device_id` es el **UUID del dispositivo** (iOS Vendor ID o Android ID) — NO el IMEI, que no es accesible en iOS/Android moderno (ver D-019).

`dispositivo_autorizado`:
- `device_id` — UUID del SO (unique key). Estados: `PENDIENTE`, `APROBADO`, `BLOQUEADO`.
- Si el UUID llega por primera vez, se inserta como `PENDIENTE` y el backend devuelve 403.
- El admin aprueba el dispositivo en el panel `/admin/dispositivos`.

`dispositivo_blacklist`:
- `clave` — combinación `IP::UUID`. Se inserta automáticamente al superar el rate limit (120 req/min).
- `activo` — permite remover de la blacklist sin borrar el registro histórico.

---

## Organización

### `sede`
Sede física de ProVial.

| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| codigo | varchar(20) | Ej. "SC", "SAN-CRIS" |
| nombre | varchar(100) | |
| departamento_id | integer FK→departamento | Usar esto, no `departamento` varchar (DEPRECATED) |
| municipio_id | integer FK→municipio | Usar esto, no `municipio` varchar (DEPRECATED) |
| es_sede_central | boolean | |
| codigo_boleta | varchar(10) | Para numeración accidentología |
| activa | boolean | |

### `ruta`
Carreteras/tramos asignados a las unidades.

| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| codigo | varchar(20) | Ej. "CA-1", "CA-9" |
| nombre | varchar(150) | |
| tipo_ruta | varchar | CARRETERA / AUTOPISTA / BOULEVARD |
| km_inicial / km_final | numeric(6,2) | Rango kilométrico |
| activa | boolean | |

### `turno`
Día operativo planificado por Operaciones.

| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| fecha | date | Día del turno |
| fecha_fin | date | Para turnos multi-día |
| estado | varchar | PLANIFICADO / ACTIVO / CERRADO |
| sede_id | integer FK→sede | |
| created_at | timestamptz | |

```
turno (1)
  └── asignacion_unidad (N) — cada unidad en ese turno
        └── tripulacion_turno (N) — cada brigadista en esa asignación
```

### `turno` — columnas adicionales
| Columna           | Tipo               | Notas                                            |
| ----------------- | ------------------ | ------------------------------------------------ |
| publicado         | boolean            | false = borrador (solo OPERACIONES/ADMIN lo ven) |
| fecha_publicacion | timestamptz        | Cuándo se publicó                                |
| publicado_por     | integer FK→usuario |                                                  |
| creado_por        | integer FK→usuario | Usuario que creó el turno                        |

### `asignacion_unidad`
Una unidad específica dentro de un turno.

| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| turno_id | integer FK→turno | NOT NULL |
| unidad_id | integer FK→unidad | **NULLABLE** — Operaciones puede crear sin unidad; Transportes la asigna después |
| ruta_id | integer FK→ruta | Ruta asignada |
| tipo_asignacion | varchar | PATRULLA / GARITA (PUESTO_CONTROL eliminado) |
| estado_nomina | varchar | null / BORRADOR / LIBERADA |
| acciones | text | Actividades específicas |
| acciones_formato | text | Versión con formato rich-text |
| sentido | varchar | Norte / Sur / etc. |
| km_inicio / km_final | numeric | Recorrido programado |
| hora_salida / hora_entrada_estimada | time | |
| dia_cerrado | boolean | El día ya fue cerrado operacionalmente |
| fecha_cierre | timestamptz | Cuándo se cerró |
| observaciones_finales | text | Motivo de cancelación u observaciones al cerrar |

**Regla de publicación:** `publicarTurno()` bloquea si hay asignaciones PATRULLA con `unidad_id IS NULL` (lanza `MISSING_UNITS`). Crear sin unidad está permitido; publicar no.

### `aviso_asignacion`
Avisos manuales sobre una asignación (advertencias, info, urgentes). Creada en migración 142.

| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| asignacion_id | integer FK→asignacion_unidad ON DELETE CASCADE | |
| tipo | varchar(20) | ADVERTENCIA / INFO / URGENTE |
| mensaje | text | |
| color | varchar(20) | Hex, default #f59e0b |
| creado_por | integer FK→usuario | |
| created_at | timestamptz | |

### `tripulacion_turno`
Cada brigada en una asignación de turno.

| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| asignacion_id | integer FK→asignacion_unidad | |
| usuario_id | integer FK→usuario | |
| rol_tripulacion | varchar | PILOTO / COPILOTO / ACOMPAÑANTE |
| es_comandante | boolean | Solo uno por asignación |
| telefono_contacto | varchar | Teléfono para ese día |

---

## Operacional (Core)

### `salida_unidad`
Registro de cada salida real de una unidad a campo. Una por día operativo.

| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| unidad_id | integer FK→unidad | |
| fecha_hora_salida | timestamptz | |
| fecha_hora_regreso | timestamptz | NULL si sigue en campo |
| estado | varchar | **EN_SALIDA** / FINALIZADA / CANCELADA |
| ruta_inicial_id | integer FK→ruta | |
| km_inicial / km_final | numeric | Odómetro |
| combustible_inicial / combustible_final | numeric(5,2) | 0.0–1.0 (VACIO→LLENO) |
| km_recorridos | numeric(10,2) | Calculado |
| tripulacion | jsonb | Snapshot de la tripulación al salir |
| sede_origen_id | integer FK→sede | Sede desde donde salió |
| inspeccion_360_id | integer FK→inspeccion_360 | Inspección asociada |
| origen | varchar | APP / COP_EMERGENCIA |
| finalizada_por | integer FK→usuario | |

### `salida_evento`
Auditoría operacional: cada edición, cambio de ruta, inicio COP, etc.

| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| salida_id | integer FK→salida_unidad | |
| tipo | varchar | EDICION_KM / EDICION_COMBUSTIBLE / CAMBIO_RUTA / INICIO_COP / CIERRE_SITUACION |
| descripcion | text | Legible para humanos |
| datos_ant / datos_new | jsonb | Estado antes/después |
| realizado_por | integer FK→usuario | |
| created_at | timestamptz | |

### `situacion`
Situación operativa reportada. Tabla polimórfica: un solo modelo cubre HECHO_TRANSITO, ASISTENCIA, EMERGENCIA, SALIDA_SEDE, y más.

| Columna | Tipo | Notas |
|---|---|---|
| id | bigint PK | |
| codigo_situacion | text | ID determinista offline-first: `YYYYMMDD-SEDE-UNIDAD-TIPO-RUTA-KM-NUM` |
| tipo_situacion | varchar(50) | Tipo macro (HECHO_TRANSITO, ASISTENCIA, EMERGENCIA, etc.) |
| tipo_situacion_id | integer FK→catalogo_tipo_situacion | Tipo específico del catálogo |
| estado | varchar | **ACTIVA** / CERRADA / CANCELADA / EN_PAUSA / FINALIZADA |
| unidad_id | integer FK→unidad | |
| salida_unidad_id | integer FK→salida_unidad | |
| ruta_id / km / sentido / area | varios | Ubicación vial |
| latitud / longitud | numeric | Coordenadas GPS |
| departamento_id / municipio_id | integer FK | |
| observaciones | jsonb `[]` | Array de `{hora, usuario, mensaje}` |
| fecha_hora_aviso / llegada / finalizacion | timestamptz | |
| heridos / heridos_leves / heridos_graves / fallecidos / ilesos / trasladados / fugados | integer | Conteo de víctimas |
| danios_materiales / danios_infraestructura | boolean | |
| obstruccion_data | jsonb | Datos de obstrucción (v2) |
| **persistente** | boolean | `true` si fue promovida a situación persistente |
| titulo / descripcion / importancia | varchar | Para situaciones persistentes |
| km_fin / fecha_fin_estimada | various | Para situaciones persistentes |
| promovido_por | integer FK→usuario | Quién la promovió a persistente |
| origen | varchar | BRIGADA / USUARIO_PUBLICO / CENTRO_CONTROL |
| clima / carga_vehicular / area / tipo_pavimento | varchar | Condiciones del entorno. `carga_vehicular`: FLUIDO/MODERADO/DENSO/CONGESTIONADO |
| via_estado / via_topografia / via_geometria / via_peralte / via_condicion | varchar | Detalle de vía (solo HECHO_TRANSITO) |
| draft_created_at | timestamptz nullable | Cuándo se creó el draft en la app móvil. NULL si fue creado desde panel web. Ver D-021 |
| creado_por / actualizado_por | integer FK→usuario | |

**Nota**: No hay tabla `situacion_persistente` separada. Las situaciones persistentes son `situacion WHERE persistente = true`.

### `actividad`
Actividades operativas simples (patrullaje, puesto fijo, apoyo, etc.). Añadida migración 121.

| Columna | Tipo | Notas |
|---|---|---|
| id | bigint PK | |
| codigo_actividad | text UNIQUE | ID determinista enviado por el móvil para idempotencia |
| tipo_actividad_id | integer FK→catalogo_tipo_situacion | formulario_tipo = 'ACTIVIDAD' o 'NOVEDAD' |
| unidad_id / salida_unidad_id / ruta_id | FK | |
| estado | varchar | ACTIVA / CERRADA |
| observaciones | jsonb `[]` | Timeline igual que situacion |
| datos | jsonb `{}` | Datos específicos del tipo (conteos, velocidades, etc.) |
| clima | varchar(50) | Condición climática al momento del registro |
| carga_vehicular | varchar(50) | Nivel de tráfico |
| departamento_id | integer FK→departamento | **Mig 147** — ubicación geográfica |
| municipio_id | integer FK→municipio | **Mig 147** — ubicación geográfica |
| closed_at | timestamptz | |
| creado_por | integer FK→usuario | |

### `situacion_actual`
**Cache de estado actual** — una fila por unidad. Actualizada por triggers.

| Columna | Tipo | Notas |
|---|---|---|
| unidad_id | integer PK FK→unidad | |
| situacion_id | bigint FK→situacion | Situación activa actual (NULL si libre) |
| actividad_id | bigint FK→actividad | Actividad activa actual |
| tipo_situacion / estado / km / sentido / ruta_id | varios | Caché de la situación |
| actividad_tipo_nombre / actividad_estado | varchar | Caché de la actividad |
| latitud / longitud | numeric | Última posición conocida |
| updated_at | timestamptz | |

### `ingreso_sede`
Cada vez que una unidad ingresa a una sede durante su jornada.

| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| salida_unidad_id | integer FK→salida_unidad | |
| sede_id | integer FK→sede | Sede a la que ingresó |
| tipo_ingreso | varchar(30) | COMBUSTIBLE / COMISION / APOYO / ALMUERZO / MANTENIMIENTO / **FINALIZACION_JORNADA** / INGRESO_TEMPORAL |
| fecha_hora_ingreso | timestamptz | |
| fecha_hora_salida | timestamptz | NULL si sigue ingresada |
| km_ingreso / combustible_ingreso | varios | Al entrar |
| km_salida_nueva / combustible_salida_nueva | varios | Al salir de nuevo |
| **es_ingreso_final** | boolean | TRUE si este ingreso es el que cierra la jornada |
| observaciones_ingreso / observaciones_salida | text | |
| registrado_por | integer FK→usuario | |

**Flujo jornada:**
1. `POST /ingresos/registrar` — cualquier motivo, `es_ingreso_final = false` siempre
2. `POST /ingresos/finalizar-jornada` — solo con ingreso activo tipo `FINALIZACION_JORNADA`, marca `es_ingreso_final = true` y llama `finalizar_jornada_completa()`

### `situacion_persistente_asignacion`
Unidades asignadas a una situación persistente.

| Columna | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| situacion_id | integer FK→situacion | `WHERE persistente = true` |
| unidad_id | integer FK→unidad | |
| asignacion_unidad_id | integer FK→asignacion_unidad | |
| km_asignacion | numeric(8,2) | |
| fecha_hora_asignacion / fecha_hora_desasignacion | timestamptz | NULL desasignacion = activa |
| asignado_por | integer FK→usuario | |

---

## Situaciones — Detalle

### `situacion_vehiculo`
Junction entre `situacion` y `vehiculo`. Datos específicos del vehículo en el accidente.

| Columna | Tipo | Notas |
|---|---|---|
| id | bigint PK | |
| situacion_id | bigint FK→situacion | |
| vehiculo_id | integer FK→vehiculo | Master del vehículo (upsert por placa) |
| piloto_id | integer FK→piloto | Master del piloto (upsert por licencia) |
| estado_piloto | varchar | ILESO / HERIDO_LEVE / HERIDO_GRAVE / FALLECIDO |
| datos_piloto | jsonb | Snapshot del piloto al momento |
| heridos_en_vehiculo / fallecidos_en_vehiculo | integer | |
| danos_estimados | text | |
| sancion | varchar | |
| custodia | boolean | Si la unidad quedó bajo custodia |

### `vehiculo`
Master de vehículos involucrados en accidentes. Upsert por placa.

| Columna | Notas |
|---|---|
| placa | Unique |
| marca_id FK→marca_vehiculo | |
| tipo, color, año, cilindraje | |
| total_incidentes / total_sanciones | Contadores por trigger |

### `piloto`
Master de pilotos. Upsert por `licencia_numero`.

| Columna | Notas |
|---|---|
| licencia_numero | Unique bigint |
| licencia_tipo | A/B/C/M/E |
| total_incidentes / total_sanciones | Contadores por trigger |

### `autoridad`
Autoridades/socorro presentes en una situación.

| Columna | Notas |
|---|---|
| situacion_id FK→situacion | |
| tipo | Ej. "PNC", "Bomberos", "Cruz Roja" |
| **categoria** | **AUTORIDAD** (PNC, MP, etc.) / **SOCORRO** (Bomberos, Cruz Roja) |
| hora_llegada / hora_salida | |
| datos | jsonb |

### `persona_accidente`
Personas involucradas en accidentes (peatones, pasajeros).

| Columna | Notas |
|---|---|
| situacion_id FK→situacion | |
| situacion_vehiculo_id FK | Opcional, si iba en un vehículo |
| tipo_persona | CONDUCTOR / PASAJERO / PEATON |
| estado | ILESO / HERIDO_LEVE / HERIDO_GRAVE / FALLECIDO |

### `situacion_multimedia`
Fotos y videos de situaciones y actividades.

| Columna | Notas |
|---|---|
| situacion_id FK→situacion | NULL si es de actividad |
| actividad_id FK→actividad | NULL si es de situación |
| tipo | FOTO / VIDEO |
| url_original / url_thumbnail | Cloudinary o filesystem local (ver D-032) |
| infografia_numero | INT default 1 — grupo al que pertenece el archivo |
| infografia_titulo | VARCHAR nullable — título del grupo |
| orden | INT nullable — posición dentro de la infografía (FOTO) |
| estado | `SUBIDO` / `PENDIENTE` / `ERROR` — los 4 controllers directos y `guardarReferenciasCloudinary` guardan `SUBIDO`. El frontend usa `estado='SUBIDO'` para clasificar items como históricos (solo lectura). |
| subido_por FK→usuario | |

---

## Transportes

### `unidad`
Vehículo institucional de ProVial.

| Columna | Notas |
|---|---|
| id | PK |
| codigo | Único, ej. "U-01", "R-03" |
| tipo_unidad | PATRULLA / REACCION / GRUA / etc. |
| sede_id FK→sede | Sede base |
| disponible_transportes | boolean — si transportes la marcó disponible |
| instrucciones_transportes | text — razón si no disponible |
| activa | boolean |

### `inspeccion_360`
Inspección vehicular pre-salida.

| Columna | Notas |
|---|---|
| unidad_id FK→unidad | |
| salida_id FK→salida_unidad | NULL hasta que se asocie con salida |
| plantilla_id FK→plantilla_inspeccion_360 | |
| estado | PENDIENTE / APROBADA / RECHAZADA |
| respuestas | jsonb — respuestas al formulario |
| realizado_por / aprobado_por FK→usuario | |
| fecha_aprobacion | timestamptz |

**Regla**: Solo inspecciones con `estado='APROBADA'` y `fecha_aprobacion > NOW()-24h` y `salida_id IS NULL` se asocian automáticamente al iniciar salida.

### `unidad_reparacion`
Períodos en taller.

| Columna | Notas |
|---|---|
| unidad_id FK→unidad | |
| fecha_entrada / fecha_salida | date |
| motivo / descripcion | |
| activa | boolean — si sigue en taller |

---

## Notificaciones

### `dispositivo_push`
Tokens FCM/Expo de cada usuario.

| Columna | Notas |
|---|---|
| usuario_id FK→usuario | |
| push_token | varchar(255) unique por usuario |
| plataforma | ios / android |
| activo | boolean |

### `notificacion`
Historial de notificaciones enviadas.

| Columna | Notas |
|---|---|
| usuario_id FK→usuario | |
| tipo | varchar(50) |
| titulo / mensaje | |
| datos | jsonb |
| enviada / leida | boolean |
| error_envio | text — razón si falló |

---

## Auditoría y Bitácora

### `bitacora_historica`
Snapshot de jornadas finalizadas. Particionada por año:
- `bitacora_historica_2024`
- `bitacora_historica_2025`
- `bitacora_historica_2026`

### `auditoria_log`
Log general de cambios en el sistema.

### `registro_cambio`
Cambios específicos a entidades (antes/después).

---

## Catálogos

### `catalogo_tipo_situacion`
El catálogo más importante. Define qué formulario usa cada tipo de evento.

| Columna | Notas |
|---|---|
| nombre | Nombre visible |
| formulario_tipo | **INCIDENTE** / **ASISTENCIA** / **EMERGENCIA** / **ACTIVIDAD** / **NOVEDAD** / SALIDA_SEDE / etc. |
| icono / color | Para la UI |
| categoria | Agrupación visual |
| activo | boolean |

**Regla**: Si `formulario_tipo = 'ACTIVIDAD'` o `'NOVEDAD'` → va a tabla `actividad`. Todo lo demás → tabla `situacion`.

### Otros catálogos
- `departamento` / `municipio` — geografía de Guatemala
- `marca_vehiculo` — marcas de vehículos
- `causa_hecho_transito` — causas de accidentes (migración 116)
- `dispositivo_seguridad` — dispositivos de seguridad vial (migración 115)
- `ruta` — también actúa como catálogo de carreteras

---

## Vistas principales

| Vista | Propósito |
|---|---|
| `v_mi_salida_activa` | Salida activa del usuario actual — usada por `resolveContextoActivo` |
| `v_mi_asignacion_hoy` | Asignación de turno del día para el usuario |
| `v_unidades_en_salida` | Todas las unidades actualmente en campo |
| `v_brigadas_activas_ahora` | Brigadas con salida activa ahora |
| `v_disponibilidad_recursos` | Estado de disponibilidad de unidades y personal |
| `v_composicion_unidades_ahora` | Tripulación actual de cada unidad |
| `v_situacion_decodificada` | Situaciones con joins a catálogos |
| `v_turnos_completos` | Turnos con asignaciones y tripulación |
| `v_historial_inspecciones_360` | Historial de inspecciones por unidad |
| `v_asignaciones_por_sede` | Asignaciones agrupadas por sede — base del dashboard de Operaciones. Todos los JOINs son LEFT JOIN; soporta `unidad_id = NULL`. Columnas: turno_id, fecha, turno_estado, publicado, sede_*, asignacion_id, unidad_*, ruta_*, km_inicio/km_final, sentido, acciones, acciones_formato, hora_salida, estado_nomina, en_ruta, salida_estado, asignacion_created_at |
| `v_asignaciones_pendientes` | Asignaciones en turnos no CERRADO — sin filtro de fecha |

---

## Funciones clave

| Función | Propósito |
|---|---|
| `iniciar_salida_unidad(unidad_id, ruta_id, km, combustible, obs)` | Crea `salida_unidad`, **elimina** fila de `situacion_actual` de jornadas anteriores (mig 147). El trigger la recreará al registrar la primera situación/actividad. |
| `finalizar_salida_unidad(salida_id, km, combustible, obs, user_id)` | Marca salida FINALIZADA, calcula km_recorridos |
| `finalizar_jornada_completa(salida_id, km, combustible, obs, user_id)` | Cierra salida + crea snapshot bitácora + limpia tablas operacionales. Retorna `{success, bitacora_id, mensaje}` |
| `fn_actualizar_situacion_actual()` | Trigger — sincroniza `situacion_actual` cuando cambia una situación |
| `fn_actualizar_situacion_actual_actividad()` | Trigger — UPSERT atómico (`INSERT … ON CONFLICT unidad_id DO UPDATE`) en `situacion_actual` cuando cambia una actividad (mig 147) |
| `fn_limpiar_situacion_actual_unidad(unidad_id)` | Limpia los campos de `situacion_actual` para una unidad |
| `registrar_ingreso_sede(...)` | Registra ingreso validando UNIQUE de ingreso activo |
| `fn_promover_a_persistente(situacion_id, user_id)` | Marca `situacion.persistente = true` |
| `validar_disponibilidad_unidad(unidad_id, fecha)` | Verifica que la unidad no tenga salida activa |
| `validar_disponibilidad_unidad_fecha(unidad_id, fecha)` | Retorna `(disponible bool, mensaje text)` — maneja `unidad_id = NULL` retornando disponible=true |
| `validar_disponibilidad_brigada(usuario_id, fecha)` | Retorna `(disponible bool, mensaje text, dias_descanso int)` — creada en migración 141; chequea inactividad y asignación existente |
| `cerrar_dia_operativo(asignacion_id, user_id)` | Cierra el día operativo de una asignación |

---

## Tablas eliminadas / ya no existen

| Tabla | Eliminada en | Reemplazada por |
|---|---|---|
| `brigada` | Migración 129 | `usuario` (datos migrados) |
| `brigada_unidad` | Migración 129 | `tripulacion_turno` |
| `situacion_persistente` | Migración 108 | `situacion WHERE persistente = true` |
| `incidente` | Migración 105 | `situacion` (integrada) |

---

## Notas importantes para queries

```sql
-- Timezone siempre America/Guatemala (UTC-6)
-- Railway corre en UTC, la app en GMT-6
DATE(campo AT TIME ZONE 'America/Guatemala') = $1::date

-- Combustible: decimal 0.0-1.0
-- LLENO=1.0, 3/4=0.75, 1/2=0.50, 1/4=0.25, VACIO=0.0

-- Contexto activo de un usuario (brigada)
SELECT * FROM v_mi_salida_activa WHERE brigada_id = $1

-- Ingreso activo de una salida
SELECT * FROM ingreso_sede
WHERE salida_unidad_id = $1 AND fecha_hora_salida IS NULL
LIMIT 1

-- Situaciones persistentes
SELECT * FROM situacion WHERE persistente = true

-- Named params pg-promise: $/param/ (no $1, $2 en queries con muchos parámetros)
```
