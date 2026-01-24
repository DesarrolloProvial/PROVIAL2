# 🚀 FASE 1: Fundamentos del Sistema de Situaciones

## 📅 Inicio: 2026-01-22
## ⏱️ Duración Estimada: 1 semana
## 👥 Equipo: Desarrollador + AI Assistant

---

## 🎯 Objetivos de FASE 1

Construir la infraestructura base para el sistema Schema-Driven:

1. ✅ Sistema de catálogos SQLite sincronizados
2. ✅ Sistema de theming centralizado
3. ✅ FormBuilder genérico core
4. ✅ Componentes de campos básicos reutilizables

---

## 📋 Tareas Detalladas

### **DÍA 1: Setup Base (4-6 horas)**

#### **1.1 Estructura de Carpetas** ⏱️ 30 min
```
mobile/src/
├── config/
│   ├── theme.ts                    # ✅ Crear
│   ├── catalogos/
│   │   ├── index.ts
│   │   ├── tiposSituacion.ts
│   │   ├── geograficos.ts
│   │   └── vehiculos.ts
│   └── formularios/
│       ├── index.ts
│       ├── asistenciaForm.config.ts
│       └── hechoForm.config.ts
│
├── core/
│   ├── FormBuilder/
│   │   ├── FormBuilder.tsx         # ✅ Crear
│   │   ├── FieldRenderer.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── storage/
│   │   ├── catalogoStorage.ts      # ✅ Crear (SQLite)
│   │   ├── catalogoSync.ts         # Sincronización
│   │   └── index.ts
│   │
│   └── theme/
│       ├── ThemeProvider.tsx       # ✅ Crear
│       ├── useTheme.ts
│       └── index.ts
│
└── components/
    └── fields/                     # ✅ Crear
        ├── TextField.tsx
        ├── SelectField.tsx
        ├── NumberField.tsx
        ├── DateField.tsx
        ├── GPSField.tsx
        └── index.ts
```

**Acción:** Crear toda la estructura de carpetas vacía

---

#### **1.2 Sistema de Theming** ⏱️ 2 horas

**Archivo:** `config/theme.ts`
```typescript
export const APP_THEME = {
    colors: {
        primary: '#2563eb',
        secondary: '#10b981',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        background: '#f9fafb',
        surface: '#ffffff',
        text: {
            primary: '#111827',
            secondary: '#6b7280',
            disabled: '#9ca3af',
        },
        border: '#e5e7eb',
    },
    
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 40,
    },
    
    typography: {
        h1: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
        h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
        h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
        body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
        bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
        caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
    },
    
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        full: 9999,
    },
    
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 6,
        },
    },
    
    components: {
        header: {
            backgroundColor: '#1e40af',
            textColor: '#ffffff',
            height: 60,
            fontSize: 18,
            fontWeight: '600',
        },
        button: {
            primary: {
                backgroundColor: '#2563eb',
                textColor: '#ffffff',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                fontSize: 16,
            },
            secondary: {
                backgroundColor: '#10b981',
                textColor: '#ffffff',
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                fontSize: 16,
            },
            outlined: {
                backgroundColor: 'transparent',
                textColor: '#2563eb',
                borderColor: '#2563eb',
                borderWidth: 1,
                borderRadius: 8,
                paddingVertical: 11,
                paddingHorizontal: 23,
                fontSize: 16,
            },
        },
        input: {
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            focusBorderColor: '#2563eb',
        },
        card: {
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        },
    },
};

export type AppTheme = typeof APP_THEME;
```

**Archivo:** `core/theme/ThemeProvider.tsx`
```typescript
import React, { createContext, useContext } from 'react';
import { APP_THEME, AppTheme } from '../../config/theme';

const ThemeContext = createContext<AppTheme>(APP_THEME);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <ThemeContext.Provider value={APP_THEME}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const theme = useContext(ThemeContext);
    if (!theme) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return theme;
}
```

**Acción:** Crear archivos y probar que `useTheme()` funciona

---

#### **1.3 SQLite para Catálogos** ⏱️ 2 horas

**Instalar dependencia:**
```bash
npm install expo-sqlite
```

**Archivo:** `core/storage/catalogoStorage.ts`
```typescript
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('catalogos.db');

export interface CatalogoDepartamento {
    id: number;
    nombre: string;
    codigo: string;
}

export interface CatalogoMunicipio {
    id: number;
    nombre: string;
    departamento_id: number;
}

export interface CatalogoTipoVehiculo {
    id: number;
    nombre: string;
}

export interface CatalogoMarcaVehiculo {
    id: number;
    nombre: string;
}

class CatalogoStorage {
    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                // Departamentos
                tx.executeSql(`
                    CREATE TABLE IF NOT EXISTS departamento (
                        id INTEGER PRIMARY KEY,
                        nombre TEXT NOT NULL,
                        codigo TEXT NOT NULL UNIQUE
                    )
                `);
                
                // Municipios
                tx.executeSql(`
                    CREATE TABLE IF NOT EXISTS municipio (
                        id INTEGER PRIMARY KEY,
                        nombre TEXT NOT NULL,
                        departamento_id INTEGER NOT NULL,
                        FOREIGN KEY (departamento_id) REFERENCES departamento(id)
                    )
                `);
                
                // Tipos de vehículo
                tx.executeSql(`
                    CREATE TABLE IF NOT EXISTS tipo_vehiculo (
                        id INTEGER PRIMARY KEY,
                        nombre TEXT NOT NULL UNIQUE
                    )
                `);
                
                // Marcas de vehículo
                tx.executeSql(`
                    CREATE TABLE IF NOT EXISTS marca_vehiculo (
                        id INTEGER PRIMARY KEY,
                        nombre TEXT NOT NULL UNIQUE
                    )
                `);
                
                // Metadata de sincronización
                tx.executeSql(`
                    CREATE TABLE IF NOT EXISTS sync_metadata (
                        catalogo TEXT PRIMARY KEY,
                        ultima_sincronizacion TEXT NOT NULL,
                        version INTEGER NOT NULL
                    )
                `);
            }, reject, resolve);
        });
    }
    
    async getDepartamentos(): Promise<CatalogoDepartamento[]> {
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'SELECT * FROM departamento ORDER BY nombre',
                    [],
                    (_, { rows }) => resolve(rows._array),
                    (_, error) => { reject(error); return false; }
                );
            });
        });
    }
    
    async getMunicipiosByDepartamento(departamentoId: number): Promise<CatalogoMunicipio[]> {
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'SELECT * FROM municipio WHERE departamento_id = ? ORDER BY nombre',
                    [departamentoId],
                    (_, { rows }) => resolve(rows._array),
                    (_, error) => { reject(error); return false; }
                );
            });
        });
    }
    
    async getTiposVehiculo(): Promise<CatalogoTipoVehiculo[]> {
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'SELECT * FROM tipo_vehiculo ORDER BY nombre',
                    [],
                    (_, { rows }) => resolve(rows._array),
                    (_, error) => { reject(error); return false; }
                );
            });
        });
    }
    
    async getMarcasVehiculo(): Promise<CatalogoMarcaVehiculo[]> {
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'SELECT * FROM marca_vehiculo ORDER BY nombre',
                    [],
                    (_, { rows }) => resolve(rows._array),
                    (_, error) => { reject(error); return false; }
                );
            });
        });
    }
    
    async sincronizarDesdeBackend(): Promise<void> {
        // TODO: Implementar en DÍA 2
        console.log('[CATALOGOS] Sincronización pendiente de implementar');
    }
}

export const catalogoStorage = new CatalogoStorage();
```

**Acción:** Crear archivo y probar inicialización

---

### **DÍA 2: FormBuilder Core (6-8 horas)**

#### **2.1 Tipos y Configuración** ⏱️ 1 hora

**Archivo:** `core/FormBuilder/types.ts`
```typescript
export type FieldType = 
    | 'text'
    | 'number'
    | 'select'
    | 'multi-select'
    | 'date'
    | 'datetime'
    | 'gps'
    | 'textarea'
    | 'checkbox'
    | 'switch'
    | 'custom';

export interface FieldConfig {
    name: string;
    type: FieldType;
    label: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    
    // Validaciones
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    
    // Para selects
    options?: Array<{ value: any; label: string }> | string; // String = ref a catálogo
    multiple?: boolean;
    
    // Para custom
    component?: React.ComponentType<any>;
    
    // Condicionales
    visibleIf?: (formData: any) => boolean;
    requiredIf?: (formData: any) => boolean;
    
    // Ayuda
    helperText?: string;
    errorMessage?: string;
}

export interface SectionConfig {
    id: string;
    title: string;
    description?: string;
    fields?: FieldConfig[];
    component?: React.ComponentType<any>; // Para secciones custom
}

export interface TabConfig {
    id: string;
    label: string;
    icon?: string;
}

export interface FormConfig {
    id: string;
    title: string;
    description?: string;
    tabs?: TabConfig[];
    sections: Record<string, SectionConfig[]>; // { tabId: [sections] }
    defaultValues?: Record<string, any>;
}
```

---

#### **2.2 FieldRenderer** ⏱️ 3 horas

**Archivo:** `core/FormBuilder/FieldRenderer.tsx`
```typescript
import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { FieldConfig } from './types';

// Importar todos los field components
import TextField from '../../components/fields/TextField';
import NumberField from '../../components/fields/NumberField';
import SelectField from '../../components/fields/SelectField';
import DateField from '../../components/fields/DateField';
import GPSField from '../../components/fields/GPSField';

interface FieldRendererProps {
    field: FieldConfig;
    control: Control<any>;
    formData?: any;
}

export function FieldRenderer({ field, control, formData }: FieldRendererProps) {
    // Evaluar condicionales
    if (field.visibleIf && !field.visibleIf(formData)) {
        return null;
    }
    
    const isRequired = field.required || (field.requiredIf && field.requiredIf(formData));
    
    return (
        <Controller
            control={control}
            name={field.name}
            rules={{
                required: isRequired ? (field.errorMessage || `${field.label} es requerido`) : false,
                min: field.min,
                max: field.max,
                minLength: field.minLength,
                maxLength: field.maxLength,
                pattern: field.pattern,
            }}
            render={({ field: { onChange, value }, fieldState: { error } }) => {
                const commonProps = {
                    label: field.label,
                    placeholder: field.placeholder,
                    value,
                    onChange,
                    error: error?.message,
                    disabled: field.disabled,
                    helperText: field.helperText,
                    required: isRequired,
                };
                
                switch (field.type) {
                    case 'text':
                    case 'textarea':
                        return <TextField {...commonProps} multiline={field.type === 'textarea'} />;
                    
                    case 'number':
                        return <NumberField {...commonProps} min={field.min} max={field.max} />;
                    
                    case 'select':
                    case 'multi-select':
                        return (
                            <SelectField
                                {...commonProps}
                                options={field.options}
                                multiple={field.type === 'multi-select'}
                            />
                        );
                    
                    case 'date':
                    case 'datetime':
                        return <DateField {...commonProps} mode={field.type === 'datetime' ? 'datetime' : 'date'} />;
                    
                    case 'gps':
                        return <GPSField {...commonProps} />;
                    
                    case 'custom':
                        const CustomComponent = field.component;
                        return CustomComponent ? <CustomComponent {...commonProps} /> : null;
                    
                    default:
                        return <TextField {...commonProps} />;
                }
            }}
        />
    );
}
```

---

#### **2.3 FormBuilder Principal** ⏱️ 2 horas

**Archivo:** `core/FormBuilder/FormBuilder.tsx`
```typescript
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import { SegmentedButtons, Button } from 'react-native-paper';
import { FormConfig } from './types';
import { FieldRenderer } from './FieldRenderer';
import { useTheme } from '../theme';

interface FormBuilderProps {
    config: FormConfig;
    onSubmit: (data: any) => void | Promise<void>;
    initialValues?: Record<string, any>;
}

export function FormBuilder({ config, onSubmit, initialValues }: FormBuilderProps) {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState(config.tabs?.[0]?.id || 'default');
    const [submitting, setSubmitting] = useState(false);
    
    const { control, handleSubmit, watch } = useForm({
        defaultValues: initialValues || config.defaultValues || {},
    });
    
    const formData = watch();
    
    const handleFormSubmit = async (data: any) => {
        try {
            setSubmitting(true);
            await onSubmit(data);
        } finally {
            setSubmitting(false);
        }
    };
    
    const sectionsForTab = config.sections[activeTab] || [];
    
    return (
        <View style={styles.container}>
            {/* Tabs */}
            {config.tabs && config.tabs.length > 1 && (
                <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
                    <SegmentedButtons
                        value={activeTab}
                        onValueChange={setActiveTab}
                        buttons={config.tabs.map(tab => ({
                            value: tab.id,
                            label: tab.label,
                            icon: tab.icon,
                        }))}
                    />
                </View>
            )}
            
            {/* Content */}
            <ScrollView style={styles.content}>
                {sectionsForTab.map((section, idx) => (
                    <View key={section.id} style={[styles.section, { marginTop: idx === 0 ? 0 : theme.spacing.lg }]}>
                        {section.title && (
                            <Text style={[styles.sectionTitle, theme.typography.h3]}>
                                {section.title}
                            </Text>
                        )}
                        
                        {section.description && (
                            <Text style={[styles.sectionDescription, theme.typography.bodySmall]}>
                                {section.description}
                            </Text>
                        )}
                        
                        {section.component ? (
                            <section.component />
                        ) : (
                            section.fields?.map(field => (
                                <FieldRenderer
                                    key={field.name}
                                    field={field}
                                    control={control}
                                    formData={formData}
                                />
                            ))
                        )}
                    </View>
                ))}
                
                {/* Submit Button */}
                <View style={styles.submitContainer}>
                    <Button
                        mode="contained"
                        onPress={handleSubmit(handleFormSubmit)}
                        loading={submitting}
                        disabled={submitting}
                        style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                    >
                        Guardar
                    </Button>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabContainer: {
        padding: 16,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        marginBottom: 8,
    },
    sectionDescription: {
        marginBottom: 16,
        opacity: 0.7,
    },
    submitContainer: {
        marginTop: 32,
        marginBottom: 40,
    },
    submitButton: {
        paddingVertical: 8,
    },
});
```

---

### **DÍA 3-4: Componentes de Campos (8-10 horas)**

Crear todos los field components básicos:
- TextField
- NumberField
- SelectField
- DateField
- GPSField

(Código detallado en siguiente documento)

---

### **DÍA 5: Configuración de Formularios (6-8 horas)**

Crear configs para:
- Asistencia Vehicular
- Hecho de Tránsito
- Formulario simple de prueba

---

### **DÍA 6-7: Testing e Integración (8-10 horas)**

- Testing de FormBuilder
- Testing de fields
- Integración con sistema actual
- Documentación

---

## ✅ Entregables de FASE 1

- [ ] Sistema de theming funcionando
- [ ] SQLite con catálogos básicos
- [ ] FormBuilder genérico operativo
- [ ] 5 field components básicos
- [ ] 1 formulario de prueba funcionando
- [ ] Documentación técnica

---

## 🚀 Siguiente Paso Inmediato

**¿Empezamos con DÍA 1: Setup Base?**

Puedo empezar creando:
1. La estructura de carpetas
2. El sistema de theming
3. El SQLite para catálogos

**¿Procedo?** 🎯
