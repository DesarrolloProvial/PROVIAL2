import api from './api';

export interface CreateActividadData {
  tipo_actividad_id: number;
  unidad_id?: number;
  salida_unidad_id?: number;
  ruta_id?: number;
  km?: number | null;
  sentido?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  observaciones?: string | null;
  datos?: Record<string, any>;
  id?: string; // Código determinista para idempotencia
}

export interface ActividadCompleta {
  id: number;
  tipo_actividad_id: number;
  unidad_id: number;
  salida_unidad_id: number | null;
  creado_por: number;
  ruta_id: number | null;
  latitud: number | null;
  longitud: number | null;
  km: number | null;
  sentido: string | null;
  estado: 'ACTIVA' | 'CERRADA';
  observaciones: string | null;
  datos: Record<string, any>;
  created_at: string;
  closed_at: string | null;
  codigo_actividad: string | null;
  // Denormalizados
  unidad_codigo?: string;
  ruta_codigo?: string;
  tipo_actividad_nombre?: string;
  tipo_actividad_categoria?: string;
  tipo_actividad_icono?: string;
  tipo_actividad_color?: string;
  creado_por_nombre?: string;
}

export const actividadApi = {
  async crear(data: CreateActividadData): Promise<ActividadCompleta> {
    const response = await api.post('/actividades', data);
    if (response.status >= 400) {
      throw new Error(response.data?.error || 'Error al crear actividad');
    }
    return response.data.actividad;
  },

  async cerrar(id: number): Promise<ActividadCompleta> {
    const response = await api.patch(`/actividades/${id}/cerrar`);
    if (response.status >= 400) {
      throw new Error(response.data?.error || 'Error al cerrar actividad');
    }
    return response.data.actividad;
  },

  async getById(id: number): Promise<ActividadCompleta> {
    const response = await api.get(`/actividades/${id}`);
    return response.data.actividad;
  },

  async getMiUnidadHoy(unidadId?: number): Promise<{ actividades: ActividadCompleta[]; actividad_activa: ActividadCompleta | null }> {
    const params = unidadId ? `?unidad_id=${unidadId}` : '';
    const response = await api.get(`/actividades/mi-unidad/hoy${params}`);
    return response.data;
  },
};
