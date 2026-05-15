---
tags: [patrones, buenas-practicas, convenciones, codigo]
---

# Patrones y Buenas Prácticas — PROVIAL

Reglas extraídas del código real del proyecto. Aplicar siempre. Si algo no encaja con estos patrones, documentar la excepción en [[DECISIONES]].

---

## Backend — Controllers

### P-001 normalizeId — nunca parseInt directo

```typescript
// ❌ MAL
const id = parseInt(req.params.id, 10);
const usuarioId = parseInt(req.body.usuario_id);

// ✅ BIEN
const id = normalizeId(req.params.id);
if (!id) return res.status(400).json({ error: 'ID inválido' });

const usuarioId = normalizeId(req.body.usuario_id);
if (!usuarioId) return res.status(400).json({ error: 'usuario_id inválido' });
```

`normalizeId` rechaza: `''`, `null`, `undefined`, `NaN`, `0`, negativos. Un ID válido es siempre un entero positivo.  
Para decimales (km, combustible): usar `normalizeFloat`.

---

### P-002 req.user — nunca (req as any)

El middleware `authenticate` augmenta `Express.Request` con `user?: JWTPayload`. Usar siempre:

```typescript
// ❌ MAL
const userId = (req as any).user.userId;

// ✅ BIEN
const userId = req.user!.userId;
```

---

### P-003 return en cada rama de respuesta

Sin `return`, Express puede intentar enviar dos responses y el código continúa ejecutando.

```typescript
// ❌ MAL
if (!id) res.status(400).json({ error: 'ID inválido' });
// sigue ejecutando...

// ✅ BIEN
if (!id) return res.status(400).json({ error: 'ID inválido' });
```

---

### P-004 Verificar existencia y estado antes de mutar

Antes de cualquier UPDATE o DELETE, verificar que el registro existe y está en el estado correcto.

```typescript
const existente = await Model.getById(id);
if (!existente) return res.status(404).json({ error: 'Registro no encontrado' });
if (existente.estado !== 'ACTIVA') {
  return res.status(400).json({ error: `La reasignación ya está ${existente.estado.toLowerCase()}` });
}
// ahora sí actualizar
```

---

### P-005 Inmutabilidad de campos de auditoría

`autorizado_por`, `aprobado_por`, `creado_por` **nunca** se sobreescriben en update. Eliminarlos de la firma del método `update` en el model.

```typescript
// ❌ MAL — model.update recibe aprobado_por y lo sobreescribe
async update(id: number, data: { motivo?: string; aprobado_por?: number })

// ✅ BIEN — aprobado_por no existe en update
async update(id: number, data: { motivo?: string; observaciones?: string })
```

---

### P-006 Validación de texto libre

Para campos de texto que vienen del usuario (nombre, motivo, contenido): trim + no vacío + longitud máxima.

```typescript
const nombre = (data.nombre ?? '').trim();
if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
if (nombre.length > 200) return res.status(400).json({ error: 'nombre no puede superar 200 caracteres' });
```

Límites de referencia: `nombre` → 200, `contenido_plantilla` → 5000, `motivo` → 500.

---

### P-007 Paginación con capa máxima

```typescript
const limit  = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);
const offset = parseInt(req.query.offset as string, 10) || 0;
```

Nunca dejar que el cliente solicite más de lo razonable (máximo depende del endpoint, típicamente 200-500).

---

### P-008 HTTP status codes estándar

| Situación | Código |
|-----------|--------|
| Creación exitosa | 201 |
| Operación exitosa | 200 |
| Input inválido / campo faltante | 400 |
| Token inválido / ausente | 401 |
| Sin permiso de rol o sede | 403 |
| Recurso no encontrado | 404 |
| Conflicto (duplicado, estado incorrecto, recurso en uso) | 409 |
| Error interno | 500 |

---

### P-009 Promise.all para llamadas independientes

Cuando un handler necesita múltiples datos independientes, ejecutarlos en paralelo.

```typescript
// ❌ MAL — secuencial innecesario (suma de tiempos)
const situaciones = await Model.getSituaciones();
const unidades    = await Model.getUnidades();
const plantillas  = await Model.getPlantillas();

// ✅ BIEN — paralelo (máximo de tiempos)
const [situaciones, unidades, plantillas] = await Promise.all([
  Model.getSituaciones(),
  Model.getUnidades(),
  Model.getPlantillas(),
]);
```

---

## Backend — Modelos

### P-010 Toda DB en models, nunca en controllers

```typescript
// ❌ MAL — en controller
const datos = await db.any('SELECT * FROM tabla WHERE sede_id = $1', [sedeId]);

// ✅ BIEN — en controller
const datos = await MiModel.getDatosBySede(sedeId);

// ✅ BIEN — en model
async getDatosBySede(sedeId?: number): Promise<any[]> {
  return db.any('SELECT * FROM tabla WHERE ($1::int IS NULL OR sede_id = $1)', [sedeId ?? null]);
}
```

---

### P-011 db.none / db.one / db.any — regla estricta

| Método | Cuándo usarlo | Error si... |
|--------|--------------|-------------|
| `db.none()` | INSERT/UPDATE/DELETE sin RETURNING | La query retorna filas |
| `db.one()` | SELECT o INSERT+RETURNING que devuelve exactamente 1 fila | 0 o +2 filas |
| `db.oneOrNone()` | SELECT que puede no encontrar el registro | +2 filas |
| `db.any()` | SELECT múltiple (0–N filas) | — |

**Nunca** `db.none()` con `RETURNING *`. Usarlo así lanzará error en runtime.

---

### P-012 Estructura del model — objeto exportado, no clase

```typescript
// ✅ BIEN
export const ReasignacionModel = {
  async getById(id: number): Promise<any | null> { ... },
  async crear(data: CreateData): Promise<any> { ... },
  async finalizar(id: number): Promise<any> { ... },
};

// ❌ NO — no usar clases para models en este proyecto
export class ReasignacionModel { ... }
```

---

### P-013 Interfaces de entrada para models

Definir interfaces para los datos de entrada, no usar `any` en firmas de create/update.

```typescript
export interface CreateReasignacionData {
  tipo: 'USUARIO' | 'UNIDAD';
  recurso_id: number;
  sede_origen_id: number;
  sede_destino_id: number;
  fecha_inicio: string;
  fecha_fin?: string | null;
  es_permanente: boolean;
  motivo?: string | null;
  autorizado_por: number;
}

async crear(data: CreateReasignacionData): Promise<any>
```

---

## Seguridad y Roles

### P-014 SUPER_ADMIN y sede undefined

`req.user!.sede` puede ser `undefined` para SUPER_ADMIN y ADMIN con visibilidad global. Nunca pasar `undefined` a una query esperando `NULL`.

```typescript
// ❌ MAL — undefined llega a la query
const sedeId = req.user!.sede;
await Model.getDatos(sedeId);

// ✅ BIEN — helper explícito
function puedeVerTodasSedes(user: JWTPayload): boolean {
  return !!(user.puede_ver_todas_sedes || user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN');
}
const sedeId = puedeVerTodasSedes(req.user!) ? undefined : req.user!.sede;
await Model.getDatos(sedeId); // model maneja undefined como "sin filtro"
```

En el model, el patrón para sede opcional:
```sql
WHERE ($1::int IS NULL OR sede_id = $1)
```

---

### P-015 Autorización inter-sede

Cualquier operación que mueve o afecta recursos entre sedes distintas **requiere** que `puedeVerTodasSedes(user)` sea verdadero. Un usuario OPERACIONES/TRANSPORTES de sede A no puede actuar sobre sede B.

```typescript
if (sedeOrigenId !== sedeDestinoId && !puedeVerTodasSedes(req.user!)) {
  return res.status(403).json({
    error: 'Las operaciones inter-sede requieren autorización de ADMIN o SUPER_ADMIN',
  });
}
```

---

### P-016 Clasificación de dominio de controllers

| Dominio | Criterio | Ejemplos |
|---------|---------|---------|
| `cop/` | Decisiones en tiempo real durante turnos activos | movimiento, acceso brigadas, situaciones |
| `operaciones/` | Planificación previa a los turnos | grupos, asignaciones, calendario, reasignaciones USUARIO |
| `transportes/` | Gestión de flota vehicular | unidades, inspecciones, reasignaciones UNIDAD |
| `common/` | Activo simultáneamente por BRIGADA (móvil) y COP (web) | salidas, ingresos, auth |
| `admin/` | Administración del sistema | usuarios, roles, auditoría |

La pregunta clave: "¿Quién toma esta decisión y cuándo?" Un préstamo de fuerza durante un turno activo → `cop/`. Planificar grupos para la semana → `operaciones/`.

---

### P-017 SUPER_ADMIN en authorize()

El middleware `authorize(...roles)` siempre deja pasar a `SUPER_ADMIN`. No es necesario listarlo en cada ruta, pero tampoco hace daño incluirlo para documentar el acceso:

```typescript
// Ambos son equivalentes para SUPER_ADMIN:
router.post('/', authorize('ADMIN'), handler);
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), handler);
```

---

### P-018 Verificación activa ante operaciones críticas

Antes de crear una reasignación, movimiento, o cualquier operación que bloquea un recurso, verificar que ese recurso no esté en un estado incompatible (turno activo, en reparación, ya reasignado).

```typescript
const enCampo = await ReasignacionModel.tieneRolEnSalidaActiva(recursoId);
if (enCampo) {
  return res.status(409).json({
    error: 'El personal tiene un turno en curso. Debe finalizar su jornada antes de ser reasignado.',
  });
}
```

---

## Base de datos

### P-019 Timezone Guatemala en todas las fechas

Railway corre en UTC. Toda consulta que filtre o muestre fechas debe convertir a hora Guatemala.

```sql
-- Filtrar por fecha del día en Guatemala
WHERE DATE(campo AT TIME ZONE 'America/Guatemala') = $1::date

-- Agrupar por fecha Guatemala
GROUP BY DATE(created_at AT TIME ZONE 'America/Guatemala')

-- Hora actual en Guatemala
SELECT NOW() AT TIME ZONE 'America/Guatemala'
```

---

### P-020 JSONB: búsqueda en arrays de objetos

Para buscar un elemento dentro de un array JSONB que contiene objetos, usar el operador de contención `@>`:

```sql
-- Buscar usuario en tripulacion: [{"usuario_id": 20, "chapa": "...", ...}, ...]
WHERE tripulacion @> jsonb_build_array(jsonb_build_object('usuario_id', $1::int))
```

---

### P-021 Parámetros pg-promise

```sql
-- Parámetros posicionales (SELECT / WHERE simples)
WHERE id = $1 AND sede_id = $2

-- Parámetros nombrados (INSERT / UPDATE con muchos campos)
INSERT INTO tabla (campo1, campo2) VALUES ($/campo1/, $/campo2/)
```

---

### P-022 Sede opcional en queries del model

Cuando una query puede filtrar por sede o devolver todo (para admins), usar el patrón IS NULL:

```sql
WHERE ($1::int IS NULL OR sede_id = $1)
```

Pasar `null` desde el controller cuando el usuario puede ver todas las sedes.

---

## Frontend

### P-023 Tipos para respuestas de API — nunca any en componentes

Definir interfaces para las respuestas del backend. `any` solo en capas de service/api, nunca en componentes que renderizan datos.

```typescript
// ✅ BIEN — tipo explícito en componente
interface UnidadEstado {
  unidad_id: number;
  unidad_codigo: string;
  fotos: Array<{ url_original: string; url_thumbnail: string }>;
  ...
}

// ❌ MAL — any en componente
const unidades: any[] = data.unidades;
```

---

### P-024 Fotos de situaciones — tabla correcta

Las fotos de situaciones viven en `situacion_multimedia`, no en `foto_situacion` (obsoleta).  
Columnas relevantes: `url_original`, `url_thumbnail`, `tipo = 'FOTO'`, `infografia_numero`, `orden`.

```sql
SELECT situacion_id, url_original, url_thumbnail, infografia_numero, orden
FROM situacion_multimedia
WHERE situacion_id = ANY($1::int[])
  AND tipo = 'FOTO' AND url_original IS NOT NULL
ORDER BY situacion_id, infografia_numero, orden
```

---

### P-025 catch sin tipo — nunca `catch (error: any)`

TypeScript 4+ infiere `error` como `unknown` dentro de catch. Anotar `(error: any)` silencia el compilador pero deshabilita la protección de tipos.

```typescript
// ❌ MAL
} catch (error: any) {
  return res.status(500).json({ error: error.message });
}

// ✅ BIEN
} catch (error) {
  console.error('functionName:', error);
  return res.status(500).json({ error: 'Error interno del servidor' });
}
```

Si se necesita acceder a propiedades internas en un catch secundario (warn, no HTTP): `(error as Error).message` o loguear el objeto completo.

---

### P-026 Nunca exponer `error.message` en respuestas HTTP

El mensaje interno de un error puede filtrar: nombres de columnas, queries SQL, rutas de archivo, lógica de negocio interna.

```typescript
// ❌ MAL — fuga de información
return res.status(500).json({ error: error.message });
return res.status(500).json({ error: 'Error interno', detail: error.message });

// ✅ BIEN — mensaje genérico
return res.status(500).json({ error: 'Error interno del servidor' });
```

El error real se loguea en `console.error('functionName:', error)` para diagnóstico interno.

**Excepción**: mensajes de negocio explícitos (ej. `'No se pudo determinar el contexto operativo'`) son válidos porque son texto controlado del propio código, no de la excepción capturada.

---

### P-027 Unión discriminada para conflictos de negocio en models

Cuando un model puede retornar un conflicto de negocio (no un error de BD), usar unión discriminada en lugar de lanzar excepción con `error.message.includes(...)`.

```typescript
// ❌ MAL — string matching frágil
try {
  const resultado = await SalidaModel.iniciarSalidaCOP(data);
} catch (error: any) {
  if (error.message?.includes('conflicto')) { ... }
}

// ✅ BIEN — discriminated union
type ResultadoInicio =
  | { conflict: true }
  | { salidaId: number; forzadaNoDisponible: boolean; instrucciones: any[] };

// En el controller:
const resultado = await SalidaModel.iniciarSalidaCOPCompleto(data);
if ('conflict' in resultado) {
  return res.status(409).json({ error: 'La unidad ya tiene una salida activa' });
}
// resultado.salidaId, resultado.forzadaNoDisponible, etc. son seguros aquí
```

---

### P-028 `db.any()` — nunca `db.query()` en pg-promise

`db.query()` es la API raw de node-postgres: retorna `{ rows: [] }`, no un array. En pg-promise usar siempre los métodos tipados.

```typescript
// ❌ MAL — retorna { rows: [...] }, no un array
const result = await db.query('SELECT * FROM tabla WHERE id = $1', [id]);
result.forEach(...); // TypeError: result.forEach is not a function

// ✅ BIEN
const result = await db.any('SELECT * FROM tabla WHERE id = $1', [id]);
result.forEach(...); // array real
```

Ver P-011 para la tabla completa `db.none / db.one / db.oneOrNone / db.any`.

---

---

## Situaciones y Actividades — Manual de referencia

> Estas reglas aplican a cualquier código que toque `situacion`, `actividad`, o sus endpoints. Son las causas más frecuentes de errores difíciles de rastrear.

### P-029 Leer el rol del usuario — siempre JOIN con tabla `rol`

La tabla `usuario` **no tiene columna `rol`**. El rol vive en la tabla `rol` vinculada por `usuario.rol_id`.

```typescript
// ❌ MAL — pg:42703 "column rol does not exist"
const user = await db.oneOrNone(
  'SELECT chapa, nombre_completo, rol FROM usuario WHERE id = $1',
  [userId],
);

// ✅ BIEN — JOIN con tabla rol
const user = await db.oneOrNone(
  `SELECT u.chapa, u.nombre_completo, r.nombre AS rol
   FROM usuario u
   JOIN rol r ON r.id = u.rol_id
   WHERE u.id = $1`,
  [userId],
);
```

Columnas disponibles en `usuario` relacionadas con rol:
- `rol_id` → FK a tabla `rol`
- `rol_brigada` → rol dentro de la brigada (`PILOTO` / `COPILOTO` / `ACOMPAÑANTE`), solo para BRIGADA
- `sub_rol_cop_id` → sub-rol COP, solo para COP

La función utilitaria `buildObservacionEntry(userId, observacion, hora_local?)` en `backend/src/utils/db.utils.ts` ya usa el JOIN correcto. Si necesitas la firma del usuario en otro lugar, copiar esa query.

---

### P-030 `observaciones` es JSONB `[{hora, usuario, mensaje}]` — nunca string

El campo `observaciones` en `situacion` y `actividad` es un array JSONB acumulativo. **Nunca se reemplaza, solo se appendea.**

```typescript
// ❌ MAL — rompe historial
await db.none('UPDATE situacion SET observaciones = $1 WHERE id = $2', ['nuevo texto', id]);

// ✅ BIEN — append con operador ||
await db.one(
  `UPDATE situacion
   SET observaciones = COALESCE(observaciones, '[]'::jsonb) || $1::jsonb,
       updated_at = NOW()
   WHERE id = $2 RETURNING *`,
  [JSON.stringify([{ hora: '14:32', usuario: 'PNC-001 - Juan García', mensaje: 'texto' }]), id],
);

// ✅ BIEN — usar el helper
const entrada = await buildObservacionEntry(userId, 'texto', hora_local?);
await SituacionModel.agregarObservacion(id, entrada);
```

**El campo `observaciones` fue eliminado de `SituacionModel.update`'s lista de campos dinámicos exactamente para prevenir esto.** Si ves una PR que lo reintroduce, rechazarla.

---

### P-031 Renderizar `observaciones` en React/React Native — nunca directo

`situacion.observaciones` llega del backend como `Array<{hora, usuario, mensaje}>`. Renderizarlo directamente en un `<Text>` causa el error "Objects are not valid as a React child".

```tsx
// ❌ MAL — React crash: Objects are not valid as a React child
<Text>{situacion.observaciones}</Text>

// ✅ BIEN — resumen: mostrar el mensaje de la última entrada
const ultimaObs = Array.isArray(obs)
  ? obs[obs.length - 1]?.mensaje ?? ''
  : typeof obs === 'string' ? obs : '';
<Text>{ultimaObs}</Text>

// ✅ BIEN — detalle: renderizar timeline completo
{Array.isArray(obs) && obs.map((entry, idx) => (
  <View key={idx}>
    <Text>{entry.usuario}  {entry.hora}</Text>
    <Text>{entry.mensaje}</Text>
  </View>
))}
```

**Regla de uso**: resumen → último `mensaje`. Detalle/bitácora → mapear todo el array. Nunca mezclar con el campo `descripcion`.

**Web**: usar `extractObservaciones(obs)` de `BitacoraPage.tsx` como referencia.  
**Mobile**: usar `ObservacionesManager` (component: `'ObservacionesManager'` en el FormConfig) — ya maneja timeline + input de nueva entrada.

---

### P-032 Flujos de observaciones por contexto

| Contexto | Cómo agregar | Quién firma |
|----------|-------------|-------------|
| Crear situación con nota inicial | `POST /situaciones` con `observaciones: "texto"` → controller llama `buildObservacionEntry` | Usuario autenticado real |
| Editar situación web (modal) | `PATCH /situaciones/:id` con `observaciones: "texto"` → controller hace append | Usuario autenticado real |
| Editar situación móvil | `POST /situaciones/:id/observaciones` con `{observacion, hora_local}` | Usuario autenticado real |
| Cerrar situación | `PATCH /situaciones/:id/cerrar` → model `cerrar()` hace append | `'Sistema'` (intencional) |

**El endpoint `POST /situaciones/:id/observaciones` es la única vía directa. Todos los demás flujos pasan por el controller que internamente llama `agregarObservacion`.**

---

---

### P-033 Revocación inmediata de acceso — Redis como barrera de sesión

Cuando se revoca el acceso a un usuario (individual o por grupo), solo actualizar `acceso_app_activo` en BD **no es suficiente** — el JWT sigue válido hasta su expiración (24h). La revocación completa requiere dos acciones:

```typescript
// 1. Bloquear access token activo via Redis
await cache.set(`acceso_bloqueado:${userId}`, '1', 86400);     // individual
await cache.set(`grupo_bloqueado:${userId}`, '1', 86400);      // por grupo

// 2. Revocar refresh tokens para evitar renovación
await cache.invalidatePattern(`refresh_token:${userId}:*`);
```

El middleware `authenticate` verifica ambas claves **en paralelo** (`Promise.all`) antes de aceptar cualquier request.

```typescript
// auth.ts — authenticate
const [bloqueado, grupoBloqueado] = await Promise.all([
  cache.get(`acceso_bloqueado:${payload.userId}`),
  cache.get(`grupo_bloqueado:${payload.userId}`),
]);
if (bloqueado || grupoBloqueado) return res.status(401)...
```

**Al re-habilitar** un usuario, limpiar ambas claves:
```typescript
await cache.del(`acceso_bloqueado:${userId}`);
await cache.del(`grupo_bloqueado:${userId}`);
```

**Claves distintas** por propósito: `acceso_bloqueado` = admin bloqueó individualmente. `grupo_bloqueado` = grupo pasó a DESCANSO. Limpiar solo la clave correcta al deshacer.

---

### P-034 `CrossPlatformPicker` en Android — nunca `overflow: 'hidden'`

El componente `@react-native-picker/picker` en Android renderiza texto nativo. Si el contenedor tiene `overflow: 'hidden'`, el texto del valor seleccionado queda invisible (clipeado a nivel nativo).

```typescript
// ❌ MAL — texto invisible en Android
pickerContainer: {
  borderRadius: 8,
  overflow: 'hidden',
},

// ✅ BIEN — sin overflow, el texto es visible
pickerContainer: {
  borderRadius: 8,
  // overflow: 'hidden' eliminado
},
```

---

### P-035 `useEffect` con carga inicial en componentes de captura — deps vacías

Si un `useEffect` solo debe correr en mount para cargar datos iniciales, sus deps deben ser `[]`. Si se agregan dependencias que cambian durante el uso del componente (como `initialMedia`), el efecto se re-ejecuta durante capturas y puede **resetear** el estado del usuario.

```typescript
// ❌ MAL — loop: captura foto → onChange → initialMedia cambia → resetea slots
useEffect(() => {
  if (manualMode && initialMedia.length > 0) mapMediaToSlots(initialMedia);
}, [draftUuid, manualMode, initialMedia]); // initialMedia en deps = problema

// ✅ BIEN — solo mount; initialMedia no cambia entre renders del modal
useEffect(() => {
  if (manualMode && initialMedia.length > 0) mapMediaToSlots(initialMedia);
  else if (!manualMode) loadFromDraft();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Modal siempre monta/desmonta; no hay riesgo de datos stale
```

---

### P-036 Mojibake en catálogos móviles — buscar en la BD, no en el pipeline

El pipeline `backend API → axios → catalogSync → catalogoStorage → catalogResolver` **no transforma strings**. Si aparece texto roto en los pickers de la app, el origen es siempre la fila en PostgreSQL, no el código.

```sql
-- Verificar
SELECT id, nombre FROM catalogo_tipo_situacion WHERE categoria = 'HECHO_TRANSITO';

-- Corregir (Windows terminal no envía UTF-8 — usar U& escape)
UPDATE catalogo_tipo_situacion
  SET nombre = U&'Ca\00EDda de Carga'
  WHERE id = 126;
```

El flujo entero pasa el string tal como viene: `getAllSync` → `map(t => label: t.nombre)` → picker. No hay decode/encode en ningún paso.

---

### P-037 Turno: buscar siempre por fecha + sede

Nunca llamar `findByFecha(fecha)` solo. Siempre pasar la sede:

```typescript
// ❌ MAL — ambiguo con múltiples sedes
const turno = await TurnoModel.findByFecha(fecha);

// ✅ BIEN
const turno = await TurnoModel.findByFechaYSede(fecha, req.user!.sede);
// o
const turno = await TurnoModel.findByFecha(fecha, req.user!.sede);
```

### P-039 UI móvil — react-native-paper eliminado; usar solo RN nativo + useTheme

Todos los formularios de situación usan React Native puro. `react-native-paper` no debe importarse en VehiculoForm, PersonaForm, AjustadorForm, GruaForm, VehiculoManager, AutoridadSocorroManager, SelectConOtro, CrossPlatformPicker ni en ningún componente de formulario nuevo.

**Colores**: obtener del hook `useTheme()`. Nunca usar `COLORS` estático ni valores hexadecimales hardcodeados.

```typescript
const { colors: c } = useTheme();
// Geometría → StyleSheet.create(...)
// Colores → inline: { backgroundColor: c.surface, borderColor: c.border }
```

**Accordions** — `TouchableOpacity` + `MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'}`.

**Chip-row** (selección múltiple o exclusiva):
```tsx
<TouchableOpacity style={[styles.chip, {
  backgroundColor: selected ? c.primary : c.surface,
  borderColor: selected ? c.primary : c.border,
}]}>
  <Text style={{ color: selected ? c.text.inverse : c.text.primary }}>{label}</Text>
  {selected && <MaterialCommunityIcons name="check" size={14} color={c.text.inverse} />}
</TouchableOpacity>
```

**Radio nativo** (selección exclusiva con indicador visual circular):
```tsx
<View style={[styles.radioOuter, { borderColor: selected ? c.primary : c.border }]}>
  {selected && <View style={[styles.radioInner, { backgroundColor: c.primary }]} />}
</View>
// radioOuter: width:20, height:20, borderRadius:10, borderWidth:2, alignItems/justifyContent:'center'
// radioInner: width:10, height:10, borderRadius:5
```

---

### P-040 Picker — color obligatorio en todos los `Picker.Item`

Sin `color` explícito en `Picker.Item`, el texto es invisible en iOS y puede serlo en Android en modo oscuro. Regla sin excepción:

```tsx
// iOS: itemStyle en el Picker + color en cada Item
<Picker itemStyle={{ color: c.text.primary, fontSize: 18 }}>
  <Picker.Item label="Selecciona..." value="" color={c.text.disabled} />
  <Picker.Item label="Opción A" value="A" color={c.text.primary} />
</Picker>

// Android: dropdownIconColor visible
<Picker dropdownIconColor={c.text.secondary}>
  <Picker.Item label="Opción A" value="A" color={c.text.primary} />
</Picker>
```

El contenedor del Picker en Android **nunca** lleva `overflow: 'hidden'` (ver P-034).

---

### P-041 Alert.alert para acciones destructivas en móvil

Toda eliminación de entidad (vehículo, grúa, ajustador, etc.) muestra confirmación con Alert antes de ejecutar. El alert se coloca en el *manager* o *pantalla*, nunca en el formulario hijo.

```typescript
Alert.alert(
  'Eliminar vehículo',
  '¿Deseas eliminar el vehículo 1? Se perderán todos sus datos.',
  [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => remove(index) },
  ]
);
```

**Anti-patrón — alerta doble**: si el manager ya tiene Alert en `eliminarVehiculo()`, el botón del formulario hijo NO agrega otro Alert. Un solo punto de confirmación por flujo.

---

### P-042 AutoridadSocorroManager — deselect preserva datos del detalle

Al deseleccionar una autoridad/entidad, el objeto de detalle se preserva en caché. No borrarlo — el usuario puede volver a seleccionar y perder datos ingresados.

```typescript
// ❌ MAL — borra el formulario al deseleccionar
onChange({
  seleccionados: base.filter(s => s !== nombre),
  detalles: nuevosDetalles, // donde delete nuevosDetalles[nombre]
});

// ✅ BIEN — conserva el cache al deseleccionar
onChange({
  seleccionados: base.filter(s => s !== nombre),
  detalles: { ...detalles }, // sin borrar nada
});

// Al re-seleccionar, inicializar solo si no existía antes
onChange({
  seleccionados: [...base, nombre],
  detalles: {
    ...detalles,
    [nombre]: detalles[nombre] || { nombre, hora_llegada: '', ... },
  },
});
```

---

### P-038 CalendarPicker — reemplaza input type="date" en web

Usar `<CalendarPicker>` en lugar de `<input type="date">` en todos los formularios web. La API es idéntica (valor YYYY-MM-DD, callback onChange):

```tsx
import CalendarPicker from '../../components/common/CalendarPicker';

<CalendarPicker
  label="Fecha de Salida"
  value={fecha}
  onChange={setFecha}
  min="2026-01-01"  // opcional
  required
/>
```

Soporta dark mode, locale español, navegación por meses y botón "Hoy".

---

Ver también: [[ARQUITECTURA]], [[ROLES_Y_PERMISOS]], [[DECISIONES]]
