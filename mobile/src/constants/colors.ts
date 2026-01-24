// Paleta de colores de Provial Brigadas
export const COLORS = {
  // Colores principales
  primary: '#1e40af', // Azul principal
  primaryDark: '#1e3a8a',
  primaryLight: '#3b82f6',

  // Colores de acción
  danger: '#ef4444', // Rojo
  error: '#ef4444', // Alias de danger para compatibilidad
  warning: '#f59e0b', // Amarillo/naranja
  success: '#10b981', // Verde
  info: '#3b82f6', // Azul
  purple: '#8b5cf6', // Púrpura

  // Colores neutros
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Estados de situaciones
  situacion: {
    activa: '#10b981', // Verde
    cerrada: '#6b7280', // Gris
    cancelada: '#ef4444', // Rojo
  },

  // Tipos de situaciones
  tipoSituacion: {
    salida: '#3b82f6', // Azul
    patrullaje: '#10b981', // Verde
    cambio_ruta: '#f59e0b', // Amarillo
    parada: '#8b5cf6', // Púrpura
    comida: '#06b6d4', // Cyan
    incidente: '#ef4444', // Rojo
    regulacion: '#f97316', // Naranja
    asistencia: '#14b8a6', // Teal
  },

  // Fondo y texto
  background: '#f9fafb',
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    disabled: '#9ca3af',
    inverse: '#ffffff',
  },

  // Bordes
  border: '#e5e7eb',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
};
