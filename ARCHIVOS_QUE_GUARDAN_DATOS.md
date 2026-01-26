# ARCHIVOS RESPONSABLES DE GUARDAR DATOS EN LA BASE DE DATOS

## 🎯 FLUJO COMPLETO DE GUARDADO

```
Mobile (Frontend)
    ↓
    SituacionDinamicaScreen.tsx → handleSubmit()
    ↓
    Envía POST a /api/situaciones
    ↓
Backend (API)
    ↓
    situacion.controller.ts → createSituacion()
    ↓
    situacion.model.ts → create()
    ↓
    PostgreSQL (Railway)
```

---

## 📂 ARCHIVOS BACKEND (Guardan en PostgreSQL)

### 1. **backend/src/controllers/situacion.controller.ts**
**Función:** `createSituacion()` (línea ~35-270)
- Recibe datos del POST `/api/situaciones`
- Extrae campos del `req.body`
- Prepara objeto `dataToCreate`
- Llama a `SituacionModel.create(dataToCreate)`

**Ubicación exacta:**
```
C:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb\backend\src\controllers\situacion.controller.ts
```

**Responsabilidades:**
- Validar datos recibidos
- Mapear campos (material_via → tipo_pavimento)
- Preparar objeto para inserción
- Manejar multimedia (Cloudinary)
- Crear detalles relacionados

---

### 2. **backend/src/models/situacion.model.ts**
**Función:** `create()` (línea ~158-270)
- Recibe objeto con datos
- Construye query SQL INSERT
- Ejecuta inserción en tabla `situacion`
- Retorna situación creada

**Ubicación exacta:**
```
C:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb\backend\src\models\situacion.model.ts
```

**Query SQL:**
```sql
INSERT INTO situacion (
  codigo_situacion,
  tipo_situacion,
  unidad_id,
  salida_unidad_id,
  ...
  clima,
  carga_vehicular,
  departamento_id,
  municipio_id,
  tipo_hecho_id,
  area,
  tipo_pavimento,
  multimedia
) VALUES ($1, $2, $3, ...)
RETURNING *
```

**Responsabilidades:**
- Ejecutar INSERT en PostgreSQL
- Usar pg-promise con parámetros nombrados
- Validar que todos los campos requeridos existan
- Retornar registro insertado

---

### 3. **backend/src/models/detalleSituacion.model.ts**
**Función:** `create()` (línea ~40-90)
- Guarda detalles específicos (VEHICULOS, OTROS, etc.)
- Tabla: `detalle_situacion`

**Ubicación exacta:**
```
C:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb\backend\src\models\detalleSituacion.model.ts
```

**Query SQL:**
```sql
INSERT INTO detalle_situacion (
  situacion_id,
  tipo_detalle,
  datos
) VALUES ($1, $2, $3)
RETURNING *
```

---

## 📱 ARCHIVOS MOBILE (Envían datos al backend)

### 4. **mobile/src/screens/situaciones/SituacionDinamicaScreen.tsx**
**Función:** `handleSubmit()` (línea ~200-300)
- Recopila datos del formulario
- Construye objeto `payload`
- Envía POST a `/api/situaciones`

**Ubicación exacta:**
```
C:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb\mobile\src\screens\situaciones\SituacionDinamicaScreen.tsx
```

**Responsabilidades:**
- Obtener valores del formulario
- Incluir: tipo_hecho_id, tipo_asistencia_id, clima, departamento_id, etc.
- Serializar multimedia (fotos/videos)
- Enviar HTTP POST

---

## 🔍 CÓMO DEBUGGEAR QUE DATOS NO SE GUARDAN

### Paso 1: Verificar qué envía el mobile

En `SituacionDinamicaScreen.tsx`, busca `handleSubmit()` y verifica el `console.log` del payload:

```typescript
console.log('[SUBMIT] Payload completo:', JSON.stringify(payload, null, 2));
```

**Buscar línea:** ~250-270

---

### Paso 2: Verificar qué recibe el backend

En `situacion.controller.ts`, línea ~35-40:

```typescript
console.log('📥 [BACKEND] DATOS RECIBIDOS EN createSituacion');
console.log('📦 req.body COMPLETO:');
console.log(JSON.stringify(req.body, null, 2));
```

**Ya existe este log** - revisar output del backend

---

### Paso 3: Verificar qué se pasa al modelo

En `situacion.controller.ts`, línea ~220-230:

```typescript
console.log('💾 [BACKEND] dataToCreate:', JSON.stringify(dataToCreate, null, 2));
const nuevaSituacion = await SituacionModel.create(dataToCreate);
```

**Verificar que dataToCreate incluye:**
- clima
- carga_vehicular
- departamento_id
- municipio_id
- tipo_hecho_id
- area
- tipo_pavimento
- multimedia

---

### Paso 4: Verificar el INSERT SQL

En `situacion.model.ts`, línea ~220-260:

Busca el objeto `params` que se pasa a pg-promise:

```typescript
const params = {
  codigo_situacion: data.codigo_situacion,
  tipo_situacion: data.tipo_situacion,
  ...
  clima: data.clima || null,
  carga_vehicular: data.carga_vehicular || null,
  departamento_id: data.departamento_id || null,
  tipo_hecho_id: data.tipo_hecho_id || null,
  ...
};
```

**Verificar que NO estén como `undefined`** - deben ser `null` o un valor

---

## ⚠️ PROBLEMA COMÚN: undefined vs null

JavaScript NO serializa `undefined` en JSON, solo `null`.

**MAL:**
```typescript
const data = {
  clima: formData.clima,  // Si no existe, queda undefined
};
// JSON.stringify(data) = "{}" (vacío!)
```

**BIEN:**
```typescript
const data = {
  clima: formData.clima || null,  // Si no existe, queda null
};
// JSON.stringify(data) = "{"clima": null}"
```

---

## 🎯 ARCHIVOS A REVISAR PARA SOLUCIONAR EL PROBLEMA

1. **mobile/src/screens/situaciones/SituacionDinamicaScreen.tsx**
   - Línea ~200-300: `handleSubmit()`
   - Verificar que incluye TODOS los campos en el payload

2. **backend/src/controllers/situacion.controller.ts**
   - Línea ~41-75: Destructuring de req.body
   - Línea ~220-230: Construcción de dataToCreate
   - Verificar que extrae y pasa TODOS los campos

3. **backend/src/models/situacion.model.ts**
   - Línea ~190-210: Columnas del INSERT
   - Línea ~220-270: Objeto params
   - Verificar que TODOS los campos están en el INSERT

---

## 🔧 SIGUIENTE PASO

Lee estos 3 archivos y verifica QUÉ FALTA en cada paso del flujo:

```bash
# 1. Qué envía mobile
C:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb\mobile\src\screens\situaciones\SituacionDinamicaScreen.tsx

# 2. Qué recibe y procesa backend controller
C:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb\backend\src\controllers\situacion.controller.ts

# 3. Qué inserta el modelo
C:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb\backend\src\models\situacion.model.ts
```
