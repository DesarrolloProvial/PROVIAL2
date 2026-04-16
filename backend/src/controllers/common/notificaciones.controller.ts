import { Request, Response } from 'express';
import { db } from '../config/database';
import { PushNotificationService } from '../services/firebase.service';

// ============================================
// CONTROLADOR DE NOTIFICACIONES
// ============================================

export const NotificacionesController = {
  /**
   * Registrar token de dispositivo
   * POST /api/notificaciones/registrar-token
   */
  async registrarToken(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;
      const { push_token, plataforma, modelo_dispositivo, version_app } = req.body;

      if (!push_token || !plataforma) {
        return res.status(400).json({ error: 'push_token y plataforma son requeridos' });
      }

      if (!['ios', 'android', 'web'].includes(plataforma)) {
        return res.status(400).json({ error: 'plataforma debe ser ios, android o web' });
      }

      await PushNotificationService.registrarToken(
        usuarioId,
        push_token,
        plataforma,
        modelo_dispositivo,
        version_app
      );

      res.json({ message: 'Token registrado correctamente' });
    } catch (error) {
      console.error('Error registrando token:', error);
      res.status(500).json({ error: 'Error al registrar token' });
    }
  },

  /**
   * Desactivar token (logout)
   * POST /api/notificaciones/desactivar-token
   */
  async desactivarToken(req: Request, res: Response) {
    try {
      const { push_token } = req.body;

      if (!push_token) {
        return res.status(400).json({ error: 'push_token es requerido' });
      }

      await PushNotificationService.desactivarToken(push_token);

      res.json({ message: 'Token desactivado' });
    } catch (error) {
      console.error('Error desactivando token:', error);
      res.status(500).json({ error: 'Error al desactivar token' });
    }
  },

  /**
   * Obtener mis notificaciones
   * GET /api/notificaciones
   */
  async listar(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;
      const { solo_no_leidas, limite = 50, offset = 0 } = req.query;

      let query = `
        SELECT id, tipo, titulo, mensaje, datos, leida, created_at
        FROM notificacion
        WHERE usuario_id = $1
      `;

      const params: any[] = [usuarioId];

      if (solo_no_leidas === 'true') {
        query += ` AND leida = FALSE`;
      }

      query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limite, offset);

      const notificaciones = await db.any(query, params);

      // Contar no leidas
      const countResult = await db.one(`
        SELECT COUNT(*) as total FROM notificacion
        WHERE usuario_id = $1 AND leida = FALSE
      `, [usuarioId]);

      res.json({
        notificaciones,
        no_leidas: parseInt(countResult.total),
      });
    } catch (error) {
      console.error('Error listando notificaciones:', error);
      res.status(500).json({ error: 'Error al listar notificaciones' });
    }
  },

  /**
   * Marcar notificacion como leida
   * POST /api/notificaciones/:id/leer
   */
  async marcarLeida(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;
      const notificacionId = parseInt(req.params.id);

      await PushNotificationService.marcarLeida(notificacionId, usuarioId);

      res.json({ message: 'Notificacion marcada como leida' });
    } catch (error) {
      console.error('Error marcando leida:', error);
      res.status(500).json({ error: 'Error al marcar como leida' });
    }
  },

  /**
   * Marcar todas como leidas
   * POST /api/notificaciones/leer-todas
   */
  async marcarTodasLeidas(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;

      await db.none(`
        UPDATE notificacion
        SET leida = TRUE
        WHERE usuario_id = $1 AND leida = FALSE
      `, [usuarioId]);

      res.json({ message: 'Todas las notificaciones marcadas como leidas' });
    } catch (error) {
      console.error('Error marcando todas leidas:', error);
      res.status(500).json({ error: 'Error al marcar todas como leidas' });
    }
  },

  /**
   * Obtener conteo de no leidas (para badge)
   * GET /api/notificaciones/conteo
   */
  async conteoNoLeidas(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;

      const result = await db.one(`
        SELECT COUNT(*) as total FROM notificacion
        WHERE usuario_id = $1 AND leida = FALSE
      `, [usuarioId]);

      res.json({ no_leidas: parseInt(result.total) });
    } catch (error) {
      console.error('Error contando no leidas:', error);
      res.status(500).json({ error: 'Error al contar' });
    }
  },

  /**
   * Enviar notificacion de prueba (solo admin)
   * POST /api/notificaciones/prueba
   */
  async enviarPrueba(req: Request, res: Response) {
    try {
      const { usuario_id, titulo, mensaje } = req.body;

      if (!usuario_id || !titulo || !mensaje) {
        return res.status(400).json({ error: 'usuario_id, titulo y mensaje son requeridos' });
      }

      const enviada = await PushNotificationService.enviarAUsuario({
        usuarioId: usuario_id,
        tipo: 'PRUEBA',
        titulo,
        mensaje,
      });

      res.json({
        message: enviada ? 'Notificacion enviada' : 'Usuario sin dispositivos registrados',
        enviada,
      });
    } catch (error) {
      console.error('Error enviando prueba:', error);
      res.status(500).json({ error: 'Error al enviar' });
    }
  },
};

export default NotificacionesController;
