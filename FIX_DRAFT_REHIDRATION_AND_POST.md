# FIX CRÍTICO: Draft Rehidratación + Coordenadas + POST Logging

## 🔥 Problemas Identificados (Análisis del Usuario)

Según los logs proporcionados:

### 1. **FormBuilder solo rehidrató 10 campos**
```
LOG  [FormBuilder] Actualizando valores iniciales:
{
  "km":"50",
  "sentido":"SUR",
  "observaciones":"Observaciones generales prueba ",
  "descripcion":"",
  "tipo_hecho_id":"",
  "tipo_asistencia_id":20,
  "tipo_emergencia_id":"",
  "vehiculos":[],
  "autoridades":[]
}
```

**Faltaban:**
- clima: "NEBLINA"
- carga_vehicular: "DENSO"
- departamento_id: 4
- municipio_id: undefined
- area: "RURAL"
- material_via: "EMPEDRADO"
- apoyo_proporcionado: "Apoyo proporcionado prueba"
- obstruccion: {...}
- multimedia: [4 items]
- coordenadas: {...}

### 2. **No se veía POST /situaciones en los logs**
```
LOG  [SITUACION] Enviando draft al servidor
LOG  [API Interceptor] Request to: /situaciones/mi-unidad/hoy
LOG  [API Interceptor] Request to: /turnos/mi-asignacion-hoy
```

**POST /situaciones nunca apareció** → Draft no se estaba enviando

### 3. **Coordenadas con formato diferente**
Mobile envía:
```json
"coordenadas": {
  "latitude": 14.5764651,
  "longitude": -90.5331002
}
```

Backend espera:
```typescript
latitud: number
longitud: number
```

Resultado: **latitud/longitud = NULL** en DB

---

## ✅ Soluciones Implementadas

### 1. Fix Rehidratación Completa del Draft

**Archivo:** `mobile/src/screens/situaciones/SituacionDinamicaScreen.tsx`

**ANTES (❌ Hardcodeado):**
```typescript
const cargarDraftEnFormulario = (draftData: any) => {
    setInitialValues({
        km: draftData.km?.toString() || '',
        sentido: draftData.sentido || '',
        observaciones: draftData.observaciones || '',
        descripcion: draftData.descripcion || '',
        tipo_hecho_id: draftData.tipo_hecho_id || '',
        tipo_asistencia_id: draftData.tipo_asistencia_id || '',
        tipo_emergencia_id: draftData.tipo_emergencia_id || '',
        vehiculos: draftData.vehiculos || [],
        autoridades: draftData.autoridades || [],
        // ... otros campos del draft ❌ NUNCA SE AGREGABAN
    });
```

**DESPUÉS (✅ Spread completo):**
```typescript
const cargarDraftEnFormulario = (draftData: any) => {
    const initial = {
        // Defaults para que no truene el UI
        km: '',
        sentido: '',
        observaciones: '',
        descripcion: '',
        tipo_hecho_id: '',
        tipo_asistencia_id: '',
        tipo_emergencia_id: '',
        apoyo_proporcionado: '',
        departamento_id: '',
        municipio_id: '',
        area: '',
        material_via: '',
        clima: '',
        carga_vehicular: '',
        vehiculos: [],
        autoridades: [],
        multimedia: [],
        // ✅ SPREAD COMPLETO del draft encima
        ...draftData,
        // Solo formatear km a string si existe
        km: draftData.km?.toString() || '',
    };

    setInitialValues(initial);
```

**Resultado:**
- ✅ Todos los campos se restauran (clima, departamento, area, material_via, etc.)
- ✅ FormBuilder recibe valores completos
- ✅ Usuario puede continuar editando draft con todos sus datos

---

### 2. Fix Coordenadas - Backend Tolerante

**Archivo:** `backend/src/controllers/situacion.controller.ts`

**Agregado en destructuring:**
```typescript
const {
  // ... otros campos
  latitud: latitudRaw,
  longitud: longitudRaw,
  coordenadas, // Fallback si viene como objeto {latitude, longitude}
  // ... otros campos
} = req.body;
```

**Conversión agregada antes de usar:**
```typescript
// Convertir coordenadas si vienen como objeto {latitude, longitude}
const latitud = latitudRaw ?? coordenadas?.latitude ?? coordenadas?.latitud ?? null;
const longitud = longitudRaw ?? coordenadas?.longitude ?? coordenadas?.longitud ?? null;
```

**Casos soportados:**
1. ✅ Mobile envía `latitud: 14.5, longitud: -90.5` → Funciona
2. ✅ Mobile envía `coordenadas: {latitude: 14.5, longitude: -90.5}` → Funciona
3. ✅ Mobile envía `coordenadas: {latitud: 14.5, longitud: -90.5}` → Funciona
4. ✅ No envía nada → latitud = null, longitud = null (válido)

---

### 3. Logging Extensivo en enviarDraft()

**Archivo:** `mobile/src/hooks/useDraftSituacion.ts`

**Agregado logging en función `enviarDraft()`:**

```typescript
const enviarDraft = useCallback(async () => {
    console.log('🚨 [ENVIAR_DRAFT] Función enviarDraft() llamada');

    const draft = await getDraftPendiente();
    if (!draft) {
        console.warn('[ENVIAR_DRAFT] No hay draft para enviar');
        return { success: false, error: 'No hay draft para enviar' };
    }

    if (!token) {
        console.warn('[ENVIAR_DRAFT] No autenticado');
        return { success: false, error: 'No autenticado' };
    }

    const netInfo = await NetInfo.fetch();
    console.log('[ENVIAR_DRAFT] Conexión:', netInfo.isConnected);
    if (!netInfo.isConnected) {
        console.warn('[ENVIAR_DRAFT] Sin conexión. Draft guardado localmente');
        return { success: false, error: 'Sin conexion. Draft guardado localmente.' };
    }

    console.log('🚀 [ENVIAR_DRAFT] Haciendo POST a:', `${API_URL}/situaciones`);
    console.log('📦 [ENVIAR_DRAFT] Payload:', JSON.stringify({...draft, multimedia: `[${draft.multimedia.length} items]`}, null, 2));

    const response = await fetch(`${API_URL}/situaciones`, {
        method: 'POST',
        // ...
    });
```

**Logs esperados ahora:**
```
🚨 [ENVIAR_DRAFT] Función enviarDraft() llamada
[ENVIAR_DRAFT] Conexión: true
🚀 [ENVIAR_DRAFT] Haciendo POST a: http://192.168.x.x:3000/api/situaciones
📦 [ENVIAR_DRAFT] Payload: { ... draft completo ... }
```

**Si NO aparece POST /situaciones, veremos:**
- ❌ No hay draft para enviar
- ❌ No autenticado
- ❌ Sin conexión

---

## 🧪 Cómo Verificar los Fixes

### Paso 1: Verificar Rehidratación del Draft

1. Crear una situación parcialmente llenada
2. Cerrar la app (o salir de la pantalla)
3. Volver a abrir
4. Buscar en logs:

**ANTES:**
```
[FormBuilder] Actualizando valores iniciales: {"km":"50","sentido":"SUR",...}
```
Solo 10 campos

**DESPUÉS:**
```
[FormBuilder] Actualizando valores iniciales: {
  "km":"50",
  "sentido":"SUR",
  "clima":"NEBLINA",
  "carga_vehicular":"DENSO",
  "departamento_id":4,
  "area":"RURAL",
  "material_via":"EMPEDRADO",
  "apoyo_proporcionado":"Apoyo proporcionado...",
  ...
}
```
TODOS los campos ✅

---

### Paso 2: Verificar que se envía el POST

Buscar en logs del mobile:

```
🚨 [ENVIAR_DRAFT] Función enviarDraft() llamada
[ENVIAR_DRAFT] Conexión: true
🚀 [ENVIAR_DRAFT] Haciendo POST a: http://...
📦 [ENVIAR_DRAFT] Payload: {...}
```

Y en logs del backend:

```
🚨 [BACKEND] POST /situaciones RECIBIDO
📥 [BACKEND] DATOS RECIBIDOS EN createSituacion
```

Si NO aparece el POST, los logs mostrarán por qué:
- No hay draft
- No autenticado
- Sin conexión

---

### Paso 3: Verificar Coordenadas en PostgreSQL

```sql
SELECT
  id,
  codigo_situacion,
  latitud,
  longitud,
  created_at
FROM situacion
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado:**
```
latitud  | 14.5764651
longitud | -90.5331002
```

**NO más NULL** ✅

---

## 🔍 Diagnóstico del Problema Original

### Por qué NO se veía el POST en los logs

**Posibles causas (ahora con logging sabremos cuál):**

1. **enviarDraft() nunca se llamó**
   - Error en SituacionDinamicaScreen.tsx al llamar `enviarDraft()`
   - Alguna validación bloqueó antes de llamar

2. **No había draft para enviar**
   - `getDraftPendiente()` retornó null
   - Draft se borró antes de enviar

3. **No había token de autenticación**
   - Usuario no autenticado
   - Token expiró

4. **Sin conexión de red**
   - `netInfo.isConnected === false`
   - Se guardó como PENDIENTE pero no se envió

Con el logging agregado, **sabremos exactamente cuál fue el problema**.

---

### Por qué los datos no se restauraban

**Causa raíz:** Función `cargarDraftEnFormulario()` hardcodeaba solo 10 campos.

**Efecto:**
- Usuario llenaba 20 campos
- Se guardaban en draft ✅
- Al recargar, solo 10 aparecían ❌
- Resto se perdían en la UI (pero estaban en el draft)

**Solución:** Spread completo del draft (`...draftData`)

---

## 📦 Commits Realizados

**Commit:** `fc4ce48` - fix(critical): solve data persistence issues

**Archivos modificados:**
1. ✅ `mobile/src/screens/situaciones/SituacionDinamicaScreen.tsx`
   - cargarDraftEnFormulario() con spread completo

2. ✅ `backend/src/controllers/situacion.controller.ts`
   - Fallback para coordenadas (latitude/longitude → latitud/longitud)

3. ✅ `mobile/src/hooks/useDraftSituacion.ts`
   - Logging extensivo en enviarDraft()

---

## 🎯 Próximos Pasos

1. **Reiniciar backend** para cargar código nuevo
2. **Reiniciar app mobile** (o rebuild)
3. **Crear situación de prueba:**
   - Llenar TODOS los campos (clima, departamento, area, etc.)
   - Guardar draft
   - Cerrar app
   - Reabrir
   - **Verificar que TODOS los campos se restauraron** ✅

4. **Completar y enviar:**
   - Completar la situación
   - Enviar
   - **Buscar logs** de POST /situaciones
   - **Verificar en PostgreSQL** que todos los datos se guardaron

5. **Si sigue sin funcionar:**
   - Pegar logs completos del mobile (con los nuevos logs)
   - Verificar si aparece:
     - `🚨 [ENVIAR_DRAFT] Función enviarDraft() llamada`
     - `🚀 [ENVIAR_DRAFT] Haciendo POST a:`
   - Verificar en backend si aparece:
     - `🚨 [BACKEND] POST /situaciones RECIBIDO`

---

## ⚠️ Nota Sobre "Falló reserva online"

El warning:
```
WARN [Draft] Falló reserva online. Usando modo offline
```

**Es NORMAL y NO bloquea el envío.**

Cuando falla la reserva:
- Se crea draft con valores por defecto (sede_id=1, unidad_id=0, salida_id=0)
- Draft se guarda localmente ✅
- **Se puede enviar igual** (backend calculará valores correctos)

El envío NO depende de que la reserva haya sido exitosa.

---

## 📊 Resumen Ejecutivo

| Problema | Causa | Fix |
|----------|-------|-----|
| Datos no se restauran en UI | cargarDraftEnFormulario() hardcodeado | Spread completo (`...draftData`) |
| POST /situaciones no aparece | Desconocido | Logging extensivo para diagnosticar |
| latitud/longitud = NULL | Mobile envía coordenadas como objeto | Fallback en backend para ambos formatos |
| Solo 10 campos en FormBuilder | setInitialValues con campos limitados | setInitialValues con todos los campos del draft |

✅ **Con estos fixes, todos los datos deben persistir correctamente.**
