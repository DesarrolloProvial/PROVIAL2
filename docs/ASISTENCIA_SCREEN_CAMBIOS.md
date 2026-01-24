# AsistenciaScreen - Cambios Implementados y Pendientes

## ✅ Cambios Ya Implementados por el Usuario

### 1. **Imports Actualizados**
```tsx
// ✅ ELIMINADO: import { useDraftSave } from '../../hooks/useDraftSave';
// ✅ AGREGADO:
import { useDraftSituacion } from '../../hooks/useDraftSituacion';
import { TipoSituacion } from '../../services/draftStorage';
```

### 2. **Hook Offline-First Integrado**
```tsx
// ✅ Implementado: useDraftSituacion hook con todas sus funciones
const {
    draft,
    loading: draftLoading,
    saving,
    sending,
    isOnline,
    hasPendiente,
    canCreateNew,
    crearDraft,
    actualizarDraft,
    enviarDraft,
    eliminarDraft,
    loadDraft,
    resolverConflictoUsarLocal,
    resolverConflictoUsarServidor,
    resolverConflictoEsperar,
} = useDraftSituacion();
```

### 3. **Verificación de Draft Pendiente**
```tsx
// ✅ Implementado: useEffect que verifica drafts pendientes
// - Detecta si hay draft de otro tipo (muestra modal de bloqueo)
// - Carga automáticamente draft de ASISTENCIA_VEHICULAR si existe
// - Detecta estado de CONFLICTO y muestra modal correspondiente
```

### 4. **Función `cargarDraftEnFormulario`**
```tsx
// ✅ Implementada: Carga datos del draft existente en el formulario
// - Mapea todos los campos del draft a los valores del form
// - Incluye vehiculos, gruas, ajustadores, autoridades, etc.
```

### 5. **Flujo `onSubmit` con Offline-First**
```tsx
// ✅ Refactorizado completamente:
// - Modo edición: sigue usando api.patch directo (correcto)
// - Modo creación: usa el flujo offline-first
//   1. Crea draft si no existe
//   2. Actualiza draft con todos los datos
//   3. Intenta enviar con enviarDraft()
//   4. Maneja resultados: success, conflicto, offline
```

### 6. **Modales de UI**
```tsx
// ✅ renderPendingModal(): Modal cuando hay draft de otro tipo
// ✅ renderConflictModal(): Modal para resolver conflictos con opciones:
//    - Usar Mis Datos (sobrescribir servidor)
//    - Usar Datos del Servidor (descartar local)
//    - Esperar Decisión del COP
```

### 7. **Indicadores de Estado**
```tsx
// ✅ Chips de estado en el header:
// - Online/Offline
// - Guardando...
// - Draft: PENDIENTE/ENVIANDO/CONFLICTO/etc
```

### 8. **Botón Adaptativo**
```tsx
// ✅ El botón principal cambia según estado:
// {isOnline ? 'Guardar Asistencia' : 'Guardar Local'}
```

---

## ⚠️ Problemas Detectados y Correcciones Necesarias

### **Problema 1: Mapeo Incorrecto de Campos del Draft**

**Ubicación:** Líneas 206-220 en `cargarDraftEnFormulario`

**Problema:**
```tsx
// ❌ INCORRECTO: El draft usa nombres diferentes
tipoAsistencia: draftData.tipo_asistencia || '',  // ❌ NO EXISTE en DraftSituacion
autoridadesSeleccionadas: draftData.autoridades || [],  // ❌ NO EXISTE
```

**Según `draftStorage.ts`, la estructura `DraftSituacion` es:**
```tsx
interface DraftSituacion {
    // Campos básicos correctos:
    km: number;
    sentido: string;
    latitud: number;
    longitud: number;
    descripcion?: string;
    observaciones?: string;
    
    // Campos específicos de tipo:
    tipo_hecho?: string;       // Para INCIDENTE
    tipo_asistencia?: string;  // Para ASISTENCIA  ✅ Este SÍ existe
    tipo_emergencia?: string;  // Para EMERGENCIA
    
    // Arrays genéricos:
    vehiculos?: any[];
    personas?: any[];
    autoridades?: any[];  // ✅ Este SÍ existe
}
```

**✅ CORRECCIÓN Necesaria:**
```tsx
const cargarDraftEnFormulario = (draftData: any) => {
    reset({
        tipoAsistencia: draftData.tipo_asistencia || '',  // ✅ CORRECTO
        km: draftData.km?.toString() || '',
        sentido: draftData.sentido || '',
        servicioProporcionado: draftData.descripcion || '',
        observaciones: draftData.observaciones || '',
        // ❌ ESTOS CAMPOS NO ESTÁN EN DraftSituacion:
        jurisdiccion: '',  // No existe en draft
        direccion_detallada: '',  // No existe en draft
        vehiculos: draftData.vehiculos || [],  // ✅ CORRECTO
        gruas: [],  // ❌ No existe en draft, siempre vacío
        ajustadores: [],  // ❌ No existe en draft, siempre vacío
        autoridadesSeleccionadas: draftData.autoridades || [],  // ✅ CORRECTO
        detallesAutoridades: {},  // ❌ No existe en draft estructurado
        socorroSeleccionado: [],  // ❌ No existe en draft
        detallesSocorro: {},  // ❌ No existe en draft
        obstruye: getDefaultObstruccion(),  // ❌ No existe en draft
    });
    
    if (draftData.latitud && draftData.longitud) {
        setCoordenadas({
            latitud: draftData.latitud,
            longitud: draftData.longitud,
        });
    }
};
```

---

### **Problema 2: Estructura `DraftSituacion` Limitada**

**El problema:** `DraftSituacion` (diseñado para el sistema offline-first) **NO soporta** todos los campos específicos de Asistencia:
- ❌ `gruas`
- ❌ `ajustadores`
- ❌ `detalles_autoridades`
- ❌ `socorro`
- ❌ `detalles_socorro`
- ❌ `obstruye`
- ❌ `jurisdiccion`
- ❌ `direccion_detallada`

**La estructura actual solo tiene:**
```tsx
vehiculos?: any[];
personas?: any[];
autoridades?: any[];
```

**Opciones de Solución:**

#### **Opción A: Extender `DraftSituacion` (RECOMENDADA)**
Agregar campos específicos de asistencia a la interfaz:

```tsx
// En draftStorage.ts
export interface DraftSituacion {
    // ... campos existentes ...
    
    // Campos específicos de ASISTENCIA_VEHICULAR
    gruas?: any[];
    ajustadores?: any[];
    detalles_autoridades?: Record<string, any>;
    socorro?: any[];
    detalles_socorro?: Record<string, any>;
    obstruye?: ObstruccionData;
    jurisdiccion?: string;
    direccion_detallada?: string;
}
```

**Ventajas:**
- ✅ Soporte completo para todos los campos
- ✅ Type-safe
- ✅ Persistencia completa offline

**Desventajas:**
- ⚠️ La estructura se vuelve más específica (menos genérica)

---

#### **Opción B: Usar Campo Genérico `datos_adicionales`**
```tsx
// En draftStorage.ts
export interface DraftSituacion {
    // ... campos existentes ...
    datos_adicionales?: Record<string, any>;  // Para campos específicos del tipo
}

// En AsistenciaScreen
await actualizarDraft({
    datos_adicionales: {
        gruas: data.gruas,
        ajustadores: data.ajustadores,
        detalles_autoridades: data.detallesAutoridades,
        socorro: data.socorroSeleccionado,
        detalles_socorro: data.detallesSocorro,
        obstruye: data.obstruye,
        jurisdiccion: data.jurisdiccion,
        direccion_detallada: data.direccion_detallada,
    }
}, true);
```

**Ventajas:**
- ✅ No contamina la estructura principal
- ✅ Flexibilidad para otros tipos de situación

**Desventajas:**
- ❌ Menos type-safe
- ❌ Más indirección en el código

---

### **Problema 3: Mapeo al Actualizar Draft**

**Ubicación:** Líneas 326-348 en `onSubmit`

**Problema Actual:**
```tsx
await actualizarDraft({
    // ... campos básicos ...
    tipo_asistencia: data.tipoAsistencia,  // ✅ CORRECTO
    vehiculos: data.vehiculos,  // ✅ CORRECTO
    autoridades: data.autoridadesSeleccionadas,  // ✅ CORRECTO (si nombre es `autoridades`)
    
    // ❌ ESTOS NO EXISTEN EN DraftSituacion actual:
    gruas: data.gruas,
    ajustadores: data.ajustadores,
    detalles_autoridades: data.detallesAutoridades,
    socorro: data.socorroSeleccionado,
    detalles_socorro: data.detallesSocorro,
    obstruye: data.obstruye,
    jurisdiccion: data.jurisdiccion,
    direccion_detallada: data.direccion_detallada,
} as any, true);  // ⚠️ Forzando con `as any`
```

---

### **Problema 4: Constante `TIPO_SITUACION_ASISTENCIA_ID`**

**Ubicación:** Línea 39

```tsx
const TIPO_SITUACION_ASISTENCIA_ID = 70;  // ⚠️ ¿Es correcto este ID?
```

**Acción Necesaria:**
- ✅ Verificar en la base de datos que el tipo "ASISTENCIA_VEHICULAR" tenga ID = 70
- ✅ O bien, hacer una llamada al backend para obtener el ID dinámicamente

---

## 🔧 Plan de Acción Recomendado

### **PASO 1: Extender `DraftSituacion`** (5 min)
Agregar campos específicos de asistencia a la interfaz en `draftStorage.ts`.

### **PASO 2: Corregir `cargarDraftEnFormulario`** (2 min)
Mapear correctamente los campos del draft al formulario.

### **PASO 3: Probar el Flujo Completo** (10 min)
1. Crear una nueva asistencia
2. Guardar offline
3. Verificar que se persiste correctamente
4. Enviar online
5. Probar flujo de conflictos

### **PASO 4: Verificar Constante de Tipo** (2 min)
Confirmar que el ID 70 corresponde a "ASISTENCIA_VEHICULAR".

---

## 📋 Checklist de Completitud

- [✅] Import de `useDraftSituacion`
- [✅] Hook integrado y consumido
- [✅] Verificación de draft pendiente
- [✅] Modal de draft pendiente
- [✅] Modal de conflictos
- [✅] Indicadores de estado UI
- [✅] Flujo `onSubmit` refactorizado
- [❌] **Campo `DraftSituacion` extendido** ← PENDIENTE
- [❌] **`cargarDraftEnFormulario` corregido** ← PENDIENTE
- [❌] **Verificar ID de tipo situación** ← PENDIENTE
- [❌] **Pruebas end-to-end** ← PENDIENTE

---

## 💬 Recomendación Inmediata

**Opción A es la mejor:** Extender `DraftSituacion` con los campos específicos de asistencia. Es más limpio, type-safe, y mantiene la consistencia del sistema.

¿Procedo a hacer estos cambios?
