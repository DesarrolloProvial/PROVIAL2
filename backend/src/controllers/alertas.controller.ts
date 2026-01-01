import { Request, Response } from 'express';
import { AlertasService } from '../services/alertas.service';

// ============================================
// CONTROLADOR DE ALERTAS
// ============================================

export const AlertasController = {
  /**
   * Obtener tipos de alerta
   * GET /api/alertas/tipos
   */
  async obtenerTipos(_req: Request, res: Response) {
    try {
      const tipos = [
        { codigo: 'EMERGENCIA', nombre: 'Emergencia', severidad: 'alta', icono: 'alert-circle' },
        { codigo: 'UNIDAD_SIN_MOVIMIENTO', nombre: 'Unidad sin movimiento', severidad: 'media', icono: 'car' },
        { codigo: 'BRIGADA_FUERA_ZONA', nombre: 'Brigada fuera de zona', severidad: 'media', icono: 'map-marker-alert' },
        { codigo: 'MANTENIMIENTO_PENDIENTE', nombre: 'Mantenimiento pendiente', severidad: 'baja', icono: 'wrench' },
        { codigo: 'DOCUMENTO_POR_VENCER', nombre: 'Documento por vencer', severidad: 'baja', icono: 'file-alert' },
        { codigo: 'PERSONALIZADA', nombre: 'Alerta personalizada', severidad: 'variable', icono: 'bell' },
      ];
      res.json(tipos);
    } catch (error: any) {
      console.error('Error obteniendo tipos:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener alertas activas
   * GET /api/alertas
   */
  async obtenerAlertas(req: Request, res: Response) {
    try {
      const { tipo, severidad, limit } = req.query;
      const sedeId = req.user?.puede_ver_todas_sedes
        ? (req.query.sede_id ? parseInt(req.query.sede_id as string) : undefined)
        : req.user?.sede;

      const alertas = await AlertasService.obtenerAlertasActivas({
        sede_id: sedeId,
        tipo: tipo as string,
        severidad: severidad as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json(alertas);
    } catch (error: any) {
      console.error('Error obteniendo alertas:', error);
      res.status(500).json({ error: error.message || 'Error al obtener alertas' });
    }
  },

  /**
   * Obtener alerta por ID
   * GET /api/alertas/:id
   */
  async obtenerAlertaPorId(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const alerta = await AlertasService.obtenerAlertaPorId(id);

      if (!alerta) {
        return res.status(404).json({ error: 'Alerta no encontrada' });
      }

      res.json(alerta);
    } catch (error: any) {
      console.error('Error obteniendo alerta:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Crear alerta personalizada
   * POST /api/alertas
   */
  async crearAlerta(req: Request, res: Response) {
    try {
      const {
        tipo,
        titulo,
        mensaje,
        severidad,
        datos,
        sede_id,
        unidad_id,
        brigada_id,
        expira_en_minutos,
      } = req.body;

      if (!titulo || !mensaje) {
        return res.status(400).json({ error: 'Titulo y mensaje son requeridos' });
      }

      const alerta = await AlertasService.crearAlerta({
        tipo: tipo || 'PERSONALIZADA',
        titulo,
        mensaje,
        severidad,
        datos,
        sede_id,
        unidad_id,
        brigada_id,
        expira_en_minutos,
      });

      if (!alerta) {
        return res.status(400).json({ error: 'No se pudo crear la alerta' });
      }

      res.status(201).json(alerta);
    } catch (error: any) {
      console.error('Error creando alerta:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Atender alerta
   * PUT /api/alertas/:id/atender
   */
  async atenderAlerta(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { nota } = req.body;

      const result = await AlertasService.atenderAlerta(
        id,
        req.user!.userId,
        nota
      );

      if (!result.success) {
        return res.status(400).json({ error: result.mensaje });
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error atendiendo alerta:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Resolver alerta
   * PUT /api/alertas/:id/resolver
   */
  async resolverAlerta(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { nota } = req.body;

      const result = await AlertasService.resolverAlerta(
        id,
        req.user!.userId,
        nota
      );

      if (!result.success) {
        return res.status(400).json({ error: result.mensaje });
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error resolviendo alerta:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Ignorar alerta
   * PUT /api/alertas/:id/ignorar
   */
  async ignorarAlerta(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      const success = await AlertasService.ignorarAlerta(id, req.user!.userId);

      if (!success) {
        return res.status(400).json({ error: 'No se pudo ignorar la alerta' });
      }

      res.json({ success: true, mensaje: 'Alerta ignorada' });
    } catch (error: any) {
      console.error('Error ignorando alerta:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Marcar alerta como leída
   * POST /api/alertas/:id/leer
   */
  async marcarComoLeida(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await AlertasService.marcarComoLeida(id, req.user!.userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error marcando alerta como leída:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener mis alertas no leídas
   * GET /api/alertas/mis-alertas
   */
  async obtenerMisAlertas(req: Request, res: Response) {
    try {
      const sedeId = req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede;

      const alertas = await AlertasService.obtenerAlertasNoLeidas(
        req.user!.userId,
        sedeId
      );

      res.json(alertas);
    } catch (error: any) {
      console.error('Error obteniendo mis alertas:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Contar alertas no leídas
   * GET /api/alertas/contador
   */
  async contarAlertas(req: Request, res: Response) {
    try {
      const sedeId = req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede;

      const conteo = await AlertasService.contarAlertasNoLeidas(
        req.user!.userId,
        sedeId
      );

      res.json(conteo);
    } catch (error: any) {
      console.error('Error contando alertas:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener historial de alertas
   * GET /api/alertas/historial
   */
  async obtenerHistorial(req: Request, res: Response) {
    try {
      const {
        tipo,
        estado,
        fecha_inicio,
        fecha_fin,
        limit,
        offset,
      } = req.query;

      const sedeId = req.user?.puede_ver_todas_sedes
        ? (req.query.sede_id ? parseInt(req.query.sede_id as string) : undefined)
        : req.user?.sede;

      const resultado = await AlertasService.obtenerHistorial({
        sede_id: sedeId,
        tipo: tipo as string,
        estado: estado as string,
        fecha_inicio: fecha_inicio ? new Date(fecha_inicio as string) : undefined,
        fecha_fin: fecha_fin ? new Date(fecha_fin as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(resultado);
    } catch (error: any) {
      console.error('Error obteniendo historial:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener configuración de alertas
   * GET /api/alertas/configuracion
   */
  async obtenerConfiguracion(_req: Request, res: Response) {
    try {
      const configuracion = await AlertasService.obtenerConfiguracion();
      res.json(configuracion);
    } catch (error: any) {
      console.error('Error obteniendo configuración:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Actualizar configuración de alerta
   * PUT /api/alertas/configuracion/:tipo
   */
  async actualizarConfiguracion(req: Request, res: Response) {
    try {
      const { tipo } = req.params;
      const datos = req.body;

      const config = await AlertasService.actualizarConfiguracion(tipo, datos);

      if (!config) {
        return res.status(404).json({ error: 'Configuración no encontrada' });
      }

      res.json(config);
    } catch (error: any) {
      console.error('Error actualizando configuración:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Ejecutar verificaciones automáticas
   * POST /api/alertas/verificar
   */
  async ejecutarVerificaciones(_req: Request, res: Response) {
    try {
      const resultado = await AlertasService.ejecutarVerificaciones();
      res.json({
        success: true,
        alertas_creadas: resultado,
      });
    } catch (error: any) {
      console.error('Error ejecutando verificaciones:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Limpiar alertas expiradas
   * POST /api/alertas/limpiar
   */
  async limpiarExpiradas(_req: Request, res: Response) {
    try {
      const count = await AlertasService.limpiarExpiradas();
      res.json({
        success: true,
        alertas_expiradas: count,
      });
    } catch (error: any) {
      console.error('Error limpiando alertas:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener estadísticas de alertas
   * GET /api/alertas/estadisticas
   */
  async obtenerEstadisticas(req: Request, res: Response) {
    try {
      const dias = req.query.dias ? parseInt(req.query.dias as string) : 30;
      const estadisticas = await AlertasService.obtenerEstadisticas(dias);
      res.json(estadisticas);
    } catch (error: any) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: error.message });
    }
  },
};

export default AlertasController;
