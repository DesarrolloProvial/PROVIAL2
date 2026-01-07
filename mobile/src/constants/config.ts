// Configuración de la aplicación - PC 1
// Red: 172.20.10.4

// API Configuration
export const API_URL = 'https://provial-production.up.railway.app/api';

// Configuración de timeouts
export const REQUEST_TIMEOUT = 10000; // 10 segundos

// Configuración de mapa
export const MAP_CONFIG = {
  initialRegion: {
    latitude: 14.6349, // Guatemala City
    longitude: -90.5069,
    latitudeDelta: 2.0,
    longitudeDelta: 2.0,
  },
  minZoomLevel: 8,
  maxZoomLevel: 18,
};

// Configuración de ubicación GPS
export const LOCATION_CONFIG = {
  // Precisión de la ubicación
  accuracy: 'high' as const, // 'low' | 'balanced' | 'high' | 'best'

  // Distancia mínima (metros) para actualizar ubicación
  distanceInterval: 10,

  // Tiempo mínimo (ms) para actualizar ubicación
  timeInterval: 5000, // 5 segundos
};

// Configuración de polling (si no se usa WebSocket)
export const POLLING_CONFIG = {
  // Intervalo de actualización de situaciones (ms)
  situacionesInterval: 30000, // 30 segundos

  // Intervalo de actualización de mapa (ms)
  mapaInterval: 15000, // 15 segundos
};

// Versión de la app
export const APP_VERSION = '1.0.0';

// Configuración de AsyncStorage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  ASIGNACION: 'asignacion',
  SETTINGS: 'settings',
};
