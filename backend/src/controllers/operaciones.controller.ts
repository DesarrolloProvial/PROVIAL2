import { Request, Response } from 'express';
import { OperacionesModel } from '../models/operaciones.model';

// ========================================
// DASHBOARD DE OPERACIONES
// ========================================

export async function getDashboardOperaciones(req: Request, res: Response) {
  try {
    const userSedeId = req.user!.sede; // Cada operaciones ve solo su sede

    // Obtener disponibilidad de recursos
    const disponibilidad = await OperacionesModel.getDisponibilidadRecursos(userSedeId);

    // Obtener estadísticas de brigadas
    const brigadas = await OperacionesModel.getEstadisticasBrigadas(userSedeId);

    // Obtener estadísticas de unidades
    const unidades = await OperacionesModel.getEstadisticasUnidades(userSedeId);

    // Resumen general
    const resumen = disponibilidad[0] || {
      total_brigadas_activas: 0,
      brigadas_en_turno_hoy: 0,
      brigadas_disponibles_hoy: 0,
      total_unidades_activas: 0,
      unidades_en_turno_hoy: 0,
      unidades_disponibles_hoy: 0,
    };

    // Brigadas que necesitan descanso (salieron hace menos de 2 días)
    const brigadasNecesitanDescanso = brigadas.filter(
      (b) => b.dias_desde_ultimo_turno !== null && b.dias_desde_ultimo_turno < 2
    );

    // Unidades con poco combustible (menos de 1/4 de tanque)
    const unidadesBajoCombustible = unidades.filter(
      (u) => u.combustible_actual !== null && u.combustible_actual < 0.25
    );

    return res.json({
      success: true,
      data: {
        resumen,
        brigadas_necesitan_descanso: brigadasNecesitanDescanso.length,
        unidades_bajo_combustible: unidadesBajoCombustible.length,
        disponibilidad,
        alertas: {
          brigadasDescanso: brigadasNecesitanDescanso.slice(0, 5),
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
    const userSedeId = req.user!.sede;
    const brigadas = await OperacionesModel.getEstadisticasBrigadas(userSedeId);

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
    const { id } = req.params;
    const usuarioId = parseInt(id, 10);

    const estadisticas = await OperacionesModel.getEstadisticasBrigada(usuarioId);

    if (!estadisticas) {
      return res.status(404).json({
        success: false,
        message: 'Brigada no encontrada',
      });
    }

    // Verificar que pertenece a la sede del usuario
    if (estadisticas.sede_id !== req.user!.sede) {
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
    const userSedeId = req.user!.sede;
    const unidades = await OperacionesModel.getEstadisticasUnidades(userSedeId);

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
    const { id } = req.params;
    const unidadId = parseInt(id, 10);

    const estadisticas = await OperacionesModel.getEstadisticasUnidad(unidadId);

    if (!estadisticas) {
      return res.status(404).json({
        success: false,
        message: 'Unidad no encontrada',
      });
    }

    // Verificar que pertenece a la sede del usuario
    if (estadisticas.sede_id !== req.user!.sede) {
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
    const userSedeId = req.user!.sede;

    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: 'Fecha es requerida',
      });
    }

    const brigadas = await OperacionesModel.getBrigadasDisponibles(
      fecha as string,
      userSedeId
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
    const userSedeId = req.user!.sede;

    if (!fecha) {
      return res.status(400).json({
        success: false,
        message: 'Fecha es requerida',
      });
    }

    const unidades = await OperacionesModel.getUnidadesDisponibles(
      fecha as string,
      userSedeId
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
    const { id } = req.params; // unidad_id
    const { limit = '50' } = req.query;

    const unidadId = parseInt(id, 10);
    const limitNum = parseInt(limit as string, 10);

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
