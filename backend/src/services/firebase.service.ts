import * as admin from 'firebase-admin';
import { db } from '../config/database';

// ============================================
// SERVICIO DE FIREBASE CLOUD MESSAGING
// ============================================

// Inicializar Firebase Admin (si no está inicializado)
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    // Intentar cargar credenciales desde variable de entorno o archivo
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Inicializar con credenciales por defecto (para desarrollo)
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    firebaseInitialized = true;
    console.log('Firebase Admin inicializado correctamente');
  } catch (error) {
    console.warn('Firebase Admin no inicializado:', error);
  }
}

// Inicializar al cargar el módulo
initializeFirebase();

// ============================================
// INTERFACES
// ============================================

interface NotificacionData {
  usuarioId: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  datos?: Record<string, any>;
}


// ============================================
// SERVICIO DE NOTIFICACIONES FIREBASE
// ============================================

export const FirebaseService = {
  /**
   * Registrar token FCM de dispositivo
   */
  async registrarToken(
    usuarioId: number,
    fcmToken: string,
    plataforma: 'ios' | 'android' | 'web',
    modeloDispositivo?: string,
    versionApp?: string
  ): Promise<void> {
    await db.none(`
      INSERT INTO dispositivo_push (usuario_id, push_token, plataforma, modelo_dispositivo, version_app)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (usuario_id, push_token)
      DO UPDATE SET
        plataforma = EXCLUDED.plataforma,
        modelo_dispositivo = EXCLUDED.modelo_dispositivo,
        version_app = EXCLUDED.version_app,
        activo = TRUE,
        ultimo_uso = NOW(),
        updated_at = NOW()
    `, [usuarioId, fcmToken, plataforma, modeloDispositivo, versionApp]);
  },

  /**
   * Desactivar token (logout o token inválido)
   */
  async desactivarToken(fcmToken: string): Promise<void> {
    await db.none(`
      UPDATE dispositivo_push
      SET activo = FALSE, updated_at = NOW()
      WHERE push_token = $1
    `, [fcmToken]);
  },

  /**
   * Obtener tokens activos de un usuario
   */
  async obtenerTokensUsuario(usuarioId: number): Promise<string[]> {
    const result = await db.any<{ push_token: string }>(`
      SELECT push_token FROM dispositivo_push
      WHERE usuario_id = $1 AND activo = TRUE
    `, [usuarioId]);
    return result.map(r => r.push_token);
  },

  /**
   * Obtener tokens de tripulación de una salida
   */
  async obtenerTokensTripulacion(salidaId: number): Promise<Array<{
    usuarioId: number;
    fcmToken: string;
    nombreCompleto: string;
  }>> {
    const result = await db.any<{
      usuario_id: number;
      push_token: string;
      nombre_completo: string;
    }>(`
      SELECT DISTINCT u.id AS usuario_id, d.push_token, u.nombre_completo
      FROM salida_unidad su
      JOIN brigada_unidad bu ON su.unidad_id = bu.unidad_id AND bu.activo = TRUE
      JOIN brigada b ON bu.brigada_id = b.id
      JOIN usuario u ON b.id = u.id
      JOIN dispositivo_push d ON u.id = d.usuario_id AND d.activo = TRUE
      WHERE su.id = $1
      UNION
      SELECT DISTINCT u.id AS usuario_id, d.push_token, u.nombre_completo
      FROM salida_unidad su
      JOIN asignacion_unidad au ON su.id = au.salida_id OR (au.unidad_id = su.unidad_id AND au.fecha = CURRENT_DATE)
      JOIN tripulacion_turno tt ON au.id = tt.asignacion_id
      JOIN usuario u ON tt.usuario_id = u.id
      JOIN dispositivo_push d ON u.id = d.usuario_id AND d.activo = TRUE
      WHERE su.id = $1
    `, [salidaId]);

    return result.map(r => ({
      usuarioId: r.usuario_id,
      fcmToken: r.push_token,
      nombreCompleto: r.nombre_completo,
    })).filter(t => t.fcmToken);
  },

  /**
   * Enviar notificación a un usuario
   */
  async enviarAUsuario(data: NotificacionData): Promise<boolean> {
    const tokens = await this.obtenerTokensUsuario(data.usuarioId);

    if (tokens.length === 0) {
      await this.guardarNotificacion(data, false, 'Usuario sin dispositivos registrados');
      return false;
    }

    return await this.enviarATokens(tokens, data);
  },

  /**
   * Enviar notificación a múltiples usuarios
   */
  async enviarAUsuarios(
    usuarioIds: number[],
    tipo: string,
    titulo: string,
    mensaje: string,
    datos?: Record<string, any>
  ): Promise<{ exitosos: number; fallidos: number }> {
    let exitosos = 0;
    let fallidos = 0;

    for (const usuarioId of usuarioIds) {
      const result = await this.enviarAUsuario({
        usuarioId,
        tipo,
        titulo,
        mensaje,
        datos,
      });
      if (result) exitosos++;
      else fallidos++;
    }

    return { exitosos, fallidos };
  },

  /**
   * Enviar notificación a tripulación completa
   */
  async enviarATripulacion(
    salidaId: number,
    tipo: string,
    titulo: string,
    mensaje: string,
    datos?: Record<string, any>
  ): Promise<{ exitosos: number; fallidos: number }> {
    const tripulacion = await this.obtenerTokensTripulacion(salidaId);

    if (tripulacion.length === 0) {
      return { exitosos: 0, fallidos: 0 };
    }

    const tokens = tripulacion.map(t => t.fcmToken);
    const success = await this.enviarATokens(tokens, {
      usuarioId: 0,
      tipo,
      titulo,
      mensaje,
      datos,
    });

    return success
      ? { exitosos: tripulacion.length, fallidos: 0 }
      : { exitosos: 0, fallidos: tripulacion.length };
  },

  /**
   * Enviar a múltiples tokens FCM
   */
  async enviarATokens(tokens: string[], data: NotificacionData): Promise<boolean> {
    if (!firebaseInitialized || tokens.length === 0) {
      await this.guardarNotificacion(data, false, 'Firebase no inicializado o sin tokens');
      return false;
    }

    try {
      // Preparar datos como strings (requerido por FCM)
      const dataPayload: Record<string, string> = {};
      if (data.datos) {
        Object.entries(data.datos).forEach(([key, value]) => {
          dataPayload[key] = typeof value === 'string' ? value : JSON.stringify(value);
        });
      }
      dataPayload.tipo = data.tipo;

      // Crear mensajes para cada token
      const messages: admin.messaging.Message[] = tokens.map(token => ({
        token,
        notification: {
          title: data.titulo,
          body: data.mensaje,
        },
        data: dataPayload,
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'provial_default',
            icon: 'ic_notification',
            color: '#1e3a5f',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      }));

      // Enviar todos los mensajes
      const response = await admin.messaging().sendEach(messages);

      // Procesar respuestas y desactivar tokens inválidos
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            this.desactivarToken(tokens[idx]);
          }
        }
      });

      const exitosos = response.successCount;
      const fallidos = response.failureCount;

      await this.guardarNotificacion(
        data,
        exitosos > 0,
        exitosos > 0 ? null : `Fallidos: ${fallidos}`
      );

      return exitosos > 0;
    } catch (error: any) {
      console.error('Error enviando FCM:', error);
      await this.guardarNotificacion(data, false, error.message);
      return false;
    }
  },

  /**
   * Guardar notificación en BD
   */
  async guardarNotificacion(
    data: NotificacionData,
    enviada: boolean,
    error?: string | null
  ): Promise<void> {
    try {
      await db.none(`
        INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje, datos, enviada, error)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        data.usuarioId || null,
        data.tipo,
        data.titulo,
        data.mensaje,
        data.datos ? JSON.stringify(data.datos) : null,
        enviada,
        error,
      ]);
    } catch (err) {
      console.error('Error guardando notificación:', err);
    }
  },

  /**
   * Enviar notificación a todos los usuarios con cierto rol
   */
  async enviarARol(
    rol: string,
    tipo: string,
    titulo: string,
    mensaje: string,
    datos?: Record<string, any>,
    sedeId?: number
  ): Promise<{ exitosos: number; fallidos: number }> {
    const usuarios = await db.any<{ id: number }>(`
      SELECT DISTINCT u.id
      FROM usuario u
      JOIN dispositivo_push d ON u.id = d.usuario_id AND d.activo = TRUE
      WHERE u.rol = $1 AND u.activo = TRUE
      ${sedeId ? 'AND (u.sede_id = $2 OR u.puede_ver_todas_sedes = TRUE)' : ''}
    `, sedeId ? [rol, sedeId] : [rol]);

    return this.enviarAUsuarios(
      usuarios.map(u => u.id),
      tipo,
      titulo,
      mensaje,
      datos
    );
  },

  /**
   * Notificar nueva asignación
   */
  async notificarAsignacion(
    usuarioId: number,
    unidadCodigo: string,
    fecha: string,
    turno: string
  ): Promise<boolean> {
    return this.enviarAUsuario({
      usuarioId,
      tipo: 'ASIGNACION',
      titulo: 'Nueva Asignación',
      mensaje: `Has sido asignado a la unidad ${unidadCodigo} para el ${fecha} (${turno})`,
      datos: { unidad_codigo: unidadCodigo, fecha, turno },
    });
  },

  /**
   * Notificar aprobación requerida
   */
  async notificarAprobacionRequerida(
    usuarioId: number,
    tipoAprobacion: string,
    descripcion: string,
    aprobacionId: number
  ): Promise<boolean> {
    return this.enviarAUsuario({
      usuarioId,
      tipo: 'APROBACION_REQUERIDA',
      titulo: 'Aprobación Requerida',
      mensaje: descripcion,
      datos: { tipo_aprobacion: tipoAprobacion, aprobacion_id: aprobacionId },
    });
  },

  /**
   * Notificar emergencia
   */
  async notificarEmergencia(
    sedeId: number | null,
    situacionId: number,
    descripcion: string,
    ubicacion: string
  ): Promise<{ exitosos: number; fallidos: number }> {
    const roles = ['COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN'];
    let exitosos = 0;
    let fallidos = 0;

    for (const rol of roles) {
      const result = await this.enviarARol(
        rol,
        'EMERGENCIA',
        'EMERGENCIA REPORTADA',
        `${descripcion}. Ubicación: ${ubicacion}`,
        { situacion_id: situacionId },
        sedeId || undefined
      );
      exitosos += result.exitosos;
      fallidos += result.fallidos;
    }

    return { exitosos, fallidos };
  },

  /**
   * Suscribir token a topic (para notificaciones masivas)
   */
  async suscribirATopic(token: string, topic: string): Promise<boolean> {
    if (!firebaseInitialized) return false;

    try {
      await admin.messaging().subscribeToTopic(token, topic);
      return true;
    } catch (error) {
      console.error('Error suscribiendo a topic:', error);
      return false;
    }
  },

  /**
   * Enviar notificación a topic
   */
  async enviarATopic(
    topic: string,
    titulo: string,
    mensaje: string,
    datos?: Record<string, any>
  ): Promise<boolean> {
    if (!firebaseInitialized) return false;

    try {
      const dataPayload: Record<string, string> = {};
      if (datos) {
        Object.entries(datos).forEach(([key, value]) => {
          dataPayload[key] = typeof value === 'string' ? value : JSON.stringify(value);
        });
      }

      await admin.messaging().send({
        topic,
        notification: {
          title: titulo,
          body: mensaje,
        },
        data: dataPayload,
      });

      return true;
    } catch (error) {
      console.error('Error enviando a topic:', error);
      return false;
    }
  },

  /**
   * Marcar notificación como leída
   */
  async marcarLeida(notificacionId: number, usuarioId: number): Promise<void> {
    await db.none(`
      UPDATE notificacion
      SET leida = TRUE
      WHERE id = $1 AND usuario_id = $2
    `, [notificacionId, usuarioId]);
  },

  /**
   * Marcar todas las notificaciones como leídas
   */
  async marcarTodasLeidas(usuarioId: number): Promise<number> {
    const result = await db.result(`
      UPDATE notificacion
      SET leida = TRUE
      WHERE usuario_id = $1 AND leida = FALSE
    `, [usuarioId]);
    return result.rowCount;
  },

  /**
   * Obtener notificaciones de un usuario
   */
  async obtenerNotificaciones(
    usuarioId: number,
    limit: number = 50,
    soloNoLeidas: boolean = false
  ): Promise<any[]> {
    return db.any(`
      SELECT * FROM notificacion
      WHERE usuario_id = $1
      ${soloNoLeidas ? 'AND leida = FALSE' : ''}
      ORDER BY created_at DESC
      LIMIT $2
    `, [usuarioId, limit]);
  },

  /**
   * Contar notificaciones no leídas
   */
  async contarNoLeidas(usuarioId: number): Promise<number> {
    const result = await db.one<{ count: string }>(`
      SELECT COUNT(*) FROM notificacion
      WHERE usuario_id = $1 AND leida = FALSE
    `, [usuarioId]);
    return parseInt(result.count);
  },
};

// Exportar también como PushNotificationService para compatibilidad
export const PushNotificationService = FirebaseService;

export default FirebaseService;
