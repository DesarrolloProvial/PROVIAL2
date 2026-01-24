/**
 * FormBuilder - Type Definitions
 * 
 * Definiciones de tipos para el sistema de construcción de formularios
 * schema-driven. Permite crear formularios complejos mediante configuración.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - DÍA 2
 */

import { ComponentType } from 'react';

// ============================================
// FIELD TYPES
// ============================================

/**
 * Tipos de campos soportados por el FormBuilder
 */
export type FieldType =
    | 'text'           // Input de texto simple
    | 'textarea'       // Text area multiline
    | 'number'         // Input numérico
    | 'select'         // Dropdown de selección única
    | 'multi-select'   // Dropdown de selección múltiple
    | 'date'           // Selector de fecha
    | 'datetime'       // Selector de fecha y hora
    | 'time'           // Selector de hora
    | 'gps'            // Captura de coordenadas GPS
    | 'checkbox'       // Checkbox booleano
    | 'switch'         // Switch booleano
    | 'radio'          // Radio buttons
    | 'custom';        // Componente personalizado

// ============================================
// VALIDATION RULES
// ============================================

/**
 * Reglas de validación para campos
 */
export interface ValidationRules {
    required?: boolean | string;  // true o mensaje custom
    min?: number;                 // Valor/longitud mínima
    max?: number;                 // Valor/longitud máxima
    minLength?: number;           // Longitud mínima (strings)
    maxLength?: number;           // Longitud máxima (strings)
    pattern?: RegExp | string;    // Patrón regex
    validate?: (value: any, formData: any) => boolean | string; // Validación custom
}

// ============================================
// FIELD CONFIGURATION
// ============================================

/**
 * Opciones para campos select/radio
 */
export interface FieldOption {
    value: any;
    label: string;
    disabled?: boolean;
}

/**
 * Configuración completa de un campo de formulario
 */
export interface FieldConfig {
    // Identificación
    name: string;                 // Nombre único del campo (para form data)
    type: FieldType;              // Tipo de campo

    // UI Básica
    label: string;                // Etiqueta visible
    placeholder?: string;         // Placeholder del input
    helperText?: string;          // Texto de ayuda debajo del campo

    // Validación
    required?: boolean;           // Si es obligatorio
    validation?: ValidationRules; // Reglas de validación adicionales
    errorMessage?: string;        // Mensaje de error custom

    // Estado
    disabled?: boolean;           // Si está deshabilitado
    readonly?: boolean;           // Si es solo lectura

    // Opciones (para select, radio, etc)
    options?: FieldOption[] | string; // Array de opciones o ref a catálogo
    multiple?: boolean;           // Para multi-select

    // Componente Custom
    component?: ComponentType<any> | string; // Componente React custom o nombre de componente registrado
    componentProps?: Record<string, any>; // Props para el componente custom

    // Condicionales (visibilidad/requerido dinámico)
    visibleIf?: (formData: any) => boolean;
    requiredIf?: (formData: any) => boolean;
    disabledIf?: (formData: any) => boolean;

    // Configuración específica por tipo
    min?: number;                 // Para number/date
    max?: number;                 // Para number/date
    step?: number;                // Para number (incremento)
    rows?: number;                // Para textarea (altura en líneas)
    autoCapture?: boolean;        // Para GPS (captura automática)

    // Grid/Layout
    gridColumn?: string;          // Ej: '1 / 3' para ocupar 2 columnas
    width?: 'full' | 'half' | 'third' | 'quarter'; // Width predefinido
}

// ============================================
// SECTION CONFIGURATION
// ============================================

/**
 * Configuración de una sección dentro de un tab
 */
export interface SectionConfig {
    id: string;                   // ID único de la sección
    title?: string;               // Título de la sección
    description?: string;         // Descripción/ayuda

    // Contenido: campos O componente custom
    fields?: FieldConfig[];       // Lista de campos
    component?: ComponentType<any> | string; // O componente custom completo (o nombre registrado)
    componentProps?: Record<string, any>;

    // Visibilidad condicional
    visibleIf?: (formData: any) => boolean;

    // Estilo
    columns?: number;             // Número de columnas (grid layout)
    spacing?: 'sm' | 'md' | 'lg'; // Espaciado entre campos
}

// ============================================
// TAB CONFIGURATION
// ============================================

/**
 * Configuración de un tab del formulario
 */
export interface TabConfig {
    id: string;                   // ID único del tab
    label: string;                // Texto visible del tab
    icon?: string;                // Icono del tab (nombre de MaterialCommunityIcons)
    badge?: number | string;      // Badge/contador en el tab
    disabled?: boolean;           // Si el tab está deshabilitado
}

// ============================================
// FORM CONFIGURATION
// ============================================

/**
 * Configuración completa de un formulario
 * Esta es la estructura principal que define todo el formulario
 */
export interface FormConfig {
    // Identificación
    id: string;                   // ID único del formulario
    title: string;                // Título del formulario
    description?: string;         // Descripción general

    // Estructura
    tabs?: TabConfig[];           // Lista de tabs (opcional, si no hay tabs el formulario es simple)
    sections: Record<string, SectionConfig[]>; // Secciones por tab ID (o 'default' si no hay tabs)

    // Datos
    defaultValues?: Record<string, any>; // Valores iniciales del formulario

    // Comportamiento
    validateOnChange?: boolean;   // Validar mientras se escribe (default: false)
    validateOnBlur?: boolean;     // Validar al perder foco (default: true)

    // Persistencia
    persistence?: {
        enabled: boolean;         // Si auto-guarda
        key: string;              // Key para AsyncStorage
        debounceMs?: number;      // Delay para auto-save (default: 1000ms)
    };

    // Submit
    submitButton?: {
        label?: string;           // Texto del botón (default: 'Guardar')
        color?: string;           // Color del botón
        icon?: string;            // Icono del botón
        loadingText?: string;     // Texto mientras envía (default: 'Guardando...')
    };

    // Headers/Footers
    header?: ComponentType<any>;  // Componente custom para header
    footer?: ComponentType<any>;  // Componente custom para footer
}

// ============================================
// FORM CALLBACKS
// ============================================

/**
 * Callbacks del formulario
 */
export interface FormCallbacks {
    onSubmit: (data: any) => void | Promise<void>;
    onChange?: (data: any) => void;
    onError?: (errors: Record<string, string>) => void;
    onTabChange?: (tabId: string) => void;
}

// ============================================
// FORM STATE
// ============================================

/**
 * Estado interno del formulario
 */
export interface FormState {
    isSubmitting: boolean;
    isDirty: boolean;
    isValid: boolean;
    errors: Record<string, string>;
    touchedFields: Set<string>;
    currentTab: string;
}

// ============================================
// CATALOG REFERENCE
// ============================================

/**
 * Tipos de catálogos disponibles
 * Cuando un field.options es string, se refiere a un catálogo
 */
export type CatalogType =
    | '@catalogos.departamentos'
    | '@catalogos.municipios'
    | '@catalogos.tipos_vehiculo'
    | '@catalogos.marcas_vehiculo'
    | '@catalogos.autoridades'
    | '@catalogos.socorro'
    | '@catalogos.tipos_asistencia'
    | '@catalogos.tipos_hecho'
    | '@catalogos.tipos_emergencia'
    | '@catalogos.sentidos'
    | '@catalogos.climas'
    | '@catalogos.carga_vehicular';

// ============================================
// FORM BUILDER PROPS
// ============================================

/**
 * Props del componente FormBuilder principal
 */
export interface FormBuilderProps {
    config: FormConfig;
    onSubmit: (data: any) => void | Promise<void>;
    initialValues?: Record<string, any>;
    onChange?: (data: any) => void;
    onError?: (errors: Record<string, string>) => void;
    loading?: boolean;
    disabled?: boolean;
}

// ============================================
// FIELD RENDERER PROPS
// ============================================

/**
 * Props del FieldRenderer
 */
export interface FieldRendererProps {
    field: FieldConfig;
    control: any; // react-hook-form Control
    formData: any;
    disabled?: boolean;
}
