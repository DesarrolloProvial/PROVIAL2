import { Request, Response } from 'express';
import { EstadisticasService } from '../services/estadisticas.service';

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
};

export default EstadisticasController;
