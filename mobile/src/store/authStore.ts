import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../constants/config';
import { syncCatalogosAuxiliares } from '../services/catalogSync';

// ========================================
// INTERFACES
// ========================================

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'BRIGADA' | 'COP' | 'ENCARGADO_SEDE' | 'OPERACIONES' | 'MANDOS' | 'ADMIN';
  activo: boolean;
  grupo: number | null;
  exento_grupos: boolean;
  acceso_app_activo: boolean;
  fecha_inicio_ciclo: string | null;
}

export interface SalidaActiva {
  salida_id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  fecha_hora_salida: string;
  estado: 'EN_SALIDA' | 'FINALIZADA' | 'CANCELADA';
  tripulacion: any;
  mi_rol: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE';
  ruta_id: number | null; // Added ruta_id
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  km_inicial: number | null;
  combustible_inicial: number | null;
  horas_salida: number;
}

export interface IngresoActivo {
  ingreso_id: number;
  sede_id: number;
  sede_codigo: string;
  sede_nombre: string;
  fecha_hora_ingreso: string;
  tipo_ingreso: string;
  km_ingreso: number | null;
  combustible_ingreso: number | null;
  es_ingreso_final: boolean;
}

export interface MiSede {
  mi_sede_id: number;
  mi_sede_codigo: string;
  mi_sede_nombre: string;
  unidad_sede_id: number;
  unidad_sede_codigo: string;
  unidad_sede_nombre: string;
}

export interface SalidaHoy {
  salida_id: number;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  estado: 'EN_SALIDA' | 'FINALIZADA' | 'CANCELADA';
  fecha_hora_salida: string;
  fecha_hora_regreso: string | null;
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  km_inicial: number | null;
  km_final: number | null;
  combustible_inicial: number | null;
  combustible_final: number | null;
  km_recorridos: number | null;
  horas_salida: number;
  mi_rol: string;
  jornada_finalizada: boolean;
  puede_iniciar_nueva: boolean;
  resumen: {
    total_situaciones: number;
    situaciones: any[];
    horas_trabajadas: number;
    km_recorridos: number;
  };
}

interface AuthState {
  // State
  token: string | null;
  refreshToken: string | null;
  usuario: Usuario | null;
  salidaActiva: SalidaActiva | null;
  salidaHoy: SalidaHoy | null;
  ingresoActivo: IngresoActivo | null;
  miSede: MiSede | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  refreshSalidaActiva: () => Promise<void>;
  refreshSalidaHoy: () => Promise<void>;
  refreshIngresoActivo: () => Promise<void>;
  refreshMiSede: () => Promise<void>;
  refreshEstadoBrigada: () => Promise<void>;
  verificarAcceso: () => Promise<{ tiene_acceso: boolean; motivo_bloqueo: string | null }>;
  clearError: () => void;
}

// ========================================
// STORE
// ========================================

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  token: null,
  refreshToken: null,
  usuario: null,
  salidaActiva: null,
  salidaHoy: null,
  ingresoActivo: null,
  miSede: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  // ========================================
  // LOGIN
  // ========================================
  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });

    console.log('🔐 [LOGIN] Iniciando login...');
    console.log('📡 [LOGIN] URL:', `${API_URL}/auth/login`);
    console.log('👤 [LOGIN] Username:', username);

    // Obtener info del dispositivo para registro de control de acceso
    let deviceInfo: Record<string, string> = {};
    try {
      const Application = (await import('expo-application')).default;
      const Device = (await import('expo-device')).default;
      const androidId = await Application.getAndroidIdAsync?.() ?? null;
      deviceInfo = {
        device_id:         androidId || '',
        device_model:      Device.modelName || '',
        device_os:         Device.osName || '',
        device_os_version: Device.osVersion || '',
        app_version:       Application.nativeApplicationVersion || '',
      };
    } catch (_) {
      // No bloquear el login si no se puede obtener info del dispositivo
    }

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
        ...deviceInfo,
      });

      console.log('✅ [LOGIN] Login exitoso:', response.data);

      const { accessToken, refreshToken, user } = response.data;

      // Guardar en AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

      set({
        token: accessToken,
        refreshToken,
        usuario: user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Si es BRIGADA, obtener su estado completo (asignación, salida, ingreso, sede)
      if (user.rol === 'BRIGADA') {
        await get().refreshEstadoBrigada();
      }

      // Sincronizar catálogos auxiliares desde backend
      try {
        await syncCatalogosAuxiliares();
      } catch (error) {
        // No fallar el login si falla la sincronización
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ [LOGIN] Error completo:', error);
      console.error('❌ [LOGIN] Error code:', error.code);
      console.error('❌ [LOGIN] Error message:', error.message);
      console.error('❌ [LOGIN] Error response:', error.response);

      let errorMessage = 'Error al iniciar sesión';

      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout: El servidor no responde';
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        errorMessage = 'Error de red: No se puede conectar al servidor. Verifica que el servidor esté corriendo en ' + API_URL;
      } else if (error.response) {
        errorMessage = error.response.data?.error || 'Error en el servidor';
      } else if (error.request) {
        errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión de red y que el servidor esté corriendo.';
      } else {
        errorMessage = error.message || 'Error desconocido';
      }

      console.error('❌ [LOGIN] Error final:', errorMessage);

      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
      });

      return { success: false, error: errorMessage };
    }
  },

  // ========================================
  // LOGOUT
  // ========================================
  logout: async () => {
    try {
      // Limpiar AsyncStorage
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);

      set({
        token: null,
        refreshToken: null,
        usuario: null,
        salidaActiva: null,
        salidaHoy: null,
        ingresoActivo: null,
        miSede: null,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  },

  // ========================================
  // LOAD STORED AUTH
  // ========================================
  loadStoredAuth: async () => {
    set({ isLoading: true });

    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);

      if (token && userData) {
        const usuario = JSON.parse(userData);

        set({
          token,
          refreshToken,
          usuario,
          isAuthenticated: true,
          isLoading: false,
        });

        // Si es BRIGADA, obtener su estado completo (asignación, salida, ingreso, sede)
        if (usuario.rol === 'BRIGADA') {
          await get().refreshEstadoBrigada();
        }

        // Sincronizar catálogos auxiliares desde backend
        try {
          await syncCatalogosAuxiliares();
        } catch (error) {
          // No fallar el load si falla la sincronización
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error al cargar autenticación:', error);
      set({ isLoading: false });
    }
  },

  // ========================================
  // REFRESH SALIDA ACTIVA
  // ========================================
  refreshSalidaActiva: async () => {
    const { token, usuario } = get();

    if (!token || !usuario || usuario.rol !== 'BRIGADA') {
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/salidas/mi-salida-activa`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const salidaActiva = response.data || null;

      set({ salidaActiva });
    } catch (error: any) {
      // Si no tiene salida activa, es normal
      if (error.response?.status === 404) {
        set({ salidaActiva: null });
      } else {
        console.error('Error al obtener salida activa:', error);
      }
    }
  },

  // ========================================
  // REFRESH SALIDA HOY (activa o finalizada)
  // ========================================
  refreshSalidaHoy: async () => {
    const { token, usuario } = get();

    if (!token || !usuario || usuario.rol !== 'BRIGADA') {
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/salidas/mi-salida-hoy`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const salidaHoy = response.data || null;

      set({ salidaHoy });
    } catch (error: any) {
      // Si no tiene salida hoy, es normal
      if (error.response?.status === 404) {
        set({ salidaHoy: null });
      } else {
        console.error('Error al obtener salida de hoy:', error);
      }
    }
  },

  // ========================================
  // REFRESH INGRESO ACTIVO
  // ========================================
  refreshIngresoActivo: async () => {
    const { token, usuario, salidaActiva } = get();

    if (!token || !usuario || usuario.rol !== 'BRIGADA') {
      return;
    }

    // Si no hay salida activa, no puede haber ingreso activo
    if (!salidaActiva) {
      set({ ingresoActivo: null });
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/ingresos/mi-ingreso-activo`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const ingresoActivo = response.data || null;

      set({ ingresoActivo });
    } catch (error: any) {
      // Si no tiene ingreso activo, es normal (está en la calle)
      if (error.response?.status === 404) {
        set({ ingresoActivo: null });
      } else {
        console.error('Error al obtener ingreso activo:', error);
        set({ ingresoActivo: null });
      }
    }
  },

  // ========================================
  // REFRESH MI SEDE
  // ========================================
  refreshMiSede: async () => {
    const { token, usuario } = get();

    if (!token || !usuario || usuario.rol !== 'BRIGADA') {
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/sedes/mi-sede`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const miSede = response.data || null;

      set({ miSede });
    } catch (error: any) {
      // Si no tiene unidad asignada, no tiene sede
      if (error.response?.status === 404) {
        set({ miSede: null });
      } else {
        console.error('Error al obtener mi sede:', error);
      }
    }
  },

  // ========================================
  // REFRESH ESTADO COMPLETO DE BRIGADA
  // ========================================
  refreshEstadoBrigada: async () => {
    const { usuario } = get();

    if (!usuario || usuario.rol !== 'BRIGADA') {
      return;
    }

    // Refrescar salida activa (el ingreso depende de la salida)
    await Promise.all([
      get().refreshSalidaActiva(),
      get().refreshSalidaHoy(),
      get().refreshMiSede(),
    ]);

    // Luego refrescar ingreso activo (depende de salidaActiva)
    await get().refreshIngresoActivo();
  },

  // ========================================
  // VERIFICAR ACCESO A LA APP
  // ========================================
  verificarAcceso: async () => {
    const { token } = get();

    if (!token) {
      return { tiene_acceso: false, motivo_bloqueo: 'No autenticado' };
    }

    try {
      const response = await axios.get(`${API_URL}/grupos/acceso/verificar-mi-acceso`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data;
    } catch (error: any) {
      console.error('Error al verificar acceso:', error);
      return {
        tiene_acceso: false,
        motivo_bloqueo: 'Error al verificar acceso',
      };
    }
  },

  // ========================================
  // CLEAR ERROR
  // ========================================
  clearError: () => {
    set({ error: null });
  },
}));

// ========================================
// AXIOS INTERCEPTOR PARA TOKEN
// ========================================

axios.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores 401 (token expirado)
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado, hacer logout
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
