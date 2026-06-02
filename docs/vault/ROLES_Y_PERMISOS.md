---
tags: [roles, permisos, seguridad, auth]
---

# Roles y permisos — PROVIAL

## Regla global

`SUPER_ADMIN` **siempre pasa** el middleware `authorize()`, sin importar los roles listados.  
El middleware `authenticate` rechaza con **401** si el JWT falta o expiró.  
El middleware `authorize(...roles)` rechaza con **403** si el rol del usuario no está en la lista.

---

## Matriz de permisos por módulo

### Autenticación

| Endpoint | Roles permitidos |
|----------|-----------------|
| `POST /auth/login` | Público |
| `POST /auth/logout` | Cualquier autenticado |
| `POST /auth/refresh` | Cualquier autenticado |
| `POST /auth/reset-password` | Público |

---

### Salidas

| Endpoint | Roles permitidos | Notas |
|----------|-----------------|-------|
| `GET /salidas/mi-salida-activa` | BRIGADA | Solo la salida propia |
| `GET /salidas/mi-salida-hoy` | BRIGADA | Solo la salida propia |
| `POST /salidas/iniciar` | BRIGADA | Requiere inspeccion_360 previa |
| `POST /salidas/cambiar-ruta` | BRIGADA, COP, OPERACIONES, ADMIN | BRIGADA usa su ctx activo; otros pasan unidad_id |
| `PATCH /salidas/editar-datos-salida` | BRIGADA | Edita km/combustible de su salida activa |
| `POST /salidas/cop/iniciar-unidad` | COP, OPERACIONES, ADMIN | Dar salida desde asignación publicada — acepta `asignacion_id` opcional; si se pasa, usa datos del plan (ruta, tripulación) y actualiza turno a ACTIVO igual que brigada desde móvil |
| `POST /salidas/cop/salida-emergencia` | COP, OPERACIONES, ADMIN | Crea turno + asignacion + tripulacion + salida en una sola transacción atómica. `resolveContextoActivo` funciona para la brigada desde el móvil después de este inicio |
| `POST /salidas/:id/finalizar` | COP, ADMIN, SUPER_ADMIN | Override administrativo — **NO BRIGADA**. Marca FINALIZADA + crea snapshot bitácora |
| `GET /salidas/admin/unidades-en-salida` | COP, OPERACIONES, ADMIN | |
| `GET /salidas/historial/:unidadId` | Cualquier autenticado | |
| `GET /salidas/bitacora/:unidadId` | COP, OPERACIONES, ADMIN, SUPER_ADMIN | |
| `GET /salidas/bitacora-dia` | COP, OPERACIONES, ADMIN, SUPER_ADMIN, ENCARGADO_NOMINAS | |
| `GET /salidas/bitacora-timeline/:salidaId` | COP, OPERACIONES, ADMIN, SUPER_ADMIN, ENCARGADO_NOMINAS | |
| `POST /salidas/relevos` | BRIGADA, COP, OPERACIONES | |
| `GET /salidas/relevos/:situacionId` | Cualquier autenticado | |

---

### Ingresos a sede

| Endpoint | Roles permitidos | Notas |
|----------|-----------------|-------|
| `POST /ingresos/registrar` | BRIGADA | Ingresos durante la jornada |
| `POST /ingresos/finalizar-jornada` | BRIGADA | **Único endpoint para finalizar jornada** |
| `GET /ingresos/mis-ingresos-hoy` | BRIGADA | Solo sus propios ingresos |
| `GET /ingresos/:id` | Cualquier autenticado | |

---

### Turnos

| Endpoint | Roles permitidos |
|----------|-----------------|
| `GET /turnos/mi-asignacion-hoy` | BRIGADA |
| `POST /turnos/registrar-combustible` | BRIGADA |

---

### Situaciones

| Endpoint | Roles permitidos | Notas |
|----------|-----------------|-------|
| `POST /situaciones` | BRIGADA, COP | |
| `GET /situaciones` | COP, OPERACIONES, ADMIN | |
| `GET /situaciones/:id` | Cualquier autenticado | |
| `PATCH /situaciones/:id` | COP, OPERACIONES, ADMIN + creador + tripulación activa | Middleware `canEditSituacion` |
| `DELETE /situaciones/:id` | COP, ADMIN, SUPER_ADMIN | |
| `POST /situaciones/:id/vehiculos` | BRIGADA, COP | |
| `POST /situaciones/:id/personas` | BRIGADA, COP | |

---

### Unidades

| Endpoint | Roles permitidos | Notas |
|----------|-----------------|-------|
| `GET /unidades` | TRANSPORTES, ADMIN, ENCARGADO_NOMINAS | **NO COP, NO BRIGADA**; ENCARGADO_NOMINAS sin `puede_ver_todas_sedes` solo ve su sede |
| `GET /unidades/activas` | COP, BRIGADA, OPERACIONES, ADMIN | ENCARGADO_NOMINAS: solo su sede |
| `GET /unidades/tipos` | TRANSPORTES, ADMIN | |
| `GET /unidades/:id` | TRANSPORTES, ADMIN | |
| `POST /unidades` | TRANSPORTES, ADMIN | |
| `PUT /unidades/:id` | TRANSPORTES, ADMIN | |
| `PUT /unidades/:id/activar` | TRANSPORTES, ADMIN | |
| `PUT /unidades/:id/desactivar` | TRANSPORTES, ADMIN | |
| `PUT /unidades/:id/transferir` | TRANSPORTES, ADMIN | Valida que la sede destino exista |
| `DELETE /unidades/:id` | ADMIN, SUPER_ADMIN | Bloqueado si tiene historial en `asignacion_unidad` |
| `GET /unidades/:id/ultima-asignacion` | TRANSPORTES, ADMIN | |
| `GET /unidades/:codigo/reservar-numero-salida` | BRIGADA | Offline-first: siguiente num_situacion_salida |
| `PUT /unidades/:id/disponibilidad-transportes` | TRANSPORTES, ADMIN | |
| `GET /reparaciones/activas` | TRANSPORTES, ADMIN | Filtrado por sede del usuario |
| `GET /reparaciones/unidad/:id` | TRANSPORTES, ADMIN | |
| `POST /reparaciones` | TRANSPORTES, ADMIN | Valida que no haya reparación activa previa |
| `PATCH /reparaciones/:id/completar` | TRANSPORTES, ADMIN | Solo estado EN_REPARACION |
| `PATCH /reparaciones/:id/cancelar` | TRANSPORTES, ADMIN | Solo estado EN_REPARACION |
| `GET /reparaciones/historial/:unidadId` | TRANSPORTES, ADMIN | UNION ALL: combustible + salidas + reparaciones |

---

### Inspección 360

| Endpoint | Roles permitidos | Notas |
|----------|-----------------|-------|
| `POST /inspeccion360` | BRIGADA | Auto-aprueba si el usuario es comandante único de la unidad |
| `GET /inspeccion360/:id` | BRIGADA, COP, TRANSPORTES, ADMIN | |
| `POST /inspeccion360/:id/aprobar` | COP, ADMIN | |
| `GET /inspeccion360/pendientes` | TRANSPORTES, OPERACIONES, ADMIN | TRANSPORTES/OPERACIONES ven solo las suyas |
| `GET /inspeccion360/historial/:unidadId` | TRANSPORTES, ADMIN | |
| `GET /inspeccion360/historial/:unidadId/pdfs` | TRANSPORTES, ADMIN | Guard NaN en `dias`/`limite`; máx 90 días / 100 registros |
| `GET /inspeccion360/:id/pdf` | TRANSPORTES, ADMIN | Datos unidad+inspector+comandante en `Promise.all` |
| `GET /inspeccion360/verificar-unidad/:unidadId` | BRIGADA, TRANSPORTES | |

---

### Actividades

| Endpoint | Roles permitidos |
|----------|-----------------|
| `POST /actividades` | BRIGADA, COP |
| `GET /actividades` | COP, OPERACIONES, ADMIN |
| `PATCH /actividades/:id` | BRIGADA (propia), COP, ADMIN |
| `POST /actividades/:id/cerrar` | BRIGADA, COP |

---

### Administración

| Endpoint | Roles permitidos |
|----------|-----------------|
| `GET /admin/*` | ADMIN, SUPER_ADMIN |
| `POST /roles/*` | SUPER_ADMIN |
| `GET /auditoria/*` | ADMIN, SUPER_ADMIN |
| `GET /dashboard/*` | COP, OPERACIONES, ADMIN, SUPER_ADMIN, MANDOS |
| `GET /admin/dispositivos` | ADMIN, SUPER_ADMIN |

---

### Operaciones (planificación)

| Endpoint | Roles permitidos |
|----------|-----------------|
| `GET /grupos/estado/hoy` | Cualquier autenticado |
| `GET /grupos/estado/:grupo` | Cualquier autenticado |
| `GET /grupos/:grupo/calendario` | Cualquier autenticado |
| `POST /grupos/:grupo/estado` | OPERACIONES, ADMIN |
| `PATCH /grupos/:grupo/calendario/:fecha` | OPERACIONES, ADMIN |
| `PATCH /grupos/brigadas/:usuario_id/grupo` | OPERACIONES, ADMIN |
| `PATCH /grupos/brigadas/:usuario_id/exento` | ADMIN |
| `POST /asignaciones` | OPERACIONES, ADMIN, SUPER_ADMIN | Crear asignación programada sin unidad (flujo nuevo) |
| `GET /asignaciones` | OPERACIONES, ADMIN, SUPER_ADMIN, TRANSPORTES | Listar asignaciones filtradas por sede |
| `GET /asignaciones/mi-asignacion` | Todos (autenticados) | Brigada ve su próxima asignación |
| `GET /asignaciones/:id` | Todos (autenticados) | Detalle con tripulación |
| `PUT /asignaciones/:id/cancelar` | OPERACIONES, ADMIN, SUPER_ADMIN | Soft-close: dia_cerrado=true |
| `GET /asignaciones-avanzadas/por-sede` | ADMIN, OPERACIONES, COP, ENCARGADO_NOMINAS | Dashboard de sedes — borradores solo para ADMIN/OPERACIONES/ENCARGADO_NOMINAS/TRANSPORTES. COP lo usa en `/cop/asignaciones` para ver pendientes del día |
| `POST /asignaciones-avanzadas/turno/:id/publicar` | OPERACIONES, ADMIN | Bloquea si MISSING_UNITS (PATRULLA sin unidad) |


---

### Movimientos de brigada (`/movimientos`) — dominio COP

Decisiones en tiempo real durante el turno activo. COP crea/finaliza; Operaciones/Mandos solo leen.

| Endpoint | Roles permitidos | Notas |
|----------|-----------------|-------|
| `GET /movimientos/mis-movimientos/activos` | BRIGADA | Solo propios (app móvil) |
| `POST /movimientos` | COP, MANDOS, ADMIN, SUPER_ADMIN | Valida destino activo y tipo_movimiento |
| `PATCH /movimientos/:id/finalizar` | COP, MANDOS, ADMIN, SUPER_ADMIN | Falla si ya finalizado |
| `PATCH /movimientos/:id` | COP, MANDOS, ADMIN, SUPER_ADMIN | Solo motivo/observaciones — `aprobado_por` inmutable |
| `DELETE /movimientos/:id` | ADMIN, SUPER_ADMIN | Solo si `hora_fin IS NULL` |
| `GET /movimientos` | COP, OPERACIONES, MANDOS, ADMIN, SUPER_ADMIN | Historial con filtros |
| `GET /movimientos/:id` | COP, OPERACIONES, MANDOS, ADMIN, SUPER_ADMIN | |
| `GET /movimientos/usuario/:id/activos` | COP, OPERACIONES, MANDOS, ADMIN, SUPER_ADMIN | |
| `GET /movimientos/composicion/unidades` | COP, OPERACIONES, MANDOS, ADMIN, SUPER_ADMIN | Vista `v_composicion_unidades_ahora` |
| `GET /movimientos/composicion/unidad/:id` | COP, OPERACIONES, MANDOS, ADMIN, SUPER_ADMIN | |

**Tipos válidos**: `CAMBIO_UNIDAD`, `PRESTAMO`, `DIVISION_FUERZA`, `RELEVO`, `RETIRO`, `APOYO_TEMPORAL`

---

### Acceso COP (`/cop/acceso`)

> Rutas controladas por `cop/acceso.controller.ts` + middlewares `canGestionarAcceso` / `isAdminCop`.

| Endpoint | Roles permitidos | Middleware adicional |
|----------|-----------------|---------------------|
| `GET /cop/acceso/brigadas/activas` | COP, OPERACIONES, MANDOS, ADMIN, SUPER_ADMIN | — |
| `GET /cop/acceso/brigadas/por-grupo/:grupo` | COP, OPERACIONES, MANDOS, ADMIN, SUPER_ADMIN | — |
| `GET /cop/acceso/brigadas/:usuario_id/acceso` | COP, OPERACIONES, MANDOS, ADMIN, SUPER_ADMIN | — |
| `PATCH /cop/acceso/brigadas/:usuario_id/acceso` | COP, OPERACIONES, MANDOS, ADMIN, SUPER_ADMIN | `canGestionarAcceso` |
| `GET /cop/acceso/delegaciones` | COP, ADMIN, SUPER_ADMIN | `isAdminCop` |
| `POST /cop/acceso/delegaciones` | COP, ADMIN, SUPER_ADMIN | `isAdminCop` |
| `DELETE /cop/acceso/delegaciones/:id` | COP, ADMIN, SUPER_ADMIN | `isAdminCop` |

**Tabla involucrada**: `delegacion_permiso_cop(id, otorgado_a, otorgado_por, permiso, activo, revocado_en, revocado_por)`

---

### Transportes (asignación de unidades)

| Endpoint | Roles permitidos | Notas |
|----------|-----------------|-------|
| `GET /transportes/asignaciones/pendientes` | TRANSPORTES, ADMIN, SUPER_ADMIN, ADMIN_TRANSPORTES | Filtra por sede si no es ADMIN |
| `GET /transportes/asignaciones/unidades-disponibles` | TRANSPORTES, ADMIN, SUPER_ADMIN, ADMIN_TRANSPORTES | Excluye unidades en taller |
| `PUT /transportes/asignaciones/:id/unidad` | TRANSPORTES, ADMIN, SUPER_ADMIN, ADMIN_TRANSPORTES | Inyecta `unidad_id` en borrador; 3 validaciones atómicas |

**Errores semánticos devueltos**: `UNIDAD_NO_DISPONIBLE_O_EN_TALLER` (400), `UNIDAD_YA_ASIGNADA_EN_ESTA_FECHA` (400), `ASIGNACION_NO_ENCONTRADA` (404)

---

### Accidentología

| Endpoint | Roles permitidos |
|----------|-----------------|
| `GET /accidentologia/*` | ACCIDENTOLOGIA, COP, ADMIN |
| `POST /accidentologia` | ACCIDENTOLOGIA, COP |
| `GET /estadisticas/*` | ACCIDENTOLOGIA, ADMIN, MANDOS |
| `POST /admin/import-excel` | ADMIN, SUPER_ADMIN |

---

### Comunicación Social

| Endpoint | Roles permitidos | Notas |
|----------|-----------------|-------|
| `GET /comunicacion-social/plantillas` | COMUNICACION_SOCIAL, ADMIN | Soporta filtros tipo_situacion, tipo_accidente, incluir_inactivas |
| `POST /comunicacion-social/plantillas` | COMUNICACION_SOCIAL, ADMIN | nombre ≤ 200 chars, contenido_plantilla ≤ 5000 chars, ambos trim+required |
| `PUT /comunicacion-social/plantillas/:id` | COMUNICACION_SOCIAL, ADMIN | Rechaza plantillas predefinidas (es_predefinida=true) |
| `DELETE /comunicacion-social/plantillas/:id` | COMUNICACION_SOCIAL, ADMIN | Ídem |
| `POST /comunicacion-social/plantillas/:id/preview` | COMUNICACION_SOCIAL, ADMIN | Genera mensaje via PG function `generar_mensaje_plantilla` |
| `POST /comunicacion-social/publicaciones` | COMUNICACION_SOCIAL, ADMIN | contenido_texto trim+required |
| `POST /comunicacion-social/publicaciones/desde-plantilla` | COMUNICACION_SOCIAL, ADMIN | Genera contenido + crea BORRADOR |
| `GET /comunicacion-social/estadisticas` | COMUNICACION_SOCIAL, ADMIN | 3 paneles: INCIDENTE, ASISTENCIA, EMERGENCIA con por_subtipo cruzado |
| `GET /comunicacion-social/snapshot` | COMUNICACION_SOCIAL, ADMIN | Estado actual: situaciones activas + actividades + unidades EN_SALIDA |
| `GET /comunicacion-social/estado-unidades` | COMUNICACION_SOCIAL, ADMIN | Boletín por ruta: detalle por unidad + plantillas activas |

**Notas de modelo:**
- `obtenerFotosSituacion` usa `situacion_multimedia` (columnas `url_original`, `url_thumbnail`) — **no** `foto_situacion`
- Las consultas de snapshot y boletín viven en `ComunicacionSocialModel`, no en el controller
- Variables de plantilla: `{fecha}`, `{hora}`, `{ubicacion}`, `{km}`, `{municipio}`, `{departamento}`, `{tipo}`, `{descripcion}`, `{heridos}`, `{fallecidos}`, `{vehiculos}`, `{tipo_accidente}`

---

### Reasignaciones inter-sede

Tabla `reasignacion_sede` con `tipo = 'USUARIO' | 'UNIDAD'`. Toda reasignación es por definición inter-sede (origen ≠ destino).

| Endpoint | Roles (lectura) | Roles (escritura) | Notas |
|----------|----------------|------------------|-------|
| `GET /reasignaciones/activas` | COP, OPERACIONES, ADMIN, MANDOS, TRANSPORTES | — | Solo tipo=USUARIO |
| `POST /reasignaciones` | — | ADMIN, SUPER_ADMIN | Requiere puedeGestionarReasignaciones; rechaza si en turno activo o ya reasignado |
| `POST /reasignaciones/:id/finalizar` | — | ADMIN, SUPER_ADMIN | Verifica tipo=USUARIO y estado=ACTIVA |
| `POST /reasignaciones/:id/cancelar` | — | ADMIN, SUPER_ADMIN | Ídem |
| `GET /transportes/reasignaciones/activas` | COP, OPERACIONES, ADMIN, MANDOS, TRANSPORTES | — | Solo tipo=UNIDAD |
| `POST /transportes/reasignaciones` | — | ADMIN, TRANSPORTES, SUPER_ADMIN | Rechaza si unidad en salida activa o ya reasignada |
| `POST /transportes/reasignaciones/:id/finalizar` | — | ADMIN, TRANSPORTES, SUPER_ADMIN | Verifica tipo=UNIDAD y estado=ACTIVA |
| `POST /transportes/reasignaciones/:id/cancelar` | — | ADMIN, TRANSPORTES, SUPER_ADMIN | Ídem |

**Invariantes:**
- `sede_origen_id === sede_destino_id` → rechaza 400 (sin sentido)
- Crear requiere `puedeGestionarReasignaciones(user)` = ADMIN || SUPER_ADMIN || puede_ver_todas_sedes
- Para USUARIO: verifica `salida_unidad.estado = 'EN_SALIDA'` via JSONB `tripulacion @> [{"usuario_id": X}]`
- Para UNIDAD: verifica `salida_unidad WHERE unidad_id = X AND estado = 'EN_SALIDA'`
- Duplicado activo: rechaza si ya existe reasignación ACTIVA para el mismo recurso

---

## Middleware `canEditSituacion` — lógica detallada

Permite editar una situación si el usuario cumple **cualquiera** de estas condiciones:

1. Rol es `COP`, `OPERACIONES`, `ADMIN` o `SUPER_ADMIN`
2. El usuario es el **creador** de la situación (`situacion.creado_por === userId`)
3. El usuario es miembro de la **tripulación activa** de la unidad de la situación (`TurnoModel.esMiembroTripulacion`)

---

## Middleware `deviceSecurity`

Valida que `X-Device-UUID` y `X-Device-IMEI` (headers enviados por la app móvil) correspondan a un dispositivo registrado y autorizado en la tabla `dispositivo_movil`. Aplica en endpoints críticos de brigada.

---

---

## Rutas del panel web (frontend React)

Protegidas por `COPRoute`, `AdminRoute`, etc. en `App.tsx`.

| Ruta | Guard | Roles |
|---|---|---|
| `/cop/mapa` | COPRoute | COP, ADMIN, SUPER_ADMIN |
| `/cop/situaciones` | COPRoute | COP, ADMIN, SUPER_ADMIN |
| `/cop/bitacora` | COPRoute | COP, ADMIN, SUPER_ADMIN |
| `/cop/bitacora-unidad` | COPRoute | COP, ADMIN, SUPER_ADMIN |
| `/cop/asignaciones` | COPRoute | COP, ADMIN, SUPER_ADMIN — **nueva** (mig 148): lista asignaciones publicadas del día listas para salir; botón "Dar salida" llama `POST /salidas/cop/iniciar-unidad`; botón "Salida de emergencia" llama `POST /salidas/cop/salida-emergencia` |

---

Ver también: [[ARQUITECTURA#Middlewares de autenticación]], [[FLUJOS]]
