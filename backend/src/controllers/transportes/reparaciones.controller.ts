import { Request, Response } from 'express';
import { ReparacionModel } from '../../models/transportes/reparacion.model';
import { normalizeId } from '../../utils/db.utils';
import { JWTPayload } from '../../utils/jwt';

function puedeVerTodasSedes(user: JWTPayload): boolean {
  return !!(user.puede_ver_todas_sedes || user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN');
}

export async function getReparacionesPorUnidad(req: Request, res: Response) {
  try {
    const unidadId = normalizeId(req.params.id);
    if (!unidadId) return res.status(400).json({ error: 'ID de unidad inválido' });

    const reparaciones = await ReparacionModel.getPorUnidad(unidadId);
    return res.json({ success: true, unidad_id: unidadId, count: reparaciones.length, data: reparaciones });
  } catch (error) {
    console.error('getReparacionesPorUnidad:', error);
    return res.status(500).json({ success: false, message: 'Error obteniendo reparaciones' });
  }
}

export async function getReparacionesActivas(req: Request, res: Response) {
  try {
    const sedeFiltro = puedeVerTodasSedes(req.user!) ? undefined : req.user!.sede;
    const reparaciones = await ReparacionModel.getActivas(sedeFiltro);
    return res.json({ success: true, count: reparaciones.length, data: reparaciones });
  } catch (error) {
    console.error('getReparacionesActivas:', error);
    return res.status(500).json({ success: false, message: 'Error obteniendo reparaciones activas' });
  }
}

export async function crearReparacion(req: Request, res: Response) {
  try {
    const unidadId = normalizeId(req.body.unidad_id);
    if (!unidadId) return res.status(400).json({ success: false, message: 'unidad_id inválido' });

    const motivo = (req.body.motivo ?? '').trim();
    if (!motivo) return res.status(400).json({ success: false, message: 'motivo es requerido' });

    const activa = await ReparacionModel.tieneReparacionActiva(unidadId);
    if (activa) {
      return res.status(409).json({ success: false, message: 'Esta unidad ya tiene una reparación activa' });
    }

    const reparacion = await ReparacionModel.crear({
      unidad_id: unidadId,
      motivo,
      descripcion: (req.body.descripcion ?? '').trim() || null,
      fecha_inicio: req.body.fecha_inicio ?? null,
      registrado_por: req.user!.userId,
    });

    return res.status(201).json({ success: true, message: 'Reparación registrada exitosamente', data: reparacion });
  } catch (error) {
    console.error('crearReparacion:', error);
    return res.status(500).json({ success: false, message: 'Error creando reparación' });
  }
}

export async function completarReparacion(req: Request, res: Response) {
  try {
    const reparacionId = normalizeId(req.params.id);
    if (!reparacionId) return res.status(400).json({ success: false, message: 'ID inválido' });

    const existente = await ReparacionModel.getById(reparacionId);
    if (!existente) return res.status(404).json({ success: false, message: 'Reparación no encontrada' });
    if (existente.estado !== 'EN_REPARACION') {
      return res.status(400).json({ success: false, message: 'Solo se pueden completar reparaciones en estado EN_REPARACION' });
    }

    const actualizada = await ReparacionModel.completar(reparacionId, req.body.fecha_fin ?? undefined);
    return res.json({ success: true, message: 'Reparación completada', data: actualizada });
  } catch (error) {
    console.error('completarReparacion:', error);
    return res.status(500).json({ success: false, message: 'Error completando reparación' });
  }
}

export async function cancelarReparacion(req: Request, res: Response) {
  try {
    const reparacionId = normalizeId(req.params.id);
    if (!reparacionId) return res.status(400).json({ success: false, message: 'ID inválido' });

    const existente = await ReparacionModel.getById(reparacionId);
    if (!existente) return res.status(404).json({ success: false, message: 'Reparación no encontrada' });
    if (existente.estado !== 'EN_REPARACION') {
      return res.status(400).json({ success: false, message: 'Solo se pueden cancelar reparaciones en estado EN_REPARACION' });
    }

    const actualizada = await ReparacionModel.cancelar(reparacionId);
    return res.json({ success: true, message: 'Reparación cancelada', data: actualizada });
  } catch (error) {
    console.error('cancelarReparacion:', error);
    return res.status(500).json({ success: false, message: 'Error cancelando reparación' });
  }
}

export async function getHistorialUnificado(req: Request, res: Response) {
  try {
    const unidadId = normalizeId(req.params.unidadId);
    if (!unidadId) return res.status(400).json({ success: false, message: 'ID de unidad inválido' });

    const hoy = new Date().toISOString().split('T')[0];
    const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const hasta = (req.query.hasta as string) || hoy;
    const desde = (req.query.desde as string) || hace30;

    const tiposParam = (req.query.tipos as string) || 'combustible,salidas,reparaciones';
    const tipos = tiposParam.split(',').map((t) => t.trim());

    const data = await ReparacionModel.getHistorialUnificado(unidadId, desde, hasta, tipos);
    return res.json({ success: true, total: data.length, desde, hasta, data });
  } catch (error) {
    console.error('getHistorialUnificado:', error);
    return res.status(500).json({ success: false, message: 'Error obteniendo historial' });
  }
}
