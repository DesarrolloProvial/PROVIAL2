import * as admin from 'firebase-admin';
import { NotificacionModel } from '../../models/common/notificacion.model';
import {
  initializeFirebase,
  isFirebaseReady,
  isInvalidToken,
  normalizeDataPayload,
  sendEach,
  subscribeToTopic,
  sendToTopic,
} from './firebasePush.client';

// Inicializar Firebase al cargar el módulo
initializeFirebase();

interface NotificacionData {
  usuarioId: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  datos?: Record<string, any>;
}

export const FirebaseService = {
  // ── Envío a tokens FCM ────────────────────────────────────────────────

  async enviarATokens(tokens: string[], data: NotificacionData): Promise<boolean> {
    if (!isFirebaseReady() || tokens.length === 0) {
      await NotificacionModel.guardarNotificacion(data, false, 'Firebase no inicializado o sin tokens');
      return false;
    }

    try {
      const messages: admin.messaging.Message[] = tokens.map(token => ({
        token,
        notification: { title: data.titulo, body: data.mensaje },
        data: normalizeDataPayload(data.datos, data.tipo),
        android: {
          priority: 'high' as const,
          notification: { channelId: 'provial_default', icon: 'ic_notification', color: '#1e3a5f' },
        },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      }));

      const response = await sendEach(messages);

      // Desactivar tokens inválidos
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error && isInvalidToken(resp.error.code)) {
          NotificacionModel.desactivarToken(tokens[idx]);
        }
      });

      const exito = response.successCount > 0;
      await NotificacionModel.guardarNotificacion(
        data,
        exito,
        exito ? null : `Fallidos: ${response.failureCount}`,
      );
      return exito;
    } catch (error: any) {
      console.error('Error enviando FCM:', error);
      await NotificacionModel.guardarNotificacion(data, false, 'Error interno FCM');
      return false;
    }
  },

  // ── Envío por usuario / usuarios / tripulación / rol ─────────────────

  async enviarAUsuario(data: NotificacionData): Promise<boolean> {
    const tokens = await NotificacionModel.obtenerTokensUsuario(data.usuarioId);
    if (tokens.length === 0) {
      await NotificacionModel.guardarNotificacion(data, false, 'Usuario sin dispositivos registrados');
      return false;
    }
    return this.enviarATokens(tokens, data);
  },

  async enviarAUsuarios(
    usuarioIds: number[],
    tipo: string,
    titulo: string,
    mensaje: string,
    datos?: Record<string, any>,
  ): Promise<{ exitosos: number; fallidos: number }> {
    let exitosos = 0;
    let fallidos = 0;
    for (const usuarioId of usuarioIds) {
      const ok = await this.enviarAUsuario({ usuarioId, tipo, titulo, mensaje, datos });
      if (ok) exitosos++;
      else fallidos++;
    }
    return { exitosos, fallidos };
  },

  async enviarATripulacion(
    salidaId: number,
    tipo: string,
    titulo: string,
    mensaje: string,
    datos?: Record<string, any>,
  ): Promise<{ exitosos: number; fallidos: number }> {
    const tripulacion = await NotificacionModel.obtenerTokensTripulacion(salidaId);
    if (tripulacion.length === 0) return { exitosos: 0, fallidos: 0 };

    const tokens = tripulacion.map(t => t.fcmToken);
    const ok = await this.enviarATokens(tokens, { usuarioId: 0, tipo, titulo, mensaje, datos });
    return ok
      ? { exitosos: tripulacion.length, fallidos: 0 }
      : { exitosos: 0, fallidos: tripulacion.length };
  },

  async enviarARol(
    rol: string,
    tipo: string,
    titulo: string,
    mensaje: string,
    datos?: Record<string, any>,
    sedeId?: number,
  ): Promise<{ exitosos: number; fallidos: number }> {
    const usuarioIds = await NotificacionModel.obtenerUsuariosPorRol(rol, sedeId);
    return this.enviarAUsuarios(usuarioIds, tipo, titulo, mensaje, datos);
  },

  // ── Topics FCM ────────────────────────────────────────────────────────

  suscribirATopic: subscribeToTopic,
  enviarATopic: sendToTopic,

  // ── Notificaciones de negocio ─────────────────────────────────────────

  async notificarAsignacion(
    usuarioId: number,
    unidadCodigo: string,
    fecha: string,
    turno: string,
  ): Promise<boolean> {
    return this.enviarAUsuario({
      usuarioId,
      tipo: 'ASIGNACION',
      titulo: 'Nueva Asignación',
      mensaje: `Has sido asignado a la unidad ${unidadCodigo} para el ${fecha} (${turno})`,
      datos: { unidad_codigo: unidadCodigo, fecha, turno },
    });
  },

  async notificarInspeccion360Pendiente(
    comandanteId: number,
    unidadCodigo: string,
    inspectorNombre: string,
    inspeccionId: number,
  ): Promise<boolean> {
    return this.enviarAUsuario({
      usuarioId: comandanteId,
      tipo: 'INSPECCION_PENDIENTE',
      titulo: 'Inspección 360 Pendiente',
      mensaje: `${inspectorNombre} completó la inspección 360 de ${unidadCodigo}. Requiere tu aprobación.`,
      datos: { unidad_codigo: unidadCodigo, inspector_nombre: inspectorNombre, inspeccion_id: inspeccionId },
    });
  },

  async notificarInspeccion360Resultado(
    inspectorId: number,
    unidadCodigo: string,
    aprobada: boolean,
    comandanteNombre: string,
    motivoRechazo?: string,
  ): Promise<boolean> {
    return this.enviarAUsuario({
      usuarioId: inspectorId,
      tipo: aprobada ? 'INSPECCION_APROBADA' : 'INSPECCION_RECHAZADA',
      titulo: aprobada ? 'Inspección Aprobada' : 'Inspección Rechazada',
      mensaje: aprobada
        ? `Tu inspección 360 de ${unidadCodigo} fue aprobada por ${comandanteNombre}`
        : `Tu inspección 360 de ${unidadCodigo} fue rechazada: ${motivoRechazo}`,
      datos: { unidad_codigo: unidadCodigo, aprobada, comandante_nombre: comandanteNombre, motivo_rechazo: motivoRechazo },
    });
  },

  async notificarSalidaAutorizada(usuarioId: number, unidadCodigo: string): Promise<boolean> {
    return this.enviarAUsuario({
      usuarioId,
      tipo: 'SALIDA_AUTORIZADA',
      titulo: 'Salida Autorizada',
      mensaje: `Tu solicitud de salida para ${unidadCodigo} fue autorizada. Ya puedes iniciar.`,
      datos: { unidad_codigo: unidadCodigo },
    });
  },

  async notificarBajoCombustible(
    usuarioIds: number[],
    unidadCodigo: string,
    nivelActual: number,
  ): Promise<void> {
    await this.enviarAUsuarios(
      usuarioIds,
      'ALERTA_COMBUSTIBLE',
      'Alerta: Bajo Combustible',
      `La unidad ${unidadCodigo} tiene solo ${nivelActual}% de combustible`,
      { unidad_codigo: unidadCodigo, nivel_actual: nivelActual },
    );
  },

  async notificarEmergencia(
    sedeId: number | null,
    situacionId: number,
    descripcion: string,
    ubicacion: string,
  ): Promise<{ exitosos: number; fallidos: number }> {
    const roles = ['COP', 'OPERACIONES', 'ADMIN', 'SUPER_ADMIN'];
    let exitosos = 0;
    let fallidos = 0;
    for (const rol of roles) {
      const result = await this.enviarARol(
        rol, 'EMERGENCIA', 'EMERGENCIA REPORTADA',
        `${descripcion}. Ubicación: ${ubicacion}`,
        { situacion_id: situacionId },
        sedeId ?? undefined,
      );
      exitosos += result.exitosos;
      fallidos += result.fallidos;
    }
    return { exitosos, fallidos };
  },
};

export const PushNotificationService = FirebaseService;
export default FirebaseService;
