# Migración Completada: tipo_situacion_catalogo

## ✅ Cambios Realizados

### 1. Backend - Base de Datos

#### Tabla Creada
```sql
CREATE TABLE tipo_situacion_catalogo (
    id SERIAL PRIMARY KEY,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('ASISTENCIA', 'EMERGENCIA', 'HECHO_TRANSITO')),
    nombre VARCHAR(255) NOT NULL,
    icono VARCHAR(50),
    color VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Datos Cargados
- **17 HECHO_TRANSITO**: Choque, Colisión, Vuelco, Persona Atropellada, etc.
- **35 ASISTENCIA**: Pinchazo, Desperfectos Mecánicos, Apoyo Ciclismo, Operativos, etc.
- **12 EMERGENCIA**: Derrumbe, Inundación, Incendio Forestal, Socavamiento, etc.

#### Tablas Eliminadas
```sql
DROP TABLE subtipo_hecho;
DROP TABLE tipo_hecho;
DROP TABLE tipo_asistencia_vial;
DROP TABLE tipo_emergencia_vial;
DROP VIEW v_accidentologia_completa;
```

#### Columnas Eliminadas
```sql
ALTER TABLE situacion DROP COLUMN subtipo_hecho_id;
```

#### Foreign Keys Migradas
```sql
-- situacion.tipo_hecho_id ahora apunta a tipo_situacion_catalogo
ALTER TABLE situacion
  DROP CONSTRAINT situacion_tipo_hecho_id_fkey;
ALTER TABLE situacion
  ADD CONSTRAINT situacion_tipo_hecho_id_fkey
  FOREIGN KEY (tipo_hecho_id)
  REFERENCES tipo_situacion_catalogo(id);

-- situacion_persistente.tipo_emergencia_id ahora apunta a tipo_situacion_catalogo
ALTER TABLE situacion_persistente
  DROP CONSTRAINT situacion_persistente_tipo_emergencia_id_fkey;
ALTER TABLE situacion_persistente
  ADD CONSTRAINT situacion_persistente_tipo_emergencia_id_fkey
  FOREIGN KEY (tipo_emergencia_id)
  REFERENCES tipo_situacion_catalogo(id);
```

---

### 2. Backend - Código Actualizado

#### `backend/src/controllers/situacion.controller.ts`

**getCatalogosAuxiliares()** - Ahora usa tipo_situacion_catalogo:
```typescript
const tipos_hecho = await db.manyOrNone(
  "SELECT id, nombre, icono, color FROM tipo_situacion_catalogo WHERE categoria = 'HECHO_TRANSITO' AND activo = true ORDER BY nombre"
);
const tipos_asistencia = await db.manyOrNone(
  "SELECT id, nombre, icono, color FROM tipo_situacion_catalogo WHERE categoria = 'ASISTENCIA' AND activo = true ORDER BY nombre"
);
const tipos_emergencia = await db.manyOrNone(
  "SELECT id, nombre, icono, color FROM tipo_situacion_catalogo WHERE categoria = 'EMERGENCIA' AND activo = true ORDER BY nombre"
);
```

**createSituacion()** - Eliminado `subtipo_hecho_id`:
- Línea 77: Removido de destructuring
- Línea 223: Removido de dataToCreate

**updateSituacion()** - Eliminado `subtipo_hecho_id`:
- Línea 398: Removido de destructuring
- Línea 423: Removido de updateData

#### `backend/src/models/situacion.model.ts`

**Interface Situacion** - Eliminado `subtipo_hecho_id`:
```typescript
// ANTES
tipo_hecho_id?: number | null;
subtipo_hecho_id?: number | null;

// AHORA
tipo_hecho_id?: number | null;
```

**create()** - Eliminado `subtipo_hecho_id`:
- Línea 190: Removido de INSERT columns
- Línea 205: Removido de VALUES
- Línea 259: Removido de params object

**update()** - Eliminado `subtipo_hecho_id`:
- Línea 312: Removido de allowedFields

#### `backend/src/models/situacionPersistente.model.ts`

**getTiposEmergencia()** - Actualizado:
```typescript
// ANTES
SELECT * FROM tipo_emergencia_vial WHERE activo = TRUE ORDER BY orden, nombre

// AHORA
SELECT id, nombre, icono, color, activo
FROM tipo_situacion_catalogo
WHERE categoria = 'EMERGENCIA' AND activo = TRUE
ORDER BY nombre
```

**create()** - Actualizado:
```typescript
// ANTES
SELECT * FROM tipo_emergencia_vial WHERE id = $1

// AHORA
SELECT id, nombre, icono, color, activo
FROM tipo_situacion_catalogo
WHERE categoria = 'EMERGENCIA' AND id = $1
```

---

### 3. Mobile - Sin Cambios Necesarios

El mobile SQLite mantiene sus tablas locales separadas:
- `tipo_hecho` (local)
- `tipo_asistencia` (local)
- `tipo_emergencia` (local)

Estas se sincronizan desde el endpoint `/situaciones/auxiliares` que ahora lee de `tipo_situacion_catalogo` en el backend.

**NO se requieren cambios** en:
- `mobile/src/core/storage/catalogoStorage.ts` ✅
- `mobile/src/services/catalogSync.ts` ✅ (solo comentario agregado)
- `mobile/src/config/formularios/*.ts` ✅

---

## 📋 Tipos de Situaciones - Aclaración

### Nivel 1: Tipos Generales (tabla `tipo_situacion`)
Actividades generales de la brigada (quemadas en código):
- **PATRULLAJE** - Patrullaje activo en ruta
- **PARADA_ESTRATEGICA** - Parada en punto estratégico
- **COMIDA** - Tiempo de comida
- **DESCANSO** - Tiempo de descanso (incluye baño)
- **ASISTENCIA_VEHICULAR** - Categoría general
- **HECHO_TRANSITO** - Categoría general
- **EMERGENCIA** - Categoría general
- **REGULACION_TRAFICO** - Regular tráfico
- **SALIDA_SEDE** - Salida desde sede
- **CAMBIO_RUTA** - Cambio de ruta

### Nivel 2: Catálogo Específico (tabla `tipo_situacion_catalogo`)
Detalles de cada tipo:

**Si tipo_situacion = "ASISTENCIA_VEHICULAR"** → ¿Qué tipo?
- Pinchazo
- Desperfectos Mecánicos
- Apoyo Ciclismo ✅ (está aquí, no en tipo_situacion)
- Operativos
- etc.

**Si tipo_situacion = "HECHO_TRANSITO"** → ¿Qué pasó?
- Choque
- Colisión
- Vuelco
- Persona Atropellada
- etc.

**Si tipo_situacion = "EMERGENCIA"** → ¿Cuál?
- Derrumbe
- Inundación
- Incendio Forestal
- etc.

---

## 🎯 Categorías Usadas

### IMPORTANTE: Categoría es "HECHO_TRANSITO" NO "HECHO"

En la migración se decidió usar:
- `'HECHO_TRANSITO'` (17 tipos)
- `'ASISTENCIA'` (35 tipos)
- `'EMERGENCIA'` (12 tipos)

**NO** se usa `'HECHO'` ni `'ACTIVIDAD'`.

---

## ✅ Verificación Final

### Consultas de Verificación

```sql
-- Ver todos los tipos cargados
SELECT categoria, COUNT(*) as total,
       STRING_AGG(nombre, ', ' ORDER BY nombre) as tipos
FROM tipo_situacion_catalogo
WHERE activo = true
GROUP BY categoria
ORDER BY categoria;

-- Ver que no existan tablas antiguas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'tipo_%'
ORDER BY table_name;

-- Debe retornar solo: tipo_situacion, tipo_situacion_catalogo, tipo_vehiculo
```

### Endpoints del Backend

```bash
# Obtener catálogos auxiliares (para mobile)
GET /api/situaciones/auxiliares

# Respuesta esperada:
{
  "tipos_hecho": [
    {"id": 1, "nombre": "Choque", "icono": "car-crash", "color": "#DC2626"},
    {"id": 2, "nombre": "Colisión", "icono": "car-multiple", "color": "#B91C1C"},
    ...
  ],
  "subtipos_hecho": [], // Vacío ahora
  "tipos_asistencia": [
    {"id": 18, "nombre": "Pinchazo", "icono": "car-tire-alert", "color": "#F59E0B"},
    ...
  ],
  "tipos_emergencia": [
    {"id": 53, "nombre": "Derrumbe", "icono": "landslide", "color": "#7C2D12"},
    ...
  ]
}
```

---

## 📝 Archivos Modificados

### Backend (6 archivos)
1. ✅ `backend/src/controllers/situacion.controller.ts`
2. ✅ `backend/src/models/situacion.model.ts`
3. ✅ `backend/src/models/situacionPersistente.model.ts`

### Mobile (1 archivo)
1. ✅ `mobile/src/services/catalogSync.ts` (solo comentario)

### Base de Datos (Railway)
1. ✅ Tabla `tipo_situacion_catalogo` creada
2. ✅ 64 registros insertados
3. ✅ 5 tablas antiguas eliminadas
4. ✅ 1 columna `subtipo_hecho_id` eliminada
5. ✅ FKs migradas a nueva tabla

---

## 🚀 Siguiente Paso

**Probar en el móvil:**

1. Reiniciar backend (para cargar código actualizado)
2. Abrir app mobile
3. Trigger sincronización de catálogos (se hace automático al iniciar app si configuraste el hook)
4. Crear una Asistencia Vehicular
5. Seleccionar "Tipo de Asistencia" del dropdown
6. Verificar que se muestren los 35 tipos cargados
7. Guardar y verificar que `tipo_asistencia_id` se guarde correctamente

**Comando de verificación en Railway:**
```sql
-- Ver última asistencia creada
SELECT
  id,
  codigo_situacion,
  tipo_situacion,
  tipo_hecho_id,
  clima,
  carga_vehicular,
  created_at
FROM situacion
WHERE tipo_situacion = 'ASISTENCIA_VEHICULAR'
ORDER BY created_at DESC
LIMIT 1;

-- Ver el tipo_asistencia_id en detalles
SELECT
  s.codigo_situacion,
  d.tipo_detalle,
  d.datos->>'tipo_asistencia_id' as tipo_asistencia_id,
  c.nombre as tipo_asistencia_nombre
FROM situacion s
JOIN detalle_situacion d ON s.id = d.situacion_id
LEFT JOIN tipo_situacion_catalogo c ON (d.datos->>'tipo_asistencia_id')::int = c.id
WHERE s.tipo_situacion = 'ASISTENCIA_VEHICULAR'
AND d.tipo_detalle = 'OTROS'
ORDER BY s.created_at DESC
LIMIT 5;
```

---

## ⚠️ Notas Importantes

1. **subtipo_hecho ya no existe** - Si en el futuro quieren jerarquía, agreguen columna `parent_id` a `tipo_situacion_catalogo`

2. **Modelos de incidente.model.ts** - Aún tienen referencias a `tipo_hecho` y `subtipo_hecho` pero son OBSOLETOS según migración 105. No se actualizaron porque la tabla `incidente` fue eliminada.

3. **Íconos y colores** - Están en la BD pero pueden sobreescribirse en la app si quieren control total desde código.

4. **tipo_actividad** - Se eliminó porque no tenía ninguna referencia en el código.

5. **PATRULLAJE, BAÑO, etc.** - NO van en `tipo_situacion_catalogo`. Son tipos generales en la tabla `tipo_situacion` (la tabla principal).
