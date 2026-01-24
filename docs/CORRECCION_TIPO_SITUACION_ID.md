# CORRECCIÓN CRÍTICA: El Móvil NO Debe Conocer IDs de Base de Datos

## ❌ Problema Detectado

El diseño actual **viola el principio de separación backend/frontend**:

```typescript
// ❌ INCORRECTO: El móvil conoce IDs internos de la BD
await crearDraft({
    tipo_situacion: 'ASISTENCIA_VEHICULAR',
    tipo_situacion_id: 70,  // ❌ ID hardcodeado del móvil
    // ...
});
```

## ✅ Solución: Backend Resuelve Tipos

### **Cambios Necesarios:**

---

### **1. Modificar `DraftSituacion` - Eliminar`tipo_situacion_id`**

**Archivo:** `mobile/src/services/draftStorage.ts`

```typescript
export interface DraftSituacion {
  // ...campos existentes...
  
  // Tipo de situación (SOLO STRING, no ID)
  tipo_situacion: TipoSituacion;
  // ❌ ELIMINAR: tipo_situacion_id: number;
  
  // ...resto de campos...
}
```

**Razón:** El móvil solo debe conocer el NOMBRE del tipo, no el ID de la base de datos.

---

### **2. Modificar Generación de ID - Sin `tipo_situacion_id`**

**Problema:** El `codigo_situacion` actual incluye el `tipo_situacion_id`:
```
20260121-1-030-70-86-50-4
                 ^^ tipo_situacion_id
```

**Opciones:**

#### **Opción A: Eliminar TIPO del ID (RECOMENDADA)**
```
Antes: 20260121-1-030-70-86-50-4
Ahora: 20260121-1-030-86-50-4
```

**Ventajas:**
- ✅ Móvil no necesita conocer IDs
- ✅ ID más corto
- ✅ Aún 100% determinista y único

**Desventajas:**
- ⚠️ Menos información visual en el ID

#### **Opción B: Backend Completa el ID**
- Móvil genera: `20260121-1-030-ASISTENCIA-86-50-4`
- Backend reemplaza: `20260121-1-030-70-86-50-4`

**Ventajas:**
- ✅ ID final tiene toda la info
- ✅ Móvil no conoce IDs

**Desventajas:**
- ⚠️ Más complejidad
- ⚠️ El ID cambia entre móvil y servidor

---

### **3. Backend Resuelve Tipo a ID**

**Archivo:** `backend/src/controllers/situaciones.controller.ts`

```typescript
// Nuevo helper: resolver tipo string a ID
async function resolveTipoSituacion(nombreTipo: string): Promise<number> {
  const result = await db.oneOrNone(`
    SELECT id FROM tipo_situacion 
    WHERE nombre = $1 OR codigo = $1
  `, [nombreTipo]);
  
  if (!result) {
    throw new Error(`Tipo de situación no válido: ${nombreTipo}`);
  }
  
  return result.id;
}

// En el endpoint POST /situaciones:
export async function crearSituacion(req: Request, res: Response) {
  const { tipo_situacion, ... } = req.body;
  
  // ✅ Backend resuelve el string a ID
  const tipo_situacion_id = await resolveTipoSituacion(tipo_situacion);
  
  // Continuar con la creación...
}
```

---

### **4. Actualizar Hook `useDraftSituacion`**

**Archivo:** `mobile/src/hooks/useDraftSituacion.ts`

```typescript
// ANTES:
const crearDraft = useCallback(async (params: {
  tipo_situacion: TipoSituacion;
  tipo_situacion_id: number;  // ❌ ELIMINAR
  // ...
}) => {
  // ...
}, []);

// DESPUÉS:
const crearDraft = useCallback(async (params: {
  tipo_situacion: TipoSituacion;  // ✅ Solo el string
  // ...
}) => {
  // ...
  
  // ✅ ID se genera sin tipo_situacion_id
  const id = generateSituacionId({
    fecha: new Date(reserva.fecha),
    sede_id: reserva.sede_id,
    unidad_codigo: reserva.unidad_codigo,
    // tipo_situacion_id: NO SE USA
    ruta_id: params.ruta_id,
    km: params.km,
    num_situacion_salida: reserva.num_situacion_salida
  });
}, []);
```

---

### **5. Actualizar `generateSituacionId`**

**Archivo:** `mobile/src/utils/situacionId.ts`

```typescript
// OPCIÓN A: Sin tipo en el ID (RECOMENDADA)
export function generateSituacionId(params: {
  fecha: Date;
  sede_id: number;
  unidad_codigo: string;
  // tipo_situacion_id: ELIMINADO
  ruta_id: number;
  km: number;
  num_situacion_salida: number;
}): string {
  const fecha = format(params.fecha, 'yyyyMMdd');
  const sede = String(params.sede_id);
  const unidad = params.unidad_codigo;
  // const tipo = String(params.tipo_situacion_id);  // ELIMINADO
  const ruta = String(params.ruta_id);
  const km = String(Math.floor(params.km));
  const num = String(params.num_situacion_salida);

  // SIN tipo:
  return `${fecha}-${sede}-${unidad}-${ruta}-${km}-${num}`;
}

// Ejemplo:
// Antes: 20260121-1-030-70-86-50-4
// Ahora: 20260121-1-030-86-50-4
```

---

### **6. Actualizar `AsistenciaScreen`**

**Archivo:** `mobile/src/screens/brigada/AsistenciaScreen.tsx`

```typescript
// ELIMINAR:
// const TIPO_SITUACION_ASISTENCIA_ID = 70;

// En crearDraft:
await crearDraft({
    tipo_situacion: 'ASISTENCIA_VEHICULAR' as TipoSituacion,  // ✅ Solo string
    // tipo_situacion_id: TIPO_SITUACION_ASISTENCIA_ID,  // ❌ ELIMINAR
    unidad_codigo: salidaActiva!.unidad_codigo,
    ruta_id: salidaActiva!.ruta_id,
    // ...
});
```

---

## 📊 Comparación de Opciones para el ID

| Aspecto | Con Tipo en ID | Sin Tipo en ID | Ganador |
|---------|----------------|----------------|---------|
| Móvil no conoce IDs | ❌ Necesita el ID | ✅ No lo necesita | **Sin Tipo** |
| Legibilidad | ✅ Más info | ⚠️ Menos info | Con Tipo |
| Longitud | 28 chars | 23 chars | **Sin Tipo** |
| Unicidad | ✅ | ✅ | Empate |
| Determinismo | ✅ | ✅ | Empate |
| Simplicidad | ⚠️ | ✅ | **Sin Tipo** |

**Recomendación:** **Eliminar el tipo del ID** (Opción A)

---

## 🎯 Ventajas de la Nueva Arquitectura

1. ✅ **Separación correcta:** El móvil NO conoce IDs internos
2. ✅ **Mantenibilidad:** Cambios en la BD no afectan al móvil
3. ✅ **Flexibilidad:** Fácil agregar nuevos tipos sin tocar el móvil
4. ✅ **Claridad:** El tipo se envía como string legible
5. ✅ **Backend en control:** El servidor valida y resuelve tipos

---

## ⚠️ Consideraciones

### **Migración de Datos Existentes:**

Si ya hay situaciones con `codigo_situacion` en formato viejo:
```sql
-- Opcional: Regenerar códigos sin tipo
UPDATE situacion
SET codigo_situacion = REGEXP_REPLACE(
    codigo_situacion,
    '^(\\d{8})-(\\d+)-(\\w+)-(\\d+)-(\\d+)-(\\d+)-(\\d+)$',
    '\\1-\\2-\\3-\\5-\\6-\\7'
)
WHERE codigo_situacion IS NOT NULL;
```

### **Compatibilidad:**

Si necesitas mantener compatibilidad temporal:
- El backend puede aceptar ambas versiones
- Detectar por conteo de segmentos (7 vs 6)

---

## 📋 Checklist de Implementación

- [ ] Actualizar `DraftSituacion` (eliminar `tipo_situacion_id`)
- [ ] Actualizar `generateSituacionId` (eliminar parámetro tipo)
- [ ] Actualizar `useDraftSituacion.crearDraft` (eliminar parámetro)
- [ ] Actualizar `AsistenciaScreen` (eliminar constante ID)
- [ ] Crear helper `resolveTipoSituacion` en backend
- [ ] Actualizar endpoint POST `/situaciones`
- [ ] Actualizar endpoint PATCH `/situaciones/:id`
- [ ] Testing: Crear situación con nuevo formato
- [ ] Verificar conflictos con nuevo ID
- [ ] Documentar cambio en `OFFLINE_FIRST_SITUACIONES.md`

---

## 🚀 Próximos Pasos

**¿Procedo a implementar estos cambios?**

La corrección implica:
1. ~10 minutos de cambios en el código
2. Testing básico
3. Actualización de documentación

Esta es la arquitectura correcta y debe implementarse antes de continuar.
