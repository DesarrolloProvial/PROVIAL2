/**
 * Servicio para funcionalidades avanzadas de asignaciones
 */

import api from './api';

// =====================================================
// INTERFACES
// =====================================================

export interface TripulacionDetalle {
  usuario_id: number;
  nombre_completo: string;
  chapa: string;
  telefono: string | null;
  rol_tripulacion: string;
  licencia_tipo: string | null;
  rol_brigada: string | null;
  veces_en_ruta?: number;
  veces_en_situacion?: number;
}

export interface AvisoAsignacion {
  id: number;
  asignacion_id: number;
  tipo: 'ADVERTENCIA' | 'INFO' | 'URGENTE';
  mensaje: string;
  color: string;
  creado_por: number;
  creador_nombre?: string;
  created_at: string;
}

export interface AsignacionConDetalle {
  asignacion_id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  unidad_placa: string;
  ruta_id: number | null;
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  km_inicio: number | null;
  km_final: number | null;
  sentido: string | null;
  acciones: string | null;
  acciones_formato: string | null;
  hora_salida: string | null;
  situacion_fija_id: number | null;
  situacion_fija_titulo: string | null;
  situacion_fija_tipo: string | null;
  en_ruta: boolean;
  salida_estado: string | null;
  tripulacion: TripulacionDetalle[];
  avisos: AvisoAsignacion[];
}

export interface SedeConAsignaciones {
  sede_id: number;
  sede_nombre: string;
  sede_codigo: string;
  color_fondo: string;
  color_fondo_header: string;
  color_texto: string;
  color_acento: string;
  fuente: string;
  tamano_fuente: string;
  alerta_rotacion_rutas_activa: boolean;
  umbral_rotacion_rutas: number;
  turno_id: number | null;
  turno_estado: string | null;
  publicado: boolean;
  fecha_publicacion: string | null;
  creado_por: number | null;
  creado_por_nombre: string | null;
  asignaciones: AsignacionConDetalle[];
}

export interface ConfiguracionVisualSede {
  id?: number;
  sede_id: number;
  color_fondo: string;
  color_fondo_header: string;
  color_texto: string;
  color_acento: string;
  fuente: string;
  tamano_fuente: 'small' | 'normal' | 'large';
  alerta_rotacion_rutas_activa: boolean;
  umbral_rotacion_rutas: number;
}

export interface SituacionFija {
  id: number;
  sede_id: number;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  ruta_id: number | null;
  ruta_nombre?: string;
  ruta_codigo?: string;
  km_inicio: number | null;
  km_fin: number | null;
  punto_referencia: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  dias_semana: string[] | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  activa: boolean;
  observaciones: string | null;
  puntos_destacar: string | null;
  requiere_unidad_especifica: boolean;
  unidad_tipo_requerido: string | null;
  creado_por: number;
  sede_nombre?: string;
  creador_nombre?: string;
}

// =====================================================
// API CALLS
// =====================================================

export interface PermisosUsuario {
  puedeVerTodo: boolean;
  puedeEditar: boolean;
  soloLectura: boolean;
}

export interface RespuestaAsignacionesPorSede {
  fecha: string;
  sedes: SedeConAsignaciones[];
  permisos: PermisosUsuario;
}

export const asignacionesAvanzadasAPI = {
  // Asignaciones por sede
  getAsignacionesPorSede: async (fecha?: string, sedeId?: number, incluirBorradores?: boolean, mostrarPendientes?: boolean): Promise<RespuestaAsignacionesPorSede> => {
    const params = new URLSearchParams();
    if (mostrarPendientes) {
      params.append('mostrarPendientes', 'true');
    } else if (fecha) {
      params.append('fecha', fecha);
    }
    if (sedeId) params.append('sedeId', String(sedeId));
    if (incluirBorradores) params.append('incluirBorradores', 'true');

    const response = await api.get(`/asignaciones-avanzadas/por-sede?${params}`);
    return response.data as RespuestaAsignacionesPorSede;
  },

  // Publicar/despublicar turno
  publicarTurno: async (turnoId: number) => {
    const response = await api.post(`/asignaciones-avanzadas/turno/${turnoId}/publicar`);
    return response.data;
  },

  despublicarTurno: async (turnoId: number) => {
    const response = await api.post(`/asignaciones-avanzadas/turno/${turnoId}/despublicar`);
    return response.data;
  },

  // Configuración visual de sede
  getConfiguracionSede: async (sedeId: number) => {
    const response = await api.get(`/asignaciones-avanzadas/configuracion-sede/${sedeId}`);
    return response.data as ConfiguracionVisualSede;
  },

  getAllConfiguracionesSede: async () => {
    const response = await api.get('/asignaciones-avanzadas/configuracion-sede');
    return response.data as ConfiguracionVisualSede[];
  },

  updateConfiguracionSede: async (sedeId: number, config: Partial<ConfiguracionVisualSede>) => {
    const response = await api.put(`/asignaciones-avanzadas/configuracion-sede/${sedeId}`, config);
    return response.data as ConfiguracionVisualSede;
  },

  // Situaciones fijas
  getSituacionesFijas: async (sedeId?: number, incluirInactivas?: boolean) => {
    const params = new URLSearchParams();
    if (sedeId) params.append('sedeId', String(sedeId));
    if (incluirInactivas) params.append('incluirInactivas', 'true');

    const response = await api.get(`/asignaciones-avanzadas/situaciones-fijas?${params}`);
    return response.data as SituacionFija[];
  },

  getSituacionFija: async (id: number) => {
    const response = await api.get(`/asignaciones-avanzadas/situaciones-fijas/${id}`);
    return response.data as SituacionFija;
  },

  createSituacionFija: async (data: Partial<SituacionFija>) => {
    const response = await api.post('/asignaciones-avanzadas/situaciones-fijas', data);
    return response.data as SituacionFija;
  },

  updateSituacionFija: async (id: number, data: Partial<SituacionFija>) => {
    const response = await api.put(`/asignaciones-avanzadas/situaciones-fijas/${id}`, data);
    return response.data as SituacionFija;
  },

  deleteSituacionFija: async (id: number) => {
    const response = await api.delete(`/asignaciones-avanzadas/situaciones-fijas/${id}`);
    return response.data;
  },

  // Avisos
  crearAviso: async (asignacionId: number, data: { tipo: string; mensaje: string; color?: string }) => {
    const response = await api.post(`/asignaciones-avanzadas/asignacion/${asignacionId}/aviso`, data);
    return response.data as AvisoAsignacion;
  },

  eliminarAviso: async (avisoId: number) => {
    const response = await api.delete(`/asignaciones-avanzadas/aviso/${avisoId}`);
    return response.data;
  },

  // Alertas de rotación
  getAlertasRotacion: async (usuarioId: number, rutaId?: number, situacionFijaId?: number) => {
    const params = new URLSearchParams();
    if (rutaId) params.append('rutaId', String(rutaId));
    if (situacionFijaId) params.append('situacionFijaId', String(situacionFijaId));

    const response = await api.get(`/asignaciones-avanzadas/alertas-rotacion/${usuarioId}?${params}`);
    return response.data as {
      alertaRuta: boolean;
      vecesEnRuta: number;
      alertaSituacion: boolean;
      vecesEnSituacion: number;
    };
  },

  // Acciones con formato
  updateAccionesFormato: async (asignacionId: number, accionesFormato: string) => {
    const response = await api.put(`/asignaciones-avanzadas/asignacion/${asignacionId}/acciones-formato`, {
      acciones_formato: accionesFormato
    });
    return response.data;
  },

  // Vincular situación fija
  vincularSituacionFija: async (asignacionId: number, situacionFijaId: number) => {
    const response = await api.put(`/asignaciones-avanzadas/asignacion/${asignacionId}/vincular-situacion`, {
      situacion_fija_id: situacionFijaId
    });
    return response.data;
  }
};

export default asignacionesAvanzadasAPI;
