import { Request, Response } from 'express';
import { ReasignacionModel } from '../../models/operaciones/reasignacion.model';
import { normalizeId } from '../../utils/db.utils';
import { JWTPayload } from '../../utils/jwt';

function puedeGestionarReasignaciones(user: JWTPayload): boolean {
  return !!(user.puede_ver_todas_sedes || user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN');
}

// ========================================
// REASIGNACIONES DE UNIDADES (tipo=UNIDAD)
// ========================================

export async function crearReasignacionUnidad(req: Request, res: Response) {
  try {
    const { recurso_id, sede_origen_id, sede_destino_id, fecha_inicio, fecha_fin, es_permanente, motivo } = req.body;

    const recursoId     = normalizeId(recurso_id);
    const sedeOrigenId  = normalizeId(sede_origen_id);
    const sedeDestinoId = normalizeId(sede_destino_id);

    if (!recursoId || !sedeOrigenId || !sedeDestinoId || !fecha_inicio) {
      return res.status(400).json({
        error: 'Campos requeridos: recurso_id, sede_origen_id, sede_destino_id, fecha_inicio',
      });
    }

    if (sedeOrigenId === sedeDestinoId) {
      return res.status(400).json({ error: 'La sede de origen y destino deben ser diferentes' });
    }

    if (!puedeGestionarReasignaciones(req.user!)) {
      return res.status(403).json({
        error: 'Las reasignaciones inter-sede de unidades requieren autorización de ADMIN o SUPER_ADMIN',
      });
    }

    const enSalida = await ReasignacionModel.tieneUnidadEnSalidaActiva(recursoId);
    if (enSalida) {
      return res.status(409).json({
        error: 'La unidad tiene una salida activa. Debe finalizar su jornada antes de ser reasignada.',
      });
    }

    const yaReasignada = await ReasignacionModel.tieneReasignacionActiva('UNIDAD', recursoId);
    if (yaReasignada) {
      return res.status(409).json({ error: 'La unidad ya tiene una reasignación activa' });
    }

    const reasignacion = await ReasignacionModel.crear({
      tipo: 'UNIDAD',
      recurso_id: recursoId,
      sede_origen_id: sedeOrigenId,
      sede_destino_id: sedeDestinoId,
      fecha_inicio,
      fecha_fin: fecha_fin ?? null,
      es_permanente: es_permanente ?? false,
      motivo,
      autorizado_por: req.user!.userId,
    });

    return res.status(201).json({
      message: 'Reasignación de unidad creada exitosamente',
      reasignacion,
    });
  } catch (error) {
    console.error('Error en crearReasignacionUnidad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getReasignacionesUnidad(_req: Request, res: Response) {
  try {
    const reasignaciones = await ReasignacionModel.getActivas('UNIDAD');
    return res.json({ total: reasignaciones.length, reasignaciones });
  } catch (error) {
    console.error('Error en getReasignacionesUnidad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function finalizarReasignacionUnidad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const existente = await ReasignacionModel.getById(id);
    if (!existente) return res.status(404).json({ error: 'Reasignación no encontrada' });
    if (existente.tipo !== 'UNIDAD') {
      return res.status(400).json({ error: 'Esta reasignación no es de unidad vehicular' });
    }
    if (existente.estado !== 'ACTIVA') {
      return res.status(400).json({ error: `La reasignación ya está ${existente.estado.toLowerCase()}` });
    }

    const reasignacion = await ReasignacionModel.finalizar(id);
    return res.json({ message: 'Reasignación de unidad finalizada exitosamente', reasignacion });
  } catch (error) {
    console.error('Error en finalizarReasignacionUnidad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function cancelarReasignacionUnidad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const existente = await ReasignacionModel.getById(id);
    if (!existente) return res.status(404).json({ error: 'Reasignación no encontrada' });
    if (existente.tipo !== 'UNIDAD') {
      return res.status(400).json({ error: 'Esta reasignación no es de unidad vehicular' });
    }
    if (existente.estado !== 'ACTIVA') {
      return res.status(400).json({ error: `La reasignación ya está ${existente.estado.toLowerCase()}` });
    }

    const reasignacion = await ReasignacionModel.cancelar(id);
    return res.json({ message: 'Reasignación de unidad cancelada', reasignacion });
  } catch (error) {
    console.error('Error en cancelarReasignacionUnidad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
