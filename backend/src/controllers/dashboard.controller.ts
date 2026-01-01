import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

// ============================================
// CONTROLADOR DE DASHBOARD EJECUTIVO
// ============================================

export const DashboardController = {
  /**
   * Obtener dashboard completo
   * GET /api/dashboard
   */
  async obtenerDashboard(req: Request, res: Response) {
    try {
      const dias = parseInt(req.query.dias as string) || 30;
      const sedeId = req.query.sede_id
        ? parseInt(req.query.sede_id as string)
        : undefined;

      // Si el usuario no es admin, filtrar por su sede
      const sedeFilter = req.user?.puede_ver_todas_sedes
        ? sedeId
        : req.user?.sede;

      const dashboard = await DashboardService.obtenerDashboardCompleto(
        dias,
        sedeFilter
      );

      res.json(dashboard);
    } catch (error: any) {
      console.error('Error obteniendo dashboard:', error);
      res.status(500).json({ error: error.message || 'Error al obtener dashboard' });
    }
  },

  /**
   * Obtener resumen general
   * GET /api/dashboard/resumen
   */
  async obtenerResumen(req: Request, res: Response) {
    try {
      const sedeId = req.query.sede_id
        ? parseInt(req.query.sede_id as string)
        : req.user?.sede;

      const resumen = await DashboardService.obtenerResumenGeneral(sedeId);
      res.json(resumen);
    } catch (error: any) {
      console.error('Error obteniendo resumen:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener situaciones por tipo
   * GET /api/dashboard/situaciones/tipo
   */
  async obtenerSituacionesPorTipo(req: Request, res: Response) {
    try {
      const dias = parseInt(req.query.dias as string) || 30;
      const sedeId = req.query.sede_id
        ? parseInt(req.query.sede_id as string)
        : req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede;

      const datos = await DashboardService.obtenerSituacionesPorTipo(dias, sedeId);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo situaciones por tipo:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener situaciones por día
   * GET /api/dashboard/situaciones/dia
   */
  async obtenerSituacionesPorDia(req: Request, res: Response) {
    try {
      const dias = parseInt(req.query.dias as string) || 30;
      const sedeId = req.query.sede_id
        ? parseInt(req.query.sede_id as string)
        : req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede;

      const datos = await DashboardService.obtenerSituacionesPorDia(dias, sedeId);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo situaciones por día:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener estado de unidades
   * GET /api/dashboard/unidades/estado
   */
  async obtenerEstadoUnidades(req: Request, res: Response) {
    try {
      const sedeId = req.query.sede_id
        ? parseInt(req.query.sede_id as string)
        : req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede;

      const datos = await DashboardService.obtenerEstadoUnidades(sedeId);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo estado unidades:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener situaciones por hora
   * GET /api/dashboard/situaciones/hora
   */
  async obtenerSituacionesPorHora(req: Request, res: Response) {
    try {
      const dias = parseInt(req.query.dias as string) || 30;
      const sedeId = req.query.sede_id
        ? parseInt(req.query.sede_id as string)
        : req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede;

      const datos = await DashboardService.obtenerSituacionesPorHora(dias, sedeId);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo situaciones por hora:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener situaciones por departamento
   * GET /api/dashboard/situaciones/departamento
   */
  async obtenerSituacionesPorDepartamento(req: Request, res: Response) {
    try {
      const dias = parseInt(req.query.dias as string) || 30;
      const sedeId = req.query.sede_id
        ? parseInt(req.query.sede_id as string)
        : req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede;

      const datos = await DashboardService.obtenerSituacionesPorDepartamento(dias, sedeId);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo situaciones por departamento:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener comparativa mensual
   * GET /api/dashboard/comparativa
   */
  async obtenerComparativa(req: Request, res: Response) {
    try {
      const sedeId = req.query.sede_id
        ? parseInt(req.query.sede_id as string)
        : req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede;

      const datos = await DashboardService.obtenerComparativaMensual(sedeId);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo comparativa:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener rendimiento de brigadas
   * GET /api/dashboard/brigadas/rendimiento
   */
  async obtenerRendimientoBrigadas(req: Request, res: Response) {
    try {
      const dias = parseInt(req.query.dias as string) || 30;
      const limit = parseInt(req.query.limit as string) || 10;
      const sedeId = req.query.sede_id
        ? parseInt(req.query.sede_id as string)
        : req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede;

      const datos = await DashboardService.obtenerRendimientoBrigadas(dias, sedeId, limit);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo rendimiento brigadas:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener estadísticas (alias de resumen)
   * GET /api/dashboard/estadisticas
   */
  async obtenerEstadisticas(req: Request, res: Response) {
    try {
      const sedeId = req.query.sede_id
        ? parseInt(req.query.sede_id as string)
        : req.user?.sede;

      const resumen = await DashboardService.obtenerResumenGeneral(sedeId);
      const estadoUnidades = await DashboardService.obtenerEstadoUnidades(sedeId);

      res.json({
        ...resumen,
        unidades: estadoUnidades
      });
    } catch (error: any) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener actividad reciente
   * GET /api/dashboard/actividad-reciente
   */
  async obtenerActividadReciente(req: Request, res: Response) {
    try {
      const sedeId = req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede;

      const situaciones = await DashboardService.obtenerSituacionesPorDia(7, sedeId);

      res.json({
        situaciones_recientes: situaciones,
        total_semana: situaciones.reduce((acc, s) => acc + s.total, 0)
      });
    } catch (error: any) {
      console.error('Error obteniendo actividad reciente:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener métricas por sede
   * GET /api/dashboard/metricas-sede
   */
  async obtenerMetricasSede(req: Request, res: Response) {
    try {
      const sedeId = req.query.sede_id
        ? parseInt(req.query.sede_id as string)
        : req.user?.sede;

      if (!sedeId) {
        return res.status(400).json({ error: 'sede_id es requerido' });
      }

      const resumen = await DashboardService.obtenerResumenGeneral(sedeId);
      const comparativa = await DashboardService.obtenerComparativaMensual(sedeId);

      res.json({
        sede_id: sedeId,
        resumen,
        comparativa
      });
    } catch (error: any) {
      console.error('Error obteniendo métricas sede:', error);
      res.status(500).json({ error: error.message });
    }
  },
};

export default DashboardController;
