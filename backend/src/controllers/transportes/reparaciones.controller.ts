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
    const userRol = req.user!.rol;
    const verTodas = !userSedeId || userRol === 'SUPER_ADMIN' || userRol === 'ADMIN' || req.user!.puede_ver_todas_sedes;

    const reparaciones = await db.any(
      `SELECT
         r.id,
         r.unidad_id,
         u.codigo AS unidad_codigo,
         u.tipo_unidad,
         u.sede_id,
         s.nombre AS sede_nombre,
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
       LEFT JOIN sede s ON u.sede_id = s.id
       LEFT JOIN usuario usr ON r.registrado_por = usr.id
       WHERE r.estado = 'EN_REPARACION'
         ${verTodas ? '' : 'AND u.sede_id = $/sedeId/'}
       ORDER BY r.fecha_inicio ASC`,
      verTodas ? {} : { sedeId: userSedeId }
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

    // Marcar como no disponible mientras está en reparación
    await db.none(
      'UPDATE unidad SET disponible_transportes = false, updated_at = NOW() WHERE id = $1',
      [unidad_id]
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

export async function getHistorialUnificado(req: Request, res: Response) {
  try {
    const unidadId = parseInt(req.params.unidadId, 10);

    const hoy = new Date().toISOString().split('T')[0];
    const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const hasta = (req.query.hasta as string) || hoy;
    const desde = (req.query.desde as string) || hace30;

    const tiposParam = (req.query.tipos as string) || 'combustible,salidas,reparaciones';
    const tipos = tiposParam.split(',').map((t) => t.trim());

    const parts: string[] = [];

    if (tipos.includes('combustible')) {
      parts.push(`
        SELECT
          'COMBUSTIBLE' AS categoria,
          cr.id,
          cr.created_at AS fecha,
          jsonb_build_object(
            'tipo',             cr.tipo,
            'nivel_anterior',   cr.nivel_anterior,
            'nivel_nuevo',      cr.nivel_nuevo,
            'odometro_actual',  cr.odometro_actual,
            'km_recorridos',    cr.km_recorridos,
            'observaciones',    cr.observaciones,
            'usuario',          u.nombre_completo
          ) AS datos
        FROM combustible_registro cr
        LEFT JOIN usuario u ON cr.registrado_por = u.id
        WHERE cr.unidad_id = $/unidadId/
          AND cr.created_at::date BETWEEN $/desde/::date AND $/hasta/::date
      `);
    }

    if (tipos.includes('salidas')) {
      parts.push(`
        SELECT
          'SALIDA' AS categoria,
          su.id,
          su.fecha_hora_salida AS fecha,
          jsonb_build_object(
            'estado',               su.estado,
            'km_inicial',           su.km_inicial,
            'km_final',             su.km_final,
            'km_recorridos',        su.km_recorridos,
            'fecha_regreso',        su.fecha_hora_regreso,
            'observaciones_salida', su.observaciones_salida,
            'observaciones_regreso',su.observaciones_regreso
          ) AS datos
        FROM salida_unidad su
        WHERE su.unidad_id = $/unidadId/
          AND su.fecha_hora_salida::date BETWEEN $/desde/::date AND $/hasta/::date
      `);
    }

    if (tipos.includes('reparaciones')) {
      parts.push(`
        SELECT
          'REPARACION' AS categoria,
          r.id,
          r.fecha_inicio::timestamptz AS fecha,
          jsonb_build_object(
            'motivo',        r.motivo,
            'descripcion',   r.descripcion,
            'fecha_fin',     r.fecha_fin,
            'estado',        r.estado,
            'dias_en_taller',(CURRENT_DATE - r.fecha_inicio),
            'usuario',       u.nombre_completo
          ) AS datos
        FROM unidad_reparacion r
        LEFT JOIN usuario u ON r.registrado_por = u.id
        WHERE r.unidad_id = $/unidadId/
          AND r.fecha_inicio BETWEEN $/desde/::date AND $/hasta/::date
      `);
    }

    if (parts.length === 0) {
      return res.json({ success: true, total: 0, desde, hasta, data: [] });
    }

    const query = parts.join('\nUNION ALL\n') + '\nORDER BY fecha DESC';
    const data = await db.any(query, { unidadId, desde, hasta });

    return res.json({ success: true, total: data.length, desde, hasta, data });
  } catch (error) {
    console.error('Error en getHistorialUnificado:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo historial',
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
