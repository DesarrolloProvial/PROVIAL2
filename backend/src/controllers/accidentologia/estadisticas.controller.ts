import { Request, Response } from 'express';
import { EstadisticasService } from '../../services/accidentologia/estadisticas.service';

// ============================================
// CONTROLADOR DE ESTADÍSTICAS DE ACCIDENTOLOGÍA
// ============================================

function parseFilters(req: Request) {
  return {
    fecha_inicio: req.query.fecha_inicio as string | undefined,
    fecha_fin: req.query.fecha_fin as string | undefined,
    sede_id: req.query.sede_id ? parseInt(req.query.sede_id as string) : undefined,
    departamento_id: req.query.departamento_id ? parseInt(req.query.departamento_id as string) : undefined,
    ruta_id: req.query.ruta_id ? parseInt(req.query.ruta_id as string) : undefined,
    tipo_situacion: req.query.tipo_situacion as string | undefined,
    origen_datos: (req.query.origen_datos as string) || 'ALL',
    clima: req.query.clima as string | undefined,
    area: req.query.area as string | undefined,
  };
}

export const EstadisticasController = {
  async obtenerTodo(req: Request, res: Response) {
    try {
      const filters = parseFilters(req);
      const data = await EstadisticasService.obtenerTodo(filters);
      res.json(data);
    } catch (error: any) {
      console.error('Error obteniendo estadisticas:', error);
      res.status(500).json({ error: error.message || 'Error al obtener estadisticas' });
    }
  },

  async obtenerDetalle(req: Request, res: Response) {
    try {
      const filters = {
        ...parseFilters(req),
        mes: req.query.mes as string | undefined,
        dia_semana: req.query.dia_semana !== undefined ? parseInt(req.query.dia_semana as string) : undefined,
        hora: req.query.hora !== undefined ? parseInt(req.query.hora as string) : undefined,
        causa_probable: req.query.causa_probable as string | undefined,
        sede_nombre: req.query.sede_nombre as string | undefined,
        tipo_vehiculo: req.query.tipo_vehiculo as string | undefined,
        departamento_nombre: req.query.departamento_nombre as string | undefined,
        ruta_codigo: req.query.ruta_codigo as string | undefined,
      };
      const data = await EstadisticasService.obtenerDetalle(filters);
      res.json({ situaciones: data, total: data.length });
    } catch (error: any) {
      console.error('Error obteniendo detalle:', error);
      res.status(500).json({ error: error.message || 'Error al obtener detalle' });
    }
  },
};

export default EstadisticasController;
