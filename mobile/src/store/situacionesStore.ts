import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../constants/config';
import { TipoSituacion, EstadoSituacion, TipoDetalle } from '../constants/situacionTypes';

// ========================================
// INTERFACES
// ========================================

export interface SituacionCompleta {
  id: number;
  uuid: string;
  numero_situacion: string | null;
  tipo_situacion: TipoSituacion;
  estado: EstadoSituacion;
  asignacion_id: number | null;
  unidad_id: number;
  turno_id: number | null;
  ruta_id: number | null;
  km: number | null;
  sentido: string | null;
  latitud: number | null;
  longitud: number | null;
  ubicacion_manual: boolean;
  combustible: number | null;
  kilometraje_unidad: number | null;
  tripulacion_confirmada: any | null;
  descripcion: string | null;
  observaciones: string | null;
  incidente_id: number | null;
  creado_por: number;
  actualizado_por: number | null;
  created_at: string;
  updated_at: string;
  // De la vista
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  unidad_codigo: string;
  tipo_unidad: string;
  turno_fecha: string | null;
  incidente_numero: string | null;
  creado_por_nombre: string;
  actualizado_por_nombre: string | null;
  // Eventos Persistentes
  evento_persistente_id: number | null;
  evento_titulo: string | null;
  evento_tipo: string | null;
}

interface SituacionesState {
  // State
  situacionesHoy: SituacionCompleta[];
  situacionActiva: SituacionCompleta | null;
  catalogo: any[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;

  // Actions
  fetchMisSituacionesHoy: () => Promise<void>;
  fetchCatalogo: () => Promise<void>;
  createSituacion: (data: CreateSituacionData) => Promise<SituacionCompleta>;
  updateSituacion: (id: number, data: UpdateSituacionData) => Promise<void>;
  cerrarSituacion: (id: number, observaciones_finales?: string) => Promise<void>;
  cambiarTipoSituacion: (id: number, nuevoTipo: 'INCIDENTE' | 'ASISTENCIA_VEHICULAR', motivo?: string) => Promise<void>;
  refreshSituaciones: () => Promise<void>;
  clearError: () => void;
}

export interface CreateSituacionData {
  tipo_situacion: TipoSituacion;
  tipo_situacion_id?: number; // Referencia al catalogo
  unidad_id?: number;
  turno_id?: number;
  asignacion_id?: number;
  ruta_id?: number;
  km?: number;
  sentido?: string;
  latitud?: number;
  longitud?: number;
  ubicacion_manual?: boolean;
  combustible?: number;
  kilometraje_unidad?: number;
  tripulacion_confirmada?: any;
  descripcion?: string;
  observaciones?: string;
  detalles?: Array<{
    tipo_detalle: TipoDetalle;
    datos: any;
  }>;
}

export interface UpdateSituacionData {
  tipo_situacion?: TipoSituacion;
  estado?: EstadoSituacion;
  ruta_id?: number;
  km?: number;
  sentido?: string;
  latitud?: number;
  longitud?: number;
  combustible?: number;
  kilometraje_unidad?: number;
  descripcion?: string;
  observaciones?: string;
}

// ========================================
// STORE
// ========================================

export const useSituacionesStore = create<SituacionesState>((set, get) => ({
  // Initial state
  situacionesHoy: [],
  situacionActiva: null,
  catalogo: [],
  isLoading: false,
  error: null,
  lastUpdate: null,

  // ========================================
  // FETCH MIS SITUACIONES HOY
  // ========================================
  fetchMisSituacionesHoy: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.get(`${API_URL}/situaciones/mi-unidad/hoy`);
      const situaciones = response.data.situaciones || [];

      // Buscar situación activa (la más reciente con estado ACTIVA)
      const activa = situaciones.find((s: SituacionCompleta) => s.estado === 'ACTIVA') || null;

      set({
        situacionesHoy: situaciones,
        situacionActiva: activa,
        isLoading: false,
        lastUpdate: new Date(),
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'Error al obtener situaciones';

      set({
        error: errorMessage,
        isLoading: false,
      });

      console.error('Error al obtener situaciones:', error);
    }
  },

  // ========================================
  // FETCH CATALOGO
  // ========================================
  fetchCatalogo: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.get(`${API_URL}/situaciones/catalogo`);
      // El backend retorna un array de categorias con sus tipos
      set({
        catalogo: response.data || [],
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Error al obtener catálogo:', error);
      // No bloqueamos por error de catálogo, usaremos defaults si falla
      set({ isLoading: false });
    }
  },

  // ========================================
  // CREATE SITUACIÓN
  // ========================================
  createSituacion: async (data: CreateSituacionData) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.post(`${API_URL}/situaciones`, data);
      const nuevaSituacion = response.data.situacion;

      // Actualizar lista local
      const situacionesActuales = get().situacionesHoy;
      set({
        situacionesHoy: [nuevaSituacion, ...situacionesActuales],
        situacionActiva: nuevaSituacion.estado === 'ACTIVA' ? nuevaSituacion : get().situacionActiva,
        isLoading: false,
        lastUpdate: new Date(),
      });

      return nuevaSituacion;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'Error al crear situación';

      set({
        error: errorMessage,
        isLoading: false,
      });

      throw new Error(errorMessage);
    }
  },

  // ========================================
  // UPDATE SITUACIÓN
  // ========================================
  updateSituacion: async (id: number, data: UpdateSituacionData) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.patch(`${API_URL}/situaciones/${id}`, data);
      const situacionActualizada = response.data.situacion;

      // Actualizar en la lista local
      const situacionesActualizadas = get().situacionesHoy.map((s) =>
        s.id === id ? situacionActualizada : s
      );

      set({
        situacionesHoy: situacionesActualizadas,
        situacionActiva:
          get().situacionActiva?.id === id ? situacionActualizada : get().situacionActiva,
        isLoading: false,
        lastUpdate: new Date(),
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'Error al actualizar situación';

      set({
        error: errorMessage,
        isLoading: false,
      });

      throw new Error(errorMessage);
    }
  },

  // ========================================
  // CERRAR SITUACIÓN
  // ========================================
  cerrarSituacion: async (id: number, observaciones_finales?: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.patch(`${API_URL}/situaciones/${id}/cerrar`, {
        observaciones_finales,
      });

      const situacionCerrada = response.data.situacion;

      // Actualizar en la lista local
      const situacionesActualizadas = get().situacionesHoy.map((s) =>
        s.id === id ? situacionCerrada : s
      );

      // Si era la situación activa, limpiarla
      const nuevaActiva = get().situacionActiva?.id === id ? null : get().situacionActiva;

      set({
        situacionesHoy: situacionesActualizadas,
        situacionActiva: nuevaActiva,
        isLoading: false,
        lastUpdate: new Date(),
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'Error al cerrar situación';

      set({
        error: errorMessage,
        isLoading: false,
      });

      throw new Error(errorMessage);
    }
  },

  // ========================================
  // CAMBIAR TIPO SITUACIÓN
  // ========================================
  cambiarTipoSituacion: async (id: number, nuevoTipo: 'INCIDENTE' | 'ASISTENCIA_VEHICULAR', motivo?: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.patch(`${API_URL}/situaciones/${id}/cambiar-tipo`, {
        nuevo_tipo: nuevoTipo,
        motivo,
      });

      const situacionActualizada = response.data.situacion;

      // Actualizar en la lista local
      const situacionesActualizadas = get().situacionesHoy.map((s) =>
        s.id === id ? situacionActualizada : s
      );

      set({
        situacionesHoy: situacionesActualizadas,
        situacionActiva:
          get().situacionActiva?.id === id ? situacionActualizada : get().situacionActiva,
        isLoading: false,
        lastUpdate: new Date(),
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'Error al cambiar tipo de situación';

      set({
        error: errorMessage,
        isLoading: false,
      });

      throw new Error(errorMessage);
    }
  },

  // ========================================
  // REFRESH SITUACIONES
  // ========================================
  refreshSituaciones: async () => {
    await get().fetchMisSituacionesHoy();
  },

  // ========================================
  // CLEAR ERROR
  // ========================================
  clearError: () => {
    set({ error: null });
  },
}));
