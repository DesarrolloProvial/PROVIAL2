// =============================================
// CONFIGURACIÓN DE PRODUCCIÓN - APP MÓVIL
// =============================================
// Copiar este archivo a config.ts antes de compilar para producción

// API Configuration - CAMBIAR POR URL DE PRODUCCIÓN
export const API_URL = 'https://api.tu-dominio.com/api';

// Configuración de timeouts
export const REQUEST_TIMEOUT = 15000; // 15 segundos (más tolerante en producción)

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
  accuracy: 'high' as const,
  distanceInterval: 10,
  timeInterval: 5000,
};

// Configuración de polling
export const POLLING_CONFIG = {
  situacionesInterval: 30000,
  mapaInterval: 15000,
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
