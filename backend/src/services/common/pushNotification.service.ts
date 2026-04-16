import { db } from '../config/database';
import fetch from 'node-fetch';

// ============================================
// INTERFACES
// ============================================

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
}

interface ExpoPushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
  };
}

interface NotificacionData {
  usuarioId: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  datos?: Record<string, any>;
}

// ============================================
// CONSTANTES
// ============================================

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// ============================================
// SERVICIO DE NOTIFICACIONES PUSH
// ============================================

export const PushNotificationService = {
  /**
   * Registrar token de dispositivo
   */
  async registrarToken(
    usuarioId: number,
    pushToken: string,
    plataforma: 'ios' | 'android' | 'web',
    modeloDispositivo?: string,
    versionApp?: string
  ): Promise<void> {
    await db.query(`
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
    `, [usuarioId, pushToken, plataforma, modeloDispositivo, versionApp]);
  },

  /**
   * Desactivar token (logout o token invalido)
   */
  async desactivarToken(pushToken: string): Promise<void> {
    await db.query(`
      UPDATE dispositivo_push
      SET activo = FALSE, updated_at = NOW()
      WHERE push_token = $1
    `, [pushToken]);
  },

  /**
   * Obtener tokens activos de un usuario
   */
  async obtenerTokensUsuario(usuarioId: number): Promise<string[]> {
    const result = await db.query(`
      SELECT push_token FROM dispositivo_push
      WHERE usuario_id = $1 AND activo = TRUE
    `, [usuarioId]);
    return result.rows.map((r: { push_token: string }) => r.push_token);
  },

  /**
   * Obtener tokens de toda la tripulacion de una salida
   */
  async obtenerTokensTripulacion(salidaId: number): Promise<Array<{
    usuarioId: number;
    pushToken: string;
    nombreCompleto: string;
  }>> {
    const result = await db.query(`
      SELECT * FROM obtener_tokens_tripulacion($1)
    `, [salidaId]);
    return result.rows.map((r: { usuario_id: number; push_token: string; nombre_completo: string }) => ({
      usuarioId: r.usuario_id,
      pushToken: r.push_token,
      nombreCompleto: r.nombre_completo,
    })).filter((t: { pushToken: string }) => t.pushToken);
  },

  /**
   * Enviar notificacion a un usuario
   */
  async enviarAUsuario(data: NotificacionData): Promise<boolean> {
    const tokens = await this.obtenerTokensUsuario(data.usuarioId);

    if (tokens.length === 0) {
      // Guardar notificacion aunque no se pueda enviar
      await this.guardarNotificacion(data, false, 'Usuario sin dispositivos registrados');
      return false;
    }

    return await this.enviarATokens(tokens, data);
  },

  /**
   * Enviar notificacion a multiples usuarios
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
   * Enviar notificacion a toda la tripulacion de una salida
   */
  async enviarATripulacion(
    salidaId: number,
    tipo: string,
    titulo: string,
    mensaje: string,
    datos?: Record<string, any>,
    excluirUsuarioId?: number
  ): Promise<{ exitosos: number; fallidos: number }> {
    const tripulacion = await this.obtenerTokensTripulacion(salidaId);

    const tokensAEnviar = tripulacion
      .filter(t => t.usuarioId !== excluirUsuarioId)
      .map(t => t.pushToken);

    if (tokensAEnviar.length === 0) {
      return { exitosos: 0, fallidos: 0 };
    }

    const notifData: NotificacionData = {
      usuarioId: 0, // Se guardara por cada usuario
      tipo,
      titulo,
      mensaje,
      datos,
    };

    // Guardar notificacion para cada usuario
    for (const t of tripulacion.filter(t => t.usuarioId !== excluirUsuarioId)) {
      await this.guardarNotificacion({ ...notifData, usuarioId: t.usuarioId }, true);
    }

    const success = await this.enviarATokens(tokensAEnviar, notifData);

    return {
      exitosos: success ? tokensAEnviar.length : 0,
      fallidos: success ? 0 : tokensAEnviar.length,
    };
  },

  /**
   * Enviar notificaciones a tokens especificos (Expo Push)
   */
  async enviarATokens(tokens: string[], data: NotificacionData): Promise<boolean> {
    if (tokens.length === 0) return false;

    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      title: data.titulo,
      body: data.mensaje,
      data: {
        tipo: data.tipo,
        ...data.datos,
      },
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json() as { data: ExpoPushTicket[] };

      // Procesar respuestas y desactivar tokens invalidos
      for (let i = 0; i < result.data.length; i++) {
        const ticket = result.data[i];
        if (ticket.status === 'error') {
          if (ticket.details?.error === 'DeviceNotRegistered') {
            await this.desactivarToken(tokens[i]);
          }
          console.error(`Error enviando push a ${tokens[i]}:`, ticket.message);
        }
      }

      return result.data.some(t => t.status === 'ok');
    } catch (error) {
      console.error('Error enviando notificaciones push:', error);
      return false;
    }
  },

  /**
   * Guardar notificacion en historial
   */
  async guardarNotificacion(
    data: NotificacionData,
    enviada: boolean,
    errorEnvio?: string
  ): Promise<number> {
    const result = await db.query(`
      INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje, datos, enviada, fecha_envio, error_envio)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      data.usuarioId,
      data.tipo,
      data.titulo,
      data.mensaje,
      JSON.stringify(data.datos || {}),
      enviada,
      enviada ? new Date() : null,
      errorEnvio,
    ]);
    return result.rows[0].id;
  },

  /**
   * Marcar notificacion como leida
   */
  async marcarLeida(notificacionId: number, usuarioId: number): Promise<void> {
    await db.query(`
      UPDATE notificacion
      SET leida = TRUE, fecha_lectura = NOW()
      WHERE id = $1 AND usuario_id = $2
    `, [notificacionId, usuarioId]);
  },

  /**
   * Obtener notificaciones no leidas de un usuario
   */
  async obtenerNoLeidas(usuarioId: number, limite: number = 50): Promise<any[]> {
    const result = await db.query(`
      SELECT id, tipo, titulo, mensaje, datos, created_at
      FROM notificacion
      WHERE usuario_id = $1 AND leida = FALSE
      ORDER BY created_at DESC
      LIMIT $2
    `, [usuarioId, limite]);
    return result.rows;
  },

  // ============================================
  // NOTIFICACIONES ESPECIFICAS DEL SISTEMA
  // ============================================

  /**
   * Notificar nueva asignacion
   */
  async notificarAsignacion(
    usuarioId: number,
    unidadCodigo: string,
    fecha: string,
    rutaNombre?: string
  ): Promise<void> {
    await this.enviarAUsuario({
      usuarioId,
      tipo: 'ASIGNACION_NUEVA',
      titulo: 'Nueva Asignacion',
      mensaje: `Fuiste asignado a la unidad ${unidadCodigo} para ${fecha}${rutaNombre ? ` en ruta ${rutaNombre}` : ''}`,
      datos: { unidadCodigo, fecha, rutaNombre },
    });
  },

  /**
   * Notificar inspeccion 360 pendiente de aprobacion (al comandante)
   */
  async notificarInspeccion360Pendiente(
    comandanteId: number,
    unidadCodigo: string,
    inspectorNombre: string,
    inspeccionId: number
  ): Promise<void> {
    await this.enviarAUsuario({
      usuarioId: comandanteId,
      tipo: 'INSPECCION_PENDIENTE',
      titulo: 'Inspeccion 360 Pendiente',
      mensaje: `${inspectorNombre} completo la inspeccion 360 de ${unidadCodigo}. Requiere tu aprobacion.`,
      datos: { unidadCodigo, inspectorNombre, inspeccionId },
    });
  },

  /**
   * Notificar aprobacion/rechazo de 360 (al inspector)
   */
  async notificarInspeccion360Resultado(
    inspectorId: number,
    unidadCodigo: string,
    aprobada: boolean,
    comandanteNombre: string,
    motivoRechazo?: string
  ): Promise<void> {
    await this.enviarAUsuario({
      usuarioId: inspectorId,
      tipo: aprobada ? 'INSPECCION_APROBADA' : 'INSPECCION_RECHAZADA',
      titulo: aprobada ? 'Inspeccion Aprobada' : 'Inspeccion Rechazada',
      mensaje: aprobada
        ? `Tu inspeccion 360 de ${unidadCodigo} fue aprobada por ${comandanteNombre}`
        : `Tu inspeccion 360 de ${unidadCodigo} fue rechazada: ${motivoRechazo}`,
      datos: { unidadCodigo, aprobada, comandanteNombre, motivoRechazo },
    });
  },

  /**
   * Notificar solicitud de aprobacion a tripulacion
   */
  async notificarAprobacionRequerida(
    salidaId: number,
    tipo: 'CONFIRMAR_PRESENCIA' | 'APROBAR_FIN_JORNADA' | 'APROBAR_360',
    aprobacionId: number,
    iniciadoPorNombre: string,
    excluirUsuarioId?: number
  ): Promise<void> {
    const titulos: Record<string, string> = {
      'CONFIRMAR_PRESENCIA': 'Confirmar Presencia',
      'APROBAR_FIN_JORNADA': 'Aprobar Fin de Jornada',
      'APROBAR_360': 'Aprobar Inspeccion 360',
    };

    const mensajes: Record<string, string> = {
      'CONFIRMAR_PRESENCIA': `${iniciadoPorNombre} solicita confirmar tu presencia antes de iniciar la salida`,
      'APROBAR_FIN_JORNADA': `${iniciadoPorNombre} solicita aprobar el fin de jornada`,
      'APROBAR_360': `${iniciadoPorNombre} solicita aprobar la inspeccion 360`,
    };

    await this.enviarATripulacion(
      salidaId,
      'APROBACION_REQUERIDA',
      titulos[tipo],
      mensajes[tipo],
      { aprobacionId, tipoAprobacion: tipo },
      excluirUsuarioId
    );
  },

  /**
   * Notificar resultado de aprobacion
   */
  async notificarAprobacionResultado(
    salidaId: number,
    completada: boolean,
    tipo: string
  ): Promise<void> {
    await this.enviarATripulacion(
      salidaId,
      'APROBACION_COMPLETADA',
      completada ? 'Aprobacion Completada' : 'Aprobacion Rechazada',
      completada
        ? `La ${tipo.toLowerCase().replace('_', ' ')} fue aprobada por toda la tripulacion`
        : `La ${tipo.toLowerCase().replace('_', ' ')} fue rechazada`,
      { completada, tipo }
    );
  },

  /**
   * Notificar salida autorizada
   */
  async notificarSalidaAutorizada(
    usuarioId: number,
    unidadCodigo: string
  ): Promise<void> {
    await this.enviarAUsuario({
      usuarioId,
      tipo: 'SALIDA_AUTORIZADA',
      titulo: 'Salida Autorizada',
      mensaje: `Tu solicitud de salida para ${unidadCodigo} fue autorizada. Ya puedes iniciar.`,
      datos: { unidadCodigo },
    });
  },

  /**
   * Notificar alerta de bajo combustible
   */
  async notificarBajoCombustible(
    usuarioIds: number[],
    unidadCodigo: string,
    nivelActual: number
  ): Promise<void> {
    await this.enviarAUsuarios(
      usuarioIds,
      'ALERTA_COMBUSTIBLE',
      'Alerta: Bajo Combustible',
      `La unidad ${unidadCodigo} tiene solo ${nivelActual}% de combustible`,
      { unidadCodigo, nivelActual }
    );
  },
};

export default PushNotificationService;
