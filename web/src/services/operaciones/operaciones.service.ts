import { api } from './api';

// ============================================
// INTERFACES
// ============================================

export interface EstadisticasBrigada {
  usuario_id: number;
  nombre_completo: string;
  chapa: string;
  telefono: string | null;
  sede_id: number;
  sede_nombre: string;
  rol_nombre: string;
  turnos_ultimo_mes: number;
  turnos_ultimo_trimestre: number;
  ultimo_turno_fecha: string | null;
  dias_desde_ultimo_turno: number | null;
  proximo_turno_fecha: string | null;
  rol_tripulacion_frecuente: string | null;
  activo: boolean;
}

export interface EstadisticasUnidad {
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  marca: string | null;
  modelo: string | null;
  sede_id: number;
  sede_nombre: string;
  activa: boolean;
  combustible_actual: number;
  capacidad_combustible: number | null;
  odometro_actual: number;
  turnos_ultimo_mes: number;
  turnos_ultimo_trimestre: number;
  ultimo_turno_fecha: string | null;
  dias_desde_ultimo_uso: number | null;
  proximo_turno_fecha: string | null;
  consumo_promedio_diario: number | null;
  rendimiento_promedio: number | null;
  km_ultimo_mes: number | null;
}

export interface DisponibilidadRecursos {
  sede_id: number;
  sede_nombre: string;
  total_brigadas_activas: number;
  brigadas_en_turno_hoy: number;
  total_unidades_activas: number;
  unidades_en_turno_hoy: number;
  brigadas_disponibles_hoy: number;
  unidades_disponibles_hoy: number;
}

export interface DashboardData {
  resumen: DisponibilidadRecursos;
  brigadas_necesitan_descanso: number;
  unidades_bajo_combustible: number;
  disponibilidad: DisponibilidadRecursos[];
  alertas: {
    brigadasDescanso: EstadisticasBrigada[];
    unidadesCombustible: EstadisticasUnidad[];
  };
}

export interface BrigadaDisponible {
  id: number;
  nombre_completo: string;
  chapa: string;
  telefono: string | null;
  sede_id: number;
  sede_nombre: string;
  turnos_ultimo_mes: number;
  ultimo_turno_fecha: string | null;
  dias_desde_ultimo_turno: number | null;
  rol_tripulacion_frecuente: string | null;
  disponible: boolean;
  mensaje: string;
  dias_descanso: number;
}

export interface UnidadDisponible {
  id: number;
  codigo: string;
  tipo_unidad: string;
  marca: string | null;
  modelo: string | null;
  sede_id: number;
  sede_nombre: string;
  combustible_actual: number;
  capacidad_combustible: number | null;
  odometro_actual: number;
  turnos_ultimo_mes: number;
  ultimo_turno_fecha: string | null;
  dias_desde_ultimo_uso: number | null;
  disponible: boolean;
  mensaje: string;
  dias_descanso: number;
  combustible_suficiente: boolean;
  disponible_transportes: boolean;
  instrucciones_transportes: string | null;
}

export interface ValidacionBrigada {
  disponible: boolean;
  mensaje: string;
  ultimo_turno_fecha: string | null;
  dias_descanso: number;
}

export interface ValidacionUnidad {
  disponible: boolean;
  mensaje: string;
  ultimo_uso_fecha: string | null;
  dias_descanso: number;
  combustible_suficiente: boolean;
}

export interface CombustibleRegistro {
  id: number;
  unidad_id: number;
  asignacion_id: number | null;
  turno_id: number | null;
  tipo: 'INICIAL' | 'RECARGA' | 'FINAL' | 'AJUSTE';
  combustible_anterior: number;
  combustible_agregado: number;
  combustible_nuevo: number;
  combustible_consumido: number | null;
  odometro_anterior: number | null;
  odometro_actual: number | null;
  km_recorridos: number | null;
  rendimiento_km_litro: number | null;
  observaciones: string | null;
  registrado_por: number;
  created_at: string;
}

export interface RegistrarCombustibleDTO {
  unidad_id: number;
  asignacion_id?: number;
  turno_id?: number;
  tipo: 'INICIAL' | 'RECARGA' | 'FINAL' | 'AJUSTE';
  combustible_anterior: number;
  combustible_agregado?: number;
  combustible_nuevo: number;
  combustible_consumido?: number;
  odometro_anterior?: number;
  odometro_actual?: number;
  km_recorridos?: number;
  observaciones?: string;
}

// ============================================
// OPERACIONES SERVICE
// ============================================

export const operacionesService = {
  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    const response = await api.get('/operaciones/dashboard');
    return response.data.data;
  },

  // Estadísticas de Brigadas
  async getEstadisticasBrigadas(): Promise<EstadisticasBrigada[]> {
    const response = await api.get('/operaciones/brigadas/estadisticas');
    return response.data.data;
  },

  async getEstadisticasBrigada(id: number): Promise<EstadisticasBrigada> {
    const response = await api.get(`/operaciones/brigadas/estadisticas/${id}`);
    return response.data.data;
  },

  // Estadísticas de Unidades
  async getEstadisticasUnidades(): Promise<EstadisticasUnidad[]> {
    const response = await api.get('/operaciones/unidades/estadisticas');
    return response.data.data;
  },

  async getEstadisticasUnidad(id: number): Promise<EstadisticasUnidad> {
    const response = await api.get(`/operaciones/unidades/estadisticas/${id}`);
    return response.data.data;
  },

  // Disponibilidad para Asignación
  async getBrigadasDisponibles(fecha: string): Promise<BrigadaDisponible[]> {
    const response = await api.get('/operaciones/brigadas/disponibles', {
      params: { fecha },
    });
    return response.data.data;
  },

  async getUnidadesDisponibles(fecha: string): Promise<UnidadDisponible[]> {
    const response = await api.get('/operaciones/unidades/disponibles', {
      params: { fecha },
    });
    return response.data.data;
  },

  // Validaciones
  async validarDisponibilidadBrigada(
    usuario_id: number,
    fecha: string
  ): Promise<ValidacionBrigada> {
    const response = await api.post('/operaciones/validar/brigada', {
      usuario_id,
      fecha,
    });
    return response.data.data;
  },

  async validarDisponibilidadUnidad(
    unidad_id: number,
    fecha: string
  ): Promise<ValidacionUnidad> {
    const response = await api.post('/operaciones/validar/unidad', {
      unidad_id,
      fecha,
    });
    return response.data.data;
  },

  // Combustible
  async registrarCombustible(
    data: RegistrarCombustibleDTO
  ): Promise<CombustibleRegistro> {
    const response = await api.post('/operaciones/combustible', data);
    return response.data.data;
  },

  async getHistorialCombustible(
    unidadId: number,
    limit?: number
  ): Promise<CombustibleRegistro[]> {
    const response = await api.get(`/operaciones/combustible/unidad/${unidadId}`, {
      params: { limit },
    });
    return response.data.data;
  },
};
