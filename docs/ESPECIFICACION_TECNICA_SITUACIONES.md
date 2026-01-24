# 📐 ESPECIFICACIÓN TÉCNICA COMPLETA - Sistema de Situaciones

## 🎯 Objetivo
Construir un sistema **Schema-Driven** con FormBuilder genérico para gestionar 54 tipos de situaciones operativas.

---

## 📋 PARTE 1: CAMPOS BASE (Todas las Situaciones)

```typescript
interface CamposBaseSituacion {
    // Identificación
    tipo_situacion: TipoSituacion;           // Select del catálogo
    
    // Ubicación
    coordenadas: {
        latitud: number;
        longitud: number;
    };
    ruta_id: number;                         // Auto-asignado de salida activa
    km: number;
    sentido: 'NORTE' | 'SUR' | 'ORIENTE' | 'OCCIDENTE' | 'AMBOS';
    
    // Geografía (OPCIONALES si offline)
    departamento_id?: number | null;         // Select del catálogo local
    municipio_id?: number | null;            // Select según departamento
    
    // Condiciones
    clima: 'DESPEJADO' | 'NUBLADO' | 'LLUVIA' | 'NEBLINA';
    carga_vehicular: 'FLUIDO' | 'MODERADO' | 'DENSO' | 'CONGESTIONADO';
    
    // Notas
    observaciones: string;                   // Text area libre
}
```

---

## 📊 PARTE 2: CATÁLOGOS LOCALES (SQLite)

### **Catálogos Sincronizados del Backend:**

```typescript
// 1. Geografía
interface CatalogoDepartamento {
    id: number;
    nombre: string;
    codigo: string;
}

interface CatalogoMunicipio {
    id: number;
    nombre: string;
    departamento_id: number;
}

// 2. Tipos de Situación
interface CatalogoTipoSituacion {
    id: number;
    codigo: string;                          // 'HECHO_TRANSITO', 'ASISTENCIA_VEHICULAR', etc.
    nombre: string;
    grupo: string;                           // 'COMPLEJA', 'SIMPLE', 'OPERATIVO', etc.
    requiere_evidencia: boolean;
    config_formulario: string;               // JSON con el FormConfig
}

// 3. Subtipos
interface CatalogoSubtipoHecho {
    id: number;
    nombre: string;
    // 17 opciones: Caída de carga, Choque, etc.
}

interface CatalogoSubtipoAsistencia {
    id: number;
    nombre: string;
    // 26 opciones: Pinchazo, Calentamiento, etc.
}

interface CatalogoSubtipoEmergencia {
    id: number;
    nombre: string;
    // 11 opciones: Derrumbe, Inundación, etc.
}

// 4. Vehículos
interface CatalogoTipoVehiculo {
    id: number;
    nombre: string;
    // ~40 opciones: Sedan, Pick-up, Camión, etc.
}

interface CatalogoMarcaVehiculo {
    id: number;
    nombre: string;
    // ~20 opciones: Toyota, Honda, etc.
}

// 5. Autoridades y Socorro
interface CatalogoAutoridad {
    id: number;
    nombre: string;
    // PMT, PNC, PROVIAL, DGT, etc.
}

interface CatalogoSocorro {
    id: number;
    nombre: string;
    // Bomberos, Cruz Roja, etc.
}

// 6. Otros
interface CatalogoMotivoConsignacion {
    id: number;
    nombre: string;
    permite_otro: boolean;
}

interface CatalogoTipoFalla {
    id: number;
    nombre: string;
    permite_otro: boolean;
}

interface CatalogoCombustible {
    id: number;
    tipo: string;                            // 'DIESEL', 'GASOLINA'
    nivel: number;                           // 0-100 (porcentaje)
    litros?: number;
}
```

---

## 🏗️ PARTE 3: COMPONENTES REUTILIZABLES

### **A) Componentes Existentes (Mantener):**

```typescript
// 1. ObstruccionManager
interface ObstruccionData {
    hay_vehiculo_fuera_via: boolean;
    tipo_obstruccion: 'ninguna' | 'total_sentido' | 'total_ambos' | 'parcial';
    sentido_principal: SentidoObstruccion | null;
    sentido_contrario: SentidoObstruccion | null;
    descripcion_manual: string;
}

// 2. VehiculoForm (MODIFICAR: tipo y marca a SELECT)
interface VehiculoData {
    // Preliminares
    tipo_vehiculo_id: number;                // ✅ Cambiar de text a select
    marca_id: number;                        // ✅ Cambiar de text a select
    placa: string;
    color: string;
    estado_piloto: string;
    nivel_dano: string;
    
    // Tarjeta Circulación
    tc_numero?: string;
    tc_vencimiento?: Date;
    tc_titular?: string;
    
    // Licencia
    licencia_numero?: string;
    licencia_tipo?: string;
    licencia_vencimiento?: Date;
    
    // Carga (condicional)
    cargado?: boolean;
    tipo_carga?: string;
    descripcion_carga?: string;
    
    // Contenedor (condicional)
    tiene_contenedor?: boolean;
    contenedor_numero?: string;
    contenedor_empresa?: string;
    
    // Bus (condicional)
    es_bus?: boolean;
    numero_pasajeros?: number;
    empresa_bus?: string;
    
    // Piloto
    piloto_nombre: string;
    piloto_dpi: string;
    piloto_licencia: string;
    piloto_telefono?: string;
    piloto_direccion?: string;
    
    // Sanción (condicional)
    tiene_sancion?: boolean;
    tipo_sancion?: string;
    monto_sancion?: number;
    
    // Documentos consignados
    documentos_consignados?: string[];
}

// 3. GruaForm, AjustadorForm
// (Mantener como están)

// 4. AutoridadSocorroManager
// (Mantener como está)

// 5. MultimediaCapture
interface MultimediaData {
    fotos: string[];                         // URIs, máximo 3
    video?: string;                          // URI, máximo 1
}
```

---

### **B) Nuevos Componentes Necesarios:**

```typescript
// 1. ContadorVehicular.tsx
interface ContadorVehicularProps {
    value: Record<number, number>;          // { tipo_vehiculo_id: cantidad }
    onChange: (value: Record<number, number>) => void;
    readonly?: boolean;
}

// Renderiza:
// [ Sedan          ]  [  - ] 25 [ +  ]
// [ Pick-up        ]  [  - ] 12 [ +  ]
// ...
// Total: 37 vehículos

// 2. TomadorVelocidad.tsx
interface MedicionVelocidad {
    tipo_vehiculo_id: number;
    velocidades: number[];                   // [55, 80, 100, 69]
}

interface TomadorVelocidadProps {
    value: MedicionVelocidad[];
    onChange: (value: MedicionVelocidad[]) => void;
}

// Renderiza:
// Tipo: [Sedan ▼]
// Velocidades: [55, 80, 100, 69] (separadas por coma)
// [Agregar]
//
// Sedan: 4 mediciones → Prom: 76 km/h, Min: 55, Max: 100

// 3. VehiculosRegistrados.tsx
interface VehiculosRegistradosData {
    total: number;
    desglose: Record<number, number>;        // { tipo_vehiculo_id: cantidad }
    vehiculos_con_infraccion: VehiculoData[]; // Formulario completo
}

// Renderiza:
// Total registrados: [30]
// Desglose:
//   Pick-up: [10]
//   Sedan: [5]
//   Bus: [15]
//
// ¿Alguno con infracción/sospecha?
// [+ Agregar vehículo con detalle]

// 4. ListaLlamadasAtencion.tsx
interface LlamadaAtencion {
    motivo: string;
    piloto: DatosPiloto;
    vehiculo: DatosVehiculoSimple;
}

// 5. PuntosGPS.tsx
interface PuntosGPSData {
    punto_inicio: Coordenadas;
    punto_fin?: Coordenadas;                 // COP agrega
    puntos_regulacion?: Coordenadas[];       // COP agrega
}

// 6. DatosInstitucion.tsx
interface DatosInstitucion {
    nombre_institucion: string;
    nombre_encargado: string;
    telefono: string;
    cargo: string;
}

// 7. AreaAfectadaKM.tsx
interface AreaAfectadaData {
    km_unico?: number;
    es_rango: boolean;
    km_desde?: number;
    km_hasta?: number;
}

// 8. ConversionTipo.tsx
interface ConversionTipoProps {
    tipo_actual: 'HECHO_TRANSITO' | 'ASISTENCIA_VEHICULAR';
    datos_actuales: any;
    onConvertir: (nuevo_tipo: string) => void;
}

// Renderiza:
// ⚠️ ¿Este es realmente un Hecho de Tránsito?
// ☐ Es Asistencia Vehicular
// Si se marca, habilita select de subtipo de asistencia
```

---

## 🔢 PARTE 4: AGRUPACIÓN DE SITUACIONES

### **Grupo 1: COMPLEJAS (3 tipos)**

```typescript
// A) HECHO DE TRÁNSITO
interface FormConfigHechoTransito extends CamposBaseSituacion {
    // Específicos
    subtipo_hecho: number;                   // Select de 17 opciones
    area: 'URBANA' | 'RURAL';
    material_via: 'ASFALTO' | 'PAVIMENTO' | 'ADOQUIN' | 'TERRACERIA' | 'EMPEDRADO' | 'BALASTRO';
    grupo_brigada: 1 | 2 | 'ADMINISTRATIVO'; // De usuario.grupo
    
    // Complejos
    obstruccion: ObstruccionData;
    vehiculos: VehiculoData[];               // Hasta 100
    gruas: GruaData[];
    ajustadores: AjustadorData[];
    autoridades: AutoridadData[];
    socorro: SocorroData[];
    
    // Evidencia
    multimedia: MultimediaData;              // OBLIGATORIA
    
    // Conversión
    es_realmente_asistencia: boolean;        // Checkbox
    tipo_asistencia_real?: number;           // Si es true, select de asistencia
}

// B) ASISTENCIA VEHICULAR
interface FormConfigAsistencia extends CamposBaseSituacion {
    // Específicos
    subtipo_asistencia: number;              // Select de 26 opciones
    area: 'URBANA' | 'RURAL';
    material_via: string;
    grupo_brigada: number;
    apoyo_proporcionado: string;             // Text area en sección "otros"
    
    // Complejos
    obstruccion: ObstruccionData;
    vehiculos: VehiculoData[];               // MÁXIMO 1
    gruas: GruaData[];
    ajustadores: AjustadorData[];
    autoridades: AutoridadData[];
    socorro: SocorroData[];
    
    // Evidencia
    multimedia: MultimediaData;              // OBLIGATORIA
    
    // Conversión
    es_realmente_hecho: boolean;
    tipo_hecho_real?: number;
}

// C) EMERGENCIA VIAL
interface FormConfigEmergencia extends CamposBaseSituacion {
    // Específicos
    subtipo_emergencia: number;              // Select de 11 opciones
    area_afectada: AreaAfectadaData;         // Checkbox + rango
    
    // NO tiene vehículos
    // Complejos
    autoridades: AutoridadData[];
    socorro: SocorroData[];
    
    // Evidencia
    multimedia: MultimediaData;              // OBLIGATORIA
}
```

---

### **Grupo 2: SIMPLES (11 tipos)**

```typescript
interface FormConfigSimple extends CamposBaseSituacion {
    // No campos adicionales
    // Solo campos base
}

// Tipos:
// - Puesto fijo
// - Parada estratégica
// - Señalizando
// - Lavado de unidad
// - Regulación de tránsito
// - Patrullaje de Ruta
// - Parada Autorizada
// - Regulación colonia
// - Verificación de situación
// - Baño (SIN evidencia)
// - Cajero (SIN evidencia)
```

---

### **Grupo 3: COMIDA**

```typescript
interface FormConfigComida extends CamposBaseSituacion {
    tipo_comida: 'DESAYUNO' | 'ALMUERZO' | 'CENA';
    // Ya captura hora inicio/fin en bitácora automáticamente
}
// SIN evidencia
```

---

### **Grupo 4: CONTEO Y MEDICIONES (2 tipos)**

```typescript
// A) Conteo Vehicular
interface FormConfigConteo extends CamposBaseSituacion {
    conteo: Record<number, number>;          // { tipo_vehiculo_id: cantidad }
    total_vehiculos: number;                 // Auto-calculado
}

// B) Toma de Velocidad
interface FormConfigVelocidad extends CamposBaseSituacion {
    mediciones: MedicionVelocidad[];
}
```

---

### **Grupo 5: SUPERVISIÓN**

```typescript
interface FormConfigSupervision extends CamposBaseSituacion {
    unidad_supervisada_id: number;           // Select de unidades activas
}
// SIN evidencia
```

---

### **Grupo 6: ESCOLTA**

```typescript
interface FormConfigEscolta extends CamposBaseSituacion {
    punto_inicio: Coordenadas;
    punto_fin_carga?: Coordenadas;           // COP agrega
    punto_fin_apoyo?: Coordenadas;           // COP agrega
    motivo: string;                          // Select con "Otro"
    empresa: string;                         // Text libre
    datos_piloto: DatosPiloto;
    datos_vehiculo: DatosVehiculoSimple;
}
```

---

### **Grupo 7: OPERATIVOS (3 tipos)**

```typescript
// A) Operativo PNC-DT / Interinstitucional
interface FormConfigOperativoComplejo extends CamposBaseSituacion {
    vehiculos_registrados: VehiculosRegistradosData;
    llamadas_atencion: LlamadaAtencion[];
    tiene_sanciones: boolean;                // Checkbox
    sanciones?: SancionData[];               // Si tiene_sanciones = true
    autoridades: AutoridadData[];
}

// B) Operativo PROVIAL
interface FormConfigOperativoProvial extends CamposBaseSituacion {
    vehiculos_registrados: VehiculosRegistradosData;
    llamadas_atencion: LlamadaAtencion[];
}
```

---

### **Grupo 8: CONSIGNACIÓN**

```typescript
interface FormConfigConsignacion extends CamposBaseSituacion {
    motivo_consignacion: number;             // Select con "Otro"
    motivo_otro?: string;
    consignado: 'VEHICULO' | 'PILOTO' | 'AMBOS';
    datos_piloto: DatosPiloto;
    datos_vehiculo: DatosVehiculoSimple;
    autoridad: AutoridadData;
    lugar_traslado: string;                  // Text libre
}
```

---

### **Grupo 9: MANTENIMIENTO**

```typescript
interface FormConfigFallaMecanica extends CamposBaseSituacion {
    tipo_falla: number;                      // Select con "Otro"
    tipo_falla_otro?: string;
    requiere_grua: boolean;
    multimedia: MultimediaData;              // OBLIGATORIA (foto de falla)
}
```

---

### **Grupo 10: SALUD (2 tipos)**

```typescript
// A) Hospital
interface FormConfigHospital extends CamposBaseSituacion {
    motivo: number;                          // Select con "Otro"
    motivo_otro?: string;
    nombre_hospital: string;
}

// B) Compañero Enfermo
interface FormConfigEnfermo extends CamposBaseSituacion {
    tipo_malestar: string;
    acciones: string;                        // Text area
}
```

---

### **Grupo 11: ADMINISTRATIVAS**

```typescript
interface FormConfigAdministrativa extends CamposBaseSituacion {
    // Solo campos base
}
// SIN evidencia
// Tipos:
// - Dejando personal administrativo
// - Comisión
```

---

### **Grupo 12: COMBUSTIBLE**

```typescript
interface FormConfigAbastecimiento extends CamposBaseSituacion {
    combustible_inicial: number;             // Del catálogo existente
    combustible_final: number;               // Del catálogo existente
    diferencia: number;                      // Auto-calculado
    kilometraje_odometro: number;
}
// SIN evidencia
```

---

### **Grupo 13: APOYOS (9 tipos)**

```typescript
interface FormConfigApoyo extends CamposBaseSituacion {
    institucion: DatosInstitucion;
    punto_inicio: Coordenadas;
    punto_fin?: Coordenadas;                 // COP agrega
    puntos_regulacion?: Coordenadas[];       // COP agrega
}

// Tipos:
// - Apoyo a Ministerio Público
// - Apoyo a otra unidad
// - Apoyo a trabajos en carretera
// - Apoyo a ciclismo
// - Apoyo a DIGEF
// - Apoyo a triatlón
// - Apoyo atletismo
// - Apoyo a antorcha
// - Apoyo a institución
```

---

## 🎨 PARTE 5: SISTEMA DE THEMING

```typescript
// config/theme.ts
export const APP_THEME = {
    colors: {
        primary: '#2563eb',
        secondary: '#10b981',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        gray: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            // ...
        },
    },
    
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    
    typography: {
        h1: { fontSize: 24, fontWeight: '700' },
        h2: { fontSize: 20, fontWeight: '600' },
        body: { fontSize: 14, fontWeight: '400' },
        small: { fontSize: 12, fontWeight: '400' },
    },
    
    components: {
        header: {
            backgroundColor: '#1e40af',        // ✅ Modificar aquí afecta TODAS
            textColor: '#ffffff',
            height: 60,
        },
        button: {
            primary: {
                backgroundColor: '#2563eb',
                textColor: '#ffffff',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
            },
            // ...
        },
        input: {
            borderColor: '#d1d5db',
            borderRadius: 6,
            backgroundColor: '#ffffff',
            padding: 12,
        },
    },
};
```

---

## ⚙️ PARTE 6: PRIORIDADES DE IMPLEMENTACIÓN

### **FASE 0: Prerequisitos (ANTES de empezar)**
1. ✅ **Unificar tabla brigada y usuario**
2. ✅ **Corregir VehiculoForm: tipo y marca a SELECT**
3. ✅ **Fix del sistema offline-first** (eliminar tipo_situacion_id hardcodeado)

### **FASE 1: Fundamentos (1 semana)**
1. Sistema de catálogos SQLite
2. Sistema de theming
3. FormBuilder genérico core
4. Componentes de campos básicos

### **FASE 2: Componentes Nuevos (1 semana)**
1. ContadorVehicular
2. TomadorVelocidad
3. VehiculosRegistrados
4. PuntosGPS
5. ÁreaAfectadaKM
6. ConversionTipo

### **FASE 3: Prueba de Concepto (3 días)**
1. Implementar **Asistencia Vehicular** con nuevo sistema
2. Testing completo

### **FASE 4: Grupo Complejo (1 semana)**
1. Hecho de Tránsito
2. Emergencia
3. Testing conversión Asistencia ↔ Hecho

### **FASE 5: Resto de Situaciones (2 semanas)**
1. Implementar los 12 grupos restantes
2. Testing de cada grupo

### **FASE 6: Integración Final (3 días)**
1. Testing end-to-end
2. Documentación
3. Migración de pantallas legacy

---

## 📝 PARTE 7: PRÓXIMOS PASOS INMEDIATOS

1. ¿Confirmamos esta especificación?
2. ¿Empezamos con FASE 0 (prerequisitos)?
3. ¿O prefieres empezar directamente con FASE 1 (fundamentos)?

---

**¿Todo claro? ¿Algo que modificar antes de empezar?** 🚀
