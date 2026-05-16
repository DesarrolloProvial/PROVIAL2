---
tags: [decisiones, arquitectura, contexto]
---

# Decisiones de arquitectura — PROVIAL

Registro de decisiones no obvias que explican el **por qué** detrás de elecciones técnicas.  
Ayuda a no repetir debates ya resueltos y a entender restricciones cuando se agrega código nuevo.

---

## D-001 — Controllers en `common/` vs dominio específico

**Decisión**: Los controllers que son usados tanto por la app móvil (brigada) como por el panel COP web se ubican en `backend/src/controllers/common/`. Los exclusivos de COP van en `cop/`.

**Por qué**: El código de `salida.controller` y `ingreso.controller` sirve exactamente las mismas rutas para brigada y para COP. Duplicarlos en dos dominios crearía inconsistencias de negocio y doble mantenimiento.

**Ejemplos**:
- `common/salida.controller.ts` — usado por brigada móvil y COP web
- `common/ingreso.controller.ts` — idem
- `cop/situaciones.controller.ts` — solo COP web crea/edita situaciones desde el panel

---

## D-002 — Finalizar jornada: solo BRIGADA por móvil, override por COP

**Decisión**: `POST /ingresos/finalizar-jornada` solo tiene rol `BRIGADA`. El override administrativo es `POST /salidas/:id/finalizar` con rol `COP/ADMIN`.

**Por qué**: Operaciones, transportes y otros departamentos **no** deben poder finalizar jornadas de brigadas. El flujo correcto es que la brigada lo hace desde la app, y COP solo interviene si hay un problema operativo (unidad que no regresó, etc.).

**Implicación**: Nunca agregar otros roles al endpoint `/ingresos/finalizar-jornada`.

---

## D-003 — Atomicidad en inicio de salida con `db.tx`

**Decisión**: `SalidaModel.iniciarSalidaBrigada()` ejecuta la PG function `iniciar_salida_unidad()` + `UPDATE inspeccion_360 SET salida_id` dentro de un `db.tx` recibido desde el controller. Las actualizaciones de turno (`marcarSalida`, `updateEstado`) van fuera del tx en try/catch.

**Por qué**: Las actualizaciones de turno son operaciones secundarias no fatales. Si falla asignar el turno como `EN_CAMPO`, la salida igualmente ya fue registrada. Revertir la salida por un fallo de turno sería peor desde el punto de vista operacional.

**Refactor (abril 2026)**: Antes el SQL estaba inline en el controller. Ahora `iniciarSalidaBrigada(data, conn?)` vive en `SalidaModel` y acepta un `conn` opcional para participar en transacciones externas si se necesita. El controller ejecuta `db.tx(t => SalidaModel.iniciarSalidaBrigada(data, t))` y el model recibe `t` como conexión.

**Retorno**: `{ salidaId: number; inspeccionId: number | null }` — el controller usa `inspeccionId` directamente sin variables locales adicionales.

---

## D-004 — `parseIndicador` en lugar de función local de combustible

**Decisión**: La conversión de nivel de combustible (`'LLENO'/'3/4'/'1/2'/'1/4'/'VACIO'` → decimal 0–1) usa `parseIndicador` de `db.utils.ts`, no funciones locales en cada controller.

**Por qué**: La función existía duplicada en `salida.controller` como `convertirCombustibleADecimal`. Centralizarla en utils garantiza consistencia y evita que diferentes endpoints interpreten `'LLENO'` distinto.

---

## D-005 — `resolveContextoActivo` como fuente de verdad del contexto de brigada

**Decisión**: Para cualquier operación de brigada que necesite saber en qué salida/unidad está activa, se usa `resolveContextoActivo(userId)` que lee `v_mi_salida_activa`.

**Por qué**: Antes cada endpoint hacía su propia query para obtener `unidad_id` o `salida_id`, con variaciones sutiles. `resolveContextoActivo` estandariza esto y retorna `{ unidad_id, salida_id, ruta_id }`. Si retorna `null`, el brigada no tiene salida activa.

**Inverso**: Se usa como **guard** en `iniciarSalida` — si `ctx.salida_id` existe, la unidad ya está en salida (409).

---

## D-006 — Vault Obsidian en `docs/vault/` ignorado por git

**Decisión**: La documentación del vault vive en `docs/vault/` pero está en `.gitignore`. No se versiona.

**Por qué**: 
- Puede contener conexiones de BD, IPs internas u otro contexto sensible de desarrollo.
- Es documentación de trabajo dinámico — no necesita estar en el repo de código.
- Claude lee los archivos directamente del disco cuando los necesita.

**Consecuencia**: Al clonar el repo en una nueva máquina, hay que regenerar el vault. Mantener CLAUDE.md actualizado con la ruta del vault.

---

## D-007 — Eliminación de tabla `brigada`, `brigada_unidad`, `situacion_persistente`

**Decisión**: Estas tablas fueron eliminadas en migraciones 108, 129.

- `brigada` → datos migrados a `usuario` (campo `rol = 'BRIGADA'`)
- `brigada_unidad` → reemplazada por `tripulacion_turno`
- `situacion_persistente` → eliminada; situaciones de larga duración usan `situacion.persistente = true`

**Por qué**: La tabla `brigada` duplicaba datos de `usuario`. `tripulacion_turno` permite asignaciones más flexibles por turno. `situacion_persistente` como tabla separada complicaba queries y triggers.

**Implicación**: Nunca hacer JOIN contra estas tablas — no existen.

---

## D-008 — Sede mismatch con `confirmar: true`

**Decisión**: Si una brigada finaliza jornada en sede distinta a la asignada, el backend devuelve `{ requiere_confirmacion: true, advertencia: '...' }` con status 200 en lugar de rechazar.

**Por qué**: Es un caso operativo válido (brigada que terminó en otra sede por redistribución de emergencia). Rechazarlo automáticamente bloquearía el flujo. El doble paso (advertencia → confirmar) documenta que fue intencional.

**Código**: El cliente móvil detecta `response.data.requiere_confirmacion === true`, muestra el `Alert` con `advertencia`, y reenvía con `{ confirmar: true }`.

---

## D-009 — WebSocket solo en panel web, no en móvil

**Decisión**: La app móvil no usa Socket.io. Solo el panel web (COP, Dashboard) consume eventos en tiempo real.

**Por qué**: La app móvil opera parcialmente offline y en redes móviles inestables. Las pantallas de brigada no requieren actualizaciones push — usan polling o pull cuando el usuario navega. Mantener un socket abierto en segundo plano incrementaría el consumo de batería y complicaría la lógica offline.

---

## D-010 — `db.none()` nunca con `RETURNING`

**Decisión**: `db.none()` falla si la query retorna filas. Nunca usar `RETURNING *` con `db.none()`.

**Regla**:
- `db.none()` → INSERT/UPDATE/DELETE sin RETURNING
- `db.one()` → INSERT/UPDATE con `RETURNING <columnas>`
- `db.any()` → SELECT múltiple

**Por qué**: pg-promise lanza error si `db.none()` recibe filas inesperadas. Es una restricción de la librería, no un bug.

## D-011 — Desacoplamiento Operaciones y Transportes (Asignación de Unidades)

**Decisión**: La creación de un Turno (`turno.controller.ts`) por parte de Operaciones ya no requiere incluir la `unidad_id`. Se genera un "Borrador de Asignación". Luego, el rol de Transportes inyecta la unidad oficial en un paso posterior a través de `transportes/asignacionTransporte.controller.ts`.

**Por qué**: Operaciones planifica a nivel humano y geográfico (Brigadas, Sedes y Rutas). Transportes es el encargado técnico de decidir qué vehículo está apto mecánicamente y libre de taller en ese instante para cubrir esa ruta. Obligar a Operaciones a adivinar qué carro usar generaba bloqueos ("No puedo guardar el turno porque el carro Y sigue en ruta o en taller").

**Implicación (Fail-Closed)**: El endpoint `publicarTurno` tiene un validador estricto (`MISSING_UNITS`) que **aborta** la publicación si detecta asignaciones de tipo `PATRULLA` sin un `unidad_id` vinculado por Transportes. Nunca saldrá a la app móvil un turno de chasis fantasma.

---

## D-012 — Separación `cop/acceso` de `operaciones/grupos`

**Decisión**: Las funciones de gestión de acceso de brigada (toggle acceso individual, consultar brigadas activas) y el sistema de delegaciones se mueven a `cop/acceso.controller.ts` con ruta base `/cop/acceso`. El `grupo.controller.ts` retiene solo la gestión del calendario de grupos (estado, fechas TRABAJO/DESCANSO).

**Por qué**: El COP opera en tiempo real la suspensión de accesos (brigada que llega tarde, suspensión disciplinaria). Mezclarlo con el calendario de grupos en `operaciones/` creaba acoplamiento incorrecto entre responsabilidades distintas.

**Tabla nueva**: `delegacion_permiso_cop` — permite al `ADMIN_COP` delegar temporalmente la capacidad de suspender/activar accesos a otro COP de turno, sin escalar a un administrador del sistema.

**Middlewares**: `canGestionarAcceso` (verifica sub-rol o delegación activa) e `isAdminCop` (solo sub-rol permanente). Ambos en `middlewares/copAcceso.ts`.

---

## D-013 — `CrearAsignacionPage` sin selector de unidad

**Decisión**: El formulario de creación de asignaciones en Operaciones ya no incluye un selector de unidad vehicular para tipo PATRULLA. El campo `unidad_id` en el DTO es ahora opcional.

**Por qué**: Consecuencia directa de D-011. Forzar a Operaciones a elegir vehículo bloqueaba el formulario cuando Transportes aún no había liberado unidades. El banner informativo en la UI comunica que Transportes completará ese paso.

**Implicación**: El `useEffect` de "memoria de ruta/km" que dependía de `unidadId` fue eliminado. La restricción de tripulación para motos (máx 2) queda deshabilitada hasta que la unidad sea asignada por Transportes.

---

## D-014 — Eliminación del sistema de aprobaciones de tripulación

**Decisión**: El módulo completo de aprobaciones de tripulación (`/api/aprobaciones`) fue eliminado. Esto incluye el controller, el model, las rutas, los métodos de push notification asociados (`notificarAprobacionRequerida`, `notificarAprobacionResultado`), y las tablas de BD (`aprobacion_tripulacion`, `aprobacion_respuesta`).

**Por qué**: La complejidad operativa superaba el beneficio. El flujo requería que todos los miembros de la tripulación respondieran desde la app antes de poder iniciar/finalizar una jornada — un punto de fallo adicional en campo. Se decidió que esta validación se maneja por capacitación y protocolo interno del personal, no por código.

**Implicación**: No reimplementar ninguna variante de este sistema. Si surge la necesidad de consenso de tripulación en el futuro, evaluar primero si puede resolverse con entrenamiento o procedimiento antes de agregar código.

---

## D-015 — `editarDatosSalida` sin `db.tx` aunque inserta auditoría

**Decisión**: `SalidaModel.editarDatosSalida()` hace el UPDATE de salida y luego inserta eventos de auditoría (`salida_evento`) en secuencia, pero **sin** `db.tx`.

**Por qué**: Si el INSERT de auditoría falla, no debe revertir la actualización de km/combustible. El dato operativo es más crítico que la trazabilidad de auditoría. Perder un registro de auditoría es preferible a que el brigada vea que "su km no se guardó" y reintente.

**Implicación**: Si se agrega más lógica a `editarDatosSalida`, evaluar caso a caso si realmente necesita atomicidad con la auditoría.

---

## D-016 — `iniciarSalidaCOPCompleto` retorna unión discriminada, no lanza

**Decisión**: `SalidaModel.iniciarSalidaCOPCompleto()` retorna `{ conflict: true } | { salidaId, forzadaNoDisponible, instrucciones }`. El controller usa `'conflict' in resultado` para ramificar.

**Por qué**: La alternativa era lanzar una excepción con un mensaje que el controller luego detectaría con `error.message?.includes('conflicto')`. Eso es frágil: cualquier cambio en el texto del mensaje rompe el branch silenciosamente. La unión discriminada hace el contrato explícito y verificado por TypeScript.

**Restricción**: No cambiar el campo discriminador `conflict` ni eliminar la rama sin actualizar el controller correspondiente. Ver [[PATRONES#P-027]].

---

## D-017 — `SituacionPersistenteModel` creado en `models/cop/`

**Decisión**: Se creó `backend/src/models/cop/situacionPersistente.model.ts` con los métodos extraídos de `situacionPersistente.controller.ts`.

**Por qué**: El controller original tenía >300 líneas de SQL inline mezclado con lógica HTTP. La separación cumple P-010 (toda DB en models).

**Métodos en el model**: `list`, `getById`, `crear`, `actualizar`, `eliminar`, `getAsignaciones`, `asignar`, `desasignar`.

**Nota**: El método `crearCompleta` (que mezclaba creación + asignación en una sola llamada) fue eliminado porque combinaba dos responsabilidades distintas. El controller ahora llama `crear` + `asignar` por separado dentro de `db.tx`.

---

## D-018 — `SalidaModel` agrupa todos los métodos de salida en `common/`

**Decisión**: `backend/src/models/common/salida.model.ts` es el único lugar con SQL de salidas. `salida.controller.ts` no importa `db` directamente.

**Por qué**: El controller tenía ~500 líneas con `db.tx`, queries, auditoría y lógica de negocio entrelazadas. Imposible de testear o auditar aisladamente.

**Interfaces añadidas**: `SituacionUpdateData` — todos los campos editables de `updateSituacion` con tipos explícitos. Permite que el controller use tipado fuerte en lugar de `any`.

**Métodos añadidos al refactor (abril 2026)**:
- `getBitacoraDia(fecha, sedeId?)` — SELECT con COUNTs y situaciones_resumen para el panel de bitácora del COP
- `getBitacoraTimeline(salidaId)` — retorna `{ salida, timeline } | null` donde timeline es UNION ALL de situaciones + actividades + eventos
- `editarDatosSalida(salidaId, campos, userId)` — UPDATE dinámico + auditoría sin tx (ver D-015)
- `registrarCambioRuta(salidaId, rutaId, userId)` — captura ruta anterior, UPDATE, INSERT auditoría, actualiza `situacion_actual`
- `getSalidaActivaDeUnidad(unidadId)` — helper para obtener salida_id activa de una unidad (para flujo COP)
- `finalizarSalidaCOP(salidaId, data)` — `db.tx` con cierre de actividades + PG function + limpieza `situacion_actual`
- `iniciarSalidaBrigada(data)` → retorna `{ salidaId: number; inspeccionId: number | null }`
- `iniciarSalidaCOPCompleto(data)` → retorna unión discriminada (ver D-016)

**Métodos añadidos a `SituacionModel` (Commit 3C, abril 2026)**:
- `resolverContextoCreacion(userId, rol, hints)` — resuelve unidad/ruta/salida/FK-geo con fallbacks por rol; encapsula toda la lógica pre-tx de `createSituacion`
- `getAnteriorActiva(unidadId)` — SELECT situacion ACTIVA de la unidad (pre-tx read)
- `cerrarAnterior(id, conn)` — UPDATE estado=CERRADA dentro de tx
- `insertarCausas(situacionId, causas, conn)` — INSERT situacion_causa con try/catch (tabla puede no existir)
- `crearCompleta(data)` — `db.tx` completo: cerrar anterior + create + detalles + vehículos + autoridades + causas; retorna `{ nuevaId, anteriorId }` para que el controller emita sockets post-commit

---

---

## D-019 — Identidad de dispositivo móvil: UUID como clave canónica (sin IMEI)

**Decisión**: El campo `device_id` en `dispositivo_autorizado` y `dispositivo_blacklist` usa **solo el UUID** del dispositivo (iOS Vendor ID / Android ID). El IMEI ya no forma parte de la clave canónica.

**Por qué**:
- En iOS y Android modernos, el IMEI real es inaccesible para apps sin privilegios de sistema.
- La app generaba un "pseudo-IMEI" aleatorio (`'uuid-' + Math.random()`) que se regeneraba cada vez que AsyncStorage era limpiado (comportamiento frecuente en Expo Go durante desarrollo).
- Cada limpieza producía un nuevo `device_id = IMEI_aleatorio:UUID`, creando múltiples filas `PENDIENTE` en `dispositivo_autorizado` para el mismo dispositivo físico.
- El UUID (iOS Vendor ID / Android ID) es estable: sobrevive reinicios y reinstalaciones de la app; solo cambia en factory reset o si se eliminan todas las apps del mismo vendor en iOS.

**Cambios aplicados (abril 2026)**:
- `backend/src/middlewares/deviceSecurity.ts`: `checkWhitelistMovil` cambia `const deviceId = \`${imei}:${uuid}\`` → `const deviceId = uuid`
- `mobile/src/services/api.ts`: `getDeviceIds()` deja de generar IMEI aleatorio; retorna `{ uuid, imei: uuid }` para compatibilidad de headers. El header `X-Device-IMEI` se sigue enviando pero su valor es el UUID.
- BD: se migró la fila aprobada existente (`IMEI-...:uuid-xxx` → `uuid-xxx`) y se eliminaron 11 filas falsas `PENDIENTE` creadas por el IMEI aleatorio.

**Fix relacionado**: `mobile/src/services/api.ts` `logout()` usaba `AsyncStorage.multiRemove(['accessToken', ...])` pero el interceptor guarda el token en la clave `'token'`. Corregido a `['token', 'refreshToken', 'user']` para que el logout invalide realmente la sesión.

**Implicación**: Al aprobar un dispositivo en `dispositivo_autorizado`, el `device_id` que se ve en la tabla es el UUID del sistema operativo (no un IMEI). Un mismo dispositivo físico solo genera una fila, incluso si se reinstala la app.

---

## D-020 — Toda petición HTTP móvil usa `api.ts` (axios), prohibido `fetch()` directo

**Decisión**: Cualquier llamada HTTP desde la app móvil al backend debe hacerse a través del cliente axios en `mobile/src/services/api.ts`. Está prohibido usar `fetch()` directamente en hooks o servicios.

**Por qué**: El interceptor de `api.ts` agrega tres headers que el middleware `deviceSecurity` exige en todas las rutas:
- `X-App-Platform: mobile`
- `X-Device-UUID: <UUID>`
- `X-Device-IMEI: <UUID>`

Un `fetch()` directo no pasa por el interceptor → el backend responde `403 MISSING_OR_INVALID_PLATFORM` → el hook lo trata como error de red → el draft se guarda localmente sin enviarse.

**Problema descubierto**: `useDraftSituacion.ts` usaba `fetch()` directo en cuatro funciones: `enviarDraft`, `reservarNumero`, `resolverConflictoUsarLocal`, `resolverConflictoEsperar`. Todas se migraron a `api` en abril 2026.

**Diferencia clave `fetch` vs `api`**:
- `fetch`: `response.ok` (bool), `await response.json()` (parseo manual)
- `api` (axios con `validateStatus: status < 500`): `response.status` (número), `response.data` (ya parseado). Las respuestas 4xx no lanzan excepción.

**Implicación**: Al agregar cualquier nueva función que llame al backend, siempre importar `api` de `../services/api` y nunca usar `fetch` ni `axios` directamente.

---

## D-021 — `draft_created_at`: cuándo se creó en campo vs cuándo se subió

**Decisión**: La columna `draft_created_at TIMESTAMPTZ` (nullable) en `situacion` registra cuándo se creó el draft en la app móvil (campo), que puede diferir de `created_at` (cuando se guardó en DB) si la brigada trabajó offline y sincronizó después.

**Por qué**: El tiempo visible en la bitácora debe reflejar el momento del incidente (campo), no el momento de sincronización. Sin esta columna, un reporte offline de las 10:00 que se sube a las 18:00 aparecería con hora 18:00, confundiendo el registro operativo.

**Implementación**:
- Migración 144: `ALTER TABLE situacion ADD COLUMN IF NOT EXISTS draft_created_at TIMESTAMPTZ`
- Mobile: `useDraftSituacion.ts` envía `draft_created_at: draft.created_at` en el payload
- Backend model: `INSERT` incluye `draft_created_at` nullable
- Bitácora web: muestra "Reportado: X | Subido: Y" si difieren más de 5 minutos

---

## D-022 — Condiciones de vía: campos comunes en `general`, detalle en tab `via`

**Decisión**: Los campos básicos de condiciones (clima, área, material vía, carga vehicular) se muestran en el tab `general` para todos los tipos de situación. Los campos de detalle de vía (estado, topografía, geometría, peralte, condición superficie) solo aparecen en el tab `via` exclusivo de `HECHO_TRANSITO`.

**Por qué**: ASISTENCIA_VEHICULAR y EMERGENCIA también ocurren bajo ciertas condiciones climáticas y de tráfico relevantes para estadísticas. No tiene sentido ocultar estos 4 campos básicos. El detalle de la vía (5 campos más) sí es específico de hechos de tránsito para el informe pericial.

**Implementación**:
- `CondicionesViaFields.tsx`: agrega prop `cargaVehicular`, grid 2 columnas
- `CrearSituacionModal.tsx`: agrega `carga_vehicular` al form state; renderiza `CondicionesViaFields` en general tab cuando tipo es `ASISTENCIA_VEHICULAR` o `EMERGENCIA`
- `situacionTypes.ts`: agrega `CARGAS_VEHICULARES` (FLUIDO, MODERADO, DENSO, CONGESTIONADO)
- `SituacionUpdateData`: agrega `via_topografia`, `via_geometria`, `via_peralte`, `via_condicion`
- `updateSituacion` controller: incluye esos 4 campos en destructuración y `campos`

---

## D-023 — Matriz de campos aplicada a todos los formularios web de situación

**Decisión**: Los campos de `condiciones_detalle` (`iluminacion`, `visibilidad`, `senalizacion`, `via_estado`, `causa_probable`) solo se capturan, se muestran y se envían al backend cuando el tipo de situación es `INCIDENTE` / `HECHO_TRANSITO`. Para `ASISTENCIA_VEHICULAR` y `EMERGENCIA` estos campos están ocultos en formulario y ausentes en payload.

**Por qué**: Antes de esta decisión, `FormularioHechoTransito.tsx` se usaba como formulario compartido para HECHO_TRANSITO y ASISTENCIA_VIAL, mostrando todos los campos de vía a ambos tipos. El COP podía guardar `iluminacion = 'DIURNA'` en una asistencia vehicular, llenando la BD con datos que la bitácora ocultaría — "datos sucios sin dueño". El principio rector es: si el campo no aplica al tipo → no se renderiza → no se manda → no ensucia la bitácora.

**Cambios de mayo 2026**:
- `CondicionesViaFields.tsx`: añade props `iluminacion`, `visibilidad`, `senalizacion`; los tres se renderizan en un grid "Condiciones ambientales" solo cuando `showViaDetails={true}` (tab Via de HECHO_TRANSITO)
- `CrearSituacionModal.tsx`: los tres campos en form state, edit-load, reset y payload HECHO_TRANSITO únicamente
- `FormularioHechoTransito.tsx`: nuevo prop `tipoFormulario`; la sección "Condiciones de Vía" completa (incluyendo los tres campos) solo se muestra cuando `tipoFormulario !== 'ASISTENCIA_VIAL'`
- `EditarSituacionPage.tsx`: pasa `tipoFormulario` al formulario

**Constants centralizados** (regla transversal 7 en [[MATRIZ_CAMPOS]]):
- `ILUMINACIONES` (ya existía): `DIURNA / NOCTURNA_ILUMINADA / NOCTURNA_OSCURA / CREPUSCULO`
- `VISIBILIDADES` (nuevo): `BUENA / REGULAR / MALA / SIN_VISIBILIDAD`
- `SENALIZACIONES` (nuevo): `BUENA / REGULAR / DEFICIENTE / SIN_SENALIZACION`
- Los valores legacy inline que tenía `FormularioHechoTransito` (`DIA`, `NOCHE_CON_LUZ`, `INEXISTENTE`) fueron reemplazados. Sin impacto en BD: estos campos nunca tuvieron valores registrados.

**Dead code identificado**: `web/src/components/cop/SituacionEditModal.tsx` — ningún archivo lo importa. No se elimina por cautela hasta confirmar que no hay rutas de acceso no rastreadas.

---

## D-024 — Observaciones como timeline JSONB acumulativo

**Decisión**: El campo `observaciones` en `situacion` es un array JSONB `[{hora, usuario, mensaje}]` que solo crece — nunca se reemplaza. Cada nueva entrada se appendea con el operador `||`. El endpoint dedicado `POST /situaciones/:id/observaciones` es la única vía para agregar entradas después de la creación.

**Por qué**: Antes, dos bugs silenciosos rompían el historial:
1. El modal de edición web (`CrearSituacionModal`) enviaba `observaciones` en el PATCH body y `updateSituacion` no los procesaba — el texto se descartaba sin error.
2. La observación inicial al crear una situación se firmaba como `'Creador del Incidente'` en lugar del usuario real.

Además, `SituacionModel.update` tenía `'observaciones'` en su lista de campos dinámicos, lo que permitía reemplazar el array JSONB completo con un string plano si alguien lo llamaba directamente.

**Cambios de mayo 2026 (commit 0d648bb)**:
- `situacion.controller.ts / createSituacion`: llama `buildObservacionEntry(userId, observaciones)` antes de pasar a `crearCompleta` — observación inicial firmada con usuario real
- `situacion.controller.ts / updateSituacion`: extrae `observaciones` del body con alias `observacionNueva`, y después del PATCH hace append via `agregarObservacion` si hay texto
- `situacion.model.ts / create`: ya no re-formatea `data.observaciones` — acepta JSON pre-formateado del controller (o `'[]'` vacío)
- `situacion.model.ts / update`: `'observaciones'` eliminado de la lista de campos dinámicos para prevenir reemplazo accidental del JSONB

**Reglas fijas** (ver [[MATRIZ_CAMPOS]] §Reglas transversales):
- Cada entrada: `{hora: "HH:MM", usuario: "chapa - nombre", mensaje: "texto"}`
- Nunca sobreescribir — siempre `COALESCE(observaciones, '[]') || $entry`
- Resumen bitácora = última entrada del array (`obs[obs.length-1].mensaje`)
- Detalle = timeline completo con usuario y hora por entrada
- No mezclar con `descripcion` (campo legado, no de conversación)

**Flujos correctos post-fix**:
- Creación web/móvil con observación → `buildObservacionEntry(userId)` → `create` → JSONB con usuario real
- Edición web (modal) → PATCH payload `observaciones: "nuevo texto"` → controller hace append via `agregarObservacion`
- Edición móvil → POST `/situaciones/:id/observaciones` directo → `buildObservacionEntry` → append ✅ (ya era correcto antes)
- Cierre situación → `cerrar()` → append con `'Sistema'` como usuario (intencional para distinguir entradas de sistema)

---

Ver también: [[ARQUITECTURA]], [[FLUJOS]], [[ROLES_Y_PERMISOS]]

---

## D-025 — Revocación de sesión vía Redis para cambios de acceso en tiempo real

**Decisión**: `toggleAccesoApp`, `toggleAccesoIndividual` y `setEstadoGrupo` escriben claves en Redis además de actualizar `acceso_app_activo` en BD. El middleware `authenticate` verifica esas claves en cada request.

**Por qué**: Los JWT tienen TTL de 24h. Antes de este cambio, deshabilitar a un usuario solo actualizaba la BD — el usuario permanecía autenticado hasta que su token expirara naturalmente. Esto era un fallo de seguridad: una brigada suspendida podía seguir operando la app.

**Claves Redis**:
- `acceso_bloqueado:{userId}` — bloqueo individual (admin explícito). TTL 24h.
- `grupo_bloqueado:{userId}` — bloqueo por grupo en DESCANSO. TTL 24h.
- `refresh_token:{userId}:*` — invalidados en cascada para prevenir renovación.

**Diseño de dos claves**: permite re-habilitar a un usuario individualmente sin accidentalmente limpiar el bloqueo de su grupo, y viceversa.

**Costo**: una consulta Redis por cada request autenticado (dos `GET` en `Promise.all`). Redis es O(1) con <1ms de latencia — costo aceptable frente al beneficio de seguridad.

---

## D-026 — `DraftSituacion`: campos de condiciones de vía agregados mayo 2026

**Decisión**: Se agregaron `iluminacion`, `visibilidad`, `senalizacion`, `causa_probable`, `causa_especificar`, `via_estado` a la interfaz `DraftSituacion` en `draftStorage.ts` y al payload de `enviarDraft()` en `useDraftSituacion.ts`.

**Por qué**: Estos campos existían en el formulario (`SituacionDinamicaScreen.tsx`) y en el backend (`situacion.controller.ts`), pero la interfaz del draft no los tipaba y el payload de envío no los incluía. El formulario los guardaba via `actualizarDraft({ ...formData })` (que acepta `Partial<DraftSituacion>`) sin type error visible en runtime, pero el valor nunca llegaba al backend.

**Cómo detectar campos faltantes**: si el formulario escribe un campo via `actualizarDraft` pero el backend nunca lo recibe, verificar: (1) ¿está en `DraftSituacion`? (2) ¿está en el payload de `enviarDraft()`? Los dos deben coincidir con lo que el backend espera.

---

## D-027 — Admin panel: SUPER_ADMIN no gestionable desde AdminPanelPage

**Decisión**: Los usuarios con `rol = SUPER_ADMIN` se filtran de la tabla de usuarios en `AdminPanelPage.tsx` y del dropdown de cambio de rol.

**Por qué**: `AdminPanelPage` es accesible por `ADMIN` y `ENCARGADO_NOMINAS`. Permitirles ver o reasignar cuentas SUPER_ADMIN sería una escalación de privilegios. El SUPER_ADMIN solo se gestiona directamente en BD.

---

## D-028 — Multimedia offline: `initialMedia` solo carga en mount del modal

**Decisión**: El `useEffect` de carga inicial en `MultimediaCaptureOffline` tiene deps vacías (`[]`).

**Por qué**: El modal monta/desmonta en cada apertura (controlado por `{infografiaParaCaptura && <Modal>}`). Agregar `initialMedia` como dep causaba un loop: usuario toma foto → `onMultimediaChange` → InfografiaManager actualiza su estado → `initialMedia` cambia como nueva referencia → efecto se re-ejecuta con `slots` stale → `mapMediaToSlots` resetea el slot recién capturado.

**Consecuencia**: si en el futuro el modal pasa a ser persistente (no desmonta), habrá que usar un `ref` para `hasLoadedOnce` y cargar solo si no hay data.

Ver también: [[ARQUITECTURA]], [[FLUJOS]], [[ROLES_Y_PERMISOS]]

---

## D-029 — Mojibake en `catalogo_tipo_situacion`: corrupción en origen, no en pipeline

**Problema (mayo 2026)**: Los ítems `Ca¡da de Carga` (id=126) y `Veh¡culo Incendiado` (id=140) se mostraban rotos en los pickers de la app móvil.

**Diagnóstico**: El pipeline `getCatalogosAuxiliares → axios → syncCatalogosAuxiliares → saveTiposHecho → getAllSync → CatalogResolver.resolveTiposHecho` no toca strings. La corrupción estaba en las filas de PostgreSQL: byte `0xA1` (`¡`) almacenado donde debía ir `í` (UTF-8: `0xC3 0xAD`). Las demás 15 filas de HECHO_TRANSITO estaban correctas.

**Fix**: `UPDATE catalogo_tipo_situacion SET nombre = U&'Ca\00EDda de Carga' WHERE id = 126` (y similar para id=140). Se usó la sintaxis `U&'...'` porque el terminal Windows no envía UTF-8 a psql.

**Efecto en móvil**: `saveTiposHecho()` hace `DELETE FROM tipo_hecho` antes de insertar. La próxima sincronización de catálogos limpia el SQLite local automáticamente.

Ver también: [[PATRONES]] P-036

---

## D-030 — Turno único por fecha y sede: forzado en BD y código

**Decisión (mayo 2026)**: `turno` representa el contenedor operativo diario de una sede. La regla `1 sede + 1 fecha = 1 turno` se fuerza en dos capas:

**BD (migración 145):**
- `turno.sede_id SET NOT NULL`
- `UNIQUE INDEX uq_turno_fecha_sede ON turno(fecha, sede_id)` — la BD rechaza duplicados
- `trg_validar_asignacion_sede`: `RAISE EXCEPTION 'SEDE_MISMATCH'` si `unidad.sede_id ≠ turno.sede_id`
- `trg_validar_tripulacion_fecha_unica`: `RAISE EXCEPTION 'USUARIO_DUPLICADO'` si un brigadista aparece en dos asignaciones el mismo día

**Código:**
- `TurnoModel.findByFechaYSede(fecha, sedeId)` como método principal
- `createTurno` requiere `sede_id` (error 400 si el usuario no tiene sede)
- `createTurno` atrapa código `23505` y retorna 409 legible
- `crearAsignacionConTripulacion` valida sede antes de abrir transacción
- `createAsignacion` convierte `SEDE_MISMATCH` → 400 y `USUARIO_DUPLICADO` → 409

**Por qué dos capas**: el código da mensajes legibles; la BD es el respaldo ante llamadas directas, race conditions o futuros servicios que no pasen por el controller.

**Flujo con 3 unidades misma sede:**
```
1 turno  →  3 asignacion_unidad  →  N tripulacion_turno
```
Cada sede tiene su propio turno por fecha; sus asignaciones no se mezclan.

---

## D-032 — Almacenamiento multimedia dual: Cloudinary (Railway) vs filesystem local (VM)

**Decisión (mayo 2026)**: `multimedia.controller.ts` no llama a Cloudinary directamente. Toda subida/eliminación pasa por adaptadores internos (`subirFotoAdapter`, `subirVideoAdapter`, `eliminarArchivoAdapter`) que enrutan según `STORAGE_TYPE`.

```typescript
const IS_LOCAL = process.env.STORAGE_TYPE === 'local';

// IS_LOCAL=true → storage.service.ts (sharp, thumbnails, disco local)
// IS_LOCAL=false → cloudinary.service.ts (Cloudinary SaaS)
```

**Por qué**: En Railway, Cloudinary resuelve almacenamiento ilimitado sin gestión. En VMs institucionales no hay acceso a Cloudinary ni se quieren credenciales en la red interna. `storage.service.ts` ya tenía la implementación local completa (compresión sharp, thumbnails, writes atómicos, prevención de path traversal); solo faltaba conectarla al controller.

**Cómo cambia según entorno**:

| Variable | Railway | VM Docker |
|----------|---------|-----------|
| `STORAGE_TYPE` | `cloudinary` (o vacío) | `local` (inyectado por compose) |
| `STORAGE_BASE_URL` | no se usa (URLs de Cloudinary) | `http://<VM_HOST>/uploads` |
| Archivos almacenados | Cloudinary SaaS | volumen Docker `uploads_data` |
| Servidos por | Cloudinary CDN | nginx `/uploads/` → volumen `:ro` |

**Función `storageDisponible()`**: verifica que el storage activo esté listo. En local siempre retorna `true`. En Cloudinary verifica que las variables `CLOUDINARY_*` estén presentes.

**Endpoint `GET /api/multimedia/stats`**: devuelve `provider: 'local'` o `provider: 'cloudinary'` dinámicamente.

**Implicación para nuevos endpoints de multimedia**: siempre usar los adaptadores, nunca llamar `uploadPhotoBuffer`, `uploadVideoBuffer` o `deleteByUrl` directamente en el controller.

**Espacio en VM**: el volumen `uploads_data` vive en el disco del servidor. Para monitorear: `docker exec provial_backend du -sh /app/uploads`. Los archivos se eliminan con el endpoint `DELETE /api/multimedia/:id`.

---

## D-031 — `telefono_contacto` en `tripulacion_turno`: campo dormido por incertidumbre operativa

**Decisión**: La columna `telefono_contacto` (varchar 20, nullable) existe en `tripulacion_turno` pero no se llena ni se expone en ningún formulario. El teléfono del brigadista se lee siempre de `usuario.telefono`.

**Por qué**: No está definido si los brigadistas usarán teléfonos personales o institucionales. Si usan institucionales, el número sería el mismo para todos los días y ya estaría en el perfil. Si usan personales, podría cambiar por salida, lo que justificaría el campo. Mientras esa decisión operativa no esté tomada, no tiene sentido pedirle al despachador que ingrese un teléfono en cada asignación.

**Regla hasta que se decida**: No mostrar `telefono_contacto` en ningún formulario de asignación. Cualquier lógica que necesite contactar a un brigadista debe leer `usuario.telefono` (o `telefono_emergencia`). El campo queda en la BD como reserva sin costo.

---

## D-033 — Sistema de infografías: diseño, invariantes y errores conocidos corregidos

**Decisión (mayo 2026)**: Las fotos y videos de situaciones se agrupan en "infografías" numeradas (`infografia_numero` en `situacion_multimedia`). Cada grupo tiene un título editable y puede contener hasta 3 fotos + 1 video.

### Invariantes que deben mantenerse

**1. Todo upload debe enviar `infografia_numero`**

Los dos paths de subida deben incluir `infografia_numero` e `infografia_titulo` en el FormData/payload. Si no llegan, el backend defaultea a `infografia_numero=1` y todos los archivos se fusionan en un solo grupo.

- Path A (`multimediaSync.ts` → `guardarReferenciasCloudinary`): ya lo incluye
- Path B (`multimedia.service.ts` → `subirFoto`/`subirVideo`): se pasa como 4th arg `metadata` a `uploadPhoto`/`uploadVideo`; los callers son `useDraftSituacion.subirMultimedia` y `SituacionDinamicaScreen.subirMultimediaEdicion`

**2. `estado: 'SUBIDO'` en todos los controllers**

Los 4 controllers directos (`subirFoto`, `subirVideo`, `subirFotoActividad`, `subirVideoActividad`) y `guardarReferenciasCloudinary` deben pasar `estado: 'SUBIDO'` a `MultimediaModel.create()`. El frontend usa `estado='SUBIDO'` como señal de que el item está confirmado en storage y es de solo lectura.

**3. `transformarDatosParaFormulario` debe preservar `infografia_numero`, `infografia_titulo`, `estado`**

Al cargar una situación para edición en `SituacionDinamicaScreen`, el map de multimedia debe incluir:
```typescript
infografia_numero: m.infografia_numero || 1,
infografia_titulo: m.infografia_titulo || null,
estado: 'SUBIDO' as const,
```
Sin esto, `MultimediaWrapper` agrupa todo en infografía 1 e `isHistorical()` nunca devuelve `true`.

**4. En `MultimediaWrapper.toGroupedInfografias`: extraer título antes del skip del placeholder**

El título de una infografía vacía viaja en su placeholder ref. Si se salta el placeholder antes de leer `infografia_titulo`, el título se pierde en cada round-trip y el TextInput revierte al default.

### Dónde se habilita `InfografiaManager`

- `NuevaSituacionScreen`: todos los tipos seleccionados, excepto los cuyo `nombreTipoSeleccionado` contiene `"baño"` (check case-insensitive)
- `SituacionDinamicaScreen` via `FormBuilder`: únicamente los form configs que declaren un field `component: 'MultimediaWrapper'`. Actualmente: `HECHO_TRANSITO`, `ASISTENCIA_VEHICULAR`, `EMERGENCIA_VIAL` (archivos en `mobile/src/config/formularios/`)
- Para agregar infografías a un nuevo tipo: añadir la sección en su form config usando `component: 'MultimediaWrapper'`

### Actividades (actualizado mayo 2026)

El circuito de infografías para actividades está completo:
- `NuevaSituacionScreen` sube multimedia al crear/editar actividades usando `uploadActividadMultimedia()` en `multimediaSync.ts`
- Backend: `POST /multimedia/actividad/:id/batch` guarda referencias Cloudinary para actividades
- `actividadApi.editar()` y `actividadApi.getMultimedia()` disponibles para edición
- `BitacoraScreen`: tarjeta de actividad es presionable y navega a `NuevaSituacionScreen` en modo edición

### D-033 — Fix: loop infinito en InfografiaManager (mayo 2026)

`onChange` NO debe estar en el array de dependencias del useEffect de auto-inicialización. Si `onChange` no está memoizado (ej: arrow function en `MultimediaWrapper.handleChange`), se recrea en cada render → el efecto dispara continuamente → "Maximum update depth exceeded".

**Fix**: usar `useRef` para `onChange` y excluirlo de deps:
```typescript
const onChangeRef = useRef(onChange);
onChangeRef.current = onChange;
useEffect(() => {
  if ((!propInfografias || propInfografias.length === 0) && !disabled) {
    onChangeRef.current?.([createNewInfografia([])]);
  }
}, [propInfografias, disabled]); // sin onChange
```
