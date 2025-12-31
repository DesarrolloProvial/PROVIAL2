import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

// API_URL viene de config.ts (actualmente: 192.168.10.105:3001)

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Aumentado a 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: (status) => status < 500, // Aceptar respuestas 4xx
});

// Interceptor para agregar token
api.interceptors.request.use(
  async (config) => {
    // Use 'token' key to match STORAGE_KEYS.TOKEN
    const token = await AsyncStorage.getItem('token');
    console.log('[API Interceptor] Token retrieved:', token ? 'YES (length: ' + token.length + ')' : 'NO');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('[API Interceptor] Request to:', config.url);
    return config;
  },
  (error) => {
    console.error('[API Interceptor] Request error:', error);
    return Promise.reject(error);
  }
);

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: {
    id: number;
    username: string;
    nombre: string;
    apellido: string;
    rol: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface CreateIncidenteRequest {
  tipo_hecho_id: number;
  subtipo_hecho_id?: number;
  ruta_id: number;
  km: number;
  sentido?: string;
  referencia_ubicacion?: string;
  latitud: number;
  longitud: number;
  hay_heridos: boolean;
  cantidad_heridos: number;
  hay_fallecidos: boolean;
  cantidad_fallecidos: number;
  requiere_bomberos: boolean;
  requiere_pnc: boolean;
  requiere_ambulancia: boolean;
  observaciones_iniciales?: string;
}

export const authAPI = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
  },
};

export const incidentesAPI = {
  async create(incidente: CreateIncidenteRequest): Promise<any> {
    const { data } = await api.post('/incidentes', incidente);
    return data;
  },

  async getMiAsignacionHoy(): Promise<any> {
    const { data } = await api.get('/turnos/mi-asignacion-hoy');
    return data;
  },
};

export const geografiaAPI = {
  async getRutas(): Promise<any[]> {
    const { data } = await api.get('/geografia/rutas');
    return data.rutas || [];
  },

  async getDepartamentos(): Promise<any[]> {
    const { data } = await api.get('/geografia/departamentos');
    return data.departamentos || [];
  },

  async getMunicipiosPorDepartamento(departamentoId: number): Promise<any[]> {
    const { data } = await api.get(`/geografia/municipios?departamento_id=${departamentoId}`);
    return data.municipios || [];
  },
};

export const turnosAPI = {
  async getMiAsignacionHoy(): Promise<any> {
    const { data } = await api.get('/turnos/mi-asignacion-hoy');
    return data;
  },

  async cambiarRuta(nuevaRutaId: number): Promise<any> {
    const { data } = await api.post('/salidas/cambiar-ruta', {
      nueva_ruta_id: nuevaRutaId,
    });
    return data;
  },

  async registrarCombustible(params: {
    combustible: number;
    tipo: 'INICIAL' | 'ACTUAL' | 'FINAL';
    observaciones?: string;
  }): Promise<any> {
    const { data } = await api.post('/turnos/registrar-combustible', params);
    return data;
  },
};

export const salidasAPI = {
  async finalizarSalida(params: {
    km_final?: number;
    combustible_final?: number;
    observaciones?: string;
  }): Promise<any> {
    const { data } = await api.post('/salidas/finalizar', params);
    return data;
  },

  async finalizarJornadaCompleta(): Promise<any> {
    const { data } = await api.post('/salidas/finalizar-jornada');
    return data;
  },
};

export const ingresosAPI = {
  async getMisIngresosHoy(): Promise<{ ingresos: any[]; total: number }> {
    const { data } = await api.get('/ingresos/mis-ingresos-hoy');
    return data;
  },

  async getIngreso(id: number): Promise<any> {
    const { data } = await api.get(`/ingresos/${id}`);
    return data;
  },
};

export default api;
