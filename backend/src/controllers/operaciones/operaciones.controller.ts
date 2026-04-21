import { Request, Response } from 'express';
import { OperacionesModel } from '../../models/operaciones/operaciones.model';
import { db } from '../../config/database';
import { normalizeId } from '../../utils/db.utils';
import { JWTPayload } from '../../utils/jwt';

function puedeVerTodasSedes(user: JWTPayload): boolean {
  return !!(user.puede_ver_todas_sedes || user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN');
}

// ========================================
// DASHBOARD DE OPERACIONES
// ========================================

export async function getDashboardOperaciones(req: Request, res: Response) {
  try {
    const sedeId = puedeVerTodasSedes(req.user!) ? undefined : req.user!.sede;

    const disponibilidad = await OperacionesModel.getDisponibilidadRecursos(sedeId);
    const unidades = await OperacionesModel.getEstadisticasUnidades(sedeId);

    const resumen = disponibilidad[0] || {
      total_brigadas_activas: 0,
      brigadas_en_turno_hoy: 0,
      brigadas_disponibles_hoy: 0,
      total_unidades_activas: 0,
      unidades_en_turno_hoy: 0,
      unidades_disponibles_hoy: 0,
    };

    const unidadesBajoCombustible = unidades.filter(
      (u) => u.combustible_actual !== null && u.combustible_actual < 0.25
    );

    return res.json({
      success: true,
      data: {
        resumen,
        unidades_bajo_combustible: unidadesBajoCombustible.length,
        disponibilidad,
        alertas: {
          unidadesCombustible: unidadesBajoCombustible.slice(0, 5),
        },
      },
    });
  } catch (error) {
    console.error('Error en getDashboardOperaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo dashboard de operaciones',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ========================================
// ESTADÍSTICAS DE BRIGADAS
// ========================================

export async function getEstadisticasBrigadas(req: Request, res: Response) {
  try {
    const sedeId = puedeVerTodasSedes(req.user!) ? undefined : req.user!.sede;
    const brigadas = await OperacionesModel.getEstadisticasBrigadas(sedeId);

    return res.json({
      success: true,
      count: brigadas.length,
      data: brigadas,
    });
  } catch (error) {
    console.error('Error en getEstadisticasBrigadas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas de brigadas',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getEstadisticasBrigada(req: Request, res: Response) {
  try {
    const usuarioId = normalizeId(req.params.id);
    if (!usuarioId) return res.status(400).json({ success: false, message: 'ID inválido' });

    const estadisticas = await OperacionesModel.getEstadisticasBrigada(usuarioId);

    if (!estadisticas) {
      return res.status(404).json({
        success: false,
        message: 'Brigada no encontrada',
      });
    }

    if (!puedeVerTodasSedes(req.user!) && estadisticas.sede_id !== req.user!.sede) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para ver esta brigada',
      });
    }

    return res.json({
      success: true,
      data: estadisticas,
    });
  } catch (error) {
    console.error('Error en getEstadisticasBrigada:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas de brigada',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ========================================
// ESTADÍSTICAS DE UNIDADES
// ========================================

export async function getEstadisticasUnidades(req: Request, res: Response) {
  try {
    const sedeId = puedeVerTodasSedes(req.user!) ? undefined : req.user!.sede;
    const unidades = await OperacionesModel.getEstadisticasUnidades(sedeId);

    return res.json({
      success: true,
      count: unidades.length,
      data: unidades,
    });
  } catch (error) {
    console.error('Error en getEstadisticasUnidades:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas de unidades',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getEstadisticasUnidad(req: Request, res: Response) {
  try {
    const unidadId = normalizeId(req.params.id);
    if (!unidadId) return res.status(400).json({ success: false, message: 'ID inválido' });

    const estadisticas = await OperacionesModel.getEstadisticasUnidad(unidadId);

    if (!estadisticas) {
      return res.status(404).json({
        success: false,
        message: 'Unidad no encontrada',
      });
    }

    if (!puedeVerTodasSedes(req.user!) && estadisticas.sede_id !== req.user!.sede) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para ver esta unidad',
      });
    }

    return res.json({
      success: true,
      data: estadisticas,
    });
  } catch (error) {
    console.error('Error en getEstadisticasUnidad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas de unidad',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ========================================
// DISPONIBILIDAD PARA ASIGNACIÓN
// ========================================

export async function getBrigadasDisponibles(req: Request, res: Response) {
  try {
    const { fecha } = req.query;
    const sedeId = puedeVerTodasSedes(req.user!) ? undefined : req.user!.sede;

    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: 'Fecha es requerida',
      });
    }

    const brigadas = await OperacionesModel.getBrigadasDisponibles(
      fecha as string,
      sedeId
    );

    return res.json({
      success: true,
      fecha,
      count: brigadas.length,
      data: brigadas,
    });
  } catch (error) {
    console.error('Error en getBrigadasDisponibles:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo brigadas disponibles',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getUnidadesDisponibles(req: Request, res: Response) {
  try {
    const { fecha } = req.query;
    const sedeId = puedeVerTodasSedes(req.user!) ? undefined : req.user!.sede;

    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: 'Fecha es requerida',
      });
    }

    const unidades = await OperacionesModel.getUnidadesDisponibles(
      fecha as string,
      sedeId
    );

    return res.json({
      success: true,
      fecha,
      count: unidades.length,
      data: unidades,
    });
  } catch (error) {
    console.error('Error en getUnidadesDisponibles:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo unidades disponibles',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ========================================
// VALIDACIONES
// ========================================

export async function validarDisponibilidadBrigada(req: Request, res: Response) {
  try {
    const { usuario_id, fecha } = req.body;

    if (!usuario_id || !fecha) {
      return res.status(400).json({
        success: false,
        message: 'usuario_id y fecha son requeridos',
      });
    }

    const validacion = await OperacionesModel.validarDisponibilidadBrigada(
      usuario_id,
      fecha
    );

    return res.json({
      success: true,
      data: validacion,
    });
  } catch (error) {
    console.error('Error en validarDisponibilidadBrigada:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validando disponibilidad de brigada',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function validarDisponibilidadUnidad(req: Request, res: Response) {
  try {
    const { unidad_id, fecha } = req.body;

    if (!unidad_id || !fecha) {
      return res.status(400).json({
        success: false,
        message: 'unidad_id y fecha son requeridos',
      });
    }

    const validacion = await OperacionesModel.validarDisponibilidadUnidad(
      unidad_id,
      fecha
    );

    return res.json({
      success: true,
      data: validacion,
    });
  } catch (error) {
    console.error('Error en validarDisponibilidadUnidad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validando disponibilidad de unidad',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ========================================
// COMBUSTIBLE
// ========================================

export async function registrarCombustible(req: Request, res: Response) {
  try {
    const {
      unidad_id,
      asignacion_id,
      turno_id,
      tipo,
      nivel_anterior,
      nivel_nuevo,
      combustible_anterior,
      combustible_nuevo,
      odometro_anterior,
      odometro_actual,
      km_recorridos,
      observaciones,
    } = req.body;

    const userId = req.user!.userId;

    // Validaciones
    if (!unidad_id || !tipo || !nivel_nuevo || combustible_nuevo === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: unidad_id, tipo, nivel_nuevo, combustible_nuevo',
      });
    }

    const registro = await OperacionesModel.registrarCombustible({
      unidad_id,
      asignacion_id,
      turno_id,
      tipo,
      nivel_anterior: nivel_anterior ?? null,
      nivel_nuevo,
      combustible_anterior: combustible_anterior ?? null,
      combustible_nuevo,
      odometro_anterior,
      odometro_actual,
      km_recorridos,
      observaciones,
      registrado_por: userId,
    });

    return res.status(201).json({
      success: true,
      message: 'Combustible registrado exitosamente',
      data: registro,
    });
  } catch (error) {
    console.error('Error en registrarCombustible:', error);
    return res.status(500).json({
      success: false,
      message: 'Error registrando combustible',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getHistorialCombustible(req: Request, res: Response) {
  try {
    const { limit = '50' } = req.query;

    const unidadId = normalizeId(req.params.id);
    if (!unidadId) return res.status(400).json({ success: false, message: 'ID de unidad inválido' });

    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 200);

    const historial = await OperacionesModel.getHistorialCombustible(unidadId, limitNum);

    return res.json({
      success: true,
      unidad_id: unidadId,
      count: historial.length,
      data: historial,
    });
  } catch (error) {
    console.error('Error en getHistorialCombustible:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo historial de combustible',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ========================================
// TENDENCIA DE COMBUSTIBLE (analytics)
// ========================================

export async function getCombustibleTendencia(req: Request, res: Response) {
  try {
    const { sede_id, dias = '30' } = req.query;
    const userSedeId = req.user!.sede;
    const diasNum = Math.min(parseInt(dias as string, 10) || 30, 90);

    const sedeFilter = puedeVerTodasSedes(req.user!) ? null : (sede_id ? parseInt(sede_id as string, 10) : userSedeId);

    const tendencia = await db.any(
      `SELECT
         DATE(cr.created_at)                    AS fecha,
         ROUND(AVG(cr.combustible_nuevo)::numeric, 3) AS promedio_combustible,
         COUNT(*)                               AS num_registros
       FROM combustible_registro cr
       JOIN unidad u ON cr.unidad_id = u.id
       WHERE cr.created_at >= NOW() - ($1 || ' days')::INTERVAL
         ${sedeFilter ? 'AND u.sede_id = $2' : ''}
         AND cr.combustible_nuevo IS NOT NULL
       GROUP BY DATE(cr.created_at)
       ORDER BY fecha ASC`,
      sedeFilter ? [diasNum, sedeFilter] : [diasNum]
    );

    return res.json({
      success: true,
      sede_id: sedeFilter,
      dias: diasNum,
      count: tendencia.length,
      data: tendencia,
    });
  } catch (error) {
    console.error('Error en getCombustibleTendencia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo tendencia de combustible',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ========================================
// ABASTECIMIENTO DE COMBUSTIBLE
// ========================================

export async function registrarAbastecimiento(req: Request, res: Response) {
  try {
    const {
      unidad_id,
      odometro_actual,
      nivel_anterior,
      combustible_anterior,
      nivel_nuevo,
      combustible_nuevo,
      litros_cargados,
      observaciones,
    } = req.body;
    const userId = req.user!.userId;

    if (!unidad_id || combustible_nuevo === undefined || !litros_cargados || !nivel_nuevo) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: unidad_id, nivel_nuevo, combustible_nuevo, litros_cargados',
      });
    }

    const registro = await db.one(
      `INSERT INTO combustible_registro
         (unidad_id, tipo, nivel_anterior, nivel_nuevo,
          combustible_anterior, combustible_nuevo,
          odometro_actual, litros_cargados, observaciones, registrado_por)
       VALUES ($1,'ABASTECIMIENTO',$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        unidad_id,
        nivel_anterior ?? null,
        nivel_nuevo,
        combustible_anterior ?? null,
        parseFloat(combustible_nuevo),
        odometro_actual ? parseFloat(odometro_actual) : null,
        parseFloat(litros_cargados),
        observaciones ?? null,
        userId,
      ]
    );

    // Actualizar combustible y odómetro en la unidad
    await db.none(
      `UPDATE unidad
       SET combustible_actual = $1,
           nivel_combustible  = $2,
           ${odometro_actual ? 'odometro_actual = $3,' : ''}
           updated_at = NOW()
       WHERE id = ${odometro_actual ? '$4' : '$3'}`,
      odometro_actual
        ? [parseFloat(combustible_nuevo), nivel_nuevo, parseFloat(odometro_actual), unidad_id]
        : [parseFloat(combustible_nuevo), nivel_nuevo, unidad_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Abastecimiento registrado exitosamente',
      data: registro,
    });
  } catch (error) {
    console.error('Error en registrarAbastecimiento:', error);
    return res.status(500).json({
      success: false,
      message: 'Error registrando abastecimiento',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function getAbastecimientosPorUnidad(req: Request, res: Response) {
  try {
    const unidadId = normalizeId(req.params.unidadId);
    if (!unidadId) return res.status(400).json({ success: false, message: 'ID de unidad inválido' });

    const limit = Math.min(parseInt((req.query.limit as string) || '30', 10), 100);

    const registros = await db.any(
      `SELECT cr.*,
              u.nombre AS registrado_por_nombre
       FROM combustible_registro cr
       LEFT JOIN usuario u ON cr.registrado_por = u.id
       WHERE cr.unidad_id = $1 AND cr.tipo = 'ABASTECIMIENTO'
       ORDER BY cr.created_at DESC
       LIMIT $2`,
      [unidadId, limit]
    );

    return res.json({ success: true, count: registros.length, data: registros });
  } catch (error) {
    console.error('Error en getAbastecimientosPorUnidad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo abastecimientos',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ========================================
// ESTADÍSTICAS DE ABASTECIMIENTO (analytics)
// ========================================

export async function getAbastecimientoStats(req: Request, res: Response) {
  try {
    const userSedeId = req.user!.sede;
    const puedeVerTodas = req.user!.puede_ver_todas_sedes;
    const sedeFilter = puedeVerTodas ? null : userSedeId;

    const sedeWhere = sedeFilter ? 'AND u.sede_id = $/sedeId/' : '';
    const params = sedeFilter ? { sedeId: sedeFilter } : {};

    const totales = await db.one(
      `SELECT
         COALESCE(SUM(cr.litros_cargados), 0)  AS total_litros,
         COUNT(*)::int                           AS num_abastecimientos,
         COUNT(DISTINCT cr.unidad_id)::int       AS num_unidades
       FROM combustible_registro cr
       JOIN unidad u ON cr.unidad_id = u.id
       WHERE cr.tipo = 'ABASTECIMIENTO'
         AND cr.created_at >= NOW() - INTERVAL '30 days'
         ${sedeWhere}`,
      params
    );

    const porUnidad = await db.any(
      `SELECT
         u.codigo                               AS unidad_codigo,
         COALESCE(SUM(cr.litros_cargados), 0)  AS total_litros,
         COUNT(*)::int                           AS num_abastecimientos
       FROM combustible_registro cr
       JOIN unidad u ON cr.unidad_id = u.id
       WHERE cr.tipo = 'ABASTECIMIENTO'
         AND cr.created_at >= NOW() - INTERVAL '30 days'
         ${sedeWhere}
       GROUP BY u.id, u.codigo
       ORDER BY total_litros DESC
       LIMIT 10`,
      params
    );

    const tendencia = await db.any(
      `SELECT
         DATE(cr.created_at AT TIME ZONE 'America/Guatemala') AS fecha,
         COALESCE(SUM(cr.litros_cargados), 0)                 AS litros,
         COUNT(*)::int                                         AS num_abastecimientos
       FROM combustible_registro cr
       JOIN unidad u ON cr.unidad_id = u.id
       WHERE cr.tipo = 'ABASTECIMIENTO'
         AND cr.created_at >= NOW() - INTERVAL '30 days'
         ${sedeWhere}
       GROUP BY DATE(cr.created_at AT TIME ZONE 'America/Guatemala')
       ORDER BY fecha ASC`,
      params
    );

    return res.json({
      success: true,
      data: { totales, por_unidad: porUnidad, tendencia },
    });
  } catch (error) {
    console.error('Error en getAbastecimientoStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas de abastecimiento',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
