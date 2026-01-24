/**
 * Ejemplo de Configuración de Formulario
 * 
 * Demostración de cómo usar el FormBuilder para crear un formulario completo.
 * Este ejemplo crea un formulario simple de "Nueva Situación" con tabs.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - DÍA 2
 */

import { FormConfig } from '../../core/FormBuilder/types';

/**
 * Configuración de ejemplo: Formulario de Asistencia Vehicular
 * 
 * Este es un ejemplo simplificado. La configuración completa se creará
 * en siguientes iteraciones con todos los campos reales.
 */
export const ejemploAsistenciaForm: FormConfig = {
    id: 'asistencia_vehicular_ejemplo',
    title: 'Asistencia Vehicular',
    description: 'Registro de asistencia a vehículos en ruta',

    // Tabs del formulario
    tabs: [
        { id: 'general', label: 'General', icon: 'information' },
        { id: 'vehiculo', label: 'Vehículo', icon: 'car' },
        { id: 'otros', label: 'Otros', icon: 'file-document' },
    ],

    // Secciones por tab
    sections: {
        // Tab: General
        general: [
            {
                id: 'ubicacion',
                title: 'Ubicación',
                fields: [
                    {
                        name: 'tipo_asistencia',
                        type: 'select',
                        label: 'Tipo de Asistencia',
                        required: true,
                        options: '@catalogos.tipos_asistencia',
                        placeholder: 'Seleccione tipo de asistencia',
                    },
                    {
                        name: 'km',
                        type: 'number',
                        label: 'Kilómetro',
                        required: true,
                        min: 0,
                        max: 999,
                        placeholder: 'Ej: 50',
                    },
                    {
                        name: 'sentido',
                        type: 'select',
                        label: 'Sentido',
                        options: '@catalogos.sentidos',
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
        ],

        // Tab: Vehículo
        vehiculo: [
            {
                id: 'datos_vehiculo',
                title: 'Datos del Vehículo',
                fields: [
                    {
                        name: 'tipo_vehiculo',
                        type: 'select',
                        label: 'Tipo de Vehículo',
                        required: true,
                        options: '@catalogos.tipos_vehiculo',
                    },
                    {
                        name: 'marca_vehiculo',
                        type: 'select',
                        label: 'Marca',
                        options: '@catalogos.marcas_vehiculo',
                    },
                    {
                        name: 'placa',
                        type: 'text',
                        label: 'Placa',
                        placeholder: 'Ej: P-123ABC',
                        validation: {
                            pattern: /^[A-Z]-\d{3}[A-Z]{3}$/,
                        },
                        helperText: 'Formato: P-123ABC',
                    },
                ],
            },
        ],

        // Tab: Otros
        otros: [
            {
                id: 'detalles',
                title: 'Detalles Adicionales',
                fields: [
                    {
                        name: 'servicio_proporcionado',
                        type: 'textarea',
                        label: 'Servicio Proporcionado',
                        placeholder: 'Describa el servicio brindado...',
                        rows: 4,
                    },
                    {
                        name: 'observaciones',
                        type: 'textarea',
                        label: 'Observaciones',
                        placeholder: 'Observaciones generales...',
                        rows: 4,
                    },
                ],
            },
        ],
    },

    // Valores por defecto
    defaultValues: {
        clima: 'DESPEJADO',
        carga_vehicular: 'FLUIDO',
    },

    // Validación
    validateOnBlur: true,
    validateOnChange: false,

    // Botón de submit
    submitButton: {
        label: 'Guardar Asistencia',
        icon: 'content-save',
        loadingText: 'Guardando...',
    },
};

/**
 * Ejemplo simplificado para testing
 */
export const ejemploFormularioSimple: FormConfig = {
    id: 'ejemplo_simple',
    title: 'Formulario de Prueba',
    description: 'Formulario simple para probar el FormBuilder',

    // Sin tabs (formulario simple)
    sections: {
        default: [
            {
                id: 'info_basica',
                title: 'Información Básica',
                fields: [
                    {
                        name: 'nombre',
                        type: 'text',
                        label: 'Nombre',
                        required: true,
                        placeholder: 'Ingrese su nombre',
                    },
                    {
                        name: 'edad',
                        type: 'number',
                        label: 'Edad',
                        min: 0,
                        max: 120,
                    },
                    {
                        name: 'departamento',
                        type: 'select',
                        label: 'Departamento',
                        options: '@catalogos.departamentos',
                    },
                    {
                        name: 'comentarios',
                        type: 'textarea',
                        label: 'Comentarios',
                        placeholder: 'Escriba sus comentarios...',
                    },
                ],
            },
        ],
    },

    submitButton: {
        label: 'Enviar',
    },
};
