import { Request, Response } from 'express';
import { MovimientoModel } from '../models/movimiento.model';

// ========================================
// CREAR MOVIMIENTO
// ========================================

export async function createMovimiento(req: Request, res: Response) {
  try {
    const {
      usuario_id,
      origen_asignacion_id,
      destino_asignacion_id,
      tipo_movimiento,
      motivo,
      observaciones,
    } = req.body;

    if (!usuario_id || !tipo_movimiento) {
      return res.status(400).json({
        error: 'usuario_id y tipo_movimiento son requeridos',
      });
    }

    // Validar que al menos uno de los dos (origen o destino) esté presente
    if (!origen_asignacion_id && !destino_asignacion_id) {
      return res.status(400).json({
        error: 'Se requiere al menos origen_asignacion_id o destino_asignacion_id',
      });
    }

    const userId = req.user!.userId;

    const movimiento = await MovimientoModel.create({
      usuario_id: parseInt(usuario_id, 10),
      origen_asignacion_id: origen_asignacion_id ? parseInt(origen_asignacion_id, 10) : undefined,
      destino_asignacion_id: destino_asignacion_id ? parseInt(destino_asignacion_id, 10) : undefined,
      tipo_movimiento,
      motivo,
      aprobado_por: userId,
      observaciones,
    });

    return res.status(201).json({
      message: 'Movimiento registrado exitosamente',
      movimiento,
    });
  } catch (error) {
    console.error('Error en createMovimiento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER MOVIMIENTO POR ID
// ========================================

export async function getMovimiento(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const movimiento = await MovimientoModel.getById(parseInt(id, 10));

    if (!movimiento) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    return res.json({ movimiento });
  } catch (error) {
    console.error('Error en getMovimiento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// FINALIZAR MOVIMIENTO
// ========================================

export async function finalizarMovimiento(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { observaciones_finales } = req.body;

    const movimiento = await MovimientoModel.finalizar(parseInt(id, 10), observaciones_finales);

    return res.json({
      message: 'Movimiento finalizado',
      movimiento,
    });
  } catch (error) {
    console.error('Error en finalizarMovimiento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER MOVIMIENTOS ACTIVOS DE UN USUARIO
// ========================================

export async function getMovimientosActivos(req: Request, res: Response) {
  try {
    const { usuario_id } = req.params;

    const movimientos = await MovimientoModel.getActivos(parseInt(usuario_id, 10));

    return res.json({
      total: movimientos.length,
      movimientos,
    });
  } catch (error) {
    console.error('Error en getMovimientosActivos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER MIS MOVIMIENTOS ACTIVOS (BRIGADA)
// ========================================

export async function getMisMovimientosActivos(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    const movimientos = await MovimientoModel.getActivos(userId);

    return res.json({
      total: movimientos.length,
      movimientos,
    });
  } catch (error) {
    console.error('Error en getMisMovimientosActivos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER HISTORIAL DE MOVIMIENTOS
// ========================================

export async function getHistorialMovimientos(req: Request, res: Response) {
  try {
    const {
      usuario_id,
      tipo_movimiento,
      fecha_desde,
      fecha_hasta,
      solo_activos,
      limit,
      offset,
    } = req.query;

    const filters: any = {};

    if (usuario_id) filters.usuario_id = parseInt(usuario_id as string, 10);
    if (tipo_movimiento) filters.tipo_movimiento = tipo_movimiento;
    if (fecha_desde) filters.fecha_desde = new Date(fecha_desde as string);
    if (fecha_hasta) filters.fecha_hasta = new Date(fecha_hasta as string);
    if (solo_activos === 'true') filters.solo_activos = true;
    if (limit) filters.limit = parseInt(limit as string, 10);
    if (offset) filters.offset = parseInt(offset as string, 10);

    const movimientos = await MovimientoModel.getHistorial(filters);

    return res.json({
      total: movimientos.length,
      movimientos,
      filters,
    });
  } catch (error) {
    console.error('Error en getHistorialMovimientos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER COMPOSICIÓN DE UNIDADES
// ========================================

export async function getComposicionUnidades(_req: Request, res: Response) {
  try {
    const composicion = await MovimientoModel.getComposicionUnidades();

    // Agrupar por unidad
    const unidadesMap = new Map();

    for (const item of composicion) {
      if (!unidadesMap.has(item.unidad_id)) {
        unidadesMap.set(item.unidad_id, {
          unidad_id: item.unidad_id,
          unidad_codigo: item.unidad_codigo,
          tipo_unidad: item.tipo_unidad,
          tripulacion: [],
        });
      }

      unidadesMap.get(item.unidad_id).tripulacion.push({
        asignacion_id: item.asignacion_id,
        usuario_id: item.usuario_id,
        usuario_nombre: item.usuario_nombre,
        es_piloto: item.es_piloto,
        tiene_movimiento_activo: item.tiene_movimiento_activo,
        movimiento_tipo: item.movimiento_tipo,
        movimiento_origen: item.movimiento_origen,
      });
    }

    const unidades = Array.from(unidadesMap.values());

    return res.json({
      total_unidades: unidades.length,
      unidades,
    });
  } catch (error) {
    console.error('Error en getComposicionUnidades:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER COMPOSICIÓN DE UNA UNIDAD
// ========================================

export async function getComposicionUnidad(req: Request, res: Response) {
  try {
    const { unidad_id } = req.params;

    const composicion = await MovimientoModel.getComposicionUnidad(parseInt(unidad_id, 10));

    return res.json({
      unidad_id: parseInt(unidad_id, 10),
      total_tripulacion: composicion.length,
      tripulacion: composicion,
    });
  } catch (error) {
    console.error('Error en getComposicionUnidad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// ACTUALIZAR MOVIMIENTO
// ========================================

export async function updateMovimiento(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { motivo, observaciones } = req.body;

    const userId = req.user!.userId;

    const movimiento = await MovimientoModel.update(parseInt(id, 10), {
      motivo,
      observaciones,
      aprobado_por: userId,
    });

    return res.json({
      message: 'Movimiento actualizado',
      movimiento,
    });
  } catch (error) {
    console.error('Error en updateMovimiento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// ELIMINAR MOVIMIENTO
// ========================================

export async function deleteMovimiento(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await MovimientoModel.delete(parseInt(id, 10));

    return res.json({
      message: 'Movimiento eliminado (solo si no había sido finalizado)',
    });
  } catch (error) {
    console.error('Error en deleteMovimiento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
