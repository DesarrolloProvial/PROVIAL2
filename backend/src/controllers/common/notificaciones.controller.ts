import { Request, Response } from 'express';
import { NotificacionModel } from '../../models/common/notificacion.model';
import { FirebaseService } from '../../services/common/firebase.service';
import { normalizeId } from '../../utils/db.utils';

export const NotificacionesController = {
  async registrarToken(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const { push_token, plataforma, modelo_dispositivo, version_app } = req.body;

      if (!push_token || !plataforma) return res.status(400).json({ error: 'push_token y plataforma son requeridos' });
      if (!['ios', 'android', 'web'].includes(plataforma)) return res.status(400).json({ error: 'plataforma debe ser ios, android o web' });

      await NotificacionModel.registrarToken(usuarioId, push_token, plataforma, modelo_dispositivo, version_app);
      res.json({ message: 'Token registrado correctamente' });
    } catch (error) {
      console.error('Error registrando token:', error);
      res.status(500).json({ error: 'Error al registrar token' });
    }
  },

  async desactivarToken(req: Request, res: Response) {
    try {
      const { push_token } = req.body;
      if (!push_token) return res.status(400).json({ error: 'push_token es requerido' });

      await NotificacionModel.desactivarToken(push_token);
      res.json({ message: 'Token desactivado' });
    } catch (error) {
      console.error('Error desactivando token:', error);
      res.status(500).json({ error: 'Error al desactivar token' });
    }
  },

  async listar(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const soloNoLeidas = req.query.solo_no_leidas === 'true';
      const limiteRaw = parseInt(req.query.limite as string, 10);
      const offsetRaw = parseInt(req.query.offset as string, 10);
      const limite = isNaN(limiteRaw) ? 50 : Math.min(limiteRaw, 200);
      const offset = isNaN(offsetRaw) ? 0 : offsetRaw;

      const [notificaciones, no_leidas] = await Promise.all([
        NotificacionModel.listar(usuarioId, soloNoLeidas, limite, offset),
        NotificacionModel.conteoNoLeidas(usuarioId),
      ]);

      res.json({ notificaciones, no_leidas });
    } catch (error) {
      console.error('Error listando notificaciones:', error);
      res.status(500).json({ error: 'Error al listar notificaciones' });
    }
  },

  async marcarLeida(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const notificacionId = normalizeId(req.params.id);
      if (!notificacionId) return res.status(400).json({ error: 'ID inválido' });

      await NotificacionModel.marcarLeida(notificacionId, usuarioId);
      res.json({ message: 'Notificacion marcada como leida' });
    } catch (error) {
      console.error('Error marcando leida:', error);
      res.status(500).json({ error: 'Error al marcar como leida' });
    }
  },

  async marcarTodasLeidas(req: Request, res: Response) {
    try {
      await NotificacionModel.marcarTodasLeidas(req.user!.userId);
      res.json({ message: 'Todas las notificaciones marcadas como leidas' });
    } catch (error) {
      console.error('Error marcando todas leidas:', error);
      res.status(500).json({ error: 'Error al marcar todas como leidas' });
    }
  },

  async conteoNoLeidas(req: Request, res: Response) {
    try {
      const no_leidas = await NotificacionModel.conteoNoLeidas(req.user!.userId);
      res.json({ no_leidas });
    } catch (error) {
      console.error('Error contando no leidas:', error);
      res.status(500).json({ error: 'Error al contar notificaciones' });
    }
  },

  async enviarPrueba(req: Request, res: Response) {
    try {
      const { usuario_id, titulo, mensaje } = req.body;
      if (!usuario_id || !titulo || !mensaje) {
        return res.status(400).json({ error: 'usuario_id, titulo y mensaje son requeridos' });
      }

      const enviada = await FirebaseService.enviarAUsuario({ usuarioId: usuario_id, tipo: 'PRUEBA', titulo, mensaje });
      res.json({ message: enviada ? 'Notificacion enviada' : 'Usuario sin dispositivos registrados', enviada });
    } catch (error) {
      console.error('Error enviando prueba:', error);
      res.status(500).json({ error: 'Error al enviar notificación' });
    }
  },
};

export default NotificacionesController;
