/**
 * Configuración de Formularios - Índice Central
 *
 * Exporta todas las configuraciones de formularios disponibles.
 * Mapea IDs de situación a sus configuraciones correspondientes.
 */

import { FormConfig } from '../../core/FormBuilder/types';
import { asistenciaVehicularForm } from './asistenciaForm';
import { hechoTransitoForm } from './hechoTransitoForm';
import { emergenciaForm } from './emergenciaForm';

// Mapa de configuraciones por ID
export const FORM_CONFIGS: Record<string, FormConfig> = {
    'ASISTENCIA_VEHICULAR': asistenciaVehicularForm,
    'HECHO_TRANSITO': hechoTransitoForm,
    'EMERGENCIA_VIAL': emergenciaForm,
};

// Exports individuales
export {
    asistenciaVehicularForm,
    hechoTransitoForm,
    emergenciaForm,
};

/**
 * Helper para obtener configuración por ID de situación
 */
export function getFormConfigForSituation(situacionId: string): FormConfig | null {
    const config = FORM_CONFIGS[situacionId];
    if (!config) {
        console.warn(`[FORM_REGISTRY] No existe configuración para situación: ${situacionId}`);
        return null;
    }
    return config;
}
