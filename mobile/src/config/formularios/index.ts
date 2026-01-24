/**
 * Configuración de Formularios - Índice Central
 * 
 * Exporta todas las configuraciones de formularios disponibles.
 * Mapea IDs de situación a sus configuraciones correspondientes.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - Configuraciones Reales
 */

import { FormConfig } from '../../core/FormBuilder/types';
import { asistenciaVehicularForm } from './asistenciaForm';
import { hechoTransitoForm } from './hechoTransitoForm';
import { emergenciaForm } from './emergenciaForm';
import { ejemploAsistenciaForm, ejemploFormularioSimple } from './ejemploForms';

// Mapa de configuraciones por ID (útil para navegación dinámica)
export const FORM_CONFIGS: Record<string, FormConfig> = {
    // Situaciones Operativas Principales
    'ASISTENCIA_VEHICULAR': asistenciaVehicularForm,
    'HECHO_TRANSITO': hechoTransitoForm,
    'EMERGENCIA_VIAL': emergenciaForm,

    // Ejemplos / Dev
    'EJEMPLO_ASISTENCIA': ejemploAsistenciaForm,
    'EJEMPLO_SIMPLE': ejemploFormularioSimple,
};

// Exports individuales
export {
    asistenciaVehicularForm,
    hechoTransitoForm,
    emergenciaForm,
    ejemploAsistenciaForm,
    ejemploFormularioSimple,
};

/**
 * Helper para obtener configuración por ID de situación
 * Maneja fallbacks si no existe la configuración específica
 */
export function getFormConfigForSituation(situacionId: string): FormConfig | null {
    const config = FORM_CONFIGS[situacionId];
    if (!config) {
        console.warn(`[FORM_REGISTRY] No existe configuración para situación: ${situacionId}`);
        return null;
    }
    return config;
}
