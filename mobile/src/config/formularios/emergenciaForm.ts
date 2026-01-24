/**
 * Configuración Completa: Emergencia Vial
 * 
 * Formulario para registro de emergencias (derrumbes, inundaciones, etc).
 * - Maneja rangos de kilómetros afectados
 * - NO incluye registro de vehículos
 * - Requiere evidencia multimedia obligatoria
 * 
 * Fecha: 2026-01-22
 * FASE 1 - Configuraciones Reales
 */

import { FormConfig } from '../../core/FormBuilder/types';

export const emergenciaForm: FormConfig = {
    id: 'emergencia_vial',
    title: 'Emergencia Vial',
    description: 'Registro de emergencias naturales o estructurales en ruta',

    tabs: [
        { id: 'general', label: 'General', icon: 'alert-circle' },
        { id: 'recursos', label: 'Recursos', icon: 'account-group' },
        { id: 'evidencia', label: 'Evidencia', icon: 'camera' },
    ],

    sections: {
        // ============================================
        // TAB: GENERAL
        // ============================================
        general: [
            {
                id: 'tipo_emergencia',
                title: 'Tipo de Emergencia',
                fields: [
                    {
                        name: 'tipo_emergencia',
                        type: 'select',
                        label: 'Tipo de Emergencia',
                        required: true,
                        options: '@catalogos.tipos_emergencia',
                        placeholder: 'Seleccione tipo...',
                        helperText: 'Derrumbes, inundaciones, incendios, etc.',
                    },
                ],
            },
            {
                id: 'ubicacion',
                title: 'Ubicación y Alcance',
                fields: [
                    {
                        name: 'km',
                        type: 'number',
                        label: 'Kilómetro Inicial',
                        required: true,
                        min: 0,
                        max: 999,
                        placeholder: 'Ej: 30',
                    },
                    {
                        name: 'es_rango',
                        type: 'checkbox',
                        label: 'Es un área afectada (Rango)',
                        helperText: 'Marcar si la emergencia cubre varios kilómetros',
                    },
                    {
                        name: 'km_fin',
                        type: 'number',
                        label: 'Kilómetro Final',
                        requiredIf: (data) => data.es_rango === true,
                        visibleIf: (data) => data.es_rango === true,
                        min: 0,
                        max: 999,
                        placeholder: 'Ej: 32',
                    },
                    {
                        name: 'sentido',
                        type: 'select',
                        label: 'Sentido Afectado',
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
                id: 'condiciones',
                title: 'Condiciones Ambientales',
                fields: [
                    {
                        name: 'clima',
                        type: 'select',
                        label: 'Clima',
                        options: '@catalogos.climas',
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
                        label: 'Descripción del Evento',
                        placeholder: 'Detalles sobre la magnitud, daños, riesgos...',
                        rows: 4,
                    },
                ],
            },
        ],

        // ============================================
        // TAB: RECURSOS
        // ============================================
        recursos: [
            // No lleva vehículos, grúas ni ajustadores típicamente en emergencias naturales
            // pero sí autoridades y socorro
            {
                id: 'autoridades',
                title: 'Autoridades Presentes',
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
                title: 'Cuerpos de Socorro',
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
                title: 'Evidencia del Daño',
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
        es_rango: false,
        clima: 'NUBLADO', // Default más probable en emergencias por lluvia
    },

    validateOnBlur: true,
    validateOnChange: false,

    persistence: {
        enabled: true,
        key: 'emergencia_vial_draft',
        debounceMs: 2000,
    },

    submitButton: {
        label: 'Reportar Emergencia',
        icon: 'alert-octagon',
        color: '#ef4444', // Rojo para emergencias
        loadingText: 'Reportando...',
    },
};
