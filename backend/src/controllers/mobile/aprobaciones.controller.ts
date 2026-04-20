import { Request, Response } from 'express';
import { AprobacionModel } from '../../models/mobile/aprobacion.model';
import { PushNotificationService } from '../../services/common/pushNotification.service';
import { normalizeId } from '../../utils/db.utils';

export const AprobacionesController = {
  async crearConfirmacionPresencia(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const salidaId = normalizeId(req.body.salida_id);
      if (!salidaId) return res.status(400).json({ error: 'salida_id es requerido' });

      const miembro = await AprobacionModel.verificarTripulacion(salidaId, usuarioId);
      if (!miembro) return res.status(403).json({ error: 'No eres parte de la tripulacion de esta salida' });

      const existente = await AprobacionModel.getAprobacionPendiente(salidaId, 'CONFIRMAR_PRESENCIA');
      if (existente) {
        return res.status(400).json({
          error: 'Ya existe una solicitud de confirmacion pendiente',
          aprobacion_id: existente.id,
        });
      }

      const aprobacionId = await AprobacionModel.crear(salidaId, 'CONFIRMAR_PRESENCIA', usuarioId);

      await PushNotificationService.notificarAprobacionRequerida(
        salidaId, 'CONFIRMAR_PRESENCIA', aprobacionId, miembro.nombre_completo, usuarioId,
      );
      await AprobacionModel.autoAprobar(aprobacionId, usuarioId);

      return res.status(201).json({ message: 'Solicitud de confirmacion creada', aprobacion_id: aprobacionId });
    } catch (error) {
      console.error('Error creando confirmacion de presencia:', error);
      return res.status(500).json({ error: 'Error al crear solicitud de confirmacion' });
    }
  },

  async crearAprobacionFinJornada(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const salidaId = normalizeId(req.body.salida_id);
      if (!salidaId) return res.status(400).json({ error: 'salida_id es requerido' });

      const miembro = await AprobacionModel.verificarTripulacion(salidaId, usuarioId);
      if (!miembro) return res.status(403).json({ error: 'No eres parte de la tripulacion de esta salida' });

      const existente = await AprobacionModel.getAprobacionPendiente(salidaId, 'APROBAR_FIN_JORNADA');
      if (existente) {
        return res.status(400).json({
          error: 'Ya existe una solicitud de fin de jornada pendiente',
          aprobacion_id: existente.id,
        });
      }

      const aprobacionId = await AprobacionModel.crear(salidaId, 'APROBAR_FIN_JORNADA', usuarioId);

      await PushNotificationService.notificarAprobacionRequerida(
        salidaId, 'APROBAR_FIN_JORNADA', aprobacionId, miembro.nombre_completo, usuarioId,
      );
      await AprobacionModel.autoAprobar(aprobacionId, usuarioId);

      return res.status(201).json({ message: 'Solicitud de fin de jornada creada', aprobacion_id: aprobacionId });
    } catch (error) {
      console.error('Error creando aprobacion fin jornada:', error);
      return res.status(500).json({ error: 'Error al crear solicitud' });
    }
  },

  async crearAprobacion360(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const salidaId = normalizeId(req.body.salida_id);
      const inspeccionId = normalizeId(req.body.inspeccion_360_id);
      if (!salidaId || !inspeccionId) {
        return res.status(400).json({ error: 'salida_id e inspeccion_360_id son requeridos' });
      }

      const miembro = await AprobacionModel.verificarTripulacion(salidaId, usuarioId);
      if (!miembro) return res.status(403).json({ error: 'No eres parte de la tripulacion' });

      const aprobacionId = await AprobacionModel.crear(salidaId, 'APROBAR_360', usuarioId, inspeccionId);

      await PushNotificationService.notificarAprobacionRequerida(
        salidaId, 'APROBAR_360', aprobacionId, miembro.nombre_completo, usuarioId,
      );
      await AprobacionModel.autoAprobar(aprobacionId, usuarioId);

      return res.status(201).json({ message: 'Solicitud de aprobacion 360 creada', aprobacion_id: aprobacionId });
    } catch (error) {
      console.error('Error creando aprobacion 360:', error);
      return res.status(500).json({ error: 'Error al crear solicitud' });
    }
  },

  async responder(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const aprobacionId = normalizeId(req.params.id);
      if (!aprobacionId) return res.status(400).json({ error: 'ID inválido' });

      const { respuesta, motivo, latitud, longitud } = req.body;

      if (!respuesta || !['APROBADO', 'RECHAZADO'].includes(respuesta)) {
        return res.status(400).json({ error: 'respuesta debe ser APROBADO o RECHAZADO' });
      }
      if (respuesta === 'RECHAZADO' && !motivo) {
        return res.status(400).json({ error: 'Debe proporcionar un motivo para rechazar' });
      }

      const resultado = await AprobacionModel.responder(
        aprobacionId, usuarioId, respuesta, motivo ?? null, latitud ?? null, longitud ?? null,
      );

      if (!resultado.success) {
        return res.status(400).json({ error: resultado.error });
      }

      if (resultado.estado !== 'PENDIENTE') {
        const ap = await AprobacionModel.getSalidaYTipo(aprobacionId);
        if (ap) {
          await PushNotificationService.notificarAprobacionResultado(
            ap.salida_id, resultado.estado === 'COMPLETADA', ap.tipo,
          );
        }
      }

      return res.json({
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
      return res.status(500).json({ error: 'Error al responder' });
    }
  },

  async misPendientes(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const aprobaciones = await AprobacionModel.getMisPendientes(usuarioId);
      return res.json({ aprobaciones });
    } catch (error) {
      console.error('Error obteniendo aprobaciones pendientes:', error);
      return res.status(500).json({ error: 'Error al obtener aprobaciones' });
    }
  },

  async obtenerHistorial(req: Request, res: Response) {
    try {
      const limitRaw = parseInt(req.query.limit as string, 10);
      const offsetRaw = parseInt(req.query.offset as string, 10);
      const limit = isNaN(limitRaw) ? 50 : limitRaw;
      const offset = isNaN(offsetRaw) ? 0 : offsetRaw;

      const aprobaciones = await AprobacionModel.getHistorial(limit, offset);
      return res.json({ aprobaciones });
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return res.status(500).json({ error: 'Error al obtener historial' });
    }
  },

  async obtenerDetalle(req: Request, res: Response) {
    try {
      const aprobacionId = normalizeId(req.params.id);
      if (!aprobacionId) return res.status(400).json({ error: 'ID inválido' });

      const [aprobacion, respuestas] = await Promise.all([
        AprobacionModel.getDetalle(aprobacionId),
        AprobacionModel.getRespuestas(aprobacionId),
      ]);

      if (!aprobacion) return res.status(404).json({ error: 'Aprobacion no encontrada' });

      return res.json({ aprobacion, respuestas });
    } catch (error) {
      console.error('Error obteniendo detalle:', error);
      return res.status(500).json({ error: 'Error al obtener detalle' });
    }
  },

  async verificarPresencia(req: Request, res: Response) {
    try {
      const salidaId = normalizeId(req.params.salidaId);
      if (!salidaId) return res.status(400).json({ error: 'ID inválido' });

      const ap = await AprobacionModel.verificarPresencia(salidaId);

      if (!ap) {
        return res.json({
          tiene_aprobacion: false,
          puede_iniciar: false,
          mensaje: 'Debe solicitar confirmacion de presencia',
        });
      }

      return res.json({
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
      return res.status(500).json({ error: 'Error al verificar' });
    }
  },

  async cancelar(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const aprobacionId = normalizeId(req.params.id);
      if (!aprobacionId) return res.status(400).json({ error: 'ID inválido' });

      const aprobacion = await AprobacionModel.getAprobacionPendientePorIniciador(aprobacionId, usuarioId);
      if (!aprobacion) {
        return res.status(404).json({ error: 'Aprobacion no encontrada o no tienes permiso para cancelarla' });
      }

      await AprobacionModel.cancelar(aprobacionId);
      return res.json({ message: 'Aprobacion cancelada' });
    } catch (error) {
      console.error('Error cancelando aprobacion:', error);
      return res.status(500).json({ error: 'Error al cancelar' });
    }
  },
};

export default AprobacionesController;
