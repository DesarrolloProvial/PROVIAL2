import { api } from './api';

// ============================================
// INTERFACES
// ============================================

export interface TripulacionMiembro {
  usuario_id: number;
  rol_tripulacion: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE';
  telefono_contacto?: string;
  presente?: boolean;
  observaciones?: string;
  es_comandante?: boolean;
}

export interface CreateAsignacionProgramadaDTO {
  unidad_id: number;
  fecha_programada: string; // YYYY-MM-DD
  ruta_id?: number | null;
  recorrido_inicio_km?: number;
  recorrido_fin_km?: number;
  actividades_especificas?: string;
  comandante_usuario_id: number;
  tripulacion: TripulacionMiembro[];
}

export interface AsignacionProgramada {
  id: number;
  unidad_id: number;
  fecha_programada: string;
  estado: 'PROGRAMADA' | 'EN_AUTORIZACION' | 'AUTORIZADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';
  ruta_id: number | null;
  recorrido_inicio_km: number | null;
  recorrido_fin_km: number | null;
  actividades_especificas: string | null;
  comandante_usuario_id: number;
  creado_por_usuario_id: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// ASIGNACIONES SERVICE
// ============================================

export const asignacionesService = {
  // Crear asignación programada
  async crearAsignacionProgramada(data: CreateAsignacionProgramadaDTO): Promise<{
    message: string;
    asignacion: AsignacionProgramada;
    tripulantes_notificados: number;
  }> {
    const response = await api.post('/asignaciones', data);
    return response.data;
  },

  // Listar asignaciones
  async listarAsignaciones(filtros?: {
    estado?: string;
    unidad_id?: number;
    desde?: string;
    hasta?: string;
  }): Promise<{
    total: number;
    asignaciones: AsignacionProgramada[];
  }> {
    const response = await api.get('/asignaciones', { params: filtros });
    return response.data;
  },

  // Obtener asignación específica
  async obtenerAsignacion(id: number): Promise<AsignacionProgramada> {
    const response = await api.get(`/asignaciones/${id}`);
    return response.data;
  },

  // Obtener mi asignación (para brigadas)
  async obtenerMiAsignacion(): Promise<AsignacionProgramada> {
    const response = await api.get('/asignaciones/mi-asignacion');
    return response.data;
  },

  // Cancelar asignación
  async cancelarAsignacion(id: number, motivo?: string): Promise<{
    message: string;
    asignacion_id: number;
  }> {
    const response = await api.put(`/asignaciones/${id}/cancelar`, { motivo });
    return response.data;
  },
};
