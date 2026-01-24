/**
 * Configuración Completa: Asistencia Vehicular
 * 
 * Formulario completo basado en especificación técnica.
 * Incluye TODOS los campos necesarios según ESPECIFICACION_TECNICA_SITUACIONES.md
 * 
 * Fecha: 2026-01-22
 * FASE 1 - Configuraciones Reales
 */

import { FormConfig } from '../../core/FormBuilder/types';

export const asistenciaVehicularForm: FormConfig = {
    id: 'asistencia_vehicular',
    title: 'Asistencia Vehicular',
    description: 'Registro de asistencia a vehículos varados o con desperfectos',

    // Tabs del formulario
    tabs: [
        { id: 'general', label: 'General', icon: 'information' },
        { id: 'vehiculo', label: 'Vehículo', icon: 'car' },
        { id: 'recursos', label: 'Recursos', icon: 'account-group' },
        { id: 'evidencia', label: 'Evidencia', icon: 'camera' },
    ],

    sections: {
        // ============================================
        // TAB: GENERAL
        // ============================================
        general: [
            {
                id: 'tipo_asistencia',
                title: 'Tipo de Asistencia',
                fields: [
                    {
                        name: 'tipo_asistencia',
                        type: 'select',
                        label: 'Tipo de Asistencia',
                        required: true,
                        options: '@catalogos.tipos_asistencia',
                        placeholder: 'Seleccione tipo de asistencia',
                        helperText: 'Tipo de servicio brindado al usuario',
                    },
                    {
                        name: 'apoyo_proporcionado',
                        type: 'textarea',
                        label: 'Apoyo Proporcionado',
                        placeholder: 'Describa el apoyo brindado...',
                        helperText: 'Detalles del servicio prestado (sección "otros")',
                        rows: 3,
                    },
                ],
            },
            {
                id: 'ubicacion',
                title: 'Ubicación',
                description: 'Datos de localización del incidente',
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
                        autoCapture: false, // Desactivado para evitar errores de reubicación
                        helperText: 'Capture la ubicación al llegar al punto',
                    },
                    {
                        name: 'departamento_id',
                        type: 'select',
                        label: 'Departamento',
                        options: '@catalogos.departamentos',
                        placeholder: 'Seleccione departamento',
                    },
                    {
                        name: 'municipio_id',
                        type: 'select',
                        label: 'Municipio',
                        options: '@catalogos.municipios',
                        placeholder: 'Primero seleccione departamento',
                        disabledIf: (formData) => !formData.departamento_id,
                    },
                ],
            },
            {
                id: 'condiciones',
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
                id: 'obstruccion_section',
                title: 'Obstrucción de Vía',
                description: 'Indicar si el vehículo obstruye el paso',
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
                        placeholder: 'Información adicional relevante...',
                        rows: 4,
                    },
                ],
            },
        ],

        // ============================================
        // TAB: VEHÍCULO
        // ============================================
        vehiculo: [
            {
                id: 'vehiculo_section',
                title: 'Vehículo Asistido',
                description: 'Máximo 1 vehículo en asistencia',
                fields: [
                    {
                        name: 'vehiculos',
                        type: 'custom',
                        label: 'Vehículo',
                        component: 'VehiculoManager',
                        componentProps: {
                            maxVehiculos: 1,
                            minVehiculos: 0,
                            required: false,
                            label: 'Vehículo Asistido',
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
                description: 'Grúas que llegaron al lugar',
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
                description: 'Ajustadores de seguros presentes',
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
                description: 'Autoridades que se presentaron',
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
                description: 'Bomberos, Cruz Roja, etc.',
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

    // Valores por defecto
    defaultValues: {
        clima: 'DESPEJADO',
        carga_vehicular: 'FLUIDO',
        area: 'RURAL',
        material_via: 'ASFALTO',
    },

    // Validación
    validateOnBlur: true,
    validateOnChange: false,

    // Auto-guardado (draft)
    persistence: {
        enabled: true,
        key: 'asistencia_draft',
        debounceMs: 2000,
    },

    // Botón de submit
    submitButton: {
        label: 'Guardar Asistencia',
        icon: 'content-save',
        loadingText: 'Guardando...',
    },
};
