import { Request, Response } from 'express';
import { db } from '../config/database';

// ========================================
// REPARACIONES DE UNIDADES
// ========================================

export async function getReparacionesPorUnidad(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const unidadId = parseInt(id, 10);

    const reparaciones = await db.any(
      `SELECT
         r.id,
         r.unidad_id,
         u.codigo AS unidad_codigo,
         r.motivo,
         r.descripcion,
         r.fecha_inicio,
         r.fecha_fin,
         r.estado,
         (CURRENT_DATE - r.fecha_inicio) AS dias_en_taller,
         r.registrado_por,
         usr.nombre AS registrado_por_nombre,
         r.created_at,
         r.updated_at
       FROM unidad_reparacion r
       JOIN unidad u ON r.unidad_id = u.id
       LEFT JOIN usuario usr ON r.registrado_por = usr.id
       WHERE r.unidad_id = $1
       ORDER BY r.fecha_inicio DESC`,
      [unidadId]
    );

    return res.json({
      success: true,
      unidad_id: unidadId,
      count: reparaciones.length,
      data: reparaciones,
    });
  } catch (error) {
    console.error('Error en getReparacionesPorUnidad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo reparaciones',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getReparacionesActivas(req: Request, res: Response) {
  try {
    const userSedeId = req.user!.sede;

    const reparaciones = await db.any(
      `SELECT
         r.id,
         r.unidad_id,
         u.codigo AS unidad_codigo,
         u.tipo_unidad,
         u.sede_id,
         r.motivo,
         r.descripcion,
         r.fecha_inicio,
         r.fecha_fin,
         r.estado,
         (CURRENT_DATE - r.fecha_inicio) AS dias_en_taller,
         r.registrado_por,
         usr.nombre AS registrado_por_nombre,
         r.created_at
       FROM unidad_reparacion r
       JOIN unidad u ON r.unidad_id = u.id
       LEFT JOIN usuario usr ON r.registrado_por = usr.id
       WHERE r.estado = 'EN_REPARACION'
         AND u.sede_id = $1
       ORDER BY r.fecha_inicio ASC`,
      [userSedeId]
    );

    return res.json({
      success: true,
      count: reparaciones.length,
      data: reparaciones,
    });
  } catch (error) {
    console.error('Error en getReparacionesActivas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo reparaciones activas',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function crearReparacion(req: Request, res: Response) {
  try {
    const { unidad_id, motivo, descripcion, fecha_inicio } = req.body;
    const userId = req.user!.userId;

    if (!unidad_id || !motivo) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: unidad_id, motivo',
      });
    }

    // Verificar que no hay otra reparación activa para esta unidad
    const existente = await db.oneOrNone(
      `SELECT id FROM unidad_reparacion
       WHERE unidad_id = $1 AND estado = 'EN_REPARACION'`,
      [unidad_id]
    );

    if (existente) {
      return res.status(409).json({
        success: false,
        message: 'Esta unidad ya tiene una reparación activa',
      });
    }

    const reparacion = await db.one(
      `INSERT INTO unidad_reparacion
         (unidad_id, motivo, descripcion, fecha_inicio, estado, registrado_por)
       VALUES
         ($1, $2, $3, $4, 'EN_REPARACION', $5)
       RETURNING *`,
      [
        unidad_id,
        motivo.trim(),
        descripcion?.trim() ?? null,
        fecha_inicio ?? new Date().toISOString().split('T')[0],
        userId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Reparación registrada exitosamente',
      data: reparacion,
    });
  } catch (error) {
    console.error('Error en crearReparacion:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creando reparación',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function completarReparacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const reparacionId = parseInt(id, 10);
    const { fecha_fin } = req.body;

    const reparacion = await db.oneOrNone(
      `SELECT id, estado FROM unidad_reparacion WHERE id = $1`,
      [reparacionId]
    );

    if (!reparacion) {
      return res.status(404).json({ success: false, message: 'Reparación no encontrada' });
    }

    if (reparacion.estado !== 'EN_REPARACION') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden completar reparaciones en estado EN_REPARACION',
      });
    }

    const actualizada = await db.one(
      `UPDATE unidad_reparacion
       SET estado = 'COMPLETADA',
           fecha_fin = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [reparacionId, fecha_fin ?? new Date().toISOString().split('T')[0]]
    );

    return res.json({
      success: true,
      message: 'Reparación completada',
      data: actualizada,
    });
  } catch (error) {
    console.error('Error en completarReparacion:', error);
    return res.status(500).json({
      success: false,
      message: 'Error completando reparación',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function cancelarReparacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const reparacionId = parseInt(id, 10);

    const reparacion = await db.oneOrNone(
      `SELECT id, estado FROM unidad_reparacion WHERE id = $1`,
      [reparacionId]
    );

    if (!reparacion) {
      return res.status(404).json({ success: false, message: 'Reparación no encontrada' });
    }

    if (reparacion.estado !== 'EN_REPARACION') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden cancelar reparaciones en estado EN_REPARACION',
      });
    }

    const actualizada = await db.one(
      `UPDATE unidad_reparacion
       SET estado = 'CANCELADA',
           fecha_fin = CURRENT_DATE,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [reparacionId]
    );

    return res.json({
      success: true,
      message: 'Reparación cancelada',
      data: actualizada,
    });
  } catch (error) {
    console.error('Error en cancelarReparacion:', error);
    return res.status(500).json({
      success: false,
      message: 'Error cancelando reparación',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
