# Análisis Completo: Tablas de Catálogos

## Tablas Actuales en PostgreSQL (Railway)

1. **tipo_hecho**
2. **subtipo_hecho**
3. **tipo_asistencia_vial**
4. **tipo_emergencia_vial**
5. **tipo_actividad**

**Estado**: Todas están **VACÍAS** según el usuario.

---

## 1. TIPO_HECHO

### Columnas Detectadas

Basado en los SELECT encontrados:
```sql
SELECT id, codigo, nombre, icono, color FROM tipo_hecho
```

**Estructura inferida:**
- `id` (INTEGER, PRIMARY KEY)
- `codigo` (VARCHAR) - Ej: "HT01", "HT02"
- `nombre` (VARCHAR) - Ej: "Choque", "Colisión", "Vuelco"
- `icono` (VARCHAR) - Nombre del ícono MaterialCommunityIcons
- `color` (VARCHAR) - Color hexadecimal o nombre
- `activo` (BOOLEAN) - Para soft delete

### Usos en Backend

**Archivos:**
1. `backend/src/controllers/situacion.controller.ts`
   - Línea 674: `SELECT id, codigo, nombre, icono, color FROM tipo_hecho WHERE activo = true ORDER BY nombre`
   - Línea 662: `SELECT * FROM tipo_hecho WHERE activo = true ORDER BY nombre`

2. `backend/src/models/situacion.model.ts`
   - Línea 78: `tipo_hecho_id?: number | null;` - Campo en tabla situacion
   - Línea 191: INSERT incluye `tipo_hecho_id`
   - Línea 259: Default value con `?? null`

3. `backend/src/models/vehiculo.model.ts`
   - Línea 134: `th.nombre as tipo_hecho_nombre` - JOIN para mostrar nombre
   - Línea 145: `LEFT JOIN tipo_hecho th ON i.tipo_hecho_id = th.id`

4. `backend/src/models/piloto.model.ts`
   - Línea 89: `th.nombre as tipo_hecho_nombre`
   - Línea 103: `LEFT JOIN tipo_hecho th ON i.tipo_hecho_id = th.id`

5. `backend/src/models/aseguradora.model.ts`
   - Línea 76: Similar JOIN

6. `backend/src/models/gruaMaster.model.ts`
   - Línea 123: Similar JOIN

7. `backend/src/models/incidente.model.ts` (TABLA LEGACY/OBSOLETA)
   - Línea 15: `tipo_hecho_id: number;`
   - Línea 62-65: Campos adicionales `tipo_hecho`, `subtipo_hecho`, `tipo_hecho_color`, `tipo_hecho_icono`
   - Línea 179: INSERT en tabla incidente (obsoleta según migración 105)

### Usos en Mobile

**Archivos:**
1. `mobile/src/config/formularios/hechoTransitoForm.ts`
   - Línea 37: `name: 'tipo_hecho_id'` - Campo en FormBuilder
   - Catálogo: `'@catalogos.tipos_hecho'`

2. `mobile/src/components/DynamicFormFields.tsx`
   - Línea 71-76: Picker para tipo_hecho_id

3. `mobile/src/screens/situaciones/SituacionDinamicaScreen.tsx`
   - Línea 114-115: Transformación de datos
   - Línea 391-393: Envío al backend
   - Línea 485-487: Draft update

4. `mobile/src/core/storage/catalogoStorage.ts`
   - Línea 144-152: Tabla SQLite local
   - Línea 271-277: Método `getTiposHecho()`
   - Línea 406-420: Método `saveTiposHecho()`

5. `mobile/src/store/situacionesStore.ts`
   - Línea 102: `tipo_hecho_id?: number;`

---

## 2. SUBTIPO_HECHO

### Columnas Detectadas

```sql
SELECT id, tipo_hecho_id, codigo, nombre FROM subtipo_hecho
```

**Estructura inferida:**
- `id` (INTEGER, PRIMARY KEY)
- `tipo_hecho_id` (INTEGER, FOREIGN KEY → tipo_hecho.id)
- `codigo` (VARCHAR)
- `nombre` (VARCHAR)
- `activo` (BOOLEAN)

### Usos en Backend

**Archivos:**
1. `backend/src/controllers/situacion.controller.ts`
   - Línea 675: `SELECT id, tipo_hecho_id, codigo, nombre FROM subtipo_hecho WHERE activo = true ORDER BY nombre`
   - Línea 663: `SELECT * FROM subtipo_hecho WHERE activo = true ORDER BY nombre`
   - Línea 77, 224, 425: Uso de `subtipo_hecho_id` en creación/actualización

2. `backend/src/models/situacion.model.ts`
   - Línea 79: `subtipo_hecho_id?: number | null;` - Campo en tabla situacion
   - Línea 260: Default value con `?? null`

3. `backend/src/models/incidente.model.ts` (OBSOLETO)
   - Línea 16: `subtipo_hecho_id: number | null;`
   - Línea 63: `subtipo_hecho: string | null;` - Join name

### Usos en Mobile

**NO SE USA EN MOBILE** - No hay referencias a subtipo_hecho en FormBuilder ni screens.

**Conclusión**: **CANDIDATO PARA ELIMINAR** - Solo está en backend legacy (incidente.model.ts que es obsoleto)

---

## 3. TIPO_ASISTENCIA_VIAL

### Columnas Detectadas

```sql
SELECT id, nombre FROM tipo_asistencia_vial
```

**Estructura inferida:**
- `id` (INTEGER, PRIMARY KEY)
- `nombre` (VARCHAR) - Ej: "Pinchazo", "Desperfectos Mecánicos", etc.
- `activo` (BOOLEAN)
- Posiblemente: `orden` (INTEGER) - basado en el patrón tipo_emergencia_vial

### Usos en Backend

**Archivos:**
1. `backend/src/controllers/situacion.controller.ts`
   - Línea 676: `SELECT id, nombre FROM tipo_asistencia_vial WHERE activo = true ORDER BY nombre`
   - Se envía en endpoint `/situaciones/auxiliares`

2. **NO se usa en tabla `situacion`** - No hay columna `tipo_asistencia_id` en la tabla principal
3. Se guarda en `detalle_situacion` con `tipo_detalle='OTROS'` (línea 281-282 situacion.controller.ts)

### Usos en Mobile

**Archivos:**
1. `mobile/src/config/formularios/asistenciaForm.ts`
   - Línea 36: `name: 'tipo_asistencia_id'`
   - Catálogo: `'@catalogos.tipos_asistencia'`

2. `mobile/src/components/DynamicFormFields.tsx`
   - Línea 98-103: Picker para tipo_asistencia_id

3. `mobile/src/screens/situaciones/SituacionDinamicaScreen.tsx`
   - Línea 111-113: Transformación
   - Línea 392: Envío `tipo_asistencia_id`
   - Línea 486: Draft update

4. `mobile/src/core/storage/catalogoStorage.ts`
   - Línea 154-160: Tabla SQLite `tipo_asistencia`
   - Línea 284-290: Métodos get/save

5. `mobile/src/store/situacionesStore.ts`
   - Línea 104: `tipo_asistencia_id?: number;`

### PROBLEMA DETECTADO

**Mobile usa**: `tipo_asistencia_id` como columna en tabla situacion
**Backend usa**: Solo en `detalle_situacion.datos` (JSON)
**Tabla PostgreSQL**: `tipo_asistencia_vial` (con sufijo _vial)

---

## 4. TIPO_EMERGENCIA_VIAL

### Columnas Detectadas

```sql
SELECT * FROM tipo_emergencia_vial WHERE activo = TRUE ORDER BY orden, nombre
```

**Estructura inferida:**
- `id` (INTEGER, PRIMARY KEY)
- `nombre` (VARCHAR) - Ej: "Derrumbe", "Inundación", "Incendio"
- `activo` (BOOLEAN)
- `orden` (INTEGER) - Para ordenar en UI
- Posiblemente: `descripcion`, `icono`, `color`

### Usos en Backend

**Archivos:**
1. `backend/src/controllers/situacion.controller.ts`
   - Línea 677: `SELECT id, nombre FROM tipo_emergencia_vial WHERE activo = true ORDER BY nombre`

2. `backend/src/models/situacionPersistente.model.ts`
   - Línea 746-748: `SELECT * FROM tipo_emergencia_vial WHERE activo = TRUE ORDER BY orden, nombre`
   - Línea 1138-1140: `SELECT * FROM tipo_emergencia_vial WHERE id = $1`
   - Línea 744: Método `getTiposEmergencia()`

3. **NO se usa en tabla `situacion`** - Similar a tipo_asistencia_vial

### Usos en Mobile

**Archivos:**
1. `mobile/src/config/formularios/emergenciaForm.ts`
   - Línea 36: `name: 'tipo_emergencia_id'`
   - Catálogo: `'@catalogos.tipos_emergencia'`

2. `mobile/src/components/DynamicFormFields.tsx`
   - Línea 122-127: Picker para tipo_emergencia_id

3. `mobile/src/screens/situaciones/SituacionDinamicaScreen.tsx`
   - Línea 117-119: Transformación
   - Línea 393: Envío `tipo_emergencia_id`
   - Línea 487: Draft update

4. `mobile/src/core/storage/catalogoStorage.ts`
   - Línea 161-167: Tabla SQLite `tipo_emergencia`
   - Línea 297-303: Métodos get/save

5. `mobile/src/store/situacionesStore.ts`
   - Línea 105: `tipo_emergencia_id?: number;`

### PROBLEMA DETECTADO

**Mobile usa**: `tipo_emergencia_id` como columna en tabla situacion
**Backend usa**: Solo en `detalle_situacion.datos` (JSON)
**Tabla PostgreSQL**: `tipo_emergencia_vial` (con sufijo _vial)

---

## 5. TIPO_ACTIVIDAD

### Columnas Detectadas

**NO SE ENCONTRÓ NINGUNA REFERENCIA** en todo el codebase (backend, mobile, frontend).

**Conclusión**: **CANDIDATO PARA ELIMINAR** - Tabla huérfana sin uso.

---

## PROBLEMAS IDENTIFICADOS

### 1. Inconsistencia de Nombres

| Mobile espera | PostgreSQL tiene | Backend endpoint |
|--------------|------------------|------------------|
| `tipo_asistencia` | `tipo_asistencia_vial` | ✅ Corregido |
| `tipo_emergencia` | `tipo_emergencia_vial` | ✅ Corregido |
| `tipo_hecho` | `tipo_hecho` | ✅ Correcto |

### 2. Inconsistencia de Ubicación de Datos

**Problema**: Mobile envía `tipo_asistencia_id` y `tipo_emergencia_id` como columnas de la tabla `situacion`, pero:
- Backend NO tiene esas columnas en tabla `situacion`
- Backend las guarda en `detalle_situacion.datos` (JSONB)

**Archivo**: `backend/src/controllers/situacion.controller.ts` líneas 281-282
```typescript
if (tipo_asistencia_id) otrosDatos.tipo_asistencia_id = tipo_asistencia_id;
if (tipo_emergencia_id) otrosDatos.tipo_emergencia_id = tipo_emergencia_id;
```

### 3. Tabla Incidente es OBSOLETA

Según comentarios en código:
- Línea 5 `backend/src/routes/index.ts`: "OBSOLETO: Tabla incidente eliminada en migración 105"
- Pero `incidente.model.ts` todavía existe y usa `tipo_hecho_id` y `subtipo_hecho_id`

### 4. Subtipo_hecho NO se usa en Mobile

Solo existe en backend, pero no hay UI para seleccionarlo.

---

## COLUMNAS NECESARIAS PARA TABLA UNIFICADA

Basado en el análisis, la tabla `tipo_situacion_catalogo` debe tener:

### Columnas Obligatorias

```sql
id              SERIAL PRIMARY KEY
categoria       VARCHAR(50) NOT NULL    -- 'HECHO', 'ASISTENCIA', 'EMERGENCIA', 'ACTIVIDAD'
nombre          VARCHAR(255) NOT NULL   -- Nombre descriptivo
activo          BOOLEAN DEFAULT true    -- Soft delete
created_at      TIMESTAMP DEFAULT NOW()
```

### Columnas Opcionales (usadas por tipo_hecho)

```sql
codigo          VARCHAR(20)             -- Usado por tipo_hecho y subtipo_hecho
icono           VARCHAR(50)             -- Usado por tipo_hecho (MaterialCommunityIcons)
color           VARCHAR(20)             -- Usado por tipo_hecho (hex o nombre)
orden           INTEGER                 -- Usado por tipo_emergencia_vial para ordenar en UI
descripcion     TEXT                    -- Para futuro o uso interno
```

### Columnas para Jerarquía (si mantenemos subtipos)

```sql
parent_id       INTEGER REFERENCES tipo_situacion_catalogo(id)  -- Para subtipos
```

---

## REFERENCIAS A ACTUALIZAR

### Backend

1. **backend/src/controllers/situacion.controller.ts**
   - ✅ Línea 674: Actualizar `FROM tipo_hecho` → `FROM tipo_situacion_catalogo WHERE categoria='HECHO'`
   - ✅ Línea 675: Actualizar `FROM subtipo_hecho` (o eliminar si unificamos)
   - ✅ Línea 676: Actualizar `FROM tipo_asistencia_vial` → `FROM tipo_situacion_catalogo WHERE categoria='ASISTENCIA'`
   - ✅ Línea 677: Actualizar `FROM tipo_emergencia_vial` → `FROM tipo_situacion_catalogo WHERE categoria='EMERGENCIA'`
   - ✅ Línea 662-663: Similar para getCatalogo()

2. **backend/src/models/vehiculo.model.ts**
   - ✅ Línea 145: Actualizar JOIN `tipo_hecho` → `tipo_situacion_catalogo`

3. **backend/src/models/piloto.model.ts**
   - ✅ Línea 103: Actualizar JOIN

4. **backend/src/models/aseguradora.model.ts**
   - ✅ Línea 86: Actualizar JOIN

5. **backend/src/models/gruaMaster.model.ts**
   - ✅ Línea 134: Actualizar JOIN

6. **backend/src/models/situacionPersistente.model.ts**
   - ✅ Línea 746: Actualizar `tipo_emergencia_vial` → `tipo_situacion_catalogo WHERE categoria='EMERGENCIA'`
   - ✅ Línea 1138: Similar

7. **backend/src/models/incidente.model.ts** (REVISAR SI ELIMINAR)
   - Decidir si mantener o eliminar este archivo completo

8. **backend/src/controllers/drafts.controller.ts**
   - ✅ Línea 481: Revisar si aún aplica tras unificar tablas

### Mobile

1. **mobile/src/services/catalogSync.ts**
   - ✅ Actualizar endpoint response para usar nueva tabla
   - ✅ Separar por categoría al guardar en SQLite

2. **mobile/src/core/storage/catalogoStorage.ts**
   - **OPCIÓN 1**: Mantener tablas separadas en SQLite (tipo_hecho, tipo_asistencia, tipo_emergencia)
   - **OPCIÓN 2**: Crear tabla unificada en SQLite también

### Frontend (si existe)

- No se encontraron referencias significativas

---

## PROPUESTA DE MIGRACIÓN

### Opción A: Tabla Única sin Subtipos (RECOMENDADO)

```sql
-- 1. Crear tabla unificada
CREATE TABLE tipo_situacion_catalogo (
    id SERIAL PRIMARY KEY,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('HECHO', 'ASISTENCIA', 'EMERGENCIA', 'ACTIVIDAD')),
    codigo VARCHAR(20),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    color VARCHAR(20),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tipo_sit_cat_categoria ON tipo_situacion_catalogo(categoria);
CREATE INDEX idx_tipo_sit_cat_activo ON tipo_situacion_catalogo(activo);

-- 2. Migrar datos (SIN ID para evitar conflictos)
-- Desde tipo_hecho
INSERT INTO tipo_situacion_catalogo (categoria, codigo, nombre, icono, color, activo)
SELECT 'HECHO', codigo, nombre, icono, color, activo
FROM tipo_hecho;

-- Desde tipo_asistencia_vial
INSERT INTO tipo_situacion_catalogo (categoria, codigo, nombre, activo)
SELECT 'ASISTENCIA', NULL, nombre, activo
FROM tipo_asistencia_vial;

-- Desde tipo_emergencia_vial (si tiene columna 'orden')
INSERT INTO tipo_situacion_catalogo (categoria, codigo, nombre, orden, activo)
SELECT 'EMERGENCIA', NULL, nombre, COALESCE(orden, 0), activo
FROM tipo_emergencia_vial;

-- 3. Eliminar subtipo_hecho (ya que no se usa en mobile)

-- 4. Renombrar tablas antiguas para backup (NO ELIMINAR AÚN)
ALTER TABLE tipo_hecho RENAME TO _old_tipo_hecho;
ALTER TABLE subtipo_hecho RENAME TO _old_subtipo_hecho;
ALTER TABLE tipo_asistencia_vial RENAME TO _old_tipo_asistencia_vial;
ALTER TABLE tipo_emergencia_vial RENAME TO _old_tipo_emergencia_vial;
ALTER TABLE tipo_actividad RENAME TO _old_tipo_actividad;
```

### Opción B: Tabla Única CON Subtipos

```sql
-- Igual que Opción A pero agregando:
ALTER TABLE tipo_situacion_catalogo ADD COLUMN parent_id INTEGER REFERENCES tipo_situacion_catalogo(id);

-- Migrar subtipos
INSERT INTO tipo_situacion_catalogo (categoria, parent_id, codigo, nombre, activo)
SELECT 'HECHO',
       (SELECT new_table.id FROM tipo_situacion_catalogo new_table
        JOIN _old_tipo_hecho old_table ON new_table.nombre = old_table.nombre
        WHERE new_table.categoria = 'HECHO' AND old_table.id = sh.tipo_hecho_id),
       sh.codigo,
       sh.nombre,
       sh.activo
FROM _old_subtipo_hecho sh;
```

---

## DECISIONES PENDIENTES

1. **¿Mantener subtipo_hecho?**
   - ✅ NO - No se usa en mobile, solo en backend legacy
   - ❌ SÍ - Si planean implementar jerarquía de tipos en el futuro

2. **¿Agregar columna tipo_asistencia_id a tabla situacion?**
   - ✅ SÍ - Para consistencia con mobile y evitar búsquedas en JSONB
   - ❌ NO - Mantener en detalle_situacion.datos

3. **¿Agregar columna tipo_emergencia_id a tabla situacion?**
   - ✅ SÍ - Mismo motivo que asistencia
   - ❌ NO - Mantener en detalle_situacion.datos

4. **¿Eliminar tabla incidente?**
   - Según migración 105: "Tabla incidente eliminada"
   - Pero `incidente.model.ts` todavía existe
   - Verificar si hay datos en producción antes de eliminar

5. **¿Qué hacer con tipo_actividad?**
   - ✅ ELIMINAR - No se usa en ningún lado
   - ❌ MANTENER - Si tiene datos en producción que necesitan preservarse

---

## SIGUIENTE PASO

**Ejecutar en Railway (PostgreSQL)**:

```sql
-- Ver estructura actual de todas las tablas
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('tipo_hecho', 'subtipo_hecho', 'tipo_asistencia_vial', 'tipo_emergencia_vial', 'tipo_actividad')
ORDER BY table_name, ordinal_position;

-- Contar registros
SELECT 'tipo_hecho' as tabla, COUNT(*) FROM tipo_hecho
UNION ALL
SELECT 'subtipo_hecho', COUNT(*) FROM subtipo_hecho
UNION ALL
SELECT 'tipo_asistencia_vial', COUNT(*) FROM tipo_asistencia_vial
UNION ALL
SELECT 'tipo_emergencia_vial', COUNT(*) FROM tipo_emergencia_vial
UNION ALL
SELECT 'tipo_actividad', COUNT(*) FROM tipo_actividad;
```

**Pégame los resultados** y te preparo el script de migración final.
