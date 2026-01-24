# Problema: AsistenciaScreen Causa Crash

## Diagnóstico

El `AsistenciaScreen.tsx` está causando un crash debido a que **NO está integrado con el nuevo sistema Offline-First**, mientras que el backend y la base de datos ya fueron actualizados.

### Causa Raíz

1. **Hook Antiguo**: La pantalla usa `useDraftSave` (sistema viejo de borradores) en lugar de `useDraftSituacion` (nuevo sistema offline-first)

2. **Envío Directo**: Envía datos directamente al servidor con `api.post('/situaciones', ...)` sin pasar por el flujo de draft

3. **Falta de Integración**: No genera el `codigo_situacion` determinista ni maneja conflictos

4. **Incompatibilidad con Backend**: El backend actualizado (migración 106) puede estar esperando:
   - Campo `codigo_situacion` (nuevo)
   - Estructura de datos diferente
   - Validaciones adicionales

### Código Problemático

```tsx
// Línea 3 - Import del hook viejo
import { useDraftSave } from '../../hooks/useDraftSave';

// Líneas 114-118 - Uso del hook viejo
const { loadDraft, clearDraft } = useDraftSave(
    'draft_asistencia_v2',
    draftData,
    { enabled: !guardando && !editMode }
);

// Línea 284 - Envío directo sin pasar por el sistema de drafts
const response = await api.post('/situaciones', asistenciaData);
```

## Soluciones Posibles

### Opción 1: Integración Completa con Sistema Offline-First (RECOMENDADA)

**Ventajas:**
- ✅ Funcionalidad offline completa
- ✅ Gestión de conflictos
- ✅ ID determinista
- ✅ Consistencia con el resto del sistema
- ✅ Workflow "GUARDAR" vs "CERRAR"

**Desventajas:**
- ⏱️ Requiere refactorización significativa de `AsistenciaScreen`
- 🔧 Cambios en el flujo UI/UX

**Pasos:**
1. Reemplazar `useDraftSave` con `useDraftSituacion`
2. Adaptar el formulario para usar la estructura `DraftSituacion`
3. Implementar botones "GUARDAR" y "CERRAR" (dos etapas)
4. Integrar la gestión de conflictos
5. Adaptar `MultimediaCapture` para trabajar con el draft

**Estimación:** 3-4 horas de trabajo

---

### Opción 2: Solución Temporal - Adaptar Backend para Aceptar Ambos (TEMPORAL)

**Ventajas:**
- ⚡ Solución rápida
- 🔧 Mínimos cambios en el frontend

**Desventajas:**
- ❌ Asistencia NO funcionará offline
- ❌ NO habrá gestión de conflictos para asistencias
- ❌ Inconsistencia en el sistema
- ⚠️ Deuda técnica

**Pasos:**
1. Modificar el backend para hacer `codigo_situacion` opcional
2. Generar `codigo_situacion` en el servidor si no viene del cliente
3. Mantener `AsistenciaScreen` como está

**Estimación:** 30 minutos

---

### Opción 3: Quick Fix - Generar codigo_situacion en el Cliente (MUY TEMPORAL)

**Ventajas:**
- ⚡⚡ Solución inmediata
- 🔧 Un solo cambio pequeño

**Desventajas:**
- ❌ Asistencia NO funcionará offline
- ❌ NO habrá gestión de conflictos
- ❌ Código duplicado
- ⚠️⚠️ Máxima deuda técnica

**Pasos:**
1. Importar `generateSituacionId` en `AsistenciaScreen`
2. Generar el ID antes de enviar al servidor
3. Incluir `codigo_situacion` en `asistenciaData`

**Código:**
```tsx
import { generateSituacionId } from '../../utils/situacionId';

// En onSubmit, antes de api.post:
const codigoSituacion = generateSituacionId({
    fecha: new Date(),
    sede_id: salidaActiva!.sede_id,
    unidad_codigo: salidaActiva!.unidad_codigo,
    tipo_situacion_id: /* buscar ID de ASISTENCIA_VEHICULAR */,
    ruta_id: salidaActiva!.ruta_id,
    km: parseFloat(data.km),
    num_situacion_salida: /* necesita reservar número */
});

const asistenciaData = {
    codigo_situacion: codigoSituacion,
    // ... resto de campos
};
```

**Estimación:** 15 minutos

**PROBLEMA:** Necesita reservar `num_situacion_salida`, lo cual requiere llamada al endpoint `/api/unidades/:codigo/reservar-numero-salida`

---

## Recomendación

### Para Producción Inmediata:
- **Opción 2** (adaptar backend) para desbloquear el desarrollo

### Para Implementación Final:
- **Opción 1** (integración completa) para tener un sistema consistente y robusto

### Plan Sugerido:

```
FASE 1 (AHORA - 30 min):
→ Implementar Opción 2
→ Hacer codigo_situacion opcional en backend
→ Generar ID en servidor si no existe

FASE 2 (PRÓXIMA SESIÓN - 3-4 horas):
→ Refactorizar AsistenciaScreen
→ Integrar useDraftSituacion
→ Implementar workflow GUARDAR/CERRAR
→ Probar flujo completo offline

FASE 3 (VALIDACIÓN):
→ Testing exhaustivo
→ Documentación de uso
→ Eliminar código legacy
```

## Próximos Pasos

¿Qué opción prefieres implementar? 

1. **Quick Fix Temporal** (Opción 2) - Para desbloquear ahora
2. **Integración Completa** (Opción 1) - Para hacer bien desde el inicio
3. **Ambas** - Fix temporal ahora + planificar refactor

