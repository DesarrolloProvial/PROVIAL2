/**
 * Hook para WebSocket (Socket.io)
 * Maneja conexión y eventos en tiempo real
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

// URL del servidor WebSocket
const getSocketUrl = () => {
  // Usar el mismo origen que el frontend (proxy de Vite redirige /socket.io al backend)
  return window.location.origin;
};

// Tipos de eventos
export interface SituacionEvent {
  id: number;
  uuid: string;
  tipo_situacion: string;
  unidad_id: number;
  unidad_codigo: string;
  ruta_codigo?: string;
  km?: number;
  latitud?: number;
  longitud?: number;
  estado: string;
  sede_id?: number;
}

export interface UnidadEvent {
  unidad_id: number;
  unidad_codigo: string;
  estado: 'EN_SALIDA' | 'EN_SEDE' | 'FINALIZADO';
  sede_id?: number;
  ruta_id?: number;
  ultima_situacion?: string;
}

export interface ResumenUpdate {
  timestamp: string;
  unidades_activas: number;
  situaciones_hoy: number;
}

// Callbacks para eventos
interface SocketCallbacks {
  onSituacionNueva?: (situacion: SituacionEvent) => void;
  onSituacionActualizada?: (situacion: SituacionEvent) => void;
  onSituacionCerrada?: (situacion: SituacionEvent) => void;
  onUnidadCambioEstado?: (unidad: UnidadEvent) => void;
  onResumenUpdate?: (resumen: ResumenUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

interface UseSocketReturn {
  isConnected: boolean;
  socket: Socket | null;
  subscribeToDashboard: () => void;
  unsubscribeFromDashboard: () => void;
  subscribeToUnidad: (unidadId: number) => void;
  unsubscribeFromUnidad: (unidadId: number) => void;
}

/**
 * Hook principal para manejar WebSocket
 */
export function useSocket(callbacks: SocketCallbacks = {}): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuthStore();

  // Referencia estable a los callbacks
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Inicializar conexión
  useEffect(() => {
    const socketUrl = getSocketUrl();
    console.log('🔌 [Socket] Conectando a:', socketUrl);

    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    // Eventos de conexión
    socket.on('connect', () => {
      console.log('🔌 [Socket] Conectado:', socket.id);
      setIsConnected(true);
      callbacksRef.current.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 [Socket] Desconectado:', reason);
      setIsConnected(false);
      callbacksRef.current.onDisconnect?.(reason);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 [Socket] Error de conexión:', error.message);
      callbacksRef.current.onError?.(error);
    });

    // Eventos de negocio
    socket.on('situacion:nueva', (data: SituacionEvent) => {
      console.log('📡 [Socket] Situación nueva:', data.tipo_situacion, data.unidad_codigo);
      callbacksRef.current.onSituacionNueva?.(data);
    });

    socket.on('situacion:actualizada', (data: SituacionEvent) => {
      console.log('📡 [Socket] Situación actualizada:', data.id);
      callbacksRef.current.onSituacionActualizada?.(data);
    });

    socket.on('situacion:cerrada', (data: SituacionEvent) => {
      console.log('📡 [Socket] Situación cerrada:', data.id);
      callbacksRef.current.onSituacionCerrada?.(data);
    });

    socket.on('unidad:cambio_estado', (data: UnidadEvent) => {
      console.log('📡 [Socket] Unidad cambio estado:', data.unidad_codigo, '->', data.estado);
      callbacksRef.current.onUnidadCambioEstado?.(data);
    });

    socket.on('resumen:update', (data: ResumenUpdate) => {
      console.log('📡 [Socket] Resumen actualizado');
      callbacksRef.current.onResumenUpdate?.(data);
    });

    // Pong para verificar conexión
    socket.on('pong', () => {
      // Conexión activa
    });

    // Cleanup
    return () => {
      console.log('🔌 [Socket] Desconectando...');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('situacion:nueva');
      socket.off('situacion:actualizada');
      socket.off('situacion:cerrada');
      socket.off('unidad:cambio_estado');
      socket.off('resumen:update');
      socket.off('pong');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  // Suscribirse al dashboard
  const subscribeToDashboard = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('🔌 [Socket] Suscribiendo a dashboard');
      socketRef.current.emit('subscribe:dashboard');
    }
  }, []);

  // Desuscribirse del dashboard
  const unsubscribeFromDashboard = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:dashboard');
    }
  }, []);

  // Suscribirse a una unidad específica
  const subscribeToUnidad = useCallback((unidadId: number) => {
    if (socketRef.current?.connected) {
      console.log('🔌 [Socket] Suscribiendo a unidad:', unidadId);
      socketRef.current.emit('subscribe:unidad', unidadId);
    }
  }, []);

  // Desuscribirse de una unidad
  const unsubscribeFromUnidad = useCallback((unidadId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:unidad', unidadId);
    }
  }, []);

  return {
    isConnected,
    socket: socketRef.current,
    subscribeToDashboard,
    unsubscribeFromDashboard,
    subscribeToUnidad,
    unsubscribeFromUnidad,
  };
}

/**
 * Hook simplificado para dashboard con invalidación de React Query
 */
export function useDashboardSocket(queryClient: any) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { isConnected, subscribeToDashboard, unsubscribeFromDashboard } = useSocket({
    onConnect: () => {
      subscribeToDashboard();
    },

    onSituacionNueva: (situacion) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['situaciones-activas'] });
      queryClient.invalidateQueries({ queryKey: ['resumen-unidades'] });
      setLastUpdate(new Date());

      // Mostrar notificación (opcional)
      console.log(`🚨 Nueva situación: ${situacion.tipo_situacion} - ${situacion.unidad_codigo}`);
    },

    onSituacionActualizada: () => {
      queryClient.invalidateQueries({ queryKey: ['situaciones-activas'] });
      queryClient.invalidateQueries({ queryKey: ['resumen-unidades'] });
      setLastUpdate(new Date());
    },

    onSituacionCerrada: () => {
      queryClient.invalidateQueries({ queryKey: ['situaciones-activas'] });
      queryClient.invalidateQueries({ queryKey: ['resumen-unidades'] });
      setLastUpdate(new Date());
    },

    onUnidadCambioEstado: (unidad) => {
      queryClient.invalidateQueries({ queryKey: ['resumen-unidades'] });
      queryClient.invalidateQueries({ queryKey: ['turno-hoy-dashboard'] });
      setLastUpdate(new Date());

      console.log(`🚗 Unidad ${unidad.unidad_codigo}: ${unidad.estado}`);
    },
  });

  // Suscribirse cuando se conecta
  useEffect(() => {
    if (isConnected) {
      subscribeToDashboard();
    }
    return () => {
      unsubscribeFromDashboard();
    };
  }, [isConnected, subscribeToDashboard, unsubscribeFromDashboard]);

  return {
    isConnected,
    lastUpdate,
  };
}
