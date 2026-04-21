import { Request, Response } from 'express';
import { EstadisticasService } from '../../services/accidentologia/estadisticas.service';
import { normalizeId } from '../../utils/db.utils';

function parseFilters(req: Request) {
  // hora y dia_semana usan parseInt porque 0 es valor válido (medianoche, domingo)
  const dia_semana_raw = parseInt(req.query.dia_semana as string, 10);
  const hora_raw = parseInt(req.query.hora as string, 10);

  return {
    fecha_inicio: req.query.fecha_inicio as string | undefined,
    fecha_fin: req.query.fecha_fin as string | undefined,
    sede_id: normalizeId(req.query.sede_id as string) ?? undefined,
    departamento_id: normalizeId(req.query.departamento_id as string) ?? undefined,
    ruta_id: normalizeId(req.query.ruta_id as string) ?? undefined,
    tipo_situacion: req.query.tipo_situacion as string | undefined,
    origen_datos: (req.query.origen_datos as string) || 'ALL',
    clima: req.query.clima as string | undefined,
    area: req.query.area as string | undefined,
    mes: req.query.mes as string | undefined,
    causa_probable: req.query.causa_probable as string | undefined,
    sede_nombre: req.query.sede_nombre as string | undefined,
    tipo_vehiculo: req.query.tipo_vehiculo as string | undefined,
    departamento_nombre: req.query.departamento_nombre as string | undefined,
    ruta_codigo: req.query.ruta_codigo as string | undefined,
    dia_semana: isNaN(dia_semana_raw) ? undefined : dia_semana_raw,
    hora: isNaN(hora_raw) ? undefined : hora_raw,
  };
}

export const EstadisticasController = {
  async obtenerTodo(req: Request, res: Response) {
    try {
      const filters = parseFilters(req);
      const data = await EstadisticasService.obtenerTodo(filters);
      return res.json(data);
    } catch (error) {
      console.error('Error obteniendo estadisticas:', error);
      return res.status(500).json({ error: 'Error al obtener estadisticas' });
    }
  },

  async obtenerDetalle(req: Request, res: Response) {
    try {
      const filters = parseFilters(req);
      const data = await EstadisticasService.obtenerDetalle(filters);
      return res.json({ situaciones: data, total: data.length });
    } catch (error) {
      console.error('Error obteniendo detalle:', error);
      return res.status(500).json({ error: 'Error al obtener detalle' });
    }
  },
};

export default EstadisticasController;
