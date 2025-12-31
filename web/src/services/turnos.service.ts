import { api } from './api';

// ============================================
// INTERFACES
// ============================================

export interface Turno {
  id: number;
  fecha: string;
  estado: 'PLANIFICADO' | 'ACTIVO' | 'CERRADO';
  observaciones: string | null;
  creado_por: number;
  aprobado_por: number | null;
  fecha_aprobacion: string | null;
  created_at: string;
  updated_at: string;
}

export interface AsignacionUnidad {
  id: number;
  turno_id: number;
  unidad_id: number;
  ruta_id: number | null;
  km_inicio: number | null;
  km_final: number | null;
  sentido: string | null;
  acciones: string | null;
  combustible_inicial: number | null;
  combustible_asignado: number | null;
  hora_salida: string | null;
  hora_entrada_estimada: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripulacionMiembro {
  usuario_id: number;
  rol_tripulacion: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE';
  telefono_contacto?: string;
  presente?: boolean;
  observaciones?: string;
}

export interface CreateTurnoDTO {
  fecha: string; // YYYY-MM-DD
  fecha_fin?: string; // YYYY-MM-DD (para comisiones largas)
  observaciones?: string;
}

export interface CreateAsignacionDTO {
  unidad_id: number;
  ruta_id?: number | null;
  km_inicio?: number;
  km_final?: number;
  sentido?: 'NORTE' | 'SUR' | 'ORIENTE' | 'OCCIDENTE';
  acciones?: string;
  combustible_inicial?: number;
  combustible_asignado?: number;
  hora_salida?: string; // HH:MM
  hora_entrada_estimada?: string; // HH:MM
  tripulacion: TripulacionMiembro[];
  es_reaccion?: boolean;
}

export interface Ruta {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

// ============================================
// TURNOS SERVICE
// ============================================

export const turnosService = {
  // Obtener turno del día
  async getTurnoHoy(): Promise<{ turno: Turno; asignaciones: any[] }> {
    const response = await api.get('/turnos/hoy');
    return response.data;
  },

  // Crear turno
  async createTurno(data: CreateTurnoDTO): Promise<Turno> {
    const response = await api.post('/turnos', data);
    return response.data.turno;
  },

  // Obtener turno por fecha
  async getTurnoByFecha(fecha: string): Promise<Turno | null> {
    try {
      const response = await api.get(`/turnos/fecha/${fecha}`);
      return response.data.turno;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Crear asignación
  async createAsignacion(
    turnoId: number,
    data: CreateAsignacionDTO
  ): Promise<{ asignacion: AsignacionUnidad; tripulacion: any[] }> {
    const response = await api.post(`/turnos/${turnoId}/asignaciones`, data);
    return response.data;
  },

  // Obtener mi asignación de hoy (para brigadas)
  async getMiAsignacionHoy(): Promise<any> {
    const response = await api.get('/turnos/mi-asignacion-hoy');
    return response.data;
  },

  // Actualizar asignación
  async updateAsignacion(
    asignacionId: number,
    data: Partial<CreateAsignacionDTO>
  ): Promise<{ asignacion: AsignacionUnidad; tripulacion: any[] }> {
    const response = await api.put(`/turnos/asignaciones/${asignacionId}`, data);
    return response.data;
  },

  // Eliminar asignación
  // forzar: true para cerrar salida activa y eliminar
  async deleteAsignacion(asignacionId: number, forzar: boolean = false): Promise<{ message: string; salida_cerrada?: number }> {
    const response = await api.delete(`/turnos/asignaciones/${asignacionId}${forzar ? '?forzar=true' : ''}`);
    return response.data;
  },
};

// ============================================
// GEOGRAFIA SERVICE (para rutas)
// ============================================

export const geografiaService = {
  // Obtener todas las rutas
  async getRutas(): Promise<Ruta[]> {
    const response = await api.get('/geografia/rutas');
    return response.data.rutas || response.data;
  },

  // Obtener ruta por ID
  async getRuta(id: number): Promise<Ruta> {
    const response = await api.get(`/geografia/rutas/${id}`);
    return response.data.ruta || response.data;
  },
};
