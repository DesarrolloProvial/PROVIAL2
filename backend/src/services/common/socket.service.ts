/**
 * Servicio de WebSocket (Socket.io)
 * Maneja eventos en tiempo real para el sistema PROVIAL
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// Tipos de eventos
export interface SituacionEvent {
  id: number;
  uuid: string;
  tipo_situacion: string;
  unidad_id: number;
  unidad_codigo: string;
  ruta_codigo?: string | null;
  km?: number | null;
  latitud?: number | null;
  longitud?: number | null;
  estado: string;
  sede_id?: number | null;
}

export interface UnidadEvent {
  unidad_id: number;
  unidad_codigo: string;
  estado: 'EN_SALIDA' | 'EN_SEDE' | 'FINALIZADO';
  sede_id?: number | null;
  ruta_id?: number | null;
  ultima_situacion?: string;
}

export interface ResumenUpdate {
  timestamp: string;
  unidades_activas: number;
  situaciones_hoy: number;
}

// Singleton para el servicio
let ioInstance: SocketIOServer | null = null;

/**
 * Inicializar Socket.io con el servidor HTTP
 */
export function initSocketService(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.socket.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware de autenticación
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      console.log(`🔌 [Socket] Conexión sin token: ${socket.id}`);
      // Permitir conexión sin autenticación para desarrollo
      socket.data.user = { rol: 'GUEST', userId: null, sede: null };
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      socket.data.user = {
        userId: decoded.userId,
        rol: decoded.rol,
        sede: decoded.sede,
      };
      next();
    } catch (error) {
      console.log(`🔌 [Socket] Token inválido: ${socket.id}`);
      // Permitir conexión pero sin datos de usuario
      socket.data.user = { rol: 'GUEST', userId: null, sede: null };
      next();
    }
  });

  // Manejo de conexiones
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    console.log(`🔌 [Socket] Conectado: ${socket.id} (${user.rol}, userId: ${user.userId})`);

    // Unir a rooms según rol
    joinRooms(socket);

    // Eventos del cliente
    socket.on('subscribe:dashboard', () => {
      socket.join('dashboard');
      console.log(`🔌 [Socket] ${socket.id} suscrito a dashboard`);
    });

    socket.on('unsubscribe:dashboard', () => {
      socket.leave('dashboard');
      console.log(`🔌 [Socket] ${socket.id} desuscrito de dashboard`);
    });

    socket.on('subscribe:unidad', (unidadId: number) => {
      socket.join(`unidad:${unidadId}`);
      console.log(`🔌 [Socket] ${socket.id} suscrito a unidad:${unidadId}`);
    });

    socket.on('unsubscribe:unidad', (unidadId: number) => {
      socket.leave(`unidad:${unidadId}`);
    });

    // Ping/pong para mantener conexión
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Desconexión
    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket] Desconectado: ${socket.id} (${reason})`);
    });
  });

  ioInstance = io;
  console.log('🔌 [Socket] Servicio WebSocket inicializado');

  return io;
}

/**
 * Unir socket a rooms según rol del usuario
 */
function joinRooms(socket: Socket) {
  const user = socket.data.user;

  // Room global para todos los conectados
  socket.join('global');

  // Room por rol
  if (user.rol) {
    socket.join(`rol:${user.rol}`);
  }

  // Room por sede
  if (user.sede) {
    socket.join(`sede:${user.sede}`);
  }

  // Rooms especiales por rol
  switch (user.rol) {
    case 'COP':
    case 'ADMIN':
    case 'OPERACIONES':
      // Estos roles ven todo
      socket.join('dashboard');
      socket.join('all-situaciones');
      socket.join('all-unidades');
      break;
    case 'BRIGADA':
      // Brigadas solo ven su sede
      if (user.sede) {
        socket.join(`situaciones:sede:${user.sede}`);
      }
      break;
  }
}

/**
 * Obtener instancia de Socket.io
 */
export function getIO(): SocketIOServer | null {
  return ioInstance;
}

// ========================================
// FUNCIONES DE EMISIÓN DE EVENTOS
// ========================================

/**
 * Emitir cuando se crea una nueva situación
 */
export function emitSituacionNueva(situacion: SituacionEvent) {
  const io = getIO();
  if (!io) return;

  console.log(`📡 [Socket] Emitiendo situacion:nueva - ${situacion.tipo_situacion} (Unidad: ${situacion.unidad_codigo})`);

  // Emitir a dashboard (COP, ADMIN, OPERACIONES)
  io.to('dashboard').emit('situacion:nueva', situacion);

  // Emitir a la sede específica
  if (situacion.sede_id) {
    io.to(`sede:${situacion.sede_id}`).emit('situacion:nueva', situacion);
  }

  // Emitir a la room de la unidad específica
  io.to(`unidad:${situacion.unidad_id}`).emit('situacion:nueva', situacion);
}

/**
 * Emitir cuando se actualiza una situación
 */
export function emitSituacionActualizada(situacion: SituacionEvent) {
  const io = getIO();
  if (!io) return;

  console.log(`📡 [Socket] Emitiendo situacion:actualizada - ID: ${situacion.id}`);

  io.to('dashboard').emit('situacion:actualizada', situacion);

  if (situacion.sede_id) {
    io.to(`sede:${situacion.sede_id}`).emit('situacion:actualizada', situacion);
  }

  io.to(`unidad:${situacion.unidad_id}`).emit('situacion:actualizada', situacion);
}

/**
 * Emitir cuando se cierra una situación
 */
export function emitSituacionCerrada(situacion: SituacionEvent) {
  const io = getIO();
  if (!io) return;

  console.log(`📡 [Socket] Emitiendo situacion:cerrada - ID: ${situacion.id}`);

  io.to('dashboard').emit('situacion:cerrada', situacion);

  if (situacion.sede_id) {
    io.to(`sede:${situacion.sede_id}`).emit('situacion:cerrada', situacion);
  }

  io.to(`unidad:${situacion.unidad_id}`).emit('situacion:cerrada', situacion);
}

/**
 * Emitir cuando una unidad cambia de estado (inicia/finaliza salida)
 */
export function emitUnidadCambioEstado(unidad: UnidadEvent) {
  const io = getIO();
  if (!io) return;

  console.log(`📡 [Socket] Emitiendo unidad:cambio_estado - ${unidad.unidad_codigo} -> ${unidad.estado}`);

  io.to('dashboard').emit('unidad:cambio_estado', unidad);
  io.to('all-unidades').emit('unidad:cambio_estado', unidad);

  if (unidad.sede_id) {
    io.to(`sede:${unidad.sede_id}`).emit('unidad:cambio_estado', unidad);
  }
}

/**
 * Emitir actualización del resumen del dashboard
 */
export function emitResumenUpdate(resumen: ResumenUpdate) {
  const io = getIO();
  if (!io) return;

  io.to('dashboard').emit('resumen:update', resumen);
}

/**
 * Emitir evento genérico a un room específico
 */
export function emitToRoom(room: string, event: string, data: any) {
  const io = getIO();
  if (!io) return;

  console.log(`📡 [Socket] Emitiendo ${event} a room: ${room}`);
  io.to(room).emit(event, data);
}

/**
 * Emitir a todos los conectados
 */
export function emitToAll(event: string, data: any) {
  const io = getIO();
  if (!io) return;

  console.log(`📡 [Socket] Broadcast ${event}`);
  io.emit(event, data);
}

/**
 * Obtener estadísticas de conexiones
 */
export async function getConnectionStats() {
  const io = getIO();
  if (!io) return null;

  const sockets = await io.fetchSockets();

  const stats = {
    total_connections: sockets.length,
    by_role: {} as Record<string, number>,
    by_sede: {} as Record<string, number>,
    rooms: {} as Record<string, number>,
  };

  for (const socket of sockets) {
    const user = socket.data.user;

    // Contar por rol
    const rol = user?.rol || 'UNKNOWN';
    stats.by_role[rol] = (stats.by_role[rol] || 0) + 1;

    // Contar por sede
    if (user?.sede) {
      const sede = `sede_${user.sede}`;
      stats.by_sede[sede] = (stats.by_sede[sede] || 0) + 1;
    }
  }

  // Contar rooms
  const rooms = io.sockets.adapter.rooms;
  for (const [name, room] of rooms) {
    if (!name.startsWith('/')) { // Excluir IDs de socket
      stats.rooms[name] = room.size;
    }
  }

  return stats;
}
