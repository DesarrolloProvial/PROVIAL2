# 🎯 ESTADO DE LAS SITUACIONES: Qué Existe y Qué Falta

**Fecha:** 2026-01-22  
**Contexto:** Implementación del Sistema de Situaciones Offline-First

---

## 📊 Resumen Ejecutivo

### ✅ Lo que YA ESTÁ IMPLEMENTADO (3 situaciones)

| Situación | Config | Estado | Campos |
|-----------|--------|--------|--------|
| **Asistencia Vial** | `asistenciaForm.ts` | ✅ Completo | 297 líneas, 4 tabs, 40+ campos |
| **Hecho de Tránsito** | `hechoTransitoForm.ts` | ✅ Completo | 326 líneas, conversión desde Asistencia |
| **Emergencia Vial** | `emergenciaForm.ts` | ✅ Completo | 277 líneas, rango de KM |

**Total implementado:** 3/~50 tipos de situaciones (6%)

---

### ❌ Lo que FALTA IMPLEMENTAR (~47 situaciones)

Según tu documento `PREGUNTAS_CLARIFICACION_SITUACIONES.md`, hay **12 grupos** de situaciones pendientes:

#### **Grupo 2: Simples (11 situaciones)** 🟡 PRIORIDAD ALTA
- Puesto fijo
- Parada estratégica
- Señalizando
- Lavado
- Regulación
- Patrullaje
- Parada Autorizada
- Regulación colonia
- Verificación
- Baño
- Cajero
- Comida

**Complejidad:** BAJA (solo campos base + 1-2 campos específicos)  
**Tiempo estimado:** 15-30 minutos cada una  
**Total:** ~3-5 horas para las 11

---

#### **Grupo 3: Conteo/Mediciones (2 situaciones)** 🟡 PRIORIDAD ALTA
- Conteo vehicular
- Toma de velocidad

**Complejidad:** MEDIA (requiere componente de contador)  
**Tiempo estimado:** 1-2 horas cada una

---

#### **Grupo 4: Supervisión (1 situación)** 🟢 PRIORIDAD MEDIA
- Supervisando unidad

**Complejidad:** BAJA (select de unidades activas)  
**Tiempo estimado:** 30 minutos

---

#### **Grupo 5: Escolta (1 situación)** 🟠 PRIORIDAD MEDIA
- Escoltando carga ancha

**Complejidad:** MEDIA (3 puntos GPS, empresa, piloto, vehículo)  
**Tiempo estimado:** 1 hora

---

#### **Grupo 6: Operativos (3 situaciones)** 🔴 PRIORIDAD BAJA
- Operativo PNC-DT
- Operativo interinstitucional
- Operativo Provial

**Complejidad:** ALTA (vehículos registrados, llamadas atención, sanciones)  
**Tiempo estimado:** 2-3 horas cada una  
**Bloqueador:** Necesitas responder preguntas #12 y #13

---

#### **Grupo 7: Consignación (1 situación)** 🟠 PRIORIDAD MEDIA
- Consignación

**Complejidad:** MEDIA (piloto, vehículo, autoridad, traslado)  
**Tiempo estimado:** 1 hora  
**Bloqueador:** Pregunta #21 (¿text libre o select?)

---

#### **Grupo 8: Mantenimiento (1 situación)** 🟢 PRIORIDAD MEDIA
- Falla Mecánica

**Complejidad:** BAJA (tipo falla, grúa, foto)  
**Tiempo estimado:** 45 minutos  
**Bloqueador:** Pregunta #22 (catálogo de fallas)

---

#### **Grupo 9: Salud (2 situaciones)** 🟢 PRIORIDAD MEDIA
- Hospital
- Compañero enfermo

**Complejidad:** BAJA (motivo, hospital/malestar)  
**Tiempo estimado:** 30 minutos cada una

---

#### **Grupo 10: Administrativas (2 situaciones)** 🟢 PRIORIDAD BAJA
- Dejando personal
- Comisión

**Complejidad:** BAJA (campos base + observaciones)  
**Tiempo estimado:** 20 minutos cada una

---

#### **Grupo 11: Combustible (1 situación)** 🟢 PRIORIDAD MEDIA
- Abastecimiento

**Complejidad:** BAJA (inicial, final, odómetro)  
**Tiempo estimado:** 30 minutos  
**Bloqueador:** Pregunta #23 (¿se calcula automático? ¿costo?)

---

#### **Grupo 12: Apoyos (9 situaciones)** 🟠 PRIORIDAD MEDIA
- Apoyo MP
- Apoyo otra unidad
- Apoyo trabajos carretera
- Apoyo ciclismo
- Apoyo DIGEF
- Apoyo triatlón
- Apoyo atletismo
- Apoyo antorcha
- Apoyo institución

**Complejidad:** MEDIA (institución, encargado, puntos GPS)  
**Tiempo estimado:** 45 minutos cada una  
**Bloqueador:** Pregunta #24 (campos de institución)

---

## 🚧 BLOQUEADORES CRÍTICOS

Antes de implementar las situaciones faltantes, **DEBES responder estas preguntas** del documento `PREGUNTAS_CLARIFICACION_SITUACIONES.md`:

### 🔴 Bloqueadores de Alto Impacto

| # | Pregunta | Afecta a | Urgencia |
|---|----------|----------|----------|
| **#1** | Departamento/Municipio offline | TODAS | 🔴 CRÍTICO |
| **#3** | Estructura de VehiculoForm | Hecho, Asistencia, Operativos | 🔴 CRÍTICO |
| **#4** | Vehículos registrados vs involucrados | Operativos | 🔴 CRÍTICO |

### 🟡 Bloqueadores de Medio Impacto

| # | Pregunta | Afecta a | Urgencia |
|---|----------|----------|----------|
| **#5** | Interfaz de conteo vehicular | Conteo vehicular | 🟡 ALTA |
| **#6** | Formato toma de velocidad | Toma de velocidad | 🟡 ALTA |
| **#11** | Coordenadas múltiples | Escolta, Apoyos | 🟡 ALTA |

### 🟢 Bloqueadores de Bajo Impacto

| # | Pregunta | Afecta a | Urgencia |
|---|----------|----------|----------|
| **#2** | No de Grupo | Hecho de Tránsito | 🟢 MEDIA |
| **#7** | Datos de piloto | Múltiples | 🟢 MEDIA |
| **#8** | Datos de vehículo simple | Múltiples | 🟢 MEDIA |
| **#10** | Motivo (libre o catálogo) | Múltiples | 🟢 MEDIA |
| **#12** | Llamadas de atención | Operativos | 🟢 MEDIA |
| **#13** | Sanción standalone | Operativo PNC-DT | 🟢 MEDIA |
| **#16** | Área afectada en emergencia | Emergencia | 🟢 BAJA |
| **#17** | Apoyo proporcionado | Asistencia | 🟢 BAJA |
| **#19** | Unidad supervisada | Supervisión | 🟢 MEDIA |
| **#20** | Empresa en escolta | Escolta | 🟢 MEDIA |
| **#21** | Traslado en consignación | Consignación | 🟢 MEDIA |
| **#22** | Tipo de falla | Falla Mecánica | 🟢 MEDIA |
| **#23** | Combustible | Abastecimiento | 🟢 MEDIA |
| **#24** | Institución que pidió apoyo | Apoyos (9) | 🟡 ALTA |

---

## 📋 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Resolver Bloqueadores (1-2 días)
1. ✅ Responder las 25 preguntas del documento
2. ✅ Definir catálogos necesarios
3. ✅ Crear componentes reutilizables faltantes

### Fase 2: Implementar Situaciones Simples (1 semana)
**Orden sugerido por complejidad:**

1. **Grupo 2 - Simples (11)** → 1-2 días
   - Usar `asistenciaForm.ts` como plantilla
   - Solo cambiar campos específicos
   
2. **Grupo 4 - Supervisión (1)** → 2 horas
3. **Grupo 9 - Salud (2)** → 1 día
4. **Grupo 10 - Administrativas (2)** → 1 día
5. **Grupo 11 - Combustible (1)** → 2 horas

**Total:** ~15 situaciones en 3-4 días

---

### Fase 3: Implementar Situaciones Medias (1 semana)
1. **Grupo 3 - Conteo/Mediciones (2)** → 1-2 días
   - Crear componente `ContadorVehicular`
   - Crear componente `TomadorVelocidad`

2. **Grupo 5 - Escolta (1)** → 1 día
3. **Grupo 7 - Consignación (1)** → 1 día
4. **Grupo 8 - Mantenimiento (1)** → 1 día
5. **Grupo 12 - Apoyos (9)** → 2-3 días
   - Crear componente `DatosInstitucion`
   - Reutilizar para las 9 situaciones

**Total:** ~15 situaciones en 5-7 días

---

### Fase 4: Implementar Situaciones Complejas (1 semana)
1. **Grupo 6 - Operativos (3)** → 3-5 días
   - Crear componente `LlamadaAtencion`
   - Crear componente `SancionForm`
   - Integrar con `VehiculoForm`

**Total:** 3 situaciones en 5-7 días

---

## 🎯 ESTIMACIÓN TOTAL

| Fase | Situaciones | Tiempo Estimado |
|------|-------------|-----------------|
| Fase 1 (Bloqueadores) | 0 | 1-2 días |
| Fase 2 (Simples) | 15 | 3-4 días |
| Fase 3 (Medias) | 15 | 5-7 días |
| Fase 4 (Complejas) | 3 | 5-7 días |
| **TOTAL** | **33** | **14-20 días** |

**Nota:** Esto asume trabajo de 1 desarrollador a tiempo completo.

---

## 📝 PLANTILLA PARA CREAR NUEVAS SITUACIONES

### Ejemplo: Crear "Puesto Fijo"

**Paso 1:** Crear archivo `puestoFijoForm.ts`

```typescript
import { FormConfig } from '../../core/FormBuilder/types';

export const puestoFijoFormConfig: FormConfig = {
  id: 'puesto_fijo_form',
  title: 'Puesto Fijo',
  description: 'Registro de puesto fijo',
  
  defaultValues: {
    // Campos base se llenan automáticamente
  },

  sections: {
    default: [
      {
        id: 'ubicacion',
        title: 'Ubicación',
        fields: [
          {
            name: 'coordenadas',
            type: 'gps',
            label: 'Coordenadas GPS',
            required: true,
            autoCapture: true,
          },
          {
            name: 'km',
            type: 'number',
            label: 'Kilómetro',
            required: true,
            min: 0,
          },
          {
            name: 'sentido',
            type: 'select',
            label: 'Sentido',
            required: true,
            options: '@catalogos.sentidos',
          },
          {
            name: 'departamento',
            type: 'select',
            label: 'Departamento',
            required: true,
            options: '@catalogos.departamentos',
          },
          {
            name: 'municipio',
            type: 'select',
            label: 'Municipio',
            required: true,
            options: '@catalogos.municipios',
            // Filtrar por departamento seleccionado
            visibleIf: (data) => !!data.departamento,
          },
        ],
      },
      {
        id: 'condiciones',
        title: 'Condiciones',
        fields: [
          {
            name: 'clima',
            type: 'select',
            label: 'Clima',
            required: true,
            options: '@catalogos.climas',
          },
          {
            name: 'carga_vehicular',
            type: 'select',
            label: 'Carga Vehicular',
            required: true,
            options: '@catalogos.carga_vehicular',
          },
        ],
      },
      {
        id: 'observaciones',
        title: 'Observaciones',
        fields: [
          {
            name: 'observaciones',
            type: 'textarea',
            label: 'Observaciones',
            placeholder: 'Detalles adicionales...',
            rows: 4,
          },
        ],
      },
    ],
  },
};
```

**Paso 2:** Registrar en `config/formularios/index.ts`

```typescript
import { puestoFijoFormConfig } from './puestoFijoForm';

export const formConfigRegistry = {
  'ASISTENCIA': asistenciaFormConfig,
  'EMERGENCIA': emergenciaFormConfig,
  'HECHO_TRANSITO': hechoTransitoFormConfig,
  'PUESTO_FIJO': puestoFijoFormConfig,  // ← AGREGAR
};
```

**Paso 3:** Agregar ruta en navegador

```typescript
// BrigadaNavigator.tsx
<Stack.Screen 
  name="PuestoFijo" 
  component={SituacionDinamicaScreen}
  initialParams={{ 
    codigoSituacion: 'PUESTO_FIJO',
    tipoSituacionId: 10, // ID de la BD
    nombreSituacion: 'Puesto Fijo'
  }}
/>
```

**¡Listo!** La situación ya funciona con:
- ✅ Validación automática
- ✅ Guardado offline
- ✅ Sincronización
- ✅ Todos los campos del FormBuilder

---

## 🛠️ COMPONENTES REUTILIZABLES FALTANTES

Para completar todas las situaciones, necesitas crear estos componentes:

### 1. `ContadorVehicular.tsx` (Para Conteo Vehicular)
```typescript
interface Props {
  value: Record<string, number>; // { 'sedan': 25, 'pickup': 12 }
  onChange: (value: Record<string, number>) => void;
}
```

### 2. `TomadorVelocidad.tsx` (Para Toma de Velocidad)
```typescript
interface Medicion {
  tipo_vehiculo: string;
  velocidad: number;
  timestamp: Date;
}

interface Props {
  value: Medicion[];
  onChange: (value: Medicion[]) => void;
}
```

### 3. `DatosInstitucion.tsx` (Para Apoyos)
```typescript
interface Institucion {
  nombre: string;
  encargado: string;
  telefono: string;
  cargo: string;
}

interface Props {
  value: Institucion;
  onChange: (value: Institucion) => void;
}
```

### 4. `LlamadaAtencion.tsx` (Para Operativos)
```typescript
interface LlamadaAtencion {
  motivo: string;
  piloto: DatosPiloto;
  vehiculo: DatosVehiculo;
}

interface Props {
  value: LlamadaAtencion[];
  onChange: (value: LlamadaAtencion[]) => void;
}
```

### 5. `PuntosGPSMultiple.tsx` (Para Escolta/Apoyos)
```typescript
interface PuntoGPS {
  nombre: string; // "Inicio", "Fin", "Regulación 1"
  latitud: number;
  longitud: number;
  timestamp: Date;
}

interface Props {
  value: PuntoGPS[];
  onChange: (value: PuntoGPS[]) => void;
  labels?: string[]; // ["Inicio", "Fin"]
}
```

---

## 📚 RECURSOS DISPONIBLES

### Documentación
- ✅ `FASE1_IMPLEMENTACION_COMPLETA.md` - Resumen de lo implementado
- ✅ `GUIA_MIGRACION_PANTALLAS.md` - Cómo migrar pantallas antiguas
- ✅ `PREGUNTAS_CLARIFICACION_SITUACIONES.md` - 25 preguntas pendientes
- ✅ `CHANGELOG_FASE1_CONFIGS.md` - Detalles de configuraciones

### Código de Referencia
- ✅ `asistenciaForm.ts` - Ejemplo completo con tabs
- ✅ `hechoTransitoForm.ts` - Ejemplo con conversión
- ✅ `emergenciaForm.ts` - Ejemplo con rango de KM
- ✅ `SituacionDinamicaScreen.tsx` - Pantalla genérica

### Componentes Disponibles
- ✅ TextField, SelectField, NumberField
- ✅ DateField, GPSField, CheckboxField
- ✅ SwitchField, RadioField, MultiSelectField
- ❌ ContadorVehicular (falta)
- ❌ TomadorVelocidad (falta)
- ❌ DatosInstitucion (falta)
- ❌ LlamadaAtencion (falta)
- ❌ PuntosGPSMultiple (falta)

---

## ✅ CONCLUSIÓN

**Lo que YO hice:**
- ✅ Arquitectura completa (FormBuilder, OfflineStorage, SyncService)
- ✅ 11 tipos de campos (100% cobertura)
- ✅ 3 configuraciones de ejemplo (Asistencia, Hecho, Emergencia)
- ✅ Pantalla genérica (`SituacionDinamicaScreen`)
- ✅ Documentación completa

**Lo que TÚ debes hacer:**
1. 🔴 Responder las 25 preguntas de clarificación
2. 🟡 Crear ~5 componentes reutilizables faltantes
3. 🟢 Crear ~47 archivos de configuración (siguiendo la plantilla)
4. 🟢 Registrar las configs en `index.ts`
5. 🟢 Agregar rutas en el navegador

**Tiempo estimado total:** 14-20 días de trabajo

**La buena noticia:** El trabajo pesado (FormBuilder, validaciones, offline, sync) ya está hecho. Solo necesitas crear archivos de configuración JSON siguiendo el patrón que ya existe. 🎯
