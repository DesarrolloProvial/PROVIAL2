import { Request, Response } from 'express';
import { DashboardService } from '../../services/admin/dashboard.service';
import { normalizeId } from '../../utils/db.utils';

export const DashboardController = {
  async obtenerDashboard(req: Request, res: Response) {
    try {
      const diasRaw = parseInt(req.query.dias as string, 10);
      const dias = isNaN(diasRaw) ? 30 : diasRaw;
      const sedeIdQuery = normalizeId(req.query.sede_id as string) ?? undefined;
      const sedeFilter = req.user?.puede_ver_todas_sedes ? sedeIdQuery : req.user?.sede;

      const dashboard = await DashboardService.obtenerDashboardCompleto(dias, sedeFilter);
      res.json(dashboard);
    } catch (error: any) {
      console.error('Error obteniendo dashboard:', error);
      res.status(500).json({ error: 'Error al obtener dashboard' });
    }
  },

  async obtenerResumen(req: Request, res: Response) {
    try {
      const sedeId = (normalizeId(req.query.sede_id as string) ?? req.user?.sede) as number | undefined;
      const resumen = await DashboardService.obtenerResumenGeneral(sedeId);
      res.json(resumen);
    } catch (error: any) {
      console.error('Error obteniendo resumen:', error);
      res.status(500).json({ error: 'Error al obtener resumen' });
    }
  },

  async obtenerSituacionesPorTipo(req: Request, res: Response) {
    try {
      const diasRaw = parseInt(req.query.dias as string, 10);
      const dias = isNaN(diasRaw) ? 30 : diasRaw;
      const sedeId = (normalizeId(req.query.sede_id as string) ?? (req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede)) as number | undefined;

      const datos = await DashboardService.obtenerSituacionesPorTipo(dias, sedeId);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo situaciones por tipo:', error);
      res.status(500).json({ error: 'Error al obtener situaciones por tipo' });
    }
  },

  async obtenerSituacionesPorDia(req: Request, res: Response) {
    try {
      const diasRaw = parseInt(req.query.dias as string, 10);
      const dias = isNaN(diasRaw) ? 30 : diasRaw;
      const sedeId = (normalizeId(req.query.sede_id as string) ?? (req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede)) as number | undefined;

      const datos = await DashboardService.obtenerSituacionesPorDia(dias, sedeId);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo situaciones por día:', error);
      res.status(500).json({ error: 'Error al obtener situaciones por día' });
    }
  },

  async obtenerEstadoUnidades(req: Request, res: Response) {
    try {
      const sedeId = (normalizeId(req.query.sede_id as string) ?? (req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede)) as number | undefined;
      const datos = await DashboardService.obtenerEstadoUnidades(sedeId);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo estado unidades:', error);
      res.status(500).json({ error: 'Error al obtener estado de unidades' });
    }
  },

  async obtenerSituacionesPorHora(req: Request, res: Response) {
    try {
      const diasRaw = parseInt(req.query.dias as string, 10);
      const dias = isNaN(diasRaw) ? 30 : diasRaw;
      const sedeId = (normalizeId(req.query.sede_id as string) ?? (req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede)) as number | undefined;

      const datos = await DashboardService.obtenerSituacionesPorHora(dias, sedeId);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo situaciones por hora:', error);
      res.status(500).json({ error: 'Error al obtener situaciones por hora' });
    }
  },

  async obtenerSituacionesPorDepartamento(req: Request, res: Response) {
    try {
      const diasRaw = parseInt(req.query.dias as string, 10);
      const dias = isNaN(diasRaw) ? 30 : diasRaw;
      const sedeId = (normalizeId(req.query.sede_id as string) ?? (req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede)) as number | undefined;

      const datos = await DashboardService.obtenerSituacionesPorDepartamento(dias, sedeId);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo situaciones por departamento:', error);
      res.status(500).json({ error: 'Error al obtener situaciones por departamento' });
    }
  },

  async obtenerComparativa(req: Request, res: Response) {
    try {
      const sedeId = (normalizeId(req.query.sede_id as string) ?? (req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede)) as number | undefined;
      const datos = await DashboardService.obtenerComparativaMensual(sedeId);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo comparativa:', error);
      res.status(500).json({ error: 'Error al obtener comparativa mensual' });
    }
  },

  async obtenerRendimientoBrigadas(req: Request, res: Response) {
    try {
      const diasRaw = parseInt(req.query.dias as string, 10);
      const dias = isNaN(diasRaw) ? 30 : diasRaw;
      const limitRaw = parseInt(req.query.limit as string, 10);
      const limit = isNaN(limitRaw) ? 10 : limitRaw;
      const sedeId = (normalizeId(req.query.sede_id as string) ?? (req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede)) as number | undefined;

      const datos = await DashboardService.obtenerRendimientoBrigadas(dias, sedeId, limit);
      res.json(datos);
    } catch (error: any) {
      console.error('Error obteniendo rendimiento brigadas:', error);
      res.status(500).json({ error: 'Error al obtener rendimiento de brigadas' });
    }
  },

  async obtenerEstadisticas(req: Request, res: Response) {
    try {
      const sedeId = (normalizeId(req.query.sede_id as string) ?? req.user?.sede) as number | undefined;
      const [resumen, estadoUnidades] = await Promise.all([
        DashboardService.obtenerResumenGeneral(sedeId),
        DashboardService.obtenerEstadoUnidades(sedeId),
      ]);
      res.json({ ...resumen, unidades: estadoUnidades });
    } catch (error: any) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  },

  async obtenerActividadReciente(req: Request, res: Response) {
    try {
      const sedeId = (req.user?.puede_ver_todas_sedes ? undefined : req.user?.sede) as number | undefined;
      const situaciones = await DashboardService.obtenerSituacionesPorDia(7, sedeId);
      res.json({
        situaciones_recientes: situaciones,
        total_semana: situaciones.reduce((acc, s) => acc + s.total, 0)
      });
    } catch (error: any) {
      console.error('Error obteniendo actividad reciente:', error);
      res.status(500).json({ error: 'Error al obtener actividad reciente' });
    }
  },

  async obtenerMetricasSede(req: Request, res: Response) {
    try {
      const sedeId = (normalizeId(req.query.sede_id as string) ?? req.user?.sede) as number | undefined;
      if (!sedeId) return res.status(400).json({ error: 'sede_id es requerido' });

      const [resumen, comparativa] = await Promise.all([
        DashboardService.obtenerResumenGeneral(sedeId),
        DashboardService.obtenerComparativaMensual(sedeId),
      ]);

      res.json({ sede_id: sedeId, resumen, comparativa });
    } catch (error: any) {
      console.error('Error obteniendo métricas sede:', error);
      res.status(500).json({ error: 'Error al obtener métricas de sede' });
    }
  },
};

export default DashboardController;
