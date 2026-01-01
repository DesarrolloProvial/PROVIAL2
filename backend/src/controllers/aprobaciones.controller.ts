import { Request, Response } from 'express';
import { db } from '../config/database';
import { PushNotificationService } from '../services/pushNotification.service';

// ============================================
// CONTROLADOR DE APROBACIONES DE TRIPULACION
// ============================================

export const AprobacionesController = {
  /**
   * Crear solicitud de aprobacion de presencia
   * POST /api/aprobaciones/confirmar-presencia
   */
  async crearConfirmacionPresencia(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;
      const { salida_id } = req.body;

      if (!salida_id) {
        return res.status(400).json({ error: 'salida_id es requerido' });
      }

      // Verificar que el usuario es parte de la tripulacion
      const verificacion = await db.query(`
        SELECT tt.usuario_id, u.nombre_completo
        FROM tripulacion_turno tt
        JOIN salida_unidad su ON su.asignacion_id = tt.asignacion_id
        JOIN usuario u ON u.id = tt.usuario_id
        WHERE su.id = $1 AND tt.usuario_id = $2
      `, [salida_id, usuarioId]);

      if (verificacion.rows.length === 0) {
        return res.status(403).json({ error: 'No eres parte de la tripulacion de esta salida' });
      }

      // Verificar que no hay una aprobacion pendiente
      const existente = await db.query(`
        SELECT id FROM aprobacion_tripulacion
        WHERE salida_id = $1 AND tipo = 'CONFIRMAR_PRESENCIA' AND estado = 'PENDIENTE'
      `, [salida_id]);

      if (existente.rows.length > 0) {
        return res.status(400).json({
          error: 'Ya existe una solicitud de confirmacion pendiente',
          aprobacion_id: existente.rows[0].id,
        });
      }

      // Crear aprobacion
      const result = await db.query(`
        SELECT crear_aprobacion_tripulacion($1, 'CONFIRMAR_PRESENCIA', $2) AS aprobacion_id
      `, [salida_id, usuarioId]);

      const aprobacionId = result.rows[0].aprobacion_id;

      // Notificar a la tripulacion
      await PushNotificationService.notificarAprobacionRequerida(
        salida_id,
        'CONFIRMAR_PRESENCIA',
        aprobacionId,
        verificacion.rows[0].nombre_completo,
        usuarioId
      );

      // Auto-aprobar para quien inicio
      await db.query(`
        SELECT responder_aprobacion($1, $2, 'APROBADO')
      `, [aprobacionId, usuarioId]);

      res.status(201).json({
        message: 'Solicitud de confirmacion creada',
        aprobacion_id: aprobacionId,
      });
    } catch (error) {
      console.error('Error creando confirmacion de presencia:', error);
      res.status(500).json({ error: 'Error al crear solicitud de confirmacion' });
    }
  },

  /**
   * Crear solicitud de aprobacion de fin de jornada
   * POST /api/aprobaciones/fin-jornada
   */
  async crearAprobacionFinJornada(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;
      const { salida_id } = req.body;

      if (!salida_id) {
        return res.status(400).json({ error: 'salida_id es requerido' });
      }

      // Verificar usuario en tripulacion
      const verificacion = await db.query(`
        SELECT tt.usuario_id, u.nombre_completo
        FROM tripulacion_turno tt
        JOIN salida_unidad su ON su.asignacion_id = tt.asignacion_id
        JOIN usuario u ON u.id = tt.usuario_id
        WHERE su.id = $1 AND tt.usuario_id = $2
      `, [salida_id, usuarioId]);

      if (verificacion.rows.length === 0) {
        return res.status(403).json({ error: 'No eres parte de la tripulacion de esta salida' });
      }

      // Verificar que no hay una pendiente
      const existente = await db.query(`
        SELECT id FROM aprobacion_tripulacion
        WHERE salida_id = $1 AND tipo = 'APROBAR_FIN_JORNADA' AND estado = 'PENDIENTE'
      `, [salida_id]);

      if (existente.rows.length > 0) {
        return res.status(400).json({
          error: 'Ya existe una solicitud de fin de jornada pendiente',
          aprobacion_id: existente.rows[0].id,
        });
      }

      // Crear aprobacion
      const result = await db.query(`
        SELECT crear_aprobacion_tripulacion($1, 'APROBAR_FIN_JORNADA', $2) AS aprobacion_id
      `, [salida_id, usuarioId]);

      const aprobacionId = result.rows[0].aprobacion_id;

      // Notificar
      await PushNotificationService.notificarAprobacionRequerida(
        salida_id,
        'APROBAR_FIN_JORNADA',
        aprobacionId,
        verificacion.rows[0].nombre_completo,
        usuarioId
      );

      // Auto-aprobar para quien inicio
      await db.query(`
        SELECT responder_aprobacion($1, $2, 'APROBADO')
      `, [aprobacionId, usuarioId]);

      res.status(201).json({
        message: 'Solicitud de fin de jornada creada',
        aprobacion_id: aprobacionId,
      });
    } catch (error) {
      console.error('Error creando aprobacion fin jornada:', error);
      res.status(500).json({ error: 'Error al crear solicitud' });
    }
  },

  /**
   * Crear solicitud de aprobacion de 360
   * POST /api/aprobaciones/inspeccion-360
   */
  async crearAprobacion360(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;
      const { salida_id, inspeccion_360_id } = req.body;

      if (!salida_id || !inspeccion_360_id) {
        return res.status(400).json({ error: 'salida_id e inspeccion_360_id son requeridos' });
      }

      // Verificar usuario
      const verificacion = await db.query(`
        SELECT tt.usuario_id, u.nombre_completo
        FROM tripulacion_turno tt
        JOIN salida_unidad su ON su.asignacion_id = tt.asignacion_id
        JOIN usuario u ON u.id = tt.usuario_id
        WHERE su.id = $1 AND tt.usuario_id = $2
      `, [salida_id, usuarioId]);

      if (verificacion.rows.length === 0) {
        return res.status(403).json({ error: 'No eres parte de la tripulacion' });
      }

      // Crear aprobacion
      const result = await db.query(`
        SELECT crear_aprobacion_tripulacion($1, 'APROBAR_360', $2, $3) AS aprobacion_id
      `, [salida_id, usuarioId, inspeccion_360_id]);

      const aprobacionId = result.rows[0].aprobacion_id;

      // Notificar
      await PushNotificationService.notificarAprobacionRequerida(
        salida_id,
        'APROBAR_360',
        aprobacionId,
        verificacion.rows[0].nombre_completo,
        usuarioId
      );

      // Auto-aprobar
      await db.query(`
        SELECT responder_aprobacion($1, $2, 'APROBADO')
      `, [aprobacionId, usuarioId]);

      res.status(201).json({
        message: 'Solicitud de aprobacion 360 creada',
        aprobacion_id: aprobacionId,
      });
    } catch (error) {
      console.error('Error creando aprobacion 360:', error);
      res.status(500).json({ error: 'Error al crear solicitud' });
    }
  },

  /**
   * Responder a una aprobacion
   * POST /api/aprobaciones/:id/responder
   */
  async responder(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;
      const aprobacionId = parseInt(req.params.id);
      const { respuesta, motivo, latitud, longitud } = req.body;

      if (!respuesta || !['APROBADO', 'RECHAZADO'].includes(respuesta)) {
        return res.status(400).json({ error: 'respuesta debe ser APROBADO o RECHAZADO' });
      }

      if (respuesta === 'RECHAZADO' && !motivo) {
        return res.status(400).json({ error: 'Debe proporcionar un motivo para rechazar' });
      }

      // Responder
      const result = await db.query(`
        SELECT responder_aprobacion($1, $2, $3, $4, $5, $6) AS resultado
      `, [aprobacionId, usuarioId, respuesta, motivo, latitud, longitud]);

      const resultado = result.rows[0].resultado;

      if (!resultado.success) {
        return res.status(400).json({ error: resultado.error });
      }

      // Si cambio el estado, notificar
      if (resultado.estado !== 'PENDIENTE') {
        // Obtener salida_id para notificar
        const aprobacion = await db.query(`
          SELECT salida_id, tipo FROM aprobacion_tripulacion WHERE id = $1
        `, [aprobacionId]);

        if (aprobacion.rows.length > 0) {
          await PushNotificationService.notificarAprobacionResultado(
            aprobacion.rows[0].salida_id,
            resultado.estado === 'COMPLETADA',
            aprobacion.rows[0].tipo
          );
        }
      }

      res.json({
        message: 'Respuesta registrada',
        estado: resultado.estado,
        conteo: {
          total: resultado.total,
          aprobados: resultado.aprobados,
          rechazados: resultado.rechazados,
          pendientes: resultado.pendientes,
        },
      });
    } catch (error) {
      console.error('Error respondiendo aprobacion:', error);
      res.status(500).json({ error: 'Error al responder' });
    }
  },

  /**
   * Obtener mis aprobaciones pendientes
   * GET /api/aprobaciones/pendientes
   */
  async misPendientes(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;

      const aprobaciones = await db.any(`
        SELECT * FROM v_mis_aprobaciones_pendientes
        WHERE usuario_id = $1
        ORDER BY fecha_inicio DESC
      `, [usuarioId]);

      res.json({ aprobaciones });
    } catch (error) {
      console.error('Error obteniendo aprobaciones pendientes:', error);
      res.status(500).json({ error: 'Error al obtener aprobaciones' });
    }
  },

  /**
   * Obtener historial de aprobaciones
   * GET /api/aprobaciones/historial
   */
  async obtenerHistorial(req: Request, res: Response) {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const aprobaciones = await db.any(`
        SELECT
          at.*,
          u.codigo AS unidad_codigo,
          ui.nombre_completo AS iniciado_por_nombre
        FROM aprobacion_tripulacion at
        LEFT JOIN unidad u ON u.id = at.unidad_id
        LEFT JOIN usuario ui ON ui.id = at.iniciado_por
        WHERE at.estado IN ('COMPLETADA', 'RECHAZADA', 'CANCELADA')
        ORDER BY at.updated_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      res.json({ aprobaciones });
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      res.status(500).json({ error: 'Error al obtener historial' });
    }
  },

  /**
   * Obtener detalle de una aprobacion
   * GET /api/aprobaciones/:id
   */
  async obtenerDetalle(req: Request, res: Response) {
    try {
      const aprobacionId = parseInt(req.params.id);

      // Aprobacion principal
      const aprobacion = await db.oneOrNone(`
        SELECT
          at.*,
          u.codigo AS unidad_codigo,
          u.tipo_unidad,
          ui.nombre_completo AS iniciado_por_nombre
        FROM aprobacion_tripulacion at
        LEFT JOIN unidad u ON u.id = at.unidad_id
        LEFT JOIN usuario ui ON ui.id = at.iniciado_por
        WHERE at.id = $1
      `, [aprobacionId]);

      if (!aprobacion) {
        return res.status(404).json({ error: 'Aprobacion no encontrada' });
      }

      // Respuestas
      const respuestas = await db.any(`
        SELECT
          ar.*,
          u.nombre_completo,
          u.chapa
        FROM aprobacion_respuesta ar
        JOIN usuario u ON u.id = ar.usuario_id
        WHERE ar.aprobacion_id = $1
        ORDER BY ar.fecha_respuesta NULLS LAST
      `, [aprobacionId]);

      res.json({
        aprobacion,
        respuestas,
      });
    } catch (error) {
      console.error('Error obteniendo detalle:', error);
      res.status(500).json({ error: 'Error al obtener detalle' });
    }
  },

  /**
   * Verificar estado de aprobacion de presencia para una salida
   * GET /api/aprobaciones/salida/:salidaId/presencia
   */
  async verificarPresencia(req: Request, res: Response) {
    try {
      const salidaId = parseInt(req.params.salidaId);

      const result = await db.query(`
        SELECT
          at.id AS aprobacion_id,
          at.estado,
          at.fecha_inicio,
          at.fecha_completada,
          (
            SELECT COUNT(*) FROM aprobacion_respuesta ar
            WHERE ar.aprobacion_id = at.id AND ar.respuesta = 'APROBADO'
          ) AS confirmados,
          (
            SELECT COUNT(*) FROM aprobacion_respuesta ar
            WHERE ar.aprobacion_id = at.id
          ) AS total_tripulantes
        FROM aprobacion_tripulacion at
        WHERE at.salida_id = $1 AND at.tipo = 'CONFIRMAR_PRESENCIA'
        ORDER BY at.created_at DESC
        LIMIT 1
      `, [salidaId]);

      if (result.rows.length === 0) {
        return res.json({
          tiene_aprobacion: false,
          puede_iniciar: false,
          mensaje: 'Debe solicitar confirmacion de presencia',
        });
      }

      const ap = result.rows[0];

      res.json({
        tiene_aprobacion: true,
        aprobacion_id: ap.aprobacion_id,
        estado: ap.estado,
        confirmados: ap.confirmados,
        total: ap.total_tripulantes,
        puede_iniciar: ap.estado === 'COMPLETADA',
        mensaje: ap.estado === 'COMPLETADA'
          ? 'Toda la tripulacion confirmo presencia'
          : ap.estado === 'RECHAZADA'
            ? 'Alguien rechazo la confirmacion'
            : `Esperando ${ap.total_tripulantes - ap.confirmados} confirmaciones`,
      });
    } catch (error) {
      console.error('Error verificando presencia:', error);
      res.status(500).json({ error: 'Error al verificar' });
    }
  },

  /**
   * Cancelar una aprobacion pendiente
   * POST /api/aprobaciones/:id/cancelar
   */
  async cancelar(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;
      const aprobacionId = parseInt(req.params.id);

      // Verificar que el usuario inicio la aprobacion
      const aprobacion = await db.query(`
        SELECT * FROM aprobacion_tripulacion
        WHERE id = $1 AND iniciado_por = $2 AND estado = 'PENDIENTE'
      `, [aprobacionId, usuarioId]);

      if (aprobacion.rows.length === 0) {
        return res.status(404).json({
          error: 'Aprobacion no encontrada o no tienes permiso para cancelarla',
        });
      }

      await db.query(`
        UPDATE aprobacion_tripulacion
        SET estado = 'CANCELADA', fecha_completada = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [aprobacionId]);

      res.json({ message: 'Aprobacion cancelada' });
    } catch (error) {
      console.error('Error cancelando aprobacion:', error);
      res.status(500).json({ error: 'Error al cancelar' });
    }
  },
};

export default AprobacionesController;
