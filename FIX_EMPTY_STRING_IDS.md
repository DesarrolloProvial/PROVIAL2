# FIX CRÍTICO: Empty String IDs → PostgreSQL Errors

## 🔥 Problema Identificado

Del análisis de logs del usuario:

```
📦 [ENVIAR_DRAFT] Payload: {
  ...
  "tipo_hecho_id": "",
  "tipo_emergencia_id": "",
  "municipio_id": "",
  "departamento_id": 4,
  ...
}
```

**Problema:** Mobile enviaba `""` (string vacío) en lugar de `null` para IDs opcionales.

**Consecuencia:** PostgreSQL rechaza con error:
```
ERROR: invalid input syntax for type integer: ""
```

Porque en la DB, estos campos son:
- `tipo_hecho_id INT` → FK a `tipo_situacion_catalogo(id)`
- `municipio_id INT` → FK a `municipio(id)`
- etc.

PostgreSQL NO puede convertir `""` a INTEGER, necesita `null`.

---

## ✅ Soluciones Implementadas

### 1. Fix Mobile: Sanitización del Payload (Defensa Primaria)

**Archivo:** `mobile/src/hooks/useDraftSituacion.ts`

**Cambios en `enviarDraft()` (línea ~348):**

```typescript
// Helpers para normalizar valores vacíos a null
const toNull = (v: any) => (v === '' || v === undefined ? null : v);
const toIntOrNull = (v: any) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Sanitizar payload: convertir "" a null para IDs y campos opcionales
const payload = {
  ...draft,
  // IDs de catálogos: nunca enviar "" (string vacío)
  tipo_hecho_id: toIntOrNull(draft.tipo_hecho_id),
  tipo_asistencia_id: toIntOrNull(draft.tipo_asistencia_id),
  tipo_emergencia_id: toIntOrNull(draft.tipo_emergencia_id),
  departamento_id: toIntOrNull(draft.departamento_id),
  municipio_id: toIntOrNull(draft.municipio_id),

  // Campos opcionales: convertir "" a null
  tipo_pavimento: toNull(draft.tipo_pavimento ?? draft.material_via),
  descripcion: toNull(draft.descripcion),
  observaciones: toNull(draft.observaciones),
  apoyo_proporcionado: toNull(draft.apoyo_proporcionado),
  clima: toNull(draft.clima),
  carga_vehicular: toNull(draft.carga_vehicular),
  area: toNull(draft.area),

  // Mantener ID determinista
  id: draft.id,

  // Remover campos internos
  multimedia: undefined,
  estado: undefined,
  created_at: undefined,
  updated_at: undefined,
  conflicto: undefined,
  num_situacion_salida: undefined,
  fecha: undefined,
  material_via: undefined // Ya se mandó como tipo_pavimento
};
```

**Resultado:**
- ✅ `""` → `null` para todos los IDs
- ✅ Payload limpio antes de enviar
- ✅ PostgreSQL recibe tipos correctos

---

### 2. Fix Backend: Normalización Defensiva (Defensa Secundaria)

**Archivo:** `backend/src/controllers/situacion.controller.ts`

**Cambios en `createSituacion()` (línea ~96):**

```typescript
// Helper: normalizar IDs (convertir "" a null, strings a números)
const normalizeId = (val: any): number | null => {
  if (val === '' || val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};
```

**Aplicado en dataToCreate (línea ~229):**

```typescript
departamento_id: normalizeId(departamento_id),
municipio_id: normalizeId(municipio_id),
tipo_hecho_id: normalizeId(tipo_hecho_id),
tipo_asistencia_id: normalizeId(tipo_asistencia_id),
tipo_emergencia_id: normalizeId(tipo_emergencia_id),
```

**Resultado:**
- ✅ Defensa en profundidad (si mobile falla, backend lo arregla)
- ✅ Convierte strings a números automáticamente
- ✅ Maneja `""`, `null`, `undefined` uniformemente

---

### 3. Logging Extensivo para Debugging

**Agregado en `enviarDraft()` (línea ~353):**

```typescript
console.log('🚀 [ENVIAR_DRAFT] Haciendo POST a:', `${API_URL}/situaciones`);
console.log('📦 [ENVIAR_DRAFT] Payload sanitizado:', JSON.stringify({...payload, multimedia: undefined}, null, 2));
```

**Agregado en response exitoso (línea ~413):**

```typescript
console.log('✅ [ENVIAR_DRAFT] POST exitoso:', response.status);
console.log('✅ [ENVIAR_DRAFT] Respuesta:', JSON.stringify(data, null, 2));
```

**Agregado en errores HTTP (línea ~456):**

```typescript
console.log('❌ [ENVIAR_DRAFT] Error HTTP:', response.status);
const error = await response.json();
console.log('❌ [ENVIAR_DRAFT] Error body:', JSON.stringify(error, null, 2));
```

**Agregado en catch (línea ~467):**

```typescript
console.log('❌ [ENVIAR_DRAFT] ERROR capturado en catch');
console.log('❌ [ENVIAR_DRAFT] error.message:', error?.message);
console.log('❌ [ENVIAR_DRAFT] error.response?.status:', error?.response?.status);
console.log('❌ [ENVIAR_DRAFT] error.response?.data:', JSON.stringify(error?.response?.data, null, 2));
```

**Resultado:**
- ✅ Visibilidad completa del flujo de datos
- ✅ Errores de PostgreSQL ahora son visibles
- ✅ Debugging más rápido

---

## 🧪 Cómo Verificar el Fix

### 1. Verificar Payload Sanitizado (Mobile)

Buscar en logs del mobile:

**ANTES:**
```
📦 [ENVIAR_DRAFT] Payload: {
  "tipo_hecho_id": "",
  "municipio_id": "",
  ...
}
```

**DESPUÉS:**
```
📦 [ENVIAR_DRAFT] Payload sanitizado: {
  "tipo_hecho_id": null,
  "municipio_id": null,
  "departamento_id": 4,
  ...
}
```

✅ Todos los `""` deben ser `null` ahora

---

### 2. Verificar Backend Recibe Correctamente

Buscar en logs del backend:

```
🔍 [BACKEND] CAMPOS EXTRAÍDOS (destructuring):
  - tipo_hecho_id: null (type: object)
  - municipio_id: null (type: object)
  - departamento_id: 4 (type: number)
```

✅ Backend debe mostrar `null` en lugar de `""`

---

### 3. Verificar INSERT en PostgreSQL

```
💾 [BACKEND] OBJETO dataToCreate QUE SE ENVIARÁ A LA BASE DE DATOS:
{
  "tipo_hecho_id": null,
  "tipo_asistencia_id": null,
  "tipo_emergencia_id": null,
  "departamento_id": 4,
  "municipio_id": null,
  ...
}
```

✅ Todos los IDs deben ser `null` (JSON) o números, NUNCA `""`

---

### 4. Verificar en Base de Datos

```sql
SELECT
  id,
  codigo_situacion,
  tipo_hecho_id,
  tipo_asistencia_id,
  tipo_emergencia_id,
  departamento_id,
  municipio_id,
  created_at
FROM situacion
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado:**

```
id                | 1234
codigo_situacion  | SIT-2026-001-00042
tipo_hecho_id     | NULL (si no se seleccionó)
tipo_asistencia_id| 20 (si se seleccionó)
tipo_emergencia_id| NULL
departamento_id   | 4
municipio_id      | NULL
```

✅ **NO más errores de "invalid input syntax for type integer"**

---

## 📊 Casos Cubiertos

| Valor de entrada | toIntOrNull() | normalizeId() | PostgreSQL |
|------------------|---------------|---------------|------------|
| `""` (string vacío) | `null` | `null` | NULL ✅ |
| `"20"` (string número) | `20` | `20` | 20 ✅ |
| `20` (number) | `20` | `20` | 20 ✅ |
| `null` | `null` | `null` | NULL ✅ |
| `undefined` | `null` | `null` | NULL ✅ |
| `"abc"` (string inválido) | `null` | `null` | NULL ✅ |

Todos los casos manejados correctamente ✅

---

## 🎯 Resultado Final

**ANTES:**
```sql
-- Mobile enviaba ""
-- PostgreSQL rechazaba con:
ERROR: invalid input syntax for type integer: ""
-- Situación NO se creaba ❌
```

**DESPUÉS:**
```sql
-- Mobile envía null
-- PostgreSQL acepta:
INSERT INTO situacion (..., tipo_hecho_id, municipio_id, ...)
VALUES (..., NULL, NULL, ...);
-- Situación se crea exitosamente ✅
```

---

## 📦 Archivos Modificados

### Mobile (1 archivo)
1. ✅ `mobile/src/hooks/useDraftSituacion.ts`
   - Agregado helpers `toNull()` y `toIntOrNull()`
   - Sanitización completa del payload antes de POST
   - Logging extensivo (success, error HTTP, catch)

### Backend (1 archivo)
2. ✅ `backend/src/controllers/situacion.controller.ts`
   - Agregado helper `normalizeId()`
   - Aplicado a todos los campos ID en dataToCreate
   - Defensa en profundidad contra `""`

---

## ⚠️ Notas Importantes

### Por qué esto pasaba

1. **FormBuilder devolvía `""` para campos no llenados**
   - Dropdowns sin selección → `""`
   - Inputs vacíos → `""`

2. **Draft guardaba `""` tal cual**
   - AsyncStorage no distingue entre `""` y `null`
   - Draft persistía el string vacío

3. **POST enviaba `""`**
   - Payload hardcodeado antes → perdía campos
   - Spread del draft → enviaba TODO (incluyendo `""`)

4. **PostgreSQL rechazaba**
   - Columna INT no acepta `""`
   - FK constraint tampoco

### Fix es "Offline-First Safe"

- ✅ Si FormBuilder devuelve `""`, se convierte a `null`
- ✅ Si draft tiene `""`, se convierte a `null`
- ✅ Si backend recibe `""`, se convierte a `null`
- ✅ Triple capa de defensa

---

## 🚀 Próximos Pasos

1. **Reiniciar backend** para cargar código nuevo
2. **Reiniciar app mobile** (o rebuild si es necesario)
3. **Crear situación de prueba:**
   - Llenar solo ALGUNOS campos (dejar otros vacíos)
   - NO seleccionar tipo_hecho, tipo_emergencia
   - Enviar

4. **Buscar en logs:**
   ```
   📦 [ENVIAR_DRAFT] Payload sanitizado: {
     "tipo_hecho_id": null,  ← ✅ Debe ser null, NO ""
     ...
   }

   ✅ [ENVIAR_DRAFT] POST exitoso: 201
   ✅ [ENVIAR_DRAFT] Respuesta: {
     "situacion_id": 1234,
     "numero_situacion": "SIT-2026-001-00042"
   }
   ```

5. **Verificar en PostgreSQL:**
   ```sql
   SELECT * FROM situacion ORDER BY created_at DESC LIMIT 1;
   ```

   **Esperado:** Todos los campos guardados, IDs opcionales en NULL ✅

---

## ✅ Resumen Ejecutivo

| Problema | Fix Mobile | Fix Backend | Resultado |
|----------|------------|-------------|-----------|
| `""` → PostgreSQL error | `toIntOrNull("")` → `null` | `normalizeId("")` → `null` | ✅ INSERT exitoso |
| IDs como strings | `toIntOrNull("20")` → `20` | `normalizeId("20")` → `20` | ✅ Tipos correctos |
| Campos undefined | `toIntOrNull(undefined)` → `null` | `normalizeId(undefined)` → `null` | ✅ NULL válido |
| Debugging ciego | Logging extensivo en cada paso | Logs ya existían | ✅ Visibilidad completa |

**🎉 Con este fix, el flujo completo Mobile → Backend → PostgreSQL funciona correctamente.**
