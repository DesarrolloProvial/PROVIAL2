// =============================================
// CONFIGURACION DE LA APP MOVIL - PROVIAL
// =============================================
// IMPORTANTE: Cambiar API_URL antes de compilar APK

// =============================================
// URL DEL API - CAMBIAR SEGUN ENTORNO
// =============================================

// Para desarrollo local (tu PC):
// export const API_URL = 'http://192.168.1.100:3000/api';

// Para Railway (produccion):
// export const API_URL = 'https://tu-app.railway.app/api';

// URL ACTUAL (cambiar antes de compilar APK):
export const API_URL = 'http://172.20.10.4:3000/api';

// =============================================
// CONFIGURACION GENERAL
// =============================================

// Timeouts
export const REQUEST_TIMEOUT = 15000; // 15 segundos

// Configuracion de mapa (Guatemala)
export const MAP_CONFIG = {
  initialRegion: {
    latitude: 14.6349,
    longitude: -90.5069,
    latitudeDelta: 2.0,
    longitudeDelta: 2.0,
  },
  minZoomLevel: 8,
  maxZoomLevel: 18,
};

// Configuracion de ubicacion GPS
export const LOCATION_CONFIG = {
  accuracy: 'high' as const,
  distanceInterval: 10,
  timeInterval: 5000,
};

// Configuracion de polling
export const POLLING_CONFIG = {
  situacionesInterval: 30000,
  mapaInterval: 15000,
};

// Version de la app
export const APP_VERSION = '1.0.0';

// Keys de AsyncStorage
export const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  ASIGNACION: 'asignacion',
  SETTINGS: 'settings',
};
