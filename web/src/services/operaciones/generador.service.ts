import { api } from './api';

// ============================================
// INTERFACES
// ============================================

export interface SugerenciaTripulacion {
  usuario_id: number;
  nombre_completo: string;
  chapa: string;
  rol_sugerido: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE' | 'GARITA' | 'ENCARGADO_RUTA';
  rol_frecuente: string | null;
  dias_descanso: number;
  turnos_mes: number;
  score: number;
  es_piloto: boolean;
}

export interface SugerenciaAsignacion {
  tipo: 'UNIDAD' | 'GARITA' | 'ENCARGADO_RUTA';
  unidad_id?: number;
  unidad_codigo?: string;
  combustible_actual?: number;
  tripulacion: SugerenciaTripulacion[];
  score: number;
  razones: string[];
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface ParametrosGenerador {
  fecha: string;
  num_unidades?: number;
  tripulantes_por_unidad?: number;
  incluir_garita?: boolean;
  incluir_encargado_ruta?: boolean;
  priorizar_descanso?: boolean;
  priorizar_equidad?: boolean;
  min_dias_descanso?: number;
  considerar_patron_trabajo?: boolean;
}

export interface RespuestaGenerador {
  success: boolean;
  data: SugerenciaAsignacion[];
  metadata: {
    fecha: string;
    total_sugerencias: number;
    sede_id: string | number;
  };
}

// ============================================
// SERVICIO GENERADOR
// ============================================

export const generadorService = {
  /**
   * Genera sugerencias de asignaciones optimizadas
   */
  async generarSugerencias(params: ParametrosGenerador): Promise<RespuestaGenerador> {
    const response = await api.post('/generador-turnos/sugerencias', params);
    return response.data;
  },
};
