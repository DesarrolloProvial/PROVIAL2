import { create } from 'zustand';
import api from '../services/api';
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
  tipo_situacion_id: number | null;
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
  // Campos del catálogo tipo_situacion_catalogo (tipo de asistencia/hecho/emergencia)
  tipo_situacion_nombre: string | null;
  tipo_situacion_categoria: string | null;
  // Campos adicionales de contexto
  tipo_pavimento: string | null; // material_via
  clima: string | null;
  area: string | null;
  // Multimedia
  multimedia?: Array<{
    id: number;
    tipo: 'FOTO' | 'VIDEO';
    orden: number;
    url: string;
    thumbnail: string | null;
  }>;
  total_fotos?: number;
  total_videos?: number;
}

interface SituacionesState {
  // State
  situacionesHoy: SituacionCompleta[];
  situacionActiva: SituacionCompleta | null;
  catalogo: any[];
  catalogosAuxiliares: {
    tipos_hecho: any[];
    tipos_asistencia: any[];
    tipos_emergencia: any[];
  };
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  debugInfo: string | null;

  // Actions
  fetchMisSituacionesHoy: () => Promise<void>;
  fetchCatalogo: () => Promise<void>;
  fetchCatalogosAuxiliares: () => Promise<void>;
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
  salida_unidad_id?: number;
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

  // Contexto
  clima?: string;
  carga_vehicular?: string;
  departamento_id?: number;
  municipio_id?: number;

  // Campos dinámicos (de DynamicFormFields)
  tipo_hecho_id?: number;
  subtipo_hecho_id?: number;
  tipo_asistencia_id?: number;
  tipo_emergencia_id?: number;

  // Víctimas
  hay_heridos?: boolean;
  cantidad_heridos?: number;
  hay_fallecidos?: boolean;
  cantidad_fallecidos?: number;
  vehiculos_involucrados?: number;

  // Daños
  danios_materiales?: boolean;
  danios_infraestructura?: boolean;
  danios_descripcion?: string;

  // Otros
  area?: string;
  obstruccion?: any;
  grupo?: number;

  // Hecho de tránsito - nuevos campos
  acuerdo_involucrados?: boolean;
  acuerdo_detalle?: string;
  ilesos?: number;
  heridos_leves?: number;
  heridos_graves?: number;
  trasladados?: number;
  fugados?: number;
  via_estado?: string;
  via_topografia?: string;
  via_geometria?: string;
  via_peralte?: string;
  via_condicion?: string;
  causas?: number[];
  vehiculos?: any[];

  // Multimedia (URIs locales)
  multimedia?: Array<{
    tipo: 'FOTO' | 'VIDEO';
    uri: string;
    orden?: number;
  }>;

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
  catalogosAuxiliares: { tipos_hecho: [], tipos_asistencia: [], tipos_emergencia: [] },
  isLoading: false,
  error: null,
  lastUpdate: null,
  debugInfo: null,

  // ========================================
  // FETCH MIS SITUACIONES HOY
  // ========================================
  fetchMisSituacionesHoy: async () => {
    set({ isLoading: true, error: null });

    try {
      // Importar salidaActiva para enviar unidad_id
      const { salidaActiva } = require('./authStore').useAuthStore.getState();
      const unidadParam = salidaActiva?.unidad_id ? `?unidad_id=${salidaActiva.unidad_id}` : '';
      const response = await api.get(`/situaciones/mi-unidad/hoy${unidadParam}`);
      const situaciones = response.data.situaciones || [];

      // Usar situacion_activa del backend (viene completa con multimedia, vehículos, etc.)
      // Fallback: buscar en la lista
      const activa = response.data.situacion_activa
        || situaciones.find((s: SituacionCompleta) => s.estado === 'ACTIVA')
        || null;

      const debug = `unidad_enviada: ${salidaActiva?.unidad_id || 'ninguna'} | situaciones: ${situaciones.length} | activa_backend: ${response.data.situacion_activa ? 'id=' + response.data.situacion_activa.id + ' estado=' + response.data.situacion_activa.estado : 'null'} | activa_final: ${activa ? 'id=' + activa.id : 'null'}`;

      set({
        situacionesHoy: situaciones,
        situacionActiva: activa,
        isLoading: false,
        lastUpdate: new Date(),
        debugInfo: debug,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.message || 'Error al obtener situaciones';

      set({
        error: errorMessage,
        isLoading: false,
        debugInfo: `ERROR: ${error.response?.status || 'network'} - ${errorMessage}`,
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
      const response = await api.get('/situaciones/catalogo');
      const catalogoRaw = response.data || [];

      // Lista de tipos a ELIMINAR del menú (se reportan en pantallas dedicadas o están prohibidos)
      const tiposProhibidos = [
        // Incidentes (van en pantalla dedicada)
        'accidente de tránsito', 'accidente', 'asistencia vial',
        'asistencia vehicular', 'emergencia / obstáculo', 'emergencia', 'obstáculo',
        // Tipos de accidente específicos (van en select de Hecho de Tránsito)
        'colisión', 'choque', 'salida de pista', 'derrape', 'caída de carga',
        'desprendimiento de carga', 'desbalance de carga', 'desprendimiento de neumático',
        'desprendimiento de eje', 'vehículo incendiado', 'ataque armado', 'vuelco',
        'atropello', 'persona fallecida',
        // Tipos de emergencia específicos (van en select de Emergencia)
        'derrame de combustible', 'vehículo abandonado', 'detención de vehículo',
        'caída de árbol', 'desprendimiento de rocas', 'derrumbe', 'deslave',
        'deslizamiento de tierra', 'hundimiento', 'socavamiento',
        'desbordamiento de rio', 'inundación', 'acumulación de agua', 'erupción volcánica',
        // Situaciones prohibidas
        'intercambio de tripulantes', 'salida de unidad', 'entrada de unidad',
        'cambio de ruta', 'cambio de tripulación', 'retirando señalización',
        'regulación en aeropuerto', 'denuncia de usuario', 'apoyo a báscula',
        'escoltando autoridades', 'bloqueo', 'manifestación', 'orden del día'
      ];

      // Filtrar el catálogo (case-insensitive + sin acentos)
      const catalogoFiltrado = catalogoRaw.map((categoria: any) => ({
        ...categoria,
        tipos: categoria.tipos?.filter((tipo: any) => {
          const normalizado = tipo.nombre?.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Quita acentos

          // Lista de palabras clave a bloquear
          const bloqueadas = [
            'accidente', 'asistencia', 'emergencia', 'obstaculo',
            'colision', 'choque', 'salida de pista', 'derrape', 'caida de carga',
            'desprendimiento', 'desbalance', 'neumatico', 'incendiado', 'ataque armado',
            'vuelco', 'atropello', 'persona fallecida',
            'derrame', 'abandonado', 'detencion de vehiculo',
            'caida de arbol', 'rocas', 'derrumbe', 'deslave',
            'deslizamiento', 'hundimiento', 'socavamiento',
            'desbordamiento', 'inundacion', 'acumulacion de agua', 'erupcion',
            'intercambio de tripulantes', 'salida de unidad', 'entrada de unidad',
            'cambio de ruta', 'cambio de tripulacion', 'retirando senalizacion',
            'aeropuerto', 'denuncia', 'bascula', // Sin tilde para capturar báscula
            'escoltando autoridades', 'bloqueo', 'manifestacion', 'orden del dia'
          ];

          const bloqueado = bloqueadas.some(palabra => normalizado?.includes(palabra));

          if (bloqueado) {
            console.log('FILTRADO:', tipo.nombre);
          }
          return !bloqueado;
        }) || []
      })).filter((cat: any) => cat.tipos.length > 0); // Remover categorías vacías

      set({
        catalogo: catalogoFiltrado,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Error al obtener catálogo:', error);
      set({ isLoading: false });
    }
  },

  // ========================================
  // FETCH CATALOGOS AUXILIARES
  // ========================================
  fetchCatalogosAuxiliares: async () => {
    try {
      const response = await api.get('/situaciones/auxiliares');
      set({ catalogosAuxiliares: response.data });
    } catch (error) {
      console.error('Error al cargar catálogos auxiliares', error);
    }
  },

  // ========================================
  // CREATE SITUACIÓN
  // ========================================
  createSituacion: async (data: CreateSituacionData) => {
    set({ isLoading: true, error: null });

    try {
      console.log('🚀 [STORE] Enviando situación:', JSON.stringify(data, null, 2));
      const response = await api.post(`/situaciones`, data);
      console.log('✅ [STORE] Respuesta exitosa:', response.data);
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
      console.error('❌ [STORE] Error al crear situación:', error);
      console.error('❌ [STORE] Error response:', error?.response);
      console.error('❌ [STORE] Error response data:', error?.response?.data);
      console.error('❌ [STORE] Error status:', error?.response?.status);

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
      const response = await api.patch(`/situaciones/${id}`, data);
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
      const response = await api.patch(`/situaciones/${id}/cerrar`, {
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
      const response = await api.patch(`/situaciones/${id}/cambiar-tipo`, {
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
