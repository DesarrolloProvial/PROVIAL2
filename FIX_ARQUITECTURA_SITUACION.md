# FIX ARQUITECTURA: Tabla situacion como Padre Único

## 🎯 Problema Original

El usuario reportó: **"vuelve a fallar, estás intentando cargar todo a situacion"**

Al analizar el schema de la BD, descubrí que:

❌ **Campos que NO existen en la tabla `situacion`:**
- `tipo_hecho_id`
- `tipo_asistencia_id`
- `tipo_emergencia_id`
- `apoyo_proporcionado`

✅ **Campos que SÍ existen:**
- `tipo_situacion` (STRING: 'HECHO_TRANSITO', 'ASISTENCIA_VEHICULAR', 'EMERGENCIA')
- `tipo_situacion_id` (INT: FK a `tipo_situacion_catalogo.id`)
- `subtipo_hecho_id` (INT: subtipo opcional)

## 📊 Catálogo Unificado

La tabla `tipo_situacion_catalogo` tiene:

```sql
id | categoria      | nombre
---+----------------+---------------------------
1  | EMERGENCIA     | Acumulación De Agua
13 | ASISTENCIA     | Apoyo A Ciclismo
20 | ASISTENCIA     | Calentamiento
47 | HECHO_TRANSITO | Caída De Árbol
49 | HECHO_TRANSITO | Choque
```

**Todos los tipos están en UNA sola tabla** con columna `categoria`.

---

## ✅ Soluciones Implementadas

### 1. Migración 107: Eliminar hoja_accidentologia

**Archivo:** `backend/migrations/107_refactor_accidentologia_to_situacion.sql`

**Cambios:**
1. `vehiculo_accidente.hoja_accidentologia_id` → `vehiculo_accidente.situacion_id`
2. `persona_accidente.hoja_accidentologia_id` → `persona_accidente.situacion_id`
3. DROP TABLE `hoja_accidentologia` CASCADE

**Razón:**
- `hoja_accidentologia` era una tabla intermedia vacía
- `situacion` es la tabla padre con TODOS los datos
- No tiene sentido tener tablas vinculadas a una tabla vacía

**Resultado:**
```
situacion (padre)
├── vehiculo_accidente (FK: situacion_id) - para HECHO_TRANSITO
├── persona_accidente (FK: situacion_id) - para HECHO_TRANSITO
└── detalle_situacion (FK: situacion_id) - para vehículos/autoridades de ASISTENCIA/EMERGENCIA
```

---

### 2. Backend Model: Quitar campos inexistentes

**Archivo:** `backend/src/models/situacion.model.ts`

**ANTES (❌):**
```typescript
interface Situacion {
  tipo_hecho_id?: number | null;
  tipo_asistencia_id?: number | null;
  tipo_emergencia_id?: number | null;
  apoyo_proporcionado?: string | null;
}

INSERT INTO situacion (..., tipo_hecho_id, tipo_asistencia_id, tipo_emergencia_id, ...)
```

**DESPUÉS (✅):**
```typescript
interface Situacion {
  tipo_situacion_id?: number | null; // FK a tipo_situacion_catalogo
  subtipo_hecho_id?: number | null;  // Subtipo opcional
}

INSERT INTO situacion (..., tipo_situacion_id, subtipo_hecho_id, ...)
```

**Campos eliminados del INSERT:**
- ❌ `tipo_hecho_id`
- ❌ `tipo_asistencia_id`
- ❌ `tipo_emergencia_id`
- ❌ `apoyo_proporcionado`

---

### 3. Backend Controller: Fallback para tipo_situacion_id

**Archivo:** `backend/src/controllers/situacion.controller.ts`

**Problema:**
- Mobile envía: `tipo_hecho_id: 49` (para "Choque")
- BD espera: `tipo_situacion_id: 49`

**Solución:**
```typescript
// Alias: mobile puede enviar tipo_hecho_id, tipo_asistencia_id, o tipo_emergencia_id
// pero en BD solo existe tipo_situacion_id
const tipo_situacion_id_final = normalizeId(
  tipo_situacion_id ?? tipo_hecho_id ?? tipo_asistencia_id ?? tipo_emergencia_id
);

const dataToCreate = {
  // ...
  tipo_situacion_id: tipo_situacion_id_final,
  // Ya NO se usa tipo_hecho_id, tipo_asistencia_id, tipo_emergencia_id
};
```

**Resultado:**
- ✅ Mobile puede seguir enviando `tipo_hecho_id`
- ✅ Backend lo mapea a `tipo_situacion_id`
- ✅ No hay errores de columna inexistente

---

### 4. Mobile: Quitar apoyo_proporcionado del payload

**Archivo:** `mobile/src/hooks/useDraftSituacion.ts`

**ANTES (❌):**
```typescript
const payload = {
  ...draft,
  apoyo_proporcionado: toNull(draft.apoyo_proporcionado),
  // ...
};
```

**DESPUÉS (✅):**
```typescript
const payload = {
  ...draft,
  // apoyo_proporcionado eliminado (no existe en tabla situacion)
  // ...
};
```

**Nota:** `apoyo_proporcionado` se sigue capturando en el formulario, pero:
- **Opción 1:** Agregarlo a la tabla `situacion` como columna `TEXT`
- **Opción 2:** Guardarlo en `detalle_situacion` con `tipo_detalle='APOYO_BRINDADO'`

---

## 🏗️ Arquitectura Final

### Para HECHO_TRANSITO (Accidentes)

1. **Crear registro en `situacion`:**
   ```sql
   INSERT INTO situacion (
     tipo_situacion,      -- 'HECHO_TRANSITO'
     tipo_situacion_id,   -- 49 (Choque), 50 (Colisión), etc.
     km, latitud, longitud, clima, area, tipo_pavimento,
     hay_heridos, cantidad_heridos, ...
   )
   ```

2. **Crear vehículos involucrados:**
   ```sql
   INSERT INTO vehiculo_accidente (
     situacion_id,        -- FK a situacion.id
     placa, marca, linea, color, danos_descripcion,
     conductor_nombre, conductor_dpi, ...
   )
   ```

3. **Crear personas afectadas:**
   ```sql
   INSERT INTO persona_accidente (
     situacion_id,        -- FK a situacion.id
     nombre_completo, dpi, edad, estado, tipo_lesion, ...
   )
   ```

**Permite:**
- ✅ Reincidencia por placa/DPI
- ✅ Estadísticas por marca de vehículo
- ✅ Puntos negros (agrupar por latitud/longitud)
- ✅ Análisis de causas comunes

---

### Para ASISTENCIA_VEHICULAR

1. **Crear registro en `situacion`:**
   ```sql
   INSERT INTO situacion (
     tipo_situacion,      -- 'ASISTENCIA_VEHICULAR'
     tipo_situacion_id,   -- 20 (Calentamiento), 38 (Pinchazo), etc.
     km, latitud, longitud, clima, area, ...
   )
   ```

2. **Guardar vehículos asistidos en `detalle_situacion`:**
   ```sql
   INSERT INTO detalle_situacion (
     situacion_id,
     tipo_detalle,        -- 'VEHICULO'
     datos                -- JSONB: {placa, marca, problema}
   )
   ```

3. **Guardar autoridades presentes en `detalle_situacion`:**
   ```sql
   INSERT INTO detalle_situacion (
     situacion_id,
     tipo_detalle,        -- 'AUTORIDAD'
     datos                -- JSONB: {tipo_autoridad, nip_chapa, nombre_comandante}
   )
   ```

---

### Para EMERGENCIA

1. **Crear registro en `situacion`:**
   ```sql
   INSERT INTO situacion (
     tipo_situacion,      -- 'EMERGENCIA'
     tipo_situacion_id,   -- 6 (Derrumbe), 11 (Incendio Forestal), etc.
     km, latitud, longitud, clima, area,
     obstruccion_data,    -- JSONB: detalles de la obstrucción
     ...
   )
   ```

2. **Guardar autoridades presentes en `detalle_situacion`:**
   ```sql
   INSERT INTO detalle_situacion (
     situacion_id,
     tipo_detalle,        -- 'AUTORIDAD'
     datos                -- JSONB: {tipo_autoridad, nip_chapa, ...}
   )
   ```

---

## ✅ Campo apoyo_proporcionado: ELIMINADO

**Decisión del usuario:** NO quiere apoyo_proporcionado

**Cambios realizados:**
- ❌ Eliminado de `asistenciaForm.ts` (formulario)
- ❌ Eliminado de interface `DraftSituacion`
- ❌ Eliminado de `SituacionDinamicaScreen.tsx` (todos los usos)
- ❌ Eliminado de payload de backend

**Resultado:**
✅ Campo ya no se captura en la app
✅ Campo ya no se guarda en drafts
✅ Campo ya no se envía al backend

El campo descripción/observaciones puede usarse para detalles adicionales si es necesario.

---

## 📦 Archivos Modificados

### Backend (3 archivos)
1. ✅ `backend/migrations/107_refactor_accidentologia_to_situacion.sql`
   - Cambiar FKs de vehiculo_accidente y persona_accidente a situacion_id
   - DROP TABLE hoja_accidentologia CASCADE

2. ✅ `backend/src/models/situacion.model.ts`
   - Eliminar tipo_hecho_id, tipo_asistencia_id, tipo_emergencia_id, apoyo_proporcionado de interface
   - Actualizar INSERT y UPDATE para usar solo tipo_situacion_id
   - Agregar subtipo_hecho_id

3. ✅ `backend/src/controllers/situacion.controller.ts`
   - Fallback: tipo_situacion_id ← tipo_hecho_id | tipo_asistencia_id | tipo_emergencia_id
   - Normalizar con normalizeId()
   - Eliminar campos inexistentes de dataToCreate

### Mobile (1 archivo)
4. ✅ `mobile/src/hooks/useDraftSituacion.ts`
   - Eliminar apoyo_proporcionado del payload (temporalmente)

---

## 🧪 Cómo Verificar

### 1. Ejecutar migración 107
```bash
psql $DATABASE_URL -f backend/migrations/107_refactor_accidentologia_to_situacion.sql
```

**Verificar:**
```sql
\d vehiculo_accidente  -- Debe tener situacion_id en lugar de hoja_accidentologia_id
\d persona_accidente   -- Debe tener situacion_id en lugar de hoja_accidentologia_id
\dt hoja_accidentologia -- Debe retornar "relation does not exist"
```

### 2. Reiniciar backend
```bash
cd backend
npm run dev
```

### 3. Crear situación de prueba (HECHO_TRANSITO)

**Payload mobile:**
```json
{
  "tipo_situacion": "HECHO_TRANSITO",
  "tipo_hecho_id": 49,
  "km": 50,
  "clima": "DESPEJADO",
  "vehiculos": [{
    "placa": "P123ABC",
    "marca": "Toyota",
    "conductor_nombre": "Juan Pérez"
  }]
}
```

**Logs esperados backend:**
```
🔍 [BACKEND] CAMPOS EXTRAÍDOS:
  - tipo_situacion_id_final: 49 (computed from tipo_hecho_id)

💾 [BACKEND] OBJETO dataToCreate:
  "tipo_situacion": "HECHO_TRANSITO",
  "tipo_situacion_id": 49,
  ...

✅ [CREATE] OK ID: 1234
```

**Verificar en PostgreSQL:**
```sql
SELECT id, tipo_situacion, tipo_situacion_id, clima FROM situacion ORDER BY created_at DESC LIMIT 1;
-- tipo_situacion    | HECHO_TRANSITO
-- tipo_situacion_id | 49
-- clima             | DESPEJADO

SELECT id, situacion_id, placa, marca FROM vehiculo_accidente WHERE situacion_id = <id>;
-- situacion_id | 1234
-- placa        | P123ABC
-- marca        | Toyota
```

---

## 🎯 Resultado Final

**ANTES:**
```
hoja_accidentologia (vacía)
├── vehiculo_accidente
└── persona_accidente

situacion (con campos inexistentes)
├── tipo_hecho_id ❌
├── tipo_asistencia_id ❌
├── tipo_emergencia_id ❌
└── apoyo_proporcionado ❌
```

**DESPUÉS:**
```
situacion (tabla padre con todos los datos)
├── tipo_situacion ✅
├── tipo_situacion_id ✅ (FK a tipo_situacion_catalogo)
├── subtipo_hecho_id ✅
├── clima, area, tipo_pavimento, etc. ✅
│
├── vehiculo_accidente (FK: situacion_id) ✅
├── persona_accidente (FK: situacion_id) ✅
└── detalle_situacion (FK: situacion_id) ✅
```

✅ **Arquitectura limpia, normalizada, y lista para reportes y análisis.**
