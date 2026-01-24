/**
 * Configuración Completa: Hecho de Tránsito
 * 
 * Formulario completo para registro de hechos de tránsito (accidentes).
 * Incluye todos los campos según especificación técnica.
 * 
 * IMPORTANTE: Puede convertirse a/desde Asistencia Vehicular
 * 
 * Fecha: 2026-01-22
 * FASE 1 - Configuraciones Reales
 */

import { FormConfig } from '../../core/FormBuilder/types';

export const hechoTransitoForm: FormConfig = {
    id: 'hecho_transito',
    title: 'Hecho de Tránsito',
    description: 'Registro de accidentes, colisiones y otros hechos viales',

    tabs: [
        { id: 'general', label: 'General', icon: 'information' },
        { id: 'vehiculos', label: 'Vehículos', icon: 'car-multiple' },
        { id: 'recursos', label: 'Recursos', icon: 'account-group' },
        { id: 'evidencia', label: 'Evidencia', icon: 'camera' },
    ],

    sections: {
        // ============================================
        // TAB: GENERAL
        // ============================================
        general: [
            {
                id: 'tipo_hecho',
                title: 'Tipo de Hecho',
                fields: [
                    {
                        name: 'tipo_hecho',
                        type: 'select',
                        label: 'Tipo de Hecho de Tránsito',
                        required: true,
                        options: '@catalogos.tipos_hecho',
                        placeholder: 'Seleccione tipo de hecho',
                        helperText: 'Tipo de incidente vial',
                    },
                ],
            },
            {
                id: 'conversion',
                title: 'Corrección de Tipo',
                description: '¿Este realmente es un Hecho de Tránsito?',
                fields: [
                    {
                        name: 'es_realmente_asistencia',
                        type: 'checkbox',
                        label: 'Convertir a Asistencia Vehicular',
                        helperText: 'Marcar si se confundió con asistencia vehicular',
                    },
                    {
                        name: 'tipo_asistencia_real',
                        type: 'select',
                        label: 'Tipo de Asistencia',
                        options: '@catalogos.tipos_asistencia',
                        visibleIf: (formData) => formData.es_realmente_asistencia === true,
                        requiredIf: (formData) => formData.es_realmente_asistencia === true,
                        helperText: 'Se guardará como asistencia pero se registrará la confusión',
                    },
                ],
            },
            {
                id: 'ubicacion',
                title: 'Ubicación del Hecho',
                fields: [
                    {
                        name: 'km',
                        type: 'number',
                        label: 'Kilómetro',
                        required: true,
                        min: 0,
                        max: 999,
                        placeholder: 'Ej: 50.5',
                    },
                    {
                        name: 'sentido',
                        type: 'select',
                        label: 'Sentido',
                        required: true,
                        options: '@catalogos.sentidos',
                    },
                    {
                        name: 'coordenadas',
                        type: 'gps',
                        label: 'Coordenadas GPS',
                        required: true,
                        autoCapture: false,
                        helperText: 'Capture la ubicación al llegar al punto',
                    },
                    {
                        name: 'departamento_id',
                        type: 'select',
                        label: 'Departamento',
                        options: '@catalogos.departamentos',
                    },
                    {
                        name: 'municipio_id',
                        type: 'select',
                        label: 'Municipio',
                        options: '@catalogos.municipios',
                        disabledIf: (formData) => !formData.departamento_id,
                    },
                ],
            },
            {
                id: 'condiciones_via',
                title: 'Condiciones de la Vía',
                fields: [
                    {
                        name: 'area',
                        type: 'select',
                        label: 'Área',
                        options: [
                            { value: 'URBANA', label: 'Urbana' },
                            { value: 'RURAL', label: 'Rural' },
                        ],
                    },
                    {
                        name: 'material_via',
                        type: 'select',
                        label: 'Material de la Vía',
                        options: [
                            { value: 'ASFALTO', label: 'Asfalto' },
                            { value: 'PAVIMENTO', label: 'Pavimento/Concreto' },
                            { value: 'ADOQUIN', label: 'Adoquín' },
                            { value: 'TERRACERIA', label: 'Terracería' },
                            { value: 'EMPEDRADO', label: 'Empedrado' },
                            { value: 'BALASTRO', label: 'Balastro' },
                        ],
                    },
                    {
                        name: 'clima',
                        type: 'select',
                        label: 'Clima',
                        options: '@catalogos.climas',
                    },
                    {
                        name: 'carga_vehicular',
                        type: 'select',
                        label: 'Carga Vehicular',
                        options: '@catalogos.carga_vehicular',
                    },
                ],
            },
            {
                id: 'brigada_info',
                title: 'Información de Brigada',
                fields: [
                    {
                        name: 'grupo_brigada',
                        type: 'number',
                        label: 'Número de Grupo',
                        disabled: true,
                        helperText: 'Se toma del usuario actual (grupo 1, 2 o administrativo)',
                    },
                ],
            },
            {
                id: 'obstruccion_section',
                title: 'Obstrucción de Vía',
                fields: [
                    {
                        name: 'obstruccion',
                        type: 'custom',
                        component: 'ObstruccionManager',
                        label: 'Datos de Obstrucción'
                    }
                ]
            },
            {
                id: 'observaciones',
                fields: [
                    {
                        name: 'observaciones',
                        type: 'textarea',
                        label: 'Observaciones Generales',
                        rows: 4,
                    },
                ],
            },
        ],

        // ============================================
        // TAB: VEHÍCULOS
        // ============================================
        vehiculos: [
            {
                id: 'vehiculos_section',
                title: 'Vehículos Involucrados',
                description: 'Hasta 100 vehículos pueden registrarse',
                fields: [
                    {
                        name: 'vehiculos',
                        type: 'custom',
                        label: 'Vehículos',
                        component: 'VehiculoManager',
                        componentProps: {
                            maxVehiculos: 100,
                            minVehiculos: 0,
                            required: false,
                            label: 'Vehículos Involucrados',
                        },
                    },
                ],
            },
        ],

        // ============================================
        // TAB: RECURSOS
        // ============================================
        recursos: [
            {
                id: 'gruas',
                title: 'Grúas',
                fields: [
                    {
                        name: 'gruas',
                        type: 'custom',
                        label: 'Grúas',
                        component: 'GruaManager',
                    },
                ],
            },
            {
                id: 'ajustadores',
                title: 'Ajustadores',
                fields: [
                    {
                        name: 'ajustadores',
                        type: 'custom',
                        label: 'Ajustadores',
                        component: 'AjustadorManager',
                    },
                ],
            },
            {
                id: 'autoridades',
                title: 'Autoridades',
                fields: [
                    {
                        name: 'autoridades',
                        type: 'custom',
                        label: 'Autoridades',
                        component: 'AutoridadSocorroWrapper',
                        componentProps: {
                            tipo: 'autoridad',
                        },
                    },
                ],
            },
            {
                id: 'socorro',
                title: 'Unidades de Socorro',
                fields: [
                    {
                        name: 'socorro',
                        type: 'custom',
                        label: 'Socorro',
                        component: 'AutoridadSocorroWrapper',
                        componentProps: {
                            tipo: 'socorro',
                        },
                    },
                ],
            },
        ],

        // ============================================
        // TAB: EVIDENCIA
        // ============================================
        evidencia: [
            {
                id: 'multimedia_section',
                title: 'Evidencia Fotográfica y Video',
                description: 'Capture fotos y videos del incidente',
                fields: [
                    {
                        name: 'multimedia',
                        type: 'custom',
                        label: 'Evidencia',
                        component: 'MultimediaWrapper',
                    },
                ],
            },
        ],
    },

    defaultValues: {
        clima: 'DESPEJADO',
        carga_vehicular: 'FLUIDO',
        area: 'RURAL',
        material_via: 'ASFALTO',
        es_realmente_asistencia: false,
    },

    validateOnBlur: true,
    validateOnChange: false,

    persistence: {
        enabled: true,
        key: 'hecho_transito_draft',
        debounceMs: 2000,
    },

    submitButton: {
        label: 'Guardar Hecho de Tránsito',
        icon: 'content-save',
        loadingText: 'Guardando...',
    },
};
